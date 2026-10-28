import { useState, useEffect } from 'react';
import { getAlerts, acknowledge_alert, setOverrideThreshold, updateInventory, adjustInventory, getInventoryHistory } from '../services/api';
import WhyPopup from '../components/WhyPopup';
import './Inventory.css';

export default function Inventory() {
    const [alerts, setAlerts] = useState([]);
    const [invHistory, setInvHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [selectedSku, setSelectedSku] = useState(null);
    const [hovered, setHovered] = useState(null);
    const [overrideSku, setOverrideSku] = useState(null);
    const [overrideVal, setOverrideVal] = useState('');
    const [adjustSku, setAdjustSku] = useState(null);
    const [adjustVal, setAdjustVal] = useState('');
    const [adjustReason, setAdjustReason] = useState('Typo Correction');
    const [arrivedModal, setArrivedModal] = useState(null);
    const [arrivedQty, setArrivedQty] = useState('');
    const [arrivedPrice, setArrivedPrice] = useState('');
    const [completingSkus, setCompletingSkus] = useState([]);
    // Filtering State
    const [filterUrgency, setFilterUrgency] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const categories = ['ALL', ...new Set(alerts.map(a => a.category).filter(Boolean))];

    const filteredAlerts = alerts.filter(a => {
        if (filterUrgency !== 'ALL') {
            if (filterUrgency === 'REORDER' && !['REORDER', 'URGENT'].includes(a.urgency)) return false;
            if (filterUrgency === 'CRITICAL' && a.urgency !== 'CRITICAL') return false;
            if (filterUrgency === 'OK' && a.urgency !== 'OK') return false;
        }
        
        if (filterCategory !== 'ALL' && a.category !== filterCategory) return false;
        
        if (filterStatus === 'MANUAL_OVERRIDE' && a.mode !== '⚙️ MANUAL OVERRIDE') return false;
        if (filterStatus === 'OVERSTOCKED' && !(a.avg_daily_demand > 0 && a.current_stock > a.avg_daily_demand * 90)) return false;
        
        return true;
    });

    const totalSkus = filteredAlerts.length;
    const needAction = filteredAlerts.filter(a => !a.acknowledged && ['EMERGENCY', 'CRITICAL', 'REORDER', 'URGENT'].includes(a.urgency)).length;
    const orderPlaced = filteredAlerts.filter(a => a.acknowledged).length;

    useEffect(() => { 
        loadAlerts(); 
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setInvHistory(await getInventoryHistory());
        } catch (e) { console.error("Failed to load inventory history", e); }
    };

    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyCapitalSpent = invHistory.reduce((sum, h) => {
        if (h.timestamp && h.timestamp.startsWith(currentMonth) && h.type === 'RESTOCK' && h.cost) {
            return sum + Number(h.cost);
        }
        return sum;
    }, 0);

    const loadAlerts = async () => {
        try {
            setLoading(true); setErr('');
            setAlerts(await getAlerts());
        } catch (e) { setErr(e.message); }
        finally { setLoading(false); }
    };

    const handleAcknowledge = async (sku) => {
        try {
            await acknowledge_alert(sku);
            // ZERO-READ UPDATE: Instantly modify local state instead of doing costly DB fetch
            setAlerts(prev => prev.map(a => a.sku === sku ? { ...a, acknowledged: true } : a));
        } catch (e) {
            setErr("Failed to acknowledge alert: " + e.message);
        }
    };

    const handleArrivedSubmit = async (e) => {
        e.preventDefault();
        const qty = parseInt(arrivedQty);
        const price = parseFloat(arrivedPrice);
        if (!qty || isNaN(qty) || qty <= 0) return;
        if (!price || isNaN(price) || price < 0) {
            setErr("Please enter a valid Supplier Unit Price (COGS).");
            return;
        }
        
        try {
            const newTotal = arrivedModal.current_stock + qty;
            await updateInventory(arrivedModal.sku, { 
                current_stock: newTotal, 
                unit_price: price,
                acknowledged: false 
            });
            
            const isFullyResolved = newTotal > arrivedModal.reorder_point;

            if (isFullyResolved) {
                // Begin Resolution Animation
                const skuToRemove = arrivedModal.sku;
                setCompletingSkus(prev => [...prev, skuToRemove]);
                setArrivedModal(null);
                setArrivedQty('');
                setArrivedPrice('');

                // Wait 1.2s for progress bar to max out and card to fade away before deletion
                setTimeout(() => {
                    setAlerts(prev => prev.filter(a => a.sku !== skuToRemove));
                    setCompletingSkus(prev => prev.filter(s => s !== skuToRemove));
                }, 1200);
            } else {
                // Partially resolved pipeline. Revert to 0% progress and update numbers locally.
                setAlerts(prev => prev.map(a => 
                    a.sku === arrivedModal.sku 
                        ? { 
                            ...a, 
                            current_stock: newTotal, 
                            acknowledged: false,
                            days_of_stock: a.avg_daily_demand > 0 ? parseFloat((newTotal / a.avg_daily_demand).toFixed(1)) : 999
                          } 
                        : a
                ));
                setArrivedModal(null);
                setArrivedQty('');
                setArrivedPrice('');
            }

        } catch (e) {
            setErr("Failed to verify arrival: " + e.message);
        }
    };

    const handleSetOverride = async (e) => {
        e.preventDefault();
        try {
            await setOverrideThreshold(overrideSku.sku, parseInt(overrideVal));
            setOverrideSku(null);
            setOverrideVal('');
            await loadAlerts();
        } catch (error) {
            setErr("Failed to set override: " + error.message);
        }
    };

    const handleAdjustSubmit = async (e) => {
        e.preventDefault();
        try {
            const newStockVal = parseInt(adjustVal);
            if (isNaN(newStockVal) || newStockVal < 0) {
                setErr("Invalid stock value. Must be a non-negative number.");
                return;
            }
            await adjustInventory(adjustSku.sku, newStockVal, adjustReason);
            setAdjustSku(null);
            setAdjustVal('');
            await loadAlerts();
        } catch (error) {
            setErr("Failed to adjust stock: " + error.message);
        }
    };

    const getUrgencyBadge = (u) => {
        switch (u) {
            case 'EMERGENCY': return { text: 'EMERGENCY', color: '#b8003d', bg: 'rgba(255,0,85,.15)' };
            case 'CRITICAL': return { text: 'CRITICAL', color: '#dc2626', bg: 'rgba(239,68,68,.1)' };
            case 'URGENT': return { text: 'URGENT', color: '#ea580c', bg: 'rgba(249,115,22,.1)' };
            case 'REORDER': return { text: 'REORDER', color: '#ca8a04', bg: 'rgba(234,179,8,.1)' };
            default: return { text: 'OK', color: '#16a34a', bg: 'rgba(34,197,94,.1)' };
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Scanning inventory for alerts...</div>;

    return (
        <div className="inv-wrap"> {/* Scoped to not break other components */}
            <div className="grid-bg" />
            <div className="blob1" />
            <div className="blob2" />

            <main style={{ display: 'flex', flexDirection: 'column', minHeight: '85vh' }}>
                <div className="page-header">
                    <div>

                        <h1 className="page-title">INVENTORY <span>ALERTS</span></h1>
                        <div className="title-bar" style={{ marginTop: '16px' }} />
                    </div>
                    <button className="refresh-btn" onClick={loadAlerts}>↻ REFRESH LIST</button>
                </div>

                {/* Inventory Summary Module */}
                <div className="summary-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div className="summary-card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(255,255,255,0.97))', padding: '24px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ fontSize: '11px', color: '#556781', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Total SKUs</div>
                        <div style={{ fontSize: '32px', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 'bold', color: '#2563eb' }}>{totalSkus}</div>
                    </div>
                    <div className="summary-card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(255,255,255,0.97))', padding: '24px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ fontSize: '11px', color: '#556781', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Need Action</div>
                        <div style={{ fontSize: '32px', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 'bold', color: '#dc2626' }}>{needAction}</div>
                    </div>
                    <div className="summary-card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(255,255,255,0.97))', padding: '24px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                        <div style={{ fontSize: '11px', color: '#556781', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Order Placed</div>
                        <div style={{ fontSize: '32px', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 'bold', color: '#16a34a' }}>{orderPlaced}</div>
                    </div>
                    <div className="summary-card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(255,255,255,0.97))', padding: '24px', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                        <div style={{ fontSize: '11px', color: '#556781', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Monthly Capital Spent</div>
                        <div style={{ fontSize: '26px', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 'bold', color: '#ca8a04', marginTop: '6px' }}>Rs. {monthlyCapitalSpent.toLocaleString()}</div>
                    </div>
                </div>

                <div className="filter-bar" style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                        value={filterUrgency}
                        onChange={e => setFilterUrgency(e.target.value)}
                        style={{ padding: '8px 12px', background: '#ffffff', color: '#556781', border: '1px solid #334155', borderRadius: '6px', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}
                    >
                        <option value="ALL">All Urgencies</option>
                        <option value="EMERGENCY">Emergency Backorders</option>
                        <option value="CRITICAL">Critical Only</option>
                        <option value="REORDER">Reorder Needed</option>
                        <option value="OK">Stock OK</option>
                    </select>

                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        style={{ padding: '8px 12px', background: '#ffffff', color: '#556781', border: '1px solid #334155', borderRadius: '6px', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}
                    >
                        {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>)}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        style={{ padding: '8px 12px', background: '#ffffff', color: '#556781', border: '1px solid #334155', borderRadius: '6px', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}
                    >
                        <option value="ALL">All Special Statuses</option>
                        <option value="MANUAL_OVERRIDE">Manually Overridden</option>
                        <option value="OVERSTOCKED">Overstocked (&gt;90 Days)</option>
                    </select>
                    <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', fontFamily: "'Inter', sans-serif" }}>
                        {filteredAlerts.length} results
                    </div>
                </div>

                {err ? <div className="text-red-500 mb-4">{err}</div> : null}

                <div className="cards-grid">
                    {filteredAlerts.map((a, i) => {
                        const badge = getUrgencyBadge(a.urgency);
                        const isCompleting = completingSkus.includes(a.sku);
                        
                        return (
                            <div
                                key={i}
                                className="item-card"
                                style={{ 
                                    animationDelay: `${(i % 9) * 0.05}s`,
                                    transition: 'all 1s ease-in-out',
                                    opacity: isCompleting ? 0 : 1,
                                    transform: isCompleting ? 'scale(0.95)' : 'scale(1)',
                                    pointerEvents: isCompleting ? 'none' : 'auto'
                                }}
                            >
                                <div className="card-top">
                                    <div className="card-name truncate" title={a.product_name}>{a.product_name}</div>
                                    <div className="ok-badge" style={{
                                        color: badge.color,
                                        borderColor: badge.color,
                                        background: 'transparent',
                                        boxShadow: `0 0 10px ${badge.color}15`
                                    }}>
                                        <span style={{ fontSize: '11px', marginRight: '6px' }}>●</span> {badge.text}
                                    </div>
                                </div>
                                <div className="card-sku">{a.sku}</div>

                                <div className="card-stats" style={{ gridTemplateColumns: a.reorder_flag ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                                    <div className="stat-block">
                                        <div className="stat-label-sm">Stock</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div className="stat-val-sm" style={{ color: a.current_stock < a.reorder_point ? '#ea580c' : '#16a34a', textShadow: a.current_stock < a.reorder_point ? '0 0 10px transparent' : '0 0 10px transparent' }}>{a.current_stock}</div>
                                            <button 
                                                onClick={() => { setAdjustSku(a); setAdjustVal(a.current_stock); }}
                                                style={{ background: 'transparent', border: 'none', color: '#556781', cursor: 'pointer', fontSize: '12px' }}
                                                title="Correct Stock Entry"
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                    </div>
                                    <div className="stat-block">
                                        <div className="stat-label-sm" style={{ color: '#2563eb' }}>Days Left</div>
                                        <div className="stat-val-sm" style={{ color: "#2563eb", }}>
                                            {a.days_of_stock >= 999 ? '999+' : a.days_of_stock}
                                        </div>
                                    </div>
                                    {!!a.reorder_flag && a.recommended_order_quantity > 0 && (
                                        <div className="stat-block">
                                            <div className="stat-label-sm" style={{ color: '#9333ea' }}>Order Qty</div>
                                            <div className="stat-val-sm" style={{ color: "#6803d3", }}>
                                                +{a.recommended_order_quantity}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="divider" style={{ marginTop: 'auto' }} />

                                {/* RESOLUTION PROGRESS BAR */}
                                <div style={{ padding: '0 16px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                                    {/* Background lines */}
                                    <div style={{ position: 'absolute', top: '12px', left: '32px', right: '50%', height: '2px', background: a.acknowledged || isCompleting ? '#3b82f6' : '#334155', zIndex: 1, transition: 'background 0.5s' }} />
                                    <div style={{ position: 'absolute', top: '12px', left: '50%', right: '32px', height: '2px', background: isCompleting ? '#3b82f6' : '#334155', zIndex: 1, transition: 'background 0.5s' }} />
                                    
                                    {/* Node 1: Triggered */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, position: 'relative' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: '0 0 10px rgba(59,130,246,0.14)' }}>
                                            ✓
                                        </div>
                                        <div style={{ position: 'absolute', top: '32px', fontSize: '12px', color: '#2563eb', fontFamily: "'Inter', sans-serif", fontWeight: '500' }}>Triggered</div>
                                    </div>

                                    {/* Node 2: Ordered */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, position: 'relative' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: a.acknowledged || isCompleting ? '#3b82f6' : '#f5f7fa', border: a.acknowledged || isCompleting ? 'none' : '1px solid #334155', color: a.acknowledged || isCompleting ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', transition: 'all 0.5s', boxShadow: a.acknowledged || isCompleting ? '0 0 10px rgba(59,130,246,0.14)' : 'none' }}>
                                            {a.acknowledged || isCompleting ? '✓' : '2'}
                                        </div>
                                        <div style={{ position: 'absolute', top: '32px', fontSize: '12px', color: a.acknowledged || isCompleting ? '#2563eb' : '#64748b', fontFamily: "'Inter', sans-serif", fontWeight: '500', transition: 'color 0.5s' }}>Ordered</div>
                                    </div>

                                    {/* Node 3: Resolved */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, position: 'relative' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isCompleting ? '#3b82f6' : '#f5f7fa', border: isCompleting ? 'none' : '1px solid #334155', color: isCompleting ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', transition: 'all 0.5s', boxShadow: isCompleting ? '0 0 10px rgba(59,130,246,0.14)' : 'none' }}>
                                            {isCompleting ? '✓' : '3'}
                                        </div>
                                        <div style={{ position: 'absolute', top: '32px', fontSize: '12px', color: isCompleting ? '#2563eb' : '#64748b', fontFamily: "'Inter', sans-serif", fontWeight: '500', transition: 'color 0.5s' }}>Resolved</div>
                                    </div>
                                </div>

                                <div className="card-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setSelectedSku(a)}
                                        style={{
                                            background: 'rgba(139, 92, 246, 0.1)',
                                            border: '1px solid rgba(139, 92, 246, 0.4)',
                                            color: '#6803d3',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                            transition: 'all 0.2s',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0
                                        }}
                                        title="Click to view AI mathematics and reasoning"
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(139, 92, 246, 0.3)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <span>{a.mode} • {a.confidence.split(' ')[0]}</span>
                                    </button>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {a.acknowledged ? (
                                            <>
                                                <div style={{ fontSize: '11px', color: '#64748b', border: '1px solid #334155', padding: '4px 8px', borderRadius: '2px', background: '#f2f4f7', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '1px' }}>
                                                    ORDER PLACED ✓
                                                </div>
                                                <button
                                                    onClick={() => { setArrivedModal(a); setArrivedQty(''); }}
                                                    style={{ fontSize: '11px', color: '#16a34a', border: '1px solid rgba(34,197,94,.4)', padding: '4px 8px', borderRadius: '2px', background: 'transparent', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '1px', transition: 'all 0.2s', marginLeft: '8px' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,.1)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(34,197,94,.3)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                                                >
                                                    TRUCK ARRIVED ➔
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleAcknowledge(a.sku)}
                                                style={{ fontSize: '11px', color: '#ea580c', border: '1px solid rgba(249,115,22,.4)', padding: '4px 8px', borderRadius: '2px', background: 'transparent', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '1px', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,.1)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(249,115,22,.3)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                MARK AS ORDERED ✓
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setOverrideSku(a)}
                                            style={{ fontSize: '12px', color: '#556781', border: '1px solid #334155', padding: '4px 8px', borderRadius: '2px', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s', marginLeft: '4px', fontFamily: "'Inter', system-ui, sans-serif" }}
                                            title="Set Manual Override Threshold"
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(148,163,184,.1)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            ⚙️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredAlerts.length === 0 && (
                        <div style={{ 
                            gridColumn: '1 / -1', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            flexGrow: 1,
                            minHeight: '400px',
                            opacity: 0.8
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(0,229,255,0.105))' }}>📦</div>
                            <h2 style={{ fontSize: '24px', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.06em', color: '#0f172a', textAlign: 'center', }}>
                                NO ALERTS GENERATED
                            </h2>
                            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#556781', marginTop: '12px', fontSize: '14px' }}>
                                Your inventory is perfectly balanced according to current filters.
                            </p>
                        </div>
                    )}
                </div>

                <div style={{ flexGrow: 1 }}></div>

                <div className="status-bar" style={{ marginTop: 'auto' }}>
                    {[
                        { label: "SYSTEM STATUS", val: "ONLINE", color: "#16a34a" },
                        { label: "MODULE", val: "M3", color: "#ea580c" },
                        { label: "TOTAL SKUs VIEWED", val: `${filteredAlerts.length}`, color: "#2563eb" },
                        { label: "ALERT LEVEL", val: filteredAlerts.some(a => a.urgency === 'CRITICAL') ? "CRITICAL" : "NOMINAL", color: "#4f46e5" },
                    ].map(s => (
                        <div key={s.label} className="stat">
                            <span className="stat-dot" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                            <span className="stat-lbl">{s.label}:</span>
                            <span className="stat-v" style={{ color: s.color }}>{s.val}</span>
                        </div>
                    ))}
                </div>
            </main>

            {selectedSku && <WhyPopup alert={selectedSku} onClose={() => setSelectedSku(null)} />}
            
            {overrideSku && (
                <div style={{
                    position: "fixed", inset: 0,
                    background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "16px", zIndex: 9999
                }}>
                    <div style={{
                        background: "linear-gradient(145deg, #ffffff 0%, #ffffff 100%)",
                        border: "1px solid rgba(0, 229, 255, 0.15)",
                        boxShadow: "0 0 0 1px rgba(0,229,255,0.052), 0 0 60px rgba(0,229,255,0.028), 0 40px 80px rgba(15,23,42,0.09)",
                        borderRadius: "16px", padding: "24px", maxWidth: "400px", width: "100%", position: "relative"
                    }}>
                        <button onClick={() => setOverrideSku(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900">✕</button>
                        <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Set Manual Override</h3>
                        <p className="text-sm text-slate-500 mb-4">Set a custom fallback reorder point for <strong>{overrideSku.sku}</strong>. This bypasses AI constraints.</p>
                        <form onSubmit={handleSetOverride}>
                            <input 
                                type="number" 
                                style={{
                                    width: "100%", background: "#ffffff", color: "#0891b2", 
                                    border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "6px", 
                                    padding: "12px", marginBottom: "16px", fontFamily: "'Inter', system-ui, sans-serif",
                                    outline: "none", boxShadow: "inset 0 2px 4px rgba(15,23,42,0.09)"
                                }}
                                placeholder="E.g. 100"
                                value={overrideVal}
                                onChange={e => setOverrideVal(e.target.value)}
                                min="0" required
                            />
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => setOverrideSku(null)} style={{
                                    flex: 1, padding: "10px", background: "transparent", color: "#64748b", 
                                    border: "1px solid rgba(15,23,42,0.11)", borderRadius: "6px", cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif"
                                }}>Cancel</button>
                                <button type="submit" style={{
                                    flex: 1, padding: "10px", background: "linear-gradient(135deg, #00c8e0, #0088cc)", 
                                    color: "#000", fontWeight: "bold", border: "none", borderRadius: "6px", cursor: "pointer", 
                                    fontFamily: "'Inter', system-ui, sans-serif", boxShadow: "0 0 15px rgba(0,229,255,0.105)"
                                }}>Save Rule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {adjustSku && (
                <div style={{
                    position: "fixed", inset: 0,
                    background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "16px", zIndex: 9999
                }}>
                    <div style={{
                        background: "linear-gradient(145deg, #ffffff 0%, #ffffff 100%)",
                        border: "1px solid rgba(0, 229, 255, 0.15)",
                        boxShadow: "0 0 0 1px rgba(0,229,255,0.052), 0 0 60px rgba(0,229,255,0.028), 0 40px 80px rgba(15,23,42,0.09)",
                        borderRadius: "16px", padding: "24px", maxWidth: "400px", width: "100%", position: "relative"
                    }}>
                        <button onClick={() => setAdjustSku(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900">✕</button>
                        <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Adjust Stock</h3>
                        <p className="text-sm text-slate-500 mb-4">Correct the actual physical stock for <strong>{adjustSku.sku}</strong>. This action will be logged.</p>
                        <form onSubmit={handleAdjustSubmit}>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '4px', fontFamily: "'Inter', system-ui, sans-serif" }}>New Physical Stock Count (Current: {adjustSku.current_stock})</label>
                            <input 
                                type="number" 
                                style={{
                                    width: "100%", background: "#ffffff", color: "#0891b2", 
                                    border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "6px", 
                                    padding: "12px", marginBottom: "16px", fontFamily: "'Inter', system-ui, sans-serif",
                                    outline: "none", boxShadow: "inset 0 2px 4px rgba(15,23,42,0.09)"
                                }}
                                placeholder="Exact Count"
                                value={adjustVal}
                                onChange={e => setAdjustVal(e.target.value)}
                                min="0" required
                            />
                            
                            <label style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '4px', fontFamily: "'Inter', system-ui, sans-serif" }}>Reason for Correction</label>
                            <select 
                                value={adjustReason}
                                onChange={e => setAdjustReason(e.target.value)}
                                style={{
                                    width: "100%", background: "#ffffff", color: "#0891b2", 
                                    border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "6px", 
                                    padding: "12px", marginBottom: "24px", fontFamily: "'Inter', system-ui, sans-serif",
                                    outline: "none"
                                }}
                            >
                                <option value="Typo Correction">Typo Correction</option>
                                <option value="Damaged Goods">Damaged Goods</option>
                                <option value="Lost / Missing">Lost / Missing</option>
                                <option value="Found Stock">Found Stock</option>
                                <option value="Other">Other</option>
                            </select>

                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => setAdjustSku(null)} style={{
                                    flex: 1, padding: "10px", background: "transparent", color: "#64748b", 
                                    border: "1px solid rgba(15,23,42,0.11)", borderRadius: "6px", cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif"
                                }}>Cancel</button>
                                <button type="submit" style={{
                                    flex: 1, padding: "10px", background: "linear-gradient(135deg, #00c8e0, #0088cc)", 
                                    color: "#000", fontWeight: "bold", border: "none", borderRadius: "6px", cursor: "pointer", 
                                    fontFamily: "'Inter', system-ui, sans-serif", boxShadow: "0 0 15px rgba(0,229,255,0.105)"
                                }}>Save Correction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {arrivedModal && (() => {
                const qty = parseInt(arrivedQty) || 0;
                const newTotal = arrivedModal.current_stock + qty;
                const maxReasonable = arrivedModal.avg_daily_demand * 90;
                const showsWarning = arrivedModal.avg_daily_demand > 0 && newTotal > maxReasonable;
                const monthsSupply = arrivedModal.avg_daily_demand > 0 ? (newTotal / arrivedModal.avg_daily_demand / 30).toFixed(1) : 0;
                
                const expectedPrice = arrivedModal.unit_price || 0;
                const currentPriceVal = parseFloat(arrivedPrice);
                let priceWarning = false;
                let priceDeviationPercent = 0;
                
                if (expectedPrice > 0 && !isNaN(currentPriceVal)) {
                    const diff = Math.abs(currentPriceVal - expectedPrice);
                    priceDeviationPercent = (diff / expectedPrice) * 100;
                    if (priceDeviationPercent > 15) {
                        priceWarning = true;
                    }
                }
                
                const showAnyWarning = showsWarning || priceWarning;

                return (
                    <div style={{
                        position: "fixed", inset: 0,
                        background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "16px", zIndex: 9999
                    }}>
                        <div style={{
                            background: "linear-gradient(145deg, #ffffff 0%, #ffffff 100%)",
                            border: "1px solid rgba(34, 197, 94, 0.15)",
                            boxShadow: "0 0 0 1px rgba(34,197,94,0.052), 0 0 60px rgba(34,197,94,0.028), 0 40px 80px rgba(15,23,42,0.09)",
                            borderRadius: "16px", padding: "24px", maxWidth: "450px", width: "100%", position: "relative"
                        }}>
                            <button onClick={() => setArrivedModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900">✕</button>
                            <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>🚚 Truck Arrived</h3>
                            <p className="text-sm text-slate-500 mb-4">Log physical inbound stock for <strong>{arrivedModal.sku}</strong>.</p>
                            
                            <form onSubmit={handleArrivedSubmit}>
                                <label style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '4px', fontFamily: "'Inter', system-ui, sans-serif" }}>Received Quantity</label>
                                <input 
                                    type="number" 
                                    style={{
                                        width: "100%", background: "#ffffff", color: "#16a34a", 
                                        border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "6px", 
                                        padding: "12px", marginBottom: "16px", fontFamily: "'Inter', system-ui, sans-serif",
                                        outline: "none", boxShadow: "inset 0 2px 4px rgba(15,23,42,0.09)"
                                    }}
                                    placeholder="E.g. 200"
                                    value={arrivedQty}
                                    onChange={e => setArrivedQty(e.target.value)}
                                    min="1" required
                                />

                                <label style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '4px', fontFamily: "'Inter', system-ui, sans-serif" }}>Supplier Unit Price (COGS)</label>
                                <input 
                                    type="number" 
                                    style={{
                                        width: "100%", background: "#ffffff", color: "#2563eb", 
                                        border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "6px", 
                                        padding: "12px", marginBottom: expectedPrice > 0 ? "8px" : "16px", fontFamily: "'Inter', system-ui, sans-serif",
                                        outline: "none", boxShadow: "inset 0 2px 4px rgba(15,23,42,0.09)"
                                    }}
                                    placeholder={`E.g. ${expectedPrice > 0 ? expectedPrice.toFixed(2) : "450.00"}`}
                                    value={arrivedPrice}
                                    onChange={e => setArrivedPrice(e.target.value)}
                                    min="0" step="0.01" required
                                />
                                
                                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', fontFamily: "'Inter', system-ui, sans-serif" }}>
                                    {expectedPrice > 0 
                                        ? `Historical expected price: $${expectedPrice.toFixed(2)}`
                                        : `Historical expected price: Not Set in Database`
                                    }
                                </div>
                                
                                {showsWarning && (
                                    <div style={{
                                        background: "rgba(249, 115, 22, 0.1)", border: "1px solid rgba(249, 115, 22, 0.4)",
                                        borderRadius: "6px", padding: "12px", marginBottom: "16px",
                                        color: "#d36d03", fontSize: "12px", lineHeight: "1.5"
                                    }}>
                                        <strong style={{ color: "#ea580c", display: "block", marginBottom: "4px" }}>⚠️ EXTREME CAPITAL TIE-UP WARNING</strong>
                                        Based on the AI model ({arrivedModal.avg_daily_demand} sales/day), receiving {qty} units equals a <strong>{monthsSupply}-Month supply</strong>. 
                                        This violates inventory cost-minimization equations.
                                    </div>
                                )}
                                
                                {priceWarning && (
                                    <div style={{
                                        background: "rgba(225, 29, 72, 0.1)", border: "1px solid rgba(225, 29, 72, 0.4)",
                                        borderRadius: "6px", padding: "12px", marginBottom: "16px",
                                        color: "#d2041d", fontSize: "12px", lineHeight: "1.5"
                                    }}>
                                        <strong style={{ color: "#a31534", display: "block", marginBottom: "4px" }}>⚠️ PRICE DEVIATION WARNING</strong>
                                        The entered price (${currentPriceVal.toFixed(2)}) is <strong>{priceDeviationPercent.toFixed(1)}% {currentPriceVal > expectedPrice ? 'higher' : 'lower'}</strong> than the historical average (${expectedPrice.toFixed(2)}). Please verify this is not a typo.
                                    </div>
                                )}

                                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                                    <button type="button" onClick={() => setArrivedModal(null)} style={{
                                        flex: 1, padding: "10px", background: "transparent", color: "#64748b", 
                                        border: "1px solid rgba(15,23,42,0.11)", borderRadius: "6px", cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif"
                                    }}>Cancel</button>
                                    <button type="submit" style={{
                                        flex: 2, padding: "10px", background: showAnyWarning ? "linear-gradient(135deg, #f97316, #ea580c)" : "linear-gradient(135deg, #22c55e, #16a34a)", 
                                        color: "#000", fontWeight: "bold", border: "none", borderRadius: "6px", cursor: "pointer", 
                                        fontFamily: "'Inter', system-ui, sans-serif", boxShadow: showAnyWarning ? "0 0 15px rgba(249,115,22,0.105)" : "0 0 15px rgba(34,197,94,0.105)",
                                        transition: "all 0.2s"
                                    }}>
                                        {showAnyWarning ? "Force Accept Warnings && Log Stock" : "Log Inbound Stock"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
