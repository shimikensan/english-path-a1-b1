import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Hand,
  LogOut,
  MessageCircle,
  MessageSquare,
  Music,
  Pause,
  Pencil,
  Plane,
  Play,
  Smile,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ClubChatDrawer, PilotAvatarThumb } from '../components/club/ClubChatDrawer';
import {
  ClubScene3D,
  type ClubCameraCommand,
  type ClubCameraMode,
  type ClubChatBubbleData,
  type ClubEmojiBurstData,
} from '../components/club/ClubScene3D';
import { CLUB_PILOT_EMOJIS } from '../components/club/pilotClubAvatarBuilder';
import { useApp } from '../context/AppContext';
import { DEFAULT_EQUIPPED_GEAR, PILOT_GEAR_CATALOG } from '../data/pilotGearCatalog';
import {
  buildClubPairId,
  DEFAULT_CLUB_MUSIC_CONFIG,
  sendClubDirectMessage,
  setClubMemberOffline,
  subscribeClubMembers,
  subscribeClubMusicConfig,
  subscribeUserClubMessages,
  upsertClubMemberPresence,
} from '../services/firestoreService';
import type {
  AppRoute,
  ClubAvatarGender,
  ClubMemberDoc,
  ClubMessageDoc,
  ClubMusicConfigDoc,
  ClubPilotEquipped,
  LearnerCEFRLevel,
} from '../types';
import { ClubMusicEngine } from '../utils/clubMusicEngine';

const STORAGE_STATUS_KEY = 'pilot_club_status_text_v1';

const PRESET_GREETINGS = [
  'Hi! Let’s practice English together!',
  'Looking for an A1–B1 chat buddy ☕',
  'Ask me anything in English!',
  'Practicing daily small talk today ✈️',
];

const SUIT_LABEL_BY_ID = new Map(
  PILOT_GEAR_CATALOG.filter((i) => i.slot === 'suit').map((i) => [i.id, i.nameVi])
);

interface EnglishClubPageProps {
  onNavigate?: (route: AppRoute) => void;
}

interface WsLiveMember {
  uid: string;
  displayName: string;
  currentLevel: LearnerCEFRLevel;
  avatarGender: ClubAvatarGender;
  pilotEquipped?: ClubPilotEquipped;
  statusText: string;
  posX: number;
  posZ: number;
  rotationY: number;
}

function getInitialSpawnPosition(uid: string): { posX: number; posZ: number; rotationY: number } {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) % 360;
  }
  const angle = (hash / 360) * Math.PI * 2;
  const radius = 1.15 + (hash % 5) * 0.32;
  const posX = Math.round(Math.cos(angle) * radius * 100) / 100;
  const posZ = Math.round((Math.sin(angle) * radius + 0.35) * 100) / 100;
  const rotationY = Math.round(Math.atan2(-posX, -posZ) * 100) / 100;
  return { posX, posZ, rotationY };
}

export function EnglishClubPage({ onNavigate }: EnglishClubPageProps) {
  const { profile, firebaseUser, hangarState, addToast, recordStudyActivity } = useApp();
  const currentUid = profile?.uid || firebaseUser?.uid || '';
  const currentDisplayName = profile?.fullName || firebaseUser?.displayName || 'Phi công tập sự';
  const currentLevel: LearnerCEFRLevel = profile?.currentLevel || 'A1';

  // Sync the learner's live 3D Pilot avatar outfit directly from Pilot Hangar
  const localPilotEquipped = useMemo<ClubPilotEquipped>(
    () => ({
      helmet: hangarState.equipped.helmet || DEFAULT_EQUIPPED_GEAR.helmet,
      goggles: hangarState.equipped.goggles || DEFAULT_EQUIPPED_GEAR.goggles,
      suit: hangarState.equipped.suit || DEFAULT_EQUIPPED_GEAR.suit,
      scarf: hangarState.equipped.scarf || DEFAULT_EQUIPPED_GEAR.scarf,
      backpack: hangarState.equipped.backpack || DEFAULT_EQUIPPED_GEAR.backpack,
      companion: hangarState.equipped.companion || DEFAULT_EQUIPPED_GEAR.companion,
    }),
    [
      hangarState.equipped.helmet,
      hangarState.equipped.goggles,
      hangarState.equipped.suit,
      hangarState.equipped.scarf,
      hangarState.equipped.backpack,
      hangarState.equipped.companion,
    ]
  );

  const equippedSuitName = SUIT_LABEL_BY_ID.get(localPilotEquipped.suit) || 'Phi công 3D';

  const [statusText, setStatusText] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_STATUS_KEY) || PRESET_GREETINGS[0];
    } catch {
      return PRESET_GREETINGS[0];
    }
  });
  const [statusDraft, setStatusDraft] = useState(statusText);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  // Real-time club data (Firestore + WebSocket merged)
  const [firestoreMembers, setFirestoreMembers] = useState<ClubMemberDoc[]>([]);
  const [wsLiveMap, setWsLiveMap] = useState<Record<string, WsLiveMember>>({});
  const [firestoreMessages, setFirestoreMessages] = useState<ClubMessageDoc[]>([]);
  const [wsMessages, setWsMessages] = useState<ClubMessageDoc[]>([]);
  const [typingUids, setTypingUids] = useState<Record<string, boolean>>({});
  const [waveTimestamps, setWaveTimestamps] = useState<Record<string, number>>({});
  const [talkingUntilByUid, setTalkingUntilByUid] = useState<Record<string, number>>({});
  const [chatBubblesByUid, setChatBubblesByUid] = useState<Record<string, ClubChatBubbleData>>({});
  const [emojiBurstsByUid, setEmojiBurstsByUid] = useState<Record<string, ClubEmojiBurstData>>({});
  const [localTyping, setLocalTyping] = useState(false);
  const [ttsSpeakerUid, setTtsSpeakerUid] = useState<string | null>(null);

  // Background music state (default "See You Again" or Admin uploaded track)
  const [musicConfig, setMusicConfig] = useState<ClubMusicConfigDoc>(DEFAULT_CLUB_MUSIC_CONFIG);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(DEFAULT_CLUB_MUSIC_CONFIG.defaultVolume);
  const [musicPopoverOpen, setMusicPopoverOpen] = useState(false);
  const userAdjustedVolumeRef = useRef(false);
  const musicEngineRef = useRef<ClubMusicEngine | null>(null);

  // UI state inside 3D club
  const [selectedPartnerUid, setSelectedPartnerUid] = useState<string | null>(null);
  const [readCountsByPartner, setReadCountsByPartner] = useState<Record<string, number>>({});
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const [soloTipDismissed, setSoloTipDismissed] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [cameraCommand, setCameraCommand] = useState<ClubCameraCommand>({
    mode: 'overview',
    seq: 0,
  });

  // Refs for WebSocket, chat bubble sequence, & throttled position sync
  const wsRef = useRef<WebSocket | null>(null);
  const localPosRef = useRef(getInitialSpawnPosition(currentUid || 'pilot'));
  const hydratedInitialPosRef = useRef(false);
  const lastFirestorePosSyncRef = useRef<number>(0);
  const bubbleSeqRef = useRef<number>(0);
  const emojiSeqRef = useRef<number>(0);
  const clubEnteredAtRef = useRef<number>(Date.now());
  const shownFirestoreBubbleIdsRef = useRef<Set<string>>(new Set());
  const initializedMsgHistoryRef = useRef(false);
  const recordedEntryActivityRef = useRef(false);

  const showChatBubble = useCallback((uid: string, text: string, durationMs = 7500) => {
    const cleaned = text.trim();
    if (!uid || !cleaned) return;
    const now = Date.now();
    bubbleSeqRef.current += 1;
    const seq = bubbleSeqRef.current;
    setChatBubblesByUid((prev) => ({
      ...prev,
      [uid]: {
        text: cleaned,
        createdAt: now,
        expiresAt: now + durationMs,
        seq,
      },
    }));
  }, []);

  const triggerEmojiBurst = useCallback(
    (targetUid: string, emoji?: string, broadcast = true) => {
      if (!targetUid) return;
      const chosen =
        emoji && emoji.trim().length > 0
          ? emoji.trim()
          : CLUB_PILOT_EMOJIS[Math.floor(Math.random() * CLUB_PILOT_EMOJIS.length)];
      emojiSeqRef.current += 1;
      const seq = emojiSeqRef.current;
      setEmojiBurstsByUid((prev) => ({
        ...prev,
        [targetUid]: { emoji: chosen, seq },
      }));
      if (broadcast && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'club:emoji',
            targetUid,
            emoji: chosen,
          })
        );
      }
    },
    []
  );

  // Initialize & dispose 3D Club Background Music Engine
  useEffect(() => {
    const engine = new ClubMusicEngine({
      onPlayingChange: (playing) => setMusicPlaying(playing),
      onFallbackToBuiltin: (reason) => addToast('info', reason),
    });
    musicEngineRef.current = engine;
    return () => {
      engine.dispose();
      musicEngineRef.current = null;
    };
  }, [addToast]);

  // Subscribe to Firestore club members, messages & live global background music settings
  useEffect(() => {
    if (!currentUid) return;
    clubEnteredAtRef.current = Date.now();
    initializedMsgHistoryRef.current = false;

    const unsubMembers = subscribeClubMembers(
      (members) => {
        setFirestoreMembers(members);
        if (!hydratedInitialPosRef.current) {
          const existingMe = members.find((m) => m.uid === currentUid);
          if (existingMe && Number.isFinite(existingMe.posX) && Number.isFinite(existingMe.posZ)) {
            localPosRef.current = {
              posX: existingMe.posX,
              posZ: existingMe.posZ,
              rotationY: existingMe.rotationY || 0,
            };
          } else {
            localPosRef.current = getInitialSpawnPosition(currentUid);
          }
          hydratedInitialPosRef.current = true;
        }
      },
      () => {
        // Silently degrade to WebSocket-only if Firestore quota is temporarily hit
      }
    );
    const unsubMessages = subscribeUserClubMessages(
      currentUid,
      (msgs) => {
        if (!initializedMsgHistoryRef.current) {
          msgs.forEach((m) => {
            if (m.id) shownFirestoreBubbleIdsRef.current.add(m.id);
          });
          initializedMsgHistoryRef.current = true;
        }
        setFirestoreMessages(msgs);
      },
      () => {
        // Silently degrade to WebSocket-only messages
      }
    );
    const unsubMusic = subscribeClubMusicConfig((cfg) => {
      setMusicConfig(cfg);
      musicEngineRef.current?.configure(cfg);
      if (!userAdjustedVolumeRef.current && typeof cfg.defaultVolume === 'number') {
        setMusicVolume(cfg.defaultVolume);
        musicEngineRef.current?.setVolume(cfg.defaultVolume);
      }
    });
    return () => {
      unsubMembers();
      unsubMessages();
      unsubMusic();
    };
  }, [currentUid]);

  // Auto-enter 3D Club immediately with the synced 3D Pilot character (no character selection lobby)
  useEffect(() => {
    if (!currentUid) return;

    if (!recordedEntryActivityRef.current) {
      recordedEntryActivityRef.current = true;
      recordStudyActivity();
    }

    void upsertClubMemberPresence({
      uid: currentUid,
      displayName: currentDisplayName,
      currentLevel,
      avatarGender: 'male',
      pilotEquipped: localPilotEquipped,
      statusText: statusText.trim(),
      posX: localPosRef.current.posX,
      posZ: localPosRef.current.posZ,
      rotationY: localPosRef.current.rotationY,
      isOnline: true,
    });
  }, [
    currentUid,
    currentDisplayName,
    currentLevel,
    localPilotEquipped,
    statusText,
    recordStudyActivity,
  ]);

  // Surface floating 3D chat bubbles for brand-new incoming Firestore messages while in club
  useEffect(() => {
    if (!currentUid) return;
    const enteredAt = clubEnteredAtRef.current;
    firestoreMessages.forEach((m) => {
      if (!m.id || shownFirestoreBubbleIdsRef.current.has(m.id)) return;
      shownFirestoreBubbleIdsRef.current.add(m.id);
      const msgTime = m.createdAtMs ?? 0;
      if (msgTime > enteredAt && m.senderUid && m.senderUid !== currentUid && m.text) {
        showChatBubble(m.senderUid, m.text, 7500);
        setTalkingUntilByUid((prev) => ({
          ...prev,
          [m.senderUid]: Math.max(prev[m.senderUid] ?? 0, Date.now() + 3600),
        }));
      }
    });
  }, [firestoreMessages, currentUid, showChatBubble]);

  // Connect WebSocket hub immediately upon entering the 3D club & sync Pilot gear live
  useEffect(() => {
    if (!currentUid) return;

    let cancelled = false;
    let reconnectTimer: number | null = null;

    const connectWs = () => {
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws/club`;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        return;
      }
      wsRef.current = socket;

      socket.onopen = () => {
        if (cancelled) {
          socket.close();
          return;
        }
        socket.send(
          JSON.stringify({
            type: 'club:join',
            uid: currentUid,
            displayName: currentDisplayName,
            currentLevel,
            avatarGender: 'male',
            pilotEquipped: localPilotEquipped,
            statusText: statusText.trim(),
            posX: localPosRef.current.posX,
            posZ: localPosRef.current.posZ,
            rotationY: localPosRef.current.rotationY,
          })
        );
      };

      socket.onmessage = (event) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(String(event.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        if (!data || typeof data.type !== 'string') return;

        if (data.type === 'club:roster' && Array.isArray(data.members)) {
          const nextMap: Record<string, WsLiveMember> = {};
          (data.members as WsLiveMember[]).forEach((m) => {
            if (m && m.uid) nextMap[m.uid] = m;
          });
          setWsLiveMap(nextMap);
          return;
        }

        if (data.type === 'club:member_joined' && data.member) {
          const m = data.member as WsLiveMember;
          if (!m.uid) return;
          setWsLiveMap((prev) => ({ ...prev, [m.uid]: m }));
          return;
        }

        if (data.type === 'club:member_moved' && typeof data.uid === 'string') {
          const uid = data.uid;
          setWsLiveMap((prev) => {
            const existing = prev[uid];
            if (!existing) return prev;
            return {
              ...prev,
              [uid]: {
                ...existing,
                posX: typeof data.posX === 'number' ? data.posX : existing.posX,
                posZ: typeof data.posZ === 'number' ? data.posZ : existing.posZ,
                rotationY: typeof data.rotationY === 'number' ? data.rotationY : existing.rotationY,
              },
            };
          });
          return;
        }

        if (data.type === 'club:member_left' && typeof data.uid === 'string') {
          const leftUid = data.uid;
          setWsLiveMap((prev) => {
            if (!prev[leftUid]) return prev;
            const copy = { ...prev };
            delete copy[leftUid];
            return copy;
          });
          setTypingUids((prev) => ({ ...prev, [leftUid]: false }));
          return;
        }

        if (data.type === 'club:member_waved' && typeof data.uid === 'string') {
          const wavedUid = data.uid;
          setWaveTimestamps((prev) => ({
            ...prev,
            [wavedUid]: typeof data.at === 'number' ? data.at : Date.now(),
          }));
          return;
        }

        if (data.type === 'club:member_talked' && typeof data.uid === 'string') {
          const talkedUid = data.uid;
          const until = typeof data.until === 'number' ? data.until : Date.now() + 3200;
          setTalkingUntilByUid((prev) => ({
            ...prev,
            [talkedUid]: Math.max(prev[talkedUid] ?? 0, until),
          }));
          return;
        }

        if (data.type === 'club:member_emoji' && typeof data.uid === 'string') {
          const emoji = typeof data.emoji === 'string' ? data.emoji : '😊';
          triggerEmojiBurst(data.uid, emoji, false);
          return;
        }

        if (data.type === 'club:typing' && typeof data.senderUid === 'string') {
          const sUid = data.senderUid;
          setTypingUids((prev) => ({ ...prev, [sUid]: Boolean(data.isTyping) }));
          return;
        }

        if (data.type === 'club:dm' && data.message) {
          const incoming = data.message as ClubMessageDoc;
          if (!incoming.id) return;
          if (incoming.senderUid) {
            setTalkingUntilByUid((prev) => ({
              ...prev,
              [incoming.senderUid]: Math.max(prev[incoming.senderUid] ?? 0, Date.now() + 3600),
            }));
            if (incoming.text) {
              shownFirestoreBubbleIdsRef.current.add(incoming.id);
              showChatBubble(incoming.senderUid, incoming.text, 7500);
            }
          }
          setWsMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connectWs, 3500);
        }
      };
    };

    connectWs();

    const handleBeforeUnload = () => {
      void setClubMemberOffline(currentUid);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsLiveMap({});
      void setClubMemberOffline(currentUid);
    };
  }, [
    currentUid,
    currentDisplayName,
    currentLevel,
    localPilotEquipped,
    statusText,
    showChatBubble,
    triggerEmojiBurst,
  ]);

  // Merge Firestore persistent members + live WebSocket roster (zero fake bots!)
  const mergedMembers = useMemo<ClubMemberDoc[]>(() => {
    const map = new Map<string, ClubMemberDoc>();

    // Seed from Firestore first
    firestoreMembers.forEach((m) => {
      map.set(m.uid, { ...m });
    });

    // Overlay real-time WebSocket positions, Pilot gear & live online presence
    Object.values(wsLiveMap).forEach((live) => {
      const existing = map.get(live.uid);
      map.set(live.uid, {
        uid: live.uid,
        displayName: live.displayName,
        currentLevel: live.currentLevel,
        avatarGender: live.avatarGender,
        pilotEquipped: live.pilotEquipped ?? existing?.pilotEquipped,
        statusText: live.statusText,
        posX: live.posX,
        posZ: live.posZ,
        rotationY: live.rotationY,
        isOnline: true,
        joinedAt: existing?.joinedAt,
        lastActiveAt: new Date(),
      });
    });

    // Always guarantee local user appears immediately with their synced 3D Pilot gear
    if (currentUid) {
      map.set(currentUid, {
        uid: currentUid,
        displayName: currentDisplayName,
        currentLevel,
        avatarGender: 'male',
        pilotEquipped: localPilotEquipped,
        statusText: statusText.trim(),
        posX: localPosRef.current.posX,
        posZ: localPosRef.current.posZ,
        rotationY: localPosRef.current.rotationY,
        isOnline: true,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.uid === currentUid) return -1;
      if (b.uid === currentUid) return 1;
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [
    firestoreMembers,
    wsLiveMap,
    currentUid,
    currentDisplayName,
    currentLevel,
    localPilotEquipped,
    statusText,
  ]);

  // Deduplicate Firestore + WebSocket direct messages by message.id
  const allMessages = useMemo<ClubMessageDoc[]>(() => {
    const byId = new Map<string, ClubMessageDoc>();
    firestoreMessages.forEach((m) => byId.set(m.id, m));
    wsMessages.forEach((m) => {
      if (!byId.has(m.id)) {
        byId.set(m.id, m);
      }
    });
    return Array.from(byId.values()).sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
  }, [firestoreMessages, wsMessages]);

  // Compute unread incoming counts per partner
  const incomingCountByUid = useMemo(() => {
    const counts: Record<string, number> = {};
    allMessages.forEach((m) => {
      if (m.receiverUid === currentUid && m.senderUid !== currentUid) {
        counts[m.senderUid] = (counts[m.senderUid] ?? 0) + 1;
      }
    });
    return counts;
  }, [allMessages, currentUid]);

  const unreadByUid = useMemo(() => {
    const unread: Record<string, number> = {};
    Object.entries(incomingCountByUid).forEach(([senderUid, total]) => {
      if (senderUid === selectedPartnerUid) {
        unread[senderUid] = 0;
      } else {
        const read = readCountsByPartner[senderUid] ?? 0;
        if (total > read) {
          unread[senderUid] = total - read;
        }
      }
    });
    return unread;
  }, [incomingCountByUid, readCountsByPartner, selectedPartnerUid]);

  // Mark messages from currently opened partner as read
  useEffect(() => {
    if (!selectedPartnerUid) return;
    const total = incomingCountByUid[selectedPartnerUid] ?? 0;
    setReadCountsByPartner((prev) =>
      prev[selectedPartnerUid] === total ? prev : { ...prev, [selectedPartnerUid]: total }
    );
  }, [selectedPartnerUid, incomingCountByUid]);

  const selectedPartner = useMemo(
    () =>
      selectedPartnerUid
        ? mergedMembers.find((m) => m.uid === selectedPartnerUid && m.uid !== currentUid) || null
        : null,
    [mergedMembers, selectedPartnerUid, currentUid]
  );

  const activeConversationMessages = useMemo(() => {
    if (!selectedPartnerUid || !currentUid) return [];
    const targetPairId = buildClubPairId(currentUid, selectedPartnerUid);
    return allMessages.filter((m) => m.pairId === targetPairId);
  }, [allMessages, currentUid, selectedPartnerUid]);

  const onlineMembersCount = useMemo(
    () => mergedMembers.filter((m) => m.isOnline).length,
    [mergedMembers]
  );
  const otherMembers = useMemo(
    () => mergedMembers.filter((m) => m.uid !== currentUid),
    [mergedMembers, currentUid]
  );

  // Continuous talk state driven by active typing & English TTS audio playback
  const activeTalkingUids = useMemo(() => {
    const map: Record<string, boolean> = {};
    Object.entries(typingUids).forEach(([uid, isTyping]) => {
      if (isTyping) map[uid] = true;
    });
    if (localTyping && currentUid) {
      map[currentUid] = true;
    }
    if (ttsSpeakerUid) {
      map[ttsSpeakerUid] = true;
    }
    return map;
  }, [typingUids, localTyping, currentUid, ttsSpeakerUid]);

  const triggerTalkAnimation = useCallback(
    (uid: string, durationMs = 3400, broadcastIfSelf = false) => {
      if (!uid) return;
      const until = Date.now() + durationMs;
      setTalkingUntilByUid((prev) => ({
        ...prev,
        [uid]: Math.max(prev[uid] ?? 0, until),
      }));
      if (broadcastIfSelf && uid === currentUid && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'club:talk',
            durationMs,
          })
        );
      }
    },
    [currentUid]
  );

  const handleSaveStatusGreeting = (nextText: string) => {
    const trimmed = nextText.trim().slice(0, 120);
    setStatusText(trimmed);
    setStatusDraft(trimmed);
    setStatusPopoverOpen(false);
    try {
      window.localStorage.setItem(STORAGE_STATUS_KEY, trimmed);
    } catch {
      // Ignore storage errors
    }
    if (trimmed && currentUid) {
      showChatBubble(currentUid, trimmed, 4500);
    }
    addToast('success', 'Đã cập nhật lời chào tiếng Anh trên đầu Phi công 3D.');
  };

  const handleToggleMusic = async () => {
    const engine = musicEngineRef.current;
    if (!engine) return;
    if (musicPlaying) {
      engine.pause();
    } else {
      engine.configure(musicConfig);
      engine.setVolume(musicVolume);
      const ok = await engine.play();
      if (!ok) {
        addToast('info', 'Hãy nhấn lại biểu tượng nhạc để trình duyệt cho phép phát âm thanh.');
      }
    }
  };

  const handleMusicVolumeChange = (nextVol: number) => {
    userAdjustedVolumeRef.current = true;
    setMusicVolume(nextVol);
    musicEngineRef.current?.setVolume(nextVol);
  };

  const handleLeaveClub = async (targetRoute: AppRoute = 'dashboard') => {
    musicEngineRef.current?.pause();
    setMusicPopoverOpen(false);
    setStatusPopoverOpen(false);
    setEmojiPopoverOpen(false);
    setSelectedPartnerUid(null);
    setRosterOpen(false);
    if (currentUid) {
      await setClubMemberOffline(currentUid);
    }
    onNavigate?.(targetRoute);
  };

  const handleSelectMemberFrom3D = useCallback(
    (uid: string) => {
      // Float joyful 3D emojis right above the clicked 3D Pilot's head
      triggerEmojiBurst(uid, undefined, true);

      if (uid === currentUid) {
        triggerTalkAnimation(currentUid, 3400, true);
        showChatBubble(
          currentUid,
          statusText.trim() || "Hi! Let's practice English together!",
          5000
        );
        addToast(
          'info',
          'Đây là Phi công 3D của bạn! Nhấn sàn hoặc WASD để di chuyển, hoặc ghé Hangar 3D để thay trang bị.'
        );
        return;
      }
      triggerTalkAnimation(uid, 3200, false);
      const partnerMember = mergedMembers.find((m) => m.uid === uid);
      if (partnerMember?.statusText?.trim()) {
        showChatBubble(uid, partnerMember.statusText.trim(), 4800);
      }
      setSelectedPartnerUid(uid);
      setRosterOpen(false);
      setMusicPopoverOpen(false);
      setStatusPopoverOpen(false);
      setEmojiPopoverOpen(false);
    },
    [
      currentUid,
      addToast,
      triggerTalkAnimation,
      triggerEmojiBurst,
      showChatBubble,
      statusText,
      mergedMembers,
    ]
  );

  const handleLocalMove = useCallback(
    (posX: number, posZ: number, rotationY: number, isFinal: boolean) => {
      localPosRef.current = { posX, posZ, rotationY };
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'club:move',
            posX,
            posZ,
            rotationY,
          })
        );
      }
      const now = Date.now();
      if (isFinal && now - lastFirestorePosSyncRef.current > 2500 && currentUid) {
        lastFirestorePosSyncRef.current = now;
        void upsertClubMemberPresence({
          uid: currentUid,
          displayName: currentDisplayName,
          currentLevel,
          avatarGender: 'male',
          pilotEquipped: localPilotEquipped,
          statusText: statusText.trim(),
          posX,
          posZ,
          rotationY,
          isOnline: true,
        });
      }
    },
    [currentUid, currentDisplayName, currentLevel, localPilotEquipped, statusText]
  );

  const handleWaveEmote = () => {
    if (!currentUid) return;
    const now = Date.now();
    setWaveTimestamps((prev) => ({ ...prev, [currentUid]: now }));
    triggerEmojiBurst(currentUid, '👋', true);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'club:wave' }));
    }
  };

  const handleTalkEmote = () => {
    if (!currentUid) return;
    triggerTalkAnimation(currentUid, 3800, true);
    showChatBubble(
      currentUid,
      statusText.trim() || "Hi everyone! Let's practice English!",
      5500
    );
  };

  const handleCameraPreset = (mode: ClubCameraMode, uid?: string) => {
    setCameraCommand((prev) => ({ mode, uid, seq: prev.seq + 1 }));
  };

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      setLocalTyping(isTyping);
      if (!selectedPartnerUid || wsRef.current?.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'club:typing',
          receiverUid: selectedPartnerUid,
          isTyping,
        })
      );
    },
    [selectedPartnerUid]
  );

  const handleSendDirectMessage = async (text: string) => {
    if (!currentUid || !selectedPartnerUid) return;
    setSendingMsg(true);
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    triggerTalkAnimation(currentUid, 3400, true);
    showChatBubble(currentUid, text, 7500);
    shownFirestoreBubbleIdsRef.current.add(messageId);

    const optimisticMsg: ClubMessageDoc = {
      id: messageId,
      pairId: buildClubPairId(currentUid, selectedPartnerUid),
      participants: [currentUid, selectedPartnerUid],
      senderUid: currentUid,
      senderName: currentDisplayName,
      senderAvatar: 'male',
      receiverUid: selectedPartnerUid,
      text,
      createdAtMs: Date.now(),
    };
    setWsMessages((prev) => [...prev, optimisticMsg]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'club:dm',
          id: messageId,
          receiverUid: selectedPartnerUid,
          text,
        })
      );
    }

    try {
      await sendClubDirectMessage({
        messageId,
        senderUid: currentUid,
        senderName: currentDisplayName,
        senderAvatar: 'male',
        receiverUid: selectedPartnerUid,
        text,
      });
      recordStudyActivity();
    } catch {
      addToast(
        'info',
        'Tin nhắn đã gửi trực tiếp trong phiên hiện tại (tạm chưa lưu lịch sử đám mây).'
      );
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-10.5rem)] min-h-[540px] max-h-[840px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#EFE6DB] shadow-lg select-none">
      {/* Interactive Three.js 3D Scene (Synced with Pilot Hangar 3D Avatar) */}
      <ClubScene3D
        members={mergedMembers}
        currentUserUid={currentUid}
        selectedMemberUid={selectedPartnerUid}
        unreadByUid={unreadByUid}
        waveTimestamps={waveTimestamps}
        talkingUntilByUid={talkingUntilByUid}
        activeTalkingUids={activeTalkingUids}
        chatBubblesByUid={chatBubblesByUid}
        emojiBurstsByUid={emojiBurstsByUid}
        cameraCommand={cameraCommand}
        onSelectMember={handleSelectMemberFrom3D}
        onLocalMove={handleLocalMove}
      />

      {/* Minimal Top-Left Club Header (No backdrop-blur over WebGL!) */}
      <div className="absolute top-3 left-3 z-10 pointer-events-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 shadow-md flex items-center gap-3">
        <PilotAvatarThumb pilotEquipped={localPilotEquipped} size="sm" />
        <div>
          <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
            <span>Câu lạc bộ Tiếng Anh 3D</span>
            <span className="text-[10px] font-bold text-[#D94E00] dark:text-[#FF8524]">
              · {equippedSuitName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold tabular-nums">{onlineMembersCount} đang trực tuyến</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>Nhấn sàn / WASD để đi bộ</span>
          </div>
        </div>
      </div>

      {/* Honest Empty-Room Guidance Banner when learner is currently alone */}
      {otherMembers.length === 0 && !soloTipDismissed && !selectedPartner && (
        <div className="absolute top-3 right-3 z-10 max-w-xs bg-white/95 dark:bg-slate-900/95 border border-amber-200 dark:border-amber-800/70 rounded-xl p-3.5 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Hiện chỉ có Phi công của bạn trong phòng</span>
            </div>
            <button
              type="button"
              onClick={() => setSoloTipDismissed(true)}
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Đóng gợi ý"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
            Nhân vật Phi công 3D của bạn đã được đồng bộ tự động từ Hangar 3D. Mời bạn bè đăng nhập
            để cùng trò chuyện tiếng Anh trực tiếp hoặc ghé Nhắn tin AI luyện tập.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            {onNavigate && (
              <button
                type="button"
                onClick={() => void handleLeaveClub('pilot-hangar')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-[11px] font-bold transition-colors"
              >
                <Plane className="w-3.5 h-3.5" />
                Hangar 3D
              </button>
            )}
            {onNavigate && (
              <button
                type="button"
                onClick={() => void handleLeaveClub('ai-tutor')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FF6B00]/12 hover:bg-[#FF6B00]/20 text-[#D94E00] dark:text-[#FF8524] text-[11px] font-bold transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Nhắn tin AI
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upward Emoji Reaction Picker Popover */}
      {emojiPopoverOpen && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(320px,calc(100%-1.5rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              Thả cảm xúc lên đầu Phi công 3D
            </span>
            <button
              type="button"
              onClick={() => setEmojiPopoverOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Đóng bảng cảm xúc"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {CLUB_PILOT_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  triggerEmojiBurst(currentUid, emoji, true);
                  setEmojiPopoverOpen(false);
                }}
                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-[#FF6B00]/12 border border-slate-200 dark:border-slate-700 hover:border-[#FF6B00] text-2xl flex items-center justify-center transition-transform active:scale-90"
                title={`Thả cảm xúc ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upward English Greeting Status Editor Popover */}
      {statusPopoverOpen && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(360px,calc(100%-1.5rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              Lời chào tiếng Anh trên đầu Phi công 3D
            </span>
            <button
              type="button"
              onClick={() => setStatusPopoverOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Đóng chỉnh lời chào"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveStatusGreeting(statusDraft);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              maxLength={120}
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value)}
              placeholder="VD: Hi! Let's practice English together!"
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E55E00] text-white text-xs font-bold shrink-0 transition-colors"
            >
              Lưu
            </button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_GREETINGS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleSaveStatusGreeting(g)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6B00]/12 hover:text-[#D94E00] dark:hover:text-[#FF8524] text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upward Member Roster Popover (triggered from bottom control dock) */}
      {rosterOpen && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(360px,calc(100%-1.5rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              Thành viên Câu lạc bộ ({mergedMembers.length})
            </span>
            <button
              type="button"
              onClick={() => setRosterOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Đóng danh sách thành viên"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {mergedMembers.map((member) => {
              const isSelf = member.uid === currentUid;
              const unread = unreadByUid[member.uid] ?? 0;
              return (
                <button
                  key={member.uid}
                  type="button"
                  onClick={() => {
                    if (isSelf) {
                      handleCameraPreset('follow-self');
                      setRosterOpen(false);
                    } else {
                      triggerTalkAnimation(member.uid, 3200, false);
                      setSelectedPartnerUid(member.uid);
                      handleCameraPreset('focus-uid', member.uid);
                      setRosterOpen(false);
                    }
                  }}
                  className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PilotAvatarThumb pilotEquipped={member.pilotEquipped} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {member.displayName} {isSelf ? '(Bạn)' : ''}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>CEFR {member.currentLevel}</span>
                        <span>·</span>
                        <span>{member.isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {unread > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#FF6B00] text-white text-[10px] font-extrabold">
                        +{unread}
                      </span>
                    )}
                    {!isSelf && (
                      <span className="text-[11px] font-semibold text-[#D94E00] dark:text-[#FF8524]">
                        Nhắn tin
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upward Background Music Popover (triggered from bottom control dock) */}
      {musicPopoverOpen && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(340px,calc(100%-1.5rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/12 text-[#D94E00] dark:text-[#FF8524] flex items-center justify-center shrink-0">
                <Music className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {musicConfig.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {musicConfig.artist || 'Nhạc nền Câu lạc bộ 3D'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMusicPopoverOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Đóng bảng nhạc nền"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleToggleMusic()}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                musicPlaying
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-[#FF6B00] hover:bg-[#E55E00] text-white'
              }`}
            >
              {musicPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{musicPlaying ? 'Tạm dừng' : 'Phát nhạc'}</span>
            </button>

            <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2">
              <button
                type="button"
                onClick={() => handleMusicVolumeChange(musicVolume > 0.01 ? 0 : 0.42)}
                className="text-slate-600 dark:text-slate-300 hover:text-[#FF6B00]"
                aria-label="Tắt hoặc bật âm thanh"
              >
                {musicVolume <= 0.01 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={(e) => handleMusicVolumeChange(Number(e.target.value))}
                className="w-full accent-[#FF6B00]"
                aria-label="Âm lượng nhạc nền"
              />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 w-8 text-right tabular-nums">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (Consolidated single-dock architecture) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-1.5rem)]">
        {dockCollapsed ? (
          <button
            type="button"
            onClick={() => setDockCollapsed(false)}
            className="px-4 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 hover:border-[#FF6B00] transition-colors"
          >
            <ChevronUp className="w-4 h-4 text-[#FF6B00]" />
            <span>Mở thanh điều khiển 3D</span>
          </button>
        ) : (
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl px-2.5 py-2 flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleCameraPreset('overview')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              title="Góc nhìn toàn phòng"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <span>Toàn cảnh</span>
            </button>

            <button
              type="button"
              onClick={() => handleCameraPreset('follow-self')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 transition-colors"
              title="Camera đi theo Phi công 3D của bạn"
            >
              Theo tôi
            </button>

            <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={handleWaveEmote}
              className="px-2.5 py-1.5 rounded-lg bg-[#FF6B00]/12 hover:bg-[#FF6B00]/20 text-[#D94E00] dark:text-[#FF8524] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              title="Vẫy tay chào mọi người trong phòng"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Vẫy tay</span>
            </button>

            <button
              type="button"
              onClick={handleTalkEmote}
              className="px-2.5 py-1.5 rounded-lg bg-sky-500/12 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              title="Kích hoạt hoạt ảnh đang nói chuyện và bong bóng lời thoại"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Nói chuyện</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmojiPopoverOpen((v) => !v);
                setStatusPopoverOpen(false);
                setRosterOpen(false);
                setMusicPopoverOpen(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                emojiPopoverOpen
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-amber-500/12 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300'
              }`}
              title="Chọn biểu tượng cảm xúc nổi lên đầu Phi công 3D"
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Cảm xúc</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusDraft(statusText);
                setStatusPopoverOpen((v) => !v);
                setEmojiPopoverOpen(false);
                setRosterOpen(false);
                setMusicPopoverOpen(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                statusPopoverOpen
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Đổi lời chào tiếng Anh trên đầu Phi công 3D"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Lời chào</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMusicPopoverOpen((v) => !v);
                setRosterOpen(false);
                setStatusPopoverOpen(false);
                setEmojiPopoverOpen(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                musicPopoverOpen
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : musicPlaying
                    ? 'bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={`Nhạc nền: ${musicConfig.title}`}
            >
              {musicPlaying ? (
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Music className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="max-w-[110px] truncate">{musicConfig.title}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRosterOpen((v) => !v);
                setMusicPopoverOpen(false);
                setStatusPopoverOpen(false);
                setEmojiPopoverOpen(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                rosterOpen
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Thành viên ({mergedMembers.length})</span>
            </button>

            <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

            {onNavigate && (
              <button
                type="button"
                onClick={() => void handleLeaveClub('pilot-hangar')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                title="Mở Hangar 3D để tùy biến trang bị Phi công"
              >
                <Plane className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Hangar 3D</span>
              </button>
            )}

            {onNavigate && (
              <button
                type="button"
                onClick={() => void handleLeaveClub('dashboard')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                title="Rời khỏi phòng 3D"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rời phòng</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDockCollapsed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              aria-label="Thu gọn thanh điều khiển"
              title="Thu gọn thanh điều khiển"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 1-on-1 English Chat Drawer (opens when clicking any other character) */}
      {selectedPartner && (
        <ClubChatDrawer
          partner={selectedPartner}
          currentUserUid={currentUid}
          currentUserLevel={currentLevel}
          messages={activeConversationMessages}
          isPartnerTyping={Boolean(typingUids[selectedPartner.uid])}
          sending={sendingMsg}
          onSendMessage={handleSendDirectMessage}
          onTypingChange={handleTypingChange}
          onSpeakingChange={setTtsSpeakerUid}
          onClose={() => {
            setSelectedPartnerUid(null);
            setLocalTyping(false);
            setTtsSpeakerUid(null);
          }}
        />
      )}
    </div>
  );
}
