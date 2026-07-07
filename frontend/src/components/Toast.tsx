import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function Toast({ toasts, removeToast }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        
        return (
          <div 
            key={toast.id}
            className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xl transition-all duration-300 transform translate-y-0 glass-panel ${
              isSuccess 
                ? 'border-emerald-500/25 bg-emerald-950/25 text-emerald-300' 
                : isError 
                ? 'border-rose-500/25 bg-rose-950/25 text-rose-300' 
                : 'border-blue-500/25 bg-blue-950/25 text-blue-300'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess ? (
                <CheckCircle size={18} className="text-emerald-400" />
              ) : isError ? (
                <AlertCircle size={18} className="text-rose-400" />
              ) : (
                <Info size={18} className="text-blue-400" />
              )}
            </div>

            <div className="flex-1 text-sm font-medium">{toast.message}</div>

            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
