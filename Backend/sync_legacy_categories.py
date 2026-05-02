import os
import sys
sys.path.append(os.path.abspath('./backend'))
from firebase.client import get_db

def sync():
    db = get_db()
    
    print("Fetching products...")
    prods = [d.to_dict() for d in db.collection('products').stream()]
    legacy_cats = list(set([p.get('category').strip() for p in prods if p.get('category')]))
    
    print("Fetching existing master categories...")
    master_cats = [d.to_dict().get('name', '').strip() for d in db.collection('categories').stream()]
    
    new_cats = [c for c in legacy_cats if c and c not in master_cats]
    
    print(f"Found {len(new_cats)} ghost categories to migrate: {new_cats}")
    
    for c in new_cats:
        cat_id = c.lower().replace(' ', '_').replace('&', 'and').replace(',', '').strip()
        doc = {
            "name": c,
            "min_unit_price": 5.0,
            "sales_weight": 1.0,
            "is_active": True
        }
        db.collection('categories').document(cat_id).set(doc)
        print(f"Migrated {c} -> {cat_id}")
        
    print("Migration complete. Refresh your browser within 20 minutes to see the RAM cache updated, or restart FastAPI.")

if __name__ == '__main__':
    sync()
