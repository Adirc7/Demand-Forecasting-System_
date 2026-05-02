import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from services.report_service import compute_historical_metrics

async def main():
    res = await compute_historical_metrics('monthly', 0)
    print("Revenue Chart:", res.get('revenue_chart'))
    print("Inventory Chart:", res.get('inventory_chart'))

if __name__ == "__main__":
    asyncio.run(main())
