import { ChevronRight, Volume2 } from 'lucide-react';
import type { LessonDoc } from '../../types';
import { speakEnglish } from '../../utils/speech';

interface SentencePatternsSectionProps {
  lesson: LessonDoc;
  onNextSection: () => void;
}

export function SentencePatternsSection({ lesson, onNextSection }: SentencePatternsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {lesson.sentencePatterns.map((pattern, idx) => (
          <article
            key={pattern.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5"
          >
            {/* Header & Structure */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  Mẫu câu {String(idx + 1).padStart(2, '0')}
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  {pattern.structure}
                </h3>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {pattern.meaningVi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => speakEnglish(pattern.exampleEn)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors self-start whitespace-nowrap"
              >
                <Volume2 className="w-4 h-4" />
                Nghe câu mẫu
              </button>
            </div>

            {/* Usage explanation */}
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Cách dùng: </span>
              {pattern.usageVi}
            </p>

            {/* Example + Mini Dialogue Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ví dụ ứng dụng
                </div>
                <p className="text-sm sm:text-base font-serif text-slate-900 dark:text-slate-100">
                  {pattern.exampleEn}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {pattern.exampleVi}
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Hội thoại thực tế
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      speakEnglish(pattern.dialogue.map((d) => d.en).join('. '))
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Nghe cả hội thoại
                  </button>
                </div>

                <div className="space-y-2">
                  {pattern.dialogue.map((line, lIdx) => (
                    <div
                      key={`${pattern.id}_d_${lIdx}`}
                      className="flex items-start justify-between gap-3 py-1.5"
                    >
                      <div className="text-xs sm:text-sm space-y-0.5">
                        <p className="text-slate-900 dark:text-slate-100">
                          <span className="font-bold text-blue-700 dark:text-blue-400 mr-1.5">
                            {line.speaker}:
                          </span>
                          {line.en}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{line.vi}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakEnglish(line.en)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0"
                        aria-label="Nghe câu hội thoại"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNextSection}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Chuyển sang Phần 3: Ngữ pháp
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
