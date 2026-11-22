import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  GraduationCap,
  HeartPulse,
  Layers,
  MessageCircleHeart,
  Repeat,
  Target,
} from 'lucide-react';
import type { LearnerCEFRLevel, ReadingPassageDoc } from '../../types';

export type TopicPracticeLevel = 'ALL' | LearnerCEFRLevel;

interface TopicPracticeBoardProps {
  passages: ReadingPassageDoc[];
  readSet: Set<string>;
  selectedLevel: TopicPracticeLevel;
  userLevel?: LearnerCEFRLevel;
  onSelectLevel: (level: TopicPracticeLevel) => void;
  onStartTopic: (category: string) => void;
}

interface LevelMeta {
  id: TopicPracticeLevel;
  label: string;
  shortDesc: string;
  guide: string;
  featured?: boolean;
}

export const TOPIC_LEVEL_META: LevelMeta[] = [
  {
    id: 'A1',
    label: 'Cấp độ A1',
    shortDesc: 'Cơ bản',
    guide: 'Câu văn ngắn gọn, từ vựng quen thuộc hằng ngày — lý tưởng cho người mới xây thói quen đọc hiểu.',
    featured: true,
  },
  {
    id: 'A2',
    label: 'Cấp độ A2',
    shortDesc: 'Sơ cấp',
    guide: 'Đoạn văn đời sống rõ ràng, nhiều cụm từ giao tiếp thiết thực — giúp tăng tốc độ đọc hiểu ngữ cảnh.',
    featured: true,
  },
  {
    id: 'B1',
    label: 'Cấp độ B1',
    shortDesc: 'Trung cấp',
    guide: 'Bài đọc giàu chiều sâu cuộc sống, kết hợp thành ngữ & cấu trúc tự nhiên như mẫu "No Pain, No Gain".',
    featured: true,
  },
  {
    id: 'B2',
    label: 'Cấp độ B2',
    shortDesc: 'Trên trung cấp',
    guide: 'Lập luận sắc sảo, từ vựng học thuật & công việc hiện đại — rèn tư duy phản biện bằng tiếng Anh.',
  },
  {
    id: 'C1',
    label: 'Cấp độ C1',
    shortDesc: 'Cao cấp',
    guide: 'Bài viết chuyên sâu giàu sắc thái tu từ — mở rộng vốn diễn đạt tinh tế và tư duy song ngữ.',
  },
  {
    id: 'ALL',
    label: 'Tất cả',
    shortDesc: 'A1 – C1',
    guide: 'Luyện toàn bộ bài đọc trong từng chủ đề từ cơ bản đến nâng cao theo lộ trình liên mạch.',
  },
];

interface CategoryVisual {
  description: string;
  icon: typeof Flame;
  accentText: string;
  accentBg: string;
}

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  'Động lực & Cuộc sống': {
    description: 'Bản lĩnh vượt thử thách, tư duy tích cực và ý nghĩa từ những bước đi nhỏ mỗi ngày.',
    icon: Flame,
    accentText: 'text-[#D94E00] dark:text-[#FF8524]',
    accentBg: 'bg-[#FF6B00]/12 border-[#FF6B00]/25',
  },
  'Thói quen tích cực': {
    description: 'Quản lý thời gian, xây nếp sống kỷ luật và giữ sự tập trung giữa thế giới bận rộn.',
    icon: Repeat,
    accentText: 'text-amber-700 dark:text-amber-400',
    accentBg: 'bg-amber-500/12 border-amber-500/25',
  },
  'Giao tiếp & Ứng xử': {
    description: 'Lắng nghe chủ động, tạo thiện cảm, góp ý tinh tế và gìn giữ những mối quan hệ bền chặt.',
    icon: MessageCircleHeart,
    accentText: 'text-sky-700 dark:text-sky-400',
    accentBg: 'bg-sky-500/12 border-sky-500/25',
  },
  'Sức khỏe & Cân bằng': {
    description: 'Giấc ngủ, vận động nhẹ nhàng, dinh dưỡng và cách chăm sóc sức khỏe tinh thần dài lâu.',
    icon: HeartPulse,
    accentText: 'text-emerald-700 dark:text-emerald-400',
    accentBg: 'bg-emerald-500/12 border-emerald-500/25',
  },
  'Học tập & Sự nghiệp': {
    description: 'Phương pháp học ngoại ngữ hiệu quả, tư duy giải quyết vấn đề và phát triển sự nghiệp bền vững.',
    icon: GraduationCap,
    accentText: 'text-indigo-700 dark:text-indigo-400',
    accentBg: 'bg-indigo-500/12 border-indigo-500/25',
  },
  'Trải nghiệm & Khám phá': {
    description: 'Du lịch chậm, ẩm thực, văn hóa địa phương và nghệ thuật quan sát vẻ đẹp đời thường.',
    icon: Compass,
    accentText: 'text-rose-700 dark:text-rose-400',
    accentBg: 'bg-rose-500/12 border-rose-500/25',
  },
};

export function TopicPracticeBoard({
  passages,
  readSet,
  selectedLevel,
  userLevel,
  onSelectLevel,
  onStartTopic,
}: TopicPracticeBoardProps) {
  const levelCounts = new Map<TopicPracticeLevel, { total: number; done: number }>();
  for (const meta of TOPIC_LEVEL_META) {
    const list = meta.id === 'ALL' ? passages : passages.filter((p) => p.levelId === meta.id);
    levelCounts.set(meta.id, {
      total: list.length,
      done: list.filter((p) => readSet.has(p.passageId)).length,
    });
  }

  const levelPassages =
    selectedLevel === 'ALL' ? passages : passages.filter((p) => p.levelId === selectedLevel);

  const categoryOrder: string[] = [];
  const byCategory = new Map<string, ReadingPassageDoc[]>();
  passages.forEach((p) => {
    const cat = p.category?.trim() || 'Động lực & Cuộc sống';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
      categoryOrder.push(cat);
    }
    if (selectedLevel === 'ALL' || p.levelId === selectedLevel) {
      byCategory.get(cat)!.push(p);
    }
  });

  const activeMeta =
    TOPIC_LEVEL_META.find((m) => m.id === selectedLevel) ?? TOPIC_LEVEL_META[0];
  const activeLevelStats = levelCounts.get(selectedLevel) ?? { total: 0, done: 0 };

  return (
    <div className="space-y-6">
      {/* Step 1: CEFR Level Selector */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
              <Target className="w-3.5 h-3.5" />
              <span>Bước 1 · Chọn cấp độ phù hợp với khả năng hiện tại</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Lọc kho {passages.length} bài đọc theo trình độ CEFR
            </h3>
          </div>

          {userLevel && selectedLevel !== userLevel && (
            <button
              type="button"
              onClick={() => onSelectLevel(userLevel)}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/20 text-xs font-bold transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              Khớp trình độ của bạn (CEFR {userLevel})
            </button>
          )}
        </div>

        {/* CEFR Level Cards (A1, A2, B1 highlighted first, then B2, C1, ALL) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {TOPIC_LEVEL_META.map((meta) => {
            const stats = levelCounts.get(meta.id) ?? { total: 0, done: 0 };
            const isSelected = selectedLevel === meta.id;
            const isUserCurrent = userLevel === meta.id;
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => onSelectLevel(meta.id)}
                className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-[0_6px_18px_-6px_rgba(255,107,0,0.55)]'
                    : meta.featured
                      ? 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-700 hover:border-[#FF6B00]/60 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#FF6B00]/45 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-extrabold tracking-tight">
                    {meta.id === 'ALL' ? 'Tất cả' : meta.id}
                  </span>
                  {isUserCurrent && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#FF6B00]/15 text-[#D94E00] dark:text-[#FF8524]'
                      }`}
                    >
                      Của bạn
                    </span>
                  )}
                </div>

                <div>
                  <p
                    className={`text-[11px] font-semibold ${
                      isSelected ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {meta.shortDesc}
                  </p>
                  <p
                    className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                      isSelected ? 'text-white/90' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {stats.done}/{stats.total} bài
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Level Guidance Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-white">{activeMeta.label}:</strong>{' '}
            {activeMeta.guide}
          </p>
          <span className="shrink-0 font-bold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
            {activeLevelStats.total} bài sẵn sàng · {activeLevelStats.done} đã hoàn thành
          </span>
        </div>
      </section>

      {/* Step 2: Topic Practice Grid */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Bước 2 · Chọn chủ đề bạn muốn luyện tập</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              6 chủ đề cuộc sống{' '}
              <span className="text-[#D94E00] dark:text-[#FF8524]">
                ({selectedLevel === 'ALL' ? 'Tất cả cấp độ' : `Cấp độ ${selectedLevel}`} · {levelPassages.length} bài)
              </span>
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categoryOrder.map((category) => {
            const list = byCategory.get(category) ?? [];
            const doneCount = list.filter((p) => readSet.has(p.passageId)).length;
            const totalMinutes = list.reduce((sum, p) => sum + (p.estimatedMinutes || 3), 0);
            const percent = list.length > 0 ? Math.round((doneCount / list.length) * 100) : 0;
            const isComplete = list.length > 0 && doneCount === list.length;

            const visual = CATEGORY_VISUALS[category] ?? {
              description: 'Tuyển chọn bài đọc song ngữ gần gũi giúp mở rộng vốn từ và phản xạ đọc hiểu.',
              icon: BookOpenText,
              accentText: 'text-[#D94E00] dark:text-[#FF8524]',
              accentBg: 'bg-[#FF6B00]/12 border-[#FF6B00]/25',
            };
            const Icon = visual.icon;
            const previewItems = list.slice(0, 2);

            return (
              <div
                key={category}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#FF6B00]/55 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${visual.accentBg}`}
                    >
                      <Icon className={`w-5 h-5 ${visual.accentText}`} />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-200 tabular-nums">
                        {list.length} bài
                      </span>
                      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                        <Clock className="w-3.5 h-3.5" />~{totalMinutes}p
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                      {category}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {visual.description}
                    </p>
                  </div>

                  {/* Sample preview titles */}
                  {previewItems.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Bài tiêu biểu trong bộ này:
                      </p>
                      <ul className="space-y-1">
                        {previewItems.map((item) => (
                          <li
                            key={item.passageId}
                            className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300"
                          >
                            <span className="truncate font-serif font-semibold">
                              • {item.titleEn}
                            </span>
                            <span className="shrink-0 text-[10px] font-mono font-bold text-slate-400">
                              {item.levelId}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                        Tiến độ: {doneCount}/{list.length} bài
                      </span>
                      <span
                        className={`tabular-nums font-bold ${
                          isComplete
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[#D94E00] dark:text-[#FF8524]'
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isComplete ? 'bg-emerald-500' : 'bg-[#FF6B00]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={list.length === 0}
                    onClick={() => onStartTopic(category)}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors disabled:opacity-45 ${
                      isComplete
                        ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                        : 'bg-[#FF6B00] hover:bg-[#FF7E1F] text-white shadow-[0_4px_14px_-4px_rgba(255,107,0,0.45)]'
                    }`}
                  >
                    {isComplete ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Ôn lại chủ đề này
                      </>
                    ) : doneCount > 0 ? (
                      <>
                        Tiếp tục luyện tập
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Bắt đầu luyện tập
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
