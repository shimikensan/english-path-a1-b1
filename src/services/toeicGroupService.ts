import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  ToeicChallengeParticipant,
  ToeicChallengeQuestion,
  ToeicGroupBadge,
  ToeicGroupBadgeFrame,
  ToeicGroupBadgeIcon,
  ToeicGroupBadgePaletteId,
  ToeicGroupBadgePattern,
  ToeicGroupBadgeShape,
  ToeicGroupChallengeDoc,
  ToeicGroupDoc,
  ToeicGroupMemberInfo,
  ToeicGroupVocabDoc,
  UserProfile,
} from '../types';

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomAlnum(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return out;
}

function getTimestampMs(ts: unknown): number {
  if (!ts) return 0;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    const sec = (ts as { seconds?: unknown }).seconds;
    if (typeof sec === 'number') return sec * 1000;
  }
  return 0;
}

function sanitizeText(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

const VALID_BADGE_SHAPES: readonly ToeicGroupBadgeShape[] = [
  'shield',
  'hexagon',
  'wings',
  'crest',
  'diamond',
  'circle',
];
const VALID_BADGE_ICONS: readonly ToeicGroupBadgeIcon[] = [
  'plane',
  'crown',
  'trophy',
  'bolt',
  'book',
  'compass',
  'star',
  'flame',
];
const VALID_BADGE_PALETTES: readonly ToeicGroupBadgePaletteId[] = [
  'pilot_orange',
  'navy_gold',
  'emerald_ace',
  'royal_violet',
  'crimson_jet',
  'arctic_cyan',
  'obsidian_amber',
  'rose_squad',
];
const VALID_BADGE_PATTERNS: readonly ToeicGroupBadgePattern[] = [
  'solid',
  'stripes',
  'rays',
  'grid',
];
const VALID_BADGE_FRAMES: readonly ToeicGroupBadgeFrame[] = [
  'classic',
  'double',
  'laurel',
  'wings_trim',
];

export function sanitizeToeicGroupBadge(raw?: Partial<ToeicGroupBadge> | null): ToeicGroupBadge {
  const shape =
    raw?.shape && VALID_BADGE_SHAPES.includes(raw.shape) ? raw.shape : 'shield';
  const icon =
    raw?.icon && VALID_BADGE_ICONS.includes(raw.icon) ? raw.icon : 'plane';
  const paletteId =
    raw?.paletteId && VALID_BADGE_PALETTES.includes(raw.paletteId)
      ? raw.paletteId
      : 'pilot_orange';
  const pattern =
    raw?.pattern && VALID_BADGE_PATTERNS.includes(raw.pattern) ? raw.pattern : 'rays';
  const frame =
    raw?.frame && VALID_BADGE_FRAMES.includes(raw.frame) ? raw.frame : 'laurel';
  const monogram = (raw?.monogram ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9+]/g, '')
    .slice(0, 4);
  const motto = sanitizeText(raw?.motto ?? '', 28);

  return {
    shape,
    icon,
    paletteId,
    pattern,
    frame,
    monogram,
    motto,
  };
}

function buildMemberInfo(user: UserProfile): ToeicGroupMemberInfo {
  return {
    uid: user.uid,
    displayName: sanitizeText(user.fullName || 'Học viên Pilot', 100) || 'Học viên Pilot',
    currentLevel: user.currentLevel || 'A1',
    joinedAtMs: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// 1. TOEIC STUDY GROUPS (Collection: toeic_groups)
// ---------------------------------------------------------------------------

export function subscribeMyToeicGroups(
  uid: string,
  onUpdate: (groups: ToeicGroupDoc[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'toeic_groups';
  const q = query(collection(db, path), where('memberUids', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => d.data() as ToeicGroupDoc)
        .sort((a, b) => getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt));
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribePublicToeicGroups(
  onUpdate: (groups: ToeicGroupDoc[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'toeic_groups';
  const q = query(collection(db, path), where('isPublic', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => d.data() as ToeicGroupDoc)
        .sort((a, b) => getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt));
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToeicGroup(
  groupId: string,
  onUpdate: (group: ToeicGroupDoc | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `toeic_groups/${groupId}`;
  return onSnapshot(
    doc(db, 'toeic_groups', groupId),
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as ToeicGroupDoc) : null);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function createToeicGroup(params: {
  name: string;
  description: string;
  targetScore: number;
  maxMembers: number;
  isPublic: boolean;
  badge?: Partial<ToeicGroupBadge>;
  user: UserProfile;
}): Promise<ToeicGroupDoc> {
  const cleanName = sanitizeText(params.name, 80);
  if (cleanName.length < 2) {
    throw new Error('Tên nhóm cần ít nhất 2 ký tự.');
  }

  let inviteCode = randomAlnum(6);
  let groupId = `grp_${inviteCode}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existingSnap = await getDoc(doc(db, 'toeic_groups', groupId));
    if (!existingSnap.exists()) break;
    inviteCode = randomAlnum(6);
    groupId = `grp_${inviteCode}`;
  }

  const targetScore = Math.min(990, Math.max(450, Math.round(params.targetScore)));
  const maxMembers = Math.min(12, Math.max(2, Math.round(params.maxMembers)));
  const memberInfo = buildMemberInfo(params.user);
  const badge = sanitizeToeicGroupBadge(params.badge);

  const payload = {
    groupId,
    name: cleanName,
    description: sanitizeText(params.description, 240),
    inviteCode,
    targetScore,
    maxMembers,
    creatorUid: params.user.uid,
    creatorName: memberInfo.displayName,
    memberUids: [params.user.uid],
    members: {
      [params.user.uid]: memberInfo,
    },
    isPublic: Boolean(params.isPublic),
    badge,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const path = `toeic_groups/${groupId}`;
  try {
    await setDoc(doc(db, 'toeic_groups', groupId), payload);
    return {
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateToeicGroupBadge(
  groupId: string,
  rawBadge: Partial<ToeicGroupBadge>
): Promise<ToeicGroupBadge> {
  const cleanId = groupId.trim();
  const path = `toeic_groups/${cleanId}`;
  const badge = sanitizeToeicGroupBadge(rawBadge);

  try {
    await updateDoc(doc(db, 'toeic_groups', cleanId), {
      badge,
      updatedAt: serverTimestamp(),
    });
    return badge;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function joinToeicGroupById(
  groupId: string,
  user: UserProfile
): Promise<ToeicGroupDoc> {
  const cleanId = groupId.trim();
  const path = `toeic_groups/${cleanId}`;
  try {
    const ref = doc(db, 'toeic_groups', cleanId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Không tìm thấy nhóm học với mã mời này.');
    }
    const group = snap.data() as ToeicGroupDoc;
    if (group.memberUids.includes(user.uid)) {
      return group;
    }
    if (group.memberUids.length >= group.maxMembers) {
      throw new Error(`Nhóm "${group.name}" đã đủ ${group.maxMembers}/${group.maxMembers} thành viên.`);
    }

    const memberInfo = buildMemberInfo(user);
    const nextMemberUids = [...group.memberUids, user.uid];
    const nextMembers = {
      ...group.members,
      [user.uid]: memberInfo,
    };

    await updateDoc(ref, {
      memberUids: nextMemberUids,
      members: nextMembers,
      updatedAt: serverTimestamp(),
    });

    return {
      ...group,
      memberUids: nextMemberUids,
      members: nextMembers,
    };
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Không tìm thấy') || error.message.includes('đã đủ'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function joinToeicGroupByCode(
  rawCode: string,
  user: UserProfile
): Promise<ToeicGroupDoc> {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 6 || code.length > 10) {
    throw new Error('Mã mời nhóm gồm 6 ký tự chữ in hoa và số (ví dụ: AB39KZ).');
  }
  return joinToeicGroupById(`grp_${code}`, user);
}

export async function leaveToeicGroup(group: ToeicGroupDoc, uid: string): Promise<void> {
  if (group.creatorUid === uid) {
    throw new Error('Trưởng nhóm không thể rời nhóm; hãy giải tán nhóm nếu muốn đóng.');
  }
  const path = `toeic_groups/${group.groupId}`;
  const nextMemberUids = group.memberUids.filter((id) => id !== uid);
  const nextMembers: Record<string, ToeicGroupMemberInfo> = {};
  Object.entries(group.members).forEach(([k, v]) => {
    if (k !== uid) nextMembers[k] = v;
  });

  try {
    await updateDoc(doc(db, 'toeic_groups', group.groupId), {
      memberUids: nextMemberUids,
      members: nextMembers,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeToeicGroupMember(
  group: ToeicGroupDoc,
  targetUid: string
): Promise<void> {
  if (targetUid === group.creatorUid) {
    throw new Error('Không thể xóa trưởng nhóm.');
  }
  const path = `toeic_groups/${group.groupId}`;
  const nextMemberUids = group.memberUids.filter((id) => id !== targetUid);
  const nextMembers: Record<string, ToeicGroupMemberInfo> = {};
  Object.entries(group.members).forEach(([k, v]) => {
    if (k !== targetUid) nextMembers[k] = v;
  });

  try {
    await updateDoc(doc(db, 'toeic_groups', group.groupId), {
      memberUids: nextMemberUids,
      members: nextMembers,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteToeicGroup(groupId: string): Promise<void> {
  const path = `toeic_groups/${groupId}`;
  try {
    await deleteDoc(doc(db, 'toeic_groups', groupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// 2. SHARED VOCABULARY FEED (Subcollection: toeic_groups/{groupId}/shared_vocab)
// ---------------------------------------------------------------------------

export function subscribeGroupVocab(
  groupId: string,
  onUpdate: (entries: ToeicGroupVocabDoc[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `toeic_groups/${groupId}/shared_vocab`;
  return onSnapshot(
    collection(db, 'toeic_groups', groupId, 'shared_vocab'),
    (snap) => {
      const entries = snap.docs
        .map((d) => d.data() as ToeicGroupVocabDoc)
        .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
      onUpdate(entries);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function shareVocabToGroup(
  groupId: string,
  input: {
    word: string;
    ipa?: string;
    partOfSpeech?: string;
    meaningVi: string;
    exampleEn?: string;
    exampleVi?: string;
    noteVi?: string;
    topicLabel?: string;
    sourceVocabId?: string;
    sourceLessonId?: string;
  },
  user: UserProfile
): Promise<void> {
  const word = sanitizeText(input.word, 80);
  const meaningVi = sanitizeText(input.meaningVi, 240);
  if (!word || !meaningVi) {
    throw new Error('Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt.');
  }

  const entryId = `voc_${Date.now()}_${randomAlnum(4)}`;
  const path = `toeic_groups/${groupId}/shared_vocab/${entryId}`;

  const payload = {
    entryId,
    groupId,
    word,
    ipa: sanitizeText(input.ipa ?? '', 80),
    partOfSpeech: sanitizeText(input.partOfSpeech || 'noun', 30) || 'noun',
    meaningVi,
    exampleEn: sanitizeText(input.exampleEn ?? '', 320),
    exampleVi: sanitizeText(input.exampleVi ?? '', 320),
    noteVi: sanitizeText(input.noteVi ?? '', 280),
    topicLabel: sanitizeText(input.topicLabel ?? 'TOEIC', 100),
    sourceVocabId: sanitizeText(input.sourceVocabId ?? '', 80),
    sourceLessonId: sanitizeText(input.sourceLessonId ?? '', 80),
    sharedByUid: user.uid,
    sharedByName: sanitizeText(user.fullName || 'Học viên Pilot', 100) || 'Học viên Pilot',
    likedByUids: [] as string[],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'toeic_groups', groupId, 'shared_vocab', entryId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleLikeGroupVocab(
  groupId: string,
  entry: ToeicGroupVocabDoc,
  uid: string
): Promise<void> {
  const path = `toeic_groups/${groupId}/shared_vocab/${entry.entryId}`;
  const alreadyLiked = entry.likedByUids.includes(uid);
  const nextLikes = alreadyLiked
    ? entry.likedByUids.filter((id) => id !== uid)
    : [...entry.likedByUids, uid].slice(0, 12);

  try {
    await updateDoc(doc(db, 'toeic_groups', groupId, 'shared_vocab', entry.entryId), {
      likedByUids: nextLikes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGroupVocab(groupId: string, entryId: string): Promise<void> {
  const path = `toeic_groups/${groupId}/shared_vocab/${entryId}`;
  try {
    await deleteDoc(doc(db, 'toeic_groups', groupId, 'shared_vocab', entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// 3. REAL-TIME QUIZ BATTLES (Subcollection: toeic_groups/{groupId}/challenges)
// ---------------------------------------------------------------------------

export function subscribeGroupChallenges(
  groupId: string,
  onUpdate: (challenges: ToeicGroupChallengeDoc[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `toeic_groups/${groupId}/challenges`;
  return onSnapshot(
    collection(db, 'toeic_groups', groupId, 'challenges'),
    (snap) => {
      const items = snap.docs
        .map((d) => d.data() as ToeicGroupChallengeDoc)
        .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createGroupChallenge(params: {
  groupId: string;
  title: string;
  scopeLabel: string;
  timeLimitSeconds: number;
  questions: ToeicChallengeQuestion[];
  user: UserProfile;
  isQuickChallenge?: boolean;
  invitedUids?: string[];
}): Promise<string> {
  const cleanTitle = sanitizeText(params.title, 100);
  if (cleanTitle.length < 2) {
    throw new Error('Tên phòng thách đấu cần ít nhất 2 ký tự.');
  }
  const questions = params.questions.slice(0, 15);
  if (questions.length < 3) {
    throw new Error('Cần ít nhất 3 câu hỏi để tạo trận thách đấu.');
  }

  const challengeId = `chl_${Date.now()}_${randomAlnum(4)}`;
  const path = `toeic_groups/${params.groupId}/challenges/${challengeId}`;
  const hostName = sanitizeText(params.user.fullName || 'Học viên Pilot', 100) || 'Học viên Pilot';
  const hostParticipant: ToeicChallengeParticipant = {
    uid: params.user.uid,
    displayName: hostName,
    ready: true,
    score: 0,
    correctCount: 0,
    answeredCount: 0,
    finished: false,
    finishedAtMs: 0,
  };

  const sanitizedInvitedUids = Array.from(
    new Set(
      (params.invitedUids ?? [])
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter((id) => id.length > 0 && id.length <= 128 && id !== params.user.uid)
    )
  ).slice(0, 12);

  const payload: Record<string, unknown> = {
    challengeId,
    groupId: params.groupId,
    title: cleanTitle,
    scopeLabel: sanitizeText(params.scopeLabel, 120) || 'TOEIC 44 chủ đề',
    hostUid: params.user.uid,
    hostName,
    status: 'waiting' as const,
    questionCount: questions.length,
    timeLimitSeconds: Math.min(600, Math.max(30, Math.round(params.timeLimitSeconds))),
    questions,
    participantUids: [params.user.uid],
    participants: {
      [params.user.uid]: hostParticipant,
    },
    startedAtMs: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (typeof params.isQuickChallenge === 'boolean') {
    payload.isQuickChallenge = params.isQuickChallenge;
  }
  if (sanitizedInvitedUids.length > 0) {
    payload.invitedUids = sanitizedInvitedUids;
  }

  try {
    await setDoc(doc(db, 'toeic_groups', params.groupId, 'challenges', challengeId), payload);
    return challengeId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function joinGroupChallenge(
  groupId: string,
  challenge: ToeicGroupChallengeDoc,
  user: UserProfile
): Promise<void> {
  if (challenge.participantUids.includes(user.uid)) return;
  if (challenge.status === 'finished') {
    throw new Error('Trận thách đấu này đã kết thúc.');
  }
  if (challenge.participantUids.length >= 12) {
    throw new Error('Phòng thách đấu đã đủ 12 thí sinh.');
  }

  const path = `toeic_groups/${groupId}/challenges/${challenge.challengeId}`;
  const displayName = sanitizeText(user.fullName || 'Học viên Pilot', 100) || 'Học viên Pilot';
  const entry: ToeicChallengeParticipant = {
    uid: user.uid,
    displayName,
    ready: true,
    score: 0,
    correctCount: 0,
    answeredCount: 0,
    finished: false,
    finishedAtMs: 0,
  };

  try {
    await updateDoc(doc(db, 'toeic_groups', groupId, 'challenges', challenge.challengeId), {
      participantUids: [...challenge.participantUids, user.uid],
      [`participants.${user.uid}`]: entry,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function startGroupChallenge(
  groupId: string,
  challengeId: string
): Promise<void> {
  const path = `toeic_groups/${groupId}/challenges/${challengeId}`;
  try {
    await updateDoc(doc(db, 'toeic_groups', groupId, 'challenges', challengeId), {
      status: 'active',
      startedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateMyChallengeProgress(params: {
  groupId: string;
  challenge: ToeicGroupChallengeDoc;
  uid: string;
  participant: ToeicChallengeParticipant;
  finishRoomIfAllDone?: boolean;
}): Promise<void> {
  const { groupId, challenge, uid, participant, finishRoomIfAllDone } = params;
  if (challenge.status === 'finished') return;

  const path = `toeic_groups/${groupId}/challenges/${challenge.challengeId}`;
  const allOthersFinished = challenge.participantUids.every(
    (id) => id === uid || Boolean(challenge.participants[id]?.finished)
  );
  const shouldCloseRoom = Boolean(
    finishRoomIfAllDone && challenge.status === 'active' && participant.finished && allOthersFinished
  );

  const updates: Record<string, unknown> = {
    [`participants.${uid}`]: participant,
    updatedAt: serverTimestamp(),
  };
  if (shouldCloseRoom) {
    updates.status = 'finished';
  }

  try {
    await updateDoc(doc(db, 'toeic_groups', groupId, 'challenges', challenge.challengeId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function finishGroupChallenge(
  groupId: string,
  challengeId: string
): Promise<void> {
  const path = `toeic_groups/${groupId}/challenges/${challengeId}`;
  try {
    await updateDoc(doc(db, 'toeic_groups', groupId, 'challenges', challengeId), {
      status: 'finished',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGroupChallenge(
  groupId: string,
  challengeId: string
): Promise<void> {
  const path = `toeic_groups/${groupId}/challenges/${challengeId}`;
  try {
    await deleteDoc(doc(db, 'toeic_groups', groupId, 'challenges', challengeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
