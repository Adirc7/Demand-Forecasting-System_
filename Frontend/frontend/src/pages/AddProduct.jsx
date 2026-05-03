import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProduct, getStockAdvice, getProducts, migrateSKU, getCategories, createCategory } from '../services/api';
import { validateSKU, validateNumericLimit, sanitizeString } from "../utils/validation";

export default function AddProduct() {
    const nav = useNavigate();
    const [showMigrateModal, setShowMigrateModal] = useState(false);

    // ONBOARD STATE
    const [sku, setSku] = useState('');
    const [name, setName] = useState('');
    const [cat, setCat] = useState('Electronics');
    const [catDropdownOpen, setCatDropdownOpen] = useState(false);
    const [price, setPrice] = useState(0);
    const [stock, setStock] = useState(0);
    const [lead, setLead] = useState(7);

    // CORRECT SKU STATE
    const [products, setProducts] = useState([]);
    const [oldSku, setOldSku] = useState('');
    const [newSku, setNewSku] = useState('');

    const [advice, setAdvice] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const [daysLeft, setDaysLeft] = useState(0);
    const [overrideLock, setOverrideLock] = useState(false);
    const [migrateSuccess, setMigrateSuccess] = useState('');

    // Dynamic Categories State
    const [categories, setCategories] = useState([]);
    const [showNewCatModal, setShowNewCatModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatMinPrice, setNewCatMinPrice] = useState('');
    const [newCatMLProxyPrice, setNewCatMLProxyPrice] = useState('');

    const latestProduct = useMemo(() => {
        if (!products || products.length === 0) return null;
        // Sort explicitly by registered date. If multiple on same day, just grab the first sorted element.
        return [...products].sort((a, b) => new Date(b.registered_date || 0) - new Date(a.registered_date || 0))[0];
    }, [products]);

    // Calculate Days Left in Month
    useEffect(() => {
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const diff = Math.ceil((endOfMonth - today) / (1000 * 60 * 60 * 24));
        setDaysLeft(diff);
    }, []);

    // Fetch products and categories on mount to populate correct tab and ML Portfolio Dashboard
    useEffect(() => {
        setLoading(true);
        Promise.all([
            getProducts('?limit=1000').then(res => setProducts(res.data || [])).catch(e => setErr(e.message)),
            getCategories().then(res => {
                setCategories(res || []);
                if (res && res.length > 0 && !res.some(c => c.name === cat)) {
                    setCat(res[0].name);
                }
            }).catch(e => console.error("Categories fetch error:", e))
        ]).finally(() => setLoading(false));
    }, []);

    // Auto-fetch ML proxy advice when Category, Lead Time, or Price changes
    useEffect(() => {
        let active = true;
        if (!cat || !lead) return;

        setLoading(true);
        getStockAdvice(cat, lead, price)
            .then(res => { if (active) setAdvice(res); })
            .catch(e => console.error("ML Advice error:", e))
            .finally(() => { if (active) setLoading(false); });

        return () => { active = false; };
    }, [cat, lead, price]);

    const handleSubmitOnboard = async (e) => {
        e.preventDefault();
        setErr('');

        const skuErr = validateSKU(sku);
        const nameErr = sanitizeString(name, 'Product Name');
        const priceErr = validateNumericLimit(price, 'Unit Price', 0);
        const stockErr = validateNumericLimit(stock, 'Opening Stock', 0);
        const leadErr = validateNumericLimit(lead, 'Lead Time', 1);

        let categoryPriceErr = '';
        const priceVal = parseFloat(price);
        const selectedCatInfo = categories.find(c => c.name === cat);
        
        if (selectedCatInfo && priceVal < selectedCatInfo.min_unit_price) {
            categoryPriceErr = `${cat} governance constraint: Unit Price must be >= Rs. ${selectedCatInfo.min_unit_price.toLocaleString()}.`;
        }

        if (skuErr || nameErr || priceErr || categoryPriceErr || stockErr || leadErr) {
            setErr(skuErr || nameErr || priceErr || categoryPriceErr || stockErr || leadErr);
            return;
        }

        try {
            await createProduct({
                sku,
                product_name: name,
                category: cat,
                unit_price: parseFloat(price),
                opening_stock: parseInt(stock),
                lead_time_days: parseInt(lead)
            });
            nav('/inventory');
        } catch (e) {
            setErr(e.message);
        }
    };

    const handleMigrate = async (e) => {
        e.preventDefault();
        setErr('');
        setMigrateSuccess('');
        const skuErr = validateSKU(newSku);
        if (skuErr) return setErr(skuErr);

        try {
            setLoading(true);
            await migrateSKU(oldSku, newSku);
            setErr('');
            setMigrateSuccess(`Successfully migrated ${oldSku} to ${newSku}! Redirecting to Inventory...`);
            setTimeout(() => {
                nav('/inventory');
            }, 2500);
        } catch (e) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    };
    const handleAddCategory = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await createCategory({
                name: newCatName,
                min_unit_price: parseFloat(newCatMinPrice),
                ml_proxy_price: parseFloat(newCatMLProxyPrice),
                active: true
            });
            const cats = await getCategories();
            setCategories(cats || []);
            setCat(newCatName);
            setShowNewCatModal(false);
            setNewCatName('');
            setNewCatMinPrice('');
            setNewCatMLProxyPrice('');
            setErr('');
        } catch (error) {
            setErr(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative', zIndex: 10, padding: '32px 40px' }}>
            <div className="flex justify-between items-center mb-6" style={{ animation: 'slideInLeft .6s ease', marginTop: '40px' }}>
                <div>
                    <h1 className="page-title" style={{ fontFamily: "'Outfit', monospace", fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '4px', textShadow: '0 0 30px rgba(249,115,22,.3)' }}>PRODUCT <span>CONTROL</span></h1>
                    <div className="title-bar" style={{ marginTop: '6px', height: '2px', width: '200px', background: 'linear-gradient(90deg, #f97316, transparent)', boxShadow: '0 0 10px rgba(249,115,22,.4)' }} />
                </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                <button onClick={() => { setShowMigrateModal(true); setErr(''); }}
                    style={{ padding: '10px 20px', background: 'rgba(59,130,246,0.05)', border: `1px solid rgba(59,130,246,0.3)`, color: '#3b82f6', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Outfit', monospace", fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    CORRECT WRONG SKU
                </button>
            </div>

            {err && <div style={{ background: 'rgba(239,68,68,.05)', backdropFilter: 'blur(10px)', color: '#ef4444', padding: '16px 24px', borderRadius: '12px', fontSize: '13px', border: '1px solid rgba(239,68,68,.3)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500 }}><span style={{ fontSize: '18px' }}>⚠️</span> {err}</div>}
            
            {daysLeft > 7 && (
                <div style={{ 
                    background: overrideLock ? 'linear-gradient(145deg, rgba(16,185,129,0.08), rgba(0,0,0,0.4))' : 'linear-gradient(145deg, rgba(234,179,8,0.08), rgba(0,0,0,0.4))', 
                    color: overrideLock ? '#10b981' : '#eab308', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    fontSize: '13px', 
                    border: `1px solid ${overrideLock ? 'rgba(16,185,129,0.2)' : 'rgba(234,179,8,0.2)'}`, 
                    borderLeft: `4px solid ${overrideLock ? '#10b981' : '#eab308'}`, 
                    marginBottom: '32px', 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '20px', 
                    transition: 'all 0.3s', 
                    boxShadow: overrideLock ? '0 10px 30px rgba(16,185,129,0.05)' : '0 10px 30px rgba(234,179,8,0.05)',
                    backdropFilter: 'blur(12px)'
                }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: overrideLock ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {overrideLock ? '🔓' : '🔒'}
                    </div>
                    <div>
                        <strong style={{ display: 'block', letterSpacing: '1.5px', marginBottom: '8px', fontFamily: "'Outfit', monospace", fontSize: '14px', textTransform: 'uppercase', textShadow: overrideLock ? '0 0 10px rgba(16,185,129,0.3)' : '0 0 10px rgba(234,179,8,0.3)' }}>
                            {overrideLock ? 'Governance Override Active' : 'System Governance Lock Active'}
                        </strong>
                        <div style={{ color: 'rgba(226,232,240,0.8)', lineHeight: '1.6', fontFamily: "'Inter', sans-serif" }}>
                            {overrideLock
                                ? 'You have manually overridden the governance lock. Remember that mid-month additions will only utilize AI Proxy metrics for their first 30 days.'
                                : <>You cannot onboard new products right now. To ensure pristine ML training data intervals, Product Managers are strictly limited to adding new SKUs only during the <strong style={{ color: '#eab308' }}>final 7 days of the month</strong>.<br /><span style={{ color: 'rgba(234,179,8,.7)', fontSize: '12px', marginTop: '4px', display: 'inline-block' }}>(Currently {daysLeft} days remaining)</span></>}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <form onSubmit={handleSubmitOnboard} style={{ 
                    background: 'linear-gradient(145deg, rgba(20,20,30,0.7), rgba(10,10,15,0.9))', 
                    border: '1px solid rgba(249,115,22,.2)', 
                    borderRadius: '24px', 
                    padding: '32px', 
                    animation: 'fadeInUp .5s ease both', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(12px)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Decorative Top Accent */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #f97316, transparent)' }} />
                    <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '120px', height: '120px', background: '#f97316', opacity: 0.05, filter: 'blur(40px)', borderRadius: '50%' }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#cbd5e1', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                            <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
                            SKU
                        </label>
                        <input required value={sku} onChange={e => setSku(e.target.value)} placeholder="Enter unique SKU..."
                            style={{ width: '100%', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all .3s ease', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}
                            onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 15px rgba(249,115,22,0.2)'; e.target.style.background = 'rgba(0,0,0,0.6)'; }} 
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(0,0,0,0.4)'; }} />
                    </div>
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#cbd5e1', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                            <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                            Product Name
                        </label>
                        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Enter product name..."
                            style={{ width: '100%', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all .3s ease', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}
                            onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 15px rgba(249,115,22,0.2)'; e.target.style.background = 'rgba(0,0,0,0.6)'; }} 
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(0,0,0,0.4)'; }} />
                    </div>
                    
                    <div style={{ position: 'relative', zIndex: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#cbd5e1', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                            <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            Category
                        </label>
                        
                        <div 
                            style={{ 
                                width: '100%', background: catDropdownOpen ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,.4)', border: '1px solid', borderColor: catDropdownOpen ? '#f97316' : 'rgba(255,255,255,0.1)', padding: '14px 16px', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all .3s ease', fontFamily: "'Inter', sans-serif", fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: catDropdownOpen ? '0 0 15px rgba(249,115,22,0.2)' : 'none'
                            }}
                            onClick={() => setCatDropdownOpen(!catDropdownOpen)}
                        >
                            <span>{cat || 'Select Category...'}</span>
                            <svg className={`w-4 h-4 transition-transform duration-300 ${catDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke={catDropdownOpen ? '#f97316' : '#94a3b8'} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>

                        {catDropdownOpen && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setCatDropdownOpen(false)} />
                                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '100%', background: 'linear-gradient(145deg, rgba(15, 15, 25, 0.95), rgba(10, 10, 15, 0.98))', backdropFilter: 'blur(16px)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', overflow: 'hidden', zIndex: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', animation: 'fadeInUp 0.2s ease', display: 'flex', flexDirection: 'column', maxHeight: '300px', overflowY: 'auto' }}>
                                    {categories.map(c => (
                                        <div 
                                            key={c.id} 
                                            style={{ padding: '12px 16px', color: cat === c.name ? '#fff' : '#e2e8f0', background: cat === c.name ? 'rgba(249,115,22,0.1)' : 'transparent', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: '12px' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = cat === c.name ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = cat === c.name ? 'rgba(249,115,22,0.1)' : 'transparent'; e.currentTarget.style.color = cat === c.name ? '#fff' : '#e2e8f0'; }}
                                            onClick={() => {
                                                setCat(c.name);
                                                setCatDropdownOpen(false);
                                            }}
                                        >
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat === c.name ? '#f97316' : 'transparent', boxShadow: cat === c.name ? '0 0 8px #f97316' : 'none', transition: 'all 0.2s' }} />
                                            {c.name}
                                        </div>
                                    ))}
                                    <div 
                                        style={{ padding: '14px 16px', background: 'rgba(249,115,22,0.05)', color: '#f97316', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Inter', sans-serif", fontWeight: 'bold', borderTop: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.15)'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.05)'; e.currentTarget.style.color = '#f97316'; }}
                                        onClick={() => {
                                            setShowNewCatModal(true);
                                            setCat(categories.length > 0 ? categories[0].name : '');
                                            setCatDropdownOpen(false);
                                        }}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                        Create New Category...
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6" style={{ position: 'relative', zIndex: 1 }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#cbd5e1', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                                <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Unit Price
                            </label>
                            <input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                                style={{ width: '100%', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all .3s ease', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}
                                onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 15px rgba(249,115,22,0.2)'; e.target.style.background = 'rgba(0,0,0,0.6)'; }} 
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(0,0,0,0.4)'; }} />
                        </div>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#cbd5e1', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                                <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                                Opening Stock
                            </label>
                            <input required type="number" min="0" value={stock} onChange={e => setStock(e.target.value)}
                                style={{ width: '100%', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all .3s ease', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}
                                onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 15px rgba(249,115,22,0.2)'; e.target.style.background = 'rgba(0,0,0,0.6)'; }} 
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(0,0,0,0.4)'; }} />
                        </div>
                    </div>
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#cbd5e1', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                            <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Lead Time (Days)
                        </label>
                        <input required type="number" min="1" value={lead} onChange={e => setLead(e.target.value)}
                            style={{ width: '100%', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all .3s ease', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}
                            onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 15px rgba(249,115,22,0.2)'; e.target.style.background = 'rgba(0,0,0,0.6)'; }} 
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(0,0,0,0.4)'; }} />
                    </div>

                    <div className="pt-2" style={{ display: 'flex', gap: '16px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                        <button type="submit" disabled={daysLeft > 7 && !overrideLock} style={{ flex: 1, background: (daysLeft > 7 && !overrideLock) ? 'rgba(0,0,0,.4)' : 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))', border: `1px solid ${(daysLeft > 7 && !overrideLock) ? 'rgba(249,115,22,.1)' : 'rgba(249,115,22,.4)'}`, padding: '16px', color: (daysLeft > 7 && !overrideLock) ? 'rgba(249,115,22,.3)' : '#f97316', fontSize: '12px', letterSpacing: '2px', fontFamily: "'Outfit', monospace", fontWeight: 800, cursor: (daysLeft > 7 && !overrideLock) ? 'not-allowed' : 'pointer', borderRadius: '12px', transition: 'all .3s ease' }}
                            onMouseEnter={(e) => { if (!(daysLeft > 7 && !overrideLock)) { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(249,115,22,0.1))'; e.currentTarget.style.boxShadow = '0 0 20px rgba(249,115,22,.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                            onMouseLeave={(e) => { if (!(daysLeft > 7 && !overrideLock)) { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
                            {(daysLeft > 7 && !overrideLock) ? 'LOCKED: AWAITING END OF MONTH' : '🚀 CREATE PRODUCT'}
                        </button>
                        {daysLeft > 7 && (
                            <button type="button" onClick={() => setOverrideLock(!overrideLock)} style={{ background: overrideLock ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${overrideLock ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: overrideLock ? '#10b981' : '#ef4444', padding: '16px 20px', fontSize: '13px', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Outfit', monospace", fontWeight: 700, transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = overrideLock ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = overrideLock ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                {overrideLock ? '🔓 UNLOCKED' : '🔒 UNLOCK'}
                            </button>
                        )}
                    </div>
                </form>

                {/* Live ML Advice Panel */}
                <div style={{ background: 'linear-gradient(135deg, rgba(8,12,28,.97), rgba(8,8,22,.97))', border: '1px solid rgba(59,130,246,.3)', borderRadius: '20px', padding: '24px', height: 'fit-content', position: 'sticky', top: '24px', animation: 'fadeInUp .5s ease .1s both' }}>
                    <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '12px', color: '#10b981', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', textShadow: '0 0 10px rgba(16,185,129,.5)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        LIVE ML ADVICE (RETRAINED MODEL)
                    </h2>
                    <p style={{ fontSize: '10px', color: 'rgba(226,232,240,.4)', letterSpacing: '1px', marginBottom: '24px' }}>// CATEGORY BASELINE INFERENCE BASED ON CURRENT MARKET DATA</p>

                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            <div style={{ height: '16px', background: 'rgba(59,130,246,.2)', borderRadius: '2px', width: '75%' }}></div>
                            <div style={{ height: '16px', background: 'rgba(59,130,246,.2)', borderRadius: '2px', width: '50%' }}></div>
                        </div>
                    ) : advice ? (
                        <div className="space-y-4">
                            <div style={{ background: 'linear-gradient(145deg, rgba(59,130,246,0.1), rgba(0,0,0,0.4))', padding: '24px', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: '#3b82f6', opacity: 0.1, filter: 'blur(40px)', borderRadius: '50%' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>Recommended Stock</div>
                                        <div style={{ fontFamily: "'Outfit', monospace", fontSize: '36px', fontWeight: 900, color: '#fff', textShadow: '0 0 20px rgba(59,130,246,0.5)', lineHeight: 1 }}>{advice.recommended || 0} <span style={{ fontSize: '16px', color: '#3b82f6', fontWeight: 600 }}>UNITS</span></div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div style={{ background: 'linear-gradient(145deg, rgba(16,185,129,0.05), rgba(0,0,0,0.2))', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '40px', opacity: 0.05 }}>💰</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 600, textTransform: 'uppercase' }}>Baseline Price</div>
                                    <div style={{ fontFamily: "'Outfit', monospace", fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '8px' }}>Rs. {Math.round(advice.recommended_price || 0).toLocaleString()}</div>
                                </div>
                                <div style={{ background: 'linear-gradient(145deg, rgba(16,185,129,0.05), rgba(0,0,0,0.2))', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '40px', opacity: 0.05 }}>⏱️</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 600, textTransform: 'uppercase' }}>Supply Lead Time</div>
                                    <div style={{ fontFamily: "'Outfit', monospace", fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '8px' }}>{advice.recommended_lead_time || 0} DAYS</div>
                                </div>
                                <div style={{ background: 'linear-gradient(145deg, rgba(59,130,246,0.05), rgba(0,0,0,0.2))', padding: '16px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '40px', opacity: 0.05 }}>🎯</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 600, textTransform: 'uppercase' }}>Reorder Point</div>
                                    <div style={{ fontFamily: "'Outfit', monospace", fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '8px' }}>{advice.reorder_point || 0}</div>
                                </div>
                                <div style={{ background: 'linear-gradient(145deg, rgba(234,179,8,0.05), rgba(0,0,0,0.2))', padding: '16px', borderRadius: '12px', border: '1px solid rgba(234,179,8,0.2)', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '40px', opacity: 0.05 }}>✨</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 600, textTransform: 'uppercase' }}>Confidence</div>
                                    <div style={{ fontFamily: "'Outfit', monospace", fontSize: '14px', fontWeight: 700, color: '#eab308', marginTop: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>{advice.confidence}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '10px', color: 'rgba(226,232,240,.3)', letterSpacing: '1px', padding: '16px', border: '1px dashed rgba(59,130,246,.2)', textAlign: 'center', borderRadius: '2px' }}>
                            ENTER CATEGORY & LEAD TIME TO COMMENCE PREDICTION
                        </div>
                    )}
                </div>
            </div>

            {/* Category Investment Dashboard (ML Portfolio Matrix) */}
            <div style={{ marginTop: '32px', padding: '24px', background: 'linear-gradient(135deg, rgba(8,12,28,.97), rgba(8,8,22,.97))', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '20px', animation: 'fadeInUp 0.6s ease' }}>
                <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '14px', color: '#8b5cf6', letterSpacing: '2px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textShadow: '0 0 10px rgba(139, 92, 246, 0.4)' }}>
                    📊 CATEGORY INVESTMENT PORTFOLIO (AI MATRIX)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {categories.map(c => c.name).map(category => {
                        const catProducts = products.filter(p => p.category === category);
                        const totalSKUs = catProducts.length;

                        let health = 0;
                        let topSKU = 'None';
                        let action = 'SEED';
                        let theme = { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };

                        if (totalSKUs > 0) {
                            let healthyCount = 0;
                            let highestSales = -1;

                            catProducts.forEach(p => {
                                if (p.current_stock > 15) healthyCount++;
                                const sales = p.sales_day_count || 0;
                                if (sales > highestSales) {
                                    highestSales = sales;
                                    topSKU = p.sku;
                                }
                            });

                            health = Math.round((healthyCount / totalSKUs) * 100);
                            if (health < 40) {
                                action = 'EMERGENCY BUY';
                                theme = { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
                            } else if (health < 75) {
                                action = 'MAINTAIN';
                                theme = { color: '#eab308', bg: 'rgba(234,179,8,0.1)' };
                            } else {
                                action = 'EXPAND ALLOC.';
                                theme = { color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
                            }
                        }

                        return (
                            <div key={category} 
                                style={{ 
                                    padding: '24px', 
                                    background: 'linear-gradient(145deg, rgba(20,20,30,0.6), rgba(10,10,15,0.8))', 
                                    border: `1px solid ${theme.bg}`, 
                                    borderRadius: '16px',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                                    backdropFilter: 'blur(10px)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${theme.bg}`; e.currentTarget.style.borderColor = theme.color; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'; e.currentTarget.style.borderColor = theme.bg; }}
                            >
                                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: theme.color, opacity: 0.08, filter: 'blur(40px)', borderRadius: '50%', transition: 'all 0.5s ease' }} className="card-glow" />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.color, boxShadow: `0 0 15px ${theme.bg}` }}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                    </div>
                                    <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0, fontFamily: "'Outfit', sans-serif" }}>{category}</h3>
                                </div>

                                <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, letterSpacing: '0.5px' }}>Portfolio Health</span>
                                        <strong style={{ fontSize: '22px', color: theme.color, fontFamily: "'Outfit', monospace", lineHeight: 1, textShadow: `0 0 15px ${theme.bg}` }}>{health}%</strong>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${health}%`, background: `linear-gradient(90deg, ${theme.color}88, ${theme.color})`, borderRadius: '4px', transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 10px ${theme.color}` }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', opacity: 0.8 }}>🏆</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Top Performer</span>
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#f8fafc', fontFamily: "'Outfit', monospace", fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>{topSKU}</span>
                                    </div>

                                    <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', opacity: 0.8 }}>🤖</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>AI Directive</span>
                                        </div>
                                        <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', color: theme.color, background: theme.bg, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.color}44`, boxShadow: `0 0 10px ${theme.bg}` }}>{action}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Migrate SKU Modal */}
            {showMigrateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, rgba(20,20,30,0.85), rgba(10,10,15,0.95))',
                        border: '1px solid rgba(59,130,246,.3)', borderRadius: '24px', padding: '40px',
                        width: '90%', maxWidth: '900px', position: 'relative',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,.15)', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        overflow: 'hidden'
                    }}>
                        {/* Decorative Top Accent */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #3b82f6, transparent)' }} />
                        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '150px', height: '150px', background: '#3b82f6', opacity: 0.05, filter: 'blur(50px)', borderRadius: '50%' }} />

                        <button onClick={() => setShowMigrateModal(false)}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '18px', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', zIndex: 10 }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.transform = 'rotate(90deg)'; }} 
                            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'rotate(0deg)'; }}>
                            ✕
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </div>
                            <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '2px', textShadow: '0 0 20px rgba(59,130,246,0.4)', margin: 0 }}>CORRECT <span style={{ color: '#3b82f6' }}>WRONG SKU</span></h2>
                        </div>

                        {err && <div style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444', padding: '16px 20px', borderRadius: '12px', fontSize: '13px', border: '1px solid rgba(239,68,68,.3)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeIn 0.3s ease' }}><span style={{ fontSize: '18px' }}>⚠️</span> {err}</div>}
                        {migrateSuccess && <div style={{ background: 'rgba(16,185,129,.1)', color: '#10b981', padding: '16px 20px', borderRadius: '12px', fontSize: '13px', border: '1px solid rgba(16,185,129,.3)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeIn 0.3s ease' }}><span style={{ fontSize: '18px' }}>✅</span> {migrateSuccess}</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <form onSubmit={handleMigrate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#cbd5e1', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                        Select Target Product
                                    </label>
                                    <input required list="sku-datalist" value={oldSku} onChange={e => setOldSku(e.target.value)} disabled={loading}
                                        placeholder={loading ? "Loading products..." : "Type to Search SKU..."}
                                        style={{ width: '100%', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all .3s ease', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 15px rgba(59,130,246,0.2)'; e.target.style.background = 'rgba(0,0,0,0.6)'; }} 
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(0,0,0,0.4)'; }}
                                    />
                                    <datalist id="sku-datalist">
                                        {products.map(p => (
                                            <option key={p.sku} value={p.sku}>{p.sku} ({p.product_name || "Unknown"})</option>
                                        ))}
                                    </datalist>
                                    {latestProduct && (
                                        <div
                                            onClick={() => setOldSku(latestProduct.sku)}
                                            style={{ marginTop: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#38bdf8', fontFamily: "'Inter', sans-serif", width: 'fit-content', padding: '6px 12px', borderRadius: '8px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', transition: 'all 0.2s ease' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            title="Click to auto-fill"
                                        >
                                            <span style={{ fontSize: '14px' }}>💡</span>
                                            <span>Quick-fill latest added: <strong style={{ color: '#fff' }}>{latestProduct.sku}</strong></span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#cbd5e1', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                        Enter Correct SKU String
                                    </label>
                                    <input required value={newSku} onChange={e => setNewSku(e.target.value)} disabled={loading} placeholder="e.g. AP-SHIRT-001"
                                        style={{ width: '100%', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all .3s ease', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 15px rgba(59,130,246,0.2)'; e.target.style.background = 'rgba(0,0,0,0.6)'; }} 
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(0,0,0,0.4)'; }} />
                                </div>

                                <div className="pt-2">
                                    <button type="submit" disabled={!oldSku || !newSku || loading}
                                        style={{ width: '100%', background: (!oldSku || !newSku || loading) ? 'rgba(0,0,0,0.4)' : 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))', border: `1px solid ${(!oldSku || !newSku || loading) ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.4)'}`, padding: '16px', color: (!oldSku || !newSku || loading) ? 'rgba(59,130,246,0.4)' : '#3b82f6', fontSize: '12px', letterSpacing: '2px', fontFamily: "'Outfit', monospace", fontWeight: 800, cursor: (!oldSku || !newSku || loading) ? 'not-allowed' : 'pointer', borderRadius: '12px', transition: 'all .3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                        onMouseEnter={(e) => { if (oldSku && newSku && !loading) { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.1))'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                        onMouseLeave={(e) => { if (oldSku && newSku && !loading) { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
                                        {loading ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
                                        {loading ? 'MIGRATING...' : 'EXECUTE PRIMARY KEY MIGRATION'}
                                    </button>
                                </div>
                            </form>

                            <div style={{ background: 'linear-gradient(145deg, rgba(239,68,68,0.05), rgba(0,0,0,0.3))', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '28px', height: 'fit-content', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '100px', opacity: 0.03, pointerEvents: 'none' }}>⚠️</div>
                                
                                <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '14px', fontWeight: 700, color: '#ef4444', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    Primary Key Migration Protocol
                                </h2>

                                <p style={{ fontSize: '13px', color: 'rgba(226,232,240,0.8)', lineHeight: '1.6', marginBottom: '20px', fontFamily: "'Inter', sans-serif" }}>
                                    You are requesting to mathematically change the <strong>Document ID</strong> of a product. Be aware of the following constraints:
                                </p>

                                <ul style={{ paddingLeft: '0', fontSize: '13px', color: 'rgba(226,232,240,0.6)', display: 'flex', flexDirection: 'column', gap: '12px', listStyleType: 'none', margin: 0 }}>
                                    <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#ef4444' }}>•</span> The backend will completely clone the core inventory document over to the new requested string identifier.</li>
                                    <li style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#ef4444' }}>•</span> The original mis-typed document will be physically purged from the database.</li>
                                    <li style={{ display: 'flex', gap: '10px', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <span style={{ color: '#ef4444' }}>•</span> 
                                        <span><strong style={{ color: '#ef4444', fontWeight: 600 }}>Sales Constraint Active:</strong> If the mis-typed SKU has already accumulated confirmed sales within the ledger, this migration request will be explicitly <strong style={{ color: '#f97316' }}>REJECTED</strong> by the backend to prevent historical accounting decoupling.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* New Category Modal */}
            {showNewCatModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(8,8,12,.97), rgba(12,8,16,.97))',
                        border: '1px solid rgba(249,115,22,.5)', borderRadius: '8px', padding: '32px',
                        width: '90%', maxWidth: '500px', position: 'relative',
                        boxShadow: '0 0 40px rgba(249,115,22,.15)', animation: 'slideUp 0.4s ease forwards'
                    }}>
                        <button type="button" onClick={() => setShowNewCatModal(false)}
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', transition: 'color 0.3s' }}>
                            ✕
                        </button>
                        
                        <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '20px', fontWeight: 'bold', color: '#f97316', letterSpacing: '2px', marginBottom: '24px', margin: 0 }}>➕ NEW CATEGORY</h2>
                        
                        <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: 'rgba(226,232,240,.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Category Name</label>
                                <input required value={newCatName} onChange={e => setNewCatName(e.target.value)} disabled={loading} placeholder="e.g. Footwear"
                                    style={{ width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(249,115,22,.3)', padding: '10px', color: '#fff', borderRadius: '2px', outline: 'none', transition: 'border-color .2s', fontFamily: "'Inter', sans-serif" }}
                                    onFocus={(e) => e.target.style.borderColor = '#f97316'} onBlur={(e) => e.target.style.borderColor = 'rgba(249,115,22,.3)'} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: 'rgba(226,232,240,.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Min Allowable Price (Rs.)</label>
                                <input required type="number" min="0" value={newCatMinPrice} onChange={e => setNewCatMinPrice(e.target.value)} disabled={loading} placeholder="e.g. 500"
                                    style={{ width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(249,115,22,.3)', padding: '10px', color: '#fff', borderRadius: '2px', outline: 'none', transition: 'border-color .2s', fontFamily: "'Inter', sans-serif" }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: 'rgba(226,232,240,.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>ML Benchmark Proxy Price (Rs.)</label>
                                <input required type="number" min="1" value={newCatMLProxyPrice} onChange={e => setNewCatMLProxyPrice(e.target.value)} disabled={loading} placeholder="e.g. 2500"
                                    style={{ width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(249,115,22,.3)', padding: '10px', color: '#fff', borderRadius: '2px', outline: 'none', transition: 'border-color .2s', fontFamily: "'Inter', sans-serif" }} />
                                <p style={{ fontSize: '10px', color: 'rgba(226,232,240,.4)', marginTop: '8px', lineHeight: '1.4' }}>The AI elasticity engine runs against this proxy baseline to protect capital on extremely expensive variants.</p>
                            </div>
                            <div className="pt-4">
                                <button type="submit" disabled={!newCatName || loading} 
                                    style={{ width: '100%', background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.4)', padding: '12px', color: '#f97316', fontSize: '11px', letterSpacing: '2px', fontFamily: "'Outfit', monospace", fontWeight: 700, cursor: (!newCatName || loading) ? 'not-allowed' : 'pointer', borderRadius: '2px', transition: 'all .3s' }}>
                                    {loading ? 'SAVING...' : 'SAVE CATEGORY'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
