import { motion, AnimatePresence } from 'motion/react';
import { useToastStore, type Toast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 md:p-6 w-full md:w-auto md:max-w-md flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={cn(
              "pointer-events-auto flex items-start gap-4 p-4 rounded-lg shadow-xl border bg-[#111726]/90 backdrop-blur-md",
              {
                "border-white/[0.08]": !toast.type || toast.type === 'default',
                "border-emerald-500/20": toast.type === 'success',
                "border-amber-500/20": toast.type === 'warning',
                "border-rose-500/20": toast.type === 'error',
              }
            )}
          >
            <div className="flex-1">
              <h4 className={cn("text-sm font-semibold selection:bg-blue-500/30", {
                "text-slate-100": !toast.type || toast.type === 'default',
                "text-emerald-400": toast.type === 'success',
                "text-amber-400": toast.type === 'warning',
                "text-rose-400": toast.type === 'error',
              })}>{toast.title}</h4>
              {toast.description && (
                <p className="mt-1 text-sm text-slate-400">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
