import { ArrowRight, BellRing, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)]"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const isReminder = toast.type === 'reminder';

          const icon = isReminder ? (
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/15 text-[#FF6B00] dark:text-[#FF8524] flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-[#FF6B00]/30">
              <BellRing className="w-4 h-4" />
            </div>
          ) : toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : toast.type === 'error' ? (
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524] shrink-0 mt-0.5" />
          );

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              role={isReminder ? 'status' : undefined}
              className={`flex items-start gap-3 px-4 py-3.5 rounded-xl bg-white dark:bg-slate-900 border shadow-lg text-sm text-slate-800 dark:text-slate-100 ${
                isReminder
                  ? 'border-[#FF6B00]/50 dark:border-[#FF6B00]/60 shadow-[0_8px_28px_rgba(255,107,0,0.18)]'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              {icon}
              <div className="flex-1 min-w-0 space-y-1.5">
                {toast.title && (
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
                    {toast.title}
                  </p>
                )}
                <p className="leading-snug text-slate-800 dark:text-slate-100">{toast.message}</p>
                {toast.action && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        toast.action?.onClick();
                        dismissToast(toast.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors"
                    >
                      <span>{toast.action.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissToast(toast.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Để sau
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 shrink-0"
                aria-label="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
