import os
import sys
import csv
import uuid
import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from firebase.client import get_db

def upload():
    csv_path = r'C:\Users\ASUS\Desktop\Smart_Inventory_AI_System\AI-Model\Data sets\March_2026_Smart_Inventory.csv'
    db = get_db()
    batch = db.batch()
    count = 0
    total_sales = 0
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            qty_str = row.get('quantity', '0')
            try:
                qty = int(float(qty_str))
            except:
                qty = 0
                
            if qty <= 0:
                continue
            
            sku = row.get('sku')
            amount_str = row.get('amount', '0')
            try:
                amount = float(amount_str)
            except:
                amount = 0.0
                
            date_str = row.get('date', '')
            if not date_str.startswith('2026-03'):
                continue
                
            sale_dict = {
                'sku': sku,
                'quantity': qty,
                'amount': amount,
                'category': row.get('category', ''),
                'date': date_str,
                'recorded_by': 'system_direct_upload',
                'created_at': str(datetime.datetime.now())
            }
            sale_ref = db.collection('sales').document(str(uuid.uuid4()))
            batch.set(sale_ref, sale_dict)
            count += 1
            total_sales += qty
            
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
                print(f"Committed {count} records...")
                
    if count % 400 != 0:
        batch.commit()
    print(f"Successfully uploaded {count} sales transactions (Total quantity: {total_sales}) for March 2026.")

if __name__ == '__main__':
    upload()
