'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  href?: string;
  color?: 'default' | 'indigo' | 'emerald' | 'rose' | 'amber';
  loading?: boolean;
}

const COLORS = {
  default: 'border-white/5',
  indigo:  'border-indigo-500/20',
  emerald: 'border-emerald-500/20',
  rose:    'border-rose-500/20',
  amber:   'border-amber-500/20',
};

const TREND_COLORS = {
  up:   'text-emerald-400',
  down: 'text-rose-400',
  flat: 'text-slate-500',
};

export default function StatsCard({ icon, label, value, subtitle, trend, href, color = 'default', loading }: StatsCardProps) {
  const router = useRouter();
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={href ? { scale: 1.02 } : undefined}
      onClick={href ? () => router.push(href) : undefined}
      className={`bg-white/[0.03] border rounded-2xl p-4 ${COLORS[color]} ${href ? 'cursor-pointer hover:bg-white/[0.05] transition-colors' : ''}`}
    >
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-3 bg-white/5 rounded w-20" />
          <div className="h-8 bg-white/5 rounded w-16" />
          <div className="h-2 bg-white/5 rounded w-24" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{label}</p>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          <div className="flex items-center gap-2">
            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-0.5 text-[11px] font-medium ${TREND_COLORS[trend.direction]}`}>
                <TrendIcon className="w-3 h-3" />
                {trend.label}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
