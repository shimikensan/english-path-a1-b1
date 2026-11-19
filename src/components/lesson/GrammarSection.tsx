import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Volume2, XCircle } from 'lucide-react';
import type { LessonDoc } from '../../types';
import { speakEnglish } from '../../utils/speech';

interface GrammarSectionProps {
  lesson: LessonDoc;
  onNextSection: () => void;
}

export function GrammarSection({ lesson, onNextSection }: GrammarSectionProps) {
  const { grammar } = lesson;
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  return (
    <div className="space-y-8">
      {/* Main Grammar Overview & Formula */}
      <section className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8524]">
            Kiến thức ngữ pháp trọng tâm · {lesson.levelId}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {grammar.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {grammar.summaryVi}
          </p>
        </div>

        {/* Formula box */}
        <div className="p-4 sm:p-5 rounded-xl bg-amber-50/70 dark:bg-slate-800/80 border border-[#FF6B00]/35">
          <div className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8524] mb-1.5">
            Công thức ghi nhớ
          </div>
          <div className="text-sm sm:text-base font-mono font-semibold text-slate-900 dark:text-white break-words">
            {grammar.formula}
          </div>
        </div>

        {/* Usage Rules */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Cách sử dụng</h3>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {grammar.usageVi.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  0{idx + 1}.
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Examples */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Ví dụ minh họa</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {grammar.examples.map((ex, idx) => (
              <div key={idx} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-serif text-slate-900 dark:text-slate-100">
                    {ex.en}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{ex.vi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => speakEnglish(ex.en)}
                  className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 shrink-0"
                  aria-label="Nghe ví dụ"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Lỗi người Việt thường gặp
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grammar.commonMistakes.map((mistake, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 line-through">
                  Sai: {mistake.wrong}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Đúng: {mistake.right}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {mistake.explanationVi}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Mini Practice */}
      <section className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 sm:p-8 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Thực hành nhanh ngữ pháp
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kiểm tra nhanh kiến thức vừa học trước khi làm bài kiểm tra chính thức 15 câu.
          </p>
        </div>

        <div className="space-y-5">
          {grammar.miniPractice.map((ex, idx) => {
            const chosen = selectedAnswers[ex.id];
            const isAnswered = chosen !== undefined;
            const isCorrect = chosen === ex.correctIndex;

            return (
              <div
                key={ex.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Câu {idx + 1}: {ex.prompt}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ex.options.map((opt, optIdx) => {
                    const isSelected = chosen === optIdx;
                    const showRight = isAnswered && optIdx === ex.correctIndex;
                    const showWrong = isAnswered && isSelected && !isCorrect;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers((prev) => ({ ...prev, [ex.id]: optIdx }))
                        }
                        className={`text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                          showRight
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-semibold'
                            : showWrong
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-mono text-xs mr-2 opacity-70">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {isAnswered && (
                  <div
                    className={`flex items-start gap-2.5 p-3 rounded-xl text-xs sm:text-sm ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>
                      <strong>{isCorrect ? 'Chính xác! ' : 'Chưa chính xác. '}</strong>
                      {ex.explanationVi}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNextSection}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors shadow-[0_0_16px_rgba(255,107,0,0.22)]"
        >
          Chuyển sang Phần 4: Làm bài Kiểm tra 15 câu
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
