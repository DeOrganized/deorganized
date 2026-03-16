import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
   id: number;
   message: string;
   type: ToastType;
   duration: number;
}

interface ToastContextType {
   toast: (message: string, type?: ToastType, duration?: number) => void;
   success: (message: string, duration?: number) => void;
   error: (message: string, duration?: number) => void;
   warning: (message: string, duration?: number) => void;
   info: (message: string, duration?: number) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
   const ctx = useContext(ToastContext);
   if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
   return ctx;
};

// ─── Icons & Colors ──────────────────────────────────────────────────────────
const ICONS: Record<ToastType, React.ReactNode> = {
   success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
   error: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
   warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
   info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
};

const BORDER: Record<ToastType, string> = {
   success: 'border-emerald-500/30',
   error: 'border-red-500/30',
   warning: 'border-amber-500/30',
   info: 'border-blue-500/30',
};

const PROGRESS: Record<ToastType, string> = {
   success: 'bg-emerald-400',
   error: 'bg-red-400',
   warning: 'bg-amber-400',
   info: 'bg-blue-400',
};

// ─── Single Toast ────────────────────────────────────────────────────────────
const ToastCard: React.FC<{ item: ToastItem; onDismiss: (id: number) => void }> = ({ item, onDismiss }) => {
   const [progress, setProgress] = useState(100);

   useEffect(() => {
      const start = Date.now();
      const raf = () => {
         const elapsed = Date.now() - start;
         const pct = Math.max(0, 100 - (elapsed / item.duration) * 100);
         setProgress(pct);
         if (pct > 0) requestAnimationFrame(raf);
      };
      const id = requestAnimationFrame(raf);
      return () => cancelAnimationFrame(id);
   }, [item.duration]);

   return (
      <motion.div
         layout
         initial={{ opacity: 0, y: -20, scale: 0.95 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, x: 80, scale: 0.95 }}
         transition={{ type: 'spring', stiffness: 400, damping: 30 }}
         className={`pointer-events-auto w-full max-w-sm bg-surface/95 backdrop-blur-xl border ${BORDER[item.type]} rounded-2xl shadow-2xl shadow-black/20 overflow-hidden`}
      >
         <div className="flex items-start gap-3 px-4 py-3.5">
            {ICONS[item.type]}
            <p className="flex-1 text-sm font-medium text-ink leading-snug">{item.message}</p>
            <button
               onClick={() => onDismiss(item.id)}
               className="text-inkLight hover:text-ink transition-colors shrink-0 mt-0.5"
            >
               <X className="w-4 h-4" />
            </button>
         </div>
         {/* Progress bar */}
         <div className="h-0.5 w-full bg-borderSubtle/30">
            <div
               className={`h-full ${PROGRESS[item.type]} transition-none`}
               style={{ width: `${progress}%` }}
            />
         </div>
      </motion.div>
   );
};

// ─── Provider ────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [toasts, setToasts] = useState<ToastItem[]>([]);
   const idRef = useRef(0);

   const dismiss = useCallback((id: number) => {
      setToasts(prev => prev.filter(t => t.id !== id));
   }, []);

   const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
      const id = ++idRef.current;
      setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]); // max 5 toasts
      setTimeout(() => dismiss(id), duration);
   }, [dismiss]);

   const ctx: ToastContextType = {
      toast,
      success: (msg, dur) => toast(msg, 'success', dur),
      error: (msg, dur) => toast(msg, 'error', dur),
      warning: (msg, dur) => toast(msg, 'warning', dur),
      info: (msg, dur) => toast(msg, 'info', dur),
   };

   return (
      <ToastContext.Provider value={ctx}>
         {children}

         {/* Toast container — top-right, above everything */}
         <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
               {toasts.map(t => (
                  <ToastCard key={t.id} item={t} onDismiss={dismiss} />
               ))}
            </AnimatePresence>
         </div>
      </ToastContext.Provider>
   );
};
