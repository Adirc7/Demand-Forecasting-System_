import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getForecasts, triggerRetrain, getAiState, getCategories, updateSafetyFactor } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, Title, Tooltip as ChartTooltip, Legend as ChartLegend
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, ChartTooltip, ChartLegend);

const CAT_COLORS = {
    'Beverages': '#378ADD', 'Dairy': '#1D9E75', 'Snacks': '#D85A30',
    'Bakery': '#BA7517', 'Produce': '#639922', 'Meat': '#D4537E',
    'Frozen': '#7F77DD', 'Personal Care': '#888780'
};

export default function Forecasts() {
    const [data, setData] = useState([]);
    const [aiState, setAiState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [retraining, setRetraining] = useState(false);
    const [daysLeft, setDaysLeft] = useState(0);

    // AI Explainability & Risk States
    const [expandedRows, setExpandedRows] = useState([]);
    const [showOnlyVolatile, setShowOnlyVolatile] = useState(false);

    // Retrain Modal States
    const [showRetrainModal, setShowRetrainModal] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [epochs, setEpochs] = useState(1);
    const [systemMessage, setSystemMessage] = useState(null);

    // Pareto chart state
    const [paretoWindowStart, setParetoWindowStart] = useState(0);
    const [paretoWindowSize, setParetoWindowSize] = useState(25);
    const [paretoColorMode, setParetoColorMode] = useState('none');
    const [paretoThreshold, setParetoThreshold] = useState(80);

    // Safety Factor Settings Panel
    const [showRiskPanel, setShowRiskPanel] = useState(false);
    const [catSafetyMap, setCatSafetyMap] = useState({});
    const [selectedRiskCat, setSelectedRiskCat] = useState('');
    const [selectedZ, setSelectedZ] = useState(1.645);
    const [savingRisk, setSavingRisk] = useState(false);
    const [riskSaved, setRiskSaved] = useState(false);

    useEffect(() => {
        load();
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const diff = Math.ceil((endOfMonth - today) / (1000 * 60 * 60 * 24));
        setDaysLeft(diff);
    }, []);

    const isDataReady = daysLeft <= 5;

    const load = async () => {
        setLoading(true);
        try {
            const [forecastsRes, stateRes, catsRes] = await Promise.all([getForecasts(), getAiState(), getCategories()]);
            setData(forecastsRes);
            setAiState(stateRes);
            // Build safety factor map: category name -> Z value
            const map = {};
            if (Array.isArray(catsRes)) {
                catsRes.forEach(cat => {
                    const key = cat._doc_id; // document ID = category name (set by admin)
                    if (key && cat.safety_factor !== undefined) map[key] = parseFloat(cat.safety_factor);
                    if (cat.name && cat.safety_factor !== undefined) map[cat.name] = parseFloat(cat.safety_factor);
                });
            }
            setCatSafetyMap(map);
        } finally { setLoading(false); }
    };

    const availableCategories = useMemo(() => {
        return [...new Set(data.map(d => d.category))].filter(Boolean).sort();
    }, [data]);

    const handleOpenRetrain = () => setShowRetrainModal(true);

    const handleExecuteRetrain = async () => {
        setRetraining(true);
        setShowRetrainModal(false);
        try {
            await triggerRetrain({
                categories: selectedCategories.length > 0 ? selectedCategories : null,
                epochs: epochs
            });
            setSystemMessage({ type: 'success', text: "Customized Retrain pipeline started in background. The AI is computing SHAP and Volatility. Refresh in a minute." });
        } catch (e) { setSystemMessage({ type: 'error', text: "Error: " + e.message }); }
        finally { setRetraining(false); }
    };

    // Aggregate by Category for main bar chart
    const chartData = Object.values(data.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = { category: curr.category, total_forecast_7: 0, total_forecast_30: 0 };
        acc[curr.category].total_forecast_7 += curr.forecast_7d || 0;
        acc[curr.category].total_forecast_30 += curr.forecast_30d || 0;
        return acc;
    }, {}));

    // ─── Pareto Data (fully sorted, cumulative %) ───────────────────────────
    const paretoDataFull = useMemo(() => {
        const sorted = [...data]
            .map(d => ({ sku: d.sku, demand: d.forecast_30d || 0, category: d.category }))
            .sort((a, b) => b.demand - a.demand);

        const grandTotal = sorted.reduce((s, d) => s + d.demand, 0);
        let cum = 0;
        return sorted.map((item, i) => {
            cum += item.demand;
            return {
                rank: i + 1,
                sku: item.sku,
                category: item.category,
                demand: Math.round(item.demand * 10) / 10,
                cumPct: grandTotal > 0 ? Math.round((cum / grandTotal) * 1000) / 10 : 0
            };
        });
    }, [data]);

    const grandTotal = useMemo(() => paretoDataFull.reduce((s, d) => s + d.demand, 0), [paretoDataFull]);
    const paretoIdx = useMemo(() => paretoDataFull.findIndex(d => d.cumPct >= 80), [paretoDataFull]);

    // Insight text for Pareto
    const paretoInsight = useMemo(() => {
        if (!paretoDataFull.length || paretoIdx < 0) return null;
        const skusFor80 = paretoIdx + 1;
        const pctOfCatalog = Math.round((skusFor80 / paretoDataFull.length) * 100);
        const topCatMap = paretoDataFull.slice(0, skusFor80).reduce((acc, d) => {
            acc[d.category] = (acc[d.category] || 0) + d.demand;
            return acc;
        }, {});
        const topCat = Object.entries(topCatMap).sort((a, b) => b[1] - a[1])[0];
        return {
            skusFor80,
            pctOfCatalog,
            topCat: topCat ? topCat[0] : '—',
            topCatPct: topCat ? Math.round((topCat[1] / grandTotal) * 100) : 0,
            tail: paretoDataFull.length - skusFor80
        };
    }, [paretoDataFull, paretoIdx, grandTotal]);

    // Pareto window slice
    const paretoSlice = useMemo(() => {
        return paretoDataFull.slice(paretoWindowStart, paretoWindowStart + paretoWindowSize);
    }, [paretoDataFull, paretoWindowStart, paretoWindowSize]);

    const visibleDemand = useMemo(() => paretoSlice.reduce((s, d) => s + d.demand, 0), [paretoSlice]);

    const getParetoBarColor = useCallback((d) => {
        if (paretoColorMode === 'category') {
            const fallbackHex = '#888888';
            if (!d.category) return fallbackHex + 'cc';
            const baseColor = CAT_COLORS[d.category];
            if (baseColor) return baseColor + 'cc';

            // Generate deterministic color for unknown categories
            let hash = 0;
            for (let i = 0; i < d.category.length; i++) {
                hash = d.category.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            return `hsla(${hue}, 65%, 55%, 0.8)`;
        }
        if (paretoColorMode === 'cumulative') {
            if (d.cumPct <= 50) return '#639922cc';
            if (d.cumPct <= 80) return '#378ADDcc';
            if (d.cumPct <= 95) return '#BA7517cc';
            return '#A32D2Dcc';
        }
        return '#378ADD99';
    }, [paretoColorMode]);

    // Build Chart.js dataset for the Pareto chart
    const paretoChartData = useMemo(() => ({
        labels: paretoSlice.map(d => d.sku),
        datasets: [
            {
                type: 'bar',
                label: '30-Day Demand',
                data: paretoSlice.map(d => d.demand),
                backgroundColor: paretoSlice.map(d => getParetoBarColor(d)),
                borderRadius: 3,
                borderSkipped: 'bottom',
                yAxisID: 'y',
                order: 2,
            },
            {
                type: 'line',
                label: 'Cumulative %',
                data: paretoSlice.map(d => d.cumPct),
                borderColor: '#E24B4A',
                borderWidth: 2.5,
                pointRadius: paretoWindowSize > 30 ? 0 : 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#E24B4A',
                fill: false,
                tension: 0.3,
                yAxisID: 'y2',
                order: 1,
            },
            {
                type: 'line',
                label: `${paretoThreshold}% threshold`,
                data: paretoSlice.map(() => paretoThreshold),
                borderColor: '#639922',
                borderWidth: 1.5,
                borderDash: [5, 4],
                pointRadius: 0,
                fill: false,
                yAxisID: 'y2',
                order: 0,
            }
        ]
    }), [paretoSlice, getParetoBarColor, paretoThreshold, paretoWindowSize]);

    const paretoChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(12,12,22,.97)',
                borderColor: 'rgba(249,115,22,.4)',
                borderWidth: 1,
                titleColor: '#fff',
                bodyColor: 'rgba(226,232,240,.7)',
                titleFont: { size: 12, weight: '500', family: "'Outfit', monospace" },
                bodyFont: { size: 11 },
                padding: 12,
                callbacks: {
                    title: (items) => {
                        const d = paretoSlice[items[0].dataIndex];
                        return d ? `${d.sku}  ·  rank #${d.rank}  ·  ${d.category}` : '';
                    },
                    label: (item) => {
                        if (item.datasetIndex === 0) return `  Demand: ${Number(item.raw).toLocaleString()} units`;
                        if (item.datasetIndex === 1) return `  Cumulative: ${item.raw}%`;
                        return null;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: 'rgba(226,232,240,.4)',
                    font: { size: 12, family: "'Outfit', monospace" },
                    maxRotation: 45,
                    autoSkip: paretoWindowSize > 40,
                    maxTicksLimit: 30
                },
                grid: { display: false },
                border: { display: false }
            },
            y: {
                ticks: {
                    color: 'rgba(226,232,240,.4)',
                    font: { size: 13 },
                    callback: v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v
                },
                grid: { color: 'rgba(255,255,255,.05)' },
                border: { display: false },
                title: {
                    display: true, text: 'UNITS',
                    color: 'rgba(255, 255, 255, 0.93)', font: { size: 12, weight: 'bold' }
                }
            },
            y2: {
                position: 'right',
                min: 0,
                max: 100,
                ticks: {
                    color: '#E24B4A',
                    font: { size: 13 },
                    callback: v => v + '%'
                },
                grid: { display: false },
                border: { display: false },
                title: {
                    display: true, text: 'CUMULATIVE %',
                    color: '#f70000ff', font: { size: 12, weight: 'bold' }
                }
            }
        }
    }), [paretoSlice, paretoWindowSize]);

    function jumpToParetoThreshold(pct) {
        setParetoThreshold(pct);
        let idx = paretoDataFull.findIndex(d => d.cumPct >= pct);
        if (idx < 0) idx = paretoDataFull.length - 1;
        const newStart = Math.max(0, idx - Math.floor(paretoWindowSize / 2));
        setParetoWindowStart(newStart);
    }

    // ─── Table filtering & sorting ──────────────────────────────────────────
    const processedData = useMemo(() => {
        let filtered = data.filter((item) =>
            item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (showOnlyVolatile) {
            filtered = filtered.filter(item => item.volatility_cv && item.volatility_cv > 0.1);
        }
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [data, searchTerm, sortConfig, showOnlyVolatile]);

    const toggleRow = (sku) => {
        setExpandedRows(prev => prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]);
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return ' ↕';
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    // Auto-select first category when data loads
    useEffect(() => {
        if (availableCategories.length > 0 && !selectedRiskCat) {
            setSelectedRiskCat(availableCategories[0]);
        }
    }, [availableCategories]);

    // Sync Z-score display when user switches category
    useEffect(() => {
        if (selectedRiskCat) {
            setSelectedZ(catSafetyMap[selectedRiskCat] ?? 1.645);
            setRiskSaved(false);
        }
    }, [selectedRiskCat, catSafetyMap]);

    const handleSaveRisk = async () => {
        if (!selectedRiskCat) return;
        setSavingRisk(true);
        try {
            await updateSafetyFactor(selectedRiskCat, selectedZ);
            setCatSafetyMap(prev => ({ ...prev, [selectedRiskCat]: selectedZ }));
            setRiskSaved(true);
            setTimeout(() => setRiskSaved(false), 3000);
        } catch (e) {
            setSystemMessage({ type: 'error', text: 'Failed to update safety factor: ' + e.message });
        } finally {
            setSavingRisk(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading forecast data...</div>;

    const monthName = new Date().toLocaleString('default', { month: 'long' }).toUpperCase();
    const monthShort = new Date().toLocaleString('default', { month: 'short' });
    const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('default', { month: 'long' }).toUpperCase();

    return (
        <div style={{ position: 'relative', zIndex: 10, padding: '32px 40px' }}>

            {/* ── End-of-month alert ── */}
            {daysLeft <= 3 && (!aiState || !aiState.categories_boosted || aiState.categories_boosted.length > 0 || (new Date(aiState.last_trained_date).getMonth() !== new Date().getMonth())) && (
                <div style={{ background: 'rgba(234,179,8,.1)', border: '1px solid #eab308', padding: '16px 24px', borderRadius: '4px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', animation: 'fadeIn .5s ease' }}>
                    <div style={{ fontSize: '24px' }}>🔔</div>
                    <div>
                        <h3 style={{ color: '#eab308', fontSize: '14px', fontFamily: "'Outfit', monospace", fontWeight: 'bold', letterSpacing: '1px', marginBottom: '4px' }}>ACTION REQUIRED: END-OF-MONTH CLOSING</h3>
                        <p style={{ color: '#fef08a', fontSize: '12px', margin: 0 }}>The current month is ending. To ensure maximum accuracy for next month, please execute a standard <strong>Global Baseline AI Retrain</strong> (Empty Categories at 1X Loop) to capture all new unweighted sales data.</p>
                    </div>
                </div>
            )}

            {/* ── Page header ── */}
            <div className="flex justify-between items-center mb-6" style={{ animation: 'slideInLeft .6s ease', marginTop: '40px' }}>
                <div>
                    <h1 className="page-title" style={{ fontFamily: "'Outfit', monospace", fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '4px', textShadow: '0 0 30px rgba(249,115,22,.3)' }}>DEMAND <span>FORECASTS</span></h1>
                    <div style={{ marginTop: '6px', height: '2px', width: '200px', background: 'linear-gradient(90deg, #f97316, transparent)', boxShadow: '0 0 10px rgba(249,115,22,.4)' }} />
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{
                        padding: '8px 16px', borderRadius: '20px', fontFamily: "'Outfit', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '1px',
                        border: isDataReady ? '1px solid rgba(34,197,94,.5)' : '1px solid rgba(234,179,8,.4)',
                        color: isDataReady ? '#22c55e' : '#fde047',
                        background: isDataReady ? 'rgba(34,197,94,.05)' : 'rgba(234,179,8,.1)',
                        boxShadow: isDataReady ? '0 0 15px rgba(34,197,94,.2)' : '0 0 15px rgba(234,179,8,.15)',
                        display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.5s ease', backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isDataReady ? '#22c55e' : '#facc15', boxShadow: `0 0 12px ${isDataReady ? '#22c55e' : '#facc15'}` }} />
                        {isDataReady ? 'SALES DATA SYNCED' : 'AWAITING SALES UPLOAD'}
                    </div>
                    <button onClick={handleOpenRetrain} disabled={retraining}
                        title={!isDataReady ? "Warning: Sales data might be incomplete." : "Data is ready. Start ML Pipeline."}
                        style={{
                            position: 'relative', background: isDataReady ? 'rgba(34,197,94,.15)' : 'linear-gradient(90deg, rgba(249,115,22,.15), rgba(234,88,12,.15))',
                            border: `1px solid ${isDataReady ? '#22c55e' : 'rgba(249,115,22,.6)'}`,
                            padding: '10px 24px', color: isDataReady ? '#22c55e' : '#fff', fontSize: '11px', letterSpacing: '2px',
                            fontFamily: "'Outfit', monospace", fontWeight: 700, cursor: retraining ? 'wait' : 'pointer', borderRadius: '4px',
                            transition: 'all .3s ease', boxShadow: isDataReady ? '0 0 20px rgba(34,197,94,.3)' : '0 4px 15px rgba(249,115,22,.2)', backdropFilter: 'blur(4px)'
                        }}>
                        {retraining ? 'TRIGGERING...' : (isDataReady ? 'RETRAIN AI NOW' : 'MANUAL RETRAIN 🚀')}
                    </button>
                </div>
            </div>

            {/* ══ AI RISK SETTINGS PANEL ══ */}
            <div style={{ marginBottom: '24px', animation: 'fadeInUp .35s ease both' }}>
                {/* Toggle button */}
                <button
                    onClick={() => setShowRiskPanel(p => !p)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: showRiskPanel ? 'rgba(249,115,22,.12)' : 'rgba(255,255,255,.03)',
                        border: `1px solid ${showRiskPanel ? 'rgba(249,115,22,.5)' : 'rgba(255,255,255,.12)'}`,
                        borderRadius: showRiskPanel ? '12px 12px 0 0' : '12px',
                        padding: '10px 20px', cursor: 'pointer', width: '100%',
                        transition: 'all .3s ease'
                    }}
                >
                    <span style={{ fontSize: '16px' }}>⚙️</span>
                    <span style={{ fontFamily: "'Outfit', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: showRiskPanel ? '#f97316' : 'rgba(226,232,240,.5)' }}>
                        AI RISK SETTINGS — SAFETY FACTOR PER CATEGORY
                    </span>
                    <span style={{ marginLeft: 'auto', color: showRiskPanel ? '#f97316' : 'rgba(226,232,240,.3)', fontSize: '14px' }}>
                        {showRiskPanel ? '▾' : '▸'}
                    </span>
                </button>

                {showRiskPanel && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(12,12,22,.98), rgba(20,8,35,.98))',
                        border: '1px solid rgba(249,115,22,.4)', borderTop: 'none',
                        borderRadius: '0 0 12px 12px', padding: '24px 28px', animation: 'fadeIn .25s ease'
                    }}>
                        <p style={{ fontSize: '12px', color: 'rgba(226,232,240,.5)', fontFamily: "'Outfit', monospace", marginBottom: '20px', lineHeight: '1.6' }}>
                            The <strong style={{ color: '#f97316' }}>Safety Factor (Z)</strong> controls how large a buffer stock the AI builds for each category.
                            Higher service levels = more safety stock = fewer stockouts but higher holding costs.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>
                            {/* Left — Category selector */}
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: 'rgba(249,115,22,.8)', fontFamily: "'Outfit', monospace", letterSpacing: '2px', marginBottom: '10px' }}>
                                    SELECT CATEGORY
                                </label>
                                <select
                                    value={selectedRiskCat}
                                    onChange={e => setSelectedRiskCat(e.target.value)}
                                    style={{
                                        width: '100%', background: 'rgba(0,0,0,.5)',
                                        border: '1px solid rgba(249,115,22,.3)', color: '#e2e8f0',
                                        padding: '10px 14px', borderRadius: '6px',
                                        fontFamily: "'Outfit', monospace", fontSize: '13px',
                                        cursor: 'pointer', outline: 'none'
                                    }}
                                >
                                    {availableCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                {/* Current stored value indicator */}
                                <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(226,232,240,.4)', fontFamily: "'Outfit', monospace" }}>
                                    STORED VALUE: &nbsp;
                                    <span style={{ color: '#f97316', fontWeight: 700 }}>
                                        Z = {(catSafetyMap[selectedRiskCat] ?? 1.645).toFixed(3)}
                                    </span>
                                    &nbsp;({catSafetyMap[selectedRiskCat] ? 'custom' : 'default 95%'})
                                </div>
                            </div>

                            {/* Right — Service level pills */}
                            <div>
                                <label style={{ display: 'block', fontSize: '10px', color: 'rgba(249,115,22,.8)', fontFamily: "'Outfit', monospace", letterSpacing: '2px', marginBottom: '10px' }}>
                                    SERVICE LEVEL (CONFIDENCE)
                                </label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {[
                                        { label: '85%', z: 1.036 },
                                        { label: '90%', z: 1.282 },
                                        { label: '95%', z: 1.645 },
                                        { label: '99%', z: 2.326 },
                                        { label: '99.9%', z: 3.090 }
                                    ].map(opt => {
                                        const isActive = Math.abs(selectedZ - opt.z) < 0.001;
                                        return (
                                            <button
                                                key={opt.label}
                                                onClick={() => { setSelectedZ(opt.z); setRiskSaved(false); }}
                                                style={{
                                                    padding: '8px 14px', borderRadius: '20px', cursor: 'pointer',
                                                    fontFamily: "'Outfit', monospace", fontSize: '11px', fontWeight: 700,
                                                    transition: 'all .2s ease',
                                                    background: isActive ? 'rgba(249,115,22,.2)' : 'transparent',
                                                    border: `1px solid ${isActive ? '#f97316' : 'rgba(255,255,255,.15)'}`,
                                                    color: isActive ? '#f97316' : 'rgba(226,232,240,.5)',
                                                    boxShadow: isActive ? '0 0 12px rgba(249,115,22,.2)' : 'none'
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Formula preview */}
                                <div style={{
                                    marginTop: '14px', padding: '12px 16px',
                                    background: 'rgba(0,0,0,.3)', borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,.06)',
                                    fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#94a3b8'
                                }}>
                                    Safety Stock = <span style={{ color: '#f97316', fontWeight: 700 }}>{selectedZ.toFixed(3)}</span>
                                    &nbsp;× σ × √(lead_time)
                                </div>
                            </div>
                        </div>

                        {/* Save button */}
                        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button
                                id="save-safety-factor-btn"
                                onClick={handleSaveRisk}
                                disabled={savingRisk}
                                style={{
                                    padding: '10px 28px', borderRadius: '6px', cursor: savingRisk ? 'wait' : 'pointer',
                                    fontFamily: "'Outfit', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '2px',
                                    background: riskSaved ? 'rgba(34,197,94,.15)' : 'rgba(249,115,22,.15)',
                                    border: `1px solid ${riskSaved ? '#22c55e' : '#f97316'}`,
                                    color: riskSaved ? '#22c55e' : '#f97316',
                                    transition: 'all .3s ease',
                                    boxShadow: riskSaved ? '0 0 16px rgba(34,197,94,.2)' : '0 0 16px rgba(249,115,22,.15)'
                                }}
                            >
                                {savingRisk ? 'SAVING...' : riskSaved ? '✓ SAVED TO FIRESTORE' : 'SAVE SETTINGS'}
                            </button>
                            {riskSaved && (
                                <span style={{ fontSize: '11px', color: '#22c55e', fontFamily: "'Outfit', monospace", animation: 'fadeIn .3s ease' }}>
                                    Safety stock for <strong>{selectedRiskCat}</strong> updated. Alerts will use Z = {selectedZ.toFixed(3)} on next recalculation.
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {/* ══════════════════════════════════════════════════════ */}

            {/* ── Global AI Performance Metrics (Accuracy) ── */}
            {aiState && aiState.metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '32px', animation: 'fadeInUp .4s ease both' }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,.1), rgba(20,83,45,.4))', border: '1px solid rgba(34,197,94,.3)', borderRadius: '20px', padding: '16px' }}>
                        <div style={{ fontSize: '11px', color: '#86efac', fontFamily: "'Outfit', monospace", letterSpacing: '1px', marginBottom: '8px' }}>R² SCORE (ACCURACY)</div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#4ade80', fontFamily: "'Space Mono', monospace" }}>{aiState.metrics.Accuracy}%</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '4px' }}>Variance explained by model</div>
                    </div>
                    <div style={{ background: 'rgba(137, 32, 32, 0.3)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '20px', padding: '16px' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 1)', fontFamily: "'Outfit', monospace", letterSpacing: '1px', marginBottom: '8px' }}>ROOT MEAN SQ. ERROR</div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#e2e8f0', fontFamily: "'Space Mono', monospace" }}>{aiState.metrics.RMSE}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>Average deviation (penalty for large errors)</div>
                    </div>
                    <div style={{ background: 'rgba(49, 9, 229, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '20px', padding: '16px' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(254, 255, 255, 1)', fontFamily: "'Outfit', monospace", letterSpacing: '1px', marginBottom: '8px' }}>MEAN ABSOLUTE ERROR</div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#e2e8f0', fontFamily: "'Space Mono', monospace" }}>{aiState.metrics.MAE}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>Absolute deviation in units</div>
                    </div>
                    <div style={{ background: 'rgba(19, 13, 72, 0.3)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(253, 253, 253, 1)', fontFamily: "'Outfit', monospace", letterSpacing: '1px', marginBottom: '4px' }}>MODEL STATUS</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '14px', fontWeight: 'bold', fontFamily: "'Outfit', monospace" }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }} />
                            OPTIMIZED
                        </div>
                    </div>
                </div>
            )}

            {/* ── Category forecast bar chart ── */}
            <div style={{ background: 'linear-gradient(135deg, rgba(12, 38, 57, 0.93), rgba(21, 7, 37, 0.78))', border: '1px solid rgba(249, 116, 22, 0.66)', borderRadius: '20px', padding: '16px', animation: 'fadeInUp .5s ease both', marginBottom: '32px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '14px', color: '#e2e8f0', letterSpacing: '3px', margin: 0, lineHeight: '1.5' }}>
                        FORWARD DEMAND FORECAST BY CATEGORY
                        <br />
                        <span style={{ fontSize: '25px', color: '#e0f000ff' }}>({monthName})</span>
                    </h2>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '16px', background: 'rgba(4, 250, 242, 0.05)', border: '1px solid rgba(4, 250, 242, 0.2)', padding: '6px 12px', borderRadius: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#04faf2', boxShadow: '0 0 8px #04faf2' }} />
                        <span style={{ fontSize: '12px', color: '#04faf2', fontFamily: "'Outfit', monospace", fontWeight: 'bold', letterSpacing: '1px' }}>
                            MODEL TRAINED ON: {prevMonth} EOM DATA
                        </span>
                    </div>
                </div>

                <div style={{ height: '400px', width: '100%', marginTop: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }} maxBarSize={60} barCategoryGap="20%" barGap={4}>
                            <defs>
                                <linearGradient id="color7d" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                </linearGradient>
                                <linearGradient id="color30d" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="category" stroke="rgba(226,232,240,.6)" tick={{ fill: '#e2e8f0', fontSize: 14, fontWeight: 'bold' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} dy={10} />
                            <YAxis domain={[0, 'auto']} tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v} stroke="rgba(0, 110, 255, 1)" tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: 'bold' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} label={{ value: 'FORECAST (UNITS)', angle: -90, position: 'insideLeft', offset: -15, fill: '#e900f1ff', fontSize: 12, fontWeight: 'bold', letterSpacing: '1px' }} />
                            <Tooltip cursor={{ fill: 'rgba(249,115,22,.05)' }} contentStyle={{ backgroundColor: 'rgba(10,10,20,.97)', border: '1px solid rgba(249,115,22,.4)', color: '#fff', borderRadius: '6px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} itemStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: "14px", color: "rgba(255, 255, 255, 1)", paddingBottom: '20px' }} />
                            <Bar dataKey="total_forecast_30" fill="url(#color30d)" radius={[4, 4, 0, 0]} name={`30-Day Demand (${monthShort})`} />
                            <Bar dataKey="total_forecast_7" fill="url(#color7d)" radius={[4, 4, 0, 0]} name={`7-Day Demand (${monthShort})`} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                REDESIGNED PARETO CHART
            ══════════════════════════════════════════════════════════════ */}
            <div style={{ background: 'linear-gradient(135deg, rgba(12, 38, 57, 0.93), rgba(21, 7, 37, 0.78))', border: '1px solid rgba(249, 116, 22, 0.66)', borderRadius: '20px', padding: '20px', animation: 'fadeInUp .55s ease both', marginBottom: '32px' }}>

                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '16px', color: '#e2e8f0', letterSpacing: '2px' }}>
                            SKU DEMAND DISTRIBUTION PARETO
                        </h2>
                        <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '16px', color: '#e3f309ff', letterSpacing: '2px' }}>80/20 ANALYSIS FOR {monthName}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '14px' }}>📊</span>
                                <span style={{ fontSize: '14px', color: 'rgba(226,232,240,.8)' }}>Sorted by <strong>30-Day Volume</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '14px' }}>📈</span>
                                <span style={{ fontSize: '14px', color: 'rgba(226,232,240,.8)' }}>Cumulative % <strong>(Right Axis)</strong></span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(226,232,240,.4)', fontFamily: "'Outfit', monospace" }}>COLOR BY</span>
                        <select
                            value={paretoColorMode}
                            onChange={e => setParetoColorMode(e.target.value)}
                            style={{
                                background: 'rgba(0,0,0,.5)', border: '1px solid rgba(249,115,22,.3)',
                                color: '#e2e8f0', padding: '5px 10px', borderRadius: '3px',
                                fontFamily: "'Outfit', monospace", fontSize: '11px', cursor: 'pointer', outline: 'none'
                            }}>
                            <option value="none">Uniform</option>
                            <option value="category">Category</option>
                            <option value="cumulative">Cumulative zone</option>
                        </select>
                    </div>
                </div>

                {/* Stats cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    {[
                        { label: 'Total SKUs', value: paretoDataFull.length, sub: 'in dataset' },
                        { label: '80% of demand', value: paretoIdx >= 0 ? paretoIdx + 1 : '—', sub: paretoIdx >= 0 ? `${Math.round(((paretoIdx + 1) / paretoDataFull.length) * 100)}% of catalog` : '' },
                        { label: 'Top SKU demand', value: paretoDataFull[0] ? paretoDataFull[0].demand.toLocaleString() : '—', sub: paretoDataFull[0]?.sku || '' },
                        { label: 'Visible demand', value: grandTotal > 0 ? `${Math.round((visibleDemand / grandTotal) * 100)}%` : '—', sub: `${visibleDemand.toLocaleString()} units` }
                    ].map((s, i) => (
                        <div key={i} style={{ background: 'rgba(0, 0, 0, 0.43)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '4px', padding: '12px 14px' }}>
                            <div style={{ fontSize: '14px', color: 'rgba(0, 241, 253, 0.95)', fontFamily: "'Outfit', monospace", letterSpacing: '1px', marginBottom: '6px' }}>{s.label}</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0', fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
                            <div style={{ fontSize: '14px', color: 'rgba(36, 219, 66, 1)', marginTop: '2px' }}>{s.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Threshold jump buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(250, 250, 250, 0.97)', fontFamily: "'Outfit', monospace" }}>JUMP TO:</span>
                    {[50, 80, 95].map(pct => (
                        <button key={pct}
                            onClick={() => jumpToParetoThreshold(pct)}
                            style={{
                                fontSize: '11px', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
                                fontFamily: "'Outfit', monospace", fontWeight: 700, transition: 'all 0.15s',
                                background: paretoThreshold === pct ? 'rgba(56,138,221,.2)' : 'transparent',
                                border: `1px solid ${paretoThreshold === pct ? 'rgba(56,138,221,.6)' : 'rgba(255,255,255,.15)'}`,
                                color: paretoThreshold === pct ? '#378ADD' : 'rgba(226,232,240,.5)'
                            }}>
                            {pct}% demand
                        </button>
                    ))}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(254, 255, 255, 1)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#378ADD99', flexShrink: 0 }} />
                        30-day demand (units)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(254, 255, 255, 1)' }}>
                        <div style={{ width: '20px', height: '3px', background: '#E24B4A', borderRadius: '2px', flexShrink: 0 }} />
                        Cumulative %
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(254, 255, 255, 1)' }}>
                        <div style={{ width: '20px', height: '0', borderTop: '2px dashed #639922', flexShrink: 0 }} />
                        {paretoThreshold}% threshold
                    </div>
                </div>

                {/* Chart */}
                <div style={{ position: 'relative', width: '100%', height: '320px' }}>
                    <Chart type="bar" data={paretoChartData} options={paretoChartOptions} />
                </div>

                {/* Scrubber controls */}
                <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(0,0,0,.25)', borderRadius: '4px', border: '1px solid rgba(119, 58, 216, 0.85)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: 'rgba(226,232,240,.5)', fontFamily: "'Outfit', monospace" }}>
                            Showing SKUs <strong style={{ color: '#e2e8f0' }}>{paretoWindowStart + 1}</strong> – <strong style={{ color: '#e2e8f0' }}>{Math.min(paretoWindowStart + paretoWindowSize, paretoDataFull.length)}</strong> of <strong style={{ color: '#e2e8f0' }}>{paretoDataFull.length}</strong>
                        </span>
                        <span style={{ fontSize: '14px', color: 'rgba(249,115,22,.7)', fontFamily: "'Outfit', monospace" }}>
                            {grandTotal > 0 ? `Visible: ${Math.round((visibleDemand / grandTotal) * 100)}% of total demand` : ''}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Start position */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '14px', color: 'rgba(226,232,240,.4)', fontFamily: "'Outfit', monospace", letterSpacing: '1px' }}>START POSITION</span>
                                <span style={{ fontSize: '14px', color: '#e2e8f0', fontFamily: "'Space Mono', monospace" }}>#{paretoWindowStart + 1}</span>
                            </div>
                            <input type="range"
                                min={0}
                                max={Math.max(0, paretoDataFull.length - paretoWindowSize)}
                                value={paretoWindowStart}
                                step={1}
                                onChange={e => setParetoWindowStart(parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: '#f97316', cursor: 'pointer' }}
                            />
                        </div>
                        {/* Window size */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '14px', color: 'rgba(226,232,240,.4)', fontFamily: "'Outfit', monospace", letterSpacing: '1px' }}>WINDOW SIZE</span>
                                <span style={{ fontSize: '14px', color: '#e2e8f0', fontFamily: "'Space Mono', monospace" }}>{paretoWindowSize} SKUs</span>
                            </div>
                            <input type="range"
                                min={5}
                                max={60}
                                value={paretoWindowSize}
                                step={1}
                                onChange={e => setParetoWindowSize(parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: '#f97316', cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Insight box */}
                {paretoInsight && (
                    <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(56,138,221,.05)', borderLeft: '4px solid #378ADD', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '16px' }}>💡</span>
                            <span style={{ fontFamily: "'Outfit', monospace", fontSize: '14px', fontWeight: 'bold', color: '#e2e8f0', letterSpacing: '2px' }}>AI CATALOG STRATEGY</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Volume Concentration</div>
                                <div style={{ fontSize: '14px', color: 'rgba(226,232,240,.8)', lineHeight: '1.5' }}>
                                    <strong style={{ color: '#38bdf8', fontSize: '16px' }}>{paretoInsight.skusFor80} SKUs</strong> ({paretoInsight.pctOfCatalog}% of catalog) drive 80% of total demand.
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Dominant Category</div>
                                <div style={{ fontSize: '14px', color: 'rgba(226,232,240,.8)', lineHeight: '1.5' }}>
                                    Core performance led by <strong style={{ color: '#4ade80', fontSize: '16px' }}>{paretoInsight.topCat}</strong> ({paretoInsight.topCatPct}% of grand total).
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Long-Tail Strategy</div>
                                <div style={{ fontSize: '14px', color: 'rgba(226,232,240,.8)', lineHeight: '1.5' }}>
                                    The remaining <strong style={{ color: '#facc15', fontSize: '16px' }}>{paretoInsight.tail} SKUs</strong> require separate automated replenishment policies.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* ══════════════════════════════════════════════════════════════ */}

            {/* ── Forecast data table ── */}
            <div style={{ background: 'linear-gradient(135deg, rgba(12,12,22,.97), rgba(18,8,28,.97))', border: '1px solid rgba(249, 116, 22, 0.66)', borderRadius: '20px', padding: '16px', marginBottom: '32px', animation: 'fadeInUp .6s ease both' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '12px', color: '#e2e8f0', letterSpacing: '1px' }}>FORECAST DATA.TABLE</h2>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <button onClick={() => setShowOnlyVolatile(!showOnlyVolatile)}
                            style={{
                                background: showOnlyVolatile ? 'rgba(239,68,68,.15)' : 'transparent',
                                border: `1px solid ${showOnlyVolatile ? '#ef4444' : 'rgba(249,115,22,.4)'}`,
                                color: showOnlyVolatile ? '#ef4444' : '#f97316',
                                padding: '8px 12px', borderRadius: '3px', fontSize: '13px',
                                letterSpacing: '1px', fontFamily: "'Outfit', monospace", fontWeight: 'bold',
                                cursor: 'pointer', transition: 'all 0.3s'
                            }}>
                            {showOnlyVolatile ? '⚠️ CLEAR RISK FILTER' : '⚠️ FILTER HIGH RISK SKUS'}
                        </button>
                        <input type="text" placeholder="Search SKU or Category"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(249,115,22,.4)',
                                color: '#fff', padding: '8px 12px', borderRadius: '3px',
                                fontFamily: "'Outfit', monospace", fontSize: '13px', width: '250px', outline: 'none'
                            }}
                        />
                    </div>
                </div>
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', borderRadius: '4px' }}>
                    <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'rgba(10,10,18,1)', position: 'sticky', top: 0, zIndex: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
                            <tr>
                                {[['sku', 'SKU'], ['category', 'Category'], ['forecast_7d', `7-Day (${monthShort})`], ['forecast_30d', `30-Day (${monthShort})`], ['current_stock', 'Inventory Status'], ['volatility_cv', 'Volatility'], ['is_cold', 'ML Status']].map(([key, label]) => (
                                    <th key={key} onClick={() => handleSort(key)}
                                        className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider"
                                        style={{ color: 'rgba(226,232,240,.4)', fontFamily: "'Outfit', monospace", cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        {label}<span style={{ color: 'rgba(249,115,22,.8)' }}>{getSortIcon(key)}</span>
                                    </th>
                                ))}
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.length > 0 ? processedData.map((f, i) => (
                                <React.Fragment key={f.sku || i}>
                                    <tr style={{ transition: 'background .2s', borderBottom: '1px solid rgba(249,115,22,.1)', background: expandedRows.includes(f.sku) ? 'rgba(5,5,10,.8)' : 'transparent' }}
                                        onMouseEnter={(e) => { if (!expandedRows.includes(f.sku)) e.currentTarget.style.background = 'rgba(249,115,22,.05)' }}
                                        onMouseLeave={(e) => { if (!expandedRows.includes(f.sku)) e.currentTarget.style.background = 'transparent' }}>
                                        <td className="px-6 py-4 font-mono text-base" style={{ color: 'rgba(226,232,240,.6)' }}>{f.sku}</td>
                                        <td className="px-6 py-4 text-base" style={{ color: '#e2e8f0' }}>{f.category}</td>
                                        <td className="px-6 py-4 font-bold text-base" style={{ color: '#818cf8', textShadow: '0 0 8px rgba(129,140,248,.3)' }}>{f.forecast_7d}</td>
                                        <td className="px-6 py-4 font-bold text-base" style={{ color: '#f97316', textShadow: '0 0 8px rgba(249,115,22,.3)' }}>
                                            {f.forecast_30d}
                                            {f.error_margin ? <span style={{ fontSize: '10px', color: 'rgba(249,115,22,.5)', marginLeft: '6px', textShadow: 'none' }}>± {f.error_margin}</span> : null}
                                        </td>
                                        <td className="px-6 py-4 text-base">
                                            {f.forecast_30d > (f.current_stock || 0) ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '14px', animation: 'pulse 2s infinite' }}>⚠️</span>
                                                    <div>
                                                        <div style={{ color: '#ef4444', fontSize: '10px', fontFamily: "'Outfit', monospace", fontWeight: 'bold', letterSpacing: '0.5px' }}>REORDER NEEDED</div>
                                                        <div style={{ color: '#fca5a5', fontSize: '9px' }}>Deficit: {(f.current_stock || 0)} - {f.forecast_30d}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '12px' }}>✅</span>
                                                    <div>
                                                        <div style={{ color: '#22c55e', fontSize: '10px', fontFamily: "'Outfit', monospace", fontWeight: 'bold' }}>HEALTHY</div>
                                                        <div style={{ color: '#86efac', fontSize: '9px' }}>Stock: {f.current_stock || 0} units</div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-base">
                                            {f.volatility_cv !== undefined && f.volatility_cv !== null ? (
                                                <span style={{ color: f.volatility_cv > 0.5 ? '#ef4444' : f.volatility_cv > 0.1 ? '#f59e0b' : '#10b981', fontFamily: "'Space Mono', monospace" }}>
                                                    {f.volatility_cv.toFixed(2)} CV
                                                </span>
                                            ) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>N/A</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span style={{
                                                fontSize: '9px', padding: '3px 8px', borderRadius: '2px', letterSpacing: '1px',
                                                ...(f.is_cold
                                                    ? { border: '1px solid rgba(59,130,246,.4)', color: '#3b82f6', background: 'rgba(59,130,246,.1)' }
                                                    : { border: '1px solid rgba(34,197,94,.4)', color: '#22c55e', background: 'rgba(34,197,94,.1)' })
                                            }}>
                                                {f.is_cold ? 'COLD-START' : 'GRADUATED'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => toggleRow(f.sku)} style={{ fontSize: '10px', background: 'rgba(249,115,22,.1)', color: '#f97316', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(249,115,22,.3)', cursor: 'pointer', fontFamily: "'Outfit', monospace", fontWeight: 'bold' }}>
                                                {expandedRows.includes(f.sku) ? 'HIDE AI ▾' : 'INSPECT AI ▸'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRows.includes(f.sku) && (
                                        <tr style={{ background: 'rgba(5,5,10,0.8)', borderBottom: '1px solid rgba(249,115,22,.3)' }}>
                                            <td colSpan="8" style={{ padding: 0 }}>
                                                <div style={{ padding: '24px 32px', animation: 'fadeIn .3s ease' }}>
                                                    <h4 style={{ fontFamily: "'Outfit', monospace", fontSize: '11px', color: '#e2e8f0', letterSpacing: '1px', marginBottom: '16px' }}>
                                                        <span style={{ color: '#f97316' }}>🧠 AI ENGINE EXPLAINABILITY</span>
                                                    </h4>
                                                    {f.shap_factors && f.shap_factors.length > 0 ? (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                            {f.shap_factors.map((shap, idx) => (
                                                                <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,.05)', padding: '12px', borderRadius: '4px' }}>
                                                                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>{shap.feature}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                        <span style={{ fontSize: '16px', fontFamily: "'Space Mono', monospace", color: shap.impact > 0 ? '#10b981' : shap.impact < 0 ? '#ef4444' : '#94a3b8', fontWeight: 'bold' }}>
                                                                            {shap.impact > 0 ? '+' : ''}{shap.impact.toFixed(1)}
                                                                        </span>
                                                                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                            <div style={{ width: `${Math.min(Math.abs(shap.impact) * 10, 100)}%`, height: '100%', background: shap.impact > 0 ? '#10b981' : shap.impact < 0 ? '#ef4444' : '#94a3b8', transition: 'width 1s ease-out' }} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Detailed SHAP explainability matrices have not been generated for this specific baseline yet. Wait until next rolling period.</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-sm" style={{ color: 'rgba(226,232,240,.5)', fontFamily: "'Outfit', monospace" }}>
                                        NO MATCHING DATA FOUND
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Retrain modal ── */}
            {
                showRetrainModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh', paddingBottom: '10vh', backdropFilter: 'blur(8px)' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(22,27,34,.98), rgba(13,17,23,.98))', border: '1px solid rgba(249,115,22,.5)', padding: '32px', borderRadius: '8px', width: '600px', boxShadow: '0 0 50px rgba(249,115,22,.15)', animation: 'fadeIn .3s ease' }}>
                            <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '22px', color: '#fff', letterSpacing: '2px', marginBottom: '12px' }}>🚀 DEEP-DIVE AI RETRAIN</h2>
                            <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '28px', lineHeight: '1.5' }}>Force the Machine Learning engine to heavily prioritize specific categories during the gradient generation.</p>
                            {!isDataReady && (
                                <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid #ef4444', padding: '16px', borderRadius: '6px', marginBottom: '28px' }}>
                                    <p style={{ fontSize: '12px', color: '#ef4444', fontFamily: "'Outfit', monospace", fontWeight: 'bold', letterSpacing: '1px' }}>⚠️ HIGH RISK OVERFIT WARNING!</p>
                                    <p style={{ fontSize: '12px', color: '#fecaca', marginTop: '6px', lineHeight: '1.4' }}>You are executing a custom retrain loop before the final 5 days of the month. Sales data is incomplete.</p>
                                </div>
                            )}
                            <div style={{ marginBottom: '28px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#fb923c', fontFamily: "'Outfit', monospace", marginBottom: '16px', letterSpacing: '1px' }}>TARGET CATEGORIES (Empty = Global Rebuild)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {availableCategories.map(cat => {
                                        const isActiveBias = aiState?.categories_boosted?.includes(cat);
                                        return (
                                            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#f8fafc', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={selectedCategories.includes(cat)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedCategories([...selectedCategories, cat]);
                                                        else setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                                    }}
                                                    style={{ accentColor: '#f97316', width: '16px', height: '16px' }}
                                                />
                                                {cat}
                                                {isActiveBias && <span style={{ fontSize: '10px', color: '#f97316', background: 'rgba(249,115,22,.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(249,115,22,.3)', fontWeight: 'bold' }}>(🔥 ACTIVE)</span>}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ marginBottom: '40px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#fb923c', fontFamily: "'Outfit', monospace", marginBottom: '16px', letterSpacing: '1px' }}>
                                    <span>EPOCH MULTIPLIER (MAX 3X)</span>
                                    <span style={{ color: '#fff' }}>{epochs}X LOOP</span>
                                </label>
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                    {[1, 2, 3].map(val => {
                                        const isSelected = epochs === val;
                                        const color = { 1: '#22c55e', 2: '#eab308', 3: '#ef4444' }[val];
                                        return (
                                            <button key={val} onClick={() => setEpochs(val)}
                                                style={{
                                                    flex: 1, padding: '12px',
                                                    background: isSelected ? `rgba(${val === 1 ? '34,197,94' : val === 2 ? '234,179,8' : '239,68,68'}, 0.1)` : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.1)'}`,
                                                    borderRadius: '4px', color: isSelected ? color : '#94a3b8',
                                                    fontFamily: "'Outfit', monospace", fontWeight: isSelected ? 'bold' : 'normal',
                                                    cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
                                                }}>
                                                {val}X LOOP
                                                {isSelected && <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: '100%', background: color }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(148, 163, 184, 0.05)', border: '1px solid rgba(148, 163, 184, 0.1)', padding: '10px 14px', borderRadius: '4px', marginTop: '12px' }}>
                                    <span style={{ fontSize: '14px' }}>🧠</span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                                        Higher epochs force the AI to memorize the targeted categories <strong style={{ color: '#e2e8f0' }}>{epochs}x harder</strong>. Capped at 3x to prevent catastrophic global forgetting.
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                                <button onClick={() => setShowRetrainModal(false)} style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid #475569', padding: '10px 20px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>CANCEL</button>
                                <button onClick={handleExecuteRetrain} style={{ background: '#f97316', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontSize: '12px', fontFamily: "'Outfit', monospace", fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px', boxShadow: '0 4px 14px 0 rgba(249,115,22,0.39)' }}>▶ START SIMULATION</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── System message modal ── */}
            {
                systemMessage && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(22,27,34,.98), rgba(13,17,23,.98))', border: `1px solid ${systemMessage.type === 'error' ? '#ef4444' : '#22c55e'}`, padding: '40px', borderRadius: '8px', width: '450px', textAlign: 'center', boxShadow: `0 0 50px ${systemMessage.type === 'error' ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.15)'}`, animation: 'fadeIn .3s ease' }}>
                            <div style={{ fontSize: '40px', marginBottom: '20px' }}>{systemMessage.type === 'error' ? '❌' : '✅'}</div>
                            <h3 style={{ fontFamily: "'Outfit', monospace", fontSize: '18px', color: '#fff', letterSpacing: '2px', marginBottom: '16px' }}>{systemMessage.type === 'error' ? 'SYSTEM ERROR' : 'PIPELINE TRIGGERED'}</h3>
                            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '32px' }}>{systemMessage.text}</p>
                            <button onClick={() => setSystemMessage(null)} style={{ background: systemMessage.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: '4px', fontSize: '12px', fontFamily: "'Outfit', monospace", fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px' }}>ACKNOWLEDGE</button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
