import * as THREE from 'three';
import type { ClubAvatarGender, LearnerCEFRLevel } from '../../types';

export type ChibiAnimationState = 'idle' | 'talk' | 'walk' | 'wave';

export interface AvatarLabelOptions {
  displayName: string;
  level: LearnerCEFRLevel;
  isSelf: boolean;
  isOnline: boolean;
  unreadCount?: number;
  statusText?: string;
}

export interface ChibiAvatarRig {
  uid: string;
  gender: ClubAvatarGender;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  talkBubbleGroup: THREE.Group;
  selectionRing: THREE.Mesh;
  hitProxy: THREE.Mesh;
  nameSprite: THREE.Sprite;
  chatBubbleSprite: THREE.Sprite;
  mixer: THREE.AnimationMixer;
  currentAnimation: ChibiAnimationState;
  setAnimationState: (next: ChibiAnimationState, fadeDuration?: number) => void;
  updateAnimation: (dt: number) => void;
  updateLabel: (opts: AvatarLabelOptions) => void;
  setChatBubble: (text: string | null, isSelf: boolean) => void;
  setChatBubbleVisual: (scaleFactor: number, opacity: number, yOffset?: number) => void;
  setHighlight: (state: 'none' | 'hover' | 'selected' | 'self') => void;
  dispose: () => void;
}

// Shared procedural textures created lazily to keep GPU memory tight
let sharedHeartBlushTex: THREE.CanvasTexture | null = null;
let sharedKnitTex: THREE.CanvasTexture | null = null;
let sharedShadowTex: THREE.CanvasTexture | null = null;

// Shared optimized Three.js AnimationClips reused across every chibi avatar's AnimationMixer
let sharedClips: Record<ChibiAnimationState, THREE.AnimationClip> | null = null;

function createSmoothTrack(
  name: string,
  times: number[],
  values: number[]
): THREE.NumberKeyframeTrack {
  const track = new THREE.NumberKeyframeTrack(name, times, values);
  track.setInterpolation(THREE.InterpolateSmooth);
  return track;
}

function getSharedChibiClips(): Record<ChibiAnimationState, THREE.AnimationClip> {
  if (sharedClips) return sharedClips;

  // 1. IDLE CLIP (3.6s loop): gentle breathing, subtle weight shift, curious head sway, double eye blink
  const idleClip = new THREE.AnimationClip('idle', 3.6, [
    createSmoothTrack('Body.position[y]', [0, 0.9, 1.8, 2.7, 3.6], [0, 0.026, 0.004, 0.024, 0]),
    createSmoothTrack('Body.rotation[z]', [0, 0.9, 1.8, 2.7, 3.6], [0, 0.022, 0, -0.022, 0]),
    createSmoothTrack('Body.rotation[y]', [0, 1.2, 2.4, 3.6], [0, 0.035, -0.035, 0]),
    createSmoothTrack('Head.rotation[y]', [0, 1.1, 2.2, 3.0, 3.6], [0, 0.08, -0.07, 0.02, 0]),
    createSmoothTrack('Head.rotation[z]', [0, 0.9, 1.8, 2.7, 3.6], [0, -0.042, 0.015, 0.042, 0]),
    createSmoothTrack('Head.rotation[x]', [0, 0.9, 1.8, 2.7, 3.6], [0, 0.025, -0.018, 0.02, 0]),
    createSmoothTrack('LeftArm.rotation[x]', [0, 1.8, 3.6], [0.02, -0.05, 0.02]),
    createSmoothTrack('RightArm.rotation[x]', [0, 1.8, 3.6], [-0.02, 0.05, -0.02]),
    createSmoothTrack('LeftArm.rotation[z]', [0, 0.9, 1.8, 2.7, 3.6], [-0.04, -0.09, -0.04, -0.08, -0.04]),
    createSmoothTrack('RightArm.rotation[z]', [0, 0.9, 1.8, 2.7, 3.6], [0.04, 0.09, 0.04, 0.08, 0.04]),
    createSmoothTrack('LeftLeg.rotation[x]', [0, 3.6], [0, 0]),
    createSmoothTrack('RightLeg.rotation[x]', [0, 3.6], [0, 0]),
    // Natural smiling resting mouth
    createSmoothTrack('Mouth.scale[x]', [0, 1.8, 3.6], [1.15, 1.18, 1.15]),
    createSmoothTrack('Mouth.scale[y]', [0, 1.8, 3.6], [0.72, 0.76, 0.72]),
    // Natural eye blink near t = 2.45s
    new THREE.NumberKeyframeTrack(
      'LeftEye.scale[y]',
      [0, 2.35, 2.43, 2.52, 3.6],
      [1, 1, 0.08, 1, 1]
    ),
    new THREE.NumberKeyframeTrack(
      'RightEye.scale[y]',
      [0, 2.35, 2.43, 2.52, 3.6],
      [1, 1, 0.08, 1, 1]
    ),
    // Keep 3D speech indicator hidden when idle
    new THREE.NumberKeyframeTrack('TalkBubble.scale[x]', [0, 3.6], [0.001, 0.001]),
    new THREE.NumberKeyframeTrack('TalkBubble.scale[y]', [0, 3.6], [0.001, 0.001]),
    new THREE.NumberKeyframeTrack('TalkBubble.scale[z]', [0, 3.6], [0.001, 0.001]),
  ]);
  idleClip.optimize();

  // 2. TALK CLIP (1.6s loop): animated lip-sync mouth, conversational hand gestures, attentive nods, floating speech bubble
  const talkClip = new THREE.AnimationClip('talk', 1.6, [
    createSmoothTrack('Body.position[y]', [0, 0.25, 0.55, 0.85, 1.2, 1.6], [0, 0.048, 0.012, 0.044, 0.01, 0]),
    createSmoothTrack('Body.rotation[y]', [0, 0.4, 0.8, 1.2, 1.6], [0, 0.075, -0.02, -0.075, 0]),
    createSmoothTrack('Body.rotation[z]', [0, 0.4, 0.8, 1.2, 1.6], [0, 0.03, -0.025, 0.02, 0]),
    // Expressive conversational head nods & tilts
    createSmoothTrack('Head.rotation[x]', [0, 0.22, 0.45, 0.72, 1.0, 1.3, 1.6], [0, 0.11, -0.04, 0.09, -0.05, 0.08, 0]),
    createSmoothTrack('Head.rotation[y]', [0, 0.4, 0.8, 1.2, 1.6], [0, -0.09, 0.09, -0.05, 0]),
    createSmoothTrack('Head.rotation[z]', [0, 0.35, 0.8, 1.2, 1.6], [0, 0.07, -0.07, 0.05, 0]),
    // Conversational alternating hand gestures (explaining / emphasizing English phrases)
    createSmoothTrack('RightArm.rotation[x]', [0, 0.3, 0.65, 1.0, 1.3, 1.6], [-0.45, -1.05, -0.6, -0.95, -0.5, -0.45]),
    createSmoothTrack('RightArm.rotation[z]', [0, 0.3, 0.8, 1.2, 1.6], [0.22, 0.58, 0.28, 0.5, 0.22]),
    createSmoothTrack('LeftArm.rotation[x]', [0, 0.4, 0.8, 1.15, 1.6], [-0.35, -0.55, -0.98, -0.48, -0.35]),
    createSmoothTrack('LeftArm.rotation[z]', [0, 0.4, 0.8, 1.2, 1.6], [-0.2, -0.32, -0.55, -0.26, -0.2]),
    createSmoothTrack('LeftLeg.rotation[x]', [0, 0.8, 1.6], [0, 0.04, 0]),
    createSmoothTrack('RightLeg.rotation[x]', [0, 0.8, 1.6], [0, -0.04, 0]),
    // Syllable-paced lip-sync mouth flap
    createSmoothTrack(
      'Mouth.scale[y]',
      [0, 0.14, 0.28, 0.44, 0.6, 0.76, 0.94, 1.12, 1.3, 1.46, 1.6],
      [0.62, 1.48, 0.58, 1.32, 0.65, 1.52, 0.6, 1.28, 0.7, 1.38, 0.62]
    ),
    createSmoothTrack(
      'Mouth.scale[x]',
      [0, 0.28, 0.6, 0.94, 1.3, 1.6],
      [1.15, 0.98, 1.2, 0.96, 1.18, 1.15]
    ),
    // Quick happy blink while speaking
    new THREE.NumberKeyframeTrack(
      'LeftEye.scale[y]',
      [0, 1.15, 1.22, 1.3, 1.6],
      [1, 1, 0.12, 1, 1]
    ),
    new THREE.NumberKeyframeTrack(
      'RightEye.scale[y]',
      [0, 1.15, 1.22, 1.3, 1.6],
      [1, 1, 0.12, 1, 1]
    ),
    // Pop-in floating 3D speech bubble & staggered bobbing dots
    createSmoothTrack('TalkBubble.scale[x]', [0, 0.4, 0.8, 1.2, 1.6], [1, 1.07, 0.96, 1.05, 1]),
    createSmoothTrack('TalkBubble.scale[y]', [0, 0.4, 0.8, 1.2, 1.6], [1, 1.07, 0.96, 1.05, 1]),
    createSmoothTrack('TalkBubble.scale[z]', [0, 0.4, 0.8, 1.2, 1.6], [1, 1.07, 0.96, 1.05, 1]),
    createSmoothTrack('TalkBubble.position[y]', [0, 0.8, 1.6], [1.66, 1.73, 1.66]),
    createSmoothTrack('TalkDot0.position[y]', [0, 0.25, 0.5, 1.6], [0, 0.04, 0, 0]),
    createSmoothTrack('TalkDot1.position[y]', [0, 0.2, 0.45, 0.7, 1.6], [0, 0, 0.04, 0, 0]),
    createSmoothTrack('TalkDot2.position[y]', [0, 0.4, 0.65, 0.9, 1.6], [0, 0, 0.04, 0, 0]),
  ]);
  talkClip.optimize();

  // 3. WALK CLIP (0.64s loop): jaunty chibi stride, opposite arm swing, energetic step bounce
  const walkClip = new THREE.AnimationClip('walk', 0.64, [
    createSmoothTrack('Body.position[y]', [0, 0.16, 0.32, 0.48, 0.64], [0, 0.068, 0, 0.068, 0]),
    createSmoothTrack('Body.rotation[z]', [0, 0.16, 0.32, 0.48, 0.64], [0, 0.045, 0, -0.045, 0]),
    createSmoothTrack('Body.rotation[y]', [0, 0.16, 0.32, 0.48, 0.64], [0, 0.05, 0, -0.05, 0]),
    createSmoothTrack('Head.rotation[z]', [0, 0.16, 0.32, 0.48, 0.64], [0, -0.04, 0, 0.04, 0]),
    createSmoothTrack('Head.rotation[x]', [0, 0.16, 0.32, 0.48, 0.64], [0.04, 0.09, 0.04, 0.09, 0.04]),
    createSmoothTrack('LeftLeg.rotation[x]', [0, 0.16, 0.32, 0.48, 0.64], [0, 0.55, 0, -0.55, 0]),
    createSmoothTrack('RightLeg.rotation[x]', [0, 0.16, 0.32, 0.48, 0.64], [0, -0.55, 0, 0.55, 0]),
    createSmoothTrack('LeftArm.rotation[x]', [0, 0.16, 0.32, 0.48, 0.64], [0, -0.44, 0, 0.44, 0]),
    createSmoothTrack('RightArm.rotation[x]', [0, 0.16, 0.32, 0.48, 0.64], [0, 0.44, 0, -0.44, 0]),
    createSmoothTrack('LeftArm.rotation[z]', [0, 0.64], [-0.08, -0.08]),
    createSmoothTrack('RightArm.rotation[z]', [0, 0.64], [0.08, 0.08]),
    createSmoothTrack('Mouth.scale[y]', [0, 0.64], [0.76, 0.76]),
    new THREE.NumberKeyframeTrack('TalkBubble.scale[x]', [0, 0.64], [0.001, 0.001]),
    new THREE.NumberKeyframeTrack('TalkBubble.scale[y]', [0, 0.64], [0.001, 0.001]),
    new THREE.NumberKeyframeTrack('TalkBubble.scale[z]', [0, 0.64], [0.001, 0.001]),
  ]);
  walkClip.optimize();

  // 4. WAVE CLIP (1.4s loop): raised right hand waving hello, joyful bounce, wide happy smile
  const waveClip = new THREE.AnimationClip('wave', 1.4, [
    createSmoothTrack('Body.position[y]', [0, 0.35, 0.7, 1.05, 1.4], [0, 0.085, 0.01, 0.085, 0]),
    createSmoothTrack('Body.rotation[z]', [0, 0.35, 0.7, 1.05, 1.4], [-0.04, -0.08, -0.03, -0.08, -0.04]),
    createSmoothTrack('Head.rotation[z]', [0, 0.35, 0.7, 1.05, 1.4], [0.08, 0.14, 0.06, 0.14, 0.08]),
    createSmoothTrack('Head.rotation[x]', [0, 0.7, 1.4], [-0.04, 0.04, -0.04]),
    createSmoothTrack('RightArm.rotation[z]', [0, 0.22, 0.48, 0.74, 1.0, 1.24, 1.4], [2.35, 2.72, 2.15, 2.72, 2.15, 2.65, 2.35]),
    createSmoothTrack('RightArm.rotation[x]', [0, 0.7, 1.4], [-0.28, -0.34, -0.28]),
    createSmoothTrack('LeftArm.rotation[z]', [0, 0.7, 1.4], [-0.22, -0.32, -0.22]),
    createSmoothTrack('LeftArm.rotation[x]', [0, 0.7, 1.4], [0.1, 0.16, 0.1]),
    createSmoothTrack('LeftLeg.rotation[x]', [0, 1.4], [0, 0]),
    createSmoothTrack('RightLeg.rotation[x]', [0, 1.4], [0, 0]),
    createSmoothTrack('Mouth.scale[y]', [0, 0.35, 0.7, 1.05, 1.4], [1.18, 1.38, 1.15, 1.38, 1.18]),
    new THREE.NumberKeyframeTrack('TalkBubble.scale[x]', [0, 1.4], [0.001, 0.001]),
    new THREE.NumberKeyframeTrack('TalkBubble.scale[y]', [0, 1.4], [0.001, 0.001]),
    new THREE.NumberKeyframeTrack('TalkBubble.scale[z]', [0, 1.4], [0.001, 0.001]),
  ]);
  waveClip.optimize();

  sharedClips = {
    idle: idleClip,
    talk: talkClip,
    walk: walkClip,
    wave: waveClip,
  };
  return sharedClips;
}

function getHeartBlushTexture(): THREE.CanvasTexture {
  if (sharedHeartBlushTex) return sharedHeartBlushTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    const grad = ctx.createRadialGradient(64, 66, 6, 64, 66, 54);
    grad.addColorStop(0, 'rgba(255, 140, 165, 0.55)');
    grad.addColorStop(0.65, 'rgba(255, 140, 165, 0.18)');
    grad.addColorStop(1, 'rgba(255, 140, 165, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    ctx.save();
    ctx.translate(64, 64);
    ctx.fillStyle = '#FF7E98';
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(-22, -2, -26, -22, -10, -24);
    ctx.bezierCurveTo(-2, -25, 0, -16, 0, -14);
    ctx.bezierCurveTo(0, -16, 2, -25, 10, -24);
    ctx.bezierCurveTo(26, -22, 22, -2, 0, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedHeartBlushTex = tex;
  return tex;
}

function getKnitTexture(): THREE.CanvasTexture {
  if (sharedKnitTex) return sharedKnitTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#F5BAC6';
    ctx.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 8) {
      ctx.fillStyle = 'rgba(220, 142, 160, 0.25)';
      ctx.fillRect(x, 0, 3, 128);
      ctx.fillStyle = 'rgba(255, 232, 238, 0.28)';
      ctx.fillRect(x + 3, 0, 2, 128);
    }
    for (let y = 0; y < 128; y += 8) {
      ctx.strokeStyle = 'rgba(210, 130, 148, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  sharedKnitTex = tex;
  return tex;
}

function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedShadowTex) return sharedShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(30, 24, 20, 0.36)');
    grad.addColorStop(0.55, 'rgba(30, 24, 20, 0.16)');
    grad.addColorStop(1, 'rgba(30, 24, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedShadowTex = tex;
  return tex;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawNameplateCanvas(canvas: HTMLCanvasElement, opts: AvatarLabelOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const hasStatus = Boolean(opts.statusText && opts.statusText.trim().length > 0);
  const unread = opts.unreadCount ?? 0;

  if (hasStatus) {
    const bubbleText = opts.statusText!.trim().slice(0, 34);
    ctx.font = '600 22px "Inter", "Segoe UI", system-ui, sans-serif';
    const textW = ctx.measureText(bubbleText).width;
    const bw = Math.min(w - 24, Math.max(150, textW + 38));
    const bx = (w - bw) / 2;
    const by = 8;
    const bh = 44;

    roundRectPath(ctx, bx, by, bw, bh, 18);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.95)';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w / 2 - 8, by + bh);
    ctx.lineTo(w / 2 + 8, by + bh);
    ctx.lineTo(w / 2, by + bh + 9);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bubbleText, w / 2, by + bh / 2 + 1, bw - 24);
  }

  const rawName = opts.displayName.trim() || 'Pilot';
  const shortName = rawName.length > 16 ? `${rawName.slice(0, 15)}…` : rawName;
  const labelText = opts.isSelf ? `${shortName} (Bạn)` : shortName;

  ctx.font = '700 27px "Inter", "Segoe UI", system-ui, sans-serif';
  const nameWidth = ctx.measureText(labelText).width;
  const levelBadgeW = 58;
  const unreadBadgeW = unread > 0 ? 60 : 0;
  const dotArea = 28;
  const padX = 24;
  const plateW = Math.min(
    w - 16,
    Math.max(210, padX * 2 + dotArea + nameWidth + levelBadgeW + unreadBadgeW + 18)
  );
  const plateH = 58;
  const plateX = (w - plateW) / 2;
  const plateY = hasStatus ? 68 : 56;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  roundRectPath(ctx, plateX, plateY, plateW, plateH, 16);
  ctx.fillStyle = opts.isSelf ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
  ctx.fill();
  ctx.restore();

  roundRectPath(ctx, plateX, plateY, plateW, plateH, 16);
  ctx.lineWidth = 3;
  ctx.strokeStyle = opts.isSelf ? '#FF6B00' : opts.isOnline ? '#10B981' : '#CBD5E1';
  ctx.stroke();

  let cursorX = plateX + 20;
  const centerY = plateY + plateH / 2;

  ctx.beginPath();
  ctx.arc(cursorX + 6, centerY, 7, 0, Math.PI * 2);
  ctx.fillStyle = opts.isOnline ? '#10B981' : '#94A3B8';
  ctx.fill();
  cursorX += 24;

  ctx.font = '700 26px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = opts.isSelf ? '#FFFFFF' : '#0F172A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const maxNameW = plateW - (cursorX - plateX) - levelBadgeW - unreadBadgeW - 22;
  ctx.fillText(labelText, cursorX, centerY + 1, maxNameW);
  cursorX += Math.min(nameWidth, maxNameW) + 12;

  roundRectPath(ctx, cursorX, centerY - 15, 48, 30, 8);
  ctx.fillStyle = opts.isSelf ? 'rgba(255, 107, 0, 0.25)' : '#FFF3E8';
  ctx.fill();
  ctx.font = '800 18px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = opts.isSelf ? '#FF9A4D' : '#D94E00';
  ctx.textAlign = 'center';
  ctx.fillText(opts.level, cursorX + 24, centerY + 1);
  cursorX += 56;

  if (unread > 0) {
    roundRectPath(ctx, cursorX, centerY - 15, 48, 30, 10);
    ctx.fillStyle = '#FF6B00';
    ctx.fill();
    ctx.font = '800 18px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(unread > 9 ? '9+' : `+${unread}`, cursorX + 24, centerY + 1);
  }
}

function wrapBubbleLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    // Handle unusually long unbroken tokens
    if (ctx.measureText(word).width > maxWidth) {
      while (word.length > 3 && ctx.measureText(`${word}…`).width > maxWidth) {
        word = word.slice(0, -1);
      }
      word = `${word}…`;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        // Pack remaining words onto the final line with ellipsis if needed
        const rest = [current, ...words.slice(i + 1)].join(' ');
        let finalLine = rest;
        if (ctx.measureText(finalLine).width > maxWidth) {
          while (finalLine.length > 3 && ctx.measureText(`${finalLine}…`).width > maxWidth) {
            finalLine = finalLine.slice(0, -1);
          }
          finalLine = `${finalLine.trimEnd()}…`;
        }
        lines.push(finalLine);
        return lines;
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function drawChatBubbleCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  isSelf: boolean
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const fontSize = 30;
  const lineHeight = 40;
  ctx.font = `700 ${fontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;

  const maxTextW = w - 120;
  const lines = wrapBubbleLines(ctx, text, maxTextW, 3);
  if (lines.length === 0) return;

  const widestLine = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
  const padX = 36;
  const padY = 24;
  const bubbleW = Math.min(w - 32, Math.max(190, widestLine + padX * 2));
  const bubbleH = lines.length * lineHeight + padY * 2;
  const tailH = 22;
  const bubbleX = (w - bubbleW) / 2;
  const bubbleY = h - bubbleH - tailH - 16;

  // Soft elevation shadow
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.24)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundRectPath(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 28);
  ctx.fillStyle = isSelf ? '#FFF7ED' : '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // Bubble outline
  roundRectPath(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 28);
  ctx.lineWidth = 5;
  ctx.strokeStyle = isSelf ? '#FF6B00' : '#0EA5E9';
  ctx.stroke();

  // Comic speech tail pointer centered beneath bubble
  const midX = w / 2;
  const tailTopY = bubbleY + bubbleH - 2;
  ctx.beginPath();
  ctx.moveTo(midX - 18, tailTopY);
  ctx.lineTo(midX + 18, tailTopY);
  ctx.lineTo(midX, tailTopY + tailH);
  ctx.closePath();
  ctx.fillStyle = isSelf ? '#FFF7ED' : '#FFFFFF';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(midX - 18, tailTopY + 1);
  ctx.lineTo(midX, tailTopY + tailH);
  ctx.lineTo(midX + 18, tailTopY + 1);
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = isSelf ? '#FF6B00' : '#0EA5E9';
  ctx.stroke();

  // Crisp wrapped message lines
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const startY = bubbleY + padY + lineHeight / 2;
  lines.forEach((line, idx) => {
    ctx.fillText(line, midX, startY + idx * lineHeight, bubbleW - padX * 1.6);
  });
}

export function createChibiAvatar(params: {
  uid: string;
  gender: ClubAvatarGender;
  label: AvatarLabelOptions;
  initialTimeOffset?: number;
}): ChibiAvatarRig {
  const { uid, gender, label, initialTimeOffset = 0 } = params;
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  root.name = `chibi_${uid}`;
  root.userData.uid = uid;

  // Contact shadow disc grounded just above floor
  const shadowGeo = track(new THREE.CircleGeometry(0.46, 28));
  const shadowMat = track(
    new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.012;
  root.add(shadowMesh);

  // Interactive selection / hover ring on floor
  const ringGeo = track(new THREE.RingGeometry(0.42, 0.52, 36));
  const ringMat = track(
    new THREE.MeshBasicMaterial({
      color: label.isSelf ? 0xff6b00 : 0x38bdf8,
      transparent: true,
      opacity: label.isSelf ? 0.55 : 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.018;
  root.add(selectionRing);

  // Materials (varied roughness delta >= 0.25 for crisp PBR response)
  const skinMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffe4cf,
      roughness: 0.56,
      metalness: 0.02,
    })
  );
  const hairColor = gender === 'male' ? 0x865d4b : 0x996e59;
  const hairMat = track(
    new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.66,
      metalness: 0.04,
    })
  );
  const eyeGlossMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x261510,
      roughness: 0.07,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    })
  );
  const eyeWarmHighlightMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x7b4e3c,
      roughness: 0.2,
      metalness: 0.02,
    })
  );
  const catchlightMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
    })
  );
  const mouthMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd96b75,
      roughness: 0.45,
    })
  );
  const sneakerMat = track(
    new THREE.MeshStandardMaterial({
      color: gender === 'male' ? 0xf8f7f3 : 0xf7f2ea,
      roughness: 0.38,
      metalness: 0.02,
    })
  );
  const soleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2ddd4,
      roughness: 0.72,
    })
  );

  // Body container (animated by AnimationMixer 'Body' tracks)
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'Body';
  root.add(bodyGroup);

  // === LEGS & SNEAKERS (bottom of soles at exact y = 0) ===
  const leftLegPivot = new THREE.Group();
  leftLegPivot.name = 'LeftLeg';
  leftLegPivot.position.set(-0.115, 0.36, 0);
  const rightLegPivot = new THREE.Group();
  rightLegPivot.name = 'RightLeg';
  rightLegPivot.position.set(0.115, 0.36, 0);
  bodyGroup.add(leftLegPivot, rightLegPivot);

  const buildLeg = (pivot: THREE.Group, isMale: boolean) => {
    if (isMale) {
      const trouserMat = track(
        new THREE.MeshStandardMaterial({
          color: 0xa69182,
          roughness: 0.86,
        })
      );
      const legGeo = track(new THREE.CylinderGeometry(0.088, 0.078, 0.26, 16));
      const legMesh = new THREE.Mesh(legGeo, trouserMat);
      legMesh.position.y = -0.13;
      legMesh.castShadow = true;
      pivot.add(legMesh);

      const cuffGeo = track(new THREE.TorusGeometry(0.08, 0.02, 10, 18));
      const cuffMesh = new THREE.Mesh(cuffGeo, trouserMat);
      cuffMesh.rotation.x = Math.PI / 2;
      cuffMesh.position.y = -0.24;
      pivot.add(cuffMesh);
    } else {
      const calfGeo = track(new THREE.CylinderGeometry(0.068, 0.058, 0.24, 16));
      const calfMesh = new THREE.Mesh(calfGeo, skinMat);
      calfMesh.position.y = -0.12;
      calfMesh.castShadow = true;
      pivot.add(calfMesh);

      const sockMat = track(new THREE.MeshStandardMaterial({ color: 0xfbf9f5, roughness: 0.85 }));
      const sockGeo = track(new THREE.CylinderGeometry(0.064, 0.062, 0.07, 14));
      const sockMesh = new THREE.Mesh(sockGeo, sockMat);
      sockMesh.position.y = -0.23;
      pivot.add(sockMesh);
    }

    const soleGeo = track(new THREE.BoxGeometry(0.145, 0.04, 0.22));
    const soleMesh = new THREE.Mesh(soleGeo, soleMat);
    soleMesh.position.set(0, -0.34, 0.032);
    soleMesh.castShadow = true;
    pivot.add(soleMesh);

    const upperGeo = track(new THREE.CapsuleGeometry(0.068, 0.08, 8, 14));
    const upperMesh = new THREE.Mesh(upperGeo, sneakerMat);
    upperMesh.rotation.x = Math.PI / 2;
    upperMesh.scale.set(1.06, 0.98, 0.82);
    upperMesh.position.set(0, -0.295, 0.035);
    upperMesh.castShadow = true;
    pivot.add(upperMesh);

    if (!isMale) {
      const bowMat = track(new THREE.MeshStandardMaterial({ color: 0xf3a9b8, roughness: 0.72 }));
      const bowGeo = track(new THREE.SphereGeometry(0.024, 10, 8));
      const bowL = new THREE.Mesh(bowGeo, bowMat);
      bowL.scale.set(1.3, 0.7, 0.7);
      bowL.position.set(-0.022, -0.258, 0.095);
      const bowR = bowL.clone();
      bowR.position.x = 0.022;
      pivot.add(bowL, bowR);
    }
  };

  buildLeg(leftLegPivot, gender === 'male');
  buildLeg(rightLegPivot, gender === 'male');

  // === TORSO & OUTFIT ===
  if (gender === 'male') {
    const shirtMat = track(new THREE.MeshStandardMaterial({ color: 0xd9e8ef, roughness: 0.82 }));
    const shirtCollarMat = track(new THREE.MeshStandardMaterial({ color: 0xeef6fa, roughness: 0.76 }));
    const buttonMat = track(new THREE.MeshStandardMaterial({ color: 0x9cb4c2, roughness: 0.35 }));
    const waistTrouserMat = track(new THREE.MeshStandardMaterial({ color: 0xa69182, roughness: 0.86 }));

    const pelvisGeo = track(new THREE.CylinderGeometry(0.205, 0.195, 0.15, 18));
    const pelvisMesh = new THREE.Mesh(pelvisGeo, waistTrouserMat);
    pelvisMesh.position.y = 0.42;
    pelvisMesh.castShadow = true;
    bodyGroup.add(pelvisMesh);

    const torsoGeo = track(new THREE.CylinderGeometry(0.195, 0.225, 0.44, 20));
    const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
    torsoMesh.position.y = 0.67;
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    bodyGroup.add(torsoMesh);

    const collarGeo = track(new THREE.ConeGeometry(0.085, 0.12, 4));
    const collarL = new THREE.Mesh(collarGeo, shirtCollarMat);
    collarL.position.set(-0.075, 0.855, 0.14);
    collarL.rotation.set(0.55, 0.3, -2.55);
    const collarR = new THREE.Mesh(collarGeo, shirtCollarMat);
    collarR.position.set(0.075, 0.855, 0.14);
    collarR.rotation.set(0.55, -0.3, 2.55);
    bodyGroup.add(collarL, collarR);

    const placketGeo = track(new THREE.BoxGeometry(0.04, 0.34, 0.02));
    const placket = new THREE.Mesh(placketGeo, shirtCollarMat);
    placket.position.set(0, 0.65, 0.205);
    bodyGroup.add(placket);

    const btnGeo = track(new THREE.SphereGeometry(0.012, 8, 8));
    [0.74, 0.65, 0.56].forEach((by) => {
      const btn = new THREE.Mesh(btnGeo, buttonMat);
      btn.position.set(0, by, 0.218);
      bodyGroup.add(btn);
    });
  } else {
    const knitMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xf6bec9,
        map: getKnitTexture(),
        roughness: 0.88,
      })
    );
    const skirtMat = track(new THREE.MeshStandardMaterial({ color: 0xf4eee5, roughness: 0.82 }));

    const skirtGeo = track(new THREE.CylinderGeometry(0.18, 0.33, 0.34, 24));
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.position.y = 0.45;
    skirtMesh.castShadow = true;
    skirtMesh.receiveShadow = true;
    bodyGroup.add(skirtMesh);

    const pleatGeo = track(new THREE.CylinderGeometry(0.015, 0.028, 0.33, 6));
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const pleat = new THREE.Mesh(pleatGeo, skirtMat);
      pleat.position.set(Math.sin(angle) * 0.235, 0.45, Math.cos(angle) * 0.235);
      pleat.rotation.x = Math.cos(angle) * 0.36;
      pleat.rotation.z = -Math.sin(angle) * 0.36;
      bodyGroup.add(pleat);
    }

    const chestGeo = track(new THREE.CylinderGeometry(0.145, 0.175, 0.12, 18));
    const chestMesh = new THREE.Mesh(chestGeo, skinMat);
    chestMesh.position.y = 0.83;
    bodyGroup.add(chestMesh);

    const knitTorsoGeo = track(new THREE.CylinderGeometry(0.195, 0.185, 0.27, 20));
    const knitTorso = new THREE.Mesh(knitTorsoGeo, knitMat);
    knitTorso.position.y = 0.69;
    knitTorso.castShadow = true;
    bodyGroup.add(knitTorso);

    const offShoulderGeo = track(new THREE.TorusGeometry(0.195, 0.052, 12, 26));
    const offShoulder = new THREE.Mesh(offShoulderGeo, knitMat);
    offShoulder.rotation.x = Math.PI / 2;
    offShoulder.scale.set(1.16, 0.9, 1);
    offShoulder.position.y = 0.77;
    offShoulder.castShadow = true;
    bodyGroup.add(offShoulder);
  }

  // Neck bridge
  const neckGeo = track(new THREE.CylinderGeometry(0.075, 0.088, 0.12, 14));
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.y = 0.91;
  bodyGroup.add(neckMesh);

  // === ARMS (Named pivots for AnimationMixer idle/talk/walk/wave tracks) ===
  const leftArmPivot = new THREE.Group();
  leftArmPivot.name = 'LeftArm';
  leftArmPivot.position.set(-0.245, 0.81, 0);
  const rightArmPivot = new THREE.Group();
  rightArmPivot.name = 'RightArm';
  rightArmPivot.position.set(0.245, 0.81, 0);
  bodyGroup.add(leftArmPivot, rightArmPivot);

  const sleeveMat = track(
    new THREE.MeshStandardMaterial({
      color: gender === 'male' ? 0xd9e8ef : 0xf6bec9,
      map: gender === 'female' ? getKnitTexture() : null,
      roughness: 0.84,
    })
  );

  const buildArm = (pivot: THREE.Group, side: -1 | 1) => {
    const upperGeo = track(new THREE.CapsuleGeometry(0.062, 0.14, 8, 12));
    const upper = new THREE.Mesh(upperGeo, sleeveMat);
    upper.position.set(side * 0.02, -0.09, 0);
    upper.rotation.z = side * 0.18;
    upper.castShadow = true;
    pivot.add(upper);

    const forearmGeo = track(new THREE.CapsuleGeometry(0.048, 0.12, 8, 12));
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.set(side * 0.045, -0.22, 0.02);
    forearm.rotation.z = side * 0.12;
    forearm.castShadow = true;
    pivot.add(forearm);

    const handGeo = track(new THREE.SphereGeometry(0.056, 12, 10));
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.set(side * 0.055, -0.31, 0.03);
    hand.castShadow = true;
    pivot.add(hand);
  };

  buildArm(leftArmPivot, -1);
  buildArm(rightArmPivot, 1);

  // === OVERSIZED CHIBI HEAD & EXPRESSIVE FACE ===
  const headGroup = new THREE.Group();
  headGroup.name = 'Head';
  headGroup.position.set(0, 1.32, 0);
  bodyGroup.add(headGroup);

  const headGeo = track(new THREE.SphereGeometry(0.41, 28, 24));
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.scale.set(1.04, 0.96, 0.98);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  const earGeo = track(new THREE.SphereGeometry(0.072, 12, 10));
  const earL = new THREE.Mesh(earGeo, skinMat);
  earL.position.set(-0.41, -0.03, -0.02);
  earL.scale.set(0.65, 1.0, 0.8);
  const earR = earL.clone();
  earR.position.x = 0.41;
  headGroup.add(earL, earR);

  const noseGeo = track(new THREE.SphereGeometry(0.022, 10, 8));
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.position.set(0, -0.06, 0.405);
  headGroup.add(nose);

  // Glossy oversized anime/chibi eyes (named LeftEye / RightEye for AnimationClip blinking)
  const buildEye = (side: -1 | 1) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.name = side === -1 ? 'LeftEye' : 'RightEye';
    eyeGroup.position.set(side * 0.155, -0.015, 0.348);
    eyeGroup.rotation.y = side * 0.24;

    const irisGeo = track(new THREE.SphereGeometry(0.088, 18, 16));
    const iris = new THREE.Mesh(irisGeo, eyeGlossMat);
    iris.scale.set(0.88, 1.12, 0.46);
    eyeGroup.add(iris);

    const lowerIrisGeo = track(new THREE.SphereGeometry(0.056, 14, 10));
    const lowerIris = new THREE.Mesh(lowerIrisGeo, eyeWarmHighlightMat);
    lowerIris.scale.set(0.88, 0.62, 0.42);
    lowerIris.position.set(0, -0.038, 0.022);
    eyeGroup.add(lowerIris);

    const mainSparkGeo = track(new THREE.SphereGeometry(0.026, 10, 8));
    const mainSpark = new THREE.Mesh(mainSparkGeo, catchlightMat);
    mainSpark.position.set(-0.024, 0.036, 0.038);
    eyeGroup.add(mainSpark);

    const miniSparkGeo = track(new THREE.SphereGeometry(0.013, 8, 8));
    const miniSpark = new THREE.Mesh(miniSparkGeo, catchlightMat);
    miniSpark.position.set(0.024, -0.024, 0.04);
    eyeGroup.add(miniSpark);

    const browGeo = track(new THREE.CapsuleGeometry(0.011, 0.085, 6, 8));
    const brow = new THREE.Mesh(browGeo, hairMat);
    brow.rotation.z = Math.PI / 2 - side * 0.14;
    brow.position.set(0, 0.132, 0.012);
    eyeGroup.add(brow);

    if (gender === 'female') {
      const lashGeo = track(new THREE.CapsuleGeometry(0.011, 0.11, 6, 8));
      const lash = new THREE.Mesh(lashGeo, eyeGlossMat);
      lash.rotation.z = Math.PI / 2 + side * 0.16;
      lash.position.set(side * 0.02, 0.082, 0.022);
      eyeGroup.add(lash);
    }

    headGroup.add(eyeGroup);
  };
  buildEye(-1);
  buildEye(1);

  const blushMat = track(
    new THREE.MeshBasicMaterial({
      map: getHeartBlushTexture(),
      transparent: true,
      depthWrite: false,
    })
  );
  const blushGeo = track(new THREE.PlaneGeometry(0.125, 0.125));
  const blushL = new THREE.Mesh(blushGeo, blushMat);
  blushL.position.set(-0.23, -0.115, 0.345);
  blushL.rotation.y = -0.5;
  const blushR = new THREE.Mesh(blushGeo, blushMat);
  blushR.position.set(0.23, -0.115, 0.345);
  blushR.rotation.y = 0.5;
  headGroup.add(blushL, blushR);

  // Named Mouth mesh animated by Talk clip for lively syllable lip-sync
  const mouthGeo = track(
    new THREE.SphereGeometry(0.055, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55)
  );
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.name = 'Mouth';
  mouth.scale.set(1.15, 0.72, 0.48);
  mouth.position.set(0, -0.145, 0.382);
  headGroup.add(mouth);

  // === SCULPTED CHIBI HAIR (Boy vs Girl) ===
  const hairCapGeo = track(new THREE.SphereGeometry(0.435, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.62));
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.scale.set(1.06, 1.0, 1.04);
  hairCap.position.set(0, 0.03, -0.025);
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  const hairBackGeo = track(new THREE.SphereGeometry(0.415, 20, 16));
  const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
  hairBack.scale.set(1.04, 0.96, 0.85);
  hairBack.position.set(0, -0.02, -0.12);
  hairBack.castShadow = true;
  headGroup.add(hairBack);

  if (gender === 'male') {
    const bangSpec = [
      { x: -0.24, y: 0.21, z: 0.31, rx: 0.25, rz: 0.42, sx: 0.14, sy: 0.22 },
      { x: -0.1, y: 0.24, z: 0.36, rx: 0.18, rz: 0.16, sx: 0.15, sy: 0.24 },
      { x: 0.06, y: 0.24, z: 0.37, rx: 0.18, rz: -0.18, sx: 0.16, sy: 0.25 },
      { x: 0.22, y: 0.21, z: 0.31, rx: 0.26, rz: -0.44, sx: 0.14, sy: 0.21 },
    ];
    bangSpec.forEach((b) => {
      const geo = track(new THREE.ConeGeometry(b.sx, b.sy, 8));
      const mesh = new THREE.Mesh(geo, hairMat);
      mesh.position.set(b.x, b.y, b.z);
      mesh.rotation.set(Math.PI + b.rx, 0, b.rz);
      mesh.castShadow = true;
      headGroup.add(mesh);
    });

    const sideLockGeo = track(new THREE.CapsuleGeometry(0.07, 0.16, 6, 10));
    const sideL = new THREE.Mesh(sideLockGeo, hairMat);
    sideL.position.set(-0.37, 0.04, 0.08);
    sideL.rotation.z = 0.15;
    const sideR = new THREE.Mesh(sideLockGeo, hairMat);
    sideR.position.set(0.37, 0.04, 0.08);
    sideR.rotation.z = -0.15;
    headGroup.add(sideL, sideR);

    const tuftGeo = track(new THREE.SphereGeometry(0.18, 12, 10));
    const tuft = new THREE.Mesh(tuftGeo, hairMat);
    tuft.scale.set(1.4, 0.65, 1.1);
    tuft.position.set(0.04, 0.42, 0.06);
    tuft.rotation.z = -0.2;
    headGroup.add(tuft);
  } else {
    const bangSpec = [
      { x: -0.26, y: 0.19, z: 0.31, rx: 0.24, rz: 0.35, sx: 0.12, sy: 0.22 },
      { x: -0.11, y: 0.24, z: 0.37, rx: 0.16, rz: 0.08, sx: 0.13, sy: 0.22 },
      { x: 0.03, y: 0.25, z: 0.38, rx: 0.14, rz: -0.06, sx: 0.13, sy: 0.22 },
      { x: 0.18, y: 0.22, z: 0.34, rx: 0.22, rz: -0.28, sx: 0.13, sy: 0.22 },
    ];
    bangSpec.forEach((b) => {
      const geo = track(new THREE.ConeGeometry(b.sx, b.sy, 8));
      const mesh = new THREE.Mesh(geo, hairMat);
      mesh.position.set(b.x, b.y, b.z);
      mesh.rotation.set(Math.PI + b.rx, 0, b.rz);
      mesh.castShadow = true;
      headGroup.add(mesh);
    });

    const backWaveGeo = track(new THREE.CapsuleGeometry(0.13, 0.42, 8, 12));
    [-0.28, -0.14, 0, 0.14, 0.28].forEach((hx, idx) => {
      const wave = new THREE.Mesh(backWaveGeo, hairMat);
      const flare = (idx - 2) * 0.09;
      wave.position.set(hx, -0.24, -0.24 + Math.abs(hx) * 0.22);
      wave.rotation.z = -flare;
      wave.rotation.x = 0.14;
      wave.castShadow = true;
      headGroup.add(wave);
    });

    const cheekLockGeo = track(new THREE.CapsuleGeometry(0.085, 0.36, 8, 12));
    const cheekL = new THREE.Mesh(cheekLockGeo, hairMat);
    cheekL.position.set(-0.37, -0.13, 0.12);
    cheekL.rotation.z = -0.12;
    cheekL.castShadow = true;
    const cheekR = new THREE.Mesh(cheekLockGeo, hairMat);
    cheekR.position.set(0.37, -0.13, 0.12);
    cheekR.rotation.z = 0.12;
    cheekR.castShadow = true;
    headGroup.add(cheekL, cheekR);

    const clipMat = track(new THREE.MeshStandardMaterial({ color: 0xf49bb0, roughness: 0.45 }));
    const clipKnotGeo = track(new THREE.SphereGeometry(0.045, 10, 8));
    const clipA = new THREE.Mesh(clipKnotGeo, clipMat);
    clipA.scale.set(1.2, 0.7, 0.7);
    clipA.position.set(0.35, 0.16, 0.24);
    clipA.rotation.set(0.1, -0.6, -0.4);
    headGroup.add(clipA);
  }

  // === 3D FLOATING TALK SPEECH BUBBLE ACCENT (Animated by 'talk' clip) ===
  const talkBubbleGroup = new THREE.Group();
  talkBubbleGroup.name = 'TalkBubble';
  talkBubbleGroup.position.set(0.56, 1.66, 0.12);
  talkBubbleGroup.scale.setScalar(0.001);

  const bubbleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.02,
      emissive: 0xfff4e6,
      emissiveIntensity: 0.22,
    })
  );
  const bubblePillGeo = track(new THREE.CapsuleGeometry(0.11, 0.22, 8, 14));
  const bubblePill = new THREE.Mesh(bubblePillGeo, bubbleMat);
  bubblePill.rotation.z = Math.PI / 2;
  bubblePill.scale.set(1.0, 1.0, 0.55);
  talkBubbleGroup.add(bubblePill);

  const bubbleTailGeo = track(new THREE.ConeGeometry(0.055, 0.11, 8));
  const bubbleTail = new THREE.Mesh(bubbleTailGeo, bubbleMat);
  bubbleTail.position.set(-0.14, -0.1, 0);
  bubbleTail.rotation.z = 2.45;
  talkBubbleGroup.add(bubbleTail);

  const dotMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      roughness: 0.28,
      emissive: 0xff6b00,
      emissiveIntensity: 0.35,
    })
  );
  const dotGeo = track(new THREE.SphereGeometry(0.028, 10, 8));
  [-0.085, 0, 0.085].forEach((dx, idx) => {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.name = `TalkDot${idx}`;
    dot.position.set(dx, 0, 0.065);
    talkBubbleGroup.add(dot);
  });
  root.add(talkBubbleGroup);

  // === LAYER 1 INVISIBLE HIT PROXY FOR FAST, FORGIVING RAYCASTING ===
  const hitGeo = track(new THREE.CylinderGeometry(0.46, 0.42, 1.85, 12));
  const hitMat = track(
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  const hitProxy = new THREE.Mesh(hitGeo, hitMat);
  hitProxy.position.y = 0.925;
  hitProxy.userData.clubUid = uid;
  hitProxy.layers.set(1);
  root.add(hitProxy);

  // === FLOATING HIGH-DPI NAMEPLATE SPRITE ===
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 144;
  drawNameplateCanvas(labelCanvas, label);
  const labelTex = track(new THREE.CanvasTexture(labelCanvas));
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.minFilter = THREE.LinearFilter;

  const spriteMat = track(
    new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: false,
    })
  );
  const nameSprite = new THREE.Sprite(spriteMat);
  nameSprite.scale.set(2.25, 0.64, 1);
  nameSprite.position.set(0, 2.08, 0);
  nameSprite.renderOrder = 20;
  root.add(nameSprite);

  // === FLOATING 3D CHAT MESSAGE SPEECH BUBBLE SPRITE ===
  const chatBubbleCanvas = document.createElement('canvas');
  chatBubbleCanvas.width = 768;
  chatBubbleCanvas.height = 280;
  const chatBubbleTex = track(new THREE.CanvasTexture(chatBubbleCanvas));
  chatBubbleTex.colorSpace = THREE.SRGBColorSpace;
  chatBubbleTex.minFilter = THREE.LinearFilter;

  const chatBubbleMat = track(
    new THREE.SpriteMaterial({
      map: chatBubbleTex,
      transparent: true,
      opacity: 0,
      depthTest: false,
    })
  );
  const chatBubbleSprite = new THREE.Sprite(chatBubbleMat);
  const CHAT_BUBBLE_BASE_W = 2.85;
  const CHAT_BUBBLE_BASE_H = 1.04;
  const CHAT_BUBBLE_BASE_Y = 2.74;
  chatBubbleSprite.scale.set(CHAT_BUBBLE_BASE_W, CHAT_BUBBLE_BASE_H, 1);
  chatBubbleSprite.position.set(0, CHAT_BUBBLE_BASE_Y, 0);
  chatBubbleSprite.renderOrder = 25;
  chatBubbleSprite.visible = false;
  root.add(chatBubbleSprite);

  // === THREE.JS ANIMATION MIXER & CROSSFADING STATE CONTROLLER ===
  const clips = getSharedChibiClips();
  const mixer = new THREE.AnimationMixer(root);
  const actions: Record<ChibiAnimationState, THREE.AnimationAction> = {
    idle: mixer.clipAction(clips.idle),
    talk: mixer.clipAction(clips.talk),
    walk: mixer.clipAction(clips.walk),
    wave: mixer.clipAction(clips.wave),
  };

  Object.values(actions).forEach((action) => {
    action.loop = THREE.LoopRepeat;
  });

  // Start in organic idle with per-avatar phase offset so characters don't breathe in unison
  actions.idle.play();
  actions.idle.time = initialTimeOffset % clips.idle.duration;

  let currentAnimation: ChibiAnimationState = 'idle';

  const setAnimationState = (next: ChibiAnimationState, fadeDuration = 0.26) => {
    if (next === currentAnimation) return;
    const prevAction = actions[currentAnimation];
    const nextAction = actions[next];
    nextAction.reset();
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.play();
    prevAction.crossFadeTo(nextAction, fadeDuration, true);
    currentAnimation = next;
    rig.currentAnimation = next;
  };

  const updateAnimation = (dt: number) => {
    mixer.update(dt);
  };

  const updateLabel = (nextOpts: AvatarLabelOptions) => {
    drawNameplateCanvas(labelCanvas, nextOpts);
    labelTex.needsUpdate = true;
  };

  const setChatBubble = (text: string | null, isSelf: boolean) => {
    if (!text || !text.trim()) {
      chatBubbleSprite.visible = false;
      chatBubbleMat.opacity = 0;
      return;
    }
    drawChatBubbleCanvas(chatBubbleCanvas, text, isSelf);
    chatBubbleTex.needsUpdate = true;
    chatBubbleSprite.visible = true;
  };

  const setChatBubbleVisual = (scaleFactor: number, opacity: number, yOffset = 0) => {
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    const clampedScale = Math.max(0.01, scaleFactor);
    chatBubbleSprite.visible = clampedOpacity > 0.01;
    chatBubbleMat.opacity = clampedOpacity;
    chatBubbleSprite.scale.set(
      CHAT_BUBBLE_BASE_W * clampedScale,
      CHAT_BUBBLE_BASE_H * clampedScale,
      1
    );
    chatBubbleSprite.position.y = CHAT_BUBBLE_BASE_Y + yOffset;
  };

  const setHighlight = (state: 'none' | 'hover' | 'selected' | 'self') => {
    if (state === 'selected') {
      ringMat.color.setHex(0xff6b00);
      ringMat.opacity = 0.92;
      selectionRing.scale.setScalar(1.12);
    } else if (state === 'hover') {
      ringMat.color.setHex(0x38bdf8);
      ringMat.opacity = 0.78;
      selectionRing.scale.setScalar(1.06);
    } else if (state === 'self') {
      ringMat.color.setHex(0x10b981);
      ringMat.opacity = 0.45;
      selectionRing.scale.setScalar(1.0);
    } else {
      ringMat.opacity = 0;
      selectionRing.scale.setScalar(1.0);
    }
  };

  const dispose = () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
    disposables.forEach((d) => d.dispose());
  };

  const rig: ChibiAvatarRig = {
    uid,
    gender,
    root,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    talkBubbleGroup,
    selectionRing,
    hitProxy,
    nameSprite,
    chatBubbleSprite,
    mixer,
    currentAnimation,
    setAnimationState,
    updateAnimation,
    updateLabel,
    setChatBubble,
    setChatBubbleVisual,
    setHighlight,
    dispose,
  };

  return rig;
}
