'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'motion/react';
import { RefreshCw, Filter } from 'lucide-react';
import EmptyState from '@/components/admin/EmptyState';
import Skeleton from '@/components/admin/Skeleton';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function timeAgo(ts: string) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleString();
}

const LEVEL_COLORS: Record<string, string> = {
  success: 'text-emerald-400 bg-emerald-400/10',
  error:   'text-rose-400 bg-rose-400/10',
  warning: 'text-amber-400 bg-amber-400/10',
  info:    'text-blue-400 bg-blue-400/10',
  cron:    'text-violet-400 bg-violet-400/10',
};

const LEVEL_DOT: Record<string, string> = {
  success: 'bg-emerald-400',
  error:   'bg-rose-400',
  warning: 'bg-amber-400',
  info:    'bg-blue-400',
  cron:    'bg-violet-400',
};

interface LogEntry {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export default function LogsPage() {
  const [level, setLevel] = useState('all');
  const [source, setSource] = useState('all');

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/logs?level=${level}&source=${source}&limit=100`,
    fetcher,
    { refreshInterval: 15000, keepPreviousData: true }
  );

  const logs: LogEntry[] = data?.logs || [];

  const LEVELS = ['all', 'success', 'error', 'warning', 'info', 'cron'];
  const SOURCES = ['all', 'cron', 'solve_task', 'stream_solve', 'tasks', 'system'];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">📝 System Logs</h2>
          <p className="text-sm text-slate-500">Real-time activity feed — kya hua aur kab</p>
        </div>
        <button onClick={() => mutate()} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500">Level:</span>
          <div className="flex gap-1">
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize transition-colors ${
                  level === l ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Source:</span>
          <div className="flex gap-1">
            {SOURCES.map(s => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                  source === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs */}
      {isLoading ? (
        <Skeleton type="table" rows={8} />
      ) : logs.length === 0 ? (
        <EmptyState icon="📝" title="No logs found" description="Filters change karo ya tasks process karo" />
      ) : (
        <div className="space-y-1">
          {logs.map((log, i) => (
            <motion.div
              key={log.id || i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors group"
            >
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${LEVEL_DOT[log.level] || 'bg-slate-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${LEVEL_COLORS[log.level] || 'text-slate-400 bg-white/5'}`}>
                    {log.level?.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">{log.source}</span>
                  <span className="text-xs text-slate-300">{log.message}</span>
                </div>
                {log.details && (
                  <pre className="mt-1 text-[10px] text-slate-600 font-mono overflow-hidden truncate max-w-xl group-hover:overflow-visible group-hover:whitespace-pre-wrap">
                    {JSON.stringify(log.details).slice(0, 200)}
                  </pre>
                )}
              </div>
              <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">{timeAgo(log.timestamp)}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
