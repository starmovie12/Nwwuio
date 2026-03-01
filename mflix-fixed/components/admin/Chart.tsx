'use client';

import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f12] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-slate-400 mb-1.5 font-medium">{String(label)}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <b>{typeof p.value === 'number' ? p.value.toLocaleString() : String(p.value)}</b>
        </p>
      ))}
    </div>
  );
};

// ─── Shared axis styles ───────────────────────────────────────────────────────
const axisStyle = { fill: '#475569', fontSize: 10 };

// ─── MflixLineChart ───────────────────────────────────────────────────────────
interface LineChartProps {
  data: any[];
  lines: { key: string; color: string; label?: string }[];
  xKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function MflixLineChart({
  data, lines, xKey = 'date', height = 260, showGrid = true, showLegend = false,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />}
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />}
        {lines.map(l => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label || l.key}
            stroke={l.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── MflixAreaChart ───────────────────────────────────────────────────────────
interface AreaChartProps {
  data: any[];
  areas: { key: string; color: string; label?: string }[];
  xKey?: string;
  height?: number;
}

export function MflixAreaChart({ data, areas, xKey = 'date', height = 220 }: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {areas.map(a => (
          <Area
            key={a.key}
            type="monotone"
            dataKey={a.key}
            name={a.label || a.key}
            stroke={a.color}
            fill={`${a.color}20`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── MflixBarChart ────────────────────────────────────────────────────────────
interface BarChartProps {
  data: any[];
  bars: { key: string; color: string; label?: string }[];
  xKey?: string;
  height?: number;
  showLegend?: boolean;
}

export function MflixBarChart({ data, bars, xKey = 'name', height = 250, showLegend = false }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />}
        {bars.map(b => (
          <Bar key={b.key} dataKey={b.key} name={b.label || b.key} fill={b.color} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── MflixPieChart ────────────────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
  showLegend?: boolean;
  colors?: string[];
  innerRadius?: number;
}

export function MflixPieChart({
  data, height = 240, showLegend = true, colors = CHART_COLORS, innerRadius = 0,
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="70%"
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />}
      </PieChart>
    </ResponsiveContainer>
  );
}

// Default export — all chart types bundled
export default { MflixLineChart, MflixAreaChart, MflixBarChart, MflixPieChart };
