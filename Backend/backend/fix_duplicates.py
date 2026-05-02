import os
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'serviceAccountKey.json'

from firebase.client import get_db
from firebase.cache import invalidate_cache

def main():
    db = get_db()
    products = db.collection('products').stream()
    name_map = {}

    for p in products:
        data = p.to_dict()
        name = data.get('product_name')
        if name:
            if name not in name_map:
                name_map[name] = []
            name_map[name].append((p.id, data))

    labels = [" (Standard Edition)", " (Bundle Deal)", " (Wholesale Box)", " (Travel Size)", " (Variant E)"]

    updates = 0
    for name, items in name_map.items():
        if len(items) > 1:
            print(f"Found duplicate group for {name} ({len(items)} items)")
            for i, (doc_id, data) in enumerate(items):
                label = labels[i % len(labels)]
                new_name = name + label
                print(f"  -> Renaming {doc_id} to {new_name}")
                db.collection('products').document(doc_id).update({'product_name': new_name})
                updates += 1

    if updates > 0:
        try:
            invalidate_cache('products', 'products_active', 'inventory', 'forecasts')
        except Exception:
            pass
        print(f"\nSuccessfully resolved {updates} duplicates!")
    else:
        print("No duplicates found.")

if __name__ == '__main__':
    main()
