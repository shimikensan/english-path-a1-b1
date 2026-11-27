import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ClubMemberDoc } from '../../types';
import {
  computePilotGearSignature,
  createClubPilotAvatar,
  type ClubPilotAnimationState,
  type ClubPilotAvatarRig,
} from './pilotClubAvatarBuilder';
import { createClubRoom } from './clubRoomBuilder';

export type ClubCameraMode = 'overview' | 'closeup' | 'follow-self' | 'focus-uid';

export interface ClubCameraCommand {
  mode: ClubCameraMode;
  uid?: string;
  seq: number;
}

export interface ClubChatBubbleData {
  text: string;
  createdAt: number;
  expiresAt: number;
  seq: number;
}

export interface ClubEmojiBurstData {
  emoji: string;
  seq: number;
}

interface ClubScene3DProps {
  members: ClubMemberDoc[];
  currentUserUid: string;
  selectedMemberUid: string | null;
  unreadByUid: Record<string, number>;
  waveTimestamps: Record<string, number>;
  talkingUntilByUid: Record<string, number>;
  activeTalkingUids: Record<string, boolean>;
  chatBubblesByUid: Record<string, ClubChatBubbleData>;
  emojiBurstsByUid?: Record<string, ClubEmojiBurstData>;
  nightMode?: boolean;
  cameraCommand: ClubCameraCommand;
  onSelectMember: (uid: string) => void;
  onLocalMove: (posX: number, posZ: number, rotationY: number, isFinal: boolean) => void;
}

interface AvatarRuntimeState {
  rig: ClubPilotAvatarRig;
  currentX: number;
  currentZ: number;
  targetX: number;
  targetZ: number;
  currentRotY: number;
  targetRotY: number;
  walkPhase: number;
  idleSeed: number;
  lastBubbleSeq: number;
  lastEmojiSeq: number;
}

// Pre-allocated scratch objects to guarantee zero GC allocations inside the render loop
const _mouse = new THREE.Vector2();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();

// Pre-allocated day/night atmosphere color constants
const DAY_BG_COLOR = new THREE.Color(0xefe6db);
const NIGHT_BG_COLOR = new THREE.Color(0x060b19);
const DAY_HEMI_SKY = new THREE.Color(0xd9ecff);
const NIGHT_HEMI_SKY = new THREE.Color(0x243b6b);
const DAY_HEMI_GROUND = new THREE.Color(0x9b7e62);
const NIGHT_HEMI_GROUND = new THREE.Color(0x101729);
const DAY_SUN_COLOR = new THREE.Color(0xfff1dc);
const NIGHT_MOON_COLOR = new THREE.Color(0x7cb2ff);
const DAY_LAMP_COLOR = new THREE.Color(0xffcb85);
const NIGHT_LAMP_COLOR = new THREE.Color(0xff9b3d);

function createTwinklingStarfield(pixelRatio: number) {
  const starCount = 420;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const phases = new Float32Array(starCount);
  const speeds = new Float32Array(starCount);

  const starPalette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xbae6fd),
    new THREE.Color(0x7dd3fc),
    new THREE.Color(0xfef3c7),
    new THREE.Color(0xc7d2fe),
  ];

  for (let i = 0; i < starCount; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    // Bias stars across upper sky dome & visible horizon surround
    const phi = Math.acos(0.08 + Math.random() * 0.92);
    const radius = 21 + Math.random() * 19;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.max(1.2, radius * Math.cos(phi) + 2.2);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const c = starPalette[i % starPalette.length];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    sizes[i] = i % 13 === 0 ? 11.5 + Math.random() * 5.0 : 4.2 + Math.random() * 5.6;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 1.2 + Math.random() * 2.8;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uNightMix: { value: 0 },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vTwinkle;

      void main() {
        vColor = aColor;
        float tw = 0.52 + 0.48 * sin(uTime * aSpeed + aPhase);
        vTwinkle = tw * tw;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (0.75 + 0.45 * vTwinkle) * (24.0 / max(8.0, -mvPos.z));
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uNightMix;
      varying vec3 vColor;
      varying float vTwinkle;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;

        // Crisp bright star core + soft atmospheric halo
        float core = smoothstep(0.5, 0.04, d);
        float sparkle = pow(core, 2.2);
        float alpha = sparkle * (0.35 + 0.65 * vTwinkle) * uNightMix;
        gl_FragColor = vec4(vColor * (1.0 + 0.45 * vTwinkle), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;

  return { points, geometry, material };
}

function createNocturnalFireflies(pixelRatio: number) {
  const count = 42;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);

  const palette = [
    new THREE.Color(0x38bdf8),
    new THREE.Color(0x22d3ee),
    new THREE.Color(0xffb347),
  ];

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const radius = 5.4 + Math.random() * 5.8;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 1.1 + Math.random() * 4.2;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    const c = palette[i % palette.length];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uNightMix: { value: 0 },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vPulse;

      void main() {
        vColor = aColor;
        vec3 pos = position;
        pos.y += sin(uTime * 0.85 + aPhase) * 0.42;
        pos.x += cos(uTime * 0.45 + aPhase * 1.3) * 0.35;
        pos.z += sin(uTime * 0.52 + aPhase * 0.7) * 0.35;
        vPulse = 0.5 + 0.5 * sin(uTime * 2.1 + aPhase);
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (6.5 + 4.5 * vPulse) * uPixelRatio * (14.0 / max(4.0, -mvPos.z));
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uNightMix;
      varying vec3 vColor;
      varying float vPulse;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        float glow = pow(smoothstep(0.5, 0.0, d), 2.0);
        gl_FragColor = vec4(vColor, glow * (0.28 + 0.48 * vPulse) * uNightMix);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;

  return { points, geometry, material };
}

function detectSoftwareGl(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const rendererStr = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '');
    return /swiftshader|llvmpipe|softpipe/i.test(rendererStr);
  } catch {
    return false;
  }
}

function clampWalkablePosition(x: number, z: number): { x: number; z: number } {
  let nx = Math.max(-6.15, Math.min(6.15, x));
  let nz = Math.max(-5.8, Math.min(6.15, z));

  // Keep avatars clear of the back-right espresso bar counter (x in [1.1..6.6], z in [-7..-4.7])
  if (nx > 1.15 && nz < -4.55) {
    nz = -4.55;
  }
  // Keep avatars clear of back-left bookshelf nook (x < -4.2, z < -5.4)
  if (nx < -4.2 && nz < -5.3) {
    nz = -5.3;
  }
  return { x: nx, z: nz };
}

function shortestAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function ClubScene3D({
  members,
  currentUserUid,
  selectedMemberUid,
  unreadByUid,
  waveTimestamps,
  talkingUntilByUid,
  activeTalkingUids,
  chatBubblesByUid,
  emojiBurstsByUid,
  nightMode = false,
  cameraCommand,
  onSelectMember,
  onLocalMove,
}: ClubScene3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Refs synced with latest React props without recreating the WebGLRenderer
  const membersRef = useRef<ClubMemberDoc[]>(members);
  const selectedUidRef = useRef<string | null>(selectedMemberUid);
  const unreadRef = useRef<Record<string, number>>(unreadByUid);
  const waveRef = useRef<Record<string, number>>(waveTimestamps);
  const talkingUntilRef = useRef<Record<string, number>>(talkingUntilByUid);
  const activeTalkingRef = useRef<Record<string, boolean>>(activeTalkingUids);
  const chatBubblesRef = useRef<Record<string, ClubChatBubbleData>>(chatBubblesByUid);
  const emojiBurstsRef = useRef<Record<string, ClubEmojiBurstData>>(emojiBurstsByUid ?? {});
  const nightModeRef = useRef<boolean>(nightMode);
  const onSelectMemberRef = useRef(onSelectMember);
  const onLocalMoveRef = useRef(onLocalMove);
  const cameraCommandRef = useRef<ClubCameraCommand>(cameraCommand);

  membersRef.current = members;
  selectedUidRef.current = selectedMemberUid;
  unreadRef.current = unreadByUid;
  waveRef.current = waveTimestamps;
  talkingUntilRef.current = talkingUntilByUid;
  activeTalkingRef.current = activeTalkingUids;
  chatBubblesRef.current = chatBubblesByUid;
  emojiBurstsRef.current = emojiBurstsByUid ?? {};
  nightModeRef.current = nightMode;
  onSelectMemberRef.current = onSelectMember;
  onLocalMoveRef.current = onLocalMove;

  // Imperative hooks exposed by the initialized WebGL scene
  const syncAvatarsRef = useRef<(() => void) | null>(null);
  const applyCameraCommandRef = useRef<((cmd: ClubCameraCommand) => void) | null>(null);

  useEffect(() => {
    syncAvatarsRef.current?.();
  }, [members, selectedMemberUid, unreadByUid]);

  useEffect(() => {
    cameraCommandRef.current = cameraCommand;
    applyCameraCommandRef.current?.(cameraCommand);
  }, [cameraCommand]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Probe software GL before configuring renderer quality tier
    const probeCanvas = document.createElement('canvas');
    const probeGl = (probeCanvas.getContext('webgl2') ||
      probeCanvas.getContext('webgl')) as WebGL2RenderingContext | WebGLRenderingContext | null;
    const isSoftwareGl = probeGl ? detectSoftwareGl(probeGl) : false;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 800, container.clientHeight || 560, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const gl = renderer.getContext();

    // 2. Scene, Sky/Horizon Backdrop, Fog & RoomEnvironment IBL
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xefe6db);
    scene.fog = new THREE.Fog(0xefe6db, 20, 44);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3. Camera & OrbitControls
    const aspect = (container.clientWidth || 800) / Math.max(1, container.clientHeight || 560);
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.2, 85);
    camera.position.set(8.6, 7.6, 10.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.85, 0.2);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 4.2;
    controls.maxDistance = 17.5;
    controls.minPolarAngle = 0.24;
    controls.maxPolarAngle = Math.PI / 2 - 0.08;
    controls.maxTargetRadius = 7.5;
    controls.update();

    // 4. Three-point Cozy Daylight Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xd9ecff, 0x9b7e62, 0.92);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const sunKey = new THREE.DirectionalLight(0xfff1dc, 2.05);
    sunKey.position.set(-9.5, 13.5, 7.5);
    sunKey.castShadow = !isSoftwareGl;
    sunKey.shadow.mapSize.set(1024, 1024);
    sunKey.shadow.camera.near = 2;
    sunKey.shadow.camera.far = 32;
    sunKey.shadow.camera.left = -9.5;
    sunKey.shadow.camera.right = 9.5;
    sunKey.shadow.camera.top = 9.5;
    sunKey.shadow.camera.bottom = -9.5;
    sunKey.shadow.bias = -0.0006;
    scene.add(sunKey);

    const cafeLampFill = new THREE.PointLight(0xffcb85, 1.35, 14, 1.6);
    cafeLampFill.position.set(3.8, 3.0, -5.3);
    scene.add(cafeLampFill);

    // Nocturnal cyan-indigo rim light (smoothly ramps up in Night Mode to outline 3D Pilots)
    const nightRimLight = new THREE.DirectionalLight(0x38bdf8, 0);
    nightRimLight.position.set(8.5, 6.8, -9.2);
    scene.add(nightRimLight);

    // 4b. Twinkling 3D Starfield Sky Dome & Floating Night Starlight Motes
    const effectivePixelRatio = renderer.getPixelRatio();
    const starfield = createTwinklingStarfield(effectivePixelRatio);
    scene.add(starfield.points);

    const nightFireflies = createNocturnalFireflies(effectivePixelRatio);
    scene.add(nightFireflies.points);

    // 5. Build the 3D English Club Room (supports seamless Day <-> Night transition)
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const clubRoom = createClubRoom(maxAnisotropy);
    scene.add(clubRoom.roomGroup);

    // 6. Avatar Registry & Layer 1 Raycasting Setup
    const avatarsGroup = new THREE.Group();
    scene.add(avatarsGroup);
    const avatarStates = new Map<string, AvatarRuntimeState>();

    const characterRaycaster = new THREE.Raycaster();
    characterRaycaster.layers.set(1);
    const floorRaycaster = new THREE.Raycaster();

    let hoveredUid: string | null = null;
    let walkRingAlpha = 0;

    // Smooth camera transition state (immediately cancelled when user drags OrbitControls)
    let camTransitionActive = false;
    let camFollowSelf = false;
    const cancelCamTransition = () => {
      camTransitionActive = false;
      camFollowSelf = false;
    };
    controls.addEventListener('start', cancelCamTransition);

    const applyCameraCommand = (cmd: ClubCameraCommand) => {
      camFollowSelf = false;
      if (cmd.mode === 'overview') {
        _targetCamPos.set(8.6, 7.6, 10.4);
        _targetLookAt.set(0, 0.85, 0.2);
        camTransitionActive = true;
      } else if (cmd.mode === 'closeup') {
        const selfState = avatarStates.get(currentUserUid);
        const cx = selfState?.currentX ?? 0;
        const cz = selfState?.currentZ ?? 0.8;
        _targetCamPos.set(cx + 2.8, 3.1, cz + 4.4);
        _targetLookAt.set(cx, 1.15, cz);
        camTransitionActive = true;
      } else if (cmd.mode === 'follow-self') {
        camFollowSelf = true;
        camTransitionActive = false;
      } else if (cmd.mode === 'focus-uid' && cmd.uid) {
        const targetState = avatarStates.get(cmd.uid);
        if (targetState) {
          _targetCamPos.set(targetState.currentX + 2.7, 2.9, targetState.currentZ + 4.2);
          _targetLookAt.set(targetState.currentX, 1.1, targetState.currentZ);
          camTransitionActive = true;
        }
      }
    };
    applyCameraCommandRef.current = applyCameraCommand;

    const refreshHighlightRings = () => {
      const selectedUid = selectedUidRef.current;
      avatarStates.forEach((state, uid) => {
        if (uid === selectedUid) {
          state.rig.setHighlight('selected');
        } else if (uid === hoveredUid) {
          state.rig.setHighlight('hover');
        } else if (uid === currentUserUid) {
          state.rig.setHighlight('self');
        } else {
          state.rig.setHighlight('none');
        }
      });
    };

    const syncAvatars = () => {
      const list = membersRef.current;
      const unreadMap = unreadRef.current;
      const activeUids = new Set<string>();

      list.forEach((member, index) => {
        activeUids.add(member.uid);
        const isSelf = member.uid === currentUserUid;
        const clamped = clampWalkablePosition(member.posX, member.posZ);
        const existing = avatarStates.get(member.uid);

        const labelOpts = {
          displayName: member.displayName,
          level: member.currentLevel,
          isSelf,
          isOnline: member.isOnline,
          unreadCount: isSelf ? 0 : unreadMap[member.uid] ?? 0,
          statusText: member.statusText,
        };

        const nextGearSig = computePilotGearSignature(member.pilotEquipped);

        // Recreate 3D Pilot rig if equipped Hangar gear changed
        if (existing && existing.rig.gearSignature !== nextGearSig) {
          avatarsGroup.remove(existing.rig.root);
          existing.rig.dispose();
          avatarStates.delete(member.uid);
        }

        const current = avatarStates.get(member.uid);
        if (!current) {
          const rig = createClubPilotAvatar({
            uid: member.uid,
            pilotEquipped: member.pilotEquipped,
            label: labelOpts,
            isSoftwareGl,
            initialTimeOffset: index * 0.91 + 0.25,
          });
          rig.root.position.set(clamped.x, 0, clamped.z);
          rig.root.rotation.y = member.rotationY || 0;
          avatarsGroup.add(rig.root);

          avatarStates.set(member.uid, {
            rig,
            currentX: clamped.x,
            currentZ: clamped.z,
            targetX: clamped.x,
            targetZ: clamped.z,
            currentRotY: member.rotationY || 0,
            targetRotY: member.rotationY || 0,
            walkPhase: 0,
            idleSeed: index * 1.37 + 0.4,
            lastBubbleSeq: 0,
            lastEmojiSeq: emojiBurstsRef.current[member.uid]?.seq ?? 0,
          });
        } else {
          current.rig.updateLabel(labelOpts);
          // For remote users, smoothly interpolate toward updated network position
          if (!isSelf) {
            current.targetX = clamped.x;
            current.targetZ = clamped.z;
            current.targetRotY = member.rotationY || current.targetRotY;
          }
        }
      });

      // Remove departed members cleanly
      avatarStates.forEach((state, uid) => {
        if (!activeUids.has(uid)) {
          avatarsGroup.remove(state.rig.root);
          state.rig.dispose();
          avatarStates.delete(uid);
        }
      });

      refreshHighlightRings();
    };
    syncAvatarsRef.current = syncAvatars;
    syncAvatars();

    // 7. Pointer Click (Select Character OR Click Floor to Walk) + Throttled Hover
    let downX = 0;
    let downY = 0;
    let lastHoverTime = 0;

    const getNormalizedPointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      _mouse.y = -((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    };

    const raycastCharacter = (): string | null => {
      const proxies: THREE.Object3D[] = [];
      avatarStates.forEach((s) => proxies.push(s.rig.hitProxy));
      if (proxies.length === 0) return null;
      characterRaycaster.setFromCamera(_mouse, camera);
      const hits = characterRaycaster.intersectObjects(proxies, false);
      if (hits.length > 0) {
        const uid = hits[0].object.userData.clubUid;
        return typeof uid === 'string' ? uid : null;
      }
      return null;
    };

    const handlePointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      downX = ev.clientX;
      downY = ev.clientY;
    };

    const handlePointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 50) return;
      lastHoverTime = now;

      getNormalizedPointer(ev);
      const hitUid = raycastCharacter();
      if (hitUid !== hoveredUid) {
        hoveredUid = hitUid;
        renderer.domElement.style.cursor = hitUid ? 'pointer' : 'grab';
        refreshHighlightRings();
      }
    };

    const handlePointerUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const dx = ev.clientX - downX;
      const dy = ev.clientY - downY;
      // Ignore orbit drags
      if (Math.hypot(dx, dy) > 6) return;

      getNormalizedPointer(ev);
      const hitUid = raycastCharacter();
      if (hitUid) {
        onSelectMemberRef.current(hitUid);
        const targetState = avatarStates.get(hitUid);
        if (targetState) {
          _targetCamPos.set(targetState.currentX + 2.7, 2.9, targetState.currentZ + 4.2);
          _targetLookAt.set(targetState.currentX, 1.1, targetState.currentZ);
          camTransitionActive = true;
          camFollowSelf = false;
        }
        return;
      }

      // Otherwise check floor hit to walk local user's avatar
      floorRaycaster.setFromCamera(_mouse, camera);
      const floorHits = floorRaycaster.intersectObject(clubRoom.floorHitMesh, false);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        const clamped = clampWalkablePosition(pt.x, pt.z);
        const selfState = avatarStates.get(currentUserUid);
        if (selfState) {
          selfState.targetX = clamped.x;
          selfState.targetZ = clamped.z;
          const rotY = Math.atan2(clamped.x - selfState.currentX, clamped.z - selfState.currentZ);
          selfState.targetRotY = rotY;
          clubRoom.walkTargetRing.position.set(clamped.x, 0.022, clamped.z);
          walkRingAlpha = 1.0;
          onLocalMoveRef.current(clamped.x, clamped.z, rotY, true);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // 8. Keyboard WASD / Arrow Keys Walking (ignored while typing in chat input)
    const keysPressed = new Set<string>();
    const handleKeyDown = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const k = ev.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysPressed.add(k);
      }
    };
    const handleKeyUp = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (keysPressed.delete(k) && keysPressed.size === 0) {
        const selfState = avatarStates.get(currentUserUid);
        if (selfState) {
          onLocalMoveRef.current(selfState.currentX, selfState.currentZ, selfState.currentRotY, true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 9. ResizeObserver & WebGL Context Lost Handling
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const handleContextLost = (ev: Event) => {
      ev.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // 10. Animation & Render Loop (with mandatory software-GL fenceSync pacing)
    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let lastFrameTime = performance.now();
    let lastKeyboardEmitTime = 0;
    let nightMix = nightModeRef.current ? 1 : 0;
    const walkRingMat = clubRoom.walkTargetRing.material as THREE.MeshBasicMaterial;
    const sceneBgColor = scene.background as THREE.Color;
    const sceneFog = scene.fog as THREE.Fog;

    const afterDraw = (next: () => void) => {
      if (disposed) return;
      if (isSoftwareGl && typeof (gl as WebGL2RenderingContext).fenceSync === 'function') {
        const gl2 = gl as WebGL2RenderingContext;
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl2.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl2.deleteSync(sync);
            return;
          }
          if (!sync || gl2.clientWaitSync(sync, 0, 0) !== gl2.TIMEOUT_EXPIRED) {
            if (sync) gl2.deleteSync(sync);
            timerId = window.setTimeout(next, 80);
          } else {
            timerId = window.setTimeout(poll, 4);
          }
        };
        poll();
      } else {
        rafId = window.requestAnimationFrame(next);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
      lastFrameTime = now;
      const elapsedSec = now * 0.001;
      const nowEpoch = Date.now();

      // Keyboard movement for local user relative to camera facing direction
      if (keysPressed.size > 0) {
        const selfState = avatarStates.get(currentUserUid);
        if (selfState) {
          camera.getWorldDirection(_camForward);
          _camForward.y = 0;
          if (_camForward.lengthSq() > 0.0001) {
            _camForward.normalize();
          } else {
            _camForward.set(0, 0, -1);
          }
          _camRight.set(-_camForward.z, 0, _camForward.x);
          _moveDir.set(0, 0, 0);

          if (keysPressed.has('w') || keysPressed.has('arrowup')) _moveDir.add(_camForward);
          if (keysPressed.has('s') || keysPressed.has('arrowdown')) _moveDir.sub(_camForward);
          if (keysPressed.has('d') || keysPressed.has('arrowright')) _moveDir.add(_camRight);
          if (keysPressed.has('a') || keysPressed.has('arrowleft')) _moveDir.sub(_camRight);

          if (_moveDir.lengthSq() > 0.0001) {
            _moveDir.normalize();
            const speed = 3.2;
            const nextPos = clampWalkablePosition(
              selfState.currentX + _moveDir.x * speed * dt,
              selfState.currentZ + _moveDir.z * speed * dt
            );
            selfState.targetX = nextPos.x;
            selfState.targetZ = nextPos.z;
            selfState.targetRotY = Math.atan2(_moveDir.x, _moveDir.z);

            if (now - lastKeyboardEmitTime > 120) {
              lastKeyboardEmitTime = now;
              onLocalMoveRef.current(nextPos.x, nextPos.z, selfState.targetRotY, false);
            }
          }
        }
      }

      // Animate every chibi avatar with Three.js AnimationMixer (idle / talk / walk / wave)
      const waveMap = waveRef.current;
      const talkingUntilMap = talkingUntilRef.current;
      const activeTalkingMap = activeTalkingRef.current;
      const chatBubblesMap = chatBubblesRef.current;
      const emojiBurstsMap = emojiBurstsRef.current;
      const selectedPartnerId = selectedUidRef.current;
      const selfAvatarState = avatarStates.get(currentUserUid);
      const partnerAvatarState = selectedPartnerId ? avatarStates.get(selectedPartnerId) : undefined;

      avatarStates.forEach((state, uid) => {
        const dx = state.targetX - state.currentX;
        const dz = state.targetZ - state.currentZ;
        const dist = Math.hypot(dx, dz);
        const isWalking = dist > 0.04;

        if (dist > 0.02) {
          const step = Math.min(dist, 3.25 * dt);
          state.currentX += (dx / dist) * step;
          state.currentZ += (dz / dist) * step;
          state.targetRotY = Math.atan2(dx, dz);
        } else {
          state.currentX = state.targetX;
          state.currentZ = state.targetZ;

          // Gently orient self & active chat partner face-to-face when conversing
          if (uid === currentUserUid && partnerAvatarState) {
            const pdx = partnerAvatarState.currentX - state.currentX;
            const pdz = partnerAvatarState.currentZ - state.currentZ;
            if (Math.hypot(pdx, pdz) > 0.2) {
              state.targetRotY = Math.atan2(pdx, pdz);
            }
          } else if (uid === selectedPartnerId && selfAvatarState) {
            const sdx = selfAvatarState.currentX - state.currentX;
            const sdz = selfAvatarState.currentZ - state.currentZ;
            if (Math.hypot(sdx, sdz) > 0.2) {
              state.targetRotY = Math.atan2(sdx, sdz);
            }
          }
        }

        const angleDelta = shortestAngleDiff(state.currentRotY, state.targetRotY);
        state.currentRotY += angleDelta * Math.min(1, dt * 8.5);

        state.rig.root.position.set(state.currentX, 0, state.currentZ);
        state.rig.root.rotation.y = state.currentRotY;

        const waveAt = waveMap[uid] ?? 0;
        const waveElapsed = (nowEpoch - waveAt) / 1000;
        const isWaving = waveAt > 0 && waveElapsed >= 0 && waveElapsed < 1.9;
        const talkUntil = talkingUntilMap[uid] ?? 0;
        const isTalking = Boolean(activeTalkingMap[uid]) || talkUntil > nowEpoch;

        let desiredState: ClubPilotAnimationState = 'idle';
        if (isWalking) {
          desiredState = 'walk';
        } else if (isWaving) {
          desiredState = 'wave';
        } else if (isTalking) {
          desiredState = 'talk';
        }

        const fadeSec = desiredState === 'walk' ? 0.16 : 0.26;
        state.rig.setAnimationState(desiredState, fadeSec);
        state.rig.updateAnimation(dt);

        // Keep 3D talk indicator bubble smoothly oriented toward camera when visible
        if (desiredState === 'talk' || state.rig.talkBubbleGroup.scale.x > 0.05) {
          state.rig.talkBubbleGroup.lookAt(camera.position);
        }

        // Update floating 3D chat message speech bubble above character nameplate
        const bubble = chatBubblesMap[uid];
        if (bubble && bubble.expiresAt > nowEpoch && bubble.text) {
          if (state.lastBubbleSeq !== bubble.seq) {
            state.rig.setChatBubble(bubble.text, uid === currentUserUid);
            state.lastBubbleSeq = bubble.seq;
          }
          const ageSec = Math.max(0, (nowEpoch - bubble.createdAt) / 1000);
          const remainingSec = Math.max(0, (bubble.expiresAt - nowEpoch) / 1000);

          let scaleFactor = 1;
          let opacity = 1;
          if (ageSec < 0.28) {
            const t = ageSec / 0.28;
            // Crisp pop-in overshoot curve
            scaleFactor = 0.62 + 0.44 * Math.sin(t * Math.PI * 0.65);
            opacity = Math.min(1, t * 1.4);
          } else if (remainingSec < 0.85) {
            const t = remainingSec / 0.85;
            opacity = t;
            scaleFactor = 0.92 + 0.08 * t;
          }
          const floatOffset = Math.sin(elapsedSec * 2.4 + state.idleSeed) * 0.035;
          state.rig.setChatBubbleVisual(scaleFactor, opacity, floatOffset);
        } else if (state.rig.chatBubbleSprite.visible) {
          state.rig.setChatBubbleVisual(0.01, 0, 0);
        }

        // Trigger floating 3D emoji burst above character's head when clicked or reacted
        const emojiBurst = emojiBurstsMap[uid];
        if (emojiBurst && emojiBurst.seq > state.lastEmojiSeq) {
          state.lastEmojiSeq = emojiBurst.seq;
          state.rig.spawnEmojiBurst(emojiBurst.emoji);
        }

        // Update 3D Pilot's neon night accents & underglow smoothly
        state.rig.setNightMode(nightMix, elapsedSec);
      });

      // Smooth Day <-> Night Mode atmospheric interpolation (Zero GC)
      const nightTarget = nightModeRef.current ? 1 : 0;
      nightMix = THREE.MathUtils.damp(nightMix, nightTarget, 3.8, dt);
      if (Math.abs(nightMix - nightTarget) < 0.002) {
        nightMix = nightTarget;
      }

      sceneBgColor.copy(DAY_BG_COLOR).lerp(NIGHT_BG_COLOR, nightMix);
      sceneFog.color.copy(sceneBgColor);
      sceneFog.near = THREE.MathUtils.lerp(20, 17, nightMix);
      sceneFog.far = THREE.MathUtils.lerp(44, 48, nightMix);

      hemiLight.color.copy(DAY_HEMI_SKY).lerp(NIGHT_HEMI_SKY, nightMix);
      hemiLight.groundColor.copy(DAY_HEMI_GROUND).lerp(NIGHT_HEMI_GROUND, nightMix);
      hemiLight.intensity = THREE.MathUtils.lerp(0.92, 0.48, nightMix);

      sunKey.color.copy(DAY_SUN_COLOR).lerp(NIGHT_MOON_COLOR, nightMix);
      sunKey.intensity = THREE.MathUtils.lerp(2.05, 0.78, nightMix);

      cafeLampFill.color.copy(DAY_LAMP_COLOR).lerp(NIGHT_LAMP_COLOR, nightMix);
      cafeLampFill.intensity = THREE.MathUtils.lerp(1.35, 2.55, nightMix);
      cafeLampFill.distance = THREE.MathUtils.lerp(14, 17.5, nightMix);

      nightRimLight.intensity = nightMix * 0.78;
      scene.environmentIntensity = THREE.MathUtils.lerp(1.0, 0.36, nightMix);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(1.04, 1.12, nightMix);

      clubRoom.setNightBlend(nightMix, elapsedSec);

      const showNightSky = nightMix > 0.015;
      starfield.points.visible = showNightSky;
      nightFireflies.points.visible = showNightSky;
      if (showNightSky) {
        starfield.material.uniforms.uTime.value = elapsedSec;
        starfield.material.uniforms.uNightMix.value = nightMix;
        starfield.points.rotation.y = elapsedSec * 0.012;

        nightFireflies.material.uniforms.uTime.value = elapsedSec;
        nightFireflies.material.uniforms.uNightMix.value = nightMix;
      }

      // Fade floor click-to-walk target ring
      if (walkRingAlpha > 0.01) {
        walkRingAlpha = Math.max(0, walkRingAlpha - dt * 1.5);
        walkRingMat.opacity = walkRingAlpha * 0.85;
        const scale = 1 + (1 - walkRingAlpha) * 0.55;
        clubRoom.walkTargetRing.scale.setScalar(scale);
      } else if (walkRingMat.opacity !== 0) {
        walkRingMat.opacity = 0;
      }

      // Smooth camera transition or follow-self mode
      if (camTransitionActive) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 4.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 4.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 4.5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 5.2, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 5.2, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 5.2, dt);
        if (
          camera.position.distanceTo(_targetCamPos) < 0.06 &&
          controls.target.distanceTo(_targetLookAt) < 0.06
        ) {
          camTransitionActive = false;
        }
      } else if (camFollowSelf) {
        const selfState = avatarStates.get(currentUserUid);
        if (selfState) {
          controls.target.x = THREE.MathUtils.damp(controls.target.x, selfState.currentX, 5, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, 1.05, 5, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, selfState.currentZ, 5, dt);
          camera.position.x = THREE.MathUtils.damp(camera.position.x, selfState.currentX + 3.4, 3.8, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, 3.6, 3.8, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, selfState.currentZ + 5.2, 3.8, dt);
        }
      }

      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', cancelCamTransition);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      avatarStates.forEach((state) => {
        avatarsGroup.remove(state.rig.root);
        state.rig.dispose();
      });
      avatarStates.clear();
      clubRoom.dispose();
      starfield.geometry.dispose();
      starfield.material.dispose();
      nightFireflies.geometry.dispose();
      nightFireflies.material.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      syncAvatarsRef.current = null;
      applyCameraCommandRef.current = null;
    };
  }, [currentUserUid]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Dedicated empty Three.js WebGL canvas mount */}
      <div ref={mountRef} className="w-full h-full" />
      {contextLost && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
          <p className="text-base font-bold text-white">Đang khôi phục đồ họa 3D WebGL...</p>
          <p className="text-xs text-slate-300 mt-1">
            Vui lòng đợi trong giây lát để phòng Câu lạc bộ 3D hiển thị lại.
          </p>
        </div>
      )}
    </div>
  );
}
