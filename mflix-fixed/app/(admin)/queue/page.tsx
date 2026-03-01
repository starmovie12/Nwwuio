'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'motion/react';
import { RefreshCw, RotateCcw, Trash2, PlayCircle } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import Badge from '@/components/admin/Badge';
import { useToast } from '@/components/admin/Toast';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function timeAgo(ts: string | undefined) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default function QueuePage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [filter, setFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/queue${filter !== 'all' ? `?status=${filter}` : ''}`,
    fetcher,
    { refreshInterval: 15000, keepPreviousData: true }
  );

  const items: Record<string, unknown>[] = (data?.items || []).map((item: Record<string, unknown>) => ({ ...item, id: item.id as string }));

  const resetStuck = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/reset-stuck', { method: 'POST' });
      const d = await res.json();
      toast.success(`Reset ${d.resetCount || 0} stuck tasks`);
      mutate();
    } catch { toast.error('Reset failed'); }
    finally { setActionLoading(false); }
  };

  const deleteItems = async (ids: string[]) => {
    const ok = await confirm({ title: `Delete ${ids.length} item(s)?`, message: 'Yeh queue items hata diye jayenge.', variant: 'danger' });
    if (!ok) return;
    setActionLoading(true);
    try {
      await Promise.all(ids.map(id =>
        fetch(`/api/admin/queue/${id}`, { method: 'DELETE' })
      ));
      toast.success(`Deleted ${ids.length} items`);
      mutate();
    } catch { toast.error('Delete failed'); }
    finally { setActionLoading(false); }
  };

  const retryItems = async (ids: string[]) => {
    setActionLoading(true);
    try {
      await Promise.all(ids.map(id =>
        fetch(`/api/admin/queue/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'pending', retryCount: 0 }) })
      ));
      toast.success(`${ids.length} items queued for retry`);
      mutate();
    } catch { toast.error('Retry failed'); }
    finally { setActionLoading(false); }
  };

  const STATUSES = ['all', 'pending', 'processing', 'completed', 'failed'];

  const columns = [
    {
      key: 'url', label: 'URL', sortable: false,
      render: (v: unknown) => (
        <p className="text-xs font-mono text-slate-300 truncate max-w-xs">{String(v || '')}</p>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (v: unknown) => <Badge status={String(v)} size="sm" />,
    },
    {
      key: 'retryCount', label: 'Retries', sortable: true,
      render: (v: unknown) => <span className="text-xs text-slate-400">{String(v ?? 0)}</span>,
    },
    {
      key: 'addedAt', label: 'Added', sortable: true,
      render: (v: unknown) => <span className="text-xs text-slate-500">{timeAgo(v as string)}</span>,
    },
    {
      key: 'type', label: 'Type', sortable: false,
      render: (v: unknown) => <span className="text-xs text-slate-500">{String(v || 'movie')}</span>,
    },
  ];

  const counts = data?.counts || {};

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">📋 Queue Manager</h2>
          <p className="text-sm text-slate-500">GitHub Auto-Pilot ki queue — pending items process honge har ~5 min</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetStuck}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Stuck
          </button>
          <button
            onClick={() => mutate()}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize ${
              filter === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {s}{s !== 'all' && counts[s] !== undefined ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: counts.pending || 0, color: 'text-amber-400' },
          { label: 'Processing', value: counts.processing || 0, color: 'text-blue-400' },
          { label: 'Completed', value: counts.completed || 0, color: 'text-emerald-400' },
          { label: 'Failed', value: counts.failed || 0, color: 'text-rose-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <DataTable
        data={items as never}
        columns={columns as never}
        selectable
        loading={isLoading}
        pageSize={25}
        emptyMessage="Queue empty hai"
        emptyIcon="✅"
        bulkActions={[
          {
            label: 'Retry',
            icon: <PlayCircle className="w-3.5 h-3.5" />,
            onClick: (ids) => retryItems(ids),
          },
          {
            label: 'Delete',
            icon: <Trash2 className="w-3.5 h-3.5" />,
            variant: 'danger',
            onClick: (ids) => deleteItems(ids),
          },
        ]}
      />
    </div>
  );
}
