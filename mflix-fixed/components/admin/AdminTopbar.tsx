'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, Bell, Wifi, WifiOff } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/process':    'Process',
  '/queue':      'Queue Manager',
  '/library':    'Movie Library',
  '/analytics':  'Analytics',
  '/logs':       'System Logs',
  '/ai':         'AI Assistant',
  '/settings':   'Settings',
};

interface AdminTopbarProps {
  onMenuClick: () => void;
}

export default function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const pageTitle = pathname ? PAGE_TITLES[pathname] || 'MFLIX PRO' : 'MFLIX PRO';

  const { data: engineData } = useSWR('/api/engine-status', fetcher, { refreshInterval: 60000 });
  const isOnline = engineData?.status === 'online';
  const lastRun = engineData?.lastRunAt;

  // Keyboard shortcut Cmd+K / Ctrl+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/library?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const timeSince = (ts: string) => {
    if (!ts) return 'unknown';
    const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  };

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-white/5 bg-[#080809]/80 backdrop-blur-sm sticky top-0 z-30">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Page title */}
      <h1 className="text-sm font-semibold text-white hidden sm:block">{pageTitle}</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      {searchOpen ? (
        <form onSubmit={handleSearch} className="flex-1 max-w-xs">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
            />
            <kbd className="text-[9px] text-slate-600 border border-white/10 rounded px-1">ESC</kbd>
          </div>
        </form>
      ) : (
        <button
          onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-slate-500 border border-white/5 hover:border-white/10 hover:text-slate-300 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Search</span>
          <kbd className="hidden sm:block text-[9px] text-slate-600 border border-white/10 rounded px-1">⌘K</kbd>
        </button>
      )}

      {/* Engine status */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-medium hidden sm:block">ONLINE</span>
            {lastRun && <span className="text-slate-600 hidden md:block">{timeSince(lastRun)}</span>}
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-rose-400 font-medium hidden sm:block">OFFLINE</span>
          </>
        )}
      </div>

      {/* Notification bell — placeholder */}
      <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
        <Bell className="w-4 h-4" />
      </button>
    </header>
  );
}
