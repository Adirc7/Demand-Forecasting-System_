import React, { forwardRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// Common Theme matching Reports.jsx
const THEME = {
  bg: {
    primary: '#0B1120',
    secondary: '#131C31',
    tertiary: '#1E293B',
    card: 'rgba(19, 28, 49, 0.95)',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.2)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#e2e8f0',
    muted: '#94a3b8',
    dim: '#64748b',
  },
  brand: {
    primary: '#f97316',
  },
  success: { base: '#10b981', light: '#34d399' },
  danger: { base: '#ef4444', light: '#f87171' },
  warning: { base: '#f59e0b', light: '#fbbf24' },
  info: { base: '#3b82f6', light: '#60a5fa' },
  purple: { base: '#a855f7', light: '#c084fc' },
};

const formatCurrency = (n) => {
  if (n == null) return 'N/A';
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000) return `Rs. ${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `Rs. ${(num / 1_000).toFixed(1)}K`;
  return `Rs. ${num.toLocaleString()}`;
};

const mockAccuracyTrend = [
  { period: "W04 '26", accuracy: 78.5, mae: 1.8 },
  { period: "W06 '26", accuracy: 80.2, mae: 1.6 },
  { period: "W08 '26", accuracy: 81.5, mae: 1.5 },
  { period: "W10 '26", accuracy: 82.1, mae: 1.4 },
  { period: "W12 '26", accuracy: 83.7, mae: 1.5 },
];
const mockStockHealth = [
  { id: 'healthy', name: 'Healthy Stock', value: 15, color: THEME.success.base },
  { id: 'low', name: 'Low Stock', value: 43, color: THEME.danger.base },
  { id: 'over', name: 'Overstock', value: 181, color: THEME.warning.base },
];
const mockRevenueData = [
  { month: "Jan", revenue: 4200000, inventory: 8100000 },
  { month: "Feb", revenue: 4600000, inventory: 8300000 },
  { month: "Mar", revenue: 5100000, inventory: 7900000 },
  { month: "Apr", revenue: 5800000, inventory: 7200000 },
];

const GRADIENTS = [
  { id: 'grad0', start: '#6366f1', end: '#312e81' },
  { id: 'grad1', start: '#ef4444', end: '#7f1d1d' },
  { id: 'grad2', start: '#10b981', end: '#064e3b' },
  { id: 'grad3', start: '#f59e0b', end: '#78350f' },
  { id: 'grad4', start: '#8b5cf6', end: '#4c1d95' },
  { id: 'grad5', start: '#06b6d4', end: '#164e63' }
];

const COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

const formatYAxis = (value) => {
  if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return value;
};

const renderGradients = () => (
  <defs>
    {GRADIENTS.map((g) => (
      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={g.start} stopOpacity={1}/>
        <stop offset="100%" stopColor={g.end} stopOpacity={0.85}/>
      </linearGradient>
    ))}
  </defs>
);

const renderCustomChart = (chartConfig) => {
  const chartData = chartConfig.data;
  if (!chartData || chartConfig.error) return <div className="flex items-center justify-center h-full text-[#a0a0a0]"><span className="text-sm font-semibold">No data found or error.</span></div>;

  const isPieEmpty = chartConfig.chart_type === 'pie' && (!chartData.pie || chartData.pie.length === 0);
  const isScatterEmpty = chartConfig.chart_type === 'scatter' && (!chartData.scatter || chartData.scatter.length === 0);
  const isTimeseriesEmpty = chartConfig.chart_type !== 'pie' && chartConfig.chart_type !== 'scatter' && (!chartData.timeseries || chartData.timeseries.length === 0);

  if (isPieEmpty || isScatterEmpty || isTimeseriesEmpty) {
    return <div className="flex items-center justify-center h-full text-[#a0a0a0]"><span className="text-sm font-semibold">No data found for this period.</span></div>;
  }

  if (chartConfig.chart_type === 'line') {
    return (
      <LineChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(126, 88, 88, 0.14)" vertical={false} />
        <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatYAxis} width={45} />
        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} iconType="circle" />
        {(chartConfig.metrics || []).map((m, i) => (
          <Line key={m} type="monotone" isAnimationActive={false} dataKey={`val${(i % 3) + 1}`} name={m} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    );
  } else if (chartConfig.chart_type === 'bar') {
    return (
      <BarChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        {renderGradients()}
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
        <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatYAxis} width={45} />
        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} iconType="circle" />
        {(chartConfig.metrics || []).map((m, i) => (
          <Bar key={m} dataKey={`val${(i % 3) + 1}`} name={m} fill={`url(#grad${i % GRADIENTS.length})`} isAnimationActive={false} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    );
  } else if (chartConfig.chart_type === 'area') {
    return (
      <AreaChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        {renderGradients()}
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
        <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatYAxis} width={45} />
        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} iconType="circle" />
        {(chartConfig.metrics || []).map((m, i) => (
          <Area key={m} type="monotone" isAnimationActive={false} dataKey={`val${(i % 3) + 1}`} name={m} fill={`url(#grad${i % GRADIENTS.length})`} fillOpacity={0.6} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
        ))}
      </AreaChart>
    );
  } else if (chartConfig.chart_type === 'pie') {
    return (
      <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        {renderGradients()}
        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} iconType="circle" />
        <Pie data={chartData.pie || []} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" nameKey="name" stroke="rgba(0,0,0,0.2)" strokeWidth={2} isAnimationActive={false}>
          {(chartData.pie || []).map((entry, index) => (
            <Cell key={`cell-${index}`} fill={`url(#grad${index % GRADIENTS.length})`} />
          ))}
        </Pie>
      </PieChart>
    );
  } else if (chartConfig.chart_type === 'combo') {
    return (
      <ComposedChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        {renderGradients()}
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
        <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatYAxis} width={45} />
        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} iconType="circle" />
        {(chartConfig.metrics || []).map((m, i) => {
          if (m.includes('(line)')) {
            return <Line key={m} type="monotone" isAnimationActive={false} dataKey={`val${(i % 3) + 1}`} name={m} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          }
          return <Bar key={m} dataKey={`val${(i % 3) + 1}`} name={m} isAnimationActive={false} fill={`url(#grad${i % GRADIENTS.length})`} radius={[4, 4, 0, 0]} />
        })}
      </ComposedChart>
    );
  } else if (chartConfig.chart_type === 'scatter') {
    return (
      <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
        <XAxis type="number" dataKey="x" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis type="number" dataKey="y" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatYAxis} width={45} />
        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} iconType="circle" />
        <Scatter name="Data" data={chartData.scatter || []} isAnimationActive={false} fill={COLORS[0]} />
      </ScatterChart>
    );
  }
  return null;
};

const PageContainer = ({ children, pageNumber }) => (
  <div
    className="pdf-page-container flex flex-col justify-between"
    style={{
      width: '794px',
      height: '1123px',
      backgroundColor: THEME.bg.primary,
      color: THEME.text.primary,
      padding: '40px',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* Header */}
    <div className="flex justify-between items-center mb-6 pb-4" style={{ borderBottom: `2px solid ${THEME.border.subtle}` }}>
      <div className="flex items-center gap-2">
        <span className="font-bold text-xl" style={{ color: THEME.brand.primary }}>DROPEX.AI</span>
        <span className="text-sm" style={{ color: THEME.text.muted }}>Analytics & Intelligence Platform</span>
      </div>
      <div className="text-sm" style={{ color: THEME.text.muted }}>Page {pageNumber}</div>
    </div>

    {/* Content */}
    <div className="flex-1">
      {children}
    </div>

    {/* Footer */}
    <div className="flex justify-between items-center mt-6 pt-4 text-[10px]" style={{ color: THEME.text.muted, borderTop: `1px solid ${THEME.border.subtle}` }}>
      <div>Generated: {new Date().toLocaleString()}</div>
      <div>CONFIDENTIAL - Internal Use Only</div>
      <div>DROPEX.AI Analytics Report</div>
    </div>
  </div>
);

const SectionTitle = ({ number, title, subtitle }) => (
  <div className="mb-6">
    <div className="flex items-baseline gap-3 mb-1">
      <span className="text-3xl font-bold" style={{ color: THEME.text.muted }}>{number}</span>
      <h2 className="text-3xl font-bold" style={{ color: THEME.brand.primary }}>{title}</h2>
    </div>
    {subtitle && <p className="text-sm" style={{ color: THEME.text.secondary }}>{subtitle}</p>}
  </div>
);

const KPIBlock = ({ title, value, subtext, subtextColor, topBorderColor }) => (
  <div className="flex-1 p-4 rounded-xl" style={{ backgroundColor: THEME.bg.secondary, border: `1px solid ${THEME.border.default}`, borderTop: `3px solid ${topBorderColor}` }}>
    <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: THEME.text.muted }}>{title}</div>
    <div className="text-2xl font-black mb-2">{value}</div>
    <div className="text-xs font-semibold" style={{ color: subtextColor }}>{subtext}</div>
  </div>
);

const StyledTable = ({ headers, rows }) => (
  <div className="w-full rounded-xl overflow-hidden" style={{ border: `1px solid ${THEME.border.default}` }}>
    <table className="w-full text-left border-collapse">
      <thead>
        <tr style={{ backgroundColor: THEME.bg.secondary }}>
          {headers.map((h, i) => (
            <th key={i} className="p-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: THEME.text.muted, borderBottom: `1px solid ${THEME.border.default}` }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${THEME.border.subtle}` }}>
            {row.map((cell, j) => (
              <td key={j} className="p-3 text-xs" style={{ color: THEME.text.secondary }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ProgressBar = ({ label, value, max = 100, color }) => {
  const percentage = (value / max) * 100;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span style={{ color: THEME.text.secondary }}>{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div style={{ background: THEME.border.subtle }} className="h-2 overflow-hidden rounded-full">
        <div style={{ width: `${percentage}%`, background: color }} className="h-full rounded-full" />
      </div>
    </div>
  );
};

const PDFReportTemplate = forwardRef(({ metrics, businessData, historical, reports, pdfSections, aiSummary, pdfCustomChartsData }, ref) => {
  // Pre-process data
  const revenueTrend = historical?.revenue_chart?.length > 0 ? historical.revenue_chart : mockRevenueData;
  const fastMovers = businessData?.fast_movers || [];
  const deadStock = businessData?.dead_stock || [];
  const depletion = businessData?.depletion_forecast || [];
  const criticalActions = depletion.filter(d => d.action === 'danger');
  
  const accuracyTrendData = metrics?.accuracy_trend?.length > 0 ? metrics.accuracy_trend : mockAccuracyTrend;
  const categoryAccuracyData = metrics?.accuracy_by_category?.length > 0 ? metrics.accuracy_by_category : [
    { label: "Electronics", value: 94 }, { label: "Accessories", value: 91 }, { label: "Lighting", value: 89 }, { label: "Cables", value: 81 }, { label: "Cold Start", value: 62 }
  ];

  let stockHealthData = mockStockHealth;
  if (businessData?.stock_health_distribution) {
    stockHealthData = [
      { id: 'healthy', name: 'Healthy Stock', value: businessData.stock_health_distribution.healthy, color: THEME.success.base },
      { id: 'low', name: 'Low Stock', value: businessData.stock_health_distribution.low, color: THEME.danger.base },
      { id: 'over', name: 'Overstock', value: businessData.stock_health_distribution.overstock, color: THEME.warning.base },
      { id: 'cold', name: 'Cold Start', value: businessData.stock_health_distribution.cold, color: THEME.info.base },
    ].filter(d => d.value > 0);
  }

  // Page numbering logic
  let currentPage = 1;
  const pageMap = {};
  
  if (pdfSections.ai) pageMap.ai = ++currentPage;
  if (pdfSections.financial) pageMap.financial = ++currentPage;
  if (pdfSections.inventory) pageMap.inventory = ++currentPage;
  if (pdfSections.customCharts && pdfCustomChartsData?.length > 0) pageMap.customCharts = ++currentPage;
  if (pdfSections.snapshots) pageMap.snapshots = ++currentPage;

  return (
    <div ref={ref} className="pdf-export-container" style={{ position: 'absolute', left: '-9999px', top: '-9999px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* PAGE 1: COVER & TOC */}
      <PageContainer pageNumber={1}>
        <div className="mt-8 mb-12">
          <div className="text-sm font-bold tracking-widest uppercase mb-4" style={{ color: THEME.brand.primary }}>Analytics Report</div>
          <h1 className="text-5xl font-black leading-tight mb-6">Inventory Intelligence<br/>& Forecast Analytics</h1>
          <p className="text-lg w-3/4" style={{ color: THEME.text.secondary }}>Comprehensive overview of AI forecast performance, financial metrics, inventory health, and operational intelligence for the current period.</p>
        </div>

        <div className="grid grid-cols-4 gap-0 rounded-xl overflow-hidden mb-12" style={{ border: `1px solid ${THEME.border.default}` }}>
          <div className="p-4" style={{ borderRight: `1px solid ${THEME.border.default}`, backgroundColor: THEME.bg.secondary }}>
            <div className="text-[10px] uppercase mb-1" style={{ color: THEME.text.muted }}>Report Period</div>
            <div className="text-sm font-bold">Current Range</div>
          </div>
          <div className="p-4" style={{ borderRight: `1px solid ${THEME.border.default}`, backgroundColor: THEME.bg.secondary }}>
            <div className="text-[10px] uppercase mb-1" style={{ color: THEME.text.muted }}>Generated</div>
            <div className="text-sm font-bold">{new Date().toLocaleDateString()}</div>
          </div>
          <div className="p-4" style={{ borderRight: `1px solid ${THEME.border.default}`, backgroundColor: THEME.bg.secondary }}>
            <div className="text-[10px] uppercase mb-1" style={{ color: THEME.text.muted }}>Status</div>
            <div className="text-sm font-bold" style={{ color: THEME.success.base }}>● Live</div>
          </div>
          <div className="p-4" style={{ backgroundColor: THEME.bg.secondary }}>
            <div className="text-[10px] uppercase mb-1" style={{ color: THEME.text.muted }}>Version</div>
            <div className="text-sm font-bold">v2.1.0</div>
          </div>
        </div>

        <div className="flex gap-4 mb-12">
          <KPIBlock title="Total Revenue" value={formatCurrency(businessData?.total_revenue)} subtext="↑ +12% MoM" subtextColor={THEME.success.base} topBorderColor={THEME.success.base} />
          <KPIBlock title="Inventory Value" value={formatCurrency(businessData?.total_inventory_value)} subtext="↑ +4.2%" subtextColor={THEME.info.base} topBorderColor={THEME.info.base} />
          <KPIBlock title="AI Accuracy" value={`${metrics?.Accuracy ?? 0}%`} subtext="↑ +1.2pp" subtextColor={THEME.purple.base} topBorderColor={THEME.purple.base} />
          <KPIBlock title="Low Stock SKUs" value={businessData?.stock_health_distribution?.low || 0} subtext="↓ Needs action" subtextColor={THEME.danger.base} topBorderColor={THEME.danger.base} />
        </div>

        <h3 className="text-lg font-bold mb-4" style={{ color: THEME.text.secondary }}>Table of Contents</h3>
        <StyledTable 
          headers={['No', 'Section', 'Page']}
          rows={[
            ['01', <span className="font-bold" style={{ color: '#fff' }}>Executive Summary</span>, 'p. 2'],
            ...(pdfSections.ai ? [['02', <span className="font-bold" style={{ color: '#fff' }}>AI Forecast Engine Health</span>, `p. ${pageMap.ai}`]] : []),
            ...(pdfSections.financial ? [['03', <span className="font-bold" style={{ color: '#fff' }}>Financial & Sales Analytics</span>, `p. ${pageMap.financial}`]] : []),
            ...(pdfSections.inventory ? [['04', <span className="font-bold" style={{ color: '#fff' }}>Inventory Health & Alerts</span>, `p. ${pageMap.inventory}`]] : []),
            ...(pdfSections.customCharts && pdfCustomChartsData?.length > 0 ? [['05', <span className="font-bold" style={{ color: '#fff' }}>Custom Dashboard</span>, `p. ${pageMap.customCharts}`]] : []),
            ...(pdfSections.snapshots ? [[pdfSections.customCharts && pdfCustomChartsData?.length > 0 ? '06' : '05', <span className="font-bold" style={{ color: '#fff' }}>Generated Report History</span>, `p. ${pageMap.snapshots}`]] : []),
          ]}
        />
      </PageContainer>

      {/* PAGE 2: EXECUTIVE SUMMARY */}
      <PageContainer pageNumber={2}>
        <SectionTitle number="01" title="Executive Summary" subtitle="High-level business intelligence overview for the current reporting period." />
        
        <div className="space-y-4 mb-10">
          <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: THEME.bg.secondary, border: `1px solid ${THEME.border.default}` }}>
            <div className="w-32 flex items-center justify-center p-4 text-[10px] font-bold uppercase tracking-widest text-center" style={{ borderRight: `2px solid ${THEME.purple.base}` }}>AI Engine</div>
            <div className="p-4 text-sm leading-relaxed flex-1">
              Forecast accuracy reached <strong style={{ color: '#fff' }}>{metrics?.Accuracy ?? 'N/A'}%</strong> with MAE of <strong style={{ color: '#fff' }}>{metrics?.MAE ?? 'N/A'}</strong> — both improving steadily. Model retraining is on schedule.
            </div>
          </div>
          <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: THEME.bg.secondary, border: `1px solid ${THEME.border.default}` }}>
            <div className="w-32 flex items-center justify-center p-4 text-[10px] font-bold uppercase tracking-widest text-center" style={{ borderRight: `2px solid ${THEME.success.base}` }}>Financials</div>
            <div className="p-4 text-sm leading-relaxed flex-1">
              Total revenue hit <strong style={{ color: '#fff' }}>{formatCurrency(businessData?.total_revenue)}</strong>. Total inventory value is <strong style={{ color: '#fff' }}>{formatCurrency(businessData?.total_inventory_value)}</strong>. Estimated restock cost stands at <strong style={{ color: '#fff' }}>{formatCurrency(businessData?.est_restock_cost)}</strong>.
            </div>
          </div>
          <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: THEME.bg.secondary, border: `1px solid ${THEME.border.default}` }}>
            <div className="w-32 flex items-center justify-center p-4 text-[10px] font-bold uppercase tracking-widest text-center" style={{ borderRight: `2px solid ${THEME.danger.base}` }}>Inventory</div>
            <div className="p-4 text-sm leading-relaxed flex-1">
              <strong style={{ color: '#fff' }}>{businessData?.stock_health_distribution?.low || 0}</strong> SKUs are in low stock territory. Immediate review recommended to prevent stockouts. Dead stock accounts for tied-up capital.
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-4">Priority Actions</h3>
        <StyledTable 
          headers={['#', 'Action Required', 'Priority', 'SKU', 'Deadline']}
          rows={criticalActions.length > 0 ? criticalActions.map((item, idx) => [
            (idx + 1).toString(),
            `Reorder ${item.sku} immediately — ${item.stock} units left`,
            <span className="font-bold" style={{ color: THEME.danger.light }}>CRITICAL</span>,
            item.sku,
            <span className="font-bold" style={{ color: '#fff' }}>TODAY</span>
          ]) : [
            ['1', 'Review overall inventory strategy', <span className="font-bold" style={{ color: THEME.info.light }}>LOW</span>, 'MULTI', 'N/A']
          ]}
        />
      </PageContainer>

      {/* PAGE 3: AI ENGINE */}
      {pdfSections.ai && (
        <PageContainer pageNumber={pageMap.ai}>
          <SectionTitle number="02" title="AI Forecast Engine" subtitle="Model health, accuracy metrics, trend analysis and category breakdown." />
          
          <div className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden mb-8 text-center" style={{ border: `1px solid ${THEME.border.default}` }}>
            <div className="p-4" style={{ borderRight: `1px solid ${THEME.border.default}`, backgroundColor: THEME.bg.secondary }}>
              <div className="text-3xl font-black mb-1" style={{ color: THEME.info.light }}>{metrics?.MAE ?? 'N/A'}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: THEME.text.secondary }}>Mean Absolute Error</div>
            </div>
            <div className="p-4" style={{ borderRight: `1px solid ${THEME.border.default}`, backgroundColor: THEME.bg.secondary }}>
              <div className="text-3xl font-black mb-1" style={{ color: THEME.warning.light }}>{metrics?.RMSE ?? 'N/A'}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: THEME.text.secondary }}>Root Mean Sq. Error</div>
            </div>
            <div className="p-4" style={{ backgroundColor: THEME.bg.secondary }}>
              <div className="text-3xl font-black mb-1" style={{ color: THEME.purple.light }}>{metrics?.Accuracy ?? 'N/A'}%</div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: THEME.text.secondary }}>Forecast Accuracy</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-4 rounded-xl" style={{ backgroundColor: THEME.bg.card, border: `1px solid ${THEME.border.default}` }}>
              <h3 className="text-sm font-bold mb-4">Accuracy Trend</h3>
              <ComposedChart width={310} height={200} data={accuracyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="accuracyGradientPdf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME.success.base} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={THEME.success.base} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border.subtle} vertical={false} />
                <XAxis dataKey="period" stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 10 }} />
                <YAxis yAxisId="left" domain={['dataMin - 0.5', 'dataMax + 0.5']} stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 10 }} width={30} />
                <YAxis yAxisId="right" orientation="right" domain={['dataMin - 2', 'dataMax + 2']} stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 10 }} tickFormatter={(v) => `${v}%`} width={35} />
                <Legend iconType="circle" formatter={(value) => <span style={{ color: THEME.text.secondary, fontSize: 10 }}>{value}</span>} />
                <Area isAnimationActive={false} yAxisId="right" type="monotone" dataKey="accuracy" fill="url(#accuracyGradientPdf)" stroke={THEME.success.base} strokeWidth={2} name="Accuracy %" />
                <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="mae" stroke={THEME.warning.base} strokeWidth={2} dot={{ fill: THEME.warning.base, r: 3 }} name="MAE" />
              </ComposedChart>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: THEME.bg.card, border: `1px solid ${THEME.border.default}` }}>
              <h3 className="text-sm font-bold mb-4">Accuracy by Category</h3>
              <div className="space-y-2">
                {categoryAccuracyData.slice(0, 5).map((item, idx) => {
                  let color = THEME.success.base;
                  if (item.value < 70) color = THEME.danger.base;
                  else if (item.value < 85) color = THEME.warning.base;
                  else if (idx % 2 !== 0 && item.value >= 85) color = THEME.info.base;
                  return <ProgressBar key={idx} label={item.label} value={item.value} color={color} />;
                })}
              </div>
            </div>
          </div>
        </PageContainer>
      )}

      {/* PAGE 4: FINANCIALS */}
      {pdfSections.financial && (
        <PageContainer pageNumber={pageMap.financial}>
          <SectionTitle number="03" title="Financial & Sales Analytics" subtitle="Revenue performance, inventory valuation, top performers and dead stock analysis." />
          
          <div className="flex gap-4 mb-6">
            <KPIBlock title="Total Revenue" value={formatCurrency(businessData?.total_revenue)} subtext="↑ +12% MoM" subtextColor={THEME.success.base} topBorderColor={THEME.success.base} />
            <KPIBlock title="Inventory Value" value={formatCurrency(businessData?.total_inventory_value)} subtext="↑ +4.2%" subtextColor={THEME.info.base} topBorderColor={THEME.info.base} />
            <KPIBlock title="Est. Restock Cost" value={formatCurrency(businessData?.est_restock_cost)} subtext="→ 7-day fcst" subtextColor={THEME.warning.base} topBorderColor={THEME.warning.base} />
          </div>

          <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: THEME.bg.card, border: `1px solid ${THEME.border.default}` }}>
            <h3 className="text-sm font-bold mb-4">Revenue & Inventory Trend</h3>
            <ComposedChart width={682} height={200} data={revenueTrend} margin={{ top: 10, right: 60, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={THEME.success.base} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={THEME.success.base} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={THEME.info.base} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={THEME.info.base} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border.subtle} vertical={false} />
              <XAxis dataKey={historical?.revenue_chart?.length > 0 ? 'name' : 'month'} stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 10 }} tickMargin={10} padding={{ left: 30, right: 30 }} />
              <YAxis yAxisId="left" stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 10 }} tickMargin={10} width={80} tickFormatter={(v) => `Rs. ${(v / 1000000).toFixed(1)}M`} />
              <YAxis yAxisId="right" orientation="right" stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 10 }} tickMargin={10} width={80} tickFormatter={(v) => `Rs. ${(v / 1000000).toFixed(1)}M`} />
              <Legend wrapperStyle={{ paddingTop: 10 }} iconType="circle" formatter={(value) => <span style={{ color: THEME.text.secondary, fontSize: 10 }}>{value}</span>} />
              <Area yAxisId="left" isAnimationActive={false} type="monotone" dataKey="revenue" fill="url(#revGrad)" stroke={THEME.success.base} strokeWidth={2} name="Revenue" />
              <Area yAxisId="right" isAnimationActive={false} type="monotone" dataKey="value" fill="url(#invGrad)" stroke={THEME.info.base} strokeWidth={2} strokeDasharray="5 5" name="Inventory Value" />
            </ComposedChart>
          </div>
          
          {historical?.revenue_chart && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: THEME.bg.card, border: `1px solid ${THEME.border.default}` }}>
              <h3 className="text-sm font-bold mb-4">Inventory Value Over Time</h3>
              <BarChart width={682} height={180} data={historical.revenue_chart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME.info.base} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={THEME.info.base} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border.subtle} vertical={false} />
                <XAxis dataKey="name" stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 10 }} />
                <YAxis stroke={THEME.text.dim} tick={{ fill: THEME.text.muted, fontSize: 10 }} tickFormatter={(v) => `Rs. ${(v / 1000000).toFixed(1)}M`} width={60} />
                <Bar isAnimationActive={false} dataKey="revenue" fill="url(#barGrad)" radius={[4, 4, 0, 0]} name="Value" />
              </BarChart>
            </div>
          )}
        </PageContainer>
      )}

      {/* PAGE 5: INVENTORY */}
      {pdfSections.inventory && (
        <PageContainer pageNumber={pageMap.inventory}>
          <SectionTitle number="04" title="Inventory Health & Alerts" subtitle="Stock level analysis, depletion forecasts and critical operational alerts." />
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 rounded-xl" style={{ backgroundColor: THEME.bg.card, border: `1px solid ${THEME.border.default}` }}>
              <h3 className="text-sm font-bold mb-4">Stock Health Distribution</h3>
              <PieChart width={310} height={200}>
                <Pie
                  isAnimationActive={false}
                  data={stockHealthData}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3} labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                >
                  {stockHealthData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" formatter={(value) => <span style={{ color: THEME.text.secondary, fontSize: 10 }}>{value}</span>} />
              </PieChart>
            </div>
            
            <div className="p-4 rounded-xl" style={{ backgroundColor: THEME.bg.card, border: `1px solid ${THEME.border.default}` }}>
              <h3 className="text-sm font-bold mb-4">Top 5 Fast Movers</h3>
              <StyledTable 
                headers={['SKU', 'Product', 'Sold', 'Revenue']}
                rows={fastMovers.slice(0, 5).map(m => [
                  <span style={{ color: THEME.text.muted }}>{m.sku}</span>,
                  <span className="font-bold" style={{ color: '#fff' }}>{m.name}</span>,
                  <span style={{ color: THEME.success.light }}>{m.qty_sold}</span>,
                  <span style={{ color: THEME.success.base }}>{formatCurrency(m.revenue)}</span>
                ])}
              />
            </div>
          </div>

          <h3 className="text-md font-bold mb-4">AI Depletion Forecast — Top Risk SKUs</h3>
          <StyledTable 
            headers={['SKU', 'Product', 'Current Stock', 'Days Left', 'Status', 'Action']}
            rows={depletion.map((d, i) => [
              <span style={{ color: THEME.text.muted }}>{d.sku}</span>,
              <span className="font-bold" style={{ color: '#fff' }}>Product {d.sku}</span>,
              <span className="font-bold">{d.stock}</span>,
              <span className="font-bold" style={{ color: d.action === 'danger' ? THEME.danger.base : THEME.warning.base }}>{d.days_left}d</span>,
              <span className="font-bold" style={{ color: d.action === 'danger' ? THEME.danger.base : THEME.warning.base }}>{d.action === 'danger' ? 'CRITICAL' : 'WARNING'}</span>,
              <span style={{ color: d.action === 'danger' ? THEME.danger.light : THEME.warning.light }}>{d.action === 'danger' ? '■ Order Now' : '■ Watch'}</span>
            ])}
          />
        </PageContainer>
      )}

      {/* PAGE 6: CUSTOM CHARTS */}
      {pdfSections.customCharts && pdfCustomChartsData?.length > 0 && (
        <PageContainer pageNumber={pageMap.customCharts}>
          <SectionTitle number="05" title="Custom Dashboard" subtitle="User-defined bespoke reports and charts." />
          
          <div className="grid grid-cols-2 gap-6 mb-6">
             {pdfCustomChartsData.slice(0, 4).map((chart, idx) => (
                <div key={idx} className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: THEME.bg.card, border: `1px solid ${THEME.border.default}`, height: 260 }}>
                  <h3 className="text-sm font-bold text-white mb-1">{chart.title || 'Custom Chart'}</h3>
                  <p className="text-[10px] text-[#94a3b8] mb-4 uppercase tracking-widest font-semibold">
                    {chart.time_range ? chart.time_range.replace('_', ' ') : 'All Time'} • {chart.granularity || 'Monthly'}
                  </p>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      {renderCustomChart(chart)}
                    </ResponsiveContainer>
                  </div>
                </div>
             ))}
          </div>
        </PageContainer>
      )}

      {/* PAGE 7: SNAPSHOTS */}
      {pdfSections.snapshots && (
        <PageContainer pageNumber={pageMap.snapshots}>
          <SectionTitle number={pdfSections.customCharts && pdfCustomChartsData?.length > 0 ? "06" : "05"} title="Generated Report History" subtitle="Historical system state captures and audit trail." />
          
          <div className="mb-8">
            <StyledTable 
              headers={['Captured At', 'Total SKUs', 'Low Stock', 'Cold Start', 'Status']}
              rows={reports.slice(0, 8).map((r, i) => [
                <span className="font-bold" style={{ color: i === 0 ? THEME.success.base : THEME.text.muted }}>{new Date(r.created_at).toLocaleString()}</span>,
                <span className="font-bold" style={{ color: '#fff' }}>{r.total_skus}</span>,
                <span>{r.low_stock_count}</span>,
                <span>{r.cold_start_count}</span>,
                <span className="font-bold" style={{ color: i === 0 ? THEME.success.base : THEME.text.muted }}>{i === 0 ? 'ACTIVE' : 'ARCHIVED'}</span>
              ])}
            />
          </div>

          <h3 className="text-md font-bold mb-4">Snapshot Summary Statistics</h3>
          <StyledTable 
            headers={['Metric', 'Value', 'Notes']}
            rows={[
              ['Total Snapshots Captured', <span className="font-bold" style={{ color: '#fff' }}>{reports.length}</span>, 'Since system launch'],
              ['Active Snapshots', <span className="font-bold" style={{ color: '#fff' }}>1</span>, 'Current baseline'],
              ['Max SKUs Captured', <span className="font-bold" style={{ color: '#fff' }}>{Math.max(...reports.map(r => r.total_skus), 0)}</span>, 'Highest recorded snapshot'],
            ]}
          />
        </PageContainer>
      )}

    </div>
  );
});

export default PDFReportTemplate;
