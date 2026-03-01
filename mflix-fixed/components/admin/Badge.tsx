'use client';

interface BadgeProps {
  status: 'completed' | 'failed' | 'processing' | 'pending' | string;
  label?: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  completed: { label: '✅ Completed', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400' },
  failed:    { label: '❌ Failed',    color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',         dot: 'bg-rose-400' },
  processing:{ label: '🔄 Processing',color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',         dot: 'bg-blue-400 animate-pulse' },
  pending:   { label: '⏳ Pending',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',      dot: 'bg-amber-400' },
  online:    { label: '🟢 Online',    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',dot: 'bg-emerald-400' },
  offline:   { label: '🔴 Offline',   color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',         dot: 'bg-rose-400' },
  warning:   { label: '⚠️ Warning',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',      dot: 'bg-amber-400' },
};

export default function Badge({ status, label, size = 'sm' }: BadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: label || status,
    color: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    dot: 'bg-slate-400',
  };
  const displayLabel = label || config.label;
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.color} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {displayLabel}
    </span>
  );
}
