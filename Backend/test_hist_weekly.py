import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from services.report_service import compute_historical_metrics

async def main():
    res = await compute_historical_metrics('weekly', 0)
    print("Revenue Chart:")
    for r in res.get('revenue_chart', []):
        print(" ", r)
    print("Inventory Chart:")
    for r in res.get('inventory_chart', []):
        print(" ", r)

if __name__ == "__main__":
    asyncio.run(main())
