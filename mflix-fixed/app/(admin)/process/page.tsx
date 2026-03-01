'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Plus, X, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/components/admin/Toast';
import Badge from '@/components/admin/Badge';

interface ProcessedTask {
  taskId: string;
  url: string;
  status: 'processing' | 'completed' | 'failed';
  title?: string;
  linksFound?: number;
  linksCompleted?: number;
  error?: string;
}

export default function ProcessPage() {
  const { toast } = useToast();
  const [urls, setUrls] = useState<string[]>(['']);
  const [processing, setProcessing] = useState(false);
  const [tasks, setTasks] = useState<ProcessedTask[]>([]);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');

  const addUrlField = () => setUrls(prev => [...prev, '']);
  const removeUrl = (i: number) => setUrls(prev => prev.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, val: string) => setUrls(prev => prev.map((u, idx) => idx === i ? val : u));

  const handlePaste = (i: number, e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text');
    const lines = pasted.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      e.preventDefault();
      setUrls(prev => {
        const next = [...prev];
        next.splice(i, 1, ...lines);
        return [...next, ''];
      });
    }
  };

  const processUrls = async () => {
    const validUrls = urls.filter(u => u.trim().startsWith('http'));
    if (!validUrls.length) { toast.error('Valid URLs daalo (http se start honge)'); return; }

    setProcessing(true);
    const newTasks: ProcessedTask[] = validUrls.map(url => ({
      taskId: '',
      url,
      status: 'processing' as const,
    }));
    setTasks(prev => [...newTasks, ...prev]);

    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i];
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (data.taskId) {
          setTasks(prev => prev.map(t => t.url === url && !t.taskId
            ? { ...t, taskId: data.taskId, linksFound: data.total || 0 }
            : t
          ));
          // Poll for completion
          pollTask(data.taskId, url);
        } else {
          setTasks(prev => prev.map(t => t.url === url && !t.taskId
            ? { ...t, status: 'failed', error: data.error || 'Failed to create task' }
            : t
          ));
        }
      } catch (err) {
        setTasks(prev => prev.map(t => t.url === url && !t.taskId
          ? { ...t, status: 'failed', error: 'Network error' }
          : t
        ));
      }
    }

    setUrls(['']);
    setProcessing(false);
    toast.success(`${validUrls.length} URL(s) submitted for processing`);
  };

  const pollTask = async (taskId: string, url: string) => {
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch(`/api/tasks?taskId=${taskId}`);
        const data = await res.json();
        const task = data.task || data;
        const links = task.links || [];
        const completedLinks = links.filter((l: Record<string, unknown>) => l.status === 'done' || l.status === 'completed').length;
        const title = task.preview?.title || '';

        setTasks(prev => prev.map(t => t.taskId === taskId
          ? {
              ...t,
              status: task.status === 'completed' ? 'completed' : task.status === 'failed' ? 'failed' : 'processing',
              title,
              linksFound: links.length,
              linksCompleted: completedLinks,
              error: task.error,
            }
          : t
        ));

        if (task.status === 'processing' || task.status === 'pending') {
          if (attempts < 120) { // max 10 min
            attempts++;
            setTimeout(poll, 5000);
          }
        }
      } catch {}
    };
    setTimeout(poll, 3000);
  };

  const clearCompleted = () => setTasks(prev => prev.filter(t => t.status === 'processing'));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">⚡ Process URLs</h2>
        <p className="text-sm text-slate-500">Movie/WebSeries page URLs paste karo — auto extract + bypass karta hai</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['manual', 'auto'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === m ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {m === 'manual' ? '✍️ Manual' : '🤖 Add to Queue'}
          </button>
        ))}
      </div>

      {/* URL inputs */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="space-y-2">
          {urls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={url}
                onChange={e => updateUrl(i, e.target.value)}
                onPaste={e => handlePaste(i, e)}
                placeholder={`https://hdhub4u.fo/movie-name...`}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-colors font-mono"
              />
              {urls.length > 1 && (
                <button onClick={() => removeUrl(i)} className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={addUrlField}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add URL
          </button>
          <div className="flex-1" />
          <button
            onClick={processUrls}
            disabled={processing || urls.every(u => !u.trim())}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {mode === 'manual' ? 'Process Now' : 'Add to Queue'}
          </button>
        </div>

        <p className="text-[10px] text-slate-600">
          💡 Multiple URLs? Paste multiple lines — auto-splits. Supported: hdhub4u, vegamovies, bollyflix, mkv4u etc.
        </p>
      </div>

      {/* Results */}
      <AnimatePresence>
        {tasks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Results ({tasks.length})</h3>
              <button onClick={clearCompleted} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Clear completed
              </button>
            </div>
            {tasks.map((task, i) => (
              <motion.div
                key={task.url + i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-xl p-3"
              >
                <div className="mt-0.5">
                  {task.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : task.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{task.title || task.url}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">{task.url}</p>
                  {task.linksFound !== undefined && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      {task.linksCompleted || 0}/{task.linksFound} links resolved
                    </p>
                  )}
                  {task.error && <p className="text-[10px] text-rose-400 mt-1">{task.error}</p>}
                </div>
                <Badge status={task.status} size="sm" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
