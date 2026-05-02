from pydantic import BaseModel
from typing import Optional

class ProductCreate(BaseModel):
    sku: str
    product_name: str
    category: str
    lead_time_days: int
    unit_price: float
    opening_stock: int
    service_level: float = 0.95

class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    category: Optional[str] = None
    lead_time_days: Optional[int] = None
    unit_price: Optional[float] = None
    current_stock: Optional[int] = None
    service_level: Optional[float] = None

class SaleCreate(BaseModel):
    sku: str
    quantity: int
    amount: Optional[float] = None
    category: Optional[str] = ""
    force_emergency: Optional[bool] = False
    date: str

class SaleUpdate(BaseModel):
    quantity: int
    force_emergency: Optional[bool] = False

class InventoryUpdate(BaseModel):
    current_stock: Optional[int] = None
    unit_price: Optional[float] = None
    acknowledged: Optional[bool] = None

class OverrideUpdate(BaseModel):
    reorder_point: int

