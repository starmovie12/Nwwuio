'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Zap, ListOrdered, Film, BarChart3,
  ScrollText, Brain, Settings, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  badge?: number | null;
}

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Get queue count for badge
  const { data: statsData } = useSWR('/api/admin/stats', fetcher, { refreshInterval: 30000 });
  const pendingQueue = statsData?.stats?.queuePending || 0;

  const NAV_ITEMS: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard' },
    { icon: Zap,             label: 'Process',      href: '/process' },
    { icon: ListOrdered,     label: 'Queue',        href: '/queue',      badge: pendingQueue || null },
    { icon: Film,            label: 'Library',       href: '/library' },
    { icon: BarChart3,       label: 'Analytics',    href: '/analytics' },
    { icon: ScrollText,      label: 'Logs',         href: '/logs' },
    { icon: Brain,           label: 'AI Assistant', href: '/ai' },
    { icon: Settings,        label: 'Settings',     href: '/settings' },
  ];

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? 'w-full' : ''}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${collapsed && !mobile ? 'justify-center px-0' : ''}`}>
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
          <span className="text-white font-black text-xs">M</span>
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="text-sm font-bold text-white">MFLIX PRO</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Admin Panel</p>
          </div>
        )}
        {mobile && (
          <button onClick={onMobileClose} className="ml-auto p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={mobile ? onMobileClose : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-300 border-l-2 border-indigo-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              } ${collapsed && !mobile ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
              {(!collapsed || mobile) && <span>{item.label}</span>}
              {(!collapsed || mobile) && item.badge ? (
                <span className="ml-auto text-[10px] bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
              {/* Tooltip on collapsed */}
              {collapsed && !mobile && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1e] border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                  {item.label}
                  {item.badge ? ` (${item.badge})` : ''}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!mobile && (
        <div className="px-2 pb-4">
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 text-xs transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2 }}
        className="hidden lg:flex flex-col h-screen bg-[#080809] border-r border-white/5 overflow-hidden shrink-0 sticky top-0"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-[#080809] border-r border-white/5 z-50 lg:hidden"
            >
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
