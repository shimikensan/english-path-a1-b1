import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileAudio,
  Music,
  Pause,
  Play,
  RotateCcw,
  Save,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  adminSaveClubMusicConfig,
  DEFAULT_CLUB_MUSIC_CONFIG,
  subscribeClubMusicConfig,
} from '../../services/firestoreService';
import type { ClubMusicConfigDoc } from '../../types';
import { ClubMusicEngine } from '../../utils/clubMusicEngine';
import { formatTimestampVi } from '../../utils/helpers';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.webm'];

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return 'Nhạc tích hợp sẵn';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function deriveTitleFromFileName(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function AdminClubMusicTab() {
  const { firebaseUser, profile, addToast } = useApp();

  const [config, setConfig] = useState<ClubMusicConfigDoc>(DEFAULT_CLUB_MUSIC_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Editable form fields
  const [title, setTitle] = useState(DEFAULT_CLUB_MUSIC_CONFIG.title);
  const [artist, setArtist] = useState(DEFAULT_CLUB_MUSIC_CONFIG.artist);
  const [defaultVolume, setDefaultVolume] = useState(DEFAULT_CLUB_MUSIC_CONFIG.defaultVolume);
  const [enabled, setEnabled] = useState(DEFAULT_CLUB_MUSIC_CONFIG.enabled);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Live preview player state
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(DEFAULT_CLUB_MUSIC_CONFIG.defaultVolume);
  const engineRef = useRef<ClubMusicEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const engine = new ClubMusicEngine({
      onPlayingChange: (playing) => setPreviewPlaying(playing),
      onFallbackToBuiltin: (reason) => addToast('info', reason),
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [addToast]);

  useEffect(() => {
    const unsub = subscribeClubMusicConfig((next) => {
      setConfig(next);
      setTitle(next.title || DEFAULT_CLUB_MUSIC_CONFIG.title);
      setArtist(next.artist || '');
      setDefaultVolume(
        typeof next.defaultVolume === 'number' ? next.defaultVolume : DEFAULT_CLUB_MUSIC_CONFIG.defaultVolume
      );
      setEnabled(next.enabled !== false);
      setPreviewVolume(
        typeof next.defaultVolume === 'number' ? next.defaultVolume : DEFAULT_CLUB_MUSIC_CONFIG.defaultVolume
      );
      engineRef.current?.configure(next);
      engineRef.current?.setVolume(
        typeof next.defaultVolume === 'number' ? next.defaultVolume : DEFAULT_CLUB_MUSIC_CONFIG.defaultVolume
      );
      setLoadingConfig(false);
    });
    return () => unsub();
  }, []);

  const handleTogglePreview = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (previewPlaying) {
      engine.pause();
    } else {
      engine.configure(config);
      engine.setVolume(previewVolume);
      const started = await engine.play();
      if (!started) {
        addToast('error', 'Trình duyệt tạm chặn phát âm thanh. Hãy nhấn lại nút Nghe thử.');
      }
    }
  };

  const handlePreviewVolumeChange = (val: number) => {
    setPreviewVolume(val);
    engineRef.current?.setVolume(val);
  };

  const handleFileSelected = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const lowerName = file.name.toLowerCase();
    const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasAllowedExt) {
      addToast('error', 'Chỉ hỗ trợ tệp âm thanh định dạng MP3, WAV, OGG, M4A hoặc WebM.');
      return;
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      addToast('error', 'Kích thước tệp nhạc phải nhỏ hơn 15 MB.');
      return;
    }
    setSelectedFile(file);
    const derived = deriveTitleFromFileName(file.name);
    if (derived) {
      setTitle(derived);
    }
    if (artist === DEFAULT_CLUB_MUSIC_CONFIG.artist) {
      setArtist('Tải lên bởi Quản trị viên');
    }
  };

  const deleteOldUploadedFile = async (storedFileName: string, token: string) => {
    if (!storedFileName || !storedFileName.startsWith('club_bgm_')) return;
    try {
      await fetch(`/api/club/music/files/${encodeURIComponent(storedFileName)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Non-blocking cleanup
    }
  };

  const handleUploadAndApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !selectedFile) return;

    setUploading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const uploadRes = await fetch('/api/club/music/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': selectedFile.type || 'application/octet-stream',
        },
        body: selectedFile,
      });

      const payload = (await uploadRes.json().catch(() => ({}))) as {
        error?: string;
        audioUrl?: string;
        storedFileName?: string;
        mimeType?: string;
        fileSizeBytes?: number;
      };

      if (!uploadRes.ok || !payload.audioUrl || !payload.storedFileName) {
        throw new Error(payload.error || 'Không thể tải tệp âm thanh lên máy chủ.');
      }

      const previousStoredFile = config.storedFileName;
      const saved = await adminSaveClubMusicConfig({
        mode: 'uploaded',
        title: title.trim() || deriveTitleFromFileName(selectedFile.name) || 'Nhạc nền Câu lạc bộ 3D',
        artist: artist.trim(),
        audioUrl: payload.audioUrl,
        fileName: selectedFile.name,
        storedFileName: payload.storedFileName,
        mimeType: payload.mimeType || selectedFile.type || 'audio/mpeg',
        fileSizeBytes: payload.fileSizeBytes || selectedFile.size,
        defaultVolume,
        enabled,
        adminUid: firebaseUser.uid,
        adminName: profile?.fullName || firebaseUser.displayName || 'Quản trị viên',
      });

      setConfig(saved);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (previousStoredFile && previousStoredFile !== payload.storedFileName) {
        await deleteOldUploadedFile(previousStoredFile, token);
      }

      addToast('success', `Đã áp dụng nhạc nền mới "${saved.title}" cho toàn bộ Câu lạc bộ 3D!`);
    } catch (error) {
      addToast(
        'error',
        error instanceof Error ? error.message : 'Lỗi khi tải lên tệp nhạc nền.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettingsOnly = async () => {
    if (!firebaseUser) return;
    setSavingMeta(true);
    try {
      const saved = await adminSaveClubMusicConfig({
        mode: config.mode,
        title: title.trim() || config.title,
        artist: artist.trim(),
        audioUrl: config.mode === 'uploaded' ? config.audioUrl : '',
        fileName: config.mode === 'uploaded' ? config.fileName : '',
        storedFileName: config.mode === 'uploaded' ? config.storedFileName : '',
        mimeType: config.mode === 'uploaded' ? config.mimeType : '',
        fileSizeBytes: config.mode === 'uploaded' ? config.fileSizeBytes : 0,
        defaultVolume,
        enabled,
        adminUid: firebaseUser.uid,
        adminName: profile?.fullName || firebaseUser.displayName || 'Quản trị viên',
      });
      setConfig(saved);
      addToast('success', 'Đã lưu cài đặt nhạc nền Câu lạc bộ 3D.');
    } catch (error) {
      addToast(
        'error',
        error instanceof Error ? error.message : 'Không thể lưu cài đặt nhạc nền.'
      );
    } finally {
      setSavingMeta(false);
    }
  };

  const handleRestoreDefault = async () => {
    if (!firebaseUser) return;
    setRestoring(true);
    try {
      const previousStoredFile = config.storedFileName;
      const saved = await adminSaveClubMusicConfig({
        mode: 'builtin_see_you_again',
        title: DEFAULT_CLUB_MUSIC_CONFIG.title,
        artist: DEFAULT_CLUB_MUSIC_CONFIG.artist,
        audioUrl: '',
        fileName: '',
        storedFileName: '',
        mimeType: '',
        fileSizeBytes: 0,
        defaultVolume: DEFAULT_CLUB_MUSIC_CONFIG.defaultVolume,
        enabled: true,
        adminUid: firebaseUser.uid,
        adminName: profile?.fullName || firebaseUser.displayName || 'Quản trị viên',
      });
      setConfig(saved);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (previousStoredFile) {
        const token = await firebaseUser.getIdToken();
        await deleteOldUploadedFile(previousStoredFile, token);
      }
      addToast('success', 'Đã khôi phục bài nhạc nền mặc định "See You Again (Piano Lounge)".');
    } catch (error) {
      addToast(
        'error',
        error instanceof Error ? error.message : 'Không thể khôi phục bài nhạc mặc định.'
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Active Track & Live Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/12 text-[#D94E00] dark:text-[#FF8524] flex items-center justify-center shrink-0">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Đang phát trong Câu lạc bộ 3D
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    config.mode === 'uploaded'
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}
                >
                  {config.mode === 'uploaded' ? 'File Admin tải lên' : 'Mặc định · See You Again'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    config.enabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {config.enabled ? 'Đang bật' : 'Đang tắt'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {loadingConfig ? 'Đang tải cấu hình...' : config.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {config.artist || 'Nhạc nền Câu lạc bộ Tiếng Anh 3D'}
                {config.mode === 'uploaded' && config.fileName
                  ? ` · ${config.fileName} (${formatFileSize(config.fileSizeBytes)})`
                  : ' · Hòa âm Piano & Strings trực tiếp không cần tải tệp ngoài'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Cập nhật bởi {config.updatedByName || 'Hệ thống'}
                {config.updatedAt ? ` · ${formatTimestampVi(config.updatedAt)}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void handleTogglePreview()}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                previewPlaying
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-[#FF6B00] hover:bg-[#E55E00] text-white'
              }`}
            >
              {previewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {previewPlaying ? 'Dừng nghe thử' : 'Nghe thử bài hiện tại'}
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
              {previewVolume <= 0.01 ? (
                <VolumeX className="w-4 h-4 text-slate-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              )}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={previewVolume}
                onChange={(e) => handlePreviewVolumeChange(Number(e.target.value))}
                className="w-24 accent-[#FF6B00]"
                aria-label="Âm lượng nghe thử"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-9 text-right tabular-nums">
                {Math.round(previewVolume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload & Customize Form */}
      <form
        onSubmit={(e) => void handleUploadAndApply(e)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
              Tải lên bài nhạc mới để thay đổi nhạc nền CLB 3D
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hỗ trợ MP3, WAV, OGG, M4A, WebM (tối đa 15 MB). Khi áp dụng, tất cả học viên đang ở
              trong Câu lạc bộ 3D sẽ tự động cập nhật bài nhạc mới.
            </p>
          </div>
          {config.mode === 'uploaded' && (
            <button
              type="button"
              onClick={() => void handleRestoreDefault()}
              disabled={restoring || uploading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {restoring ? 'Đang khôi phục...' : 'Khôi phục bài See You Again'}
            </button>
          )}
        </div>

        {/* File Picker Zone */}
        <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <FileAudio className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {selectedFile ? selectedFile.name : 'Chưa chọn tệp nhạc mới'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedFile
                    ? `Dung lượng: ${formatFileSize(selectedFile.size)} · Sẵn sàng tải lên`
                    : 'Chọn tệp .mp3, .wav, .ogg, .m4a hoặc .webm từ máy tính (≤ 15 MB)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.ogg,.m4a,.webm,audio/*"
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
                className="hidden"
                id="club-music-file-input"
              />
              <label
                htmlFor="club-music-file-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-[#FF6B00] text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#FF6B00]" />
                Chọn tệp nhạc
              </label>
            </div>
          </div>
        </div>

        {/* Track Metadata & Playback Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="club-music-title"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Tên bài hát hiển thị trong CLB 3D
            </label>
            <input
              id="club-music-title"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: See You Again (Piano Lounge)"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div>
            <label
              htmlFor="club-music-artist"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Nghệ sĩ / Ghi chú (tùy chọn)
            </label>
            <input
              id="club-music-artist"
              type="text"
              maxLength={100}
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="VD: Charlie Puth ft. Wiz Khalifa / Piano Cover"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Âm lượng mặc định khi học viên vào phòng
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Khuyên dùng 30%–50% để học viên vẫn dễ nghe giọng đọc tiếng Anh
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={defaultVolume}
                onChange={(e) => setDefaultVolume(Number(e.target.value))}
                className="w-24 accent-[#FF6B00]"
                aria-label="Âm lượng mặc định"
              />
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 w-9 text-right tabular-nums">
                {Math.round(defaultVolume * 100)}%
              </span>
            </div>
          </div>

          <label className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Bật nhạc nền trong Câu lạc bộ 3D
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Học viên vẫn có nút tắt/bật và chỉnh âm lượng riêng trong phòng
              </p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#FF6B00] rounded"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Tệp tải lên được kiểm tra định dạng nhị phân an toàn trên máy chủ.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleSaveSettingsOnly()}
              disabled={savingMeta || uploading || restoring}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingMeta ? 'Đang lưu...' : 'Lưu thông tin & cài đặt'}
            </button>

            <button
              type="submit"
              disabled={!selectedFile || uploading || savingMeta || restoring}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E55E00] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Đang tải nhạc lên...' : 'Tải lên & Áp dụng ngay'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
