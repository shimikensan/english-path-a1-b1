import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Lock background scroll & support Escape key while iOS install modal is open
  useEffect(() => {
    if (!showIOSGuide) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowIOSGuide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showIOSGuide]);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        title="Cài đặt ứng dụng để học và xem lại từ vựng ngay cả khi ngoại tuyến"
        className={`inline-flex items-center gap-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF7E1F] text-white font-semibold shadow-xs transition-colors whitespace-nowrap ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-2.5 sm:px-3 py-2 text-xs'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className={compact ? '' : 'hidden sm:inline'}>Cài ứng dụng</span>
      </button>
    );
  }

  if (isIOS) {
    const iosGuideModal =
      showIOSGuide && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-pwa-guide-title"
              onClick={() => setShowIOSGuide(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-2xl space-y-4 my-auto"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3
                      id="ios-pwa-guide-title"
                      className="text-base font-bold text-slate-900 dark:text-white"
                    >
                      Cài đặt trên iPhone / iPad
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Mở ứng dụng nhanh và ôn từ vựng ngay cả khi mất mạng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide(false)}
                    className="p-2 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition-colors cursor-pointer"
                    aria-label="Đóng hướng dẫn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300 list-decimal pl-5 leading-relaxed">
                  <li>
                    Nhấn biểu tượng{' '}
                    <strong className="inline-flex items-center gap-1 text-slate-900 dark:text-white">
                      Chia sẻ <Share className="w-3.5 h-3.5 inline shrink-0" />
                    </strong>{' '}
                    trên thanh công cụ Safari.
                  </li>
                  <li>
                    Cuộn xuống và chọn{' '}
                    <strong className="text-slate-900 dark:text-white">
                      Thêm vào Màn hình chính
                    </strong>{' '}
                    (Add to Home Screen).
                  </li>
                  <li>
                    Nhấn <strong className="text-slate-900 dark:text-white">Thêm</strong> để hoàn tất cài đặt.
                  </li>
                </ol>

                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] active:scale-[0.99] py-3 text-sm font-bold text-white transition-all cursor-pointer"
                >
                  Đã hiểu
                </button>
              </div>
            </div>,
            document.body
          )
        : null;

    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Hướng dẫn cài đặt ứng dụng lên màn hình chính iPhone / iPad"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/15 px-2.5 sm:px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Cài lên iOS</span>
        </button>

        {iosGuideModal}
      </>
    );
  }

  return null;
};
