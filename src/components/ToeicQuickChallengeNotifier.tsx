import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BellRing,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gem,
  Swords,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Timestamp, type Unsubscribe } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import {
  declineGroupChallenge,
  joinGroupChallenge,
  subscribeActiveGroupChallenges,
  subscribeMyToeicGroups,
} from '../services/toeicGroupService';
import type { ToeicGroupChallengeDoc, ToeicGroupDoc } from '../types';
import { playChallengeInviteChime } from '../utils/cockpitAudio';
import { ToeicGroupBadgeEmblem } from './ToeicGroupBadgeEmblem';

export interface ToeicChallengeNavTarget {
  groupId: string;
  challengeId: string;
  nonce: number;
}

interface ToeicQuickChallengeNotifierProps {
  onAcceptChallenge: (groupId: string, challengeId: string) => void;
}

interface IncomingChallengeInvite {
  group: ToeicGroupDoc;
  challenge: ToeicGroupChallengeDoc;
  createdAtMs: number;
}

const MAX_WATCHED_GROUPS = 10;
const STALE_WAITING_MS = 3 * 60 * 60 * 1000; // 3 hours

function extractTimestampMs(ts: unknown): number {
  if (!ts) return 0;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    const sec = (ts as { seconds?: unknown }).seconds;
    if (typeof sec === 'number') return sec * 1000;
  }
  return 0;
}

function formatDurationMMSS(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ToeicQuickChallengeNotifier({
  onAcceptChallenge,
}: ToeicQuickChallengeNotifierProps) {
  const { firebaseUser, profile, addToast } = useApp();
  const uid = firebaseUser?.emailVerified && profile?.uid ? profile.uid : null;

  const [myGroups, setMyGroups] = useState<ToeicGroupDoc[]>([]);
  const [challengesByGroup, setChallengesByGroup] = useState<
    Record<string, ToeicGroupChallengeDoc[]>
  >({});
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(() => new Set());
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [busyAction, setBusyAction] = useState<'accept' | 'decline' | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const groupListenersRef = useRef<Map<string, Unsubscribe>>(new Map());
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // 1. Subscribe to all TOEIC study groups the signed-in user belongs to
  useEffect(() => {
    if (!uid) {
      setMyGroups([]);
      setChallengesByGroup({});
      setSnoozedIds(new Set());
      setOptimisticHiddenIds(new Set());
      alertedIdsRef.current.clear();
      return;
    }

    const unsub = subscribeMyToeicGroups(
      uid,
      (groups) => {
        setMyGroups(groups.slice(0, MAX_WATCHED_GROUPS));
      },
      () => {
        // Silently ignore background notification subscription errors so main workspace stays uninterrupted
      }
    );

    return () => {
      unsub();
    };
  }, [uid]);

  // 2. Incrementally manage real-time active/waiting challenge listeners per group
  useEffect(() => {
    const activeMap = groupListenersRef.current;

    if (!uid) {
      activeMap.forEach((unsub) => unsub());
      activeMap.clear();
      return;
    }

    const desiredIds = new Set(myGroups.map((g) => g.groupId));

    // Unsubscribe from groups the user left
    Array.from(activeMap.keys()).forEach((existingGroupId) => {
      if (!desiredIds.has(existingGroupId)) {
        activeMap.get(existingGroupId)?.();
        activeMap.delete(existingGroupId);
        setChallengesByGroup((prev) => {
          if (!(existingGroupId in prev)) return prev;
          const next = { ...prev };
          delete next[existingGroupId];
          return next;
        });
      }
    });

    // Subscribe to newly added groups
    myGroups.forEach((group) => {
      if (activeMap.has(group.groupId)) return;
      const unsub = subscribeActiveGroupChallenges(
        group.groupId,
        (items) => {
          setChallengesByGroup((prev) => ({
            ...prev,
            [group.groupId]: items,
          }));
        },
        () => {
          // Ignore transient listener permission/network errors cleanly
        }
      );
      activeMap.set(group.groupId, unsub);
    });
  }, [uid, myGroups]);

  // Clean up all group listeners on unmount
  useEffect(() => {
    const activeMap = groupListenersRef.current;
    return () => {
      activeMap.forEach((unsub) => unsub());
      activeMap.clear();
    };
  }, []);

  // 3. Collect all live pending Quick Challenge invitations targeting this user
  const allPendingInvites = useMemo<IncomingChallengeInvite[]>(() => {
    if (!uid) return [];
    const groupById = new Map(myGroups.map((g) => [g.groupId, g]));
    const list: IncomingChallengeInvite[] = [];

    Object.entries(challengesByGroup).forEach(([groupId, items]) => {
      const group = groupById.get(groupId);
      if (!group) return;

      items.forEach((ch) => {
        if (ch.status !== 'waiting' && ch.status !== 'active') return;
        if (ch.hostUid === uid) return;
        if (ch.participantUids.includes(uid)) return;
        if (ch.declinedUids?.includes(uid)) return;
        if (optimisticHiddenIds.has(ch.challengeId)) return;

        const hasExplicitInvites = Array.isArray(ch.invitedUids) && ch.invitedUids.length > 0;
        const isTargetedToMe = hasExplicitInvites
          ? ch.invitedUids!.includes(uid)
          : Boolean(ch.isQuickChallenge);
        if (!isTargetedToMe) return;

        const createdAtMs = extractTimestampMs(ch.createdAt);

        // Skip expired active battles
        if (ch.status === 'active' && ch.startedAtMs > 0) {
          const endMs = ch.startedAtMs + ch.timeLimitSeconds * 1000;
          if (endMs <= nowMs) return;
        }

        // Skip very old untouched waiting rooms (> 3 hours)
        if (ch.status === 'waiting' && createdAtMs > 0 && nowMs - createdAtMs > STALE_WAITING_MS) {
          return;
        }

        list.push({ group, challenge: ch, createdAtMs });
      });
    });

    return list.sort((a, b) => {
      // Prioritize active countdown battles first, then newest invites
      if (a.challenge.status !== b.challenge.status) {
        return a.challenge.status === 'active' ? -1 : 1;
      }
      return b.createdAtMs - a.createdAtMs;
    });
  }, [uid, myGroups, challengesByGroup, optimisticHiddenIds, nowMs]);

  const visibleInvites = useMemo(
    () => allPendingInvites.filter((inv) => !snoozedIds.has(inv.challenge.challengeId)),
    [allPendingInvites, snoozedIds]
  );

  const snoozedPendingCount = allPendingInvites.length - visibleInvites.length;

  // Keep activeIndex within bounds
  useEffect(() => {
    if (visibleInvites.length === 0) {
      setActiveIndex(0);
    } else if (activeIndex >= visibleInvites.length) {
      setActiveIndex(visibleInvites.length - 1);
    }
  }, [visibleInvites.length, activeIndex]);

  // Play cockpit radar chime once per newly arriving invite
  useEffect(() => {
    if (visibleInvites.length === 0) return;
    let hasBrandNew = false;
    visibleInvites.forEach((inv) => {
      if (!alertedIdsRef.current.has(inv.challenge.challengeId)) {
        alertedIdsRef.current.add(inv.challenge.challengeId);
        hasBrandNew = true;
      }
    });
    if (hasBrandNew) {
      playChallengeInviteChime();
    }
  }, [visibleInvites]);

  // 1-second live tick only when there is an active countdown invite on screen
  const hasActiveCountdownInvite = useMemo(
    () => allPendingInvites.some((inv) => inv.challenge.status === 'active'),
    [allPendingInvites]
  );

  useEffect(() => {
    if (!hasActiveCountdownInvite) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasActiveCountdownInvite]);

  const currentInvite = visibleInvites[activeIndex] ?? null;

  const handleSnoozeCurrent = useCallback(() => {
    if (!currentInvite || busyAction) return;
    const id = currentInvite.challenge.challengeId;
    setSnoozedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, [currentInvite, busyAction]);

  const handleReopenSnoozed = useCallback(() => {
    setSnoozedIds(new Set());
    setActiveIndex(0);
  }, []);

  // Support Escape key to snooze the modal without declining
  useEffect(() => {
    if (!currentInvite) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSnoozeCurrent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentInvite, handleSnoozeCurrent]);

  const handleAccept = async () => {
    if (!currentInvite || !profile || busyAction) return;
    const { group, challenge } = currentInvite;
    setBusyAction('accept');
    try {
      await joinGroupChallenge(group.groupId, challenge, profile);
      setOptimisticHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(challenge.challengeId);
        return next;
      });
      onAcceptChallenge(group.groupId, challenge.challengeId);
      addToast(
        'success',
        `Đã chấp nhận lời mời Thách đấu nhanh từ ${challenge.hostName} · Đang mở phòng thi!`
      );
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : 'Không thể tham gia phòng thách đấu lúc này.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleDecline = async () => {
    if (!currentInvite || !profile || busyAction) return;
    const { group, challenge } = currentInvite;
    setBusyAction('decline');
    try {
      await declineGroupChallenge(group.groupId, challenge, profile.uid);
      setOptimisticHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(challenge.challengeId);
        return next;
      });
      addToast('info', `Đã từ chối lời mời thách đấu từ ${challenge.hostName}.`);
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : 'Không thể gửi phản hồi từ chối lúc này.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (!uid || typeof document === 'undefined') return null;

  // Floating radar pill if the user snoozed active invites ("Để sau")
  if (!currentInvite) {
    if (snoozedPendingCount <= 0) return null;
    return createPortal(
      <button
        type="button"
        onClick={handleReopenSnoozed}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 sm:right-6 z-[85] inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#D94E00] hover:from-[#FF7E1F] hover:to-[#E55800] text-white shadow-[0_12px_32px_rgba(255,107,0,0.42)] border border-orange-300/40 transition-transform hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <Swords className="w-4 h-4 shrink-0" />
        <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap">
          {snoozedPendingCount} lời mời Thách đấu nhanh
        </span>
      </button>,
      document.body
    );
  }

  const { group, challenge } = currentInvite;
  const isLiveActive = challenge.status === 'active';
  const remainingSec =
    isLiveActive && challenge.startedAtMs > 0
      ? Math.max(
          0,
          Math.ceil((challenge.startedAtMs + challenge.timeLimitSeconds * 1000 - nowMs) / 1000)
        )
      : challenge.timeLimitSeconds;

  const popupNode = (
    <div
      className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs px-3.5 sm:px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-challenge-invite-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSnoozeCurrent();
        }
      }}
    >
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col rounded-2xl border border-[#FF6B00]/50 dark:border-[#FF6B00]/45 bg-white dark:bg-slate-900 shadow-[0_24px_70px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Top Live Radar Alert Header */}
        <div className="shrink-0 px-5 py-4 bg-gradient-to-r from-[#07111F] via-[#0F2340] to-[#1A355B] text-white border-b border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#D94E00] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,107,0,0.45)]">
              <BellRing className="w-5 h-5 text-white animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-85" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 border border-slate-950" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#FF9B42]">
                <span>Lời mời Thách đấu nhanh · Trực tiếp</span>
              </div>
              <h3
                id="quick-challenge-invite-title"
                className="text-base font-extrabold text-white truncate mt-0.5"
              >
                {challenge.hostName} vừa thách đấu bạn!
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {visibleInvites.length > 1 && (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-xs font-bold tabular-nums mr-1">
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) => (prev - 1 + visibleInvites.length) % visibleInvites.length)
                  }
                  className="p-0.5 hover:text-[#FF9B42] cursor-pointer"
                  aria-label="Lời mời trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  {activeIndex + 1}/{visibleInvites.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev + 1) % visibleInvites.length)}
                  className="p-0.5 hover:text-[#FF9B42] cursor-pointer"
                  aria-label="Lời mời tiếp theo"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleSnoozeCurrent}
              disabled={busyAction !== null}
              title="Thu gọn tạm thời (Để sau)"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Thu gọn thông báo thách đấu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Group Identity Strip with Custom Emblem */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60">
            <ToeicGroupBadgeEmblem
              badge={group.badge}
              groupName={group.name}
              targetScore={group.targetScore}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nhóm học TOEIC · Mục tiêu {group.targetScore}+
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                {group.name}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                {challenge.title}
              </div>
            </div>
          </div>

          {/* Live Challenge Metrics */}
          <div className="grid grid-cols-3 gap-2.5 tabular-nums">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-3 text-center">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Bộ câu hỏi
              </div>
              <div className="text-base font-extrabold text-[#D94E00] dark:text-[#FF8524] mt-0.5">
                {challenge.questionCount} câu
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-3 text-center">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-sky-500" />
                {isLiveActive ? 'Còn lại' : 'Thời gian'}
              </div>
              <div
                className={`text-base font-extrabold mt-0.5 ${
                  isLiveActive
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {formatDurationMMSS(remainingSec)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-3 text-center">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-emerald-500" />
                Đã sẵn sàng
              </div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {challenge.participantUids.length} người
              </div>
            </div>
          </div>

          {/* Scope & Status Detail */}
          <div className="rounded-xl border border-orange-200/80 dark:border-orange-900/50 bg-orange-50/70 dark:bg-orange-950/25 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Chủ đề: {challenge.scopeLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isLiveActive
                  ? 'Phòng đấu đang đếm ngược trực tiếp — bấm chấp nhận để vào làm bài ngay!'
                  : 'Phòng chờ đang mở — vào sẵn sàng cùng đồng đội!'}
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-sky-700 dark:text-sky-400 shrink-0">
                <Gem className="w-3.5 h-3.5" />
                +20–30 Ngọc
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions: Decline vs Accept */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => void handleDecline()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer"
          >
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{busyAction === 'decline' ? 'Đang gửi từ chối...' : 'Từ chối'}</span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => void handleAccept()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E55800] hover:from-[#FF7E1F] hover:to-[#FF6B00] text-white text-sm font-extrabold shadow-[0_6px_20px_rgba(255,107,0,0.35)] transition-all disabled:opacity-60 whitespace-nowrap cursor-pointer"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>
              {busyAction === 'accept' ? 'Đang vào phòng đấu...' : 'Chấp nhận & Thi ngay'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(popupNode, document.body);
}
