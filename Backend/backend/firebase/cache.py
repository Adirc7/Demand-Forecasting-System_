import time
from firebase.client import get_db

from typing import Dict, Tuple, Any

CACHE: Dict[str, Tuple[list, float]] = {}
TTL_SECONDS = 1200  # 20 minutes

def invalidate_cache(*collections):
    """Clear specific collections from the global RAM cache."""
    global CACHE
    for c in collections:
        CACHE.pop(c, None)

def get_cached_collection(collection_name: str) -> list:
    """Read a collection from RAM if fresh, otherwise fetch from Firebase and cache it."""
    global CACHE
    now = time.time()
    
    # Cache hit
    if collection_name in CACHE:
        data, timestamp = CACHE[collection_name]
        if now - timestamp < TTL_SECONDS:
            return data
            
    # Cache miss or expired - fetch from DB
    try:
        db = get_db()
        
        # Handle where queries for products
        if collection_name == 'products_active':
            docs = [d for d in db.collection('products').where('active','==',True).stream(timeout=10)]
        else:
            docs = [d for d in db.collection(collection_name).stream(timeout=10)]
            
        CACHE[collection_name] = (docs, now)
        return docs
    except Exception as e:
        print(f"Error fetching collection '{collection_name}': {e}")
        # Fallback to stale cache if it exists to prevent complete failure
        if collection_name in CACHE:
            print(f"Falling back to stale cache for '{collection_name}'")
            return CACHE[collection_name][0]
        return []
