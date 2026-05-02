import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { fetchCustomReport, deleteCustomChart } from '../services/api';

const GRADIENTS = [
  { id: 'grad0', start: '#6366f1', end: '#312e81' },
  { id: 'grad1', start: '#ef4444', end: '#7f1d1d' },
  { id: 'grad2', start: '#10b981', end: '#064e3b' },
  { id: 'grad3', start: '#f59e0b', end: '#78350f' },
  { id: 'grad4', start: '#8b5cf6', end: '#4c1d95' },
  { id: 'grad5', start: '#06b6d4', end: '#164e63' }
];

const COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

export default function DynamicChartCard({ chartConfig, onDelete, dragHandleProps }) {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetchCustomReport({
          chart_type: chartConfig.chart_type || 'line',
          metrics: chartConfig.metrics || [],
          time_range: chartConfig.time_range || 'last_month',
          granularity: chartConfig.granularity || 'monthly'
        });
        setChartData(res);
      } catch (err) {
        console.error('Failed to fetch custom report', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [chartConfig]);

  const handleDelete = async () => {
    try {
      await deleteCustomChart(chartConfig.id);
      if (onDelete) onDelete(chartConfig.id);
    } catch (err) {
      console.error('Failed to delete chart', err);
    }
  };

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

  const renderChartContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-[#8b5cf6]">
          <svg className="animate-spin w-8 h-8 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    }

    if (!chartData) return null;

    const isPieEmpty = chartConfig.chart_type === 'pie' && (!chartData.pie || chartData.pie.length === 0);
    const isScatterEmpty = chartConfig.chart_type === 'scatter' && (!chartData.scatter || chartData.scatter.length === 0);
    const isTimeseriesEmpty = chartConfig.chart_type !== 'pie' && chartConfig.chart_type !== 'scatter' && (!chartData.timeseries || chartData.timeseries.length === 0);

    if (isPieEmpty || isScatterEmpty || isTimeseriesEmpty) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-[#a0a0a0]">
          <span className="text-sm font-semibold">No data found for this period.</span>
        </div>
      );
    }

    if (chartConfig.chart_type === 'line') {
      return (
        <LineChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(126, 88, 88, 0.14)" vertical={false} />
          <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatYAxis} width={45} />
          <Tooltip contentStyle={{ backgroundColor: '#271042', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          {(chartConfig.metrics || []).map((m, i) => (
            <Line key={m} type="monotone" dataKey={`val${(i % 3) + 1}`} name={m} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          ))}
        </LineChart>
      );
    } else if (chartConfig.chart_type === 'bar') {
      return (
        <BarChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          {renderGradients()}
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
          <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatYAxis} width={45} />
          <Tooltip contentStyle={{ backgroundColor: '#271042', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          {(chartConfig.metrics || []).map((m, i) => (
            <Bar key={m} dataKey={`val${(i % 3) + 1}`} name={m} fill={`url(#grad${i % GRADIENTS.length})`} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      );
    } else if (chartConfig.chart_type === 'area') {
      return (
        <AreaChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          {renderGradients()}
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
          <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatYAxis} width={45} />
          <Tooltip contentStyle={{ backgroundColor: '#271042', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          {(chartConfig.metrics || []).map((m, i) => (
            <Area key={m} type="monotone" dataKey={`val${(i % 3) + 1}`} name={m} fill={`url(#grad${i % GRADIENTS.length})`} fillOpacity={0.6} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
          ))}
        </AreaChart>
      );
    } else if (chartConfig.chart_type === 'pie') {
      return (
        <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          {renderGradients()}
          <Tooltip contentStyle={{ backgroundColor: '#271042', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#fff' }} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          <Pie 
            data={chartData.pie || []} 
            cx="50%" cy="50%" 
            innerRadius={65} 
            outerRadius={105} 
            paddingAngle={4} 
            dataKey="value" 
            nameKey="name"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={3}
          >
            {(chartData.pie || []).map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#grad${index % GRADIENTS.length})`} 
                style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.4))' }} 
              />
            ))}
          </Pie>
        </PieChart>
      );
    } else if (chartConfig.chart_type === 'combo') {
      return (
        <ComposedChart data={chartData.timeseries || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          {renderGradients()}
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
          <XAxis dataKey="period" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatYAxis} width={45} />
          <Tooltip contentStyle={{ backgroundColor: '#271042', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          {(chartConfig.metrics || []).map((m, i) => {
            if (m.includes('(line)')) {
              return <Line key={m} type="monotone" dataKey={`val${(i % 3) + 1}`} name={m} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
            }
            return <Bar key={m} dataKey={`val${(i % 3) + 1}`} name={m} fill={`url(#grad${i % GRADIENTS.length})`} radius={[4, 4, 0, 0]} />
          })}
        </ComposedChart>
      );
    } else if (chartConfig.chart_type === 'scatter') {
      return (
        <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
          <XAxis type="number" dataKey="x" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis type="number" dataKey="y" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatYAxis} width={45} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#271042', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          <Scatter name="Data" data={chartData.scatter || []} fill={COLORS[0]} />
        </ScatterChart>
      );
    }
    return null;
  };

  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden shadow-xl border border-white/10 transition-all duration-300 hover:border-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]"
      style={{ background: 'linear-gradient(145deg, rgba(12, 12, 22, 0.99), rgba(18, 8, 28, 0.99))' }}
    >
      {dragHandleProps && (
        <div 
          {...dragHandleProps.attributes} 
          {...dragHandleProps.listeners} 
          className="absolute top-4 right-14 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2 cursor-grab active:cursor-grabbing z-50 touch-none outline-none flex items-center justify-center"
          title="Drag to reorder"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="12" r="1"></circle>
            <circle cx="9" cy="5" r="1"></circle>
            <circle cx="9" cy="19" r="1"></circle>
            <circle cx="15" cy="12" r="1"></circle>
            <circle cx="15" cy="5" r="1"></circle>
            <circle cx="15" cy="19" r="1"></circle>
          </svg>
        </div>
      )}
      <button
        onClick={handleDelete}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/20 rounded-full p-2 cursor-pointer z-10"
        title="Delete custom chart"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
      <h3 className="text-lg font-bold text-white mb-1">{chartConfig.title || 'Custom Chart'}</h3>
      <p className="text-xs text-[#94a3b8] mb-6 uppercase tracking-widest font-semibold">
        {chartConfig.time_range ? chartConfig.time_range.replace('_', ' ') : 'All Time'} • {chartConfig.granularity || 'Monthly'}
      </p>

      <div className="h-72 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          {renderChartContent()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
