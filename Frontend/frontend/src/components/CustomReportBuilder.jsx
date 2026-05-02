import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { fetchCustomReport } from '../services/api';

const CHART_TYPES = [
  {
    id: 'line',
    label: 'Line',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 17 9 11 13 15 21 7" />
      </svg>
    ),
    metrics: ['Revenue', 'AI accuracy', 'MAE (forecast error)', 'Low stock count', 'Inventory value']
  },
  {
    id: 'bar',
    label: 'Bar',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="14" width="4" height="6" rx="1" />
        <rect x="10" y="8" width="4" height="12" rx="1" />
        <rect x="16" y="11" width="4" height="9" rx="1" />
      </svg>
    ),
    metrics: ['Revenue by period', 'Inventory value', 'Restock cost', 'Low stock count', 'Cold start SKUs']
  },
  {
    id: 'area',
    label: 'Area',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8v14H3z" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
    metrics: ['Revenue', 'Inventory value', 'Restock cost', 'AI accuracy']
  },
  {
    id: 'pie',
    label: 'Pie',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v9h9" />
      </svg>
    ),
    metrics: ['Stock health split', 'Accuracy by category', 'Revenue by category']
  },
  {
    id: 'combo',
    label: 'Combo',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="12" width="4" height="8" fill="currentColor" stroke="none" />
        <rect x="10" y="8" width="4" height="12" fill="currentColor" stroke="none" />
        <polyline points="3 10 9 6 13 14 21 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    metrics: ['Revenue (bars)', 'AI accuracy (line)', 'Inventory value (bars)', 'MAE trend (line)', 'Low stock (line)']
  },
  {
    id: 'scatter',
    label: 'Scatter',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="16" r="2" />
        <circle cx="12" cy="10" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="8" cy="8" r="2" />
        <circle cx="16" cy="14" r="2" />
      </svg>
    ),
    metrics: ['MAE vs Accuracy', 'Stock level vs Revenue', 'Restock cost vs Low stock']
  }
];

const MOCK_DATA = {
  timeseries: [
    { period: 'Jan', val1: 40, val2: 24, val3: 15 },
    { period: 'Feb', val1: 30, val2: 13, val3: 22 },
    { period: 'Mar', val1: 20, val2: 98, val3: 10 },
    { period: 'Apr', val1: 27, val2: 39, val3: 12 },
    { period: 'May', val1: 18, val2: 48, val3: 21 },
    { period: 'Jun', val1: 23, val2: 38, val3: 25 },
  ],
  pie: [
    { name: 'Category A', value: 400 },
    { name: 'Category B', value: 300 },
    { name: 'Category C', value: 300 },
    { name: 'Category D', value: 200 },
  ],
  scatter: [
    { x: 10, y: 30, z: 200 },
    { x: 30, y: 200, z: 260 },
    { x: 45, y: 100, z: 400 },
    { x: 50, y: 400, z: 280 },
    { x: 70, y: 150, z: 500 },
    { x: 100, y: 250, z: 200 },
  ]
};

const COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

export default function CustomReportBuilder({ show, onClose, onAddChart }) {
  const [chartType, setChartType] = useState('line');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [timeRange, setTimeRange] = useState('last_month');
  const [granularity, setGranularity] = useState('monthly');
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!show || selectedMetrics.length === 0) {
      setChartData(null);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetchCustomReport({
          chart_type: chartType,
          metrics: selectedMetrics,
          time_range: timeRange,
          granularity: granularity
        });
        setChartData(res);
      } catch (err) {
        console.error('Failed to fetch custom report', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [show, chartType, selectedMetrics, timeRange, granularity]);

  if (!show) return null;

  const currentTypeObj = CHART_TYPES.find(c => c.id === chartType);
  const availableMetrics = currentTypeObj ? currentTypeObj.metrics : [];

  const handleChartTypeSelect = (id) => {
    setChartType(id);
    setSelectedMetrics([]); // Reset metrics when changing chart type
  };

  const toggleMetric = (metric) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const handleAddDashboard = () => {
    if (onAddChart) {
      onAddChart({
        title: `${currentTypeObj.label} chart — ${selectedMetrics.join(', ')}`,
        chart_type: chartType,
        metrics: selectedMetrics,
        time_range: timeRange,
        granularity: granularity
      });
    }
    onClose();
  };

  const renderPreview = () => {
    if (selectedMetrics.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-[#a0a0a0]">
          <svg className="w-8 h-8 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 17 9 11 13 15 21 7" />
          </svg>
          <span className="text-sm font-semibold">Configure above to see a live preview</span>
          <button className="mt-4 flex items-center justify-center w-8 h-8 rounded-full border border-[#404040] hover:bg-[#333] transition-colors">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </button>
        </div>
      );
    }

    const title = `${currentTypeObj.label} chart — ${selectedMetrics.join(', ')}`;

    let chartContent = null;
    if (isLoading) {
      chartContent = (
        <div className="flex flex-col items-center justify-center h-full text-[#8b5cf6]">
          <svg className="animate-spin w-8 h-8 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-semibold animate-pulse">Running Dynamic Engine...</span>
        </div>
      );
    } else if (!chartData) {
      chartContent = null;
    } else {
      const isPieEmpty = chartType === 'pie' && (!chartData.pie || chartData.pie.length === 0);
      const isScatterEmpty = chartType === 'scatter' && (!chartData.scatter || chartData.scatter.length === 0);
      const isTimeseriesEmpty = chartType !== 'pie' && chartType !== 'scatter' && (!chartData.timeseries || chartData.timeseries.length === 0);
      
      if (isPieEmpty || isScatterEmpty || isTimeseriesEmpty) {
        chartContent = (
          <div className="flex flex-col items-center justify-center h-full text-[#a0a0a0]">
            <svg className="w-8 h-8 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <circle cx="12" cy="12" r="10" />
               <line x1="12" y1="8" x2="12" y2="12" />
               <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-sm font-semibold">No data found for this period.</span>
          </div>
        );
      } else if (chartType === 'line') {
        chartContent = (
        <LineChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis dataKey="period" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
          {selectedMetrics.map((m, i) => (
            <Line key={m} type="monotone" dataKey={`val${(i % 3) + 1}`} name={m} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          ))}
        </LineChart>
      );
    } else if (chartType === 'bar') {
      chartContent = (
        <BarChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis dataKey="period" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
          {selectedMetrics.map((m, i) => (
            <Bar key={m} dataKey={`val${(i % 3) + 1}`} name={m} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      );
    } else if (chartType === 'area') {
      chartContent = (
        <AreaChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis dataKey="period" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
          {selectedMetrics.map((m, i) => (
            <Area key={m} type="monotone" dataKey={`val${(i % 3) + 1}`} name={m} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
          ))}
        </AreaChart>
      );
    } else if (chartType === 'pie') {
      chartContent = (
        <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
          <Pie data={chartData.pie || []} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
            {(chartData.pie || []).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      );
    } else if (chartType === 'combo') {
      chartContent = (
        <ComposedChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis dataKey="period" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
          {selectedMetrics.map((m, i) => {
            if (m.includes('(line)')) {
               return <Line key={m} type="monotone" dataKey={`val${(i % 3) + 1}`} name={m} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
            }
            return <Bar key={m} dataKey={`val${(i % 3) + 1}`} name={m} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          })}
        </ComposedChart>
      );
    } else if (chartType === 'scatter') {
      chartContent = (
        <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis type="number" dataKey="x" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <YAxis type="number" dataKey="y" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
          <Scatter name="Data" data={chartData.scatter || []} fill={COLORS[0]} />
        </ScatterChart>
      );
    }
    }

    return (
      <div className="flex flex-col relative w-full h-full">
        <h3 className="text-sm font-bold text-[#e0e0e0] mb-6">{title}</h3>
        <div className="w-full" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartContent}
          </ResponsiveContainer>
        </div>
        {/* Scroll arrow badge overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full border border-[#404040] bg-[#1a1a1a] hover:bg-[#333] transition-colors cursor-pointer opacity-70">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(0, 0, 0, 0.75)' }}>
      {/* Modal Container */}
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl relative" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white cursor-pointer z-10"
        >
          ✕
        </button>

        <div className="p-8 space-y-10">
          {/* STEP 1: CHOOSE CHART TYPE */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#888]">1 — CHOOSE CHART TYPE</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {CHART_TYPES.map(c => {
                const isSelected = chartType === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleChartTypeSelect(c.id)}
                    className="flex flex-col items-center justify-center w-24 h-24 rounded-lg transition-all"
                    style={{
                      backgroundColor: '#242424',
                      border: `1px solid ${isSelected ? '#8b5cf6' : '#333'}`,
                      color: isSelected ? '#8b5cf6' : '#a0a0a0',
                    }}
                  >
                    <div className="mb-2">{c.icon}</div>
                    <span className="text-xs font-semibold">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: SELECT METRICS */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#888]">2 — SELECT METRICS</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#312e81', color: '#818cf8' }}>
                {selectedMetrics.length} SELECTED
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {availableMetrics.map(m => {
                const isSelected = selectedMetrics.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleMetric(m)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                    style={{
                      backgroundColor: '#242424',
                      border: `1px solid ${isSelected ? '#8b5cf6' : '#333'}`,
                      color: isSelected ? '#8b5cf6' : '#d4d4d4'
                    }}
                  >
                    <div 
                      className="flex items-center justify-center w-4 h-4 rounded transition-colors"
                      style={{ 
                        border: `1px solid ${isSelected ? '#8b5cf6' : '#555'}`,
                        backgroundColor: isSelected ? '#8b5cf6' : 'transparent'
                      }}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-semibold">{m}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full" style={{ backgroundColor: '#333' }} />

          {/* STEP 3: CONFIGURE */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#888]">3 — CONFIGURE</span>
            </div>
            <div className="flex gap-6">
              <div className="flex-1 max-w-[240px]">
                <label className="block text-[10px] font-bold uppercase text-[#888] mb-2 tracking-widest">Time Range</label>
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md text-sm font-bold text-white appearance-none cursor-pointer outline-none focus:ring-1 focus:ring-[#8b5cf6]"
                  style={{ backgroundColor: '#242424', border: '1px solid #333' }}
                >
                  <option value="last_month">Last month</option>
                  <option value="last_3_months">Last 3 months</option>
                  <option value="last_6_months">Last 6 months</option>
                  <option value="ytd">Year to date</option>
                  <option value="all_time">All time</option>
                </select>
              </div>
              <div className="flex-1 max-w-[240px]">
                <label className="block text-[10px] font-bold uppercase text-[#888] mb-2 tracking-widest">Granularity</label>
                <select 
                  value={granularity} 
                  onChange={(e) => setGranularity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md text-sm font-bold text-white appearance-none cursor-pointer outline-none focus:ring-1 focus:ring-[#8b5cf6]"
                  style={{ backgroundColor: '#242424', border: '1px solid #333' }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full" style={{ backgroundColor: '#333' }} />

          {/* STEP 4: PREVIEW */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#888]">4 — PREVIEW</span>
            </div>
            <div 
              className="rounded-xl p-6 min-h-[350px] relative"
              style={{ backgroundColor: '#242424', border: '1px solid #333' }}
            >
              {selectedMetrics.length === 0 ? (
                <span className="text-sm font-bold text-[#e0e0e0] absolute top-6 left-6">Select metrics to see preview</span>
              ) : null}
              {renderPreview()}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={() => {
                setChartType('line');
                setSelectedMetrics([]);
              }}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-[#d4d4d4] hover:bg-[#333] transition-colors"
              style={{ border: '1px solid #444' }}
            >
              Reset
            </button>
            <button 
              onClick={handleAddDashboard}
              disabled={selectedMetrics.length === 0 || isLoading}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-[#e0e0e0] transition-colors flex items-center gap-2 cursor-pointer hover:bg-[#333] disabled:opacity-50"
              style={{ backgroundColor: '#242424', border: '1px solid #444' }}
            >
              Add to dashboard
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
