'use client';

import { useState, ReactNode } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { ToastProvider } from '@/components/admin/Toast';
import { ConfirmProvider } from '@/components/admin/ConfirmDialog';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="flex h-screen bg-[#050505] overflow-hidden">
          {/* Sidebar */}
          <AdminSidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <AdminTopbar onMenuClick={() => setMobileOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
