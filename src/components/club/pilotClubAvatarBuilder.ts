import * as THREE from 'three';
import {
  DEFAULT_EQUIPPED_GEAR,
  type EquippedPilotGear,
} from '../../data/pilotGearCatalog';
import type { ClubPilotEquipped } from '../../types';
import { buildPilotAvatar } from '../pilot3d/buildPilotAvatar';

export type ClubPilotAnimationState = 'idle' | 'talk' | 'walk' | 'wave';

export interface ClubPilotLabelOptions {
  displayName: string;
  level: string;
  isSelf: boolean;
  isOnline: boolean;
  unreadCount?: number;
  statusText?: string;
}

export const CLUB_PILOT_EMOJIS = ['😊', '👋', '✈️', '⭐', '❤️', '🎉', '🔥', '👏'] as const;

export interface ClubPilotAvatarRig {
  uid: string;
  gearSignature: string;
  root: THREE.Group;
  talkBubbleGroup: THREE.Group;
  hitProxy: THREE.Mesh;
  chatBubbleSprite: THREE.Sprite;
  setAnimationState: (state: ClubPilotAnimationState, fadeSeconds?: number) => void;
  updateAnimation: (dt: number) => void;
  updateLabel: (opts: ClubPilotLabelOptions) => void;
  setChatBubble: (text: string | null, isSelf?: boolean) => void;
  setChatBubbleVisual: (scale: number, opacity: number, yOffset?: number) => void;
  spawnEmojiBurst: (primaryEmoji?: string) => void;
  setHighlight: (state: 'none' | 'hover' | 'selected' | 'self') => void;
  dispose: () => void;
}

export function normalizeClubPilotGear(
  partial?: Partial<ClubPilotEquipped> | null
): EquippedPilotGear {
  return {
    helmet: partial?.helmet || DEFAULT_EQUIPPED_GEAR.helmet,
    goggles: partial?.goggles || DEFAULT_EQUIPPED_GEAR.goggles,
    suit: partial?.suit || DEFAULT_EQUIPPED_GEAR.suit,
    scarf: partial?.scarf || DEFAULT_EQUIPPED_GEAR.scarf,
    backpack: partial?.backpack || DEFAULT_EQUIPPED_GEAR.backpack,
    companion: partial?.companion || DEFAULT_EQUIPPED_GEAR.companion,
    aircraft: 'aircraft_none',
  };
}

export function computePilotGearSignature(partial?: Partial<ClubPilotEquipped> | null): string {
  const g = normalizeClubPilotGear(partial);
  return `${g.helmet}|${g.goggles}|${g.suit}|${g.scarf}|${g.backpack}|${g.companion}`;
}

let sharedShadowTex: THREE.CanvasTexture | null = null;
const sharedEmojiTextureCache = new Map<string, THREE.CanvasTexture>();

function getEmojiSpriteTexture(emoji: string): THREE.CanvasTexture {
  const cached = sharedEmojiTextureCache.get(emoji);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Soft luminous circular halo behind emoji so it pops crisply against both light & dark walls
    const grad = ctx.createRadialGradient(64, 64, 14, 64, 64, 58);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    grad.addColorStop(0.68, 'rgba(255, 247, 237, 0.72)');
    grad.addColorStop(1, 'rgba(255, 247, 237, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    // Subtle crisp ring outline
    ctx.strokeStyle = 'rgba(255, 107, 0, 0.28)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 64, 48, 0, Math.PI * 2);
    ctx.stroke();

    // Centered high-DPI emoji glyph
    ctx.font = '68px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 68);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedEmojiTextureCache.set(emoji, tex);
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
    grad.addColorStop(0, 'rgba(20, 18, 16, 0.38)');
    grad.addColorStop(0.55, 'rgba(20, 18, 16, 0.16)');
    grad.addColorStop(1, 'rgba(20, 18, 16, 0)');
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

function drawNameplateCanvas(canvas: HTMLCanvasElement, opts: ClubPilotLabelOptions): void {
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

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.24)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundRectPath(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 28);
  ctx.fillStyle = isSelf ? '#FFF7ED' : '#FFFFFF';
  ctx.fill();
  ctx.restore();

  roundRectPath(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 28);
  ctx.lineWidth = 5;
  ctx.strokeStyle = isSelf ? '#FF6B00' : '#0EA5E9';
  ctx.stroke();

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

  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const firstLineY = bubbleY + padY + lineHeight / 2;
  lines.forEach((line, idx) => {
    ctx.fillText(line, midX, firstLineY + idx * lineHeight, bubbleW - padX * 1.4);
  });
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Wraps the user's customized 3D Pilot Hangar avatar (buildPilotAvatar) into an
 * interactive 3D English Club character rig with grounded shadows, hit proxy,
 * floating nameplate, 3D speech/chat bubbles, and procedural idle/walk/talk/wave animations.
 */
export function createClubPilotAvatar(params: {
  uid: string;
  pilotEquipped?: Partial<ClubPilotEquipped> | null;
  label: ClubPilotLabelOptions;
  isSoftwareGl?: boolean;
  initialTimeOffset?: number;
}): ClubPilotAvatarRig {
  const { uid, pilotEquipped, label, isSoftwareGl = false, initialTimeOffset = 0 } = params;
  const equipped = normalizeClubPilotGear(pilotEquipped);
  const gearSignature = computePilotGearSignature(pilotEquipped);

  const root = new THREE.Group();
  root.name = `ClubPilotAvatar_${uid}`;

  const extraGeos: THREE.BufferGeometry[] = [];
  const extraMats: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    extraGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    extraMats.push(m);
    return m;
  };

  // 1. Soft ground contact shadow
  const contactShadow = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(1.12, 1.12)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: getContactShadowTexture(),
        transparent: true,
        depthWrite: false,
      })
    )
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.008;
  root.add(contactShadow);

  // 2. Selection / hover / self ring
  const ringMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff6b00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const selectionRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.42, 0.52, 36)),
    ringMat
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.016;
  root.add(selectionRing);

  // 3. Synchronized 3D Pilot Character scaled harmoniously for the lounge room
  const PILOT_CLUB_SCALE = 0.76;
  const pilotRig = buildPilotAvatar(equipped, isSoftwareGl);
  pilotRig.root.scale.setScalar(PILOT_CLUB_SCALE);
  pilotRig.root.position.set(0, 0, 0);
  root.add(pilotRig.root);

  // 4. Floating 3D Speech Indicator Bubble (visible during talk animation)
  const talkBubbleGroup = new THREE.Group();
  talkBubbleGroup.position.set(0.46, 1.98, 0.08);
  talkBubbleGroup.visible = false;

  const bubbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.02,
      emissive: 0xfff7ed,
      emissiveIntensity: 0.25,
    })
  );
  const bubblePill = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.085, 0.14, 8, 16)),
    bubbleMat
  );
  bubblePill.rotation.z = Math.PI / 2;
  bubblePill.scale.set(1, 1, 0.55);
  talkBubbleGroup.add(bubblePill);

  const bubbleTail = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.045, 0.09, 12)), bubbleMat);
  bubbleTail.position.set(-0.08, -0.09, 0);
  bubbleTail.rotation.z = 0.45;
  talkBubbleGroup.add(bubbleTail);

  const dotMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      roughness: 0.35,
      emissive: 0xff6b00,
      emissiveIntensity: 0.35,
    })
  );
  const talkDots: THREE.Mesh[] = [];
  [-0.065, 0, 0.065].forEach((dx) => {
    const dot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.02, 10, 10)), dotMat);
    dot.position.set(dx, 0, 0.052);
    talkBubbleGroup.add(dot);
    talkDots.push(dot);
  });
  root.add(talkBubbleGroup);

  // 5. Invisible Layer-1 Hit Proxy for fast click & hover raycasting
  const hitProxy = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.44, 0.42, 2.02, 12)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false }))
  );
  hitProxy.position.y = 1.01;
  hitProxy.layers.set(1);
  hitProxy.userData.clubUid = uid;
  root.add(hitProxy);

  // 6. Floating High-DPI Nameplate Sprite
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 160;
  drawNameplateCanvas(labelCanvas, label);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.minFilter = THREE.LinearFilter;
  const labelMat = trackMat(
    new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  );
  const labelSprite = new THREE.Sprite(labelMat);
  labelSprite.position.set(0, 2.28, 0);
  labelSprite.scale.set(2.15, 0.67, 1);
  labelSprite.renderOrder = 10;
  root.add(labelSprite);

  // 7. Floating 3D Speech Bubble Sprite for Live Sent/Received Chat Messages
  const CHAT_BUBBLE_BASE_Y = 2.94;
  const CHAT_BUBBLE_BASE_W = 2.7;
  const CHAT_BUBBLE_BASE_H = 1.02;
  const chatCanvas = document.createElement('canvas');
  chatCanvas.width = 768;
  chatCanvas.height = 290;
  const chatTex = new THREE.CanvasTexture(chatCanvas);
  chatTex.colorSpace = THREE.SRGBColorSpace;
  chatTex.minFilter = THREE.LinearFilter;
  const chatMat = trackMat(
    new THREE.SpriteMaterial({
      map: chatTex,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    })
  );
  const chatBubbleSprite = new THREE.Sprite(chatMat);
  chatBubbleSprite.position.set(0, CHAT_BUBBLE_BASE_Y, 0);
  chatBubbleSprite.scale.set(CHAT_BUBBLE_BASE_W, CHAT_BUBBLE_BASE_H, 1);
  chatBubbleSprite.visible = false;
  chatBubbleSprite.renderOrder = 22;
  root.add(chatBubbleSprite);

  // 7b. Pre-allocated Floating 3D Emoji Burst Particle Pool (Zero-GC per frame)
  interface EmojiParticleSlot {
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    active: boolean;
    age: number;
    duration: number;
    startX: number;
    startY: number;
    startZ: number;
    driftX: number;
    driftZ: number;
    riseHeight: number;
    swayAmp: number;
    swayFreq: number;
    swayPhase: number;
    baseScale: number;
  }

  const EMOJI_POOL_SIZE = 10;
  const emojiPool: EmojiParticleSlot[] = [];
  let emojiCursor = 0;

  for (let i = 0; i < EMOJI_POOL_SIZE; i++) {
    const mat = trackMat(
      new THREE.SpriteMaterial({
        map: getEmojiSpriteTexture(CLUB_PILOT_EMOJIS[i % CLUB_PILOT_EMOJIS.length]),
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
      })
    );
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    sprite.renderOrder = 26;
    root.add(sprite);
    emojiPool.push({
      sprite,
      mat,
      active: false,
      age: 0,
      duration: 1.8,
      startX: 0,
      startY: 2.0,
      startZ: 0,
      driftX: 0,
      driftZ: 0,
      riseHeight: 1.3,
      swayAmp: 0.14,
      swayFreq: 3.4,
      swayPhase: 0,
      baseScale: 0.44,
    });
  }

  const spawnEmojiBurst = (primaryEmoji?: string) => {
    const validPrimary =
      primaryEmoji && primaryEmoji.trim().length > 0
        ? primaryEmoji.trim()
        : CLUB_PILOT_EMOJIS[Math.floor(Math.random() * CLUB_PILOT_EMOJIS.length)];

    // Spawn 1 hero emoji + 3 lively companion emojis rising above the 3D Pilot's head
    const burstCount = 4;
    for (let i = 0; i < burstCount; i++) {
      const slot = emojiPool[emojiCursor % EMOJI_POOL_SIZE];
      emojiCursor = (emojiCursor + 1) % EMOJI_POOL_SIZE;

      const isHero = i === 0;
      const emojiChar = isHero
        ? validPrimary
        : CLUB_PILOT_EMOJIS[Math.floor(Math.random() * CLUB_PILOT_EMOJIS.length)];

      slot.mat.map = getEmojiSpriteTexture(emojiChar);
      slot.mat.opacity = 0;
      slot.active = true;
      slot.age = -i * 0.085; // Stagger launch slightly for bubbly organic feel
      slot.duration = isHero ? 2.05 : 1.55 + Math.random() * 0.45;

      const spreadAngle = (i - 1.5) * 0.72 + (Math.random() - 0.5) * 0.35;
      slot.startX = isHero ? 0 : Math.sin(spreadAngle) * 0.34;
      slot.startY = isHero ? 2.08 : 1.94 + Math.random() * 0.18;
      slot.startZ = isHero ? 0.12 : Math.cos(spreadAngle) * 0.18;

      slot.driftX = isHero
        ? (Math.random() - 0.5) * 0.18
        : Math.sin(spreadAngle) * (0.42 + Math.random() * 0.25);
      slot.driftZ = (Math.random() - 0.5) * 0.2;
      slot.riseHeight = isHero ? 1.48 : 1.12 + Math.random() * 0.42;
      slot.swayAmp = isHero ? 0.11 : 0.14 + Math.random() * 0.08;
      slot.swayFreq = 2.8 + Math.random() * 1.8;
      slot.swayPhase = Math.random() * Math.PI * 2;
      slot.baseScale = isHero ? 0.54 : 0.36 + Math.random() * 0.08;

      slot.sprite.position.set(slot.startX, slot.startY, slot.startZ);
      slot.sprite.scale.setScalar(0.01);
      slot.sprite.visible = false;
    }
  };

  // 8. Procedural Articulated Pilot Animation State Machine
  let activeState: ClubPilotAnimationState = 'idle';
  let elapsed = initialTimeOffset;
  let stateTime = 0;

  // Preserve base transforms from buildPilotAvatar
  const baseBodyY = pilotRig.bodyGroup.position.y;
  const baseHeadRotY = pilotRig.headGroup.rotation.y;
  const baseLeftArmZ = pilotRig.leftArm.rotation.z;
  const baseRightArmZ = pilotRig.rightArm.rotation.z;

  const setAnimationState = (nextState: ClubPilotAnimationState, _fadeSeconds = 0.18) => {
    if (nextState === activeState) return;
    activeState = nextState;
    stateTime = 0;
  };

  const updateAnimation = (dt: number) => {
    elapsed += dt;
    stateTime += dt;

    // Target pose variables
    let targetBodyY = baseBodyY;
    let targetBodyRotX = 0;
    let targetBodyRotZ = 0;

    let targetHeadRotX = 0;
    let targetHeadRotY = baseHeadRotY;
    let targetHeadRotZ = 0;

    let targetLeftArmX = 0;
    let targetLeftArmZ = baseLeftArmZ;
    let targetRightArmX = 0;
    let targetRightArmZ = baseRightArmZ;

    let targetLeftLegX = 0;
    let targetRightLegX = 0;

    if (activeState === 'walk') {
      const w = elapsed * 8.6;
      const stride = Math.sin(w);
      const lift = Math.abs(Math.cos(w));

      targetBodyY = baseBodyY + lift * 0.045;
      targetBodyRotX = 0.07;
      targetBodyRotZ = stride * 0.035;

      targetLeftLegX = stride * 0.56;
      targetRightLegX = -stride * 0.56;

      targetLeftArmX = -stride * 0.44;
      targetRightArmX = stride * 0.44;
      targetLeftArmZ = baseLeftArmZ + 0.05;
      targetRightArmZ = baseRightArmZ - 0.05;

      targetHeadRotX = -0.04 + lift * 0.03;
      targetHeadRotY = stride * 0.06;
    } else if (activeState === 'wave') {
      const wavePhase = stateTime * 10.5;
      targetBodyY = baseBodyY + Math.abs(Math.sin(stateTime * 4.5)) * 0.04;
      targetBodyRotZ = -0.05;

      targetHeadRotZ = 0.08 * Math.sin(wavePhase * 0.5);
      targetHeadRotX = -0.06;

      // Raise right arm high & wave hand happily
      targetRightArmX = -0.22;
      targetRightArmZ = 2.48 + Math.sin(wavePhase) * 0.34;

      // Left arm rests on hip/relaxed
      targetLeftArmX = 0.08;
      targetLeftArmZ = baseLeftArmZ - 0.12;
    } else if (activeState === 'talk') {
      const t = elapsed * 4.2;
      targetBodyY = baseBodyY + Math.sin(t * 0.9) * 0.018;
      targetBodyRotX = 0.03;

      // Expressive conversational head nods and hand gestures
      targetHeadRotX = Math.sin(t * 1.45) * 0.08;
      targetHeadRotY = Math.sin(t * 0.7) * 0.14;
      targetHeadRotZ = Math.cos(t * 0.85) * 0.05;

      targetLeftArmX = -0.32 + Math.sin(t * 1.2) * 0.18;
      targetLeftArmZ = baseLeftArmZ - 0.16;
      targetRightArmX = -0.38 + Math.cos(t * 1.35) * 0.22;
      targetRightArmZ = baseRightArmZ + 0.18;
    } else {
      // Relaxed aviator breathing idle
      const idleT = elapsed * 2.1;
      targetBodyY = baseBodyY + Math.sin(idleT) * 0.02;
      targetHeadRotY = Math.sin(elapsed * 0.65) * 0.11;
      targetHeadRotX = Math.sin(elapsed * 1.05) * 0.03;
      targetLeftArmZ = baseLeftArmZ + Math.sin(idleT) * 0.03;
      targetRightArmZ = baseRightArmZ - Math.sin(idleT) * 0.03;
    }

    const blend = activeState === 'walk' ? 14 : 10;
    pilotRig.bodyGroup.position.y = damp(pilotRig.bodyGroup.position.y, targetBodyY, blend, dt);
    pilotRig.bodyGroup.rotation.x = damp(pilotRig.bodyGroup.rotation.x, targetBodyRotX, blend, dt);
    pilotRig.bodyGroup.rotation.z = damp(pilotRig.bodyGroup.rotation.z, targetBodyRotZ, blend, dt);

    pilotRig.headGroup.rotation.x = damp(pilotRig.headGroup.rotation.x, targetHeadRotX, blend, dt);
    pilotRig.headGroup.rotation.y = damp(pilotRig.headGroup.rotation.y, targetHeadRotY, blend, dt);
    pilotRig.headGroup.rotation.z = damp(pilotRig.headGroup.rotation.z, targetHeadRotZ, blend, dt);

    pilotRig.leftArm.rotation.x = damp(pilotRig.leftArm.rotation.x, targetLeftArmX, blend, dt);
    pilotRig.leftArm.rotation.z = damp(pilotRig.leftArm.rotation.z, targetLeftArmZ, blend, dt);
    pilotRig.rightArm.rotation.x = damp(pilotRig.rightArm.rotation.x, targetRightArmX, blend, dt);
    pilotRig.rightArm.rotation.z = damp(pilotRig.rightArm.rotation.z, targetRightArmZ, blend, dt);

    pilotRig.leftLeg.rotation.x = damp(pilotRig.leftLeg.rotation.x, targetLeftLegX, 15, dt);
    pilotRig.rightLeg.rotation.x = damp(pilotRig.rightLeg.rotation.x, targetRightLegX, 15, dt);

    // Live pilot gear animations (scarf flutter, wing flap, jetpack flame flicker, companion orbit)
    if (pilotRig.scarfTail) {
      const windBoost = activeState === 'walk' ? 2.1 : 1.0;
      pilotRig.scarfTail.rotation.x =
        0.16 * windBoost + Math.sin(elapsed * 3.8 * windBoost) * 0.09;
      pilotRig.scarfTail.rotation.y = Math.cos(elapsed * 2.5) * 0.08;
    }

    if (pilotRig.wingLeft && pilotRig.wingRight) {
      const flap = Math.sin(elapsed * (activeState === 'walk' ? 5.2 : 2.6)) * 0.1;
      pilotRig.wingLeft.rotation.y = -0.35 + flap;
      pilotRig.wingRight.rotation.y = Math.PI + 0.35 - flap;
    }

    if (pilotRig.jetFlameLeft && pilotRig.jetFlameRight) {
      const pulse = 0.84 + Math.sin(elapsed * 18) * 0.22;
      pilotRig.jetFlameLeft.scale.set(1, pulse, 1);
      pilotRig.jetFlameRight.scale.set(1, 0.84 + Math.cos(elapsed * 20) * 0.22, 1);
    }

    if (pilotRig.companionOrbit) {
      pilotRig.companionOrbit.rotation.y = elapsed * 0.9;
      pilotRig.companionOrbit.position.y = Math.sin(elapsed * 2.4) * 0.07;
    }

    if (pilotRig.companionSpinner) {
      pilotRig.companionSpinner.rotation.z += dt * 13;
      pilotRig.companionSpinner.rotation.y += dt * 1.8;
    }

    // Smoothly pop in/out the 3D talking speech indicator & bounce its 3 dots
    const targetBubbleScale = activeState === 'talk' ? 1 : 0;
    const nextBubbleScale = damp(talkBubbleGroup.scale.x, targetBubbleScale, 12, dt);
    talkBubbleGroup.scale.setScalar(nextBubbleScale);
    talkBubbleGroup.visible = nextBubbleScale > 0.03;
    if (talkBubbleGroup.visible) {
      talkDots.forEach((dot, idx) => {
        dot.position.y = Math.sin(elapsed * 7.5 + idx * 0.85) * 0.018;
      });
    }

    // Update floating 3D emoji particles above the Pilot's head (zero GC allocations)
    for (let i = 0; i < EMOJI_POOL_SIZE; i++) {
      const p = emojiPool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age < 0) continue; // Stagger delay before pop-in

      const progress = p.age / p.duration;
      if (progress >= 1) {
        p.active = false;
        p.sprite.visible = false;
        p.mat.opacity = 0;
        continue;
      }

      p.sprite.visible = true;
      // Ease-out upward float curve
      const easeOut = 1 - Math.pow(1 - progress, 2.2);
      const sway = Math.sin(p.age * p.swayFreq + p.swayPhase) * p.swayAmp * (0.4 + 0.6 * progress);
      p.sprite.position.set(
        p.startX + p.driftX * easeOut + sway,
        p.startY + p.riseHeight * easeOut,
        p.startZ + p.driftZ * easeOut
      );

      // Pop-in elastic scale + smooth fade-out at top
      let scaleMul = 1;
      if (progress < 0.18) {
        const t = progress / 0.18;
        scaleMul = 0.25 + 0.92 * Math.sin(t * Math.PI * 0.64);
      } else if (progress > 0.72) {
        const t = (progress - 0.72) / 0.28;
        scaleMul = 1 - 0.25 * t;
      }
      p.sprite.scale.setScalar(p.baseScale * scaleMul);

      let alpha = 1;
      if (progress < 0.14) {
        alpha = progress / 0.14;
      } else if (progress > 0.65) {
        alpha = 1 - (progress - 0.65) / 0.35;
      }
      p.mat.opacity = Math.max(0, Math.min(1, alpha));
    }
  };

  let lastLabelSignature = JSON.stringify(label);
  const updateLabel = (next: ClubPilotLabelOptions) => {
    const sig = JSON.stringify(next);
    if (sig === lastLabelSignature) return;
    lastLabelSignature = sig;
    drawNameplateCanvas(labelCanvas, next);
    labelTex.needsUpdate = true;
  };

  let lastChatSignature = '';
  const setChatBubble = (text: string | null, isSelf = false) => {
    const cleaned = text ? text.trim() : '';
    if (!cleaned) {
      chatBubbleSprite.visible = false;
      chatMat.opacity = 0;
      lastChatSignature = '';
      return;
    }
    const sig = `${isSelf ? '1' : '0'}:${cleaned}`;
    if (sig !== lastChatSignature) {
      lastChatSignature = sig;
      drawChatBubbleCanvas(chatCanvas, cleaned, isSelf);
      chatTex.needsUpdate = true;
    }
    chatBubbleSprite.visible = true;
  };

  const setChatBubbleVisual = (scale: number, opacity: number, yOffset = 0) => {
    const safeScale = Math.max(0.01, scale);
    chatBubbleSprite.scale.set(
      CHAT_BUBBLE_BASE_W * safeScale,
      CHAT_BUBBLE_BASE_H * safeScale,
      1
    );
    chatBubbleSprite.position.y = CHAT_BUBBLE_BASE_Y + yOffset;
    chatMat.opacity = Math.max(0, Math.min(1, opacity));
    chatBubbleSprite.visible = opacity > 0.01;
  };

  const setHighlight = (state: 'none' | 'hover' | 'selected' | 'self') => {
    if (state === 'selected') {
      ringMat.color.setHex(0xff6b00);
      ringMat.opacity = 0.88;
    } else if (state === 'hover') {
      ringMat.color.setHex(0x38bdf8);
      ringMat.opacity = 0.75;
    } else if (state === 'self') {
      ringMat.color.setHex(0x10b981);
      ringMat.opacity = 0.52;
    } else {
      ringMat.opacity = 0;
    }
  };

  const dispose = () => {
    pilotRig.dispose();
    labelTex.dispose();
    chatTex.dispose();
    extraGeos.forEach((g) => g.dispose());
    extraMats.forEach((m) => m.dispose());
  };

  return {
    uid,
    gearSignature,
    root,
    talkBubbleGroup,
    hitProxy,
    chatBubbleSprite,
    setAnimationState,
    updateAnimation,
    updateLabel,
    setChatBubble,
    setChatBubbleVisual,
    spawnEmojiBurst,
    setHighlight,
    dispose,
  };
}
