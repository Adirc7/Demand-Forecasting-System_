from fastapi import APIRouter, Depends
from firebase.client import get_db
from firebase.cache import get_cached_collection
from routers.auth import get_current_user, require_role
from services.report_service import generate_report, compute_accuracy, compute_business_metrics, compute_historical_metrics, export_training_csv, compute_custom_query
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix='/reports', tags=['Reports'])

@router.get('/')
async def list_reports(user=Depends(get_current_user)):
    docs = get_cached_collection('reports')
    dicts = [d.to_dict() for d in docs]
    dicts.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return dicts

@router.get('/accuracy/metrics')
async def get_accuracy(granularity: str = "monthly", offset: int = 0, user=Depends(get_current_user)):
    return await compute_accuracy(granularity, offset)

@router.get('/business-metrics')
async def get_business_metrics_data(user=Depends(require_role(['report_analyst', 'admin']))):
    return await compute_business_metrics()

@router.get('/historical')
async def get_historical_data(granularity: str = "monthly", offset: int = 0, user=Depends(require_role(['report_analyst', 'admin']))):
    return await compute_historical_metrics(granularity, offset)

@router.get('/export-csv')
async def export_csv_dataset(range: str = "current", month: str = "", user=Depends(require_role(['report_analyst']))):
    csv_string, month_str = await export_training_csv(range=range, month=month)
    
    # Format a beautiful native filename (e.g. march_2026_smart_inventory.csv)
    month_names = {'01':'january','02':'february','03':'march','04':'april','05':'may','06':'june','07':'july','08':'august','09':'september','10':'october','11':'november','12':'december'}
    m = month_names.get(month_str[5:7], 'current')
    y = month_str[:4]
    filename = f"{m}_{y}_{range}_smart_inventory.csv"
    
    return Response(
        content=csv_string,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post('/generate')
async def generate_on_the_fly(params:dict, user=Depends(require_role(['report_analyst']))):
    return await generate_report(params)

class CustomQueryRequest(BaseModel):
    chart_type: str
    metrics: List[str]
    time_range: str
    granularity: str

@router.post('/custom-query')
async def custom_query(req: CustomQueryRequest, user=Depends(require_role(['report_analyst', 'admin']))):
    return await compute_custom_query(req.dict())

@router.post('/custom-charts')
async def save_custom_chart(config: dict, user=Depends(require_role(['report_analyst', 'admin']))):
    ref = get_db().collection('custom_charts').document()
    doc_data = {**config, 'id': ref.id, 'created_by': user['email']}
    ref.set(doc_data)
    return doc_data

@router.get('/custom-charts')
async def get_custom_charts(user=Depends(require_role(['report_analyst', 'admin']))):
    docs = get_cached_collection('custom_charts')
    dicts = [d.to_dict() for d in docs]
    return dicts

@router.delete('/custom-charts/{chart_id}')
async def delete_custom_chart(chart_id: str, user=Depends(require_role(['report_analyst', 'admin']))):
    get_db().collection('custom_charts').document(chart_id).delete()
    return {'status': 'deleted'}

@router.get('/{report_id}')
async def get_report(report_id:str, user=Depends(get_current_user)):
    doc = get_db().collection('reports').document(report_id).get()
    return doc.to_dict() if doc.exists else {}

@router.delete('/{report_id}')
async def delete_report(report_id:str, user=Depends(require_role(['report_analyst']))):
    get_db().collection('reports').document(report_id).delete()
    return {'status': 'deleted'}

@router.post('/')
async def save_report_config(config:dict, user=Depends(require_role(['report_analyst']))):
    ref = get_db().collection('reports').document()
    ref.set({**config, 'id':ref.id, 'created_by':user['email']})
    return {'id': ref.id}

