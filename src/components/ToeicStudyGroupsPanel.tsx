import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BellRing,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Download,
  Gem,
  Globe,
  Heart,
  History,
  KeyRound,
  Lock,
  LogOut,
  Medal,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Swords,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  TOEIC_CATEGORIES,
  TOEIC_PART5_DRILLS,
  TOEIC_TOPICS,
  type ToeicCategoryId,
} from '../data';
import {
  createGroupChallenge,
  createToeicGroup,
  declineGroupChallenge,
  deleteGroupChallenge,
  deleteGroupVocab,
  deleteToeicGroup,
  finishGroupChallenge,
  joinGroupChallenge,
  joinToeicGroupByCode,
  joinToeicGroupById,
  leaveToeicGroup,
  removeToeicGroupMember,
  shareVocabToGroup,
  startGroupChallenge,
  subscribeGroupChallenges,
  subscribeGroupVocab,
  subscribeMyToeicGroups,
  subscribePublicToeicGroups,
  subscribeToeicGroup,
  toggleLikeGroupVocab,
  updateMyChallengeProgress,
  updateToeicGroupBadge,
} from '../services/toeicGroupService';
import type {
  LessonDoc,
  ToeicChallengeParticipant,
  ToeicChallengeQuestion,
  ToeicGroupBadge,
  ToeicGroupChallengeDoc,
  ToeicGroupDoc,
  ToeicGroupVocabDoc,
  VocabularyItem,
} from '../types';
import {
  playChallengeAcceptedSfx,
  playChallengeDeclinedSfx,
  playChallengeInviteChime,
  useCockpitAudio,
} from '../utils/cockpitAudio';
import { shuffleArray } from '../utils/helpers';
import { speakEnglish, type SpeechAccent } from '../utils/speech';
import {
  exportBadgeSvgToPng,
  getDefaultToeicGroupBadge,
  resolveToeicGroupBadge,
  ToeicGroupBadgeCustomizer,
  ToeicGroupBadgeEmblem,
} from './ToeicGroupBadgeEmblem';

import type { ToeicChallengeNavTarget } from './ToeicQuickChallengeNotifier';
import {
  computeParticipantDurationSec,
  formatChallengeDuration,
  isHistoricalChallenge,
  ToeicChallengeHistoryTab,
} from './ToeicChallengeHistoryTab';

interface ToeicStudyGroupsPanelProps {
  accent: SpeechAccent;
  toeicLessons: LessonDoc[];
  initialGroupTarget?: ToeicChallengeNavTarget | null;
}

type GroupSubTab = 'vocab' | 'challenges' | 'history' | 'members';

interface IndexedToeicWord {
  vocab: VocabularyItem;
  lesson: LessonDoc;
  topicLabel: string;
  categoryId: ToeicCategoryId;
}

const TARGET_SCORES = [550, 650, 750, 850, 900];
const CAPACITY_OPTIONS = [4, 6, 8, 12];

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function rankParticipants(challenge: ToeicGroupChallengeDoc): ToeicChallengeParticipant[] {
  return Object.values(challenge.participants).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (a.finished && b.finished) return a.finishedAtMs - b.finishedAtMs;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.answeredCount - a.answeredCount;
  });
}

export function ToeicStudyGroupsPanel({
  accent,
  toeicLessons,
  initialGroupTarget,
}: ToeicStudyGroupsPanelProps) {
  const {
    firebaseUser: user,
    profile: userProfile,
    vocabMap,
    toggleVocabState,
    awardBonusGems,
    triggerGemFlight,
    recordStudyActivity,
    addToast,
  } = useApp();

  // Lobby state
  const [myGroups, setMyGroups] = useState<ToeicGroupDoc[]>([]);
  const [publicGroups, setPublicGroups] = useState<ToeicGroupDoc[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    () => initialGroupTarget?.groupId ?? null
  );
  const [activeGroup, setActiveGroup] = useState<ToeicGroupDoc | null>(null);
  const [groupSubTab, setGroupSubTab] = useState<GroupSubTab>(() =>
    initialGroupTarget?.challengeId ? 'challenges' : 'vocab'
  );

  // Create group form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupTargetScore, setGroupTargetScore] = useState(750);
  const [groupMaxMembers, setGroupMaxMembers] = useState(8);
  const [groupIsPublic, setGroupIsPublic] = useState(true);
  const [groupBadge, setGroupBadge] = useState<ToeicGroupBadge>(() =>
    getDefaultToeicGroupBadge('', 750)
  );
  const [creatingGroup, setCreatingGroup] = useState(false);
  const createBadgeSvgRef = useRef<SVGSVGElement | null>(null);

  // Active group badge studio modal
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [editingBadge, setEditingBadge] = useState<ToeicGroupBadge>(() =>
    getDefaultToeicGroupBadge('', 750)
  );
  const [savingBadge, setSavingBadge] = useState(false);
  const modalBadgeSvgRef = useRef<SVGSVGElement | null>(null);
  const sidebarBadgeSvgRef = useRef<SVGSVGElement | null>(null);

  // Join by code
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);

  // Active group shared vocab
  const [sharedVocab, setSharedVocab] = useState<ToeicGroupVocabDoc[]>([]);
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareMode, setShareMode] = useState<'catalog' | 'custom'>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [pickedWord, setPickedWord] = useState<IndexedToeicWord | null>(null);
  const [customWord, setCustomWord] = useState('');
  const [customIpa, setCustomIpa] = useState('');
  const [customPos, setCustomPos] = useState('noun');
  const [customMeaning, setCustomMeaning] = useState('');
  const [customExampleEn, setCustomExampleEn] = useState('');
  const [customExampleVi, setCustomExampleVi] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [submittingVocab, setSubmittingVocab] = useState(false);
  const [savingCatalogVocabId, setSavingCatalogVocabId] = useState<string | null>(null);

  // Active group challenges
  const [challenges, setChallenges] = useState<ToeicGroupChallengeDoc[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    () => initialGroupTarget?.challengeId ?? null
  );
  const lastHandledTargetNonceRef = useRef<number>(initialGroupTarget?.nonce ?? 0);

  // Open target group & challenge room immediately when user accepts a global real-time invite
  useEffect(() => {
    if (!initialGroupTarget) return;
    if (initialGroupTarget.nonce === lastHandledTargetNonceRef.current) return;
    lastHandledTargetNonceRef.current = initialGroupTarget.nonce;
    setActiveGroupId(initialGroupTarget.groupId);
    setGroupSubTab('challenges');
    setSelectedChallengeId(initialGroupTarget.challengeId);
  }, [initialGroupTarget]);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('Thách đấu TOEIC tốc độ');
  const [challengeScope, setChallengeScope] = useState<string>('all_vocab');
  const [challengeCount, setChallengeCount] = useState<number>(10);
  const [challengeTimeLimit, setChallengeTimeLimit] = useState<number>(180);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [busyChallengeAction, setBusyChallengeAction] = useState(false);

  // Quick Challenge (10 questions) launcher modal state
  const [showQuickChallengeModal, setShowQuickChallengeModal] = useState(false);
  const [quickScope, setQuickScope] = useState<string>('all_vocab');
  const [quickTimeLimit, setQuickTimeLimit] = useState<number>(180);
  const [quickInvitedUids, setQuickInvitedUids] = useState<string[]>([]);
  const [creatingQuickChallenge, setCreatingQuickChallenge] = useState(false);

  // Live quiz play state (per challengeId)
  const [liveQIndex, setLiveQIndex] = useState(0);
  const [liveSelectedOption, setLiveSelectedOption] = useState<number | null>(null);
  const [liveAnswersMap, setLiveAnswersMap] = useState<Record<number, number>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const rewardedChallengeIdsRef = useRef<Set<string>>(new Set());

  // Build searchable catalog across all 616 TOEIC words
  const indexedToeicWords = useMemo<IndexedToeicWord[]>(() => {
    const lessonMap = new Map(toeicLessons.map((l) => [l.lessonId, l]));
    const list: IndexedToeicWord[] = [];
    TOEIC_TOPICS.forEach((topic) => {
      const lesson = lessonMap.get(topic.lessonId);
      if (!lesson) return;
      const topicLabel = `${topic.code}. ${topic.titleVi} (${topic.titleEn})`;
      lesson.vocabulary.forEach((vocab) => {
        list.push({
          vocab,
          lesson,
          topicLabel,
          categoryId: topic.categoryId,
        });
      });
    });
    return list;
  }, [toeicLessons]);

  const lessonById = useMemo(
    () => new Map(toeicLessons.map((l) => [l.lessonId, l])),
    [toeicLessons]
  );

  const catalogMatches = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return indexedToeicWords.slice(0, 18);
    return indexedToeicWords
      .filter(
        (item) =>
          item.vocab.word.toLowerCase().includes(q) ||
          item.vocab.meaningVi.toLowerCase().includes(q) ||
          item.topicLabel.toLowerCase().includes(q)
      )
      .slice(0, 24);
  }, [catalogSearch, indexedToeicWords]);

  // Subscribe to my groups & public groups
  useEffect(() => {
    if (!user?.uid) {
      setMyGroups([]);
      setPublicGroups([]);
      setLoadingGroups(false);
      return;
    }

    setLoadingGroups(true);
    let myLoaded = false;
    let pubLoaded = false;

    const unsubMy = subscribeMyToeicGroups(
      user.uid,
      (groups) => {
        setMyGroups(groups);
        myLoaded = true;
        if (myLoaded && pubLoaded) setLoadingGroups(false);
      },
      () => {
        myLoaded = true;
        setLoadingGroups(false);
      }
    );

    const unsubPub = subscribePublicToeicGroups(
      (groups) => {
        setPublicGroups(groups);
        pubLoaded = true;
        if (myLoaded && pubLoaded) setLoadingGroups(false);
      },
      () => {
        pubLoaded = true;
        setLoadingGroups(false);
      }
    );

    return () => {
      unsubMy();
      unsubPub();
    };
  }, [user?.uid]);

  // Subscribe to active group + its shared vocab + its live challenges
  useEffect(() => {
    if (!activeGroupId || !user?.uid) {
      setActiveGroup(null);
      setSharedVocab([]);
      setChallenges([]);
      setSelectedChallengeId(null);
      return;
    }

    const unsubGroup = subscribeToeicGroup(activeGroupId, (grp) => {
      if (!grp || !grp.memberUids.includes(user.uid)) {
        setActiveGroup(null);
        setActiveGroupId(null);
        return;
      }
      setActiveGroup(grp);
    });

    const unsubVocab = subscribeGroupVocab(activeGroupId, (entries) => {
      setSharedVocab(entries);
    });

    const unsubChallenges = subscribeGroupChallenges(activeGroupId, (items) => {
      setChallenges(items);
    });

    return () => {
      unsubGroup();
      unsubVocab();
      unsubChallenges();
    };
  }, [activeGroupId, user?.uid]);

  const { audioEnabled, toggleAudio } = useCockpitAudio();
  const notifiedInGroupChallengeIdsRef = useRef<Set<string>>(new Set());

  const selectedChallenge = useMemo(
    () => challenges.find((c) => c.challengeId === selectedChallengeId) ?? null,
    [challenges, selectedChallengeId]
  );

  // Trigger push-notification audio alert inside TOEICHubPage whenever a teammate sends a Quick Challenge invite
  useEffect(() => {
    if (!activeGroupId || !user?.uid || challenges.length === 0) return;
    let newlyArrivedId: string | null = null;
    for (const ch of challenges) {
      const isPendingForMe =
        ch.status !== 'finished' &&
        ch.hostUid !== user.uid &&
        !ch.participantUids.includes(user.uid) &&
        !(ch.declinedUids ?? []).includes(user.uid) &&
        (Boolean(ch.invitedUids?.includes(user.uid)) || Boolean(ch.isQuickChallenge));
      if (isPendingForMe && !notifiedInGroupChallengeIdsRef.current.has(ch.challengeId)) {
        notifiedInGroupChallengeIdsRef.current.add(ch.challengeId);
        if (!newlyArrivedId) newlyArrivedId = ch.challengeId;
      }
    }
    if (newlyArrivedId) {
      playChallengeInviteChime({ challengeId: newlyArrivedId });
    }
  }, [activeGroupId, challenges, user?.uid]);

  // Reset local quiz cursor when switching challenge rooms
  useEffect(() => {
    setLiveQIndex(0);
    setLiveSelectedOption(null);
    setLiveAnswersMap({});
  }, [selectedChallengeId]);

  // Sync live countdown clock while an active challenge is open
  useEffect(() => {
    if (!selectedChallenge || selectedChallenge.status !== 'active') return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [selectedChallenge?.challengeId, selectedChallenge?.status]);

  // Compute remaining seconds for active challenge
  const remainingSeconds = useMemo(() => {
    if (!selectedChallenge || selectedChallenge.status !== 'active' || !selectedChallenge.startedAtMs) {
      return selectedChallenge?.timeLimitSeconds ?? 0;
    }
    const elapsedSec = Math.floor((nowMs - selectedChallenge.startedAtMs) / 1000);
    return Math.max(0, selectedChallenge.timeLimitSeconds - elapsedSec);
  }, [selectedChallenge, nowMs]);

  // Auto-finalize player or room when countdown reaches 0
  useEffect(() => {
    if (!selectedChallenge || !activeGroup || !user?.uid) return;
    if (selectedChallenge.status !== 'active' || remainingSeconds > 0) return;
    const me = selectedChallenge.participants[user.uid];
    if (!me) return;

    if (!me.finished) {
      void updateMyChallengeProgress({
        groupId: activeGroup.groupId,
        challenge: selectedChallenge,
        uid: user.uid,
        participant: {
          ...me,
          finished: true,
          finishedAtMs: Date.now(),
        },
        finishRoomIfAllDone: true,
      });
    } else if (selectedChallenge.hostUid === user.uid) {
      void finishGroupChallenge(activeGroup.groupId, selectedChallenge.challengeId);
    }
  }, [remainingSeconds, selectedChallenge, activeGroup, user?.uid]);

  // Award Ngọc kiến thức once per finished challenge for participants who completed answers
  useEffect(() => {
    if (!selectedChallenge || !user?.uid) return;
    const me = selectedChallenge.participants[user.uid];
    if (!me) return;
    const isCompletedByMe = me.finished || selectedChallenge.status === 'finished';
    if (!isCompletedByMe || me.answeredCount === 0) return;

    const storageKey = `toeic_battle_rewarded_${user.uid}_${selectedChallenge.challengeId}`;
    if (
      rewardedChallengeIdsRef.current.has(selectedChallenge.challengeId) ||
      window.localStorage.getItem(storageKey) === '1'
    ) {
      return;
    }

    rewardedChallengeIdsRef.current.add(selectedChallenge.challengeId);
    window.localStorage.setItem(storageKey, '1');

    const ranked = rankParticipants(selectedChallenge);
    const myRank = ranked.findIndex((p) => p.uid === user.uid) + 1;
    const accuracy = Math.round((me.correctCount / Math.max(1, selectedChallenge.questionCount)) * 100);
    const isTopBonus = (myRank === 1 && ranked.length > 1) || accuracy >= 80;
    const reward = 20 + (isTopBonus ? 10 : 0);

    awardBonusGems(
      reward,
      `Hoàn thành thách đấu nhóm TOEIC "${selectedChallenge.title}" (${accuracy}%)`
    );
    triggerGemFlight({
      amount: reward,
      lessonCompleted: isTopBonus,
      label: isTopBonus ? 'Thưởng Top Thách đấu TOEIC' : 'Thưởng Thách đấu Nhóm TOEIC',
    });
  }, [selectedChallenge, user?.uid, awardBonusGems, triggerGemFlight]);

  const discoverablePublicGroups = useMemo(() => {
    const myIds = new Set(myGroups.map((g) => g.groupId));
    return publicGroups.filter((g) => !myIds.has(g.groupId));
  }, [publicGroups, myGroups]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      addToast('success', `Đã sao chép mã mời ${code}. Gửi cho bạn bè để cùng tham gia!`);
      window.setTimeout(() => setCopiedCode(null), 2200);
    } catch {
      addToast('info', `Mã mời nhóm của bạn là: ${code}`);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      addToast('error', 'Vui lòng đăng nhập để tạo nhóm học TOEIC.');
      return;
    }
    setCreatingGroup(true);
    try {
      const created = await createToeicGroup({
        name: groupName,
        description: groupDesc,
        targetScore: groupTargetScore,
        maxMembers: groupMaxMembers,
        isPublic: groupIsPublic,
        badge: groupBadge,
        user: userProfile,
      });
      setGroupName('');
      setGroupDesc('');
      setGroupBadge(getDefaultToeicGroupBadge('', 750));
      setShowCreateForm(false);
      setActiveGroupId(created.groupId);
      setGroupSubTab('vocab');
      addToast('success', `Đã tạo nhóm "${created.name}" cùng huy hiệu riêng · Mã mời: ${created.inviteCode}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể tạo nhóm lúc này.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const openBadgeStudioModal = () => {
    if (!activeGroup) return;
    setEditingBadge(
      resolveToeicGroupBadge(activeGroup.badge, activeGroup.name, activeGroup.targetScore)
    );
    setShowBadgeModal(true);
  };

  const handleSaveGroupBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    setSavingBadge(true);
    try {
      await updateToeicGroupBadge(activeGroup.groupId, editingBadge);
      setShowBadgeModal(false);
      addToast('success', `Đã cập nhật huy hiệu mới cho nhóm "${activeGroup.name}"!`);
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : 'Không thể lưu huy hiệu nhóm lúc này.'
      );
    } finally {
      setSavingBadge(false);
    }
  };

  const handleDownloadBadgePng = async (svgEl: SVGSVGElement | null, label: string) => {
    const ok = await exportBadgeSvgToPng(svgEl, `huy_hieu_${label}`);
    if (ok) {
      addToast('success', 'Đã tải xuống ảnh huy hiệu PNG sắc nét (512×512)!');
    } else {
      addToast('error', 'Không thể xuất ảnh PNG huy hiệu lúc này.');
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setJoiningGroupId('code');
    try {
      const joined = await joinToeicGroupByCode(inviteCodeInput, userProfile);
      setInviteCodeInput('');
      setActiveGroupId(joined.groupId);
      setGroupSubTab('vocab');
      addToast('success', `Chào mừng bạn tham gia nhóm "${joined.name}"!`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể tham gia bằng mã mời này.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleJoinPublicGroup = async (group: ToeicGroupDoc) => {
    if (!userProfile) return;
    setJoiningGroupId(group.groupId);
    try {
      await joinToeicGroupById(group.groupId, userProfile);
      setActiveGroupId(group.groupId);
      setGroupSubTab('vocab');
      addToast('success', `Đã tham gia nhóm "${group.name}"!`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể tham gia nhóm lúc này.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleLeaveActiveGroup = async () => {
    if (!activeGroup || !user?.uid) return;
    try {
      await leaveToeicGroup(activeGroup, user.uid);
      addToast('info', `Bạn đã rời khỏi nhóm "${activeGroup.name}".`);
      setActiveGroupId(null);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể rời nhóm.');
    }
  };

  const handleDeleteActiveGroup = async () => {
    if (!activeGroup) return;
    try {
      await deleteToeicGroup(activeGroup.groupId);
      addToast('info', `Đã giải tán nhóm "${activeGroup.name}".`);
      setConfirmDeleteGroup(false);
      setActiveGroupId(null);
    } catch {
      addToast('error', 'Không thể xóa nhóm lúc này.');
    }
  };

  const handleShareVocabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !userProfile) return;

    setSubmittingVocab(true);
    try {
      if (shareMode === 'catalog') {
        if (!pickedWord) {
          addToast('error', 'Hãy chọn một từ vựng từ danh sách 616 từ TOEIC.');
          setSubmittingVocab(false);
          return;
        }
        await shareVocabToGroup(
          activeGroup.groupId,
          {
            word: pickedWord.vocab.word,
            ipa: pickedWord.vocab.ipa,
            partOfSpeech: pickedWord.vocab.partOfSpeech,
            meaningVi: pickedWord.vocab.meaningVi,
            exampleEn: pickedWord.vocab.exampleEn,
            exampleVi: pickedWord.vocab.exampleVi,
            noteVi: shareNote,
            topicLabel: pickedWord.topicLabel,
            sourceVocabId: pickedWord.vocab.id,
            sourceLessonId: pickedWord.lesson.lessonId,
          },
          userProfile
        );
        setPickedWord(null);
        setCatalogSearch('');
      } else {
        await shareVocabToGroup(
          activeGroup.groupId,
          {
            word: customWord,
            ipa: customIpa,
            partOfSpeech: customPos,
            meaningVi: customMeaning,
            exampleEn: customExampleEn,
            exampleVi: customExampleVi,
            noteVi: shareNote,
            topicLabel: 'Từ vựng thành viên chia sẻ',
          },
          userProfile
        );
        setCustomWord('');
        setCustomIpa('');
        setCustomMeaning('');
        setCustomExampleEn('');
        setCustomExampleVi('');
      }
      setShareNote('');
      setShowShareForm(false);
      recordStudyActivity();
      addToast('success', 'Đã chia sẻ từ vựng TOEIC lên bảng nhóm thời gian thực!');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể chia sẻ từ vựng.');
    } finally {
      setSubmittingVocab(false);
    }
  };

  const handleSaveSharedWordToMyBank = async (entry: ToeicGroupVocabDoc) => {
    if (!entry.sourceLessonId || !entry.sourceVocabId) return;
    const lesson = lessonById.get(entry.sourceLessonId);
    const vocab = lesson?.vocabulary.find((v) => v.id === entry.sourceVocabId);
    if (!lesson || !vocab) return;

    setSavingCatalogVocabId(entry.entryId);
    try {
      const alreadyLearned = Boolean(vocabMap[vocab.id]?.isLearned);
      await toggleVocabState(lesson, vocab, { isLearned: !alreadyLearned });
    } catch {
      addToast('error', 'Không thể cập nhật kho từ cá nhân.');
    } finally {
      setSavingCatalogVocabId(null);
    }
  };

  // Generate synchronized TOEIC challenge questions
  const buildChallengeQuestions = useCallback(
    (scope: string, count: number): { questions: ToeicChallengeQuestion[]; scopeLabel: string } => {
      if (scope === 'part5') {
        const picked = shuffleArray(TOEIC_PART5_DRILLS).slice(0, count);
        return {
          scopeLabel: 'Luyện đề TOEIC Part 5 (Ngữ pháp & Word Form)',
          questions: picked.map((q) => ({
            id: q.id,
            prompt: q.sentence,
            options: q.options,
            correctIndex: q.correctIndex,
            explanationVi: q.explanationVi,
          })),
        };
      }

      if (scope === 'group_shared' && sharedVocab.length >= 4) {
        const picked = shuffleArray(sharedVocab).slice(0, Math.min(count, sharedVocab.length));
        const allMeanings = [
          ...sharedVocab.map((v) => v.meaningVi),
          ...indexedToeicWords.slice(0, 40).map((w) => w.vocab.meaningVi),
        ];
        return {
          scopeLabel: 'Từ vựng nhóm vừa chia sẻ',
          questions: picked.map((entry, idx) => {
            const distractors = shuffleArray(
              Array.from(new Set(allMeanings.filter((m) => m !== entry.meaningVi)))
            ).slice(0, 3);
            const opts = shuffleArray([entry.meaningVi, ...distractors]) as [
              string,
              string,
              string,
              string,
            ];
            return {
              id: `grp_q_${idx}_${entry.entryId}`,
              prompt: `Từ vựng "${entry.word}" ${entry.ipa ? `(${entry.ipa}) ` : ''}do ${entry.sharedByName} chia sẻ có nghĩa là gì?`,
              options: opts,
              correctIndex: opts.indexOf(entry.meaningVi),
              explanationVi: `"${entry.word}" (${entry.partOfSpeech}) = ${entry.meaningVi}.${entry.noteVi ? ` Mẹo: ${entry.noteVi}` : ''}`,
            };
          }),
        };
      }

      let pool = indexedToeicWords;
      let scopeLabel = 'Tổng hợp 44 chủ đề TOEIC (616 từ)';
      if (scope.startsWith('cat:')) {
        const catId = scope.slice(4);
        const meta = TOEIC_CATEGORIES.find((c) => c.id === catId);
        pool = indexedToeicWords.filter((w) => w.categoryId === catId);
        if (meta) scopeLabel = `Chủ đề ${meta.rangeLabel}: ${meta.titleVi}`;
      }

      const picked = shuffleArray(pool).slice(0, count);
      const questions: ToeicChallengeQuestion[] = picked.map((item, idx) => {
        const askViToEn = idx % 2 === 1;
        if (askViToEn) {
          const distractors = shuffleArray(
            indexedToeicWords
              .filter((other) => other.vocab.word !== item.vocab.word)
              .map((other) => other.vocab.word)
          ).slice(0, 3);
          const opts = shuffleArray([item.vocab.word, ...distractors]) as [
            string,
            string,
            string,
            string,
          ];
          return {
            id: `tc_q_${idx}_${item.vocab.id}`,
            prompt: `Chọn từ tiếng Anh TOEIC mang nghĩa "${item.vocab.meaningVi}" (${item.topicLabel}):`,
            options: opts,
            correctIndex: opts.indexOf(item.vocab.word),
            explanationVi: `"${item.vocab.word}" (${item.vocab.ipa}) nghĩa là "${item.vocab.meaningVi}". VD: ${item.vocab.exampleEn}`,
          };
        }

        const distractors = shuffleArray(
          indexedToeicWords
            .filter((other) => other.vocab.meaningVi !== item.vocab.meaningVi)
            .map((other) => other.vocab.meaningVi)
        ).slice(0, 3);
        const opts = shuffleArray([item.vocab.meaningVi, ...distractors]) as [
          string,
          string,
          string,
          string,
        ];
        return {
          id: `tc_q_${idx}_${item.vocab.id}`,
          prompt: `Trong TOEIC (${item.topicLabel}), từ "${item.vocab.word}" (${item.vocab.ipa}) có nghĩa là gì?`,
          options: opts,
          correctIndex: opts.indexOf(item.vocab.meaningVi),
          explanationVi: `"${item.vocab.word}" (${item.vocab.partOfSpeech}) nghĩa là "${item.vocab.meaningVi}". VD: ${item.vocab.exampleEn}`,
        };
      });

      return { questions, scopeLabel };
    },
    [indexedToeicWords, sharedVocab]
  );

  const openQuickChallengeLauncher = () => {
    if (!activeGroup || !user?.uid) return;
    const otherMemberUids = activeGroup.memberUids.filter((id) => id !== user.uid);
    setQuickInvitedUids(otherMemberUids);
    setShowQuickChallengeModal(true);
  };

  const toggleQuickInviteUid = (uid: string) => {
    setQuickInvitedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleLaunchQuickChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !userProfile) return;
    setCreatingQuickChallenge(true);
    try {
      const { questions, scopeLabel } = buildChallengeQuestions(quickScope, 10);
      const invitedCount = quickInvitedUids.length;
      const newId = await createGroupChallenge({
        groupId: activeGroup.groupId,
        title: `Thách đấu nhanh 10 câu · ${userProfile.fullName || 'Pilot'}`,
        scopeLabel,
        timeLimitSeconds: quickTimeLimit,
        questions,
        user: userProfile,
        isQuickChallenge: true,
        invitedUids: quickInvitedUids,
      });
      setShowQuickChallengeModal(false);
      setGroupSubTab('challenges');
      setSelectedChallengeId(newId);
      playChallengeAcceptedSfx();
      addToast(
        'success',
        invitedCount > 0
          ? `Đã gửi lời mời Thách đấu nhanh 10 câu tới ${invitedCount} thành viên! Bấm Bắt đầu khi sẵn sàng.`
          : 'Đã mở phòng Thách đấu nhanh 10 câu! Bấm Bắt đầu bất cứ lúc nào.'
      );
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể tạo Thách đấu nhanh lúc này.');
    } finally {
      setCreatingQuickChallenge(false);
    }
  };

  const handleAcceptQuickInvite = async (challenge: ToeicGroupChallengeDoc) => {
    if (!activeGroup || !userProfile) return;
    setBusyChallengeAction(true);
    try {
      if (!challenge.participantUids.includes(userProfile.uid)) {
        await joinGroupChallenge(activeGroup.groupId, challenge, userProfile);
      }
      playChallengeAcceptedSfx();
      setGroupSubTab('challenges');
      setSelectedChallengeId(challenge.challengeId);
      addToast('success', `Đã chấp nhận lời mời vào phòng "${challenge.title}"!`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể vào phòng thách đấu.');
    } finally {
      setBusyChallengeAction(false);
    }
  };

  const handleDeclineQuickInvite = async (challenge: ToeicGroupChallengeDoc) => {
    if (!activeGroup || !userProfile) return;
    setBusyChallengeAction(true);
    try {
      await declineGroupChallenge(activeGroup.groupId, challenge, userProfile.uid);
      playChallengeDeclinedSfx();
      addToast('info', `Đã từ chối lời mời thách đấu từ ${challenge.hostName}.`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể từ chối lời mời lúc này.');
    } finally {
      setBusyChallengeAction(false);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !userProfile) return;
    setCreatingChallenge(true);
    try {
      const { questions, scopeLabel } = buildChallengeQuestions(challengeScope, challengeCount);
      const otherMemberUids = activeGroup.memberUids.filter((id) => id !== userProfile.uid);
      const newId = await createGroupChallenge({
        groupId: activeGroup.groupId,
        title: challengeTitle || 'Thách đấu TOEIC tốc độ',
        scopeLabel,
        timeLimitSeconds: challengeTimeLimit,
        questions,
        user: userProfile,
        isQuickChallenge: false,
        invitedUids: otherMemberUids,
      });
      setShowChallengeForm(false);
      setSelectedChallengeId(newId);
      addToast('success', 'Đã mở phòng thách đấu! Chờ thành viên vào phòng rồi bấm Bắt đầu.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể tạo phòng thách đấu.');
    } finally {
      setCreatingChallenge(false);
    }
  };

  const handleJoinChallenge = async (challenge: ToeicGroupChallengeDoc) => {
    if (!activeGroup || !userProfile) return;
    setBusyChallengeAction(true);
    try {
      await joinGroupChallenge(activeGroup.groupId, challenge, userProfile);
      setSelectedChallengeId(challenge.challengeId);
      addToast('success', `Bạn đã tham gia phòng "${challenge.title}"!`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể tham gia phòng thách đấu.');
    } finally {
      setBusyChallengeAction(false);
    }
  };

  const handleStartChallenge = async (challenge: ToeicGroupChallengeDoc) => {
    if (!activeGroup) return;
    setBusyChallengeAction(true);
    try {
      await startGroupChallenge(activeGroup.groupId, challenge.challengeId);
      addToast('success', 'Trận thách đấu đã bắt đầu! Chúc cả nhóm đạt điểm tối đa!');
    } catch {
      addToast('error', 'Không thể bắt đầu trận thách đấu lúc này.');
    } finally {
      setBusyChallengeAction(false);
    }
  };

  const handleAnswerLiveQuestion = async (optionIdx: number) => {
    if (!activeGroup || !selectedChallenge || !user?.uid) return;
    if (selectedChallenge.status !== 'active' || liveSelectedOption !== null) return;
    const me = selectedChallenge.participants[user.uid];
    if (!me || me.finished) return;

    const currentQ = selectedChallenge.questions[liveQIndex];
    if (!currentQ) return;

    setLiveSelectedOption(optionIdx);
    const nextAnswers = { ...liveAnswersMap, [liveQIndex]: optionIdx };
    setLiveAnswersMap(nextAnswers);
    recordStudyActivity();

    const isCorrect = optionIdx === currentQ.correctIndex;
    const nextAnswered = Math.min(selectedChallenge.questionCount, me.answeredCount + 1);
    const nextCorrect = me.correctCount + (isCorrect ? 1 : 0);
    // Speed bonus: +100 per correct + up to +30 speed points based on remaining ratio
    const speedRatio =
      selectedChallenge.timeLimitSeconds > 0
        ? remainingSeconds / selectedChallenge.timeLimitSeconds
        : 0;
    const deltaPoints = isCorrect ? 100 + Math.round(speedRatio * 30) : 0;
    const isLastQuestion = liveQIndex + 1 >= selectedChallenge.questionCount;

    const updatedMe: ToeicChallengeParticipant = {
      ...me,
      answeredCount: nextAnswered,
      correctCount: nextCorrect,
      score: me.score + deltaPoints,
      finished: isLastQuestion,
      finishedAtMs: isLastQuestion ? Date.now() : 0,
    };

    try {
      await updateMyChallengeProgress({
        groupId: activeGroup.groupId,
        challenge: selectedChallenge,
        uid: user.uid,
        participant: updatedMe,
        finishRoomIfAllDone: isLastQuestion,
      });
    } catch {
      addToast('error', 'Không thể đồng bộ câu trả lời lên bảng điểm trực tiếp.');
    }
  };

  const handleNextLiveQuestion = () => {
    if (!selectedChallenge) return;
    if (liveQIndex + 1 < selectedChallenge.questionCount) {
      setLiveQIndex((i) => i + 1);
      setLiveSelectedOption(null);
    }
  };

  if (!user || !userProfile) {
    return (
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-8 text-center space-y-3">
        <Users className="w-10 h-10 mx-auto text-[#FF6B00]" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Đăng nhập để tham gia Nhóm học TOEIC thời gian thực
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Bạn cần tài khoản học viên đã xác thực để tạo nhóm học nhỏ, chia sẻ từ vựng TOEIC và
          thách đấu làm bài kiểm tra trực tiếp cùng bạn bè.
        </p>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: ACTIVE GROUP WORKSPACE
  // =========================================================================
  if (activeGroup) {
    const isCreator = activeGroup.creatorUid === user.uid;
    const liveBattleCount = challenges.filter((c) => !isHistoricalChallenge(c, nowMs)).length;
    const historyBattleCount = challenges.filter((c) => isHistoricalChallenge(c, nowMs)).length;
    const memberList = Object.values(activeGroup.members).sort((a, b) => {
      if (a.uid === activeGroup.creatorUid) return -1;
      if (b.uid === activeGroup.creatorUid) return 1;
      return a.joinedAtMs - b.joinedAtMs;
    });
    const otherMembers = memberList.filter((m) => m.uid !== user.uid);
    const pendingQuickInvites = challenges.filter(
      (c) =>
        c.status !== 'finished' &&
        !c.participantUids.includes(user.uid) &&
        !(c.declinedUids ?? []).includes(user.uid) &&
        c.challengeId !== selectedChallengeId &&
        (Boolean(c.invitedUids?.includes(user.uid)) ||
          (Boolean(c.isQuickChallenge) && c.hostUid !== user.uid))
    );

    return (
      <div className="space-y-5">
        {/* Group Header */}
        <section className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <button
                type="button"
                onClick={openBadgeStudioModal}
                title={isCreator ? 'Nhấn để tùy chỉnh huy hiệu nhóm' : 'Xem & tải huy hiệu nhóm'}
                className="group relative shrink-0 rounded-2xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <ToeicGroupBadgeEmblem
                  badge={activeGroup.badge}
                  groupName={activeGroup.name}
                  targetScore={activeGroup.targetScore}
                  size="lg"
                />
                {isCreator && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                    <Palette className="w-3 h-3" />
                  </span>
                )}
              </button>

              <div className="space-y-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroupId(null);
                    setSelectedChallengeId(null);
                    setConfirmDeleteGroup(false);
                    setShowQuickChallengeModal(false);
                    setShowBadgeModal(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại danh sách Nhóm học TOEIC</span>
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">
                    {activeGroup.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
                    Mục tiêu {activeGroup.targetScore}+ TOEIC
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {activeGroup.isPublic ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-500" />
                        Công khai
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        Riêng tư
                      </>
                    )}
                  </span>
                </div>

                {activeGroup.badge?.motto && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span>&ldquo;{activeGroup.badge.motto}&rdquo;</span>
                  </p>
                )}

                {activeGroup.description && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {activeGroup.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={openQuickChallengeLauncher}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold shadow-[0_0_16px_rgba(255,107,0,0.28)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>Thách đấu nhanh (10 câu)</span>
              </button>

              <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={toggleAudio}
                  title={
                    audioEnabled
                      ? 'Đang bật chuông thông báo Thách đấu nhanh (nhấn để tắt)'
                      : 'Đang tắt chuông thông báo (nhấn để bật)'
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    audioEnabled
                      ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {audioEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{audioEnabled ? 'Âm báo: Bật' : 'Âm báo: Tắt'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => playChallengeInviteChime({ forcePlay: true })}
                  title="Nghe thử hiệu ứng âm thanh thông báo đẩy Thách đấu nhanh"
                  className="inline-flex items-center gap-1 px-2.5 py-2 border-l border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <BellRing className="w-3.5 h-3.5 shrink-0" />
                  <span>Thử chuông</span>
                </button>
              </div>

              <button
                type="button"
                onClick={openBadgeStudioModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300/80 dark:border-amber-700/70 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>{isCreator ? 'Tùy chỉnh huy hiệu' : 'Huy hiệu nhóm'}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleCopyCode(activeGroup.inviteCode)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-[#FF6B00] text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Mã mời:</span>
                <span className="font-mono tracking-wider text-[#D94E00] dark:text-[#FF8524]">
                  {activeGroup.inviteCode}
                </span>
                {copiedCode === activeGroup.inviteCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            {[
              {
                id: 'vocab' as const,
                label: `Từ vựng chia sẻ (${sharedVocab.length})`,
                icon: BookOpen,
              },
              {
                id: 'challenges' as const,
                label: `Thách đấu Quiz Live (${liveBattleCount})`,
                icon: Swords,
                hasLive: liveBattleCount > 0,
              },
              {
                id: 'history' as const,
                label: `Lịch sử thách đấu (${historyBattleCount})`,
                icon: History,
              },
              {
                id: 'members' as const,
                label: `Thành viên (${activeGroup.memberUids.length}/${activeGroup.maxMembers})`,
                icon: Users,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = groupSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGroupSubTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="tabular-nums">{tab.label}</span>
                  {tab.hasLive && (
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      LIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Real-time Incoming Quick Challenge Invitations Banner */}
        {pendingQuickInvites.length > 0 && (
          <section className="space-y-2.5">
            {pendingQuickInvites.slice(0, 2).map((invite) => (
              <div
                key={invite.challengeId}
                className="rounded-2xl border border-[#FF6B00]/50 bg-gradient-to-r from-orange-50 via-amber-50/70 to-orange-50 dark:from-orange-950/40 dark:via-slate-900 dark:to-orange-950/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => playChallengeInviteChime({ forcePlay: true })}
                    title="Phát lại âm thanh thông báo thách đấu"
                    className="relative w-10 h-10 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,107,0,0.4)] transition-colors cursor-pointer"
                  >
                    <BellRing className="w-5 h-5 animate-bounce" />
                  </button>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-[#D94E00] dark:text-[#FF8524]">
                      <span>
                        {invite.isQuickChallenge
                          ? 'Lời mời Thách đấu nhanh (10 câu)'
                          : 'Lời mời Thách đấu TOEIC trực tiếp'}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
                        {invite.questionCount} câu · Đếm ngược {formatCountdown(invite.timeLimitSeconds)}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {invite.hostName} mời bạn cùng làm bài kiểm tra: {invite.scopeLabel}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      Trạng thái:{' '}
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {invite.status === 'active'
                          ? 'Đang đếm ngược trực tiếp — vào thi ngay!'
                          : `Đang mở phòng chờ (${invite.participantUids.length} thí sinh sẵn sàng)`}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyChallengeAction}
                    onClick={() => void handleDeclineQuickInvite(invite)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-60 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Từ chối</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyChallengeAction}
                    onClick={() => void handleAcceptQuickInvite(invite)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Chấp nhận &amp; Thi ngay</span>
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Quick Challenge Launcher Modal (Fixed 10 Questions + Member Invites) */}
        {showQuickChallengeModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-challenge-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowQuickChallengeModal(false);
            }}
          >
            <form
              onSubmit={handleLaunchQuickChallenge}
              className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-auto"
            >
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-[#07111F] to-[#132B4D] text-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FF6B00] flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4
                      id="quick-challenge-modal-title"
                      className="text-base font-extrabold truncate"
                    >
                      Thách đấu nhanh TOEIC · 10 câu hỏi trực tiếp
                    </h4>
                    <p className="text-xs text-slate-300 truncate">
                      Mời thành viên nhóm thi chung thời gian thực, đếm ngược trực tiếp &amp; xếp hạng ngay
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickChallengeModal(false)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Đóng hộp thoại Thách đấu nhanh"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* 1. Member Invite Selector */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      1. Mời thành viên nhóm ({quickInvitedUids.length}/{otherMembers.length})
                    </label>
                    {otherMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuickInvitedUids(
                            quickInvitedUids.length === otherMembers.length
                              ? []
                              : otherMembers.map((m) => m.uid)
                          )
                        }
                        className="text-xs font-bold text-[#D94E00] dark:text-[#FF8524] hover:underline cursor-pointer"
                      >
                        {quickInvitedUids.length === otherMembers.length
                          ? 'Bỏ chọn tất cả'
                          : 'Mời tất cả thành viên'}
                      </button>
                    )}
                  </div>

                  {otherMembers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Hiện nhóm chưa có thành viên khác. Bạn vẫn có thể mở phòng 10 câu ngay hoặc
                        gửi mã mời <span className="font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">{activeGroup.inviteCode}</span> cho bạn bè vào nhóm!
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleCopyCode(activeGroup.inviteCode)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#FF6B00]" />
                        <span>Sao chép mã</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {otherMembers.map((member) => {
                        const checked = quickInvitedUids.includes(member.uid);
                        return (
                          <button
                            key={member.uid}
                            type="button"
                            onClick={() => toggleQuickInviteUid(member.uid)}
                            className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                              checked
                                ? 'border-[#FF6B00] bg-orange-50/80 dark:bg-orange-950/35'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {member.displayName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                CEFR {member.currentLevel}
                              </div>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                checked
                                  ? 'border-[#FF6B00] bg-[#FF6B00] text-white'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                              }`}
                            >
                              {checked && <Check className="w-3.5 h-3.5" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Topic Scope */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    2. Nguồn bộ đề 10 câu hỏi TOEIC
                  </label>
                  <select
                    value={quickScope}
                    onChange={(e) => setQuickScope(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    <option value="all_vocab">Tổng hợp 44 chủ đề TOEIC (616 từ vựng)</option>
                    <option value="part5">Luyện đề TOEIC Part 5 (Ngữ pháp &amp; Word Form)</option>
                    {sharedVocab.length >= 4 && (
                      <option value="group_shared">
                        Từ vựng nhóm vừa chia sẻ ({sharedVocab.length} từ)
                      </option>
                    )}
                    {TOEIC_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={`cat:${cat.id}`}>
                        Chủ đề {cat.rangeLabel}: {cat.titleVi}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Countdown Duration */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    3. Thời gian đếm ngược (10 câu hỏi cố định)
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { sec: 120, label: '2 phút', sub: 'Tốc độ cao' },
                      { sec: 180, label: '3 phút', sub: 'Tiêu chuẩn' },
                      { sec: 240, label: '4 phút', sub: 'Thoải mái' },
                    ].map((opt) => {
                      const active = quickTimeLimit === opt.sec;
                      return (
                        <button
                          key={opt.sec}
                          type="button"
                          onClick={() => setQuickTimeLimit(opt.sec)}
                          className={`p-3 rounded-xl border text-center transition-colors cursor-pointer ${
                            active
                              ? 'border-[#FF6B00] bg-orange-50 dark:bg-orange-950/40 text-[#D94E00] dark:text-[#FF8524]'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-sm font-extrabold tabular-nums">{opt.label}</div>
                          <div className="text-[11px] opacity-80">{opt.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
                  <Gem className="w-3.5 h-3.5" />
                  Thưởng +20 đến +30 Ngọc khi hoàn thành
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickChallengeModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={creatingQuickChallenge}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      {creatingQuickChallenge
                        ? 'Đang tạo bộ đề 10 câu...'
                        : 'Gửi lời mời & Mở phòng 10 câu'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Group Badge Studio / Showcase Modal */}
        {showBadgeModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-badge-studio-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowBadgeModal(false);
            }}
          >
            {isCreator ? (
              <form
                onSubmit={handleSaveGroupBadge}
                className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-auto"
              >
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-[#07111F] to-[#132B4D] text-white">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FF6B00] flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4
                        id="group-badge-studio-title"
                        className="text-base font-extrabold truncate"
                      >
                        Xưởng thiết kế Huy hiệu nhóm · {activeGroup.name}
                      </h4>
                      <p className="text-xs text-slate-300 truncate">
                        Cá nhân hóa hình dáng, biểu tượng, bảng màu và khẩu hiệu nhận diện cho cả nhóm
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBadgeModal(false)}
                    className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Đóng xưởng thiết kế huy hiệu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 max-h-[75vh] overflow-y-auto">
                  <ToeicGroupBadgeCustomizer
                    value={editingBadge}
                    onChange={setEditingBadge}
                    groupName={activeGroup.name}
                    targetScore={activeGroup.targetScore}
                    previewSvgRef={modalBadgeSvgRef}
                    onDownloadPng={() =>
                      void handleDownloadBadgePng(modalBadgeSvgRef.current, activeGroup.inviteCode)
                    }
                  />
                </div>

                <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Huy hiệu sẽ tự động đồng bộ thời gian thực tới tất cả thành viên và danh sách nhóm công khai.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBadgeModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={savingBadge}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{savingBadge ? 'Đang lưu huy hiệu...' : 'Lưu huy hiệu nhóm'}</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-auto">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <h4
                    id="group-badge-studio-title"
                    className="text-sm font-extrabold text-slate-900 dark:text-white truncate"
                  >
                    Huy hiệu chính thức · {activeGroup.name}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowBadgeModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    aria-label="Đóng"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] cockpit-grid flex flex-col items-center text-center gap-3 text-white">
                  <ToeicGroupBadgeEmblem
                    ref={modalBadgeSvgRef}
                    badge={activeGroup.badge}
                    groupName={activeGroup.name}
                    targetScore={activeGroup.targetScore}
                    size="xl"
                  />
                  <div className="space-y-1">
                    <div className="text-base font-extrabold">{activeGroup.name}</div>
                    {activeGroup.badge?.motto && (
                      <div className="text-xs font-semibold text-amber-300">
                        &ldquo;{activeGroup.badge.motto}&rdquo;
                      </div>
                    )}
                    <div className="text-xs text-slate-300">
                      Mục tiêu {activeGroup.targetScore}+ TOEIC · Trưởng nhóm: {activeGroup.creatorName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleDownloadBadgePng(modalBadgeSvgRef.current, activeGroup.inviteCode)
                    }
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải ảnh huy hiệu PNG</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* SUB-TAB 1: SHARED VOCABULARY FEED                               */}
        {/* =============================================================== */}
        {groupSubTab === 'vocab' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Kho từ vựng TOEIC chia sẻ trực tiếp trong nhóm
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chia sẻ từ khó hay gặp kèm mẹo nhớ. Bấm lưu vào kho cá nhân để nhận +3 Ngọc kiến
                  thức!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareForm((v) => !v)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{showShareForm ? 'Đóng biểu mẫu' : 'Chia sẻ từ vựng'}</span>
              </button>
            </div>

            {showShareForm && (
              <form
                onSubmit={handleShareVocabSubmit}
                className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShareMode('catalog')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      shareMode === 'catalog'
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Chọn từ 616 từ TOEIC có sẵn
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareMode('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      shareMode === 'custom'
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Tự nhập từ vựng mới
                  </button>
                </div>

                {shareMode === 'catalog' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        placeholder="Tìm từ tiếng Anh, nghĩa tiếng Việt hoặc chủ đề (1–44)..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                      />
                    </div>

                    {pickedWord && (
                      <div className="rounded-xl border border-[#FF6B00]/50 bg-orange-50/70 dark:bg-orange-950/25 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {pickedWord.vocab.word}{' '}
                            <span className="font-mono text-xs font-normal text-sky-600 dark:text-sky-400">
                              {pickedWord.vocab.ipa}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            {pickedWord.vocab.meaningVi} · {pickedWord.topicLabel}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPickedWord(null)}
                          className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                        >
                          Đổi từ
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {catalogMatches.map((item) => {
                        const selected = pickedWord?.vocab.id === item.vocab.id;
                        return (
                          <button
                            key={item.vocab.id}
                            type="button"
                            onClick={() => setPickedWord(item)}
                            className={`text-left p-2.5 rounded-xl border transition-colors ${
                              selected
                                ? 'border-[#FF6B00] bg-orange-50 dark:bg-orange-950/35'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-[#FF6B00]/60'
                            }`}
                          >
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.vocab.word}{' '}
                              <span className="font-mono font-normal text-[11px] text-slate-500">
                                {item.vocab.ipa}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                              {item.vocab.meaningVi}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Từ tiếng Anh *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        value={customWord}
                        onChange={(e) => setCustomWord(e.target.value)}
                        placeholder="Ví dụ: reimburse"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Phiên âm IPA
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={customIpa}
                        onChange={(e) => setCustomIpa(e.target.value)}
                        placeholder="/ˌriː.ɪmˈbɜːrs/"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Từ loại
                      </label>
                      <select
                        value={customPos}
                        onChange={(e) => setCustomPos(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      >
                        <option value="noun">noun (Danh từ)</option>
                        <option value="verb">verb (Động từ)</option>
                        <option value="adjective">adjective (Tính từ)</option>
                        <option value="adverb">adverb (Trạng từ)</option>
                        <option value="phrase">phrase (Cụm từ)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nghĩa tiếng Việt *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={240}
                        value={customMeaning}
                        onChange={(e) => setCustomMeaning(e.target.value)}
                        placeholder="Hoàn lại chi phí (công tác, hóa đơn)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Câu ví dụ tiếng Anh
                      </label>
                      <input
                        type="text"
                        maxLength={320}
                        value={customExampleEn}
                        onChange={(e) => setCustomExampleEn(e.target.value)}
                        placeholder="The company will reimburse all approved travel expenses."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Dịch câu ví dụ
                      </label>
                      <input
                        type="text"
                        maxLength={320}
                        value={customExampleVi}
                        onChange={(e) => setCustomExampleVi(e.target.value)}
                        placeholder="Công ty sẽ hoàn lại mọi chi phí công tác đã duyệt."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mẹo ghi nhớ / lưu ý thi TOEIC gửi tới cả nhóm (tùy chọn)
                  </label>
                  <input
                    type="text"
                    maxLength={280}
                    value={shareNote}
                    onChange={(e) => setShareNote(e.target.value)}
                    placeholder="Ví dụ: Hay bẫy giới từ 'reimburse somebody FOR something' ở Part 5!"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShareForm(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingVocab}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-60 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingVocab ? 'Đang đăng...' : 'Đăng lên nhóm'}</span>
                  </button>
                </div>
              </form>
            )}

            {sharedVocab.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-10 text-center space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Nhóm chưa có từ vựng chia sẻ nào
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hãy là người đầu tiên đăng một từ vựng TOEIC trọng tâm kèm mẹo nhớ cho cả nhóm!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sharedVocab.map((entry) => {
                  const isLiked = entry.likedByUids.includes(user.uid);
                  const canDelete = entry.sharedByUid === user.uid || isCreator;
                  const hasCatalogLink = Boolean(entry.sourceLessonId && entry.sourceVocabId);
                  const isLearnedInBank = Boolean(
                    entry.sourceVocabId && vocabMap[entry.sourceVocabId]?.isLearned
                  );

                  return (
                    <article
                      key={entry.entryId}
                      className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-[#D94E00] dark:text-[#FF8524]">
                              {entry.topicLabel} · Chia sẻ bởi {entry.sharedByName}
                            </div>
                            <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                              <h5 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                                {entry.word}
                              </h5>
                              {entry.ipa && (
                                <span className="text-xs font-mono text-sky-600 dark:text-sky-400">
                                  {entry.ipa}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">({entry.partOfSpeech})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => speakEnglish(entry.word, { accent })}
                              className="p-2 rounded-lg text-slate-500 hover:text-[#FF6B00] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              aria-label={`Nghe phát âm ${entry.word}`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  void deleteGroupVocab(activeGroup.groupId, entry.entryId)
                                }
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                aria-label="Xóa từ chia sẻ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {entry.meaningVi}
                        </p>

                        {entry.exampleEn && (
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 px-3 py-2 text-xs space-y-0.5">
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {entry.exampleEn}
                            </p>
                            {entry.exampleVi && (
                              <p className="text-slate-500 dark:text-slate-400">{entry.exampleVi}</p>
                            )}
                          </div>
                        )}

                        {entry.noteVi && (
                          <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/60 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-bold">Mẹo từ {entry.sharedByName}: </span>
                            {entry.noteVi}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() =>
                            void toggleLikeGroupVocab(activeGroup.groupId, entry, user.uid)
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            isLiked
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                          <span className="tabular-nums">Hữu ích ({entry.likedByUids.length})</span>
                        </button>

                        {hasCatalogLink && (
                          <button
                            type="button"
                            disabled={savingCatalogVocabId === entry.entryId}
                            onClick={() => void handleSaveSharedWordToMyBank(entry)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                              isLearnedInBank
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/70 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                            }`}
                          >
                            {isLearnedInBank ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đã thuộc trong kho cá nhân</span>
                              </>
                            ) : (
                              <>
                                <Gem className="w-3.5 h-3.5" />
                                <span>Đánh dấu đã thuộc (+3 Ngọc)</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* SUB-TAB 2: REAL-TIME QUIZ BATTLES                               */}
        {/* =============================================================== */}
        {groupSubTab === 'challenges' && (
          <div className="space-y-5">
            {!selectedChallenge ? (
              <>
                <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Đấu trường Thách đấu TOEIC thời gian thực (+20 đến +30 Ngọc)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Mời thành viên làm bài kiểm tra 10 câu đồng bộ với bảng đếm ngược trực tiếp và
                      bảng vàng kết quả cuối cùng.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={openQuickChallengeLauncher}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Thách đấu nhanh (10 câu)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChallengeForm((v) => !v)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-[#FF6B00] text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Swords className="w-4 h-4 text-[#FF6B00]" />
                      <span>{showChallengeForm ? 'Đóng tùy chỉnh' : 'Tạo phòng tùy chỉnh'}</span>
                    </button>
                  </div>
                </div>

                {showChallengeForm && (
                  <form
                    onSubmit={handleCreateChallenge}
                    className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Tên trận thách đấu
                        </label>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={100}
                          value={challengeTitle}
                          onChange={(e) => setChallengeTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Nguồn câu hỏi TOEIC
                        </label>
                        <select
                          value={challengeScope}
                          onChange={(e) => setChallengeScope(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="all_vocab">Tổng hợp 44 chủ đề TOEIC (616 từ)</option>
                          <option value="part5">Luyện đề TOEIC Part 5 (Ngữ pháp & Word Form)</option>
                          {sharedVocab.length >= 4 && (
                            <option value="group_shared">
                              Từ vựng nhóm vừa chia sẻ ({sharedVocab.length} từ)
                            </option>
                          )}
                          {TOEIC_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={`cat:${cat.id}`}>
                              Nhóm {cat.rangeLabel}: {cat.titleVi}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Số câu hỏi
                        </label>
                        <div className="flex items-center gap-2">
                          {[5, 8, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setChallengeCount(num)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors tabular-nums ${
                                challengeCount === num
                                  ? 'bg-[#FF6B00] text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {num} câu
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Thời gian làm bài
                        </label>
                        <div className="flex items-center gap-2">
                          {[
                            { sec: 90, label: '1p 30s' },
                            { sec: 150, label: '2p 30s' },
                            { sec: 240, label: '4 phút' },
                          ].map((opt) => (
                            <button
                              key={opt.sec}
                              type="button"
                              onClick={() => setChallengeTimeLimit(opt.sec)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors tabular-nums ${
                                challengeTimeLimit === opt.sec
                                  ? 'bg-[#FF6B00] text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowChallengeForm(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={creatingChallenge}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-60 text-white text-xs font-bold whitespace-nowrap shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{creatingChallenge ? 'Đang tạo phòng...' : 'Mở phòng thách đấu'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {challenges.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-10 text-center space-y-2">
                    <Swords className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Chưa có trận thách đấu nào trong nhóm
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nhấn &ldquo;Tạo phòng thách đấu&rdquo; để rủ cả nhóm thi đấu tốc độ TOEIC ngay
                      bây giờ!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {challenges.map((ch) => {
                      const isJoined = ch.participantUids.includes(user.uid);
                      const ranked = rankParticipants(ch);
                      const leader = ranked[0];
                      const canDelete = ch.hostUid === user.uid || isCreator;

                      return (
                        <article
                          key={ch.challengeId}
                          className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                  {ch.isQuickChallenge && (
                                    <span className="inline-flex items-center gap-1 text-[#D94E00] dark:text-[#FF8524]">
                                      <Zap className="w-3.5 h-3.5" />
                                      Thách đấu nhanh
                                    </span>
                                  )}
                                  {ch.isQuickChallenge && (
                                    <span className="text-slate-300 dark:text-slate-700">·</span>
                                  )}
                                  {ch.status === 'waiting' && (
                                    <span className="text-amber-600 dark:text-amber-400">
                                      Đang chờ vào phòng
                                    </span>
                                  )}
                                  {ch.status === 'active' && (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      Đang thi đấu trực tiếp
                                    </span>
                                  )}
                                  {ch.status === 'finished' && (
                                    <span className="text-slate-500 dark:text-slate-400">
                                      Đã kết thúc
                                    </span>
                                  )}
                                  <span className="text-slate-300 dark:text-slate-700">·</span>
                                  <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                                    {ch.questionCount} câu · {formatCountdown(ch.timeLimitSeconds)}
                                  </span>
                                </div>
                                <h5 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                                  {ch.title}
                                </h5>
                              </div>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void deleteGroupChallenge(activeGroup.groupId, ch.challengeId)
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 shrink-0"
                                  aria-label="Xóa phòng thách đấu"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              Chủ đề: <span className="font-semibold">{ch.scopeLabel}</span> · Chủ
                              phòng: <span className="font-semibold">{ch.hostName}</span>
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 tabular-nums">
                              <span>{ch.participantUids.length} thí sinh tham gia</span>
                              {ch.status === 'finished' && leader && (
                                <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                                  <Trophy className="w-3.5 h-3.5" />
                                  Quán quân: {leader.displayName} ({leader.score} điểm)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                            {ch.status !== 'finished' && !isJoined ? (
                              <button
                                type="button"
                                disabled={busyChallengeAction}
                                onClick={() => void handleJoinChallenge(ch)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold whitespace-nowrap shrink-0"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Tham gia thách đấu</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedChallengeId(ch.challengeId)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-bold whitespace-nowrap shrink-0"
                              >
                                <span>
                                  {ch.status === 'finished'
                                    ? 'Xem bảng vàng & đáp án'
                                    : ch.status === 'active'
                                      ? 'Vào thi đấu ngay'
                                      : 'Mở phòng chờ'}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              // ===========================================================
              // LIVE CHALLENGE ROOM (Waiting / Active / Finished)
              // ===========================================================
              (() => {
                const ranked = rankParticipants(selectedChallenge);
                const myEntry = selectedChallenge.participants[user.uid];
                const isHost = selectedChallenge.hostUid === user.uid;
                const currentQ = selectedChallenge.questions[liveQIndex];

                return (
                  <div className="space-y-5">
                    {/* Room Top Bar */}
                    <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setSelectedChallengeId(null)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#FF6B00]"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Danh sách phòng thách đấu</span>
                        </button>
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                          {selectedChallenge.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedChallenge.scopeLabel} · {selectedChallenge.questionCount} câu hỏi
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {selectedChallenge.status === 'active' && (
                          <div
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-extrabold tabular-nums ${
                              remainingSeconds <= 20
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white'
                            }`}
                          >
                            <Clock className="w-4 h-4 text-[#FF6B00]" />
                            <span>{formatCountdown(remainingSeconds)}</span>
                          </div>
                        )}

                        {selectedChallenge.status === 'waiting' && isHost && (
                          <button
                            type="button"
                            disabled={busyChallengeAction}
                            onClick={() => void handleStartChallenge(selectedChallenge)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0"
                          >
                            <Play className="w-4 h-4" />
                            <span>Bắt đầu thách đấu ngay!</span>
                          </button>
                        )}

                        {selectedChallenge.status === 'active' && isHost && (
                          <button
                            type="button"
                            onClick={() =>
                              void finishGroupChallenge(
                                activeGroup.groupId,
                                selectedChallenge.challengeId
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-rose-500 whitespace-nowrap shrink-0"
                          >
                            <span>Chốt bảng điểm</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* WAITING ROOM */}
                    {selectedChallenge.status === 'waiting' && (
                      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h5 className="text-base font-bold text-slate-900 dark:text-white">
                              Phòng chờ trực tuyến ({ranked.length} thí sinh sẵn sàng)
                            </h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {isHost
                                ? 'Thành viên được mời sẽ nhận thông báo thời gian thực ngay trên màn hình nhóm. Bấm "Bắt đầu thách đấu ngay!" để kích hoạt bảng đếm ngược.'
                                : `Đang chờ chủ phòng ${selectedChallenge.hostName} bấm bắt đầu. Màn hình sẽ tự động chuyển vào đề thi ${selectedChallenge.questionCount} câu ngay lập tức!`}
                            </p>
                          </div>
                          {!myEntry && (
                            <button
                              type="button"
                              disabled={busyChallengeAction}
                              onClick={() => void handleJoinChallenge(selectedChallenge)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>Vào danh sách thi đấu</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ranked.map((p) => (
                            <div
                              key={p.uid}
                              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/20"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {p.displayName}
                                  {p.uid === user.uid ? ' (Bạn)' : ''}
                                </div>
                                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {p.uid === selectedChallenge.hostUid
                                    ? 'Chủ phòng · Sẵn sàng'
                                    : 'Đã nhận lời mời · Sẵn sàng'}
                                </div>
                              </div>
                              {p.uid === selectedChallenge.hostUid ? (
                                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              )}
                            </div>
                          ))}

                          {(selectedChallenge.invitedUids ?? [])
                            .filter((uid) => !selectedChallenge.participantUids.includes(uid))
                            .map((uid) => {
                              const invitedMember = activeGroup.members[uid];
                              const hasDeclined = Boolean(
                                selectedChallenge.declinedUids?.includes(uid)
                              );
                              return (
                                <div
                                  key={`inv_${uid}`}
                                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed ${
                                    hasDeclined
                                      ? 'border-rose-300/70 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/15'
                                      : 'border-amber-300/80 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/15'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                      {invitedMember?.displayName || 'Thành viên nhóm'}
                                    </div>
                                    <div
                                      className={`text-[11px] font-medium ${
                                        hasDeclined
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : 'text-amber-700 dark:text-amber-400'
                                      }`}
                                    >
                                      {hasDeclined
                                        ? 'Đã từ chối lời mời'
                                        : 'Đã gửi lời mời · Đang chờ phản hồi'}
                                    </div>
                                  </div>
                                  {hasDeclined ? (
                                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                  ) : (
                                    <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* ACTIVE LIVE BATTLE WITH COUNTDOWN BOARD */}
                    {selectedChallenge.status === 'active' && (() => {
                      const timePct =
                        selectedChallenge.timeLimitSeconds > 0
                          ? Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round((remainingSeconds / selectedChallenge.timeLimitSeconds) * 100)
                              )
                            )
                          : 0;
                      const isUrgent = remainingSeconds <= 30;
                      const isWarning = remainingSeconds <= 60 && remainingSeconds > 30;
                      const finishedCount = ranked.filter((p) => p.finished).length;

                      return (
                        <div className="space-y-4">
                          {/* Live Countdown Board */}
                          <div
                            className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
                              isUrgent
                                ? 'border-rose-500/70 bg-rose-50/80 dark:bg-rose-950/35'
                                : isWarning
                                  ? 'border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/25'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                    isUrgent
                                      ? 'bg-rose-600 text-white'
                                      : isWarning
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-[#FF6B00] text-white'
                                  }`}
                                >
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Bảng đếm ngược thời gian thực
                                  </div>
                                  <div className="flex items-baseline gap-2.5 tabular-nums">
                                    <span
                                      className={`text-2xl sm:text-3xl font-black tracking-tight ${
                                        isUrgent
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : isWarning
                                            ? 'text-amber-700 dark:text-amber-300'
                                            : 'text-slate-900 dark:text-white'
                                      }`}
                                    >
                                      {formatCountdown(remainingSeconds)}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                      / {formatCountdown(selectedChallenge.timeLimitSeconds)}
                                    </span>
                                    {isUrgent && (
                                      <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                                        Sắp hết giờ!
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
                                <div>
                                  <div className="text-slate-500 dark:text-slate-400">Tiến độ nhóm</div>
                                  <div className="font-extrabold text-slate-900 dark:text-white">
                                    {finishedCount}/{ranked.length} đã về đích
                                  </div>
                                </div>
                                {myEntry && (
                                  <div>
                                    <div className="text-slate-500 dark:text-slate-400">Điểm của bạn</div>
                                    <div className="font-extrabold text-[#D94E00] dark:text-[#FF8524]">
                                      {myEntry.score} đ ({myEntry.correctCount}/{selectedChallenge.questionCount} đúng)
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  isUrgent
                                    ? 'bg-rose-500'
                                    : isWarning
                                      ? 'bg-amber-500'
                                      : 'bg-gradient-to-r from-[#FF6B00] to-emerald-500'
                                }`}
                                style={{ width: `${timePct}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                            {/* Left 2 cols: Quiz Card */}
                            <div className="lg:col-span-2 bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-6 space-y-5">
                          {!myEntry ? (
                            <div className="text-center py-8 space-y-3">
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Trận đấu đang diễn ra! Bạn vẫn có thể tham gia ngay lúc này.
                              </p>
                              <button
                                type="button"
                                onClick={() => void handleJoinChallenge(selectedChallenge)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] text-white text-sm font-bold"
                              >
                                <UserPlus className="w-4 h-4" />
                                <span>Tham gia thi đấu ngay</span>
                              </button>
                            </div>
                          ) : myEntry.finished ? (
                            <div className="text-center py-8 space-y-4">
                              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8" />
                              </div>
                              <div className="space-y-1">
                                <h5 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                  Bạn đã hoàn thành {selectedChallenge.questionCount} câu hỏi!
                                </h5>
                                <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                                  Đúng{' '}
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {myEntry.correctCount}/{selectedChallenge.questionCount}
                                  </span>{' '}
                                  câu · Tổng điểm:{' '}
                                  <span className="font-extrabold text-[#D94E00] dark:text-[#FF8524]">
                                    {myEntry.score}
                                  </span>
                                </p>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Theo dõi các thành viên khác đang về đích ở bảng điểm trực tiếp bên
                                cạnh!
                              </p>
                            </div>
                          ) : (
                            currentQ && (
                              <>
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                  <span className="font-bold text-[#D94E00] dark:text-[#FF8524]">
                                    Câu {liveQIndex + 1}/{selectedChallenge.questionCount}
                                  </span>
                                  <span className="font-semibold">
                                    Điểm của bạn: {myEntry.score} · Đúng {myEntry.correctCount}
                                  </span>
                                </div>

                                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#FF6B00] to-amber-400 transition-all duration-300"
                                    style={{
                                      width: `${Math.round(((liveQIndex + (liveSelectedOption !== null ? 1 : 0)) / selectedChallenge.questionCount) * 100)}%`,
                                    }}
                                  />
                                </div>

                                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
                                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                                    {currentQ.prompt}
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {currentQ.options.map((opt, idx) => {
                                    const answered = liveSelectedOption !== null;
                                    const isCorrect = idx === currentQ.correctIndex;
                                    const isPicked = idx === liveSelectedOption;

                                    let style =
                                      'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 hover:border-[#FF6B00] text-slate-800 dark:text-slate-100';
                                    if (answered) {
                                      if (isCorrect) {
                                        style =
                                          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
                                      } else if (isPicked) {
                                        style =
                                          'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                                      } else {
                                        style =
                                          'border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-400';
                                      }
                                    }

                                    return (
                                      <button
                                        key={`${currentQ.id}_${idx}`}
                                        type="button"
                                        disabled={answered}
                                        onClick={() => void handleAnswerLiveQuestion(idx)}
                                        className={`flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-colors ${style}`}
                                      >
                                        <span className="flex items-center gap-2 min-w-0">
                                          <span className="font-mono text-xs opacity-70 shrink-0">
                                            {String.fromCharCode(65 + idx)}.
                                          </span>
                                          <span>{opt}</span>
                                        </span>
                                        {answered && isCorrect && (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        )}
                                        {answered && isPicked && !isCorrect && (
                                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                {liveSelectedOption !== null && (
                                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        Giải thích:{' '}
                                      </span>
                                      {currentQ.explanationVi}
                                    </p>
                                    {liveQIndex + 1 < selectedChallenge.questionCount && (
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={handleNextLiveQuestion}
                                          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0"
                                        >
                                          <span>Câu tiếp theo</span>
                                          <ArrowRight className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )
                          )}
                        </div>

                        {/* Right col: Real-time Scoreboard */}
                        <aside className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-3.5">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Trophy className="w-4 h-4 text-amber-500" />
                              <span>Bảng điểm trực tiếp</span>
                            </h5>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              ● Live
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {ranked.map((p, idx) => {
                              const pct = Math.round(
                                (p.answeredCount / Math.max(1, selectedChallenge.questionCount)) *
                                  100
                              );
                              return (
                                <div
                                  key={p.uid}
                                  className={`p-3 rounded-xl border ${
                                    p.uid === user.uid
                                      ? 'border-[#FF6B00]/50 bg-orange-50/60 dark:bg-orange-950/25'
                                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <span className="font-bold text-slate-900 dark:text-white truncate">
                                      #{idx + 1} {p.displayName}
                                      {p.uid === user.uid ? ' (Bạn)' : ''}
                                    </span>
                                    <span className="font-extrabold text-[#D94E00] dark:text-[#FF8524] tabular-nums shrink-0">
                                      {p.score} đ
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-2">
                                    <div
                                      className="h-full bg-emerald-500 transition-all duration-300"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                                    <span>
                                      {p.answeredCount}/{selectedChallenge.questionCount} câu (Đúng{' '}
                                      {p.correctCount})
                                    </span>
                                    <span>{p.finished ? 'Đã về đích' : 'Đang làm...'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </aside>
                          </div>
                        </div>
                      );
                    })()}

                    {/* FINISHED PODIUM & FINAL RESULTS */}
                    {selectedChallenge.status === 'finished' && (() => {
                      const myRankIdx = ranked.findIndex((p) => p.uid === user.uid);
                      const myAcc = myEntry
                        ? Math.round(
                            (myEntry.correctCount / Math.max(1, selectedChallenge.questionCount)) *
                              100
                          )
                        : 0;
                      const myGotTopBonus =
                        myEntry &&
                        myEntry.answeredCount > 0 &&
                        ((myRankIdx === 0 && ranked.length > 1) || myAcc >= 80);
                      const myReward =
                        myEntry && myEntry.answeredCount > 0 ? (myGotTopBonus ? 30 : 20) : 0;

                      return (
                        <div className="space-y-5">
                          {/* Final Results Hero & Personal Summary */}
                          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h5 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                  <Trophy className="w-5 h-5 text-amber-500" />
                                  <span>Kết quả cuối cùng · {selectedChallenge.title}</span>
                                </h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  Thí sinh hoàn thành nhận +20 Ngọc (+10 Ngọc thưởng thêm khi Top 1
                                  hoặc đạt ≥80% chính xác).
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={openQuickChallengeLauncher}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                                <span>Thách đấu nhanh lượt mới (10 câu)</span>
                              </button>
                            </div>

                            {/* Personal Result Highlights */}
                            {myEntry && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                                <div className="rounded-xl border border-[#FF6B00]/40 bg-orange-50/70 dark:bg-orange-950/30 p-3.5">
                                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    Thứ hạng của bạn
                                  </div>
                                  <div className="text-2xl font-black text-[#D94E00] dark:text-[#FF8524] mt-0.5">
                                    #{myRankIdx + 1}/{ranked.length}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5">
                                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    Số câu đúng
                                  </div>
                                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    {myEntry.correctCount}/{selectedChallenge.questionCount}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5">
                                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    Độ chính xác · Điểm
                                  </div>
                                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                                    {myAcc}%{' '}
                                    <span className="text-sm font-bold text-[#D94E00] dark:text-[#FF8524]">
                                      ({myEntry.score}đ)
                                    </span>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/70 dark:bg-sky-950/30 p-3.5">
                                  <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                                    <Gem className="w-3.5 h-3.5" />
                                    Thưởng Ngọc
                                  </div>
                                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
                                    +{myReward} Ngọc
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Top 3 Podium Cards */}
                            {ranked.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                {ranked.slice(0, 3).map((p, idx) => {
                                  const acc = Math.round(
                                    (p.correctCount / Math.max(1, selectedChallenge.questionCount)) *
                                      100
                                  );
                                  const isWinner = idx === 0;
                                  return (
                                    <div
                                      key={`podium_${p.uid}`}
                                      className={`rounded-2xl border p-4 space-y-2.5 ${
                                        isWinner
                                          ? 'border-amber-400/80 bg-amber-50/75 dark:bg-amber-950/30'
                                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span
                                          className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${
                                            idx === 0
                                              ? 'text-amber-700 dark:text-amber-300'
                                              : idx === 1
                                                ? 'text-slate-600 dark:text-slate-300'
                                                : 'text-orange-700 dark:text-orange-300'
                                          }`}
                                        >
                                          {idx === 0 ? (
                                            <Trophy className="w-4 h-4 text-amber-500" />
                                          ) : (
                                            <Medal className="w-4 h-4" />
                                          )}
                                          {idx === 0
                                            ? 'Hạng 1 · Quán quân'
                                            : idx === 1
                                              ? 'Hạng 2 · Á quân'
                                              : 'Hạng 3 · Huy chương đồng'}
                                        </span>
                                      </div>
                                      <div className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                                        {p.displayName}
                                        {p.uid === user.uid ? ' (Bạn)' : ''}
                                      </div>
                                      <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800 tabular-nums">
                                        <span className="text-xs text-slate-600 dark:text-slate-400">
                                          Đúng {p.correctCount}/{selectedChallenge.questionCount} ({acc}%)
                                        </span>
                                        <span className="text-lg font-black text-[#D94E00] dark:text-[#FF8524]">
                                          {p.score} đ
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Full Ranked Table */}
                            <div className="space-y-2">
                              <h6 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Bảng xếp hạng đầy đủ ({ranked.length} thí sinh)
                              </h6>
                              {ranked.map((p, idx) => {
                                const acc = Math.round(
                                  (p.correctCount / Math.max(1, selectedChallenge.questionCount)) *
                                    100
                                );
                                const durationSec = computeParticipantDurationSec(
                                  selectedChallenge,
                                  p
                                );
                                return (
                                  <div
                                    key={p.uid}
                                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
                                      p.uid === user.uid
                                        ? 'border-[#FF6B00]/50 bg-orange-50/60 dark:bg-orange-950/25'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
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
                                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                          {p.displayName}
                                          {p.uid === user.uid ? ' (Bạn)' : ''}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                          Đúng {p.correctCount}/{selectedChallenge.questionCount} câu ({acc}%)
                                          {' · '}
                                          {durationSec !== null
                                            ? `Thời gian: ${formatChallengeDuration(durationSec)}`
                                            : p.finished
                                              ? 'Hoàn thành'
                                              : `Đã trả lời ${p.answeredCount} câu`}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-base font-extrabold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
                                        {p.score} điểm
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        {/* Review Questions */}
                        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-3">
                          <h6 className="text-sm font-bold text-slate-900 dark:text-white">
                            Xem lại đáp án & giải thích ({selectedChallenge.questionCount} câu)
                          </h6>
                          <div className="space-y-2.5">
                            {selectedChallenge.questions.map((q, idx) => (
                              <div
                                key={q.id}
                                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5 space-y-1 text-xs"
                              >
                                <div className="font-bold text-slate-900 dark:text-white">
                                  Câu {idx + 1}: {q.prompt}
                                </div>
                                <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                  Đáp án đúng: {q.options[q.correctIndex]}
                                </div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  {q.explanationVi}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* SUB-TAB 3: CHALLENGE HISTORY (LỊCH SỬ THÁCH ĐẤU)               */}
        {/* =============================================================== */}
        {groupSubTab === 'history' && (
          <ToeicChallengeHistoryTab
            challenges={challenges}
            currentUid={user.uid}
            isGroupCreator={isCreator}
            onInspectChallenge={(challengeId) => {
              setSelectedChallengeId(challengeId);
              setGroupSubTab('challenges');
            }}
            onDeleteChallenge={async (challengeId) => {
              try {
                await deleteGroupChallenge(activeGroup.groupId, challengeId);
                if (selectedChallengeId === challengeId) {
                  setSelectedChallengeId(null);
                }
                addToast('info', 'Đã xóa bản ghi lịch sử thách đấu khỏi nhóm.');
              } catch {
                addToast('error', 'Không thể xóa bản ghi lịch sử thách đấu lúc này.');
              }
            }}
            onLaunchQuickChallenge={openQuickChallengeLauncher}
          />
        )}

        {/* =============================================================== */}
        {/* SUB-TAB 4: MEMBERS & GROUP SETTINGS                             */}
        {/* =============================================================== */}
        {groupSubTab === 'members' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-3.5">
              <h4 className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                Thành viên nhóm ({memberList.length}/{activeGroup.maxMembers})
              </h4>

              <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {memberList.map((member) => {
                  const memberIsCreator = member.uid === activeGroup.creatorUid;
                  return (
                    <div
                      key={member.uid}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {member.displayName}
                            {member.uid === user.uid ? ' (Bạn)' : ''}
                          </span>
                          {memberIsCreator && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              <Crown className="w-3.5 h-3.5" />
                              Trưởng nhóm
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Trình độ hiện tại: CEFR {member.currentLevel}
                        </div>
                      </div>

                      {isCreator && !memberIsCreator && (
                        <button
                          type="button"
                          onClick={() =>
                            void removeToeicGroupMember(activeGroup, member.uid)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 whitespace-nowrap shrink-0"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Mời ra</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {/* Official Group Emblem Showcase Card */}
              <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#FF6B00]" />
                    <span>Huy hiệu nhận diện nhóm</span>
                  </h5>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] cockpit-grid p-4 flex flex-col items-center text-center gap-2 text-white">
                  <ToeicGroupBadgeEmblem
                    ref={sidebarBadgeSvgRef}
                    badge={activeGroup.badge}
                    groupName={activeGroup.name}
                    targetScore={activeGroup.targetScore}
                    size="lg"
                  />
                  <div className="text-xs font-extrabold truncate max-w-full">
                    {activeGroup.name}
                  </div>
                  {activeGroup.badge?.motto && (
                    <div className="text-[11px] text-amber-300 font-medium truncate max-w-full">
                      &ldquo;{activeGroup.badge.motto}&rdquo;
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isCreator && (
                    <button
                      type="button"
                      onClick={openBadgeStudioModal}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Tùy chỉnh</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      void handleDownloadBadgePng(sidebarBadgeSvgRef.current, activeGroup.inviteCode)
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-[#FF6B00] text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>Tải PNG</span>
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-4">
                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                    Mời bạn bè vào nhóm
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gửi mã mời 6 ký tự bên dưới để bạn học nhập tại mục Nhóm học TOEIC và tham gia
                    ngay.
                  </p>
                </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-extrabold tracking-widest text-[#D94E00] dark:text-[#FF8524]">
                  {activeGroup.inviteCode}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyCode(activeGroup.inviteCode)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] text-white text-xs font-bold whitespace-nowrap shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
                {isCreator ? (
                  confirmDeleteGroup ? (
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Bạn chắc chắn muốn giải tán nhóm &ldquo;{activeGroup.name}&rdquo;?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteGroup(false)}
                          className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteActiveGroup()}
                          className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                        >
                          Xác nhận giải tán
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteGroup(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Giải tán nhóm học</span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleLeaveActiveGroup()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Rời khỏi nhóm</span>
                  </button>
                )}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: STUDY GROUPS LOBBY (Create / Join by Code / My Groups / Discover)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Top Action Bar: Join by Invite Code + Create New Group */}
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FF6B00] shrink-0" />
            <span>Nhóm học TOEIC cùng bạn bè (Thời gian thực)</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Tạo nhóm nhỏ 2–12 thành viên để chia sẻ từ vựng TOEIC khó nhớ và mở phòng thách đấu
            kiểm tra trực tiếp, nhận thêm +20 đến +30 Ngọc kiến thức mỗi trận!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="Nhập mã mời (6 ký tự)"
              className="w-44 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
            <button
              type="submit"
              disabled={joiningGroupId === 'code' || inviteCodeInput.trim().length < 6}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-[#FF6B00] disabled:opacity-50 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
            >
              <KeyRound className="w-4 h-4 text-[#FF6B00]" />
              <span>Vào bằng mã</span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{showCreateForm ? 'Đóng biểu mẫu' : 'Tạo nhóm học mới'}</span>
          </button>
        </div>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateGroup}
          className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-6 space-y-4"
        >
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            Khởi tạo Nhóm học TOEIC mới
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên nhóm học *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ví dụ: Biệt đội chinh phục TOEIC 750+"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mô tả mục tiêu / lịch luyện tập
              </label>
              <input
                type="text"
                maxLength={240}
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="Mỗi tối 20h chia sẻ 10 từ TOEIC và thách đấu 10 câu Part 5"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mục tiêu điểm TOEIC
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {TARGET_SCORES.map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => {
                      setGroupTargetScore(score);
                      setGroupBadge((prev) =>
                        !prev.monogram || /^\d{3}\+?$/.test(prev.monogram)
                          ? { ...prev, monogram: `${score}` }
                          : prev
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                      groupTargetScore === score
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {score}+
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sĩ số nhóm tối đa
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {CAPACITY_OPTIONS.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setGroupMaxMembers(cap)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                      groupMaxMembers === cap
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cap} người
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Personalized Group Badge Designer inside Create Group Form */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h5 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#FF6B00]" />
                  <span>Thiết kế Huy hiệu cá nhân hóa cho nhóm</span>
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tạo biểu trưng riêng giúp nhóm nổi bật và chuyên nghiệp trong danh sách cộng đồng TOEIC.
                </p>
              </div>
            </div>

            <ToeicGroupBadgeCustomizer
              value={groupBadge}
              onChange={setGroupBadge}
              groupName={groupName}
              targetScore={groupTargetScore}
              previewSvgRef={createBadgeSvgRef}
              onDownloadPng={() =>
                void handleDownloadBadgePng(createBadgeSvgRef.current, groupName || 'toeic_group')
              }
              compact
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGroupIsPublic(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  groupIsPublic
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Công khai</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupIsPublic(false)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  !groupIsPublic
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Riêng tư (chỉ vào bằng mã mời)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creatingGroup}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-60 text-white text-xs font-bold whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{creatingGroup ? 'Đang khởi tạo...' : 'Tạo nhóm ngay'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* My Groups Section */}
      <section className="space-y-3">
        <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Nhóm học của bạn ({myGroups.length})
        </h4>

        {loadingGroups ? (
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-8 text-center text-xs text-slate-500">
            Đang tải danh sách nhóm học TOEIC...
          </div>
        ) : myGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-7 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Bạn chưa tham gia nhóm học TOEIC nào
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tạo nhóm mới ở trên, nhập mã mời từ bạn bè, hoặc tham gia một nhóm công khai ngay bên
              dưới.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {myGroups.map((group) => (
              <article
                key={group.groupId}
                className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <ToeicGroupBadgeEmblem
                    badge={group.badge}
                    groupName={group.name}
                    targetScore={group.targetScore}
                    size="md"
                  />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
                        Mục tiêu {group.targetScore}+ TOEIC
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                        {group.memberUids.length}/{group.maxMembers} TV
                      </span>
                    </div>
                    <h5 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug truncate">
                      {group.name}
                    </h5>
                    {group.badge?.motto && (
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 truncate">
                        &ldquo;{group.badge.motto}&rdquo;
                      </p>
                    )}
                    {group.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => void handleCopyCode(group.inviteCode)}
                    className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 hover:text-[#FF6B00]"
                    title="Sao chép mã mời"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{group.inviteCode}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveGroupId(group.groupId);
                      setGroupSubTab('vocab');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold whitespace-nowrap shrink-0"
                  >
                    <span>Vào phòng học</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Discover Public Groups */}
      <section className="space-y-3">
        <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Khám phá nhóm công khai ({discoverablePublicGroups.length})
        </h4>

        {discoverablePublicGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-7 text-center text-xs text-slate-500 dark:text-slate-400">
            Hiện chưa có nhóm công khai mới nào khác. Bạn có thể tạo nhóm công khai đầu tiên để các
            học viên khác cùng tham gia luyện TOEIC!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {discoverablePublicGroups.map((group) => {
              const isFull = group.memberUids.length >= group.maxMembers;
              return (
                <article
                  key={group.groupId}
                  className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <ToeicGroupBadgeEmblem
                      badge={group.badge}
                      groupName={group.name}
                      targetScore={group.targetScore}
                      size="md"
                    />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
                          Mục tiêu {group.targetScore}+ TOEIC
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                          {group.memberUids.length}/{group.maxMembers} TV
                        </span>
                      </div>
                      <h5 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug truncate">
                        {group.name}
                      </h5>
                      {group.badge?.motto && (
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 truncate">
                          &ldquo;{group.badge.motto}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Trưởng nhóm: <span className="font-semibold">{group.creatorName}</span>
                      </p>
                      {group.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isFull || joiningGroupId === group.groupId}
                      onClick={() => void handleJoinPublicGroup(group)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-45 text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>
                        {isFull
                          ? 'Nhóm đã đủ người'
                          : joiningGroupId === group.groupId
                            ? 'Đang tham gia...'
                            : 'Tham gia nhóm'}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
