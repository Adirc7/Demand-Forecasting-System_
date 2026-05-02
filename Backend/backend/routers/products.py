from fastapi import APIRouter, Depends, HTTPException, Header
from firebase.client import get_db
from firebase.cache import invalidate_cache, get_cached_collection
from routers.auth import get_current_user, require_admin, require_role
from schemas.models import ProductCreate, ProductUpdate
from firebase_admin import firestore as fs
import httpx
import os
import datetime
router = APIRouter(prefix='/products', tags=['Products'])
AI_URL = os.getenv('AI_MODEL_URL', 'http://localhost:8001')

@router.get('/')
async def list_products(page:int=1, limit:int=20, search:str='',
                        category:str='', user=Depends(get_current_user)):
    docs = [d.to_dict() for d in get_cached_collection('products_active')]
    if category: docs = [d for d in docs if d.get('category') == category]
    if search: docs = [d for d in docs if search.lower() in d.get('product_name','').lower()]
    start = (page-1)*limit
    return {'data': docs[start:start+limit], 'total': len(docs), 'page': page}  # type: ignore

@router.post('/')
async def create_product(product: ProductCreate, user=Depends(require_role(['product_manager']))):
    db = get_db()
    if db.collection('products').document(product.sku).get().exists:
        raise HTTPException(400, 'SKU already exists')
    doc = {
        **product.dict(),
        'current_stock':    product.opening_stock,
        'cold_start':       True,   # ALWAYS True on creation
        'sales_day_count':  0,      # ALWAYS 0 on creation
        'ml_retrain_needed':False,  # ALWAYS False on creation
        'active':           True,
        'registered_by':    user['email'],
        'registered_date':  str(datetime.date.today()),
    }
    db.collection('products').document(product.sku).set(doc)
    async with httpx.AsyncClient() as client:
        await client.post(f'{AI_URL}/register-sku', 
                          json={'sku': product.sku, 'category': product.category})
                          
    invalidate_cache('products', 'products_active')
    return {'status': 'created', 'sku': product.sku, 'cold_start': True}

@router.get('/stock-advice')
async def stock_advice(category:str, lead_time_days:int, unit_price:float=0.0,
                       user=Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        r = await client.post(f'{AI_URL}/stock-advice', 
                              json={'category':category,'lead_time_days':lead_time_days, 'unit_price':unit_price})
    return r.json()

@router.get('/stock-advice-sku')
async def stock_advice_sku(sku:str, category:str, lead_time_days:int, 
                           user=Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        r = await client.post(f'{AI_URL}/forecast/batch', 
                              json={'skus': [{'sku': sku, 'category': category}]})
        results = r.json()
        if results and len(results) > 0:
            res = results[0]
            daily = res.get('forecast_30d', 30) / 30.0
            
            # Dynamic Z-Score Safety Buffers
            volatility = res.get('volatility_cv', 0)
            if volatility > 0.5:
                safety_buffer = 45 # High volatility
            elif volatility > 0 and volatility < 0.1:
                safety_buffer = 10 # Stable
            else:
                safety_buffer = 30 # Default

            lead_time_buffer = daily * lead_time_days
            recommended = int(round(daily * safety_buffer + lead_time_buffer))
            return {
                "recommended": recommended,
                "confidence": res.get('confidence', 'HIGH'),
                "avg_daily_demand": daily,
                "dynamic_factors": res.get('shap_factors', [])
            }
    return {"recommended": 50, "confidence": "LOW (Fallback)"}

@router.put('/{sku}')
async def update_product(sku:str, update:ProductUpdate, user=Depends(require_role(['product_manager']))):
    # safe filter blocks ML flags (Admin)
    safe = {k:v for k,v in update.dict(exclude_unset=True).items() 
            if k not in ('cold_start','sales_day_count','ml_retrain_needed')}
    get_db().collection('products').document(sku).update(safe)
    invalidate_cache('products', 'products_active')
    return {'status': 'updated'}

@router.delete('/{sku}')
async def delete_product(sku:str, user=Depends(require_role(['product_manager']))):
    # safe soft delete
    get_db().collection('products').document(sku).update({'active': False})
    invalidate_cache('products', 'products_active')
    return {'status': 'deleted'}

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "super-secret-internal-key-99")

@router.post('/internal/graduate')
async def graduate_sku(body: dict, x_internal_key: str = Header(None)):
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid Internal Key")
        
    sku = body.get('sku')
    if not sku:
        raise HTTPException(status_code=400, detail="Missing SKU")
        
    get_db().collection('products').document(sku).update({
        'cold_start': False, 'ml_retrain_needed': False })
    return {'status': 'graduated', 'sku': sku}

from pydantic import BaseModel
class MigrateSchema(BaseModel):
    new_sku: str

@router.put('/{old_sku}/migrate')
async def migrate_product_sku(old_sku: str, request: MigrateSchema, user=Depends(require_role(['product_manager', 'admin']))):
    db = get_db()
    new_sku = request.new_sku.strip()

    if not new_sku or old_sku == new_sku:
        raise HTTPException(400, 'Invalid or identical new SKU')

    old_prod_ref = db.collection('products').document(old_sku)
    new_prod_ref = db.collection('products').document(new_sku)
    old_inv_ref = db.collection('inventory').document(old_sku)
    new_inv_ref = db.collection('inventory').document(new_sku)
    
    transaction = db.transaction()
    
    @fs.transactional
    def migrate_transaction(transaction, old_prod_ref, new_prod_ref, old_inv_ref, new_inv_ref):
        new_prod_doc = new_prod_ref.get(transaction=transaction)
        if new_prod_doc.exists:
            return False, {"code": 400, "msg": f"SKU {new_sku} already exists in database"}
            
        old_prod_doc = old_prod_ref.get(transaction=transaction)
        if not old_prod_doc.exists:
            return False, {"code": 404, "msg": "Original SKU not found"}
            
        old_data = old_prod_doc.to_dict()
        if old_data.get('sales_day_count', 0) > 0:
            return False, {"code": 403, "msg": "SKU Correction Forbidden: This product already has documented sales history. Modifying the SKU would decouple historical ledger data."}
            
        old_data['sku'] = new_sku
        transaction.set(new_prod_ref, old_data)
        
        old_inv_doc = old_inv_ref.get(transaction=transaction)
        if old_inv_doc.exists:
            inv_data = old_inv_doc.to_dict()
            inv_data['sku'] = new_sku
            transaction.set(new_inv_ref, inv_data)
            transaction.delete(old_inv_ref)
            
        transaction.delete(old_prod_ref)
        return True, None

    success, err = migrate_transaction(transaction, old_prod_ref, new_prod_ref, old_inv_ref, new_inv_ref)
    
    if not success:
        raise HTTPException(status_code=err["code"], detail=err["msg"])
    
    invalidate_cache('products', 'products_active', 'inventory')
    return {'status': 'migrated', 'old_sku': old_sku, 'new_sku': new_sku}
