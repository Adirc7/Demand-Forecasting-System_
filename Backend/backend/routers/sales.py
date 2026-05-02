from fastapi import APIRouter, Depends, UploadFile, File
from firebase.client import get_db
from firebase_admin import firestore as fs
from routers.auth import get_current_user, require_admin, require_role
import httpx, csv, io, os
from services.email_service import send_admin_reminder
from firebase.cache import invalidate_cache, get_cached_collection
from schemas.models import SaleCreate, SaleUpdate

router = APIRouter(prefix='/sales', tags=['Sales'])
AI_URL = os.getenv('AI_MODEL_URL', 'http://localhost:8001')

@router.get('/')
async def list_sales(date_from:str='', date_to:str='', sku:str='', 
                     category:str='', user=Depends(require_role(['sales_manager']))):
    docs = []
    for d in get_cached_collection('sales'):
        doc_data = d.to_dict()
        doc_data['id'] = d.id
        docs.append(doc_data)
    if date_from: docs = [d for d in docs if d.get('date', '') >= date_from]
    if date_to:   docs = [d for d in docs if d.get('date', '') <= date_to]
    if category: docs = [d for d in docs if d.get('category')==category]
    if sku:      docs = [d for d in docs if d.get('sku')==sku]
    return docs

@router.post('/')
async def record_sale(sale: SaleCreate, user=Depends(require_role(['sales_manager']))):
    db = get_db()
    
    sku = sale.sku
    qty = sale.quantity
    is_emergency = sale.force_emergency

    prod_ref = db.collection('products').document(sku)
    sale_ref = db.collection('sales').document()
    inv_ref = db.collection('inventory').document(sku)
    
    transaction = db.transaction()
    
    @fs.transactional
    def process_sale_transaction(transaction, prod_ref, sale_ref, inv_ref, sale_dict, qty, is_emergency, user_email):
        prod_snapshot = prod_ref.get(transaction=transaction)
        if not prod_snapshot.exists:
            return False, "Product not found in system."
            
        prod = prod_snapshot.to_dict()
        current_stock = prod.get('current_stock', 0)
        
        if current_stock < qty and not is_emergency:
            return False, {
                "type": "insufficient_stock",
                "current_stock": current_stock,
                "requested": qty
            }
            
        sale_dict['recorded_by'] = user_email
        sale_dict['created_at'] = str(__import__('datetime').datetime.now())
        transaction.set(sale_ref, sale_dict)
        
        new_stock = current_stock - qty
        prod_updates = {
            'current_stock': new_stock,
            'sales_day_count': prod.get('sales_day_count', 0) + 1
        }
        
        if prod.get('cold_start') and prod_updates['sales_day_count'] >= 30:
            prod_updates['ml_retrain_needed'] = True
            
        transaction.update(prod_ref, prod_updates)
        
        inv_data = {
            'sku': sku,
            'current_stock': new_stock,
            'lead_time_days': prod.get('lead_time_days', 5),
            'service_level': prod.get('service_level', 0.95)
        }
        
        if is_emergency:
            inv_data['emergency_restock_due'] = (__import__('datetime').datetime.utcnow() + __import__('datetime').timedelta(days=8)).isoformat() + 'Z'
            
        transaction.set(inv_ref, inv_data, merge=True)
        return True, None

    success, err = process_sale_transaction(transaction, prod_ref, sale_ref, inv_ref, sale.dict(), qty, is_emergency, user['email'])
    
    if not success:
        from fastapi import HTTPException
        if isinstance(err, dict):
            raise HTTPException(status_code=400, detail=err)
        else:
            raise HTTPException(status_code=404, detail=err)

    # 7. Tick warmup tracker in AI Model
    async with httpx.AsyncClient() as client:
        try:
            await client.post(f'{AI_URL}/warmup-tick', 
                              json={'sku': sku, 'had_sale_today': True})
        except Exception as e:
            print(f"Warning: Failed to reach AI model for warmup tick: {e}")
            
    # 8. Wipe globally cached data sets
    invalidate_cache('sales', 'products', 'inventory', 'products_active')

    return {'status': 'recorded'}

@router.post('/upload')
async def upload_sales(file: UploadFile=File(...), user=Depends(require_role(['sales_manager']))):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode()))
    results = []
    for row in reader:
        try:
            sale_obj = SaleCreate(**row)
            await record_sale(sale_obj, user)
            results.append({'sku': row.get('sku'), 'status': 'ok'})
        except Exception as e:
            results.append({'sku': row.get('sku'), 'status': 'error', 'reason': str(e)})
    return {'processed': len(results), 'results': results}

@router.delete('/{sale_id}')
async def delete_sale(sale_id: str, user=Depends(require_role(['admin', 'sales_manager']))):
    db = get_db()
    sale_ref = db.collection('sales').document(sale_id)
    transaction = db.transaction()
    
    @fs.transactional
    def delete_sale_transaction(transaction, sale_ref):
        sale_doc = sale_ref.get(transaction=transaction)
        if not sale_doc.exists:
            return False, "Sale not found"
            
        sale = sale_doc.to_dict()
        sku = sale.get('sku')
        qty = sale.get('quantity', 1)
        
        transaction.delete(sale_ref)
        
        if sku:
            prod_ref = db.collection('products').document(sku)
            prod_doc = prod_ref.get(transaction=transaction)
            if prod_doc.exists:
                prod = prod_doc.to_dict()
                new_stock = prod.get('current_stock', 0) + qty
                transaction.update(prod_ref, {
                    'current_stock': new_stock,
                    'sales_day_count': max(0, prod.get('sales_day_count', 0) - 1)
                })
                
                inv_ref = db.collection('inventory').document(sku)
                transaction.set(inv_ref, {
                    'sku': sku,
                    'current_stock': new_stock,
                    'lead_time_days': prod.get('lead_time_days', 5),
                    'service_level': prod.get('service_level', 0.95)
                }, merge=True)
        return True, None

    success, err = delete_sale_transaction(transaction, sale_ref)
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=err)
        
    invalidate_cache('sales', 'products', 'inventory', 'products_active')
    return {'status': 'deleted'}

@router.put('/{sale_id}')
async def update_sale(sale_id: str, data: SaleUpdate, user=Depends(require_role(['admin', 'sales_manager']))):
    db = get_db()
    sale_ref = db.collection('sales').document(sale_id)
    transaction = db.transaction()
    
    @fs.transactional
    def update_sale_transaction(transaction, sale_ref, data_obj):
        sale_doc = sale_ref.get(transaction=transaction)
        if not sale_doc.exists:
            return False, {"code": 404, "msg": "Sale not found"}
            
        sale = sale_doc.to_dict()
        sku = sale.get('sku')
        old_qty = int(sale.get('quantity', 1))
        
        new_qty = data_obj.quantity
        diff = new_qty - old_qty
        is_emergency = data_obj.force_emergency
        
        prod_ref = db.collection('products').document(sku)
        prod_doc = prod_ref.get(transaction=transaction)
        if not prod_doc.exists:
            return False, {"code": 404, "msg": "Product not found in system."}
            
        prod = prod_doc.to_dict()
        current_stock = prod.get('current_stock', 0)
        
        if diff > 0 and current_stock < diff and not is_emergency:
            return False, {"code": 400, "msg": {
                "type": "insufficient_stock",
                "current_stock": current_stock,
                "requested": diff
            }}
            
        updates = {'quantity': new_qty}
        old_amount = sale.get('amount')
        if old_amount is not None and old_qty > 0:
            updates['amount'] = (float(old_amount) / float(old_qty)) * new_qty
            
        transaction.update(sale_ref, updates)
        
        if diff != 0:
            new_stock = current_stock - diff
            transaction.update(prod_ref, {'current_stock': new_stock})
            
            inv_ref = db.collection('inventory').document(sku)
            transaction.set(inv_ref, {'current_stock': new_stock}, merge=True)
            
        return True, None

    success, err = update_sale_transaction(transaction, sale_ref, data)
    
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=err["code"], detail=err["msg"])
        
    invalidate_cache('sales', 'products', 'inventory', 'products_active')
    return {'status': 'updated'}

@router.post('/trigger-admin-email')
async def trigger_admin_email(payload: dict):
    days_left = payload.get('days_left', 7)
    success, msg = send_admin_reminder(days_left)
    if success:
        return {'status': 'success', 'message': 'Official reminder securely delivered via Google SMTP.'}
    return {'status': 'error', 'message': msg}

