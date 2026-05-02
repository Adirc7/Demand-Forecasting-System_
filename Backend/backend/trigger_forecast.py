import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))
from services.forecast_service import run_forecast_generation

async def main():
    print("Triggering new forecast generation using updated ML logic...")
    try:
        res = await run_forecast_generation()
        print(f"Success! Generated {res.get('generated')} forecasts.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
