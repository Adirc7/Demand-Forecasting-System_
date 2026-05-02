from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from firebase.client import get_db
from firebase.cache import get_cached_collection
from routers.auth import get_current_user, require_admin, require_role
from services.forecast_service import run_forecast_generation
from services.retrain_service import trigger_retrain
import json
import os

class RetrainPayload(BaseModel):
    categories: Optional[List[str]] = []
    epochs: Optional[int] = 1

router = APIRouter(prefix='/forecast', tags=['Forecast'])

@router.get('/ai-state')
async def get_ai_state(user=Depends(require_role(['forecast_manager']))):
    doc = get_db().collection('system_metadata').document('ai_state').get()
    state = doc.to_dict() if doc.exists else {'last_trained_date': '', 'categories_boosted': [], 'epoch_multiplier': 1}
    
    try:
        metrics_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'AI-Model', 'model_metrics.json')
        with open(metrics_path, 'r') as f:
            state['metrics'] = json.load(f)
    except Exception as e:
        print("Error loading metrics:", e)
        
    return state

@router.get('/categories')
async def get_all_forecasts(user=Depends(require_role(['forecast_manager']))):
    forecasts = [d.to_dict() for d in get_cached_collection('forecasts')]
    products = {p.id: p.to_dict() for p in get_cached_collection('products')}
    
    for f in forecasts:
        sku = f.get('sku')
        f['current_stock'] = products.get(sku, {}).get('current_stock', 0) if sku else 0
            
    return forecasts

@router.get('/categories/{category}')
async def get_category_forecast(category:str, user=Depends(require_role(['forecast_manager']))):
    forecasts = [d.to_dict() for d in get_cached_collection('forecasts')]
    products = {p.id: p.to_dict() for p in get_cached_collection('products')}
    
    results = []
    for f in forecasts:
        if f.get('category') == category:
            sku = f.get('sku')
            f['current_stock'] = products.get(sku, {}).get('current_stock', 0) if sku else 0
            results.append(f)
            
    return results

@router.post('/retrain')
async def retrain(background: BackgroundTasks, payload: RetrainPayload = None, user=Depends(require_role(['forecast_manager']))):
    background.add_task(trigger_retrain, payload.dict() if payload else {})
    return {'status': 'retrain started', 'message': 'Will complete in background'}
