'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'motion/react';
import { RefreshCw, Calendar } from 'lucide-react';
import {
  LineChart, Line,
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import Skeleton from '@/components/admin/Skeleton';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
  if (!(active as boolean) || !(payload as unknown[])?.length) return null;
  return (
    <div className="bg-[#0f0f12] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{String(label || '')}</p>
      {(payload as Array<Record<string, unknown>>).map((p, i) => (
        <p key={i} style={{ color: p.color as string }}>
          {String(p.name)}: <b>{String(p.value)}</b>
        </p>
      ))}
    </div>
  );
};

const RANGES = [
  { label: 'Today',   value: 'today' },
  { label: '7 Days',  value: '7d' },
  { label: '30 Days', value: '30d' },
];

export default function AnalyticsPage() {
  const [range, setRange]     = useState<'today' | '7d' | '30d' | 'custom'>('7d');
  const [customFrom, setFrom] = useState('');
  const [customTo, setTo]     = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Build API URL with range params
  const apiUrl = range === 'custom' && customFrom && customTo
    ? `/api/admin/analytics?range=custom&from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`
    : `/api/admin/analytics?range=${range}`;

  const { data, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: 60000,
    keepPreviousData: true,
  });

  const overview      = data?.overview      || {};
  const daily         = data?.daily         || [];
  const solverPerf    = data?.solverPerformance || [];
  const statusDist    = data?.statusDistribution || [];
  const topErrors     = data?.topErrors     || [];
  const timeDist      = data?.timeDistribution || [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header + DateRange Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">📈 Analytics</h2>
          <p className="text-sm text-slate-500">System performance aur trends</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range pills */}
          <div className="flex gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => { setRange(r.value as any); setShowCustom(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  range === r.value
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => { setShowCustom(!showCustom); setRange('custom'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                range === 'custom'
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" /> Custom
            </button>
          </div>
          <button
            onClick={() => mutate()}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom date range inputs */}
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => setFrom(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">To</label>
            <input
              type="date"
              value={customTo}
              onChange={e => setTo(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <button
            onClick={() => mutate()}
            className="mt-4 px-4 py-2 rounded-xl text-xs bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            Apply
          </button>
        </motion.div>
      )}

      {/* Overview stats */}
      {isLoading ? (
        <Skeleton type="stats" count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Processed', value: overview.totalTasks || 0,                    color: 'text-white' },
            { label: 'Success Rate',    value: `${overview.successRate || 0}%`,              color: 'text-emerald-400' },
            { label: 'Avg Links/Task',  value: overview.avgLinksPerTask?.toFixed(1) || '0', color: 'text-indigo-400' },
            { label: 'Completed',       value: overview.completedTasks || 0,                 color: 'text-violet-400' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/[0.03] border border-white/5 rounded-2xl p-4"
            >
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{String(s.value)}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Processing Trend — LineChart */}
      {daily.length > 0 && (
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">📊 Processing Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <Line
                type="monotone"
                dataKey="processed"
                name="Total"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="success"
                name="Success"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="failed"
                name="Failed"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Success Rate Trend — AreaChart */}
      {daily.length > 0 && (
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">✅ Daily Success Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily.map((d: any) => ({
              ...d,
              rate: d.processed > 0 ? Math.round((d.success / d.processed) * 100) : 0,
            }))} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" name="Success %" stroke="#10b981" fill="url(#successGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Solver Performance + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {solverPerf.length > 0 && (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">🔧 Solver Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={solverPerf} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Bar dataKey="success" name="Success" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="failed"  name="Failed"  fill="#f43f5e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {statusDist.length > 0 && (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">🎯 Status Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDist}
                  cx="50%"
                  cy="50%"
                  outerRadius="65%"
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusDist.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Time Distribution + Top Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {timeDist.length > 0 && (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">⏱ Processing Time Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={timeDist} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="bucket" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Tasks" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {topErrors.length > 0 && (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">🔴 Top Errors</h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {topErrors.map((e: any, i: number) => (
                <div key={i} className="flex items-start justify-between gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-[11px] text-slate-400 font-mono break-all flex-1">{e.message}</p>
                  <span className="text-xs text-rose-400 font-bold shrink-0">{e.count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(daily.length === 0 && !isLoading) && (
        <div className="text-center py-16 text-slate-600 text-sm">
          No data for selected range
        </div>
      )}
    </div>
  );
}
