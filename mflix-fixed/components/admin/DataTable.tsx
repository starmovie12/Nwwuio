'use client';

import { useState, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
  width?: string;
}

interface BulkAction {
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
  onClick: (ids: string[]) => void;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  selectable?: boolean;
  onSelect?: (ids: string[]) => void;
  sortable?: boolean;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  onRowClick?: (item: T) => void;
  bulkActions?: BulkAction[];
}

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  selectable,
  onSelect,
  pageSize = 20,
  loading,
  emptyMessage = 'No data found',
  emptyIcon = '📭',
  onRowClick,
  bulkActions,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = (a as Record<string, unknown>)[sortKey];
    const bv = (b as Record<string, unknown>)[sortKey];
    const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pageData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    onSelect?.([...next]);
  };

  const toggleAll = () => {
    if (selected.size === pageData.length) {
      setSelected(new Set());
      onSelect?.([]);
    } else {
      const ids = new Set(pageData.map(r => r.id));
      setSelected(ids);
      onSelect?.([...ids]);
    }
  };

  if (loading) return <Skeleton type="table" rows={5} />;

  if (!data.length) return <EmptyState icon={emptyIcon} title={emptyMessage} />;

  const selectedIds = [...selected];

  return (
    <div className="space-y-3">
      {/* Bulk actions bar */}
      {selectable && selected.size > 0 && bulkActions && (
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm">
          <span className="text-indigo-300 font-medium">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={() => action.onClick(selectedIds)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  action.variant === 'danger'
                    ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <button onClick={() => { setSelected(new Set()); onSelect?.([]); }}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === pageData.length && pageData.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 accent-indigo-500"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-slate-300 select-none' : ''}`}
                  style={{ width: col.width }}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === String(col.key) && (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {pageData.map(row => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`hover:bg-white/[0.03] transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${selected.has(row.id) ? 'bg-indigo-500/5' : ''}`}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 accent-indigo-500"
                    />
                  </td>
                )}
                {columns.map(col => {
                  const value = (row as Record<string, unknown>)[String(col.key)];
                  return (
                    <td key={String(col.key)} className="px-4 py-3 text-slate-300">
                      {col.render ? col.render(value, row) : String(value ?? '—')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} of {data.length}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pg = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-7 h-7 rounded-lg text-xs ${pg === page ? 'bg-indigo-600 text-white' : 'hover:bg-white/10'}`}
                >
                  {pg + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
