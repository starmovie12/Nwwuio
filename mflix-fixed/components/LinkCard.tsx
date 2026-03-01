'use client';
import {
  Clock, Loader2, CheckCircle2, XCircle, Copy, Check,
  ExternalLink, RefreshCw, Zap, Database, AlertCircle,
  Terminal, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LogEntry {
  msg: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

interface LinkCardProps {
  id: number;
  name: string;
  logs: LogEntry[];
  finalLink: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  link?: string;
  onRetry?: () => void;
  cachedResult?: boolean;
}

// ── Domain metadata ────────────────────────────────────────────────────────────
function getDomainBadge(linkUrl: string): { label: string; color: string; bg: string } {
  if (!linkUrl) return { label: 'Direct', color: 'text-zinc-400', bg: 'bg-zinc-800/60' };
  const url = linkUrl.toLowerCase();
  if (url.includes('hubcloud'))     return { label: 'HubCloud',  color: 'text-sky-400',     bg: 'bg-sky-900/30' };
  if (url.includes('hubdrive'))     return { label: 'HubDrive',  color: 'text-violet-400',  bg: 'bg-violet-900/30' };
  if (url.includes('hubcdn'))       return { label: 'HubCDN',    color: 'text-amber-400',   bg: 'bg-amber-900/30' };
  if (url.includes('hblinks'))      return { label: 'HBLinks',   color: 'text-pink-400',    bg: 'bg-pink-900/30' };
  if (url.includes('gdflix'))       return { label: 'GDFlix',    color: 'text-cyan-400',    bg: 'bg-cyan-900/30' };
  if (url.includes('drivehub'))     return { label: 'DriveHub',  color: 'text-teal-400',    bg: 'bg-teal-900/30' };
  if (url.includes('filepress'))    return { label: 'FilePress', color: 'text-blue-400',    bg: 'bg-blue-900/30' };
  if (url.includes('hubstream'))    return { label: 'HubStream', color: 'text-indigo-400',  bg: 'bg-indigo-900/30' };
  if (url.includes('kolop'))        return { label: 'Kolop',     color: 'text-purple-400',  bg: 'bg-purple-900/30' };
  if (
    url.includes('gadgetsweb') ||
    url.includes('review-tech') ||
    url.includes('ngwin') ||
    url.includes('cryptoinsights') ||
    url.includes('techbigs') ||
    url.includes('apkdone') ||
    url.includes('linkvertise') ||
    url.includes('ouo.io') ||
    url.includes('shrinkme')
  ) return { label: 'Timer',   color: 'text-orange-400', bg: 'bg-orange-900/30' };
  return { label: 'Direct', color: 'text-zinc-400', bg: 'bg-zinc-800/60' };
}

function getLogColor(type: string): string {
  switch (type) {
    case 'success': return 'text-emerald-400 font-semibold';
    case 'error':   return 'text-rose-400';
    case 'warn':    return 'text-amber-400';
    case 'info':    return 'text-sky-400';
    default:        return 'text-zinc-400';
  }
}

// Estimate file size from URL or name
function estimateQuality(name: string): { label: string; color: string } | null {
  const n = name.toLowerCase();
  if (n.includes('2160') || n.includes('4k') || n.includes('uhd'))  return { label: '4K',   color: 'text-yellow-400' };
  if (n.includes('1080'))  return { label: '1080p', color: 'text-emerald-400' };
  if (n.includes('720'))   return { label: '720p',  color: 'text-sky-400' };
  if (n.includes('480'))   return { label: '480p',  color: 'text-zinc-400' };
  return null;
}

export default function LinkCard({
  id, name, logs, finalLink, status, link = '', onRetry, cachedResult = false,
}: LinkCardProps) {
  const [copied,       setCopied]      = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const logEndRef  = useRef<HTMLDivElement>(null);
  const domainBadge = getDomainBadge(link || finalLink || '');
  const quality     = estimateQuality(name);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = useCallback(async (url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(50);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // ── PENDING ──────────────────────────────────────────────────────────────────
  if (status === 'pending') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: id * 0.04, duration: 0.3 }}
        className="relative p-4 rounded-2xl border border-zinc-800/70 border-l-4 border-l-zinc-700 bg-zinc-900/40"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>
              <Clock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            </motion.div>
            <span className="text-zinc-400 text-sm font-mono truncate">{name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {quality && <span className={`text-[10px] font-bold ${quality.color}`}>{quality.label}</span>}
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${domainBadge.bg} ${domainBadge.color}`}>{domainBadge.label}</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">QUEUED</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── PROCESSING ───────────────────────────────────────────────────────────────
  if (status === 'processing') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: id * 0.04, duration: 0.3 }}
        className="relative p-4 rounded-2xl border border-indigo-800/40 border-l-4 border-l-indigo-500 bg-indigo-950/25 overflow-hidden"
      >
        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent pointer-events-none"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <div className="flex items-center justify-between mb-2 relative">
          <div className="flex items-center gap-2 min-w-0">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            </motion.div>
            <span className="text-indigo-300 text-sm font-mono truncate">{name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {quality && <span className={`text-[10px] font-bold ${quality.color}`}>{quality.label}</span>}
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${domainBadge.bg} ${domainBadge.color}`}>{domainBadge.label}</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 text-[10px] font-semibold uppercase tracking-wider animate-pulse">
              SOLVING...
            </span>
          </div>
        </div>

        {/* Live Logs */}
        <div ref={logEndRef} className="relative bg-black/60 border border-white/5 p-2.5 rounded-xl font-mono text-[11px] max-h-[110px] overflow-y-auto space-y-0.5">
          {logs.length === 0 ? (
            <div className="text-zinc-600 animate-pulse"><span className="text-zinc-700 mr-1">›</span>Initializing solver chain...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`leading-relaxed ${getLogColor(log.type)}`}>
                <span className="text-zinc-700 mr-1">›</span>{log.msg}
              </div>
            ))
          )}
          <div className="flex items-center gap-1 text-zinc-600 mt-0.5">
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>█</motion.span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (status === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: id * 0.04, duration: 0.35, ease: 'easeOut' }}
        className="relative p-4 rounded-2xl border border-emerald-800/40 border-l-4 border-l-emerald-500 bg-emerald-950/20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-2.5 relative">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-white font-semibold text-sm font-mono truncate">{name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {cachedResult && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                <Zap className="w-3 h-3" />CACHE
              </span>
            )}
            {quality && <span className={`text-[10px] font-bold ${quality.color}`}>{quality.label}</span>}
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${domainBadge.bg} ${domainBadge.color}`}>{domainBadge.label}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">✓ DONE</span>
          </div>
        </div>

        {/* Collapsible Logs */}
        {logs.length > 0 && (
          <div className="mb-2.5">
            <button
              onClick={() => setLogsExpanded(v => !v)}
              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors mb-1"
            >
              <Terminal className="w-3 h-3" />
              {logsExpanded ? 'Hide' : 'Show'} logs ({logs.length})
              {logsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {logsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div ref={logEndRef} className="bg-black/40 border border-white/5 p-2 rounded-xl font-mono text-[10px] max-h-[90px] overflow-y-auto space-y-0.5">
                    {logs.map((log, i) => (
                      <div key={i} className={`leading-relaxed ${getLogColor(log.type)}`}>
                        <span className="text-zinc-700 mr-1">›</span>{log.msg}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {finalLink && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {/* Link Preview */}
              <div className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-2.5 group">
                <Database className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="font-mono text-xs text-emerald-300/80 truncate flex-1">{finalLink}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(finalLink)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/70 hover:border-emerald-600/60 transition-all active:scale-95"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="copied"
                        initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
                        className="flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-emerald-300">COPIED!</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
                        className="flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />COPY LINK
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <a
                  href={finalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-zinc-300 text-xs font-semibold hover:bg-zinc-700/60 hover:text-white transition-all active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" /><span>OPEN</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: id * 0.04, duration: 0.3 }}
      className="relative p-4 rounded-2xl border border-rose-800/40 border-l-4 border-l-rose-500 bg-rose-950/20 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="flex items-center justify-between mb-2 relative">
        <div className="flex items-center gap-2 min-w-0">
          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="text-rose-300 text-sm font-mono truncate">{name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {quality && <span className={`text-[10px] font-bold ${quality.color}`}>{quality.label}</span>}
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${domainBadge.bg} ${domainBadge.color}`}>{domainBadge.label}</span>
          <span className="px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-400 text-[10px] font-semibold uppercase tracking-wider">✗ FAILED</span>
        </div>
      </div>

      {logs.length > 0 && (
        <div ref={logEndRef} className="bg-black/40 border border-white/5 p-2 rounded-xl font-mono text-[10px] max-h-[70px] overflow-y-auto space-y-0.5 mb-2.5 opacity-75">
          {logs.slice(-4).map((log, i) => (
            <div key={i} className={`leading-relaxed ${getLogColor(log.type)}`}>
              <span className="text-zinc-700 mr-1">›</span>{log.msg}
            </div>
          ))}
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-rose-900/30 border border-rose-700/40 text-rose-300 text-xs font-semibold hover:bg-rose-900/60 hover:text-rose-200 transition-all active:scale-95"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry this link</span>
        </button>
      )}

      {!onRetry && (
        <div className="flex items-center gap-1.5 text-rose-500/60 text-[11px]">
          <AlertCircle className="w-3 h-3" />
          <span>Solver failed — Auto-Pilot will retry on next run</span>
        </div>
      )}
    </motion.div>
  );
}
