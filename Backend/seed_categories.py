import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from firebase.client import get_db

def seed_categories():
    db = get_db()
    categories_ref = db.collection('categories')
    existing = list(categories_ref.limit(1).stream())
    
    if len(existing) > 0:
        print("Categories already exist. Skipping seed.")
        return

    defaults = [
        {
            "id": "electronics",
            "name": "Electronics",
            "min_unit_price": 5000,
            "ml_proxy_price": 15000,
            "active": True
        },
        {
            "id": "home_goods",
            "name": "Home Goods",
            "min_unit_price": 500,
            "ml_proxy_price": 6000,
            "active": True
        },
        {
            "id": "apparel",
            "name": "Apparel",
            "min_unit_price": 1000,
            "ml_proxy_price": 9000,
            "active": True
        }
    ]

    for cat in defaults:
        categories_ref.document(cat['id']).set(cat)
        print(f"Seeded category: {cat['name']}")

    print("Seed complete.")

if __name__ == "__main__":
    seed_categories()
