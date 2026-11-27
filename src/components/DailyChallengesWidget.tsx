import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Gem,
  Gift,
  MessageSquare,
  Target,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { AppRoute } from '../types';
import { playCorrectBeep } from '../utils/cockpitAudio';
import {
  claimDailyChallengeReward,
  computeDailyChallengesState,
  DAILY_ALL_CLEAR_BONUS_ID,
  DAILY_CHALLENGES_UPDATED_EVENT,
  formatTimeUntilMidnightVi,
  markDailyCelebrationShown,
  triggerDailyCelebrationPopup,
  type DailyChallengeId,
  type DailyChallengeItemState,
} from '../utils/dailyChallenges';

interface DailyChallengesWidgetProps {
  onNavigate: (route: AppRoute) => void;
}

function getChallengeIcon(id: DailyChallengeId) {
  switch (id) {
    case 'daily_quiz':
      return ClipboardCheck;
    case 'daily_vocab_10':
      return BookOpen;
    case 'daily_ai_chat':
      return MessageSquare;
  }
}

export function DailyChallengesWidget({ onNavigate }: DailyChallengesWidgetProps) {
  const {
    profile,
    firebaseUser,
    quizResults,
    vocabMap,
    awardBonusGems,
    triggerGemFlight,
  } = useApp();

  const uid = profile?.uid || firebaseUser?.uid || '';
  const [syncTick, setSyncTick] = useState(0);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [resetCountdown, setResetCountdown] = useState(() => formatTimeUntilMidnightVi());

  useEffect(() => {
    const handleSync = () => setSyncTick((n) => n + 1);
    window.addEventListener(DAILY_CHALLENGES_UPDATED_EVENT, handleSync);
    window.addEventListener('storage', handleSync);

    const interval = window.setInterval(() => {
      setResetCountdown(formatTimeUntilMidnightVi());
      setSyncTick((n) => n + 1);
    }, 60_000);

    return () => {
      window.removeEventListener(DAILY_CHALLENGES_UPDATED_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
      window.clearInterval(interval);
    };
  }, []);

  const summary = useMemo(
    () =>
      computeDailyChallengesState({
        uid,
        quizResults,
        vocabMap,
      }),
    // syncTick guarantees immediate refresh when local daily counters or claims change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid, quizResults, vocabMap, syncTick]
  );

  const handleClaimChallenge = async (item: DailyChallengeItemState) => {
    if (!uid || !item.completed || item.claimed || claimingId) return;
    setClaimingId(item.id);
    try {
      const newlyClaimed = claimDailyChallengeReward(uid, item.id);
      if (!newlyClaimed) return;
      setSyncTick((n) => n + 1);
      playCorrectBeep();
      await awardBonusGems(item.rewardGems, `Thử thách hàng ngày: ${item.titleVi}`);
      triggerGemFlight({
        amount: item.rewardGems,
        lessonCompleted: false,
        label: item.titleVi,
      });
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimAllClearBonus = async () => {
    if (!uid || !summary.allCompleted || summary.allClearBonusClaimed || claimingId) return;
    setClaimingId(DAILY_ALL_CLEAR_BONUS_ID);
    try {
      const newlyClaimed = claimDailyChallengeReward(uid, DAILY_ALL_CLEAR_BONUS_ID);
      if (!newlyClaimed) return;
      markDailyCelebrationShown(uid);
      setSyncTick((n) => n + 1);
      playCorrectBeep();
      await awardBonusGems(
        summary.allClearBonusGems,
        'Hoàn tất toàn bộ 3 thử thách hàng ngày'
      );
      triggerGemFlight({
        amount: summary.allClearBonusGems,
        lessonCompleted: true,
        label: 'Hoàn tất 3/3 thử thách ngày',
      });
      triggerDailyCelebrationPopup({
        awardedGems: summary.allClearBonusGems,
        alreadyAwarded: true,
      });
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <section
      aria-label="Thử thách hàng ngày"
      className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-6"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-[#FF6B00] dark:text-[#FF8524]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Thử thách hàng ngày
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                {summary.completedCount}/{summary.totalCount} nhiệm vụ hoàn thành
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Làm mới sau {resetCountdown}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums sm:text-right">
          <Gem className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
          <span>
            {summary.claimedGemsToday}/{summary.totalPossibleGems} Ngọc hôm nay
          </span>
        </div>
      </div>

      {/* 3 Daily Mission Rows separated by clean hairlines */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {summary.items.map((item) => {
          const Icon = getChallengeIcon(item.id);
          const isClaiming = claimingId === item.id;

          return (
            <div
              key={item.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    item.claimed
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : item.completed
                      ? 'bg-orange-50 dark:bg-orange-500/15 text-[#FF6B00] dark:text-[#FF8524]'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {item.claimed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <h3
                      className={`text-sm font-semibold leading-snug ${
                        item.claimed
                          ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.titleVi}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 tabular-nums shrink-0">
                      <Gem className="w-3.5 h-3.5" />
                      +{item.rewardGems} Ngọc
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.descriptionVi}
                  </p>

                  {/* Slim progress bar + tabular ratio */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.claimed || item.completed
                            ? 'bg-emerald-500 dark:bg-emerald-400'
                            : 'bg-[#FF6B00] dark:bg-[#FF8524]'
                        }`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                      {item.progress}/{item.target} {item.unitVi}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action CTA */}
              <div className="flex items-center justify-end sm:pl-2 shrink-0">
                {item.claimed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 px-2 py-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Đã nhận
                  </span>
                ) : item.completed ? (
                  <button
                    type="button"
                    disabled={isClaiming}
                    onClick={() => void handleClaimChallenge(item)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#D94E00] disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                  >
                    <Gem className="w-3.5 h-3.5" />
                    {isClaiming ? 'Đang nhận...' : `Nhận +${item.rewardGems} Ngọc`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate(item.route)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#FF6B00]/50 dark:hover:border-[#FF8524]/50 text-slate-700 dark:text-slate-200 hover:text-[#D94E00] dark:hover:text-[#FF8524] bg-white dark:bg-slate-900 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {item.actionLabelVi}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Bonus Strip: All-Clear 3/3 Reward */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <Gift
            className={`w-4 h-4 shrink-0 ${
              summary.allClearBonusClaimed
                ? 'text-emerald-600 dark:text-emerald-400'
                : summary.allCompleted
                ? 'text-[#FF6B00] dark:text-[#FF8524]'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          />
          <span>
            {summary.allClearBonusClaimed ? (
              <strong className="font-semibold text-emerald-700 dark:text-emerald-400">
                Xuất sắc! Bạn đã nhận trọn bộ +{summary.totalPossibleGems} Ngọc thử thách hôm nay.
              </strong>
            ) : summary.allCompleted ? (
              <strong className="font-semibold text-slate-900 dark:text-white">
                Đã hoàn tất 3/3 nhiệm vụ — mở rương thưởng thêm +{summary.allClearBonusGems} Ngọc!
              </strong>
            ) : (
              <>
                Hoàn thành cả 3 nhiệm vụ trong ngày để nhận thưởng thêm{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  +{summary.allClearBonusGems} Ngọc
                </strong>
                .
              </>
            )}
          </span>
        </div>

        {summary.allCompleted && !summary.allClearBonusClaimed && (
          <button
            type="button"
            disabled={claimingId === DAILY_ALL_CLEAR_BONUS_ID}
            onClick={() => void handleClaimAllClearBonus()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#D94E00] disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <Gift className="w-3.5 h-3.5" />
            {claimingId === DAILY_ALL_CLEAR_BONUS_ID
              ? 'Đang nhận...'
              : `Nhận thưởng +${summary.allClearBonusGems} Ngọc`}
          </button>
        )}
      </div>
    </section>
  );
}
