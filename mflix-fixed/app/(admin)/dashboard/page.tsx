'use client';

import useSWR from 'swr';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowRight } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import StatsCard from '@/components/admin/StatsCard';
import Badge from '@/components/admin/Badge';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function timeAgo(ts: string | number | undefined) {
  if (!ts) return 'unknown';
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const diff = Date.now() - ms;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading, mutate: refreshStats } = useSWR(
    '/api/admin/stats', fetcher, { refreshInterval: 30000, keepPreviousData: true }
  );
  const { data: tasks, isLoading: tasksLoading } = useSWR(
    '/api/tasks?limit=8', fetcher, { refreshInterval: 20000, keepPreviousData: true }
  );
  const { data: engine } = useSWR('/api/engine-status', fetcher, { refreshInterval: 60000 });

  const s = stats?.stats;
  const recentTasks = tasks?.tasks || [];
  const isHealthy = engine?.status === 'online';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-500/10 to-violet-500/5 border border-indigo-500/20 rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-0.5">👋 Welcome back</h2>
            <p className="text-sm text-slate-400">{formatDate()}</p>
            <p className="text-xs text-slate-500 mt-1">
              {isHealthy ? '🟢 System healthy' : '🔴 System offline'} •{' '}
              {s ? `${s.queuePending || 0} item${s.queuePending !== 1 ? 's' : ''} in queue` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => refreshStats()}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon="🎬"
          label="Total Tasks"
          value={s?.totalTasks ?? '—'}
          subtitle={`+${s?.todayTasks || 0} today`}
          trend={s?.todayTasks > 0 ? { direction: 'up', label: 'today' } : undefined}
          href="/library"
          loading={statsLoading}
        />
        <StatsCard
          icon="✅"
          label="Completed"
          value={s?.completedTasks ?? '—'}
          subtitle={s ? `${s.successRate || 0}% rate` : ''}
          color="emerald"
          href="/library?status=completed"
          loading={statsLoading}
        />
        <StatsCard
          icon="❌"
          label="Failed"
          value={s?.failedTasks ?? '—'}
          subtitle={s?.failedTasks > 0 ? `${s.failedTasks} need retry` : 'All good!'}
          color={s?.failedTasks > 0 ? 'rose' : 'default'}
          href="/library?status=failed"
          loading={statsLoading}
        />
        <StatsCard
          icon="⏳"
          label="Queue"
          value={s?.queuePending ?? '—'}
          subtitle={`${s?.queueProcessing || 0} processing`}
          color={s?.queuePending > 5 ? 'amber' : 'default'}
          href="/queue"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">📋 Recent Activity</h3>
            <button onClick={() => router.push('/library')}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {tasksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No tasks yet. Go to Process to add URLs.</div>
          ) : (
            <div className="space-y-1.5">
              {recentTasks.slice(0, 7).map((task: Record<string, unknown>, i: number) => {
                const status = task.status as string;
                const dotColor = status === 'completed' ? 'bg-emerald-400' : status === 'failed' ? 'bg-rose-400' : status === 'processing' ? 'bg-blue-400 animate-pulse' : 'bg-amber-400';
                const title = (task.preview as Record<string, unknown>)?.title as string || (task.url as string) || 'Unknown';
                const links = task.links as unknown[];
                const completedLinks = (links || []).filter((l: unknown) => (l as Record<string, unknown>).status === 'done').length;
                const totalLinks = links?.length || 0;
                return (
                  <motion.div
                    key={String(task.id)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => router.push(`/library?task=${task.id}`)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">{String(title).slice(0, 50)}</p>
                      <p className="text-[10px] text-slate-600">{timeAgo(task.updatedAt as string)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500">{completedLinks}/{totalLinks} links</span>
                      <Badge status={status} size="sm" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">🖥 System Health</h3>

          <div className="space-y-3">
            {[
              {
                label: 'Cron Engine',
                status: isHealthy ? 'online' : 'offline',
                detail: engine?.lastRunAt ? `Last: ${timeAgo(engine.lastRunAt)}` : 'Never',
              },
              {
                label: 'VPS Timer',
                status: s?.vpsTimerMs < 5000 ? 'online' : 'offline',
                detail: s?.vpsTimerMs ? `${s.vpsTimerMs}ms` : '—',
              },
              {
                label: 'VPS HubCloud',
                status: s?.vpsHubcloudMs < 5000 ? 'online' : 'offline',
                detail: s?.vpsHubcloudMs ? `${s.vpsHubcloudMs}ms` : '—',
              },
              {
                label: 'Firebase',
                status: s?.firebaseMs < 2000 ? 'online' : 'warning',
                detail: s?.firebaseMs ? `${s.firebaseMs}ms` : '—',
              },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'online' ? 'bg-emerald-400' :
                    item.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  <span className="text-xs text-slate-300">{item.label}</span>
                </div>
                <span className="text-xs text-slate-500">{item.detail}</span>
              </div>
            ))}

            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Success Rate</span>
                <span className="text-emerald-400 font-medium">{s?.successRate || 0}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Cache Hit Rate</span>
                <span className="text-indigo-400 font-medium">{s?.cacheHitRate || 0}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Cache Entries</span>
                <span className="text-slate-300">{s?.cacheEntries || 0}</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/settings')}
              className="w-full mt-2 py-2 rounded-xl text-xs text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/10 transition-colors"
            >
              Manage Settings →
            </button>
          </div>
        </div>
      </div>

      {/* Today's Chart (per hour) — Mini LineChart */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-300">📈 Today&apos;s Processing (per hour)</p>
          <button onClick={() => router.push('/analytics')} className="text-[10px] text-indigo-400 hover:text-indigo-300">
            Full Analytics →
          </button>
        </div>
        <TodayMiniChart stats={stats} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '⚡ Process URL', href: '/process', color: 'indigo' },
          { label: '📋 Manage Queue', href: '/queue', color: 'amber' },
          { label: '🧠 Ask AI', href: '/ai', color: 'violet' },
          { label: '📊 Analytics', href: '/analytics', color: 'emerald' },
        ].map(a => (
          <button
            key={a.href}
            onClick={() => router.push(a.href)}
            className="py-3 rounded-2xl text-xs font-medium bg-white/[0.03] border border-white/5 text-slate-300 hover:bg-white/[0.06] hover:border-white/10 transition-colors text-center"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Today's Mini Chart ───────────────────────────────────────────────────────
function TodayMiniChart({ stats }: { stats: any }) {
  // Build hourly data from recentActivity or use placeholder hourly array
  const hourly: { hour: string; count: number }[] = [];
  const now = new Date();
  for (let h = 0; h <= now.getHours(); h++) {
    const label = `${h.toString().padStart(2, '0')}:00`;
    const count = (stats?.hourlyToday?.[h] ?? 0);
    hourly.push({ hour: label, count });
  }

  if (hourly.every(d => d.count === 0)) {
    return (
      <div className="h-[120px] flex items-center justify-center text-xs text-slate-600">
        No processing today yet
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 120 }}>
      <ChartInner data={hourly} />
    </div>
  );
}

// Lazy recharts import for SSR safety
function ChartInner({ data }: { data: { hour: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis dataKey="hour" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
        <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#0f0f12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#64748b' }}
          itemStyle={{ color: '#6366f1' }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
