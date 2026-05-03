import { useState, useEffect, useMemo } from 'react';
import { getSales, recordSale, uploadSalesCSV, getProducts, triggerAdminEmail, updateSale, deleteSale, getStockAdvice, getStockAdviceSku, getInventoryHistory } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import './Sales.css';

export default function Sales() {
    const [sales, setSales] = useState([]);
    const [invHistory, setInvHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    // Products for dropdown
    const [products, setProducts] = useState([]);

    // Manual Form State
    const [sku, setSku] = useState('');
    const [skuSearch, setSkuSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dynamicPriceInfo, setDynamicPriceInfo] = useState(null);

    // CSV File State
    const [file, setFile] = useState(null);

    // AI Smart Reminder State
    const [showReminder, setShowReminder] = useState(false);
    const [daysLeft, setDaysLeft] = useState(0);
    const [emailing, setEmailing] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Filtering State
    const [filterSku, setFilterSku] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterUser, setFilterUser] = useState('');

    // Emergency UI State
    const [emergencyConfirm, setEmergencyConfirm] = useState(null);

    // Edit Logic State
    const [editSaleId, setEditSaleId] = useState(null);
    const [editSaleQty, setEditSaleQty] = useState('');

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedSales = useMemo(() => {
        let sortableData = [...sales];
        if (sortConfig !== null) {
            sortableData.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'amount') {
                    aVal = a.amount || ((a.quantity || 1) * (a.unit_price || products.find(p => p.sku === a.sku)?.unit_price || 0));
                    bVal = b.amount || ((b.quantity || 1) * (b.unit_price || products.find(p => p.sku === b.sku)?.unit_price || 0));
                } else if (sortConfig.key === 'quantity') {
                    if (aVal === undefined) aVal = 0;
                    if (bVal === undefined) bVal = 0;
                    aVal = Number(aVal);
                    bVal = Number(bVal);
                } else if (sortConfig.key === 'date') {
                    if (aVal === undefined) aVal = '';
                    if (bVal === undefined) bVal = '';
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                } else {
                    if (aVal === undefined) aVal = '';
                    if (bVal === undefined) bVal = '';
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableData;
    }, [sales, sortConfig, products]);

    const filteredSales = useMemo(() => {
        return sortedSales.filter(sale => {
            const dateMatch = !filterDate || (sale.date && sale.date.toLowerCase().includes(filterDate.toLowerCase()));
            const skuMatch = !filterSku || (sale.sku && sale.sku.toLowerCase().includes(filterSku.toLowerCase()));
            const userMatch = !filterUser || (sale.recorded_by && sale.recorded_by.toLowerCase().includes(filterUser.toLowerCase()));
            return dateMatch && skuMatch && userMatch;
        });
    }, [sortedSales, filterSku, filterDate, filterUser]);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return ' ⇅';
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const fetchSales = async () => {
        try {
            setLoading(true);
            const data = await getSales();
            // Sort by created_at descending if available
            data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            setSales(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch sales history: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const data = await getInventoryHistory();
            setInvHistory(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSales();
        fetchProducts();
        fetchHistory();
    }, []);

    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

    const availableMonths = useMemo(() => {
        const months = new Set();
        sales.forEach(s => {
            if (s.date && s.date.length >= 7) months.add(s.date.substring(0, 7));
        });
        months.add(new Date().toISOString().substring(0, 7));
        return Array.from(months).sort().reverse();
    }, [sales]);

    const activeMonthName = useMemo(() => {
        const [y, m] = selectedMonth.split('-');
        const d = new Date(y, parseInt(m)-1, 1);
        return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    }, [selectedMonth]);

    const activeMonthSales = useMemo(() => {
        return sales.filter(s => s.date && s.date.startsWith(selectedMonth));
    }, [sales, selectedMonth]);

    const activeMonthHistory = useMemo(() => {
        return invHistory.filter(h => h.timestamp && h.timestamp.startsWith(selectedMonth));
    }, [invHistory, selectedMonth]);

    const { totalRevenue, totalCost, totalCapitalSpent } = useMemo(() => {
        let rev = 0; let cogs = 0;
        activeMonthSales.forEach(s => {
            const prodPrice = products.find(p => p.sku === s.sku)?.unit_price;
            const fallbackPrice = prodPrice ? prodPrice : 1500;
            const q = Number(s.quantity) || 1;
            const amount = Number(s.amount || (q * (fallbackPrice * 1.25)));
            rev += amount; cogs += (fallbackPrice * q);
        });
        
        let spent = 0;
        activeMonthHistory.forEach(h => {
            if (h.type === 'RESTOCK' && h.cost) spent += Number(h.cost);
        });
        
        return { totalRevenue: rev, totalCost: cogs, totalCapitalSpent: spent };
    }, [activeMonthSales, activeMonthHistory, products]);

    const previousMonth = useMemo(() => {
        const [y, m] = selectedMonth.split('-');
        const d = new Date(y, parseInt(m)-1, 1);
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().substring(0, 7);
    }, [selectedMonth]);

    const previousMonthName = useMemo(() => {
        const [y, m] = selectedMonth.split('-');
        const d = new Date(y, parseInt(m)-1, 1);
        d.setMonth(d.getMonth() - 1);
        return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    }, [selectedMonth]);

    const { prevRevenue, prevCost, previousMonthProfit, prevCapitalSpent } = useMemo(() => {
        let rev = 0; let cogs = 0;
        const prevSales = sales.filter(s => s.date && s.date.startsWith(previousMonth));
        prevSales.forEach(s => {
            const prodPrice = products.find(p => p.sku === s.sku)?.unit_price;
            const fallbackPrice = prodPrice ? prodPrice : 1500;
            const q = Number(s.quantity) || 1;
            const amount = Number(s.amount || (q * (fallbackPrice * 1.25)));
            rev += amount; cogs += (fallbackPrice * q);
        });
        
        let spent = 0;
        const prevHist = invHistory.filter(h => h.timestamp && h.timestamp.startsWith(previousMonth));
        prevHist.forEach(h => {
            if (h.type === 'RESTOCK' && h.cost) spent += Number(h.cost);
        });
        
        return { prevRevenue: rev, prevCost: cogs, previousMonthProfit: rev - cogs, prevCapitalSpent: spent };
    }, [sales, products, invHistory, previousMonth]);

    const profit = totalRevenue - totalCost;
    const profitDiff = profit - previousMonthProfit;
    const mostRecentSale = activeMonthSales.length > 0 ? activeMonthSales[0] : null;
    const mostRecentRestock = activeMonthHistory.length > 0 ? activeMonthHistory[0] : null;

    // Proactive AI Reminder Logic (Calculates on page load)
    useEffect(() => {
        const today = new Date();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        setDaysLeft(lastDayOfMonth - today.getDate());
    }, []);

    // Dynamic AI Traffic Light System
    const getAlertTheme = (days) => {
        if (days <= 7) return {
            color: '#ef4444', text: 'CRITICAL DEADLINE',
            bg: 'linear-gradient(145deg, #1f0b0d 0%, #0a050f 100%)', border: '1px solid rgba(239, 68, 68, 0.5)'
        };
        if (days <= 15) return {
            color: '#eab308', text: 'UPCOMING DEADLINE',
            bg: 'linear-gradient(145deg, #1a160b 0%, #0a050f 100%)', border: '1px solid rgba(234, 179, 8, 0.5)'
        };
        return {
            color: '#22c55e', text: 'SYSTEM HEALTHY',
            bg: 'linear-gradient(145deg, #0b1a0f 0%, #0a050f 100%)', border: '1px solid rgba(34, 197, 94, 0.5)'
        };
    };
    const alertTheme = getAlertTheme(daysLeft);

    const fetchProducts = async () => {
        try {
            const res = await getProducts('?limit=1000');
            setProducts(res.data || []);
        } catch (err) {
            console.error("Failed to fetch products", err);
        }
    };

    // AI Dynamic Pricing Engine
    useEffect(() => {
        if (sku && products.length > 0) {
            const product = products.find(p => p.sku === sku);
            if (product && product.unit_price) {
                const cogs = parseFloat(product.unit_price);
                const baseRetail = cogs * 1.40; // Base 40% markup

                let surge = 1.0;
                // Supply pressure
                if (product.current_stock < 50) surge += 0.15; // 15% surge for low stock
                else if (product.current_stock > 300) surge -= 0.10; // 10% discount for high stock

                // Demand velocity
                const velocity = product.sales_day_count || 0;
                if (velocity > 15) surge += 0.05;

                let finalPrice = baseRetail * surge;
                // Strict Profit Floor Shield (Never sell below COGS)
                if (finalPrice < cogs) {
                    finalPrice = cogs + 1;
                }

                setDynamicPriceInfo({
                    cogs,
                    finalPrice: Math.round(finalPrice),
                    surgeMultiplier: surge,
                    status: (surge > 1.0 ? 'SURGE (HIGH DEMAND)' : (surge < 1.0 ? 'DISCOUNT (OVERSTOCKED)' : 'BASE MSRP'))
                });
            } else {
                setDynamicPriceInfo(null);
            }
        } else {
            setDynamicPriceInfo(null);
        }
    }, [sku, products]);

    const handleManualSubmit = async (e, forceEmergency = false) => {
        if (e) e.preventDefault();
        setError(null);
        setSuccess('');
        setLoading(true);
        try {
            const salePayload = {
                sku,
                quantity: Number(quantity),
                date,
                force_emergency: forceEmergency
            };

            if (dynamicPriceInfo) {
                salePayload.unit_price = dynamicPriceInfo.finalPrice;
                salePayload.amount = dynamicPriceInfo.finalPrice * Number(quantity);
                salePayload.surge_multiplier = dynamicPriceInfo.surgeMultiplier;
            }

            await recordSale(salePayload);
            setSuccess(forceEmergency ? `EMERGENCY CREATED: Forced backorder for ${quantity}x ${sku}` : `Successfully recorded sale for ${quantity}x ${sku}`);
            setSku('');
            setSkuSearch('');
            setQuantity(1);
            fetchSales();
        } catch (err) {
            try {
                const parsedError = JSON.parse(err.message);
                if (parsedError && parsedError.detail && parsedError.detail.type === 'insufficient_stock') {
                    const deets = parsedError.detail;
                    setEmergencyConfirm({
                        sku,
                        current_stock: deets.current_stock,
                        requested: deets.requested,
                        advice: null
                    });

                    const activeProduct = products.find(p => p.sku === sku) || {};
                    const cat = activeProduct.category || "Generic";
                    const lt = activeProduct.lead_time_days || 7;

                    getStockAdviceSku(sku, cat, lt)
                        .then(res => {
                            setEmergencyConfirm(prev => prev ? { ...prev, advice: res } : null);
                        })
                        .catch(err => console.error("Failed to fetch AI advice", err));

                    return;
                }
                setError('Failed to record sale: ' + (parsedError.detail || err.message));
            } catch (parseErr) {
                setError('Failed to record sale: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const confirmEmergencyBackorder = () => {
        if (emergencyConfirm.is_edit) {
            handleUpdateSale(null, emergencyConfirm.sale, true);
        } else {
            handleManualSubmit(null, true);
        }
        setEmergencyConfirm(null);
    };

    const cancelEmergencyBackorder = () => {
        setEmergencyConfirm(null);
        setError('Sale cancelled due to insufficient stock.');
    };


    const handleCsvUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setError(null);
        setSuccess('');
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await uploadSalesCSV(formData);
            
            if (res.results) {
                const errors = res.results.filter(r => r.status === 'error');
                if (errors.length > 0) {
                    const errorDetails = errors.map(e => `${e.sku}: ${e.reason}`).join(' | ');
                    setError(`Processed ${res.processed} rows, but ${errors.length} failed. Errors: ${errorDetails}`);
                    if (res.processed > errors.length) {
                        setSuccess(`Successfully saved ${res.processed - errors.length} rows.`);
                    }
                } else {
                    setSuccess(`Successfully processed CSV: ${res.processed} rows saved.`);
                }
            } else {
                setSuccess(`Successfully processed CSV.`);
            }

            setFile(null);
            document.getElementById('csvFileInput').value = ''; // Reset input
            fetchSales();
        } catch (err) {
            setError('Failed to upload CSV: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmail = async () => {
        setEmailing(true);
        try {
            const res = await triggerAdminEmail({ days_left: daysLeft });
            if (res.status === 'success') {
                setSuccess('Official Admin Email sent to aadithyabanda@gmail.com!');
                setShowReminder(false);
            } else {
                setError('Failed to send email: ' + res.message);
            }
        } catch (err) {
            setError('Error sending email: ' + err.message);
        } finally {
            setEmailing(false);
        }
    };

    const handleDeleteSale = async (sale) => {
        if (!window.confirm(`CRITICAL ACTION: Are you sure you want to void the sale of ${sale.quantity}x ${sale.sku}?\n\nThe stock will be mathematically reverted in the warehouse.`)) return;

        setError(null); setSuccess('');
        setLoading(true);
        try {
            await deleteSale(sale.id);
            setSuccess(`Successfully voided sale. ${sale.quantity} units of ${sale.sku} returned to inventory.`);
            fetchSales();
        } catch (err) {
            setError('Failed to void sale: ' + err.message);
            setLoading(false);
        }
    };

    const handleUpdateSale = async (e, sale, forceEmergency = false) => {
        if (e) e.preventDefault();
        setError(null);
        setSuccess('');
        setLoading(true);
        try {
            await updateSale(sale.id, {
                quantity: Number(editSaleQty),
                force_emergency: forceEmergency
            });
            setSuccess(`Successfully updated quantity to ${editSaleQty} for ${sale.sku}`);
            setEditSaleId(null);
            setEmergencyConfirm(null);
            fetchSales();
            fetchHistory();
        } catch (err) {
            try {
                const parsedError = JSON.parse(err.message);
                if (parsedError && parsedError.detail && parsedError.detail.type === 'insufficient_stock') {
                    const deets = parsedError.detail;
                    setEmergencyConfirm({
                        sku: sale.sku,
                        current_stock: deets.current_stock,
                        requested: deets.requested,
                        advice: null,
                        is_edit: true,
                        sale: sale,
                        editQty: editSaleQty
                    });
                } else {
                    setError('Failed to update sale: ' + (parsedError.detail || err.message));
                }
            } catch {
                setError('Failed to update sale: ' + err.message);
            }
            setLoading(false);
        }
    };

    const hasClearance = user && (user.role === 'admin' || user.role === 'sales_manager');
    const tableColumns = hasClearance ? '1fr 1.2fr 1fr 1fr 1.5fr 0.8fr' : '1fr 1.2fr 1fr 1fr 1.5fr';

    return (
        <>
            <div className="wrap" style={{ position: 'relative', zIndex: 10, padding: '32px 40px' }}>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px', animation: 'slideInLeft .6s ease', marginTop: '40px' }}>
                    <div>

                        <h1 className="page-title">SALES <span>MANAGEMENT</span></h1>
                        <div className="title-bar" />
                    </div>
                    {/* Notify Indicator Top Right */}
                    <button
                        onClick={() => setShowReminder(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: 'rgba(10,5,15,0.8)', border: alertTheme.border,
                            padding: '12px 20px', borderRadius: '4px', cursor: 'pointer',
                            boxShadow: `0 0 15px ${alertTheme.color}33`, transition: 'all 0.3s',
                        }}
                    >
                        <div style={{ width: '8px', height: '8px', background: alertTheme.color, borderRadius: '50%', boxShadow: `0 0 10px ${alertTheme.color}`, animation: 'pulse 1.5s infinite' }} />
                        <span style={{ color: alertTheme.color, fontFamily: "'Outfit', monospace", fontSize: '11px', letterSpacing: '2px', fontWeight: 'bold' }}>
                            NOTIFY
                        </span>
                    </button>
                </div>

                {error && <div style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444', padding: '16px', borderRadius: '4px', fontSize: '12px', border: '1px solid rgba(239,68,68,.3)', marginBottom: '16px' }}>{error}</div>}
                {success && <div style={{ background: 'rgba(34,197,94,.1)', color: '#22c55e', padding: '16px', borderRadius: '4px', fontSize: '12px', border: '1px solid rgba(34,197,94,.3)', marginBottom: '16px' }}>{success}</div>}

                <div className="dashboard-layout">
                    {/* LEFT PANEL */}
                    <div className="left-panel">
                        {/* Manual Entry Form */}
                    <div className="cyber-card" style={{ animationDelay: ".1s" }}>
                        <h2 className="card-title">◈ RECORD SALE MANUALLY</h2>
                        <form onSubmit={handleManualSubmit}>
                            <div className="field-label">SKU</div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    required={!sku}
                                    type="text"
                                    className="cyber-input"
                                    placeholder="Type to search or select a SKU"
                                    value={skuSearch}
                                    onChange={(e) => {
                                        setSkuSearch(e.target.value);
                                        const match = products.find(p => p.sku.toLowerCase() === e.target.value.toLowerCase() || `${p.sku} - ${p.product_name}`.toLowerCase() === e.target.value.toLowerCase());
                                        setSku(match ? match.sku : '');
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                />
                                {isDropdownOpen && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                        background: '#0a050f', border: '1px solid rgba(249,115,22,0.3)',
                                        maxHeight: '250px', overflowY: 'auto', borderRadius: '0 0 4px 4px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                    }} className="custom-scroll">
                                        {products.filter(p => !skuSearch || `${p.sku} ${p.product_name}`.toLowerCase().includes(skuSearch.toLowerCase())).map(p => (
                                            <div
                                                key={p.sku}
                                                style={{
                                                    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    color: '#e2e8f0', fontSize: '13px', fontFamily: "'Share Tech Mono', monospace"
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(249,115,22,0.15)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent input onBlur from firing immediately
                                                    setSku(p.sku);
                                                    setSkuSearch(`${p.sku} - ${p.product_name || ''}`);
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                {p.sku} {p.product_name ? `- ${p.product_name}` : ''}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {sku && products.find(p => p.sku === sku) && (
                                <div style={{ fontSize: '11px', color: 'rgba(226,232,240,0.6)', marginTop: '8px', letterSpacing: '1px' }}>
                                    AVAILABLE STOCK: <strong style={{
                                        color: products.find(p => p.sku === sku).current_stock > 0 ? '#22c55e' : '#ef4444',
                                        marginLeft: '4px'
                                    }}>
                                        {products.find(p => p.sku === sku).current_stock}
                                    </strong>
                                </div>
                            )}

                            {dynamicPriceInfo && (
                                <div style={{
                                    marginTop: '12px', padding: '12px', background: 'rgba(16, 185, 129, 0.05)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '4px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>COGS (Supplier Unit Price):</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: "'Space Mono', monospace" }}>Rs. {dynamicPriceInfo.cogs.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>AI Recommended Selling Price:</span>
                                        <strong style={{ fontSize: '14px', color: '#10b981', fontFamily: "'Space Mono', monospace", textShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }}>
                                            Rs. {dynamicPriceInfo.finalPrice.toLocaleString()}
                                        </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>Market Condition:</span>
                                        <span style={{
                                            fontSize: '9px', padding: '2px 6px', borderRadius: '2px',
                                            background: dynamicPriceInfo.surgeMultiplier > 1.0 ? 'rgba(239, 68, 68, 0.2)' : (dynamicPriceInfo.surgeMultiplier < 1.0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(148, 163, 184, 0.2)'),
                                            color: dynamicPriceInfo.surgeMultiplier > 1.0 ? '#fca5a5' : (dynamicPriceInfo.surgeMultiplier < 1.0 ? '#93c5fd' : '#cbd5e1')
                                        }}>
                                            {dynamicPriceInfo.status}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="field-label">Quantity</div>
                            <input
                                required
                                className="cyber-input"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />

                            {dynamicPriceInfo && quantity > 0 && (
                                <div style={{
                                    padding: '12px', background: 'transparent',
                                    border: '1px dashed rgba(249, 115, 22, 0.4)', borderRadius: '4px',
                                    marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '11px', color: '#f97316', letterSpacing: '2px', fontFamily: "'Outfit', monospace" }}>TOTAL AMOUNT:</span>
                                    <span style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold', fontFamily: "'Space Mono', monospace" }}>
                                        Rs. {(dynamicPriceInfo.finalPrice * quantity).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            <div className="field-label">Date</div>
                            <input
                                required
                                className="cyber-input"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{ colorScheme: "dark" }}
                            />

                            <button
                                type="submit"
                                disabled={loading || !sku}
                                className="record-btn"
                            >
                                ⬡ RECORD SALE
                            </button>
                        </form>
                    </div>

                    {/* CSV Upload Form */}
                    <div className="cyber-card" style={{ animationDelay: ".2s" }}>
                        <h2 className="card-title">◈ BULK UPLOAD VIA CSV</h2>
                        <div className="csv-hint">
                            CSV must contain headers&nbsp;
                            <code>sku</code>, <code>quantity</code>, <code>date</code>.
                        </div>

                        <form onSubmit={handleCsvUpload}>
                            <div className="csv-select-label">Select CSV File</div>

                            <div className="file-row">
                                <label>
                                    <input
                                        type="file"
                                        id="csvFileInput"
                                        accept=".csv"
                                        required
                                        style={{ display: "none" }}
                                        onChange={(e) => setFile(e.target.files[0])}
                                    />
                                    <span className="choose-btn">CHOOSE FILE</span>
                                </label>
                                <span className="file-name">{file ? file.name : "No file chosen"}</span>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !file}
                                className="upload-btn"
                            >
                                ⬆ {loading && file ? 'UPLOADING...' : 'UPLOAD CSV'}
                            </button>

                            {/* Decorative data lines */}
                            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 8 }}>
                                {["SKU_ID · QUANTITY · DATE", "FORMAT: CSV / UTF-8", "MAX SIZE: 10MB"].map((t, i) => (
                                    <div key={i} style={{
                                        fontSize: 11, color: "#ffffff", letterSpacing: 2,
                                        display: "flex", alignItems: "center", gap: 8
                                    }}>
                                        <div style={{ width: 3, height: 3, background: "rgba(249,115,22,.3)", borderRadius: "50%" }} />
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </form>
                    </div>
                </div>

                    {/* RIGHT PANEL DASHBOARD */}
                    <div className="right-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '20px', color: '#fff', letterSpacing: '2px', textShadow: '0 0 10px rgba(255,255,255,0.3)', margin: 0 }}>
                                    Performance
                                </h2>
                                <select 
                                    className="cyber-select"
                                    style={{ 
                                        background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', 
                                        color: '#f97316', padding: '6px 12px', borderRadius: '4px', outline: 'none', 
                                        fontFamily: "'Share Tech Mono', monospace", fontSize: '13px', cursor: 'pointer'
                                    }}
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(e.target.value)}
                                >
                                    {availableMonths.map(m => {
                                        const [y, mm] = m.split('-');
                                        const label = new Date(y, parseInt(mm)-1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                                        return <option key={m} value={m}>{label}</option>;
                                    })}
                                </select>
                            </div>
                        </div>

                        <div className="metrics-grid">
                            <div className="metric-card revenue">
                                <div className="metric-title">Total Revenue</div>
                                <div className="metric-value" style={{ color: '#38bdf8' }}>Rs. {totalRevenue.toLocaleString()}</div>
                                <div style={{ fontSize: '12px', color: 'rgba(226,232,240,0.5)', marginTop: '6px', fontFamily: "'Outfit', sans-serif" }}>
                                    {previousMonthName}: <span style={{ color: 'rgba(56,189,248,0.7)' }}>Rs. {prevRevenue.toLocaleString()}</span>
                                </div>
                                <div className="context-box">
                                    <div className="context-title">Most Recent Sale</div>
                                    {mostRecentSale ? (
                                        <div className="context-detail">
                                            <strong style={{color:'#fff'}}>{mostRecentSale.quantity}x {mostRecentSale.sku}</strong><br/>
                                            Amount: Rs. {Math.round(mostRecentSale.amount || (mostRecentSale.quantity * (products.find(p=>p.sku===mostRecentSale.sku)?.unit_price||1500))).toLocaleString()}<br/>
                                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>{mostRecentSale.date || mostRecentSale.created_at}</span>
                                        </div>
                                    ) : (
                                        <div className="context-detail" style={{ color: '#94a3b8', fontStyle: 'italic' }}>No sales this month.</div>
                                    )}
                                </div>
                            </div>

                            <div className="metric-card cost">
                                <div className="metric-title">Total Cost (COGS)</div>
                                <div className="metric-value" style={{ color: '#ef4444' }}>Rs. {totalCost.toLocaleString()}</div>
                                <div style={{ fontSize: '12px', color: 'rgba(226,232,240,0.5)', marginTop: '6px', fontFamily: "'Outfit', sans-serif" }}>
                                    {previousMonthName}: <span style={{ color: 'rgba(239,68,68,0.7)' }}>Rs. {prevCost.toLocaleString()}</span>
                                </div>
                                <div className="context-box">
                                    <div className="context-title">
                                        {mostRecentRestock?.type === 'EDIT' ? 'RECENT INVENTORY EDIT' : 'RECENT RESTOCK'}
                                    </div>
                                    {mostRecentRestock ? (
                                        <div className="context-detail">
                                            <strong style={{color:'#fff'}}>{Math.abs(mostRecentRestock.quantity_added)}x {mostRecentRestock.item_name}</strong><br/>
                                            {mostRecentRestock.type === 'EDIT' && mostRecentRestock.quantity_added < 0 ? 'Value Lost: ' : 'Cost: '} 
                                            Rs. {Math.abs(mostRecentRestock.cost).toLocaleString()}<br/>
                                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>{mostRecentRestock.timestamp.split('T')[0]}</span>
                                        </div>
                                    ) : (
                                        <div className="context-detail" style={{ color: '#94a3b8', fontStyle: 'italic' }}>No stock events this month.</div>
                                    )}
                                </div>
                            </div>

                            <div className={`metric-card profit ${profit >= 0 ? 'positive' : 'negative'}`}>
                                <div className="metric-title">Net Profit</div>
                                <div className="metric-value" style={{ color: profit >= 0 ? '#22c55e' : '#ef4444' }}>
                                    Rs. {profit.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '12px', color: 'rgba(226,232,240,0.5)', marginTop: '6px', fontFamily: "'Outfit', sans-serif" }}>
                                    {previousMonthName}: <span style={{ color: previousMonthProfit >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)' }}>Rs. {previousMonthProfit.toLocaleString()}</span>
                                </div>
                                <div className="context-box">
                                    <div className="context-title">Status (MoM Tracking)</div>
                                    <div className="context-detail">
                                        <div style={{ color: profit >= 0 ? '#22c55e' : '#ef4444', marginBottom: '4px' }}>
                                            {profit >= 0 ? 'Profitable operation this month.' : 'Operating at a loss this month.'}
                                        </div>
                                        {profitDiff > 0 ? (
                                            <div style={{ color: '#10b981', fontWeight: 'bold' }}>
                                                + Rs. {Math.abs(profitDiff).toLocaleString()} (Ahead of {previousMonthName})
                                            </div>
                                        ) : profitDiff < 0 ? (
                                            <div style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                                - Rs. {Math.abs(profitDiff).toLocaleString()} (Behind {previousMonthName})
                                            </div>
                                        ) : (
                                            <div style={{ color: '#94a3b8' }}>Matched previous month exactly.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="metric-card capital-spent" style={{ borderColor: 'rgba(234,179,8,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 0 15px rgba(234,179,8,0.05)' }}>
                                <div className="metric-title">Capital Spent (Restocks)</div>
                                <div className="metric-value" style={{ color: '#eab308' }}>
                                    Rs. {totalCapitalSpent.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '12px', color: 'rgba(226,232,240,0.5)', marginTop: '6px', fontFamily: "'Outfit', sans-serif" }}>
                                    {previousMonthName}: <span style={{ color: 'rgba(234,179,8,0.7)' }}>Rs. {prevCapitalSpent.toLocaleString()}</span>
                                </div>
                                <div className="context-box">
                                    <div className="context-title">Investment Tracking</div>
                                    <div className="context-detail">
                                        <div style={{ color: '#94a3b8' }}>
                                            Total money used to purchase new inventory this month.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                {/* Sales History Table */}
                <div className="history-card">
                    <div className="history-header">
                        <h2 className="history-title">◈ RECENT SALES HISTORY</h2>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder=" Date "
                                className="cyber-input"
                                style={{ width: '120px', padding: '6px 10px', fontSize: '11px', background: 'rgba(5,5,10,0.5)', border: '1px solid rgba(249,115,22,0.3)', margin: 0 }}
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder=" SKU "
                                className="cyber-input"
                                style={{ width: '120px', padding: '6px 10px', fontSize: '11px', background: 'rgba(5,5,10,0.5)', border: '1px solid rgba(249,115,22,0.3)', margin: 0 }}
                                value={filterSku}
                                onChange={(e) => setFilterSku(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder=" User "
                                className="cyber-input"
                                style={{ width: '140px', padding: '6px 10px', fontSize: '11px', background: 'rgba(5,5,10,0.5)', border: '1px solid rgba(249,115,22,0.3)', margin: 0 }}
                                value={filterUser}
                                onChange={(e) => setFilterUser(e.target.value)}
                            />
                            <button onClick={fetchSales} disabled={loading} className="refresh-btn">
                                ↻ REFRESH
                            </button>
                        </div>
                    </div>

                    {loading && !sales.length ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226,232,240,.4)' }}>Loading sales history...</div>
                    ) : sales.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226,232,240,.4)' }}>No sales recorded yet.</div>
                    ) : (
                        <>
                            <div className="table-head" style={{ gridTemplateColumns: tableColumns, paddingRight: sales.length > 10 ? '32px' : '24px' }}>
                                <div className="th" onClick={() => handleSort('date')}>DATE{getSortIcon('date')}</div>
                                <div className="th" onClick={() => handleSort('sku')}>SKU{getSortIcon('sku')}</div>
                                <div className="th" onClick={() => handleSort('quantity')}>QUANTITY{getSortIcon('quantity')}</div>
                                <div className="th" onClick={() => handleSort('amount')}>AMOUNT{getSortIcon('amount')}</div>
                                <div className="th" onClick={() => handleSort('recorded_by')}>RECORDED BY{getSortIcon('recorded_by')}</div>
                                {hasClearance && <div className="th">ACTION</div>}
                            </div>

                            <div style={{ maxHeight: '600px', overflowY: 'auto' }} className="custom-scroll">
                                {filteredSales.slice(0, 100).map((sale, i) => {
                                    const prodPrice = products.find(p => p.sku === sale.sku)?.unit_price;
                                    const fallbackPrice = prodPrice ? prodPrice : 1500; // Legacy data fallback
                                    const amount = sale.amount || ((sale.quantity || 1) * (sale.unit_price || fallbackPrice));

                                    return (
                                        <div
                                            key={i}
                                            className="table-row"
                                            style={{ gridTemplateColumns: tableColumns, animationDelay: `${.4 + (i % 10) * .08}s`, animation: "fadeInUp .5s ease both" }}
                                        >
                                            <div className="td-date">
                                                {sale.date}
                                            </div>
                                            <div className="td-sku">{sale.sku}</div>
                                            <div className="td-qty">
                                                {editSaleId === sale.id ? (
                                                    <input
                                                        type="number"
                                                        className="cyber-input"
                                                        style={{ width: '60px', padding: '4px', fontSize: '11px', textAlign: 'center', background: 'rgba(5,5,10,0.8)' }}
                                                        value={editSaleQty}
                                                        onChange={(e) => setEditSaleQty(e.target.value)}
                                                        min="1"
                                                    />
                                                ) : (
                                                    String(sale.quantity || 1).padStart(2, "0")
                                                )}
                                            </div>
                                            <div className="td-amount" style={{ fontFamily: "'Outfit', monospace", fontSize: '13px', fontWeight: 'bold', color: '#10b981' }}>
                                                Rs. {Math.round(amount).toLocaleString()}
                                            </div>
                                            <div className="td-user">{sale.recorded_by}</div>
                                            {hasClearance && (
                                                <div className="td-action" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {editSaleId === sale.id ? (
                                                        <>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateSale(e, sale); }}
                                                                style={{ background: 'transparent', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', padding: '4px 8px', fontSize: '10px', borderRadius: '2px', cursor: 'pointer', fontFamily: "'Outfit', monospace", transition: 'all 0.3s' }}>
                                                                SAVE
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setEditSaleId(null); }}
                                                                style={{ background: 'transparent', border: '1px solid rgba(148, 163, 184, 0.4)', color: '#94a3b8', padding: '4px 8px', fontSize: '10px', borderRadius: '2px', cursor: 'pointer', fontFamily: "'Outfit', monospace", transition: 'all 0.3s' }}>
                                                                CANCEL
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setEditSaleId(sale.id); setEditSaleQty(sale.quantity || 1); }}
                                                                style={{ background: 'transparent', border: '1px solid rgba(249, 115, 22, 0.4)', color: '#f97316', padding: '4px 8px', fontSize: '10px', borderRadius: '2px', cursor: 'pointer', fontFamily: "'Outfit', monospace", transition: 'all 0.3s' }}
                                                                onMouseOver={(e) => { e.target.style.background = 'rgba(249, 115, 22, 0.1)'; e.target.style.boxShadow = '0 0 8px rgba(249, 115, 22, 0.3)' }}
                                                                onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.boxShadow = 'none' }}>
                                                                EDIT
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale); }}
                                                                style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '4px 8px', fontSize: '10px', borderRadius: '2px', cursor: 'pointer', fontFamily: "'Outfit', monospace", transition: 'all 0.3s' }}
                                                                onMouseOver={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.3)' }}
                                                                onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.boxShadow = 'none' }}>
                                                                VOID
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {sales.length > 100 && (
                                <div style={{ padding: '12px', textAlign: 'center', fontSize: '10px', color: 'rgba(226,232,240,.3)', background: 'rgba(0,0,0,.2)' }}>
                                    Showing last 100 entries.
                                </div>
                            )}
                        </>
                    )}
                </div>
                    </div> {/* End Right Panel */}
                </div> {/* End Dashboard Layout */}

                {/* Status bar */}
                <div className="status-bar">
                    {[
                        { label: "SYSTEM STATUS", val: "ONLINE", color: "#22c55e" },
                        { label: "MODULE", val: "M2", color: "#f97316" },
                        { label: "RECORDS", val: `${sales.length}`, color: "#3b82f6" },
                        { label: "LAST SYNC", val: "LIVE", color: "#818cf8" },
                    ].map(s => (
                        <div key={s.label} className="stat">
                            <span className="stat-dot" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                            <span className="stat-label">{s.label}:</span>
                            <span className="stat-val" style={{ color: s.color }}>{s.val}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Proactive AI Reminder Modal */}
            {showReminder && (
                <div style={{
                    position: "fixed", inset: 0,
                    background: "rgba(6, 10, 16, 0.85)", backdropFilter: "blur(8px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "16px", zIndex: 9999, animation: "fadeIn .3s ease"
                }}>
                    <div style={{
                        background: alertTheme.bg,
                        border: alertTheme.border,
                        boxShadow: `0 0 0 1px ${alertTheme.color}33, 0 0 80px ${alertTheme.color}22, 0 40px 80px rgba(0,0,0,0.8)`,
                        borderRadius: "16px", padding: "32px", maxWidth: "450px", width: "100%", position: "relative"
                    }}>
                        <button onClick={() => setShowReminder(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '12px', height: '12px', background: alertTheme.color, borderRadius: '50%', boxShadow: `0 0 12px ${alertTheme.color}`, animation: 'pulse 1s infinite' }} />
                            <h3 className="text-xl font-bold" style={{ fontFamily: "'Outfit', sans-serif", color: alertTheme.color, letterSpacing: '2px', textShadow: `0 0 10px ${alertTheme.color}88`, margin: 0 }}>{alertTheme.text}</h3>
                        </div>

                        {/* Admin Simulation Removed */}

                        <p style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '12px', lineHeight: '1.6', fontFamily: "'Inter', sans-serif" }}>
                            You have exactly <strong style={{ color: alertTheme.color, fontSize: '18px', letterSpacing: '2px', padding: '0 4px' }}>{daysLeft} DAYS LEFT</strong> before the AI Retraining cycle locks in.
                        </p>

                        <div style={{ background: `${alertTheme.color}11`, borderLeft: `3px solid ${alertTheme.color}`, padding: '12px 16px', marginBottom: '24px' }}>
                            <p style={{ fontSize: '12px', color: 'rgba(226,232,240,0.8)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                                {daysLeft <= 15 ?
                                    (<span>⚠️ <strong>WARNING:</strong> Missing data will severely damage next month's inventory forecasts. You must upload the final Bulk Sales CSV for this month immediately.</span>) :
                                    (<span>✅ <strong>HEALTHY:</strong> You have plenty of time. If you have an updated CSV from your POS, you can securely upload it so the AI stays fresh.</span>)
                                }
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            {daysLeft <= 8 && user && (user.email === 'aadithyabanda@gmail.com' || user.email === 'Admin@test.com' || user.role === 'admin') && (
                                <button onClick={handleSendEmail} disabled={emailing}
                                    style={{
                                        flex: 1, padding: "14px", background: `linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(185, 28, 28, 0.8))`,
                                        color: "#fff", fontWeight: "bold", border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: "6px", cursor: emailing ? "wait" : "pointer",
                                        fontFamily: "'Outfit', monospace", letterSpacing: '2px', boxShadow: `0 0 20px rgba(239, 68, 68, 0.4)`,
                                        transition: 'all 0.3s'
                                    }}>
                                    {emailing ? 'SENDING EMAIL...' : 'SEND OFFICIAL EMAIL'}
                                </button>
                            )}

                            <button onClick={() => {
                                setShowReminder(false);
                                document.getElementById('csvFileInput')?.click();
                            }} style={{
                                flex: 1, padding: "14px", background: `linear-gradient(135deg, ${alertTheme.color}ee, ${alertTheme.color}aa)`,
                                color: "#fff", fontWeight: "bold", border: alertTheme.border, borderRadius: "6px", cursor: "pointer",
                                fontFamily: "'Outfit', monospace", letterSpacing: '2px', boxShadow: `0 0 20px ${alertTheme.color}66`,
                                transition: 'all 0.3s'
                            }}>
                                UPLOAD CSV NOW
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Emergency Backorder Confirmation Modal */}
            {emergencyConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{
                        background: 'linear-gradient(180deg, rgba(20, 10, 20, 0.95), rgba(10, 5, 15, 0.95))',
                        border: '1px solid rgba(255, 0, 85, 0.4)', borderRadius: '8px',
                        padding: '32px', width: '90%', maxWidth: '500px',
                        boxShadow: '0 0 30px rgba(255, 0, 85, 0.15), inset 0 0 20px rgba(255, 0, 85, 0.05)',
                        animation: 'slideUp 0.4s ease forwards', position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #ff0055, #ff6b6b)' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ width: '14px', height: '14px', background: '#ff0055', borderRadius: '50%', boxShadow: '0 0 15px #ff0055', animation: 'pulse 1s infinite' }} />
                            <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ff0055', letterSpacing: '2px', textShadow: '0 0 10px rgba(255,0,85,0.5)', margin: 0, fontSize: '20px' }}>
                                ⚠️ INSUFFICIENT STOCK!
                            </h3>
                        </div>

                        <div style={{
                            background: 'rgba(255, 0, 85, 0.05)', border: '1px solid rgba(255, 0, 85, 0.2)',
                            borderRadius: '6px', padding: '16px', marginBottom: '24px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <span style={{ color: '#94a3b8', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>SKU REQUESTED:</span>
                                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{emergencyConfirm.sku}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <span style={{ color: '#94a3b8', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>CURRENT AVAILABLE:</span>
                                <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>{emergencyConfirm.current_stock} Units</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#94a3b8', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>ATTEMPTING TO SELL:</span>
                                <span style={{ color: '#ff0055', fontSize: '14px', fontWeight: 'bold' }}>{emergencyConfirm.requested} Units</span>
                            </div>
                        </div>

                        {/* AI RESTOCK ADVICE INJECTION */}
                        {emergencyConfirm.advice === null ? (
                            <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.05)', border: '1px dashed rgba(56, 189, 248, 0.3)', borderRadius: '6px', marginBottom: '24px', textAlign: 'center' }}>
                                <span style={{ color: '#38bdf8', fontSize: '12px', fontFamily: "'Outfit', monospace", animation: 'pulse 1.5s infinite' }}>
                                    ⟳ AI IS CALCULATING EMERGENCY RESTOCK TARGET...
                                </span>
                            </div>
                        ) : (
                            <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '16px' }}>🤖</span>
                                    <span style={{ color: '#38bdf8', fontSize: '12px', fontFamily: "'Inter', sans-serif", fontWeight: 'bold', letterSpacing: '1px' }}>AI RESTOCK ADVICE</span>
                                </div>
                                <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                                    To cover this backorder and maintain optimal safety stock, DropEx AI recommends you immediately order
                                    <strong style={{ color: '#38bdf8', padding: '0 4px', fontSize: '15px' }}>
                                        {emergencyConfirm.advice?.recommended
                                            ? (Math.max(0, emergencyConfirm.requested - emergencyConfirm.current_stock) + emergencyConfirm.advice.recommended)
                                            : 'TBD'
                                        } Units
                                    </strong>
                                    from your supplier.
                                </p>
                            </div>
                        )}

                        <p style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '24px', lineHeight: '1.6', fontFamily: "'Inter', sans-serif" }}>
                            Do you want to <strong style={{ color: '#ff0055' }}>FORCE THIS SALE AS AN EMERGENCY BACKORDER?</strong><br /><br />
                            This will immediately escalate to the inventory manager with a strict <strong>8-day SLA deadline</strong>.
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={cancelEmergencyBackorder} style={{
                                flex: 1, padding: "14px", background: 'rgba(255, 255, 255, 0.03)',
                                color: "#94a3b8", fontWeight: "bold", border: '1px solid rgba(255,255,255,0.1)', borderRadius: "6px", cursor: "pointer",
                                fontFamily: "'Outfit', monospace", letterSpacing: '1px', transition: 'all 0.3s'
                            }}>
                                CANCEL
                            </button>

                            <button onClick={confirmEmergencyBackorder} style={{
                                flex: 2, padding: "14px", background: 'linear-gradient(135deg, rgba(255, 0, 85, 0.8), rgba(200, 0, 60, 0.8))',
                                color: "#fff", fontWeight: "bold", border: '1px solid rgba(255, 0, 85, 0.5)', borderRadius: "6px", cursor: "pointer",
                                fontFamily: "'Outfit', monospace", letterSpacing: '1px', boxShadow: '0 0 20px rgba(255, 0, 85, 0.3)',
                                transition: 'all 0.3s'
                            }}>
                                🚨 FORCE EMERGENCY BACKORDER
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
