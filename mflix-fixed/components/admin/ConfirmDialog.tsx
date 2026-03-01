'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Modal from './Modal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const handleClose = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const variantColors = {
    danger:  { btn: 'bg-rose-600 hover:bg-rose-500 text-white', icon: '🗑️' },
    warning: { btn: 'bg-amber-600 hover:bg-amber-500 text-white', icon: '⚠️' },
    info:    { btn: 'bg-indigo-600 hover:bg-indigo-500 text-white', icon: 'ℹ️' },
  };
  const variant = state?.options.variant || 'danger';
  const colors = variantColors[variant];

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={!!state}
        onClose={() => handleClose(false)}
        title={`${colors.icon} ${state?.options.title || 'Confirm'}`}
        size="sm"
        footer={
          <>
            <button
              onClick={() => handleClose(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              {state?.options.cancelText || 'Cancel'}
            </button>
            <button
              onClick={() => handleClose(true)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${colors.btn}`}
            >
              {state?.options.confirmText || 'Confirm'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">{state?.options.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
