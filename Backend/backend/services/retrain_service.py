from services.forecast_service import run_forecast_generation
from firebase.client import get_db
import httpx, os, datetime

AI_URL = os.getenv('AI_MODEL_URL', 'http://localhost:8001')

async def trigger_retrain(payload: dict = None):
    async with httpx.AsyncClient(timeout=300.0) as client:
        if payload:
            await client.post(f'{AI_URL}/forecast/retrain', json=payload)
        else:
            await client.post(f'{AI_URL}/forecast/retrain')
            
    await run_forecast_generation()
    
    # Save Active Bias Telemetry Tracking to Firebase
    db = get_db()
    state_payload = {
        'last_trained_date': str(datetime.datetime.now().date()),
        'timestamp': str(datetime.datetime.now()),
        'categories_boosted': payload.get('categories', []) if payload else [],
        'epoch_multiplier': payload.get('epochs', 1) if payload else 1
    }
    db.collection('system_metadata').document('ai_state').set(state_payload)
