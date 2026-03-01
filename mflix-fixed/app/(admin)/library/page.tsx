'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Grid, List, Copy, Trash2, RefreshCw, ExternalLink, Pencil, Plus, X } from 'lucide-react';
import Badge from '@/components/admin/Badge';
import { useToast } from '@/components/admin/Toast';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import Modal from '@/components/admin/Modal';
import Skeleton from '@/components/admin/Skeleton';
import EmptyState from '@/components/admin/EmptyState';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function timeAgo(ts: string | undefined) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

interface Task {
  id: string;
  url: string;
  status: string;
  preview?: { title?: string; posterUrl?: string };
  metadata?: { quality?: string; languages?: string };
  links?: Array<{ name: string; finalLink?: string; link: string; status: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editLinks, setEditLinks] = useState<any[]>([]);
  const [editStatus, setEditStatus] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/library?status=${status}&search=${encodeURIComponent(search)}&page=${page}&limit=${PAGE_SIZE}`,
    fetcher,
    { keepPreviousData: true }
  );

  const tasks: Task[] = data?.tasks || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const deleteTask = async (id: string) => {
    const ok = await confirm({ title: 'Delete Task?', message: 'Is task aur uske saare links delete ho jayenge.', variant: 'danger' });
    if (!ok) return;
    try {
      await fetch(`/api/admin/library/${id}`, { method: 'DELETE' });
      toast.success('Task deleted');
      mutate();
      if (selectedTask?.id === id) setSelectedTask(null);
    } catch { toast.error('Delete failed'); }
  };

  const copyLinks = (task: Task) => {
    const links = (task.links || []).filter(l => l.finalLink).map(l => `${l.name}: ${l.finalLink}`).join('\n');
    if (!links) { toast.warning('No resolved links found'); return; }
    navigator.clipboard.writeText(links);
    toast.success('Links copied to clipboard!');
  };

  const retryTask = async (task: Task) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: task.url }),
      });
      const d = await res.json();
      if (d.taskId) { toast.success('Task re-submitted for processing'); mutate(); }
      else toast.error(d.error || 'Retry failed');
    } catch { toast.error('Network error'); }
  };

  const STATUSES = ['all', 'completed', 'processing', 'pending', 'failed'];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">🎬 Movie Library</h2>
          <p className="text-sm text-slate-500">{total} total tasks • All processed movies/series</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-white'}`}><Grid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-white'}`}><List className="w-4 h-4" /></button>
          <button onClick={() => mutate()} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by title or URL..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(0); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${status === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid / List */}
      {isLoading ? (
        <Skeleton type={viewMode === 'grid' ? 'card' : 'table'} count={8} rows={6} />
      ) : tasks.length === 0 ? (
        <EmptyState icon="🎬" title="No tasks found" description="Process page se URLs add karo" />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {tasks.map((task, i) => {
            const title = task.preview?.title || task.url?.split('/').pop() || task.id;
            const poster = task.preview?.posterUrl;
            const doneLinks = (task.links || []).filter(l => l.finalLink).length;
            const totalLinks = task.links?.length || 0;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => setSelectedTask(task)}
                className="cursor-pointer group"
              >
                <div className="aspect-[2/3] bg-white/5 rounded-xl overflow-hidden mb-2 relative">
                  {poster ? (
                    <img src={poster} alt={String(title)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                  )}
                  <div className="absolute top-1.5 right-1.5">
                    <Badge status={task.status} size="sm" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={e => { e.stopPropagation(); copyLinks(task); }} className="flex-1 p-1.5 bg-indigo-600/80 rounded-lg text-white" title="Copy links"><Copy className="w-3 h-3 mx-auto" /></button>
                    <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }} className="flex-1 p-1.5 bg-rose-600/80 rounded-lg text-white" title="Delete"><Trash2 className="w-3 h-3 mx-auto" /></button>
                  </div>
                </div>
                <p className="text-xs text-slate-300 truncate font-medium">{String(title)}</p>
                <p className="text-[10px] text-slate-600">{doneLinks}/{totalLinks} links • {timeAgo(task.updatedAt)}</p>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(task => {
            const title = task.preview?.title || task.url?.split('/').pop() || task.id;
            const doneLinks = (task.links || []).filter(l => l.finalLink).length;
            return (
              <div key={task.id} onClick={() => setSelectedTask(task)}
                className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/[0.05] transition-colors">
                <div className="w-8 h-10 bg-white/5 rounded overflow-hidden shrink-0">
                  {task.preview?.posterUrl ? <img src={task.preview.posterUrl} className="w-full h-full object-cover" alt="" /> : <div className="flex items-center justify-center h-full text-sm">🎬</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{String(title)}</p>
                  <p className="text-[10px] text-slate-500 truncate">{task.url}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-500">{doneLinks}/{task.links?.length || 0}</span>
                  <Badge status={task.status} size="sm" />
                  <span className="text-xs text-slate-600">{timeAgo(task.updatedAt)}</span>
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); copyLinks(task); }} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-xl text-xs bg-white/5 text-slate-400 hover:text-white disabled:opacity-30">← Prev</button>
          <span className="px-3 py-1.5 text-xs text-slate-500">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-xl text-xs bg-white/5 text-slate-400 hover:text-white disabled:opacity-30">Next →</button>
        </div>
      )}

      {/* Task detail modal */}
      <AnimatePresence>
        {selectedTask && (
          <Modal
            open={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            title={selectedTask.preview?.title || selectedTask.id}
            size="lg"
            footer={
              <div className="flex gap-2 w-full">
                <button onClick={() => copyLinks(selectedTask)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/25 transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Copy All Links
                </button>
                <button onClick={() => { setEditTask(selectedTask); setEditLinks(JSON.parse(JSON.stringify(selectedTask.links || []))); setEditStatus(selectedTask.status); setSelectedTask(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { deleteTask(selectedTask.id); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-rose-500/15 text-rose-300 border border-rose-500/20 hover:bg-rose-500/25 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <button onClick={() => retryTask(selectedTask)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-white/5 text-slate-300 hover:bg-white/10 transition-colors ml-auto">
                  <RefreshCw className="w-3.5 h-3.5" /> Re-Process
                </button>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Task info */}
              <div className="flex gap-3">
                {selectedTask.preview?.posterUrl && (
                  <img src={selectedTask.preview.posterUrl} className="w-16 h-24 object-cover rounded-xl shrink-0" alt="" />
                )}
                <div className="space-y-1">
                  <Badge status={selectedTask.status} />
                  {selectedTask.metadata?.quality && <p className="text-xs text-slate-400">📺 {selectedTask.metadata.quality}</p>}
                  {selectedTask.metadata?.languages && <p className="text-xs text-slate-400">🌐 {selectedTask.metadata.languages}</p>}
                  <a href={selectedTask.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                    <ExternalLink className="w-3 h-3" /> Source URL
                  </a>
                </div>
              </div>

              {/* Links */}
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">Links ({selectedTask.links?.length || 0})</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {(selectedTask.links || []).map((link, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${link.finalLink ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-white/[0.02] border border-white/5'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 truncate">{link.name}</p>
                        {link.finalLink ? (
                          <a href={link.finalLink} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 truncate block font-mono"
                            onClick={e => e.stopPropagation()}>
                            {link.finalLink.slice(0, 60)}…
                          </a>
                        ) : (
                          <p className="text-[10px] text-slate-600 truncate font-mono">{link.link}</p>
                        )}
                      </div>
                      {link.finalLink && (
                        <button onClick={() => { navigator.clipboard.writeText(link.finalLink!); toast.success('Copied!'); }}
                          className="p-1 rounded text-slate-500 hover:text-indigo-400">
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                      <Badge status={link.finalLink ? 'completed' : link.status} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editTask && (
          <Modal
            open={!!editTask}
            onClose={() => setEditTask(null)}
            title={`✏️ Edit Task — ${editTask.preview?.title || editTask.id}`}
            size="lg"
            footer={
              <div className="flex gap-2 w-full">
                <button
                  onClick={async () => {
                    setIsSavingEdit(true);
                    try {
                      const res = await fetch(`/api/admin/library/${editTask.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: editStatus, links: editLinks }),
                      });
                      if (!res.ok) throw new Error('Save failed');
                      toast.success('Task updated successfully!');
                      mutate();
                      setEditTask(null);
                    } catch (e: any) {
                      toast.error(e.message || 'Save failed');
                    } finally {
                      setIsSavingEdit(false);
                    }
                  }}
                  disabled={isSavingEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                >
                  {isSavingEdit ? '💾 Saving...' : '💾 Save Changes'}
                </button>
                <button onClick={() => setEditTask(null)} className="px-4 py-2 rounded-xl text-xs bg-white/5 text-slate-400 hover:bg-white/10 transition-colors ml-auto">
                  Cancel
                </button>
              </div>
            }
          >
            <div className="space-y-5">
              {/* Status field */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
                >
                  {['pending', 'processing', 'completed', 'failed'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Source URL (read-only) */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">Source URL</label>
                <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 font-mono break-all">{editTask.url}</div>
              </div>

              {/* Links */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Links ({editLinks.length})</label>
                  <button
                    onClick={() => setEditLinks(prev => [...prev, { name: `Link ${prev.length + 1}`, link: '', finalLink: '', status: 'pending' }])}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-3 h-3" /> Add Link
                  </button>
                </div>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {editLinks.map((link, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={link.name || ''}
                          onChange={e => { const l = [...editLinks]; l[i] = { ...l[i], name: e.target.value }; setEditLinks(l); }}
                          placeholder="Link name (e.g. 480p, 720p HEVC)"
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500/50"
                        />
                        <select
                          value={link.status || 'pending'}
                          onChange={e => { const l = [...editLinks]; l[i] = { ...l[i], status: e.target.value }; setEditLinks(l); }}
                          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none"
                        >
                          {['pending', 'done', 'error', 'failed'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditLinks(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        value={link.finalLink || ''}
                        onChange={e => { const l = [...editLinks]; l[i] = { ...l[i], finalLink: e.target.value }; setEditLinks(l); }}
                        placeholder="Final download URL (optional)"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-400 font-mono focus:outline-none focus:border-emerald-500/30"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
