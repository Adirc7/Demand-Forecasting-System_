import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getReports, generateReport, getAccuracy,
  getBusinessMetrics, getHistoricalMetrics,
  getHistoricalDetailed, downloadCSVFile,
  getCustomCharts, saveCustomChart, deleteCustomChart, fetchCustomReport, deleteReport
} from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import PDFReportTemplate from '../components/PDFReportTemplate';
import CustomReportBuilder from '../components/CustomReportBuilder';
import DynamicChartCard from '../components/DynamicChartCard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import SortableChartCard from '../components/SortableChartCard';


/* ═══════════════════════════════════════════════════
   MODERN DESIGN SYSTEM
   ═══════════════════════════════════════════════════ */
const THEME = {
  bg: {
    primary: 'transparent',
    secondary: '#271d30ff',
    tertiary: 'rgba(255, 255, 255, 0.05)',
    card: 'linear-gradient(135deg, rgba(34, 34, 46, 0.97), rgba(18, 8, 28, 0.97))',
    elevated: 'linear-gradient(145deg, rgba(12, 12, 22, 0.99), rgba(18, 8, 28, 0.99))',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.15)',
    strong: 'rgba(24, 19, 19, 0.25)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#e2e8f0',
    muted: '#94a3b8',
    dim: '#64748b',
  },
  brand: {
    primary: '#f97316',
    primaryLight: '#fb923c',
    primaryDark: '#ea580c',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  },
  success: {
    base: '#10b981',
    light: '#34d399',
    dark: '#059669',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  danger: {
    base: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
  warning: {
    base: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  info: {
    base: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  purple: {
    base: '#a855f7',
    light: '#c084fc',
    dark: '#9333ea',
    bg: 'rgba(168, 85, 247, 0.1)',
    border: 'rgba(168, 85, 247, 0.3)',
  },
  charts: ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#f97316'],
};

const formatCurrency = (n) => {
  if (n == null) return 'N/A';
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000_000) return `Rs. ${(num / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(num) >= 1_000_000) return `Rs. ${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `Rs. ${(num / 1_000).toFixed(1)}K`;
  return `Rs. ${num.toLocaleString()}`;
};

const formatNumber = (n) => {
  if (n == null) return 'N/A';
  return Number(n).toLocaleString();
};

const Badge = ({ children, variant = 'default', size = 'md', icon }) => {
  const variants = {
    success: { bg: THEME.success.bg, text: THEME.success.light, border: THEME.success.border },
    danger: { bg: THEME.danger.bg, text: THEME.danger.light, border: THEME.danger.border },
    warning: { bg: THEME.warning.bg, text: THEME.warning.light, border: THEME.warning.border },
    info: { bg: THEME.info.bg, text: THEME.info.light, border: THEME.info.border },
    purple: { bg: THEME.purple.bg, text: THEME.purple.light, border: THEME.purple.border },
    default: { bg: 'rgba(255, 255, 255, 0.05)', text: THEME.text.secondary, border: THEME.border.subtle },
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  const style = variants[variant] || variants.default;

  return (
    <span
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
      className={`inline-flex items-center gap-1.5 ${sizes[size]} rounded-full font-semibold backdrop-blur-sm transition-all hover:scale-105 whitespace-nowrap`}
    >
      {icon && <span className="text-xs">{icon}</span>}
      {children}
    </span>
  );
};

const MetricCard = ({ label, value, change, changeType = 'neutral', icon, gradient, onClick }) => {
  const changeColors = {
    positive: THEME.success.light,
    negative: THEME.danger.light,
    neutral: THEME.text.muted,
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: THEME.bg.card,
        border: `1px solid ${THEME.border.default}`,
      }}
      className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/10 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div
        style={{ background: gradient || THEME.brand.gradient }}
        className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
      />
      {icon && (
        <div
          style={{ background: gradient || THEME.brand.gradient }}
          className="mb-4 inline-flex rounded-xl p-3 shadow-lg"
        >
          <span className="text-xl">{icon}</span>
        </div>
      )}
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: THEME.text.muted }}>
        {label}
      </div>
      <div className="mb-2 text-3xl font-bold tracking-tight" style={{ color: THEME.text.primary }}>
        {value}
      </div>
      {change && (
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: changeColors[changeType] }}>
          <span>{changeType === 'positive' ? '↗' : changeType === 'negative' ? '↘' : '→'}</span>
          <span>{change}</span>
        </div>
      )}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-orange-500/0 blur-3xl transition-all duration-500 group-hover:bg-orange-500/10" />
    </div>
  );
};

const Alert = ({ type = 'info', title, children }) => {
  const types = {
    success: { ...THEME.success, icon: '✓', dot: THEME.success.base },
    danger: { ...THEME.danger, icon: '!', dot: THEME.danger.base },
    warning: { ...THEME.warning, icon: '⚠', dot: THEME.warning.base },
    info: { ...THEME.info, icon: 'i', dot: THEME.info.base },
  };

  const style = types[type] || types.info;

  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
      className="mb-3 flex gap-3 rounded-xl p-4 backdrop-blur-sm"
    >
      <div
        style={{ background: style.dot }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      >
        {style.icon}
      </div>
      <div className="flex-1">
        {title && <div className="mb-1 font-semibold" style={{ color: style.light }}>{title}</div>}
        <div className="text-sm leading-relaxed" style={{ color: style.light }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, subtitle, children, actions, className = '' }) => {
  return (
    <div
      style={{
        background: THEME.bg.elevated,
      }}
      className={`overflow-hidden rounded-2xl shadow-xl border border-white/10 transition-all duration-300 hover:border-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] hover:-translate-y-1 ${className}`}
    >
      {(title || actions) && (
        <div
          style={{ borderBottom: `1px solid ${THEME.border.subtle}` }}
          className="flex items-center justify-between px-6 py-4"
        >
          <div>
            {title && (
              <h3 className="text-lg font-bold tracking-tight" style={{ color: THEME.text.primary }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs" style={{ color: THEME.text.muted }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

const Table = ({ columns, data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: `2px solid ${THEME.border.default}` }}>
            {columns.map((col, i) => (
              <th
                key={`col-${i}`}
                className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                style={{ color: THEME.text.muted }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={`row-${i}`}
              style={{ borderBottom: `1px solid ${THEME.border.subtle}` }}
              className="transition-colors hover:bg-white/5"
            >
              {row.map((cell, j) => (
                <td
                  key={`cell-${i}-${j}`}
                  className="px-4 py-4 text-sm"
                  style={{ color: THEME.text.secondary }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: THEME.bg.tertiary,
        border: `1px solid ${THEME.border.strong}`,
      }}
      className="rounded-xl p-4 shadow-2xl backdrop-blur-md"
    >
      <div className="mb-2 text-xs font-semibold" style={{ color: THEME.text.muted }}>
        {label}
      </div>
      {payload.map((entry, index) => (
        <div key={`tooltip-${entry.dataKey}-${index}`} className="flex items-center gap-2 text-sm">
          <div
            style={{ background: entry.color }}
            className="h-2 w-2 rounded-full"
          />
          <span style={{ color: THEME.text.secondary }}>{entry.name}:</span>
          <span className="font-bold" style={{ color: entry.color }}>
            {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const ProgressBar = ({ label, value, max = 100, color }) => {
  const percentage = (value / max) * 100;

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span style={{ color: THEME.text.secondary }}>{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div
        style={{ background: THEME.border.subtle }}
        className="h-2.5 overflow-hidden rounded-full"
      >
        <div
          style={{ width: `${percentage}%`, background: color }}
          className="h-full rounded-full transition-all duration-500 shadow-lg"
        />
      </div>
    </div>
  );
};

const Module = ({ title, subtitle, badge, icon, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background: THEME.bg.card,
      }}
      className="overflow-hidden rounded-2xl shadow-xl border border-white/10 transition-all duration-300 hover:border-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ borderBottom: isOpen ? `1px solid ${THEME.border.subtle}` : 'none' }}
        className="flex w-full items-center gap-4 p-6 text-left transition-colors hover:bg-white/5"
      >
        {icon && (
          <div
            style={{ background: icon.bg }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg"
          >
            <span className="text-xl">{icon.element}</span>
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight" style={{ color: THEME.text.primary }}>
            {title}
          </h2>
          <p className="mt-1 text-xs" style={{ color: THEME.text.muted }}>
            {subtitle}
          </p>
        </div>
        {badge}
        <svg
          className="h-5 w-5 shrink-0 transition-transform duration-300"
          style={{
            color: THEME.text.muted,
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 p-6">
          {children}
        </div>
      )}
    </div>
  );
};

const Modal = ({ show, onClose, title, subtitle, maxWidth = "max-w-md", children }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
      <div
        style={{
          background: THEME.bg.secondary,
          border: `1px solid ${THEME.border.strong}`,
        }}
        className={`w-full ${maxWidth} relative rounded-2xl shadow-2xl transition-all`}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white cursor-pointer"
        >
          ✕
        </button>
        <div className="p-6 pr-14">
          <h3 className="text-2xl font-bold" style={{ color: THEME.text.primary }}>{title}</h3>
          {subtitle && <p className="mt-2 text-sm" style={{ color: THEME.text.muted }}>{subtitle}</p>}
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
};

const CheckOption = ({ label, checked, onChange, radio, name }) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/5">
    <input
      type={radio ? 'radio' : 'checkbox'}
      name={name}
      defaultChecked={checked}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer accent-orange-500"
    />
    <span style={{ color: THEME.text.secondary }}>{label}</span>
  </label>
);

export default function Reports() {
  const [reports, setReports] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSavedCharts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  const [metrics, setMetrics] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [historical, setHistorical] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [granularity, setGranularity] = useState('monthly');
  const [timeOffset, setTimeOffset] = useState(0);
  const [targetMonth, setTargetMonth] = useState('');
  const [monthOptions, setMonthOptions] = useState([]);
  const [savedCharts, setSavedCharts] = useState([]);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [kpiModal, setKpiModal] = useState(null);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [csvRange, setCsvRange] = useState('current');
  const [pdfSections, setPdfSections] = useState({ ai: true, financial: true, inventory: true, customCharts: true, snapshots: false });
  const [pdfCustomChartsData, setPdfCustomChartsData] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [customAiPrompt, setCustomAiPrompt] = useState('');
  const [activePieIndex, setActivePieIndex] = useState(-1);
  const chartsRef = useRef(null);
  const pdfTemplateRef = useRef(null);

  const loadData = useCallback(async (gran, offset) => {
    try {
      const [reps, acc, biz, hist, custom] = await Promise.all([
        getReports(),
        getAccuracy(gran, offset),
        getBusinessMetrics(),
        getHistoricalMetrics(gran, offset),
        getCustomCharts(),
      ]);

      if (hist && hist.revenue_chart && hist.inventory_chart) {
        const merged = hist.revenue_chart.map((r, i) => {
          return {
            ...r,
            inventory: hist.inventory_chart[i] ? hist.inventory_chart[i].value : 0
          };
        });
        hist.revenue_chart = merged;
      }

      setReports(reps);
      setMetrics(acc);
      setBusinessData(biz);
      setHistorical(hist);
      setSavedCharts(custom || []);
    } catch (err) {
      console.error('Load error:', err);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadData(granularity, timeOffset);
    }, 300);
    return () => clearTimeout(timeout);
  }, [loadData, granularity, timeOffset]);

  useEffect(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({
        val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      });
    }
    setMonthOptions(opts);
    setTargetMonth(opts[0]?.val || '');
  }, []);



  const handleSnapshot = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      await generateReport({ date_range: 'Last 7 Days' });
      await loadData(granularity, timeOffset);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (id) => {
    try {
      await deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomChart = async (config) => {
    try {
      const saved = await saveCustomChart(config);
      setSavedCharts(prev => [...prev, saved]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomChart = (id) => {
    setSavedCharts(prev => prev.filter(c => c.id !== id));
  };

  const handlePdfExport = async () => {
    setGenerating(true);
    try {
      if (!pdfTemplateRef.current) throw new Error("Template not mounted");

      let fetchedCustomCharts = [];
      if (pdfSections.customCharts && savedCharts.length > 0) {
        fetchedCustomCharts = await Promise.all(
          savedCharts.map(async (chart) => {
            try {
              const data = await fetchCustomReport({
                chart_type: chart.chart_type || 'line',
                metrics: chart.metrics || [],
                time_range: chart.time_range || 'last_month',
                granularity: chart.granularity || 'monthly'
              });
              return { ...chart, data };
            } catch (e) {
              return { ...chart, error: true };
            }
          })
        );
      }
      setPdfCustomChartsData(fetchedCustomCharts);
      await new Promise(resolve => setTimeout(resolve, 800));

      const doc = new jsPDF('p', 'px', [794, 1123]);
      const pages = Array.from(pdfTemplateRef.current.querySelectorAll('.pdf-page-container'));

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#0B1120',
          width: 794,
          height: 1123
        });

        const imgData = canvas.toDataURL('image/png', 1.0);

        if (i > 0) doc.addPage([794, 1123], 'p');
        doc.addImage(imgData, 'PNG', 0, 0, 794, 1123);
      }

      doc.save(`dropex_analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF generation failed: ' + err.message);
    } finally {
      setGenerating(false);
      setShowPdfModal(false);
    }
  };

  const handleCsvExport = async (range, specificMonth) => {
    setGenerating(true);
    try {
      await downloadCSVFile({ date_range: range, target_month: specificMonth });
    } catch (err) {
      console.error(err);
      alert('CSV export failed: ' + err.message);
    } finally {
      setGenerating(false);
      setShowCsvModal(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    setLoadingAi(true);
    try {
      const API_KEY = import.meta.env.VITE_GOOGLE_STUDIO_API_KEY;
      const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

      const customChartsData = await Promise.all(
        savedCharts.map(async (chart) => {
          try {
            const data = await fetchCustomReport({
              chart_type: chart.chart_type || 'line',
              metrics: chart.metrics || [],
              time_range: chart.time_range || 'last_month',
              granularity: chart.granularity || 'monthly'
            });
            return { name: chart.name, type: chart.chart_type, data };
          } catch (e) {
            return { name: chart.name, error: 'Data unavailable' };
          }
        })
      );

      let systemPrompt = `You are an Analytics Executive for Dropex.AI. Analyze this data: Metrics: ${JSON.stringify(metrics)}, Business: ${JSON.stringify(businessData)}. Also here is the actual data points from the user's custom dashboards: ${JSON.stringify(customChartsData)}. `;

      if (customAiPrompt.trim()) {
        systemPrompt += `The user has a specific question/request: "${customAiPrompt}". Please answer this specific request clearly and concisely based on the data provided.`;
      } else {
        systemPrompt += `Write a concise 3-paragraph executive summary covering: 1) AI Engine Health, 2) Financial Status, 3) Inventory Highlights (including specific numerical insights drawn from the Custom Dashboards data points). Use specific numbers.`;
      }

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        }),
      });

      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setAiSummary(data.candidates[0].content.parts[0].text);
      } else if (data.error) {
        console.error("Gemini API Error:", data.error);
        setAiSummary(`API Error: ${data.error.message}`);
      } else {
        console.error("Unknown response:", data);
        setAiSummary('Failed to generate insights. No candidates returned.');
      }
    } catch (e) {
      console.error(e);
      setAiSummary('AI connection failed.');
    } finally {
      setLoadingAi(false);
    }
  };

  const mockRevenueData = [
    { id: 'apr25', month: 'Apr \'25', revenue: 2800000, value: 9800000 },
    { id: 'may', month: 'May', revenue: 3000000, value: 10100000 },
    { id: 'jun', month: 'Jun', revenue: 3100000, value: 10300000 },
    { id: 'jul', month: 'Jul', revenue: 3300000, value: 10600000 },
    { id: 'aug', month: 'Aug', revenue: 3500000, value: 10900000 },
    { id: 'sep', month: 'Sep', revenue: 3600000, value: 11100000 },
    { id: 'oct', month: 'Oct', revenue: 3800000, value: 11300000 },
    { id: 'nov', month: 'Nov', revenue: 3900000, value: 11500000 },
    { id: 'dec', month: 'Dec', revenue: 4000000, value: 11800000 },
    { id: 'jan26', month: 'Jan \'26', revenue: 3700000, value: 11000000 },
    { id: 'feb', month: 'Feb', revenue: 4000000, value: 11400000 },
    { id: 'mar', month: 'Mar', revenue: 4200000, value: 11800000 },
  ];

  const mockAccuracyTrend = [
    { id: 'sep', period: 'Sep', mae: 3.2, accuracy: 88 },
    { id: 'oct', period: 'Oct', mae: 2.9, accuracy: 89 },
    { id: 'nov', period: 'Nov', mae: 2.8, accuracy: 90 },
    { id: 'dec', period: 'Dec', mae: 2.6, accuracy: 91 },
    { id: 'jan', period: 'Jan', mae: 2.5, accuracy: 92 },
    { id: 'feb', period: 'Feb', mae: 2.1, accuracy: 93 },
  ];

  const mockStockHealth = [
    { id: 'healthy', name: 'Healthy Stock', value: 779, color: THEME.success.base },
    { id: 'low', name: 'Low Stock', value: 38, color: THEME.danger.base },
    { id: 'over', name: 'Overstock', value: 21, color: THEME.warning.base },
    { id: 'cold', name: 'Cold Start', value: 14, color: THEME.info.base },
  ];

  const timeLabel = timeOffset === 0 ? 'Live Data' : timeOffset < 0 ? `${Math.abs(timeOffset)} months ago` : `${timeOffset} months projected`;

  return (
    <div style={{ background: THEME.bg.primary, padding: '0 40px' }} className="min-h-screen pb-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6" style={{ animation: 'slideInLeft .6s ease', marginTop: '40px' }}>
        <div>
          <h1 className="page-title">REPORTS <span>& ANALYTICS</span></h1>
          <div className="title-bar" style={{ marginTop: '16px' }} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCustomBuilder(true)}
            style={{
              background: THEME.bg.tertiary,
              border: `1px solid ${THEME.border.default}`,
              color: THEME.text.secondary,
            }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition-all hover:scale-105 hover:shadow-xl cursor-pointer"
          >
            <span>🛠</span> Custom Chart
          </button>

          <button
            onClick={() => setShowCsvModal(true)}
            disabled={generating}
            style={{
              background: THEME.bg.tertiary,
              border: `1px solid ${THEME.border.default}`,
              color: THEME.text.secondary,
            }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 cursor-pointer"
          >
            <span>📊</span> Export CSV
          </button>

          <button
            onClick={() => setShowPdfModal(true)}
            disabled={generating}
            style={{
              background: THEME.bg.tertiary,
              border: `1px solid ${THEME.border.default}`,
              color: THEME.text.secondary,
            }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 cursor-pointer"
          >
            <span>📄</span> Download PDF
          </button>

          <button
            onClick={handleSnapshot}
            disabled={generating}
            style={{
              background: THEME.brand.gradient,
            }}
            className="flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-white shadow-xl shadow-orange-500/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/50 disabled:opacity-50 cursor-pointer"
          >
            <span>📸</span> {generating ? 'Processing...' : 'Capture Snapshot'}
          </button>
        </div>
      </div>

      {/* TIME CONTROLS */}
      <Card className="mb-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: THEME.text.muted }}>
              View
            </span>
            <div className="flex gap-2 rounded-xl bg-black/30 p-1.5">
              {['weekly', 'monthly', 'yearly'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  style={{
                    background: granularity === g ? THEME.brand.gradient : 'rgba(255, 255, 255, 0.05)',
                    color: granularity === g ? 'white' : THEME.text.secondary,
                    border: granularity === g ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-all cursor-pointer hover:bg-white/10"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: THEME.text.muted }}>
              Range
            </span>
            <div className="flex flex-1 items-center gap-3">
              <span className="text-xs" style={{ color: THEME.text.dim }}>-12m</span>
              <input
                type="range"
                min="-12"
                max="12"
                value={timeOffset}
                step="1"
                onChange={(e) => setTimeOffset(Number(e.target.value))}
                className="flex-1 accent-orange-500 cursor-pointer"
                style={{ height: 6 }}
              />
              <span className="text-xs" style={{ color: THEME.text.dim }}>+12m</span>
            </div>
            <Badge
              variant={timeOffset === 0 ? 'success' : timeOffset < 0 ? 'default' : 'info'}
              size="lg"
              icon={timeOffset === 0 ? '●' : timeOffset > 0 ? '◆' : '○'}
            >
              {timeLabel}
            </Badge>
          </div>
        </div>
      </Card>

      {/* AI EXECUTIVE SUMMARY */}
      <Card
        className="mb-8"
        style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.05))',
          border: `1px solid ${THEME.purple.border}`,
        }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
          <div className="flex-1 w-full">
            <div className="mb-2 flex items-center gap-3">
              <span className="text-3xl">✨</span>
              <h2 className="text-2xl font-bold" style={{ color: THEME.purple.light }}>
                AI Executive Summary
              </h2>
            </div>
            <p className="text-sm mb-4" style={{ color: THEME.text.muted }}>
              Powered by Google Gemini 2.5 Flash
            </p>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Ask anything about your data... (e.g. Why did revenue drop?)"
                value={customAiPrompt}
                onChange={(e) => setCustomAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loadingAi) {
                    handleGenerateAiSummary();
                  }
                }}
                className="w-full bg-black/40 border border-purple-500/30 rounded-xl pl-4 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={handleGenerateAiSummary}
                disabled={loadingAi || !customAiPrompt.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Send query"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerateAiSummary}
            disabled={loadingAi}
            style={{
              background: THEME.purple.bg,
              border: `1px solid ${THEME.purple.border}`,
              color: THEME.purple.light,
            }}
            className="rounded-xl px-6 py-3 font-semibold transition-all hover:scale-105 disabled:opacity-50 cursor-pointer w-full lg:w-auto whitespace-nowrap"
          >
            {loadingAi ? '🔄 Analyzing...' : '✨ Generate Summary'}
          </button>
        </div>

        {aiSummary && (
          <div
            className="mt-6 rounded-xl p-6 relative"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${THEME.purple.border}`,
            }}
          >
            <button
              onClick={() => setAiSummary('')}
              className="absolute top-6 right-6 flex items-center justify-center h-8 w-8 rounded-full bg-white/5 text-gray-400 hover:bg-purple-500/20 hover:text-purple-400 transition-all cursor-pointer"
              title="Close Summary"
            >
              ✕
            </button>
            <div className="text-sm leading-relaxed pr-8" style={{ color: THEME.text.secondary }}>
              {aiSummary.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                <p
                  key={i}
                  className="mb-4 last:mb-0"
                  dangerouslySetInnerHTML={{
                    __html: line
                      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f5f5f7; font-size: 0.95rem;">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em style="color: #c084fc">$1</em>')
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* KPI METRICS */}
      {(metrics || businessData) && (
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            icon="💰"
            label="Total Revenue"
            value={formatCurrency(businessData?.total_revenue)}
            change="+12% vs last period"
            changeType="positive"
            gradient="linear-gradient(135deg, #10b981, #059669)"
            onClick={() => setKpiModal({ title: 'Total Revenue', dataKey: 'revenue', data: historical?.revenue_chart, format: formatCurrency, color: THEME.success.base })}
          />
          <MetricCard
            icon="📦"
            label="Inventory Value"
            value={formatCurrency(businessData?.total_inventory_value)}
            change="+4.2% vs last period"
            changeType="positive"
            gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
            onClick={() => setKpiModal({ title: 'Inventory Value', dataKey: 'value', data: historical?.inventory_chart, format: formatCurrency, color: THEME.info.base })}
          />
          <MetricCard
            icon="🔄"
            label="Restock Cost"
            value={formatCurrency(businessData?.est_restock_cost)}
            change="7-day forecast"
            changeType="neutral"
            gradient="linear-gradient(135deg, #f59e0b, #d97706)"
            onClick={() => setKpiModal({ title: 'Restock Cost', dataKey: 'value', data: historical?.restock_cost_chart, format: formatCurrency, color: THEME.warning.base })}
          />
          <MetricCard
            icon="⚠️"
            label="Low Stock Items"
            value={businessData?.stock_health_distribution?.low?.toString() || (metrics ? '38' : '--')}
            change="+6 vs last week"
            changeType="negative"
            gradient="linear-gradient(135deg, #ef4444, #dc2626)"
            onClick={() => setKpiModal({ title: 'Low Stock Items', dataKey: 'value', data: historical?.low_stock_chart, format: (v) => v, color: THEME.danger.base })}
          />
          <MetricCard
            icon="🎯"
            label="AI Accuracy"
            value={metrics?.Accuracy != null ? `${metrics.Accuracy}%` : 'N/A'}
            change="+1.2pp improvement"
            changeType="positive"
            gradient="linear-gradient(135deg, #a855f7, #9333ea)"
            onClick={() => setKpiModal({ title: 'AI Accuracy Trend', dataKey: 'accuracy', data: metrics?.accuracy_trend, format: (v) => `${v}%`, color: THEME.purple.light, xAxisKey: 'period' })}
          />
          <MetricCard
            icon="🆕"
            label="Cold Start"
            value={businessData?.stock_health_distribution?.cold?.toString() || '14'}
            change="Week 3 graduation"
            changeType="neutral"
            gradient="linear-gradient(135deg, #71717a, #52525b)"
          />
        </div>
      )}

      {/* MODULES */}
      <div className="space-y-6" ref={chartsRef}>
        <Module
          title="AI Forecast Engine"
          subtitle="Model health · Accuracy metrics · Drift detection"
          badge={<Badge variant="success" icon="✓">Healthy</Badge>}
          icon={{ element: '🤖', bg: THEME.purple.bg }}
          defaultOpen={true}
        >
          <Alert type="success" title="Model Status: Excellent">
            {metrics ? (
              <div className="flex flex-col gap-3 mt-1">
                <p style={{ color: THEME.success.light }}>
                  Model improving steadily | Fleet performance improving month-over-month.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" size="md">MAE: <span className="text-white ml-1">{metrics.MAE}</span></Badge>
                  <Badge variant="default" size="md">RMSE: <span className="text-white ml-1">{metrics.RMSE}</span></Badge>
                  <Badge variant="purple" size="md">Accuracy: <span className="text-white ml-1">{metrics.Accuracy}%</span></Badge>
                  <Badge variant="danger" size="md">3 SKUs flagged for retraining</Badge>
                  <Badge variant="info" size="md">14 cold-start SKUs graduating at week 3</Badge>
                </div>
              </div>
            ) : (
              'Loading model health data...'
            )}
          </Alert>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div style={{ background: THEME.bg.tertiary }} className="rounded-xl p-6 text-center border border-white/10 transition-all duration-300 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:-translate-y-1 cursor-default">
              <div className="mb-2 text-4xl font-black" style={{ color: THEME.info.light }}>{metrics?.MAE ?? '—'}</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: THEME.text.muted }}>MAE</div>
            </div>
            <div style={{ background: THEME.bg.tertiary }} className="rounded-xl p-6 text-center border border-white/10 transition-all duration-300 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:-translate-y-1 cursor-default">
              <div className="mb-2 text-4xl font-black" style={{ color: THEME.warning.light }}>{metrics?.RMSE ?? '—'}</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: THEME.text.muted }}>RMSE</div>
            </div>
            <div style={{ background: THEME.bg.tertiary }} className="rounded-xl p-6 text-center border border-white/10 transition-all duration-300 hover:border-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:-translate-y-1 cursor-default">
              <div className="mb-2 text-4xl font-black" style={{ color: THEME.purple.light }}>{metrics?.Accuracy != null ? `${metrics.Accuracy}%` : '—'}</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: THEME.text.muted }}>Forecast Accuracy</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Accuracy Trend" subtitle="6-month MAE & Accuracy evolution">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={metrics?.accuracy_trend?.length > 0 ? metrics.accuracy_trend : mockAccuracyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.success.base} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={THEME.success.base} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.border.subtle} vertical={false} />
                  <XAxis dataKey="period" stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={['dataMin - 0.5', 'dataMax + 0.5']} stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={['dataMin - 2', 'dataMax + 2']} stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 20 }} iconType="circle" formatter={(value) => <span style={{ color: THEME.text.secondary }}>{value}</span>} />
                  <Area yAxisId="right" type="monotone" dataKey="accuracy" fill="url(#accuracyGradient)" stroke={THEME.success.base} strokeWidth={3} name="Accuracy %" />
                  <Line yAxisId="left" type="monotone" dataKey="mae" stroke={THEME.warning.base} strokeWidth={2} dot={{ fill: THEME.warning.base, r: 4 }} name="MAE" />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Accuracy by Category" subtitle="Performance breakdown by product group">
              <div className="space-y-4">
                {(metrics?.accuracy_by_category?.length > 0 ? metrics.accuracy_by_category : [
                  { label: "Electronics", value: 94 },
                  { label: "Accessories", value: 91 },
                  { label: "Lighting", value: 89 },
                  { label: "Cables", value: 81 },
                  { label: "Cold Start Items", value: 62 }
                ]).map((item, idx) => {
                  let color = THEME.success.base;
                  if (item.value < 70) color = THEME.danger.base;
                  else if (item.value < 85) color = THEME.warning.base;
                  else if (idx % 2 !== 0 && item.value >= 85) color = THEME.info.base;
                  return <ProgressBar key={idx} label={item.label} value={item.value} color={color} />;
                })}
              </div>
            </Card>
          </div>
        </Module>

        <Module
          title="Financial & Sales Analytics"
          subtitle="Revenue · Inventory value · Top performers · Forecasts"
          badge={<Badge variant="info" icon="📈">+12% MoM</Badge>}
          icon={{ element: '💎', bg: THEME.success.bg }}
        >
          <Card title="Revenue & Inventory Trends" subtitle="12-month historical view" className="mb-6">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={historical?.revenue_chart?.length > 0 ? historical.revenue_chart : mockRevenueData} margin={{ top: 10, right: 60, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME.success.base} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={THEME.success.base} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="inventoryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME.info.base} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={THEME.info.base} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border.subtle} vertical={false} />
                <XAxis dataKey={historical?.revenue_chart?.length > 0 ? 'name' : 'month'} stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} tickMargin={10} padding={{ left: 30, right: 30 }} />
                <YAxis yAxisId="left" stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} tickMargin={10} width={80} tickFormatter={(v) => `Rs. ${(v / 1000000).toFixed(1)}M`} />
                <YAxis yAxisId="right" orientation="right" stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} tickMargin={10} width={80} tickFormatter={(v) => `Rs. ${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 20 }} iconType="circle" formatter={(value) => <span style={{ color: THEME.text.secondary }}>{value}</span>} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" fill="url(#revenueGradient)" stroke={THEME.success.base} strokeWidth={3} name="Revenue" />
                <Area yAxisId="right" type="monotone" dataKey="value" fill="url(#inventoryGradient)" stroke={THEME.info.base} strokeWidth={2} strokeDasharray="5 5" name="Inventory Value" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="🔥 Top 5 Fast Movers" subtitle="Best performing products">
              <Table
                columns={['SKU', 'Product', 'Sold', 'Revenue']}
                data={(businessData?.fast_movers ?? [
                  { sku: '0041', name: 'Wireless Headphones', qty_sold: 412, revenue: 824000 },
                  { sku: '0017', name: 'Phone Stand', qty_sold: 388, revenue: 310000 },
                  { sku: '0098', name: 'LED Strip 5m', qty_sold: 302, revenue: 272000 },
                  { sku: '0108', name: 'USB-C Hub', qty_sold: 241, revenue: 482000 },
                  { sku: '0055', name: 'Webcam HD', qty_sold: 198, revenue: 396000 },
                ]).map((m, idx) => [
                  <Badge key={`sku-${idx}`} variant="default" size="sm">{m.sku}</Badge>,
                  <span key={`name-${idx}`} className="font-semibold">{m.name}</span>,
                  <Badge key={`sold-${idx}`} variant="success">{formatNumber(m.qty_sold)}</Badge>,
                  <span key={`rev-${idx}`} className="font-bold" style={{ color: THEME.success.light }}>{formatCurrency(m.revenue)}</span>,
                ])}
              />
            </Card>

            <Card title="❄️ Dead / Slow Stock" subtitle="Capital tied up in slow-moving inventory">
              <Table
                columns={['SKU', 'Product', 'Sales', 'Value Locked']}
                data={(businessData?.dead_stock ?? [
                  { sku: '0302', name: 'Desk Organizer v1', stock: 0, tied_up_value: 48000 },
                  { sku: '0219', name: 'VGA Adapter', stock: 2, tied_up_value: 31000 },
                  { sku: '0187', name: 'Wired Numpad', stock: 6, tied_up_value: 22000 },
                  { sku: '0411', name: 'CD-ROM Cleaner', stock: 0, tied_up_value: 18000 },
                ]).map((m, idx) => [
                  <Badge key={`dead-sku-${idx}`} variant="default" size="sm">{m.sku}</Badge>,
                  <span key={`dead-name-${idx}`} className="font-semibold">{m.name}</span>,
                  <Badge key={`dead-stock-${idx}`} variant={m.stock === 0 ? 'danger' : 'warning'}>{m.stock} sold</Badge>,
                  <span key={`dead-value-${idx}`} className="font-bold" style={{ color: THEME.danger.light }}>{formatCurrency(m.tied_up_value)}</span>,
                ])}
              />
            </Card>
          </div>
        </Module>

        <Module
          title="Inventory Health"
          subtitle="Stock levels · Turnover · AI depletion forecasts"
          badge={<Badge variant="danger" icon="⚠">38 Low Stock</Badge>}
          icon={{ element: '📊', bg: THEME.warning.bg }}
        >
          <div className="mb-6">
            {businessData?.alerts?.length > 0 ? businessData.alerts.map((alert, i) => {
              const formattedContent = alert.content
                .replace(' — ', ' | ')
                .replace('. Order immediately.', ' | Order immediately');
              return (
                <Alert key={`alert-${i}`} type={alert.type} title={alert.title}>
                  <span dangerouslySetInnerHTML={{ __html: formattedContent }} />
                </Alert>
              );
            }) : (
              <Alert type="success" title="System Healthy">
                All forecast pipelines running normally. Waiting for stock alerts.
              </Alert>
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Stock Health Distribution" subtitle="By SKU count">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="10" stdDeviation="6" floodColor="#000" floodOpacity="0.6" />
                    </filter>
                    <linearGradient id="pie-healthy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.success.light} stopOpacity={1} />
                      <stop offset="100%" stopColor={THEME.success.base} stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="pie-low" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.danger.light} stopOpacity={1} />
                      <stop offset="100%" stopColor={THEME.danger.base} stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="pie-over" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.warning.light} stopOpacity={1} />
                      <stop offset="100%" stopColor={THEME.warning.base} stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="pie-cold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.info.light} stopOpacity={1} />
                      <stop offset="100%" stopColor={THEME.info.base} stopOpacity={1} />
                    </linearGradient>
                  </defs>

                  {/* 3D Depth Layer */}
                  <Pie
                    data={businessData?.stock_health_distribution ? [
                      { id: 'healthy', name: 'Healthy Stock', value: businessData.stock_health_distribution.healthy, color: THEME.success.base },
                      { id: 'low', name: 'Low Stock', value: businessData.stock_health_distribution.low, color: THEME.danger.base },
                      { id: 'over', name: 'Overstock', value: businessData.stock_health_distribution.overstock, color: THEME.warning.base },
                      { id: 'cold', name: 'Cold Start', value: businessData.stock_health_distribution.cold, color: THEME.info.base },
                    ].filter(d => d.value > 0) : mockStockHealth}
                    cx="50%" cy="54%" innerRadius={70} outerRadius={100}
                    dataKey="value" paddingAngle={3} labelLine={false}
                    stroke="none" isAnimationActive={false}
                    legendType="none"
                    activeIndex={activePieIndex}
                    activeShape={{ outerRadius: 108 }}
                  >
                    {(businessData?.stock_health_distribution ? [
                      { id: 'healthy', name: 'Healthy Stock', value: businessData.stock_health_distribution.healthy },
                      { id: 'low', name: 'Low Stock', value: businessData.stock_health_distribution.low },
                      { id: 'over', name: 'Overstock', value: businessData.stock_health_distribution.overstock },
                      { id: 'cold', name: 'Cold Start', value: businessData.stock_health_distribution.cold },
                    ].filter(d => d.value > 0) : mockStockHealth).map((entry, idx) => (
                      <Cell key={`bg-cell-${entry.id || idx}`} fill={THEME[entry.id === 'over' ? 'warning' : entry.id === 'healthy' ? 'success' : entry.id === 'cold' ? 'info' : 'danger'].dark} />
                    ))}
                  </Pie>

                  {/* Foreground Top Layer */}
                  <Pie
                    data={businessData?.stock_health_distribution ? [
                      { id: 'healthy', name: 'Healthy Stock', value: businessData.stock_health_distribution.healthy, color: THEME.success.base },
                      { id: 'low', name: 'Low Stock', value: businessData.stock_health_distribution.low, color: THEME.danger.base },
                      { id: 'over', name: 'Overstock', value: businessData.stock_health_distribution.overstock, color: THEME.warning.base },
                      { id: 'cold', name: 'Cold Start', value: businessData.stock_health_distribution.cold, color: THEME.info.base },
                    ].filter(d => d.value > 0) : mockStockHealth}
                    cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                    dataKey="value" paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                    stroke="rgba(255,255,255,0.15)" strokeWidth={1}
                    filter="url(#pieShadow)"
                    activeIndex={activePieIndex}
                    activeShape={{ outerRadius: 108 }}
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(-1)}
                  >
                    {(businessData?.stock_health_distribution ? [
                      { id: 'healthy', name: 'Healthy Stock', value: businessData.stock_health_distribution.healthy },
                      { id: 'low', name: 'Low Stock', value: businessData.stock_health_distribution.low },
                      { id: 'over', name: 'Overstock', value: businessData.stock_health_distribution.overstock },
                      { id: 'cold', name: 'Cold Start', value: businessData.stock_health_distribution.cold },
                    ].filter(d => d.value > 0) : mockStockHealth).map((entry, idx) => (
                      <Cell key={`cell-${entry.id || idx}`} fill={`url(#pie-${entry.id})`} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '30px' }} formatter={(value) => <span style={{ color: THEME.text.secondary }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="AI Depletion Forecast" subtitle="Days until stockout — Top risk SKUs">
              <Table
                columns={['SKU', 'Stock', 'Days Left', 'Action']}
                data={(businessData?.depletion_forecast?.length > 0 ? businessData.depletion_forecast.map(d => [d.sku, d.stock, `${d.days_left}d`, d.action]) : [
                  ['0041', 3, '2d', 'danger'],
                  ['0108', 8, '2d', 'danger'],
                  ['0055', 22, '5d', 'warning'],
                  ['0017', 41, '8d', 'warning'],
                  ['0098', 88, '14d', 'success'],
                ]).map(([sku, stock, days, severity], idx) => [
                  <Badge key={`depl-sku-${idx}`} variant="default" size="sm">{sku}</Badge>,
                  <span key={`depl-stock-${idx}`}>{stock}</span>,
                  <span key={`depl-days-${idx}`} className="font-bold" style={{ color: severity === 'danger' ? THEME.danger.base : severity === 'warning' ? THEME.warning.base : THEME.success.base }}>{days}</span>,
                  <Badge key={`depl-action-${idx}`} variant={severity}>{severity === 'danger' ? '🚨 Order Now' : severity === 'warning' ? '⚠️ Watch' : '✓ OK'}</Badge>,
                ])}
              />
            </Card>
          </div>

          {historical?.revenue_chart && (
            <Card title="Inventory Value Over Time" subtitle={`${granularity} breakdown`}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={historical.revenue_chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.info.base} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={THEME.info.base} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.border.subtle} vertical={false} />
                  <XAxis dataKey="name" stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} />
                  <YAxis stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} tickFormatter={(v) => `Rs. ${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </Module>

        <Module
          title="Generated Report History"
          subtitle="History of generated reports · Audit trail"
          badge={<Badge variant="default">{reports.length} Reports</Badge>}
          icon={{ element: '📸', bg: 'rgba(113, 113, 122, 0.2)' }}
        >
          <Card>
            {reports.length > 0 ? (
              <Table
                columns={['Captured At', 'Total SKUs', 'Low Stock', 'Cold Start', 'Status', 'Actions']}
                data={reports.map((r, i) => [
                  <span key={`snap-date-${i}`} style={{ color: i === 0 ? THEME.success.light : THEME.text.muted }}>{new Date(r.created_at).toLocaleString()}</span>,
                  <span key={`snap-skus-${i}`}>{r.total_skus}</span>,
                  <Badge key={`snap-low-${i}`} variant={r.low_stock_count > 40 ? 'danger' : r.low_stock_count > 25 ? 'warning' : 'success'}>{r.low_stock_count}</Badge>,
                  <span key={`snap-cold-${i}`}>{r.cold_start_count}</span>,
                  <Badge key={`snap-status-${i}`} variant={i === 0 ? 'success' : 'default'}>{i === 0 ? '✓ Active' : 'Archived'}</Badge>,
                  <button
                    key={`snap-delete-${i}`}
                    onClick={() => handleDeleteReport(r.id)}
                    className="text-red-500 hover:text-red-400 transition-colors"
                    title="Delete Report"
                  >
                    ✕
                  </button>,
                ])}
              />
            ) : (
              <div className="py-16 text-center">
                <div className="mb-4 text-6xl opacity-30">📸</div>
                <p className="text-lg" style={{ color: THEME.text.muted }}>No reports generated yet.</p>
                <p className="mt-2 text-sm" style={{ color: THEME.text.dim }}>Click "Capture Snapshot" to generate your first report.</p>
              </div>
            )}
          </Card>
        </Module>
      </div>

      {savedCharts.length > 0 && (
        <div className="mt-8">
          <Module
            title="My Custom Dashboard"
            subtitle="Your saved bespoke reports"
            icon={{ element: '📊', bg: 'rgba(139, 92, 246, 0.2)' }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={savedCharts.map(c => c.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {savedCharts.map(chart => (
                    <ErrorBoundary key={`err-${chart.id}`}>
                      <SortableChartCard chart={chart} onDelete={handleDeleteCustomChart} />
                    </ErrorBoundary>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </Module>
        </div>
      )}

      <Modal maxWidth="max-w-5xl" show={!!kpiModal} onClose={() => setKpiModal(null)} title={`${kpiModal?.title || ''} (Historical)`} subtitle={`Trend analysis based on ${granularity} aggregation`}>
        {kpiModal?.data && kpiModal.data.length > 0 ? (
          <div className="mt-4" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpiModal.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="modalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={kpiModal.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={kpiModal.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border.subtle} vertical={false} />
                <XAxis dataKey={kpiModal.xAxisKey || 'name'} stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} />
                <YAxis domain={kpiModal.dataKey === 'accuracy' ? ['dataMin - 2', 'dataMax + 2'] : [0, 'auto']} stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 11 }} tickFormatter={kpiModal.format} />
                <Tooltip
                  contentStyle={{ background: THEME.bg.card, border: `1px solid ${THEME.border.default}`, borderRadius: '12px' }}
                  itemStyle={{ color: THEME.text.primary, fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey={kpiModal.dataKey} fill="url(#modalGradient)" stroke={kpiModal.color} strokeWidth={3} name={kpiModal.title} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-8 flex items-center justify-center text-sm" style={{ color: THEME.text.muted }}>
            No historical data available for this timeframe.
          </div>
        )}
      </Modal>

      <Modal show={showPdfModal} onClose={() => setShowPdfModal(false)} title="Customize PDF Export" subtitle="Select which sections to include in your report">
        <div className="space-y-2">
          {Object.entries({ ai: '🤖 AI Engine Health & Accuracy', financial: '💰 Financial & Sales Analytics', inventory: '📦 Inventory Health & Charts', customCharts: '🛠 Custom Dashboard Charts', snapshots: '📸 Generated Report History Table' }).map(([key, label]) => (
            <CheckOption key={`pdf-${key}`} label={label} checked={pdfSections[key]} onChange={(e) => setPdfSections((p) => ({ ...p, [key]: e.target.checked }))} />
          ))}
        </div>
        <button onClick={handlePdfExport} disabled={generating} style={{ background: THEME.brand.gradient }} className="mt-6 w-full rounded-xl py-3 font-bold text-white shadow-xl transition-all hover:scale-105 disabled:opacity-50 cursor-pointer">
          {generating ? '⏳ Generating PDF...' : '📄 Generate PDF Report'}
        </button>
      </Modal>

      <Modal show={showCsvModal} onClose={() => setShowCsvModal(false)} title="CSV Dataset Selector" subtitle="Choose the timeframe for your data export">
        <div className="space-y-2">
          <CheckOption radio name="csvRange" label="📅 Current ongoing month" checked={csvRange === 'current'} onChange={() => setCsvRange('current')} />
          <CheckOption radio name="csvRange" label="📊 Rolling last 6 months" checked={csvRange === '6m'} onChange={() => setCsvRange('6m')} />
          <CheckOption radio name="csvRange" label="🔍 Specific historical period" checked={csvRange === 'specific'} onChange={() => setCsvRange('specific')} />
        </div>
        {csvRange === 'specific' && (
          <select value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} style={{ background: THEME.bg.tertiary, border: `1px solid ${THEME.border.default}`, color: THEME.text.primary }} className="mt-4 w-full rounded-xl px-4 py-3 font-semibold cursor-pointer">
            {monthOptions.map((m) => <option key={`month-${m.val}`} value={m.val}>{m.label}</option>)}
          </select>
        )}
        <button onClick={() => handleCsvExport(csvRange, targetMonth)} disabled={generating} style={{ background: THEME.brand.gradient }} className="mt-6 w-full rounded-xl py-3 font-bold text-white shadow-xl transition-all hover:scale-105 disabled:opacity-50 cursor-pointer">
          {generating ? '⏳ Exporting CSV...' : '📊 Export Dataset'}
        </button>
      </Modal>

      <PDFReportTemplate
        ref={pdfTemplateRef}
        metrics={metrics}
        businessData={businessData}
        historical={historical}
        reports={reports}
        pdfSections={pdfSections}
        aiSummary={aiSummary}
        pdfCustomChartsData={pdfCustomChartsData}
      />

      <CustomReportBuilder
        show={showCustomBuilder}
        onClose={() => setShowCustomBuilder(false)}
        onAddChart={handleAddCustomChart}
      />
    </div>
  );
}
