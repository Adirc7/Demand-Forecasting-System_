import { useState, useEffect } from 'react';
import { getAlerts, acknowledge_alert, setOverrideThreshold, updateInventory, adjustInventory } from '../services/api';
import WhyPopup from '../components/WhyPopup';
import './Inventory.css';

export default function Inventory() {
    const [alerts, setAlerts] = useState([]);
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

    useEffect(() => { loadAlerts(); }, []);

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
            case 'EMERGENCY': return { text: 'EMERGENCY', color: '#ff0055', bg: 'rgba(255,0,85,.15)' };
            case 'CRITICAL': return { text: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
            case 'URGENT': return { text: 'URGENT', color: '#f97316', bg: 'rgba(249,115,22,.1)' };
            case 'REORDER': return { text: 'REORDER', color: '#eab308', bg: 'rgba(234,179,8,.1)' };
            default: return { text: 'OK', color: '#22c55e', bg: 'rgba(34,197,94,.1)' };
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Scanning inventory for alerts...</div>;

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
                    <div className="summary-card" style={{ background: 'linear-gradient(135deg, rgba(24, 28, 40, .97), rgba(30, 24, 45, .97))', padding: '24px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Total SKUs</div>
                        <div style={{ fontSize: '32px', fontFamily: "'Outfit', monospace", fontWeight: 'bold', color: '#3b82f6' }}>{totalSkus}</div>
                    </div>
                    <div className="summary-card" style={{ background: 'linear-gradient(135deg, rgba(24, 28, 40, .97), rgba(30, 24, 45, .97))', padding: '24px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Need Action</div>
                        <div style={{ fontSize: '32px', fontFamily: "'Outfit', monospace", fontWeight: 'bold', color: '#ef4444' }}>{needAction}</div>
                    </div>
                    <div className="summary-card" style={{ background: 'linear-gradient(135deg, rgba(24, 28, 40, .97), rgba(30, 24, 45, .97))', padding: '24px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Order Placed</div>
                        <div style={{ fontSize: '32px', fontFamily: "'Outfit', monospace", fontWeight: 'bold', color: '#22c55e' }}>{orderPlaced}</div>
                    </div>
                </div>

                <div className="filter-bar" style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                        value={filterUrgency}
                        onChange={e => setFilterUrgency(e.target.value)}
                        style={{ padding: '8px 12px', background: 'rgba(6, 10, 16, 0.8)', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}
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
                        style={{ padding: '8px 12px', background: 'rgba(6, 10, 16, 0.8)', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}
                    >
                        {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>)}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        style={{ padding: '8px 12px', background: 'rgba(6, 10, 16, 0.8)', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '13px' }}
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
                                        <span style={{ fontSize: '8px', marginRight: '6px' }}>●</span> {badge.text}
                                    </div>
                                </div>
                                <div className="card-sku">{a.sku}</div>

                                <div className="card-stats" style={{ gridTemplateColumns: a.reorder_flag ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                                    <div className="stat-block">
                                        <div className="stat-label-sm">Stock</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div className="stat-val-sm" style={{ color: a.current_stock < a.reorder_point ? '#f97316' : '#22c55e', textShadow: a.current_stock < a.reorder_point ? '0 0 10px rgba(249,115,22,0.4)' : '0 0 10px rgba(34,197,94,0.4)' }}>{a.current_stock}</div>
                                            <button 
                                                onClick={() => { setAdjustSku(a); setAdjustVal(a.current_stock); }}
                                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '10px' }}
                                                title="Correct Stock Entry"
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                    </div>
                                    <div className="stat-block">
                                        <div className="stat-label-sm" style={{ color: '#60a5fa' }}>Days Left</div>
                                        <div className="stat-val-sm" style={{ color: "#3b82f6", textShadow: "0 0 10px rgba(59,130,246,0.4)" }}>
                                            {a.days_of_stock >= 999 ? '999+' : a.days_of_stock}
                                        </div>
                                    </div>
                                    {!!a.reorder_flag && a.recommended_order_quantity > 0 && (
                                        <div className="stat-block">
                                            <div className="stat-label-sm" style={{ color: '#c084fc' }}>Order Qty</div>
                                            <div className="stat-val-sm" style={{ color: "#d8b4fe", textShadow: "0 0 10px rgba(216,180,254,0.4)" }}>
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
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: '0 0 10px rgba(59,130,246,0.4)' }}>
                                            ✓
                                        </div>
                                        <div style={{ position: 'absolute', top: '32px', fontSize: '10px', color: '#3b82f6', fontFamily: "'Inter', sans-serif", fontWeight: '500' }}>Triggered</div>
                                    </div>

                                    {/* Node 2: Ordered */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, position: 'relative' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: a.acknowledged || isCompleting ? '#3b82f6' : '#1e293b', border: a.acknowledged || isCompleting ? 'none' : '1px solid #334155', color: a.acknowledged || isCompleting ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', transition: 'all 0.5s', boxShadow: a.acknowledged || isCompleting ? '0 0 10px rgba(59,130,246,0.4)' : 'none' }}>
                                            {a.acknowledged || isCompleting ? '✓' : '2'}
                                        </div>
                                        <div style={{ position: 'absolute', top: '32px', fontSize: '10px', color: a.acknowledged || isCompleting ? '#3b82f6' : '#64748b', fontFamily: "'Inter', sans-serif", fontWeight: '500', transition: 'color 0.5s' }}>Ordered</div>
                                    </div>

                                    {/* Node 3: Resolved */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, position: 'relative' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isCompleting ? '#3b82f6' : '#1e293b', border: isCompleting ? 'none' : '1px solid #334155', color: isCompleting ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', transition: 'all 0.5s', boxShadow: isCompleting ? '0 0 10px rgba(59,130,246,0.4)' : 'none' }}>
                                            {isCompleting ? '✓' : '3'}
                                        </div>
                                        <div style={{ position: 'absolute', top: '32px', fontSize: '10px', color: isCompleting ? '#3b82f6' : '#64748b', fontFamily: "'Inter', sans-serif", fontWeight: '500', transition: 'color 0.5s' }}>Resolved</div>
                                    </div>
                                </div>

                                <div className="card-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setSelectedSku(a)}
                                        style={{
                                            background: 'rgba(139, 92, 246, 0.1)',
                                            border: '1px solid rgba(139, 92, 246, 0.4)',
                                            color: '#d8b4fe',
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
                                                <div style={{ fontSize: '9px', color: '#64748b', border: '1px solid #334155', padding: '4px 8px', borderRadius: '2px', background: 'rgba(51,65,85,.1)', fontFamily: "'Outfit', monospace", letterSpacing: '1px' }}>
                                                    ORDER PLACED ✓
                                                </div>
                                                <button
                                                    onClick={() => { setArrivedModal(a); setArrivedQty(''); }}
                                                    style={{ fontSize: '9px', color: '#22c55e', border: '1px solid rgba(34,197,94,.4)', padding: '4px 8px', borderRadius: '2px', background: 'transparent', cursor: 'pointer', fontFamily: "'Outfit', monospace", letterSpacing: '1px', transition: 'all 0.2s', marginLeft: '8px' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,.1)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(34,197,94,.3)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                                                >
                                                    TRUCK ARRIVED ➔
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleAcknowledge(a.sku)}
                                                style={{ fontSize: '9px', color: '#f97316', border: '1px solid rgba(249,115,22,.4)', padding: '4px 8px', borderRadius: '2px', background: 'transparent', cursor: 'pointer', fontFamily: "'Outfit', monospace", letterSpacing: '1px', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,.1)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(249,115,22,.3)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                MARK AS ORDERED ✓
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setOverrideSku(a)}
                                            style={{ fontSize: '10px', color: '#94a3b8', border: '1px solid #334155', padding: '4px 8px', borderRadius: '2px', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s', marginLeft: '4px', fontFamily: "'Outfit', sans-serif" }}
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
                            <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(0,229,255,0.3))' }}>📦</div>
                            <h2 style={{ fontSize: '24px', fontFamily: "'Orbitron', sans-serif", letterSpacing: '4px', color: '#fff', textAlign: 'center', textShadow: '0 0 20px rgba(0, 229, 255, 0.4)' }}>
                                NO ALERTS GENERATED
                            </h2>
                            <p style={{ fontFamily: "'Space Mono', monospace", color: '#94a3b8', marginTop: '12px', fontSize: '14px' }}>
                                Your inventory is perfectly balanced according to current filters.
                            </p>
                        </div>
                    )}
                </div>

                <div style={{ flexGrow: 1 }}></div>

                <div className="status-bar" style={{ marginTop: 'auto' }}>
                    {[
                        { label: "SYSTEM STATUS", val: "ONLINE", color: "#22c55e" },
                        { label: "MODULE", val: "M3", color: "#f97316" },
                        { label: "TOTAL SKUs VIEWED", val: `${filteredAlerts.length}`, color: "#3b82f6" },
                        { label: "ALERT LEVEL", val: filteredAlerts.some(a => a.urgency === 'CRITICAL') ? "CRITICAL" : "NOMINAL", color: "#818cf8" },
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
                    background: "rgba(6, 10, 16, 0.8)", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "16px", zIndex: 9999
                }}>
                    <div style={{
                        background: "linear-gradient(145deg, #0d1520 0%, #080e18 100%)",
                        border: "1px solid rgba(0, 229, 255, 0.15)",
                        boxShadow: "0 0 0 1px rgba(0, 229, 255, 0.15), 0 0 60px rgba(0, 229, 255, 0.08), 0 40px 80px rgba(0,0,0,0.8)",
                        borderRadius: "16px", padding: "24px", maxWidth: "400px", width: "100%", position: "relative"
                    }}>
                        <button onClick={() => setOverrideSku(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
                        <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>Set Manual Override</h3>
                        <p className="text-sm text-gray-400 mb-4">Set a custom fallback reorder point for <strong>{overrideSku.sku}</strong>. This bypasses AI constraints.</p>
                        <form onSubmit={handleSetOverride}>
                            <input 
                                type="number" 
                                style={{
                                    width: "100%", background: "#060a10", color: "#00e5ff", 
                                    border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "6px", 
                                    padding: "12px", marginBottom: "16px", fontFamily: "'Space Mono', monospace",
                                    outline: "none", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)"
                                }}
                                placeholder="E.g. 100"
                                value={overrideVal}
                                onChange={e => setOverrideVal(e.target.value)}
                                min="0" required
                            />
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => setOverrideSku(null)} style={{
                                    flex: 1, padding: "10px", background: "transparent", color: "#8899aa", 
                                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", fontFamily: "'Space Mono', monospace"
                                }}>Cancel</button>
                                <button type="submit" style={{
                                    flex: 1, padding: "10px", background: "linear-gradient(135deg, #00c8e0, #0088cc)", 
                                    color: "#000", fontWeight: "bold", border: "none", borderRadius: "6px", cursor: "pointer", 
                                    fontFamily: "'Space Mono', monospace", boxShadow: "0 0 15px rgba(0, 229, 255, 0.3)"
                                }}>Save Rule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {adjustSku && (
                <div style={{
                    position: "fixed", inset: 0,
                    background: "rgba(6, 10, 16, 0.8)", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "16px", zIndex: 9999
                }}>
                    <div style={{
                        background: "linear-gradient(145deg, #0d1520 0%, #080e18 100%)",
                        border: "1px solid rgba(0, 229, 255, 0.15)",
                        boxShadow: "0 0 0 1px rgba(0, 229, 255, 0.15), 0 0 60px rgba(0, 229, 255, 0.08), 0 40px 80px rgba(0,0,0,0.8)",
                        borderRadius: "16px", padding: "24px", maxWidth: "400px", width: "100%", position: "relative"
                    }}>
                        <button onClick={() => setAdjustSku(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
                        <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>Adjust Stock</h3>
                        <p className="text-sm text-gray-400 mb-4">Correct the actual physical stock for <strong>{adjustSku.sku}</strong>. This action will be logged.</p>
                        <form onSubmit={handleAdjustSubmit}>
                            <label style={{ display: 'block', color: '#8899aa', fontSize: '12px', marginBottom: '4px', fontFamily: "'Space Mono', monospace" }}>New Physical Stock Count (Current: {adjustSku.current_stock})</label>
                            <input 
                                type="number" 
                                style={{
                                    width: "100%", background: "#060a10", color: "#00e5ff", 
                                    border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "6px", 
                                    padding: "12px", marginBottom: "16px", fontFamily: "'Space Mono', monospace",
                                    outline: "none", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)"
                                }}
                                placeholder="Exact Count"
                                value={adjustVal}
                                onChange={e => setAdjustVal(e.target.value)}
                                min="0" required
                            />
                            
                            <label style={{ display: 'block', color: '#8899aa', fontSize: '12px', marginBottom: '4px', fontFamily: "'Space Mono', monospace" }}>Reason for Correction</label>
                            <select 
                                value={adjustReason}
                                onChange={e => setAdjustReason(e.target.value)}
                                style={{
                                    width: "100%", background: "#060a10", color: "#00e5ff", 
                                    border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "6px", 
                                    padding: "12px", marginBottom: "24px", fontFamily: "'Space Mono', monospace",
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
                                    flex: 1, padding: "10px", background: "transparent", color: "#8899aa", 
                                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", fontFamily: "'Space Mono', monospace"
                                }}>Cancel</button>
                                <button type="submit" style={{
                                    flex: 1, padding: "10px", background: "linear-gradient(135deg, #00c8e0, #0088cc)", 
                                    color: "#000", fontWeight: "bold", border: "none", borderRadius: "6px", cursor: "pointer", 
                                    fontFamily: "'Space Mono', monospace", boxShadow: "0 0 15px rgba(0, 229, 255, 0.3)"
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
                        background: "rgba(6, 10, 16, 0.8)", backdropFilter: "blur(6px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "16px", zIndex: 9999
                    }}>
                        <div style={{
                            background: "linear-gradient(145deg, #0d1520 0%, #080e18 100%)",
                            border: "1px solid rgba(34, 197, 94, 0.15)",
                            boxShadow: "0 0 0 1px rgba(34, 197, 94, 0.15), 0 0 60px rgba(34, 197, 94, 0.08), 0 40px 80px rgba(0,0,0,0.8)",
                            borderRadius: "16px", padding: "24px", maxWidth: "450px", width: "100%", position: "relative"
                        }}>
                            <button onClick={() => setArrivedModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
                            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>🚚 Truck Arrived</h3>
                            <p className="text-sm text-gray-400 mb-4">Log physical inbound stock for <strong>{arrivedModal.sku}</strong>.</p>
                            
                            <form onSubmit={handleArrivedSubmit}>
                                <label style={{ display: 'block', color: '#8899aa', fontSize: '12px', marginBottom: '4px', fontFamily: "'Space Mono', monospace" }}>Received Quantity</label>
                                <input 
                                    type="number" 
                                    style={{
                                        width: "100%", background: "#060a10", color: "#22c55e", 
                                        border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "6px", 
                                        padding: "12px", marginBottom: "16px", fontFamily: "'Space Mono', monospace",
                                        outline: "none", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)"
                                    }}
                                    placeholder="E.g. 200"
                                    value={arrivedQty}
                                    onChange={e => setArrivedQty(e.target.value)}
                                    min="1" required
                                />

                                <label style={{ display: 'block', color: '#8899aa', fontSize: '12px', marginBottom: '4px', fontFamily: "'Space Mono', monospace" }}>Supplier Unit Price (COGS)</label>
                                <input 
                                    type="number" 
                                    style={{
                                        width: "100%", background: "#060a10", color: "#3b82f6", 
                                        border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "6px", 
                                        padding: "12px", marginBottom: expectedPrice > 0 ? "8px" : "16px", fontFamily: "'Space Mono', monospace",
                                        outline: "none", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)"
                                    }}
                                    placeholder={`E.g. ${expectedPrice > 0 ? expectedPrice.toFixed(2) : "450.00"}`}
                                    value={arrivedPrice}
                                    onChange={e => setArrivedPrice(e.target.value)}
                                    min="0" step="0.01" required
                                />
                                
                                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '16px', fontFamily: "'Space Mono', monospace" }}>
                                    {expectedPrice > 0 
                                        ? `Historical expected price: $${expectedPrice.toFixed(2)}`
                                        : `Historical expected price: Not Set in Database`
                                    }
                                </div>
                                
                                {showsWarning && (
                                    <div style={{
                                        background: "rgba(249, 115, 22, 0.1)", border: "1px solid rgba(249, 115, 22, 0.4)",
                                        borderRadius: "6px", padding: "12px", marginBottom: "16px",
                                        color: "#fdba74", fontSize: "12px", lineHeight: "1.5"
                                    }}>
                                        <strong style={{ color: "#f97316", display: "block", marginBottom: "4px" }}>⚠️ EXTREME CAPITAL TIE-UP WARNING</strong>
                                        Based on the AI model ({arrivedModal.avg_daily_demand} sales/day), receiving {qty} units equals a <strong>{monthsSupply}-Month supply</strong>. 
                                        This violates inventory cost-minimization equations.
                                    </div>
                                )}
                                
                                {priceWarning && (
                                    <div style={{
                                        background: "rgba(225, 29, 72, 0.1)", border: "1px solid rgba(225, 29, 72, 0.4)",
                                        borderRadius: "6px", padding: "12px", marginBottom: "16px",
                                        color: "#fecdd3", fontSize: "12px", lineHeight: "1.5"
                                    }}>
                                        <strong style={{ color: "#e11d48", display: "block", marginBottom: "4px" }}>⚠️ PRICE DEVIATION WARNING</strong>
                                        The entered price (${currentPriceVal.toFixed(2)}) is <strong>{priceDeviationPercent.toFixed(1)}% {currentPriceVal > expectedPrice ? 'higher' : 'lower'}</strong> than the historical average (${expectedPrice.toFixed(2)}). Please verify this is not a typo.
                                    </div>
                                )}

                                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                                    <button type="button" onClick={() => setArrivedModal(null)} style={{
                                        flex: 1, padding: "10px", background: "transparent", color: "#8899aa", 
                                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", fontFamily: "'Space Mono', monospace"
                                    }}>Cancel</button>
                                    <button type="submit" style={{
                                        flex: 2, padding: "10px", background: showAnyWarning ? "linear-gradient(135deg, #f97316, #ea580c)" : "linear-gradient(135deg, #22c55e, #16a34a)", 
                                        color: "#000", fontWeight: "bold", border: "none", borderRadius: "6px", cursor: "pointer", 
                                        fontFamily: "'Space Mono', monospace", boxShadow: showAnyWarning ? "0 0 15px rgba(249, 115, 22, 0.3)" : "0 0 15px rgba(34, 197, 94, 0.3)",
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
