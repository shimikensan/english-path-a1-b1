import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Đã xảy ra lỗi không mong muốn.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.message;
      let isQuota =
        friendlyMessage.includes('Quota limit exceeded') ||
        friendlyMessage.includes('Quota exceeded') ||
        friendlyMessage.includes('Free daily read units');
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          if (
            String(parsed.error).includes('Quota limit exceeded') ||
            String(parsed.error).includes('Quota exceeded') ||
            String(parsed.error).includes('Free daily read units')
          ) {
            isQuota = true;
          } else {
            friendlyMessage = `Lỗi truy cập dữ liệu (${parsed.operationType || 'firestore'}): ${parsed.error}`;
          }
        }
      } catch {
        // Keep raw message if not JSON
      }

      if (isQuota) {
        friendlyMessage =
          'Cơ sở dữ liệu Cloud Firestore đã chạm giới hạn lượt đọc miễn phí trong ngày (Spark Free Tier). Hạn mức sẽ tự động đặt lại vào ngày mai hoặc sau khi nâng cấp gói cơ sở dữ liệu trên Firebase Console.';
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Đã xảy ra sự cố tạm thời
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 break-words">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tải lại ứng dụng
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
