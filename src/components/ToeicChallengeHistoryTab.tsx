import { useMemo, useState } from 'react';
import {
  Award,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Eye,
  History,
  Medal,
  Search,
  Swords,
  Timer,
  Trash2,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import type { ToeicChallengeParticipant, ToeicGroupChallengeDoc } from '../types';

interface ToeicChallengeHistoryTabProps {
  challenges: ToeicGroupChallengeDoc[];
  currentUid: string;
  isGroupCreator: boolean;
  onInspectChallenge: (challengeId: string) => void;
  onDeleteChallenge: (challengeId: string) => Promise<void>;
  onLaunchQuickChallenge: () => void;
}

type HistoryFilter = 'all' | 'quick' | 'mine';

function extractMs(ts: unknown): number {
  if (!ts) return 0;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    const sec = (ts as { seconds?: unknown }).seconds;
    if (typeof sec === 'number') return sec * 1000;
  }
  return 0;
}

export function formatChallengeDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function computeParticipantDurationSec(
  challenge: ToeicGroupChallengeDoc,
  participant: ToeicChallengeParticipant
): number | null {
  if (!participant.finished || !participant.finishedAtMs || !challenge.startedAtMs) {
    return null;
  }
  const diffSec = Math.round((participant.finishedAtMs - challenge.startedAtMs) / 1000);
  if (diffSec <= 0) return 1;
  return Math.min(challenge.timeLimitSeconds, diffSec);
}

function getChallengeTimestampMs(ch: ToeicGroupChallengeDoc): number {
  if (ch.startedAtMs > 0) return ch.startedAtMs;
  const updatedMs = extractMs(ch.updatedAt);
  if (updatedMs > 0) return updatedMs;
  return extractMs(ch.createdAt);
}

function formatHistoryDateTime(ms: number): string {
  if (!ms) return 'Vừa xong';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${hh}:${mm} · ${dd}/${mo}/${yyyy}`;
}

function rankHistoryParticipants(challenge: ToeicGroupChallengeDoc): ToeicChallengeParticipant[] {
  return Object.values(challenge.participants).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (a.finished && b.finished) return a.finishedAtMs - b.finishedAtMs;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.answeredCount - a.answeredCount;
  });
}

export function isHistoricalChallenge(ch: ToeicGroupChallengeDoc, nowMs: number): boolean {
  if (ch.status === 'finished') return true;
  if (ch.status === 'active' && ch.startedAtMs > 0) {
    return ch.startedAtMs + ch.timeLimitSeconds * 1000 <= nowMs;
  }
  return false;
}

export function ToeicChallengeHistoryTab({
  challenges,
  currentUid,
  isGroupCreator,
  onInspectChallenge,
  onDeleteChallenge,
  onLaunchQuickChallenge,
}: ToeicChallengeHistoryTabProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nowMs = Date.now();

  // Extract completed & expired matches sorted newest-first
  const historyList = useMemo(() => {
    return challenges
      .filter((ch) => isHistoricalChallenge(ch, nowMs))
      .sort((a, b) => getChallengeTimestampMs(b) - getChallengeTimestampMs(a));
  }, [challenges, nowMs]);

  const quickCount = useMemo(
    () => historyList.filter((ch) => Boolean(ch.isQuickChallenge)).length,
    [historyList]
  );

  const myMatchCount = useMemo(
    () => historyList.filter((ch) => ch.participantUids.includes(currentUid)).length,
    [historyList, currentUid]
  );

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return historyList.filter((ch) => {
      if (filter === 'quick' && !ch.isQuickChallenge) return false;
      if (filter === 'mine' && !ch.participantUids.includes(currentUid)) return false;
      if (!q) return true;
      const inTitle = ch.title.toLowerCase().includes(q);
      const inScope = ch.scopeLabel.toLowerCase().includes(q);
      const inHost = ch.hostName.toLowerCase().includes(q);
      const inParticipants = Object.values(ch.participants).some((p) =>
        p.displayName.toLowerCase().includes(q)
      );
      return inTitle || inScope || inHost || inParticipants;
    });
  }, [historyList, filter, searchQuery, currentUid]);

  // Aggregate summary metrics + All-Time Group Hall of Fame
  const analytics = useMemo(() => {
    let highestScore = 0;
    let highestScorer = '';
    let fastestSec: number | null = null;
    let fastestPlayer = '';
    let myWins = 0;
    let myTotalScore = 0;
    let myPlayed = 0;

    const memberStatsMap = new Map<
      string,
      {
        uid: string;
        displayName: string;
        matches: number;
        wins: number;
        totalScore: number;
        bestScore: number;
        fastestSec: number | null;
      }
    >();

    historyList.forEach((ch) => {
      const ranked = rankHistoryParticipants(ch);
      const winnerUid = ranked[0]?.uid;

      ranked.forEach((p) => {
        const dur = computeParticipantDurationSec(ch, p);
        if (p.score > highestScore) {
          highestScore = p.score;
          highestScorer = p.displayName;
        }
        if (dur !== null && (fastestSec === null || dur < fastestSec)) {
          fastestSec = dur;
          fastestPlayer = p.displayName;
        }
        if (p.uid === currentUid) {
          myPlayed += 1;
          myTotalScore += p.score;
          if (p.uid === winnerUid) myWins += 1;
        }

        const existing = memberStatsMap.get(p.uid);
        if (existing) {
          existing.matches += 1;
          if (p.uid === winnerUid) existing.wins += 1;
          existing.totalScore += p.score;
          if (p.score > existing.bestScore) existing.bestScore = p.score;
          if (dur !== null && (existing.fastestSec === null || dur < existing.fastestSec)) {
            existing.fastestSec = dur;
          }
        } else {
          memberStatsMap.set(p.uid, {
            uid: p.uid,
            displayName: p.displayName,
            matches: 1,
            wins: p.uid === winnerUid ? 1 : 0,
            totalScore: p.score,
            bestScore: p.score,
            fastestSec: dur,
          });
        }
      });
    });

    const hallOfFame = Array.from(memberStatsMap.values()).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
      return b.totalScore / Math.max(1, b.matches) - a.totalScore / Math.max(1, a.matches);
    });

    return {
      totalMatches: historyList.length,
      highestScore,
      highestScorer,
      fastestSec,
      fastestPlayer,
      myWins,
      myPlayed,
      myAvgScore: myPlayed > 0 ? Math.round(myTotalScore / myPlayed) : 0,
      hallOfFame,
    };
  }, [historyList, currentUid]);

  const toggleExpand = (challengeId: string, defaultExpanded: boolean) => {
    setExpandedIds((prev) => {
      const current = prev[challengeId] ?? defaultExpanded;
      return { ...prev, [challengeId]: !current };
    });
  };

  const handleDelete = async (challengeId: string) => {
    setDeletingId(challengeId);
    try {
      await onDeleteChallenge(challengeId);
    } finally {
      setDeletingId(null);
    }
  };

  if (historyList.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-[#FF6B00]/30 text-[#FF6B00] flex items-center justify-center mx-auto">
          <History className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
            Chưa có lịch sử thách đấu nào trong nhóm
          </h4>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Mỗi khi nhóm hoàn thành một trận <strong>Thách đấu nhanh (10 câu)</strong> hoặc phòng
            Quiz Live, toàn bộ danh sách thí sinh, điểm số và thời gian thực hiện sẽ tự động được
            lưu tại đây để cả nhóm theo dõi tiến bộ.
          </p>
        </div>
        <button
          type="button"
          onClick={onLaunchQuickChallenge}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          <span>Bắt đầu Thách đấu nhanh đầu tiên</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Group Battle History Summary KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <History className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>Tổng trận đã lưu</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {analytics.totalMatches}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {quickCount} trận Thách đấu nhanh
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Kỷ lục điểm nhóm</span>
          </div>
          <div className="text-2xl font-extrabold text-[#D94E00] dark:text-[#FF8524] mt-1">
            {analytics.highestScore}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {analytics.highestScorer || '—'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Timer className="w-3.5 h-3.5 text-sky-500" />
            <span>Hoàn thành nhanh nhất</span>
          </div>
          <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">
            {analytics.fastestSec !== null ? formatChallengeDuration(analytics.fastestSec) : '—'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {analytics.fastestPlayer || 'Chưa ghi nhận thời gian'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Award className="w-3.5 h-3.5 text-emerald-500" />
            <span>Thành tích của bạn</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {analytics.myWins} <span className="text-sm font-bold">vô địch</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {analytics.myPlayed} trận · TB {analytics.myAvgScore} điểm
          </div>
        </div>
      </section>

      {/* 2. Group Hall of Fame Strip (All-time Battle Leaders) */}
      {analytics.hallOfFame.length > 0 && (
        <section className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
              <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Bảng thành tích tổng hợp của nhóm
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Tổng hợp qua {analytics.totalMatches} trận thách đấu
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 tabular-nums">
            {analytics.hallOfFame.slice(0, 6).map((member, idx) => {
              const avgScore = Math.round(member.totalScore / Math.max(1, member.matches));
              const isMe = member.uid === currentUid;
              return (
                <div
                  key={member.uid}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${
                    isMe
                      ? 'border-[#FF6B00]/50 bg-orange-50/70 dark:bg-orange-950/25'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500 text-white'
                          : idx === 1
                            ? 'bg-slate-400 text-white'
                            : idx === 2
                              ? 'bg-orange-700 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {member.displayName}
                        {isMe ? ' (Bạn)' : ''}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {member.matches} trận · TB {avgScore}đ
                        {member.fastestSec !== null
                          ? ` · Nhanh nhất ${formatChallengeDuration(member.fastestSec)}`
                          : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                      <Medal className="w-3.5 h-3.5" />
                      <span>{member.wins}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Max {member.bestScore}đ</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Filter & Search Toolbar */}
      <section className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: `Tất cả (${historyList.length})` },
              { id: 'quick', label: `Thách đấu nhanh (${quickCount})` },
              { id: 'mine', label: `Trận của tôi (${myMatchCount})` },
            ] as const
          ).map((opt) => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap tabular-nums cursor-pointer ${
                  active
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm chủ đề, tên thí sinh..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </section>

      {/* 4. Chronological Match History Cards */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-8 text-center space-y-1.5">
          <Swords className="w-7 h-7 mx-auto text-slate-400" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Không tìm thấy trận thách đấu nào khớp bộ lọc
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Thử chuyển bộ lọc sang &ldquo;Tất cả&rdquo; hoặc xóa từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((ch, matchIdx) => {
            const ranked = rankHistoryParticipants(ch);
            const winner = ranked[0];
            const matchMs = getChallengeTimestampMs(ch);
            const canDelete = ch.hostUid === currentUid || isGroupCreator;
            // Expand the 3 newest matches by default; collapse older ones to keep long histories tidy
            const defaultExpanded = matchIdx < 3;
            const isExpanded = expandedIds[ch.challengeId] ?? defaultExpanded;
            const myResult = ch.participants[currentUid];

            return (
              <article
                key={ch.challengeId}
                className="bg-white dark:bg-slate-900 cockpit-radar-panel overflow-hidden"
              >
                {/* Match Summary Header */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      {ch.isQuickChallenge ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/50 text-[#D94E00] dark:text-[#FF8524]">
                          <Zap className="w-3 h-3" />
                          Thách đấu nhanh
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <Swords className="w-3 h-3" />
                          Thách đấu nhóm
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                        <CalendarClock className="w-3.5 h-3.5 text-sky-500" />
                        {formatHistoryDateTime(matchMs)}
                      </span>

                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        {ch.questionCount} câu · Giới hạn {formatChallengeDuration(ch.timeLimitSeconds)}
                      </span>
                    </div>

                    <h5 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                      {ch.title}
                    </h5>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <span>
                        Chủ đề: <strong className="text-slate-800 dark:text-slate-100">{ch.scopeLabel}</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span>
                        Chủ phòng: <strong>{ch.hostName}</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {ranked.length} thí sinh
                      </span>
                      {winner && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            <Trophy className="w-3.5 h-3.5" />
                            Quán quân: {winner.displayName} ({winner.score}đ)
                          </span>
                        </>
                      )}
                      {myResult && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="font-bold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
                            Điểm của bạn: {myResult.score}đ ({myResult.correctCount}/{ch.questionCount})
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(ch.challengeId, defaultExpanded)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-[#FF6B00]/50 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Thu gọn bảng điểm</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Xem {ranked.length} thí sinh</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onInspectChallenge(ch.challengeId)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-bold transition-opacity whitespace-nowrap cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem đáp án</span>
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        disabled={deletingId === ch.challengeId}
                        onClick={() => void handleDelete(ch.challengeId)}
                        title="Xóa bản ghi lịch sử này"
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label="Xóa bản ghi lịch sử thách đấu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Full Participants, Scores & Completion Times Table */}
                {isExpanded && (
                  <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 px-4 sm:px-5 py-3.5">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <th className="py-2 pr-3 w-12">Hạng</th>
                            <th className="py-2 px-3">Người tham gia</th>
                            <th className="py-2 px-3 whitespace-nowrap">Điểm số</th>
                            <th className="py-2 px-3 whitespace-nowrap">Độ chính xác</th>
                            <th className="py-2 pl-3 whitespace-nowrap text-right">
                              Thời gian thực hiện
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70 tabular-nums">
                          {ranked.map((p, idx) => {
                            const acc = Math.round(
                              (p.correctCount / Math.max(1, ch.questionCount)) * 100
                            );
                            const durSec = computeParticipantDurationSec(ch, p);
                            const isMe = p.uid === currentUid;
                            const isHost = p.uid === ch.hostUid;

                            return (
                              <tr
                                key={p.uid}
                                className={
                                  isMe
                                    ? 'bg-orange-50/70 dark:bg-orange-950/20'
                                    : ''
                                }
                              >
                                <td className="py-2.5 pr-3">
                                  <span
                                    className={`inline-flex w-6 h-6 rounded-lg items-center justify-center text-[11px] font-extrabold ${
                                      idx === 0
                                        ? 'bg-amber-500 text-white'
                                        : idx === 1
                                          ? 'bg-slate-400 text-white'
                                          : idx === 2
                                            ? 'bg-orange-700 text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    {idx + 1}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {p.displayName}
                                    </span>
                                    {isMe && (
                                      <span className="text-[11px] font-bold text-[#D94E00] dark:text-[#FF8524]">
                                        (Bạn)
                                      </span>
                                    )}
                                    {isHost && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                                        <Crown className="w-2.5 h-2.5" />
                                        Chủ phòng
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="text-sm font-extrabold text-[#D94E00] dark:text-[#FF8524]">
                                    {p.score} điểm
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    {p.correctCount}/{ch.questionCount} câu ({acc}%)
                                  </span>
                                </td>

                                <td className="py-2.5 pl-3 whitespace-nowrap text-right">
                                  {durSec !== null ? (
                                    <span className="inline-flex items-center justify-end gap-1 font-bold text-sky-700 dark:text-sky-400">
                                      <Timer className="w-3.5 h-3.5 shrink-0" />
                                      {formatChallengeDuration(durSec)}
                                    </span>
                                  ) : p.finished ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                      Đã hoàn thành
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                                      Hết giờ ({p.answeredCount}/{ch.questionCount} câu)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
