from fastapi import APIRouter, Depends
from firebase.client import get_db
from firebase_admin import firestore as fs
from routers.auth import get_current_user, require_role
from services.alert_service import generate_alerts
from firebase.cache import invalidate_cache, get_cached_collection
from schemas.models import InventoryUpdate, OverrideUpdate

router = APIRouter(prefix='/inventory', tags=['Inventory'])

@router.get('/')
async def get_all_inventory(user=Depends(get_current_user)):
    return [d.to_dict() for d in get_cached_collection('inventory')]

@router.put('/{product_id}')
async def update_inventory(product_id:str, payload:InventoryUpdate, user=Depends(require_role(['inventory_manager']))):
    from datetime import datetime
    db = get_db()

    prod_ref = db.collection('products').document(product_id)
    inv_ref = db.collection('inventory').document(product_id)
    history_ref = db.collection('inventory_history').document()
    
    transaction = db.transaction()
    
    @fs.transactional
    def process_inventory_update(transaction, prod_ref, inv_ref, history_ref, data_dict, user_email):
        prod_doc = prod_ref.get(transaction=transaction)
        if not prod_doc.exists:
            return False, "Product not found"
            
        pdata = prod_doc.to_dict()
        old_stock = pdata.get('current_stock', 0)
        item_name = pdata.get('name', product_id)
        current_unit_price = pdata.get('unit_price', 1500)

        inv_data = {k:v for k,v in data_dict.items() if k != 'unit_price'}
        if 'current_stock' in data_dict and float(data_dict['current_stock']) > 0:
            inv_data['emergency_restock_due'] = fs.DELETE_FIELD
            
        if inv_data:
            transaction.set(inv_ref, inv_data, merge=True)
            
        product_update = {}
        if 'current_stock' in data_dict:
            new_stock = data_dict['current_stock']
            product_update['current_stock'] = new_stock
            
            # Log to inventory_history
            diff = float(new_stock) - float(old_stock)
            if diff != 0:
                log_doc = {
                    'item_name': item_name,
                    'product_id': product_id,
                    'quantity_added': diff,
                    'cost': diff * float(data_dict.get('unit_price', current_unit_price)) if diff > 0 else 0,
                    'timestamp': datetime.utcnow().isoformat() + "Z",
                    'updated_by': user_email,
                    'type': 'RESTOCK' if diff > 0 else 'EDIT'
                }
                transaction.set(history_ref, log_doc)

        if 'unit_price' in data_dict:
            product_update['unit_price'] = float(data_dict['unit_price'])
            
        if product_update:
            transaction.update(prod_ref, product_update)
            
        return True, None

    data_dict = payload.dict(exclude_unset=True)
    if not data_dict:
        return {'status': 'no_changes'}
        
    success, err = process_inventory_update(transaction, prod_ref, inv_ref, history_ref, data_dict, user['email'])
    
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=err)

    if 'current_stock' in data_dict or 'unit_price' in data_dict:
        invalidate_cache('products_active', 'products')
        
    invalidate_cache('inventory')
    return {'status': 'updated'}

@router.get('/history')
async def get_inventory_history(user=Depends(get_current_user)):
    from firebase_admin import firestore
    docs = get_db().collection('inventory_history').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(100).stream()
    return [{'id': d.id, **d.to_dict()} for d in docs]

@router.get('/alerts')
async def get_alerts(user=Depends(get_current_user)):
    return await generate_alerts()

@router.post('/alerts/{alert_id}/override')
async def set_override_threshold(alert_id:str, payload:OverrideUpdate, user=Depends(require_role(['inventory_manager']))):
    get_db().collection('thresholds').document(alert_id).set(
        {'reorder_point': payload.reorder_point, 'set_by': user['email']}, merge=True)
    invalidate_cache('thresholds')
    return {'status': 'success'}

@router.post('/alerts/{alert_id}/acknowledge')
async def acknowledge_alert(alert_id:str, user=Depends(require_role(['inventory_manager']))):
    get_db().collection('inventory').document(alert_id).set(
        {'acknowledged': True, 'acknowledged_by': user['email']}, merge=True)
    invalidate_cache('inventory')
    return {'status': 'acknowledged'}
