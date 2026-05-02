import os
import sys

# Add the backend directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from backend.firebase.client import get_db

def main():
    db = get_db()
    sales_ref = db.collection('sales')
    docs = sales_ref.stream()
    
    march_sales = 0
    april_sales = 0
    other_sales = 0
    
    for doc in docs:
        data = doc.to_dict()
        date = data.get('date', '')
        if date.startswith('2026-03'):
            march_sales += 1
        elif date.startswith('2026-04'):
            april_sales += 1
        else:
            other_sales += 1
            
    print(f"March Sales: {march_sales}")
    print(f"April Sales: {april_sales}")
    print(f"Other Sales: {other_sales}")

if __name__ == '__main__':
    main()
