import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Hand,
  LogOut,
  MessageCircle,
  MessageSquare,
  Music,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ChibiAvatarThumb, ClubChatDrawer } from '../components/club/ClubChatDrawer';
import {
  ClubScene3D,
  type ClubCameraCommand,
  type ClubCameraMode,
  type ClubChatBubbleData,
} from '../components/club/ClubScene3D';
import { useApp } from '../context/AppContext';
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
  LearnerCEFRLevel,
} from '../types';
import { ClubMusicEngine } from '../utils/clubMusicEngine';

const AVATAR_SHEET_SRC = '/assets/aistudio/image_cacf8f7c.png';
const STORAGE_AVATAR_KEY = 'pilot_club_avatar_gender_v1';
const STORAGE_STATUS_KEY = 'pilot_club_status_text_v1';

const PRESET_GREETINGS = [
  'Hi! Let’s practice English together!',
  'Looking for an A1–B1 chat buddy ☕',
  'Ask me anything in English!',
  'Practicing daily small talk today ✈️',
];

interface EnglishClubPageProps {
  onNavigate?: (route: AppRoute) => void;
}

interface WsLiveMember {
  uid: string;
  displayName: string;
  currentLevel: LearnerCEFRLevel;
  avatarGender: ClubAvatarGender;
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
  const { profile, firebaseUser, addToast, recordStudyActivity } = useApp();
  const currentUid = profile?.uid || firebaseUser?.uid || '';
  const currentDisplayName = profile?.fullName || firebaseUser?.displayName || 'Phi công tập sự';
  const currentLevel: LearnerCEFRLevel = profile?.currentLevel || 'A1';

  // Stage 1 (Character Selection Lobby) vs Stage 2 (Live 3D English Club)
  const [selectedGender, setSelectedGender] = useState<ClubAvatarGender>(() => {
    try {
      return window.localStorage.getItem(STORAGE_AVATAR_KEY) === 'female' ? 'female' : 'male';
    } catch {
      return 'male';
    }
  });
  const [statusText, setStatusText] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_STATUS_KEY) || PRESET_GREETINGS[0];
    } catch {
      return PRESET_GREETINGS[0];
    }
  });
  const [inClub, setInClub] = useState(false);
  const [joining, setJoining] = useState(false);
  const [sheetImgError, setSheetImgError] = useState(false);

  // Real-time club data (Firestore + WebSocket merged)
  const [firestoreMembers, setFirestoreMembers] = useState<ClubMemberDoc[]>([]);
  const [wsLiveMap, setWsLiveMap] = useState<Record<string, WsLiveMember>>({});
  const [firestoreMessages, setFirestoreMessages] = useState<ClubMessageDoc[]>([]);
  const [wsMessages, setWsMessages] = useState<ClubMessageDoc[]>([]);
  const [typingUids, setTypingUids] = useState<Record<string, boolean>>({});
  const [waveTimestamps, setWaveTimestamps] = useState<Record<string, number>>({});
  const [talkingUntilByUid, setTalkingUntilByUid] = useState<Record<string, number>>({});
  const [chatBubblesByUid, setChatBubblesByUid] = useState<Record<string, ClubChatBubbleData>>({});
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
  const [soloTipDismissed, setSoloTipDismissed] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [cameraCommand, setCameraCommand] = useState<ClubCameraCommand>({
    mode: 'overview',
    seq: 0,
  });

  // Refs for WebSocket, chat bubble sequence, & throttled position sync
  const wsRef = useRef<WebSocket | null>(null);
  const localPosRef = useRef(getInitialSpawnPosition(currentUid || 'pilot'));
  const lastFirestorePosSyncRef = useRef<number>(0);
  const bubbleSeqRef = useRef<number>(0);
  const clubEnteredAtRef = useRef<number>(0);
  const shownFirestoreBubbleIdsRef = useRef<Set<string>>(new Set());

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
    const unsubMembers = subscribeClubMembers(
      (members) => setFirestoreMembers(members),
      () => {
        // Silently degrade to WebSocket-only if Firestore quota is temporarily hit
      }
    );
    const unsubMessages = subscribeUserClubMessages(
      currentUid,
      (msgs) => setFirestoreMessages(msgs),
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

  // Surface floating 3D chat bubbles for brand-new incoming Firestore messages while in club
  useEffect(() => {
    if (!inClub || !currentUid) return;
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
  }, [firestoreMessages, inClub, currentUid, showChatBubble]);

  // Connect WebSocket hub when the learner enters the 3D club
  useEffect(() => {
    if (!inClub || !currentUid) return;

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
            avatarGender: selectedGender,
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

        if (data.type === 'club:typing' && typeof data.senderUid === 'string') {
          const sUid = data.senderUid;
          setTypingUids((prev) => ({ ...prev, [sUid]: Boolean(data.isTyping) }));
          return;
        }

        if (data.type === 'club:dm' && data.message) {
          const incoming = data.message as ClubMessageDoc;
          if (!incoming.id) return;
          // Trigger lively 3D talk animation & floating chat speech bubble on the sender
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
  }, [inClub, currentUid, currentDisplayName, currentLevel, selectedGender, statusText, showChatBubble]);

  // Merge Firestore persistent members + live WebSocket roster (zero fake bots!)
  const mergedMembers = useMemo<ClubMemberDoc[]>(() => {
    const map = new Map<string, ClubMemberDoc>();

    // Seed from Firestore first
    firestoreMembers.forEach((m) => {
      map.set(m.uid, { ...m });
    });

    // Overlay real-time WebSocket positions & live online presence
    Object.values(wsLiveMap).forEach((live) => {
      const existing = map.get(live.uid);
      map.set(live.uid, {
        uid: live.uid,
        displayName: live.displayName,
        currentLevel: live.currentLevel,
        avatarGender: live.avatarGender,
        statusText: live.statusText,
        posX: live.posX,
        posZ: live.posZ,
        rotationY: live.rotationY,
        isOnline: true,
        joinedAt: existing?.joinedAt,
        lastActiveAt: new Date(),
      });
    });

    // Always guarantee local user appears immediately upon entering the room
    if (inClub && currentUid) {
      map.set(currentUid, {
        uid: currentUid,
        displayName: currentDisplayName,
        currentLevel,
        avatarGender: selectedGender,
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
    inClub,
    currentUid,
    currentDisplayName,
    currentLevel,
    selectedGender,
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

  // Enter 3D Club with chosen character
  const handleEnterClub = async () => {
    if (!currentUid) return;
    setJoining(true);
    try {
      window.localStorage.setItem(STORAGE_AVATAR_KEY, selectedGender);
      window.localStorage.setItem(STORAGE_STATUS_KEY, statusText.trim());
    } catch {
      // Ignore storage errors
    }

    const existingMe = firestoreMembers.find((m) => m.uid === currentUid);
    if (existingMe && Number.isFinite(existingMe.posX) && Number.isFinite(existingMe.posZ)) {
      localPosRef.current = {
        posX: existingMe.posX,
        posZ: existingMe.posZ,
        rotationY: existingMe.rotationY || 0,
      };
    } else {
      localPosRef.current = getInitialSpawnPosition(currentUid);
    }

    try {
      await upsertClubMemberPresence({
        uid: currentUid,
        displayName: currentDisplayName,
        currentLevel,
        avatarGender: selectedGender,
        statusText: statusText.trim(),
        posX: localPosRef.current.posX,
        posZ: localPosRef.current.posZ,
        rotationY: localPosRef.current.rotationY,
        isOnline: true,
      });
    } catch {
      // Continue entering 3D club even if Firestore write hits temporary quota
    }

    recordStudyActivity();
    clubEnteredAtRef.current = Date.now();
    // Pre-mark existing historical messages so only newly exchanged chat messages pop bubbles
    firestoreMessages.forEach((m) => {
      if (m.id) shownFirestoreBubbleIdsRef.current.add(m.id);
    });
    setInClub(true);
    setJoining(false);

    // Start background music cleanly from the user's "Vào Câu lạc bộ 3D" click gesture
    if (musicConfig.enabled && musicEngineRef.current) {
      musicEngineRef.current.configure(musicConfig);
      musicEngineRef.current.setVolume(musicVolume);
      void musicEngineRef.current.play();
    }

    addToast(
      'success',
      `Chào mừng đến Câu lạc bộ 3D! Nhấn vào bất kỳ nhân vật nào để trò chuyện tiếng Anh.`
    );
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

  const handleLeaveClub = async (openPicker = false) => {
    musicEngineRef.current?.pause();
    setMusicPopoverOpen(false);
    setSelectedPartnerUid(null);
    setRosterOpen(false);
    setInClub(false);
    if (currentUid) {
      await setClubMemberOffline(currentUid);
    }
    if (!openPicker) {
      addToast('info', 'Bạn đã rời Câu lạc bộ 3D.');
    }
  };

  const handleSelectMemberFrom3D = useCallback(
    (uid: string) => {
      if (uid === currentUid) {
        // Trigger a friendly self talk gesture & speech bubble when clicking own character
        triggerTalkAnimation(currentUid, 3400, true);
        showChatBubble(
          currentUid,
          statusText.trim() || "Hi! Let's practice English together!",
          5000
        );
        addToast(
          'info',
          'Đây là nhân vật của bạn! Nhấn sàn hoặc phím WASD để di chuyển, hoặc nhấn nhân vật khác để trò chuyện tiếng Anh.'
        );
        return;
      }
      // Partner greets with a friendly talking animation upon selection
      triggerTalkAnimation(uid, 3200, false);
      const partnerMember = mergedMembers.find((m) => m.uid === uid);
      if (partnerMember?.statusText?.trim()) {
        showChatBubble(uid, partnerMember.statusText.trim(), 4800);
      }
      setSelectedPartnerUid(uid);
      setRosterOpen(false);
      setMusicPopoverOpen(false);
    },
    [currentUid, addToast, triggerTalkAnimation, showChatBubble, statusText, mergedMembers]
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
          avatarGender: selectedGender,
          statusText: statusText.trim(),
          posX,
          posZ,
          rotationY,
          isOnline: true,
        });
      }
    },
    [currentUid, currentDisplayName, currentLevel, selectedGender, statusText]
  );

  const handleWaveEmote = () => {
    if (!currentUid) return;
    const now = Date.now();
    setWaveTimestamps((prev) => ({ ...prev, [currentUid]: now }));
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

    // Animate local character speaking & show floating 3D chat speech bubble immediately
    triggerTalkAnimation(currentUid, 3400, true);
    showChatBubble(currentUid, text, 7500);
    shownFirestoreBubbleIdsRef.current.add(messageId);

    // Optimistic local + WebSocket instant relay
    const optimisticMsg: ClubMessageDoc = {
      id: messageId,
      pairId: buildClubPairId(currentUid, selectedPartnerUid),
      participants: [currentUid, selectedPartnerUid],
      senderUid: currentUid,
      senderName: currentDisplayName,
      senderAvatar: selectedGender,
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
        senderAvatar: selectedGender,
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

  // =========================================================================
  // STAGE 1: CHARACTER SELECTION LOBBY (BEFORE ENTERING 3D ENGLISH CLUB)
  // =========================================================================
  if (!inClub) {
    const lobbyOnlineCount = firestoreMembers.filter((m) => m.isOnline).length;
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Hero Intro */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
                <Users className="w-4 h-4" />
                Không gian giao tiếp 3D · Three.js
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Chọn nhân vật vào Câu lạc bộ Tiếng Anh 3D
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Chọn một trong hai nhân vật đại diện của bạn trước khi bước vào phòng lounge 3D.
                Trong phòng, bạn có thể di chuyển tự do và{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  nhấn trực tiếp vào nhân vật của người học khác
                </strong>{' '}
                để mở khung nhắn tin luyện tập tiếng Anh 1-1.
              </p>
            </div>

            <div className="shrink-0 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-right space-y-1.5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Thành viên trong phòng
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {lobbyOnlineCount}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  đang hoạt động ({firestoreMembers.length} đã tham gia)
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#D94E00] dark:text-[#FF8524]">
                <Music className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[220px] truncate">
                  Nhạc nền: {musicConfig.enabled ? musicConfig.title : 'Đang tắt'}
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Character Selector (Boy vs Girl matching reference image) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-7">
            {/* BOY CARD */}
            <button
              type="button"
              onClick={() => setSelectedGender('male')}
              className={`group text-left rounded-2xl border-2 p-5 transition-all ${
                selectedGender === 'male'
                  ? 'border-[#FF6B00] bg-orange-50/40 dark:bg-[#FF6B00]/10 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                    Nhân vật 01 · Nam
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                    Cậu bạn Sơ mi Xanh
                  </h3>
                </div>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                    selectedGender === 'male'
                      ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selectedGender === 'male' && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>

              {/* Clean Left-Half Frame of Reference Image */}
              <div className="w-full h-64 rounded-xl bg-gradient-to-b from-sky-50 to-amber-50/60 dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700 overflow-hidden relative flex items-center justify-center">
                {!sheetImgError ? (
                  <img
                    src={AVATAR_SHEET_SRC}
                    alt="Nhân vật Nam Chibi"
                    referrerPolicy="no-referrer"
                    onError={() => setSheetImgError(true)}
                    className="h-[112%] w-auto max-w-none object-contain translate-x-[24%] select-none transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-3xl font-black text-sky-600">NAM</div>
                    <p className="text-xs text-slate-500 mt-1">Sơ mi xanh · Quần kaki · Giày trắng</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                Tạo hình chibi 3D năng động với mái tóc nâu hạt dẻ, áo sơ mi xanh nhạt xắn tay,
                quần kaki xắn gấu và giày sneaker trắng.
              </p>
            </button>

            {/* GIRL CARD */}
            <button
              type="button"
              onClick={() => setSelectedGender('female')}
              className={`group text-left rounded-2xl border-2 p-5 transition-all ${
                selectedGender === 'female'
                  ? 'border-[#FF6B00] bg-orange-50/40 dark:bg-[#FF6B00]/10 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Nhân vật 02 · Nữ
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                    Cô bạn Áo Len Hồng
                  </h3>
                </div>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                    selectedGender === 'female'
                      ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selectedGender === 'female' && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>

              {/* Clean Right-Half Frame of Reference Image */}
              <div className="w-full h-64 rounded-xl bg-gradient-to-b from-rose-50 to-amber-50/60 dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700 overflow-hidden relative flex items-center justify-center">
                {!sheetImgError ? (
                  <img
                    src={AVATAR_SHEET_SRC}
                    alt="Nhân vật Nữ Chibi"
                    referrerPolicy="no-referrer"
                    onError={() => setSheetImgError(true)}
                    className="h-[112%] w-auto max-w-none object-contain -translate-x-[24%] select-none transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-3xl font-black text-rose-600">NỮ</div>
                    <p className="text-xs text-slate-500 mt-1">Áo len hồng · Chân váy kem · Giày nơ</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                Tạo hình chibi 3D dễ thương với mái tóc xoăn nâu caramel cài nơ nhỏ, áo len trễ vai
                hồng phấn, chân váy xếp ly kem và sneaker nơ.
              </p>
            </button>
          </div>

          {/* English Status Greeting & Enter Button */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="flex-1 space-y-2">
              <label
                htmlFor="club-status-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Lời chào tiếng Anh hiển thị trên đầu nhân vật (tùy chọn)
              </label>
              <input
                id="club-status-input"
                type="text"
                maxLength={120}
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="VD: Hi! Let's practice English together!"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {PRESET_GREETINGS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setStatusText(g)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6B00]/12 hover:text-[#D94E00] dark:hover:text-[#FF8524] text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={joining || !currentUid}
              onClick={() => void handleEnterClub()}
              className="px-7 py-3.5 rounded-xl bg-[#FF6B00] hover:bg-[#E55E00] disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-[#FF6B00]/20 flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              {joining ? 'Đang vào phòng 3D...' : 'Vào Câu lạc bộ 3D'}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // STAGE 2: LIVE THREE.JS 3D ENGLISH CLUB ROOM
  // =========================================================================
  return (
    <div className="relative w-full h-[calc(100vh-10.5rem)] min-h-[540px] max-h-[840px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#EFE6DB] shadow-lg select-none">
      {/* Interactive Three.js 3D Scene */}
      <ClubScene3D
        members={mergedMembers}
        currentUserUid={currentUid}
        selectedMemberUid={selectedPartnerUid}
        unreadByUid={unreadByUid}
        waveTimestamps={waveTimestamps}
        talkingUntilByUid={talkingUntilByUid}
        activeTalkingUids={activeTalkingUids}
        chatBubblesByUid={chatBubblesByUid}
        cameraCommand={cameraCommand}
        onSelectMember={handleSelectMemberFrom3D}
        onLocalMove={handleLocalMove}
      />

      {/* Minimal Top-Left Club Header (No backdrop-blur over WebGL!) */}
      <div className="absolute top-3 left-3 z-10 pointer-events-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 shadow-md flex items-center gap-3">
        <ChibiAvatarThumb gender={selectedGender} size="sm" />
        <div>
          <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
            Câu lạc bộ Tiếng Anh 3D
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
              <span>Hiện chỉ có bạn trong phòng</span>
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
            Câu lạc bộ 3D hiển thị người dùng thật theo thời gian thực. Bạn có thể mời bạn bè đăng
            nhập cùng tài khoản khác để trò chuyện tiếng Anh, hoặc ghé mục Nhắn tin AI để luyện
            riêng.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('ai-tutor')}
              className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FF6B00]/12 hover:bg-[#FF6B00]/20 text-[#D94E00] dark:text-[#FF8524] text-[11px] font-bold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Mở Nhắn tin AI
            </button>
          )}
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
                    <ChibiAvatarThumb gender={member.avatarGender} size="sm" />
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
              title="Camera đi theo nhân vật của bạn"
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
              title="Kích hoạt hoạt ảnh đang nói chuyện (Talk) và bong bóng lời thoại"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Nói chuyện</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMusicPopoverOpen((v) => !v);
                setRosterOpen(false);
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

            <button
              type="button"
              onClick={() => void handleLeaveClub(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              title="Đổi giữa nhân vật Nam và Nữ"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đổi nhân vật</span>
            </button>

            <button
              type="button"
              onClick={() => void handleLeaveClub(false)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              title="Rời khỏi phòng 3D"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rời phòng</span>
            </button>

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
