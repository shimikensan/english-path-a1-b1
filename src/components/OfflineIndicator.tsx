import React from 'react';
import { BookMarked, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  onOpenSavedWords?: () => void;
  showSavedShortcut?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  onOpenSavedWords,
  showSavedShortcut = false,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)] flex flex-wrap items-center gap-2.5 rounded-xl bg-amber-600 dark:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-amber-400/50"
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
        <span>Chế độ ngoại tuyến — Đang dùng dữ liệu bộ nhớ đệm</span>
      </span>
      {showSavedShortcut && onOpenSavedWords && (
        <button
          type="button"
          onClick={onOpenSavedWords}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-950/25 hover:bg-slate-950/40 px-2.5 py-1 text-[11px] font-bold text-white transition-colors whitespace-nowrap"
        >
          <BookMarked className="w-3 h-3" />
          Xem từ đã học
        </button>
      )}
    </div>
  );
};
