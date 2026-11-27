import * as THREE from 'three';
import type { EquippedPilotGear } from '../../data/pilotGearCatalog';

export interface PilotRigHandles {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  scarfTail: THREE.Object3D | null;
  companionOrbit: THREE.Group | null;
  companionSpinner: THREE.Object3D | null;
  wingLeft: THREE.Object3D | null;
  wingRight: THREE.Object3D | null;
  jetFlameLeft: THREE.Object3D | null;
  jetFlameRight: THREE.Object3D | null;
  dispose: () => void;
}

function makeRoundedWingShape(length: number, rootWidth: number, tipWidth: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(length, -tipWidth * 0.35);
  s.quadraticCurveTo(length + 0.08, -tipWidth * 0.1, length, tipWidth * 0.55);
  s.lineTo(0, rootWidth);
  s.closePath();
  return s;
}

/**
 * Generates a procedural radial aviation turntable texture for the 3D hangar floor.
 */
export function createHangarPedestalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  // Base dark brushed metallic deck
  const bg = ctx.createRadialGradient(cx, cy, 24, cx, cy, size * 0.5);
  bg.addColorStop(0, '#1B2D47');
  bg.addColorStop(0.65, '#111E33');
  bg.addColorStop(1, '#09111E');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle radial compass rings
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
  ctx.lineWidth = 2;
  for (const r of [90, 155, 212]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Compass degree tick marks around outer perimeter
  for (let deg = 0; deg < 360; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const rIn = isMajor ? 186 : 198;
    const rOut = 212;
    ctx.strokeStyle = isMajor ? 'rgba(255, 133, 36, 0.75)' : 'rgba(148, 163, 184, 0.32)';
    ctx.lineWidth = isMajor ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * rIn, cy + Math.sin(rad) * rIn);
    ctx.lineTo(cx + Math.cos(rad) * rOut, cy + Math.sin(rad) * rOut);
    ctx.stroke();
  }

  // Crosshair runway lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 175, cy);
  ctx.lineTo(cx + 175, cy);
  ctx.moveTo(cx, cy - 175);
  ctx.lineTo(cx, cy + 175);
  ctx.stroke();

  // Outer cockpit-orange dashed caution ring
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.85)';
  ctx.lineWidth = 5;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a soft radial alpha shadow texture to ground the pilot firmly on the pedestal.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 10, cx, cx, cx);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.28)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the composite procedural 3D Pilot Character with all 6 interchangeable gear slots.
 * Bottom-center pivot sits cleanly at y = 0.
 */
export function buildPilotAvatar(equipped: EquippedPilotGear, isSoftwareGl: boolean): PilotRigHandles {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const makeMesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    castShadow = true,
    receiveShadow = true
  ) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !isSoftwareGl && castShadow;
    mesh.receiveShadow = !isSoftwareGl && receiveShadow;
    return mesh;
  };

  // --- Shared Core Materials (high roughness contrast between matte fabric, leather, and brushed metal) ---
  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf4c7a4, roughness: 0.64, metalness: 0.02 })
  );
  const blushMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xee8f82, roughness: 0.75, metalness: 0.0 })
  );
  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.78, metalness: 0.04 })
  );
  const eyeWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.0 })
  );
  const eyeDarkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.1 })
  );
  const goldMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf5c451,
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.5,
    })
  );
  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 })
  );
  const darkMetalMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.34 })
  );
  const bootLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2a1b12, roughness: 0.5, metalness: 0.08 })
  );
  const bootSoleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.05 })
  );

  // --- Suit Palette Selection ---
  let jacketColor = 0x7d4627;
  let jacketRoughness = 0.5;
  let jacketMetalness = 0.08;
  let jacketClearcoat = 0.08;
  let pantsColor = 0x26354a;
  let gloveColor = 0x3a2216;
  let collarColor = 0xf1e3ce;

  if (equipped.suit === 'suit_navy_captain') {
    jacketColor = 0x152647;
    jacketRoughness = 0.74;
    jacketMetalness = 0.05;
    jacketClearcoat = 0;
    pantsColor = 0x101d36;
    gloveColor = 0xe2e8f0;
    collarColor = 0xf8fafc;
  } else if (equipped.suit === 'suit_orange_test') {
    jacketColor = 0xea580c;
    jacketRoughness = 0.52;
    jacketMetalness = 0.12;
    jacketClearcoat = 0.2;
    pantsColor = 0xc2410c;
    gloveColor = 0x1e293b;
    collarColor = 0x1e293b;
  } else if (equipped.suit === 'suit_platinum_ace') {
    jacketColor = 0xe2e8f0;
    jacketRoughness = 0.22;
    jacketMetalness = 0.45;
    jacketClearcoat = 0.85;
    pantsColor = 0x334155;
    gloveColor = 0x0f172a;
    collarColor = 0x38bdf8;
  }

  const jacketMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: jacketColor,
      roughness: jacketRoughness,
      metalness: jacketMetalness,
      clearcoat: jacketClearcoat,
      clearcoatRoughness: 0.2,
    })
  );
  const pantsMat = trackMat(
    new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.82, metalness: 0.04 })
  );
  const gloveMat = trackMat(
    new THREE.MeshStandardMaterial({ color: gloveColor, roughness: 0.56, metalness: 0.1 })
  );
  const collarMat = trackMat(
    new THREE.MeshStandardMaterial({ color: collarColor, roughness: 0.88, metalness: 0.04 })
  );

  // ==================== 1. BOOTS & LEGS (grounded at y = 0) ====================
  const soleGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.07, 0.38));
  const bootUpperGeo = trackGeo(new THREE.CylinderGeometry(0.105, 0.12, 0.28, 16));
  const bootToeGeo = trackGeo(new THREE.SphereGeometry(0.115, 16, 12));
  const legGeo = trackGeo(new THREE.CylinderGeometry(0.115, 0.1, 0.58, 16));
  const kneePadGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.12, 0.06));

  const HIP_PIVOT_Y = 0.92;
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();

  for (const side of [-1, 1]) {
    const legGroup = side === -1 ? leftLeg : rightLeg;
    legGroup.position.set(side * 0.2, HIP_PIVOT_Y, 0);

    // Boot sole sits flush at world y = 0 -> y = 0.07
    const sole = makeMesh(soleGeo, bootSoleMat);
    sole.position.set(0, 0.035 - HIP_PIVOT_Y, 0.04);
    legGroup.add(sole);

    // Rounded boot toe
    const toe = makeMesh(bootToeGeo, bootLeatherMat);
    toe.scale.set(1.0, 0.72, 1.3);
    toe.position.set(0, 0.11 - HIP_PIVOT_Y, 0.11);
    legGroup.add(toe);

    // Boot shaft
    const shaft = makeMesh(bootUpperGeo, bootLeatherMat);
    shaft.position.set(0, 0.21 - HIP_PIVOT_Y, 0);
    legGroup.add(shaft);

    // Metallic boot buckle strap
    const buckle = makeMesh(trackGeo(new THREE.BoxGeometry(0.15, 0.045, 0.05)), goldMat);
    buckle.position.set(0, 0.29 - HIP_PIVOT_Y, 0.1);
    legGroup.add(buckle);

    // Flight trouser leg
    const leg = makeMesh(legGeo, pantsMat);
    leg.position.set(0, 0.62 - HIP_PIVOT_Y, 0);
    legGroup.add(leg);

    // Knee pad accent
    const knee = makeMesh(kneePadGeo, darkMetalMat);
    knee.position.set(0, 0.56 - HIP_PIVOT_Y, 0.095);
    legGroup.add(knee);

    bodyGroup.add(legGroup);
  }

  // ==================== 2. PELVIS & TORSO FLIGHT SUIT ====================
  const pelvis = makeMesh(trackGeo(new THREE.CylinderGeometry(0.31, 0.29, 0.22, 20)), pantsMat);
  pelvis.position.set(0, 0.94, 0);
  bodyGroup.add(pelvis);

  // Tactical belt + brass/gold buckle
  const belt = makeMesh(trackGeo(new THREE.CylinderGeometry(0.325, 0.32, 0.085, 24)), bootLeatherMat);
  belt.position.set(0, 1.04, 0);
  bodyGroup.add(belt);

  const beltBuckle = makeMesh(trackGeo(new THREE.BoxGeometry(0.14, 0.1, 0.06)), goldMat);
  beltBuckle.position.set(0, 1.04, 0.315);
  bodyGroup.add(beltBuckle);

  // Tapered chest / jacket torso
  const torso = makeMesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.31, 0.72, 24)), jacketMat);
  torso.scale.set(1.06, 1, 0.8);
  torso.position.set(0, 1.42, 0);
  bodyGroup.add(torso);

  // Suit-specific hero chest accents
  if (equipped.suit === 'suit_bomber') {
    // Plush shearling collar
    const shearling = makeMesh(trackGeo(new THREE.TorusGeometry(0.24, 0.075, 14, 26)), collarMat);
    shearling.rotation.x = Math.PI / 2;
    shearling.position.set(0, 1.77, 0.02);
    bodyGroup.add(shearling);

    // Metallic front zipper
    const zip = makeMesh(trackGeo(new THREE.BoxGeometry(0.032, 0.66, 0.03)), chromeMat);
    zip.position.set(0, 1.42, 0.285);
    bodyGroup.add(zip);
  } else if (equipped.suit === 'suit_navy_captain') {
    // White shirt V-collar + dark navy tie
    const shirt = makeMesh(trackGeo(new THREE.BoxGeometry(0.22, 0.32, 0.06)), collarMat);
    shirt.position.set(0, 1.62, 0.265);
    bodyGroup.add(shirt);

    const tie = makeMesh(trackGeo(new THREE.BoxGeometry(0.065, 0.38, 0.04)), darkMetalMat);
    tie.position.set(0, 1.54, 0.295);
    bodyGroup.add(tie);

    // Gold epaulettes with captain bars on shoulders
    for (const side of [-1, 1]) {
      const ep = makeMesh(trackGeo(new THREE.BoxGeometry(0.18, 0.04, 0.11)), darkMetalMat);
      ep.position.set(side * 0.33, 1.79, 0);
      ep.rotation.z = -side * 0.15;
      bodyGroup.add(ep);

      const stripe = makeMesh(trackGeo(new THREE.BoxGeometry(0.16, 0.025, 0.12)), goldMat);
      stripe.position.set(side * 0.33, 1.815, 0);
      stripe.rotation.z = -side * 0.15;
      bodyGroup.add(stripe);
    }
  } else if (equipped.suit === 'suit_orange_test') {
    // Dual dark flight harness straps across chest
    for (const side of [-1, 1]) {
      const strap = makeMesh(trackGeo(new THREE.BoxGeometry(0.08, 0.72, 0.56)), darkMetalMat);
      strap.position.set(side * 0.19, 1.42, 0.01);
      bodyGroup.add(strap);
    }
    const chestReg = makeMesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16)), chromeMat);
    chestReg.rotation.x = Math.PI / 2;
    chestReg.position.set(0, 1.5, 0.29);
    bodyGroup.add(chestReg);
  } else if (equipped.suit === 'suit_platinum_ace') {
    // Sculpted chest plate + glowing cyan arc core
    const armor = makeMesh(trackGeo(new THREE.BoxGeometry(0.48, 0.4, 0.12)), jacketMat);
    armor.position.set(0, 1.52, 0.24);
    bodyGroup.add(armor);

    const coreMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.7,
        roughness: 0.15,
      })
    );
    const core = makeMesh(trackGeo(new THREE.OctahedronGeometry(0.085, 0)), coreMat, false, false);
    core.position.set(0, 1.52, 0.31);
    bodyGroup.add(core);
  }

  // Golden Pilot Wing Badge pinned on left chest
  const wingBadge = makeMesh(trackGeo(new THREE.BoxGeometry(0.16, 0.045, 0.025)), goldMat);
  wingBadge.position.set(0.16, 1.58, 0.29);
  bodyGroup.add(wingBadge);
  const badgeStar = makeMesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 6)), goldMat);
  badgeStar.rotation.x = Math.PI / 2;
  badgeStar.position.set(0.16, 1.58, 0.295);
  bodyGroup.add(badgeStar);

  // ==================== 3. ARTICULATED ARMS & GLOVED HANDS ====================
  const buildArm = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.44, 1.7, 0);

    const shoulder = makeMesh(trackGeo(new THREE.SphereGeometry(0.115, 16, 14)), jacketMat);
    pivot.add(shoulder);

    const upperArm = makeMesh(trackGeo(new THREE.CylinderGeometry(0.095, 0.085, 0.34, 14)), jacketMat);
    upperArm.position.set(side * 0.03, -0.18, 0);
    upperArm.rotation.z = side * 0.12;
    pivot.add(upperArm);

    const cuff = makeMesh(trackGeo(new THREE.CylinderGeometry(0.092, 0.092, 0.07, 14)), collarMat);
    cuff.position.set(side * 0.055, -0.37, 0.02);
    pivot.add(cuff);

    const forearm = makeMesh(trackGeo(new THREE.CylinderGeometry(0.082, 0.072, 0.24, 14)), jacketMat);
    forearm.position.set(side * 0.06, -0.49, 0.05);
    forearm.rotation.x = -0.22;
    pivot.add(forearm);

    const hand = makeMesh(trackGeo(new THREE.SphereGeometry(0.09, 14, 12)), gloveMat);
    hand.position.set(side * 0.065, -0.63, 0.08);
    pivot.add(hand);

    return pivot;
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  bodyGroup.add(leftArm, rightArm);

  // ==================== 4. SCARF OR AERO-CAPE ====================
  let scarfTail: THREE.Object3D | null = null;
  const scarfColors: Record<string, { main: number; trim: number; isCape?: boolean }> = {
    scarf_white: { main: 0xf8fafc, trim: 0xcbd5e1 },
    scarf_crimson: { main: 0xdc2626, trim: 0xfb923c },
    scarf_gold: { main: 0xeab308, trim: 0xfef08a },
    scarf_aero_cape: { main: 0x1d4ed8, trim: 0x38bdf8, isCape: true },
  };
  const scarfSpec = scarfColors[equipped.scarf] || scarfColors.scarf_white;
  const scarfMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: scarfSpec.main,
      roughness: equipped.scarf === 'scarf_gold' ? 0.35 : 0.78,
      metalness: equipped.scarf === 'scarf_gold' ? 0.65 : 0.06,
      side: THREE.DoubleSide,
    })
  );

  // Neck wrap
  const neckWrap = makeMesh(trackGeo(new THREE.TorusGeometry(0.21, 0.058, 12, 24)), scarfMat);
  neckWrap.rotation.x = Math.PI / 2;
  neckWrap.position.set(0, 1.81, 0.01);
  bodyGroup.add(neckWrap);

  if (scarfSpec.isCape) {
    const capePivot = new THREE.Group();
    capePivot.position.set(0, 1.78, -0.22);

    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.32, 0);
    capeShape.lineTo(0.32, 0);
    capeShape.quadraticCurveTo(0.46, -0.58, 0.52, -1.16);
    capeShape.lineTo(-0.52, -1.16);
    capeShape.quadraticCurveTo(-0.46, -0.58, -0.32, 0);
    const capeGeo = trackGeo(
      new THREE.ExtrudeGeometry(capeShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01 })
    );
    const capeMesh = makeMesh(capeGeo, scarfMat);
    capeMesh.rotation.x = 0.16;
    capePivot.add(capeMesh);

    const trimGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: scarfSpec.trim,
        emissive: scarfSpec.trim,
        emissiveIntensity: 1.2,
        roughness: 0.2,
      })
    );
    for (const side of [-1, 1]) {
      const strip = makeMesh(trackGeo(new THREE.BoxGeometry(0.035, 1.12, 0.045)), trimGlowMat, false, false);
      strip.position.set(side * 0.4, -0.56, -0.07);
      strip.rotation.z = side * 0.16;
      strip.rotation.x = 0.16;
      capePivot.add(strip);
    }
    bodyGroup.add(capePivot);
    scarfTail = capePivot;
  } else {
    // Flowing aviator scarf tail over right shoulder
    const tailPivot = new THREE.Group();
    tailPivot.position.set(-0.22, 1.79, -0.08);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.18, -0.08, -0.16),
      new THREE.Vector3(-0.34, -0.2, -0.34),
      new THREE.Vector3(-0.5, -0.14, -0.52),
    ]);
    const ribbonGeo = trackGeo(new THREE.TubeGeometry(curve, 16, 0.055, 8, false));
    ribbonGeo.scale(1, 0.42, 1.15);
    const ribbon = makeMesh(ribbonGeo, scarfMat);
    tailPivot.add(ribbon);

    bodyGroup.add(tailPivot);
    scarfTail = tailPivot;
  }

  // ==================== 5. NECK & EXPRESSIVE HEAD ====================
  const neck = makeMesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 16)), skinMat);
  neck.position.set(0, 1.84, 0);
  bodyGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.16, 0);
  bodyGroup.add(headGroup);

  // Stylized warm head sphere
  const headMesh = makeMesh(trackGeo(new THREE.SphereGeometry(0.32, 28, 24)), skinMat);
  headMesh.scale.set(0.98, 1.04, 0.96);
  headGroup.add(headMesh);

  // Ears
  const earGeo = trackGeo(new THREE.SphereGeometry(0.075, 12, 10));
  for (const side of [-1, 1]) {
    const ear = makeMesh(earGeo, skinMat);
    ear.scale.set(0.55, 1.0, 0.8);
    ear.position.set(side * 0.31, -0.01, -0.02);
    headGroup.add(ear);
  }

  // Friendly sculpted nose
  const nose = makeMesh(trackGeo(new THREE.SphereGeometry(0.045, 12, 10)), skinMat);
  nose.position.set(0, -0.02, 0.31);
  headGroup.add(nose);

  // Eyes with sclera, iris/pupil & bright catchlight sparkle
  const eyeScleraGeo = trackGeo(new THREE.SphereGeometry(0.055, 14, 12));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(0.036, 12, 10));
  const catchGeo = trackGeo(new THREE.SphereGeometry(0.013, 8, 8));
  const browGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.024, 0.03));

  for (const side of [-1, 1]) {
    const sclera = makeMesh(eyeScleraGeo, eyeWhiteMat, false, false);
    sclera.position.set(side * 0.115, 0.045, 0.27);
    sclera.scale.set(1, 1.12, 0.55);
    headGroup.add(sclera);

    const pupil = makeMesh(pupilGeo, eyeDarkMat, false, false);
    pupil.position.set(side * 0.115, 0.045, 0.295);
    pupil.scale.set(1, 1.1, 0.5);
    headGroup.add(pupil);

    const catchlight = makeMesh(catchGeo, eyeWhiteMat, false, false);
    catchlight.position.set(side * 0.102, 0.065, 0.314);
    headGroup.add(catchlight);

    const brow = makeMesh(browGeo, hairMat, false, false);
    brow.position.set(side * 0.118, 0.135, 0.28);
    brow.rotation.z = -side * 0.08;
    headGroup.add(brow);

    // Subtle cheek blush
    const cheek = makeMesh(trackGeo(new THREE.SphereGeometry(0.048, 10, 8)), blushMat, false, false);
    cheek.scale.set(1.2, 0.7, 0.3);
    cheek.position.set(side * 0.185, -0.05, 0.255);
    headGroup.add(cheek);
  }

  // Cheerful warm smile
  const smileGeo = trackGeo(new THREE.TorusGeometry(0.075, 0.014, 8, 16, Math.PI));
  const smile = makeMesh(smileGeo, hairMat, false, false);
  smile.position.set(0, -0.095, 0.285);
  smile.rotation.z = Math.PI;
  headGroup.add(smile);

  // Stylized brown hair fringe peeking under helmet
  const hairFringe = makeMesh(trackGeo(new THREE.SphereGeometry(0.095, 12, 10)), hairMat);
  hairFringe.scale.set(1.4, 0.6, 0.7);
  hairFringe.position.set(-0.08, 0.22, 0.25);
  headGroup.add(hairFringe);

  // ==================== 6. INTERCHANGEABLE 3D HELMETS ====================
  if (equipped.helmet === 'helmet_cadet') {
    const capLeatherMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x6b3e24, roughness: 0.56, metalness: 0.06 })
    );
    const dome = makeMesh(
      trackGeo(new THREE.SphereGeometry(0.345, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58)),
      capLeatherMat
    );
    dome.position.set(0, 0.02, -0.01);
    headGroup.add(dome);

    // Ear flaps & brass headset cups
    for (const side of [-1, 1]) {
      const flap = makeMesh(trackGeo(new THREE.BoxGeometry(0.08, 0.22, 0.16)), capLeatherMat);
      flap.position.set(side * 0.33, -0.02, -0.02);
      headGroup.add(flap);

      const cup = makeMesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16)), goldMat);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.37, -0.01, -0.02);
      headGroup.add(cup);
    }
  } else if (equipped.helmet === 'helmet_captain') {
    const capNavyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x132743, roughness: 0.65, metalness: 0.08 })
    );
    const visorGlossMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0x090e18, roughness: 0.1, metalness: 0.15, clearcoat: 1.0 })
    );

    const band = makeMesh(trackGeo(new THREE.CylinderGeometry(0.33, 0.32, 0.12, 24)), capNavyMat);
    band.position.set(0, 0.24, 0);
    headGroup.add(band);

    const crown = makeMesh(trackGeo(new THREE.CylinderGeometry(0.39, 0.33, 0.14, 24)), capNavyMat);
    crown.position.set(0, 0.35, -0.02);
    headGroup.add(crown);

    const goldStrap = makeMesh(trackGeo(new THREE.TorusGeometry(0.328, 0.018, 8, 28)), goldMat);
    goldStrap.rotation.x = Math.PI / 2;
    goldStrap.position.set(0, 0.2, 0.01);
    headGroup.add(goldStrap);

    // Glossy peak brim
    const brim = makeMesh(
      trackGeo(new THREE.CylinderGeometry(0.33, 0.33, 0.025, 20, 1, false, -Math.PI * 0.38, Math.PI * 0.76)),
      visorGlossMat
    );
    brim.position.set(0, 0.19, 0.15);
    brim.rotation.x = 0.14;
    headGroup.add(brim);

    // Golden captain crest
    const crest = makeMesh(trackGeo(new THREE.OctahedronGeometry(0.065, 0)), goldMat);
    crest.scale.set(1.5, 0.9, 0.4);
    crest.position.set(0, 0.3, 0.34);
    headGroup.add(crest);
  } else if (equipped.helmet === 'helmet_jet') {
    const shellMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf1f5f9,
        roughness: 0.14,
        metalness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      })
    );
    const orangeStripeMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0xff6b00, roughness: 0.2, metalness: 0.1, clearcoat: 0.8 })
    );

    const shell = makeMesh(
      trackGeo(new THREE.SphereGeometry(0.375, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.68)),
      shellMat
    );
    shell.position.set(0, 0.02, -0.02);
    headGroup.add(shell);

    // Center cockpit-orange stripe crest
    const stripe = makeMesh(trackGeo(new THREE.BoxGeometry(0.09, 0.12, 0.68)), orangeStripeMat);
    stripe.position.set(0, 0.36, -0.03);
    headGroup.add(stripe);

    // Side comms boom
    const boomCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.36, -0.02, 0),
      new THREE.Vector3(-0.34, -0.1, 0.2),
      new THREE.Vector3(-0.1, -0.12, 0.35),
    ]);
    const boom = makeMesh(trackGeo(new THREE.TubeGeometry(boomCurve, 12, 0.014, 6, false)), darkMetalMat);
    headGroup.add(boom);
  } else if (equipped.helmet === 'helmet_astro') {
    const obsidianMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        roughness: 0.15,
        metalness: 0.65,
        clearcoat: 1.0,
      })
    );
    const haloMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.8,
        roughness: 0.1,
      })
    );

    const shell = makeMesh(
      trackGeo(new THREE.SphereGeometry(0.385, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.66)),
      obsidianMat
    );
    shell.position.set(0, 0.03, -0.02);
    headGroup.add(shell);

    // Gold trim bands & dual antenna fins
    for (const side of [-1, 1]) {
      const fin = makeMesh(trackGeo(new THREE.BoxGeometry(0.035, 0.24, 0.12)), goldMat);
      fin.position.set(side * 0.37, 0.22, -0.08);
      fin.rotation.x = -0.35;
      headGroup.add(fin);
    }

    const halo = makeMesh(trackGeo(new THREE.TorusGeometry(0.42, 0.018, 10, 36)), haloMat, false, false);
    halo.rotation.x = Math.PI / 2 - 0.18;
    halo.position.set(0, 0.42, -0.02);
    headGroup.add(halo);
  }

  // ==================== 7. INTERCHANGEABLE 3D GOGGLES / VISORS ====================
  if (equipped.goggles === 'goggles_classic') {
    const lensMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        roughness: 0.08,
        metalness: 0.25,
        clearcoat: 1.0,
      })
    );
    // Resting stylishly across forehead / brow so eyes remain expressive
    const goggleY = 0.22;
    for (const side of [-1, 1]) {
      const rim = makeMesh(trackGeo(new THREE.TorusGeometry(0.095, 0.022, 10, 22)), goldMat);
      rim.position.set(side * 0.125, goggleY, 0.33);
      rim.rotation.y = side * 0.2;
      headGroup.add(rim);

      const lens = makeMesh(trackGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.02, 20)), lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.rotation.z = -side * 0.2;
      lens.position.set(side * 0.125, goggleY, 0.325);
      headGroup.add(lens);
    }
    const bridge = makeMesh(trackGeo(new THREE.BoxGeometry(0.09, 0.028, 0.03)), darkMetalMat);
    bridge.position.set(0, goggleY, 0.35);
    headGroup.add(bridge);
  } else if (equipped.goggles === 'goggles_aviator_gold') {
    const mirrorGoldMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf59e0b,
        metalness: 0.85,
        roughness: 0.08,
        clearcoat: 1.0,
      })
    );
    for (const side of [-1, 1]) {
      const lens = makeMesh(trackGeo(new THREE.CylinderGeometry(0.095, 0.085, 0.022, 20)), mirrorGoldMat);
      lens.rotation.x = Math.PI / 2;
      lens.scale.set(1.1, 1, 0.88);
      lens.position.set(side * 0.125, 0.045, 0.33);
      headGroup.add(lens);

      const rim = makeMesh(trackGeo(new THREE.TorusGeometry(0.095, 0.012, 8, 20)), goldMat);
      rim.scale.set(1.1, 0.88, 1);
      rim.position.set(side * 0.125, 0.045, 0.335);
      headGroup.add(rim);
    }
    const bar = makeMesh(trackGeo(new THREE.BoxGeometry(0.32, 0.018, 0.018)), goldMat);
    bar.position.set(0, 0.11, 0.34);
    headGroup.add(bar);
  } else if (equipped.goggles === 'goggles_hud_cyan') {
    const hudMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.9,
        roughness: 0.06,
        metalness: 0.15,
        transparent: true,
        opacity: 0.72,
        clearcoat: 1.0,
        depthWrite: false,
      })
    );
    const visor = makeMesh(
      trackGeo(new THREE.CylinderGeometry(0.355, 0.355, 0.14, 28, 1, true, -Math.PI * 0.38, Math.PI * 0.76)),
      hudMat,
      false,
      false
    );
    visor.position.set(0, 0.055, 0.01);
    visor.renderOrder = 4;
    headGroup.add(visor);

    const frame = makeMesh(
      trackGeo(new THREE.TorusGeometry(0.356, 0.015, 8, 28, Math.PI * 0.78)),
      chromeMat
    );
    frame.rotation.x = Math.PI / 2;
    frame.rotation.z = -Math.PI * 0.39 + Math.PI / 2;
    frame.position.set(0, 0.125, 0.01);
    headGroup.add(frame);
  } else if (equipped.goggles === 'goggles_solar_visor') {
    const solarMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xff6b00,
        emissive: 0xea580c,
        emissiveIntensity: 0.55,
        roughness: 0.06,
        metalness: 0.75,
        clearcoat: 1.0,
      })
    );
    const visor = makeMesh(
      trackGeo(new THREE.CylinderGeometry(0.36, 0.35, 0.17, 28, 1, true, -Math.PI * 0.42, Math.PI * 0.84)),
      solarMat
    );
    visor.position.set(0, 0.05, 0.01);
    headGroup.add(visor);

    const brow = makeMesh(trackGeo(new THREE.BoxGeometry(0.46, 0.035, 0.14)), goldMat);
    brow.position.set(0, 0.145, 0.29);
    headGroup.add(brow);
  }

  // ==================== 8. INTERCHANGEABLE BACKPACK / JETPACK / WINGS ====================
  let wingLeft: THREE.Object3D | null = null;
  let wingRight: THREE.Object3D | null = null;
  let jetFlameLeft: THREE.Object3D | null = null;
  let jetFlameRight: THREE.Object3D | null = null;

  if (equipped.backpack === 'backpack_chute') {
    const canvasMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x4d7c5d, roughness: 0.88, metalness: 0.02 })
    );
    const pack = makeMesh(trackGeo(new THREE.BoxGeometry(0.46, 0.56, 0.22)), canvasMat);
    pack.position.set(0, 1.44, -0.35);
    bodyGroup.add(pack);

    for (const yOff of [1.28, 1.56]) {
      const strap = makeMesh(trackGeo(new THREE.BoxGeometry(0.49, 0.055, 0.24)), bootLeatherMat);
      strap.position.set(0, yOff, -0.35);
      bodyGroup.add(strap);
    }
    const ring = makeMesh(trackGeo(new THREE.TorusGeometry(0.055, 0.014, 8, 16)), goldMat);
    ring.position.set(0.14, 1.62, -0.47);
    bodyGroup.add(ring);
  } else if (equipped.backpack === 'backpack_jetpack') {
    const titaniumMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        metalness: 0.9,
        roughness: 0.2,
        clearcoat: 0.4,
      })
    );
    const flameMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 2.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
      })
    );

    const bridge = makeMesh(trackGeo(new THREE.BoxGeometry(0.44, 0.34, 0.14)), darkMetalMat);
    bridge.position.set(0, 1.48, -0.34);
    bodyGroup.add(bridge);

    for (const side of [-1, 1]) {
      const pod = makeMesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.125, 0.56, 18)), titaniumMat);
      pod.position.set(side * 0.21, 1.46, -0.41);
      bodyGroup.add(pod);

      const cap = makeMesh(trackGeo(new THREE.SphereGeometry(0.11, 16, 12)), darkMetalMat);
      cap.position.set(side * 0.21, 1.74, -0.41);
      bodyGroup.add(cap);

      const nozzle = makeMesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.115, 0.14, 16)), darkMetalMat);
      nozzle.position.set(side * 0.21, 1.13, -0.41);
      bodyGroup.add(nozzle);

      const flame = makeMesh(trackGeo(new THREE.ConeGeometry(0.085, 0.26, 14)), flameMat, false, false);
      flame.rotation.x = Math.PI;
      flame.position.set(side * 0.21, 0.94, -0.41);
      bodyGroup.add(flame);

      if (side === -1) jetFlameLeft = flame;
      else jetFlameRight = flame;
    }
  } else if (equipped.backpack === 'backpack_wings') {
    const wingMetalMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf1f5f9,
        metalness: 0.72,
        roughness: 0.2,
        clearcoat: 0.8,
      })
    );
    const strobeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff6b00,
        emissive: 0xff6b00,
        emissiveIntensity: 2.0,
        roughness: 0.15,
      })
    );

    const mount = makeMesh(trackGeo(new THREE.BoxGeometry(0.28, 0.34, 0.14)), darkMetalMat);
    mount.position.set(0, 1.52, -0.32);
    bodyGroup.add(mount);

    const primaryBladeGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeRoundedWingShape(0.95, 0.26, 0.1), {
        depth: 0.035,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
      })
    );
    const lowerBladeGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeRoundedWingShape(0.68, 0.18, 0.07), {
        depth: 0.03,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
      })
    );

    for (const side of [-1, 1]) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.12, 1.56, -0.38);

      const upper = makeMesh(primaryBladeGeo, wingMetalMat);
      upper.scale.x = side;
      upper.rotation.z = side * 0.28;
      upper.rotation.y = -side * 0.24;
      wingPivot.add(upper);

      const lower = makeMesh(lowerBladeGeo, wingMetalMat);
      lower.scale.x = side;
      lower.position.set(0, -0.18, -0.02);
      lower.rotation.z = side * -0.08;
      lower.rotation.y = -side * 0.2;
      wingPivot.add(lower);

      const tipLight = makeMesh(trackGeo(new THREE.SphereGeometry(0.045, 12, 10)), strobeMat, false, false);
      tipLight.position.set(side * 0.92, 0.28, 0.2);
      wingPivot.add(tipLight);

      bodyGroup.add(wingPivot);
      if (side === -1) wingLeft = wingPivot;
      else wingRight = wingPivot;
    }
  }

  // ==================== 9. ORBITING 3D COMPANION ====================
  let companionOrbit: THREE.Group | null = null;
  let companionSpinner: THREE.Object3D | null = null;

  if (equipped.companion !== 'companion_none') {
    companionOrbit = new THREE.Group();
    companionOrbit.position.set(0, 1.95, 0);
    root.add(companionOrbit);

    const petRoot = new THREE.Group();
    petRoot.position.set(1.08, 0.22, 0.15);
    companionOrbit.add(petRoot);

    if (equipped.companion === 'companion_biplane') {
      const planeOrange = trackMat(
        new THREE.MeshPhysicalMaterial({ color: 0xff6b00, roughness: 0.22, metalness: 0.2, clearcoat: 0.85 })
      );
      const fuselage = makeMesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.035, 0.42, 14)), planeOrange);
      fuselage.rotation.x = Math.PI / 2;
      petRoot.add(fuselage);

      const topWing = makeMesh(trackGeo(new THREE.BoxGeometry(0.46, 0.02, 0.12)), goldMat);
      topWing.position.set(0, 0.08, 0.03);
      petRoot.add(topWing);

      const botWing = makeMesh(trackGeo(new THREE.BoxGeometry(0.42, 0.02, 0.11)), planeOrange);
      botWing.position.set(0, -0.04, 0.03);
      petRoot.add(botWing);

      const tail = makeMesh(trackGeo(new THREE.BoxGeometry(0.02, 0.12, 0.1)), goldMat);
      tail.position.set(0, 0.06, -0.18);
      petRoot.add(tail);

      const prop = makeMesh(trackGeo(new THREE.BoxGeometry(0.22, 0.026, 0.015)), chromeMat);
      prop.position.set(0, 0, 0.23);
      petRoot.add(prop);
      companionSpinner = prop;
    } else if (equipped.companion === 'companion_drone') {
      const eyeGlow = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.0,
          roughness: 0.1,
        })
      );
      const hull = makeMesh(trackGeo(new THREE.SphereGeometry(0.13, 18, 14)), darkMetalMat);
      hull.scale.set(1.15, 0.75, 1.15);
      petRoot.add(hull);

      const eye = makeMesh(trackGeo(new THREE.SphereGeometry(0.055, 14, 12)), eyeGlow, false, false);
      eye.position.set(0, 0, 0.12);
      petRoot.add(eye);

      const rotorGroup = new THREE.Group();
      for (const [rx, rz] of [
        [-0.18, -0.18],
        [0.18, -0.18],
        [-0.18, 0.18],
        [0.18, 0.18],
      ]) {
        const arm = makeMesh(trackGeo(new THREE.BoxGeometry(0.22, 0.02, 0.025)), chromeMat);
        arm.position.set(rx * 0.55, 0.03, rz * 0.55);
        arm.rotation.y = Math.atan2(rz, rx);
        petRoot.add(arm);

        const disc = makeMesh(trackGeo(new THREE.TorusGeometry(0.075, 0.012, 8, 16)), eyeGlow, false, false);
        disc.rotation.x = Math.PI / 2;
        disc.position.set(rx, 0.06, rz);
        rotorGroup.add(disc);
      }
      petRoot.add(rotorGroup);
      companionSpinner = rotorGroup;
    } else if (equipped.companion === 'companion_crystal') {
      const gemMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x0ea5e9,
          emissive: 0x0284c7,
          emissiveIntensity: 0.9,
          roughness: 0.08,
          metalness: 0.2,
          clearcoat: 1.0,
        })
      );
      const crystal = makeMesh(trackGeo(new THREE.OctahedronGeometry(0.15, 0)), gemMat, false, false);
      crystal.scale.set(0.85, 1.35, 0.85);
      petRoot.add(crystal);

      const ringGroup = new THREE.Group();
      const ring1 = makeMesh(trackGeo(new THREE.TorusGeometry(0.24, 0.015, 10, 28)), goldMat, false, false);
      ring1.rotation.x = Math.PI / 3;
      const ring2 = makeMesh(trackGeo(new THREE.TorusGeometry(0.29, 0.012, 10, 28)), chromeMat, false, false);
      ring2.rotation.y = Math.PI / 3;
      ringGroup.add(ring1, ring2);
      petRoot.add(ringGroup);
      companionSpinner = ringGroup;
    }
  }

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    scarfTail,
    companionOrbit,
    companionSpinner,
    wingLeft,
    wingRight,
    jetFlameLeft,
    jetFlameRight,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
