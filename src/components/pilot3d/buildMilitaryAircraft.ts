import * as THREE from 'three';

export interface MilitaryAircraftBuildContext {
  bodyGroup: THREE.Group;
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T;
  trackMat: <T extends THREE.Material>(m: T) => T;
  makeMesh: (geo: THREE.BufferGeometry, mat: THREE.Material, castShadow?: boolean) => THREE.Mesh;
  darkMetal: THREE.Material;
  chromeMetal: THREE.Material;
  rubberMat: THREE.Material;
  afterburners: THREE.Object3D[];
  addNavPair: (parent: THREE.Object3D, x: number, y: number, z: number, r?: number) => void;
  makeSweptWingShape: (span: number, rootChord: number, tipChord: number, sweepBack: number) => THREE.Shape;
  makeTailFinShape: (height: number, baseChord: number, topChord: number, rake: number) => THREE.Shape;
}

export interface MilitaryAircraftBuildResult {
  handled: boolean;
  mainRotor?: THREE.Object3D | null;
  coaxialRotor?: THREE.Object3D | null;
  propeller?: THREE.Object3D | null;
  isHovering?: boolean;
  baseY?: number;
}

const MILITARY_AIRCRAFT_IDS = new Set([
  'aircraft_uav_reaper',
  'aircraft_uav_okhotnik',
  'aircraft_bomber_b2',
  'aircraft_bomber_tu160',
  'aircraft_fighter_f35',
  'aircraft_fighter_sr71',
  'aircraft_fighter_su57',
  'aircraft_fighter_su35',
  'aircraft_fighter_mig31',
  'aircraft_heli_ka52',
]);

export function isMilitaryFleetAircraft(aircraftId: string): boolean {
  return MILITARY_AIRCRAFT_IDS.has(aircraftId);
}

/**
 * Builds 10 unmistakable composite procedural 3D US & Russian military aircraft:
 * - UAV: MQ-9 Reaper (US), S-70 Okhotnik (Russia)
 * - Strategic Bombers: B-2 Spirit (US), Tu-160 Blackjack / White Swan (Russia)
 * - Fighters / Recon: F-35 Lightning II (US), SR-71 Blackbird (US),
 *   Su-57 Felon (Russia), Su-35S Flanker-E (Russia), MiG-31 Foxhound (Russia)
 * - Attack Helicopter: Ka-52 Alligator Coaxial (Russia)
 */
export function buildMilitaryFleetAircraft(
  aircraftId: string,
  ctx: MilitaryAircraftBuildContext
): MilitaryAircraftBuildResult {
  if (!MILITARY_AIRCRAFT_IDS.has(aircraftId)) {
    return { handled: false };
  }

  const {
    bodyGroup,
    trackGeo,
    trackMat,
    makeMesh,
    darkMetal,
    chromeMetal,
    rubberMat,
    afterburners,
    addNavPair,
    makeSweptWingShape,
    makeTailFinShape,
  } = ctx;

  // =========================================================================
  // 1. UAV MQ-9 REAPER (Mỹ) — Bulbous satcom nose, ultra-long wings, V-tail, rear pusher prop
  // =========================================================================
  if (aircraftId === 'aircraft_uav_reaper') {
    const matteGray = trackMat(
      new THREE.MeshStandardMaterial({ color: '#8290A2', roughness: 0.52, metalness: 0.32 })
    );
    const darkGray = trackMat(
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.58, metalness: 0.35 })
    );
    const sensorGlass = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#0EA5E9',
        emissive: '#0284C7',
        emissiveIntensity: 0.9,
        roughness: 0.1,
        metalness: 0.85,
      })
    );

    // Slender fuselage with signature bulbous SATCOM dome forward
    const fusePts = [
      new THREE.Vector2(0.001, -1.65),
      new THREE.Vector2(0.095, -1.52),
      new THREE.Vector2(0.135, -0.4),
      new THREE.Vector2(0.155, 0.55),
      new THREE.Vector2(0.21, 0.98),
      new THREE.Vector2(0.18, 1.32),
      new THREE.Vector2(0.09, 1.56),
      new THREE.Vector2(0.001, 1.66),
    ];
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, 24));
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = makeMesh(fuseGeo, matteGray);
    fuse.scale.set(0.88, 1.05, 1.0);
    fuse.position.set(0, 0.58, 0);
    bodyGroup.add(fuse);

    // Upper SATCOM hump fairing
    const satDome = makeMesh(trackGeo(new THREE.SphereGeometry(0.18, 18, 14)), matteGray);
    satDome.scale.set(0.95, 0.85, 2.35);
    satDome.position.set(0, 0.72, 0.92);
    bodyGroup.add(satDome);

    // Under-chin EO/IR targeting turret ball
    const turret = makeMesh(trackGeo(new THREE.SphereGeometry(0.075, 14, 12)), darkMetal);
    turret.position.set(0, 0.42, 1.12);
    bodyGroup.add(turret);
    const lens = makeMesh(trackGeo(new THREE.SphereGeometry(0.032, 10, 8)), sensorGlass, false);
    lens.position.set(0, 0.41, 1.185);
    bodyGroup.add(lens);

    // Dorsal engine air intake scoop
    const intake = makeMesh(trackGeo(new THREE.BoxGeometry(0.14, 0.1, 0.34)), darkGray);
    intake.position.set(0, 0.72, -0.58);
    bodyGroup.add(intake);

    // Ultra-long high-aspect-ratio thin wings
    const wingShape = makeSweptWingShape(2.18, 0.32, 0.11, 0.24);
    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.026,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.006,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(wingGeo, matteGray);
    rWing.position.set(0.08, 0.56, 0.12);
    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.08;
    bodyGroup.add(rWing, lWing);

    // Underwing pylons + 4 AGM-114 Hellfire tactical pods
    for (const side of [-1, 1]) {
      for (const offset of [0.46, 0.78]) {
        const pylon = makeMesh(trackGeo(new THREE.BoxGeometry(0.028, 0.09, 0.2)), darkGray);
        pylon.position.set(side * offset, 0.5, 0.06);
        bodyGroup.add(pylon);

        const missile = makeMesh(trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.42, 10)), darkMetal);
        missile.rotation.x = Math.PI / 2;
        missile.position.set(side * offset, 0.44, 0.08);
        bodyGroup.add(missile);

        const noseCone = makeMesh(trackGeo(new THREE.ConeGeometry(0.024, 0.07, 10)), chromeMetal);
        noseCone.rotation.x = Math.PI / 2;
        noseCone.position.set(side * offset, 0.44, 0.32);
        bodyGroup.add(noseCone);
      }
    }

    // Iconic angled V-tail + ventral stabilizer fin
    const vTailGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.54, 0.3, 0.1, 0.18), {
        depth: 0.022,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 2,
      })
    );
    vTailGeo.translate(-0.15, 0, -0.011);
    vTailGeo.rotateY(Math.PI / 2);
    for (const side of [-1, 1]) {
      const fin = makeMesh(vTailGeo, matteGray);
      fin.position.set(side * 0.06, 0.62, -1.36);
      fin.rotation.z = side * -0.58;
      bodyGroup.add(fin);
    }
    const ventralFin = makeMesh(trackGeo(new THREE.BoxGeometry(0.024, 0.22, 0.3)), darkGray);
    ventralFin.position.set(0, 0.44, -1.38);
    bodyGroup.add(ventralFin);

    // Rear 3-blade spinning pusher propeller!
    const propGroup = new THREE.Group();
    propGroup.position.set(0, 0.58, -1.68);
    const hub = makeMesh(trackGeo(new THREE.ConeGeometry(0.06, 0.16, 14)), darkMetal);
    hub.rotation.x = -Math.PI / 2;
    propGroup.add(hub);
    const bladeGeo = trackGeo(new THREE.BoxGeometry(0.042, 0.42, 0.012));
    for (let i = 0; i < 3; i++) {
      const holder = new THREE.Group();
      holder.rotation.z = (i / 3) * Math.PI * 2;
      const b = makeMesh(bladeGeo, darkMetal);
      b.position.y = 0.21;
      holder.add(b);
      propGroup.add(holder);
    }
    bodyGroup.add(propGroup);

    // Retractable tricycle gear resting cleanly on y = 0
    const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.062, 0.062, 0.045, 14));
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [gx, gz] of [
      [0, 1.02],
      [-0.28, -0.18],
      [0.28, -0.18],
    ]) {
      const wheel = makeMesh(wheelGeo, rubberMat);
      wheel.position.set(gx, 0.062, gz);
      const strut = makeMesh(trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 8)), chromeMetal);
      strut.position.set(gx, 0.27, gz);
      bodyGroup.add(wheel, strut);
    }

    addNavPair(bodyGroup, 2.24, 0.57, -0.1);
    return { handled: true, propeller: propGroup, isHovering: false, baseY: 0 };
  }

  // =========================================================================
  // 2. UAV TÀNG HÌNH S-70 OKHOTNIK (Nga) — Heavy Russian Stealth Flying-Wing UCAV
  // =========================================================================
  if (aircraftId === 'aircraft_uav_okhotnik') {
    const hullMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#3F4B5B', roughness: 0.48, metalness: 0.55 })
    );
    const pixelAccent = trackMat(
      new THREE.MeshStandardMaterial({ color: '#64748B', roughness: 0.44, metalness: 0.48 })
    );
    const cyanPulse = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        emissive: '#0284C7',
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.88,
        roughness: 0.1,
      })
    );

    // Flying-wing delta planform shape
    const s = new THREE.Shape();
    s.moveTo(0, 1.12);
    s.lineTo(1.78, -0.32);
    s.lineTo(1.52, -0.68);
    s.lineTo(0.66, -0.45);
    s.lineTo(0.32, -0.82);
    s.lineTo(-0.32, -0.82);
    s.lineTo(-0.66, -0.45);
    s.lineTo(-1.52, -0.68);
    s.lineTo(-1.78, -0.32);
    s.closePath();

    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(s, {
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.035,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const wing = makeMesh(wingGeo, hullMat);
    wing.position.set(0, 0.52, 0);
    bodyGroup.add(wing);

    // Blended dorsal avionics spine & recessed intake
    const spine = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.24, 0.95, 10, 18)), pixelAccent);
    spine.rotation.x = Math.PI / 2;
    spine.scale.set(1.25, 0.65, 1.0);
    spine.position.set(0, 0.68, 0.02);
    bodyGroup.add(spine);

    const intake = makeMesh(trackGeo(new THREE.BoxGeometry(0.36, 0.12, 0.28)), darkMetal);
    intake.position.set(0, 0.72, 0.62);
    bodyGroup.add(intake);

    // Digital splinter accents on wings
    for (const side of [-1, 1]) {
      const panel = makeMesh(trackGeo(new THREE.BoxGeometry(0.62, 0.02, 0.24)), pixelAccent);
      panel.position.set(side * 0.88, 0.675, -0.18);
      panel.rotation.y = side * 0.62;
      bodyGroup.add(panel);
    }

    // Flat stealth exhaust nozzle + cyan-blue thruster glow
    const nozzle = makeMesh(trackGeo(new THREE.BoxGeometry(0.42, 0.11, 0.24)), darkMetal);
    nozzle.position.set(0, 0.62, -0.9);
    bodyGroup.add(nozzle);

    const flame = makeMesh(trackGeo(new THREE.ConeGeometry(0.14, 0.58, 12)), cyanPulse, false);
    flame.rotation.x = -Math.PI / 2;
    flame.scale.set(1.45, 1.0, 0.55);
    flame.position.set(0, 0.62, -1.28);
    bodyGroup.add(flame);
    afterburners.push(flame);

    addNavPair(bodyGroup, 1.72, 0.58, -0.36);
    return { handled: true, isHovering: true, baseY: 0.24 };
  }

  // =========================================================================
  // 3. OANH TẠC CƠ TÀNG HÌNH B-2 SPIRIT (Mỹ) — Unmistakable W-Trailing-Edge Stealth Flying Wing
  // =========================================================================
  if (aircraftId === 'aircraft_bomber_b2') {
    const obsidianMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#141B26', roughness: 0.46, metalness: 0.62 })
    );
    const charcoalPanel = trackMat(
      new THREE.MeshStandardMaterial({ color: '#243042', roughness: 0.4, metalness: 0.58 })
    );
    const stealthGlass = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        emissive: '#0C4A6E',
        emissiveIntensity: 0.45,
        roughness: 0.08,
        metalness: 0.92,
      })
    );
    const heatGlow = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FB923C',
        emissive: '#EA580C',
        emissiveIntensity: 1.6,
        transparent: true,
        opacity: 0.82,
        roughness: 0.15,
      })
    );

    // Iconic B-2 Spirit flying wing with exact serrated W-shaped trailing edge!
    const b2Shape = new THREE.Shape();
    b2Shape.moveTo(0, 1.15); // sharp hawk beak nose
    b2Shape.lineTo(2.38, -0.45); // sweeping straight right leading edge
    b2Shape.lineTo(2.16, -0.82); // right wingtip
    b2Shape.lineTo(1.38, -0.42); // sawtooth 1
    b2Shape.lineTo(0.88, -0.86); // sawtooth 2
    b2Shape.lineTo(0.38, -0.56); // sawtooth 3
    b2Shape.lineTo(0, -0.96); // central beaver tail diamond
    b2Shape.lineTo(-0.38, -0.56);
    b2Shape.lineTo(-0.88, -0.86);
    b2Shape.lineTo(-1.38, -0.42);
    b2Shape.lineTo(-2.16, -0.82);
    b2Shape.lineTo(-2.38, -0.45);
    b2Shape.closePath();

    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(b2Shape, {
        depth: 0.11,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const mainWing = makeMesh(wingGeo, obsidianMat);
    mainWing.position.set(0, 0.54, 0.12);
    bodyGroup.add(mainWing);

    // Blended central cockpit dome hump
    const hump = makeMesh(trackGeo(new THREE.SphereGeometry(0.38, 22, 16)), obsidianMat);
    hump.scale.set(1.18, 0.55, 2.35);
    hump.position.set(0, 0.67, 0.22);
    bodyGroup.add(hump);

    // 4-pane angled B-2 stealth flight deck windshield
    for (const side of [-1, 1]) {
      const innerPane = makeMesh(trackGeo(new THREE.BoxGeometry(0.16, 0.065, 0.18)), stealthGlass);
      innerPane.position.set(side * 0.095, 0.78, 0.72);
      innerPane.rotation.x = 0.42;
      innerPane.rotation.y = side * -0.24;
      bodyGroup.add(innerPane);

      const outerPane = makeMesh(trackGeo(new THREE.BoxGeometry(0.14, 0.06, 0.16)), stealthGlass);
      outerPane.position.set(side * 0.23, 0.76, 0.62);
      outerPane.rotation.x = 0.35;
      outerPane.rotation.y = side * -0.62;
      bodyGroup.add(outerPane);

      // Twin dorsal sawtooth engine intake nacelles flanking the cockpit
      const intakePod = makeMesh(trackGeo(new THREE.BoxGeometry(0.32, 0.15, 0.92)), charcoalPanel);
      intakePod.position.set(side * 0.56, 0.69, 0.05);
      bodyGroup.add(intakePod);

      const intakeMouth = makeMesh(trackGeo(new THREE.BoxGeometry(0.28, 0.11, 0.08)), darkMetal);
      intakeMouth.position.set(side * 0.56, 0.69, 0.52);
      bodyGroup.add(intakeMouth);

      // Recessed stealth exhaust trough + subtle heat signature
      const exhaust = makeMesh(trackGeo(new THREE.BoxGeometry(0.3, 0.04, 0.28)), heatGlow, false);
      exhaust.position.set(side * 0.56, 0.67, -0.45);
      bodyGroup.add(exhaust);
      afterburners.push(exhaust);
    }

    addNavPair(bodyGroup, 2.34, 0.6, -0.46);
    return { handled: true, isHovering: true, baseY: 0.25 };
  }

  // =========================================================================
  // 4. OANH TẠC CƠ TU-160 THIÊN NGA TRẮNG (Nga) — Gleaming Anti-Flash White, 4 Afterburners, Cruciform Tail
  // =========================================================================
  if (aircraftId === 'aircraft_bomber_tu160') {
    const swanWhite = trackMat(
      new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.2, metalness: 0.28 })
    );
    const redStarAccent = trackMat(
      new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.3, metalness: 0.25 })
    );
    const cockpitTint = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.08, metalness: 0.92 })
    );
    const flameMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        emissive: '#FF6B00',
        emissiveIntensity: 2.2,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
      })
    );

    // Long slender needle-nose supersonic bomber fuselage
    const fusePts = [
      new THREE.Vector2(0.001, -1.85),
      new THREE.Vector2(0.14, -1.7),
      new THREE.Vector2(0.23, -0.9),
      new THREE.Vector2(0.25, 0.55),
      new THREE.Vector2(0.21, 1.25),
      new THREE.Vector2(0.08, 1.72),
      new THREE.Vector2(0.001, 2.02),
    ];
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, 24));
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = makeMesh(fuseGeo, swanWhite);
    fuselage.scale.set(1.18, 0.78, 1.0);
    fuselage.position.set(0, 0.64, 0);
    bodyGroup.add(fuselage);

    // Sleek dark cockpit glazing
    const cockpit = makeMesh(trackGeo(new THREE.BoxGeometry(0.32, 0.1, 0.36)), cockpitTint);
    cockpit.position.set(0, 0.78, 1.08);
    cockpit.rotation.x = 0.2;
    bodyGroup.add(cockpit);

    // Blended forward wing gloves + long swept variable-geometry wings
    const wingShape = makeSweptWingShape(1.92, 1.12, 0.22, 0.92);
    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.045,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(wingGeo, swanWhite);
    rWing.position.set(0.18, 0.58, 0.22);
    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.18;
    bodyGroup.add(rWing, lWing);

    // Red Russian Aerospace Force trim accents on nose & wingtips
    const noseRing = makeMesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 18)), redStarAccent);
    noseRing.rotation.x = Math.PI / 2;
    noseRing.position.set(0, 0.64, 1.56);
    bodyGroup.add(noseRing);

    // 4 massive NK-32 underwing twin-box turbofan nacelles (2 per side!)
    for (const side of [-1, 1]) {
      const box = makeMesh(trackGeo(new THREE.BoxGeometry(0.34, 0.19, 1.15)), swanWhite);
      box.position.set(side * 0.44, 0.48, -0.32);
      bodyGroup.add(box);

      const intakeFace = makeMesh(trackGeo(new THREE.BoxGeometry(0.32, 0.16, 0.05)), darkMetal);
      intakeFace.position.set(side * 0.44, 0.48, 0.26);
      bodyGroup.add(intakeFace);

      for (const sub of [-0.085, 0.085]) {
        const nx = side * 0.44 + sub;
        const nozzle = makeMesh(trackGeo(new THREE.CylinderGeometry(0.068, 0.08, 0.22, 14)), darkMetal);
        nozzle.rotation.x = Math.PI / 2;
        nozzle.position.set(nx, 0.48, -0.96);
        bodyGroup.add(nozzle);

        const flame = makeMesh(trackGeo(new THREE.ConeGeometry(0.065, 0.52, 12)), flameMat, false);
        flame.rotation.x = -Math.PI / 2;
        flame.position.set(nx, 0.48, -1.26);
        bodyGroup.add(flame);
        afterburners.push(flame);
      }
    }

    // Iconic tall swept cruciform T-tail with mid-mounted horizontal stabilizer
    const vTailGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.86, 0.78, 0.24, 0.46), {
        depth: 0.045,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 2,
      })
    );
    vTailGeo.translate(-0.39, 0, -0.022);
    vTailGeo.rotateY(Math.PI / 2);
    const vTail = makeMesh(vTailGeo, swanWhite);
    vTail.position.set(0, 0.72, -1.42);
    bodyGroup.add(vTail);

    const finStripe = makeMesh(trackGeo(new THREE.BoxGeometry(0.052, 0.12, 0.24)), redStarAccent);
    finStripe.position.set(0, 1.38, -1.58);
    bodyGroup.add(finStripe);

    const hStabShape = makeSweptWingShape(0.68, 0.34, 0.12, 0.26);
    const hStabGeo = trackGeo(new THREE.ExtrudeGeometry(hStabShape, { depth: 0.028, bevelEnabled: false }));
    hStabGeo.rotateX(-Math.PI / 2);
    const rhStab = makeMesh(hStabGeo, swanWhite);
    rhStab.position.set(0.02, 1.12, -1.54);
    const lhStab = rhStab.clone();
    lhStab.scale.x = -1;
    lhStab.position.x = -0.02;
    bodyGroup.add(rhStab, lhStab);

    addNavPair(bodyGroup, 2.08, 0.6, -0.62);
    return { handled: true, isHovering: true, baseY: 0.24 };
  }

  // =========================================================================
  // 5. TIÊM KÍCH TÀNG HÌNH F-35 LIGHTNING II (Mỹ) — Compact Chined Stealth + Single Giant Nozzle
  // =========================================================================
  if (aircraftId === 'aircraft_fighter_f35') {
    const gunmetal = trackMat(
      new THREE.MeshStandardMaterial({ color: '#3B4554', roughness: 0.38, metalness: 0.68 })
    );
    const sawtoothGray = trackMat(
      new THREE.MeshStandardMaterial({ color: '#64748B', roughness: 0.42, metalness: 0.58 })
    );
    const goldCanopy = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        emissive: '#78350F',
        emissiveIntensity: 0.28,
        roughness: 0.08,
        metalness: 0.94,
      })
    );
    const burnerMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FB923C',
        emissive: '#FF6B00',
        emissiveIntensity: 2.3,
        transparent: true,
        opacity: 0.92,
        roughness: 0.1,
      })
    );

    // Chined faceted F-35 fuselage
    const fusePts = [
      new THREE.Vector2(0.001, -1.42),
      new THREE.Vector2(0.24, -1.32),
      new THREE.Vector2(0.36, -0.45),
      new THREE.Vector2(0.38, 0.35),
      new THREE.Vector2(0.26, 0.98),
      new THREE.Vector2(0.11, 1.44),
      new THREE.Vector2(0.001, 1.68),
    ];
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, 6));
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = makeMesh(fuseGeo, gunmetal);
    fuse.scale.set(1.22, 0.64, 1.0);
    fuse.position.set(0, 0.58, 0);
    bodyGroup.add(fuse);

    // Faceted DSI side intakes
    for (const side of [-1, 1]) {
      const intake = makeMesh(trackGeo(new THREE.BoxGeometry(0.22, 0.22, 0.85)), sawtoothGray);
      intake.position.set(side * 0.36, 0.56, 0.24);
      intake.rotation.y = side * -0.1;
      bodyGroup.add(intake);
    }

    // Gold-tinted forward-hinged bubble canopy
    const canopy = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.15, 0.52, 8, 16)), goldCanopy);
    canopy.rotation.x = Math.PI / 2;
    canopy.scale.set(0.95, 1.0, 0.72);
    canopy.position.set(0, 0.77, 0.54);
    bodyGroup.add(canopy);

    // Trapezoidal stealth wings + horizontal tails
    const wingShape = makeSweptWingShape(1.18, 0.96, 0.32, 0.52);
    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.036,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(wingGeo, gunmetal);
    rWing.position.set(0.22, 0.56, 0.05);
    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.22;
    bodyGroup.add(rWing, lWing);

    // Outward-canted twin tails
    const finGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.56, 0.48, 0.16, 0.28), {
        depth: 0.03,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    finGeo.translate(-0.24, 0, -0.015);
    finGeo.rotateY(Math.PI / 2);
    for (const side of [-1, 1]) {
      const fin = makeMesh(finGeo, gunmetal);
      fin.position.set(side * 0.26, 0.64, -1.04);
      fin.rotation.z = side * -0.4;
      bodyGroup.add(fin);
    }

    const stabShape = makeSweptWingShape(0.54, 0.36, 0.12, 0.22);
    const stabGeo = trackGeo(new THREE.ExtrudeGeometry(stabShape, { depth: 0.024, bevelEnabled: false }));
    stabGeo.rotateX(-Math.PI / 2);
    const rStab = makeMesh(stabGeo, sawtoothGray);
    rStab.position.set(0.18, 0.56, -1.02);
    const lStab = rStab.clone();
    lStab.scale.x = -1;
    lStab.position.x = -0.18;
    bodyGroup.add(rStab, lStab);

    // Single massive jagged Pratt & Whitney F135 exhaust nozzle + bright afterburner
    const nozzle = makeMesh(trackGeo(new THREE.CylinderGeometry(0.17, 0.21, 0.26, 12)), darkMetal);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0.57, -1.46);
    bodyGroup.add(nozzle);

    const flame = makeMesh(trackGeo(new THREE.ConeGeometry(0.15, 0.68, 16)), burnerMat, false);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0, 0.57, -1.88);
    bodyGroup.add(flame);
    afterburners.push(flame);

    addNavPair(bodyGroup, 1.38, 0.58, -0.32);
    return { handled: true, isHovering: true, baseY: 0.22 };
  }

  // =========================================================================
  // 6. TRINH SÁT SIÊU THANH SR-71 BLACKBIRD (Mỹ) — Mach 3.3 Jet-Black Chines, J58 Shock Cones, Inward-Canted Tails
  // =========================================================================
  if (aircraftId === 'aircraft_fighter_sr71') {
    const blackbirdMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0B101A', roughness: 0.44, metalness: 0.64 })
    );
    const titaniumAccent = trackMat(
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.36, metalness: 0.78 })
    );
    const redWarningMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.35, metalness: 0.2 })
    );
    const shockDiamondMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#60A5FA',
        emissive: '#3B82F6',
        emissiveIntensity: 2.4,
        transparent: true,
        opacity: 0.92,
        roughness: 0.08,
      })
    );

    // Ultra-long slender Mach 3.3 fuselage
    const fusePts = [
      new THREE.Vector2(0.001, -1.85),
      new THREE.Vector2(0.15, -1.65),
      new THREE.Vector2(0.19, 0.6),
      new THREE.Vector2(0.17, 1.35),
      new THREE.Vector2(0.09, 1.82),
      new THREE.Vector2(0.001, 2.15),
    ];
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, 20));
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = makeMesh(fuseGeo, blackbirdMat);
    fuselage.scale.set(1.05, 0.72, 1.0);
    fuselage.position.set(0, 0.58, 0);
    bodyGroup.add(fuselage);

    // Sweeping razor-flat full-length side chines + delta wing blended into one silhouette
    const chineShape = new THREE.Shape();
    chineShape.moveTo(0, 2.02);
    chineShape.lineTo(0.32, 1.1);
    chineShape.lineTo(0.38, 0.15);
    chineShape.lineTo(1.36, -1.18);
    chineShape.lineTo(1.24, -1.66);
    chineShape.lineTo(0.18, -1.78);
    chineShape.lineTo(0, -1.86);
    chineShape.lineTo(-0.18, -1.78);
    chineShape.lineTo(-1.24, -1.66);
    chineShape.lineTo(-1.36, -1.18);
    chineShape.lineTo(-0.38, 0.15);
    chineShape.lineTo(-0.32, 1.1);
    chineShape.closePath();

    const chineGeo = trackGeo(
      new THREE.ExtrudeGeometry(chineShape, {
        depth: 0.036,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    chineGeo.rotateX(-Math.PI / 2);
    const chineWing = makeMesh(chineGeo, blackbirdMat);
    chineWing.position.set(0, 0.55, 0);
    bodyGroup.add(chineWing);

    // Red tactical "NO STEP" stripes & tandem cockpit windows
    const cockpit = makeMesh(trackGeo(new THREE.BoxGeometry(0.19, 0.09, 0.56)), chromeMetal);
    cockpit.position.set(0, 0.69, 0.88);
    bodyGroup.add(cockpit);

    const dorsalStripe = makeMesh(trackGeo(new THREE.BoxGeometry(0.05, 0.02, 1.6)), redWarningMat);
    dorsalStripe.position.set(0, 0.725, -0.35);
    bodyGroup.add(dorsalStripe);

    // Iconic Twin J58 Engine Nacelles with protruding pointed shock cones + inward-canted vertical rudders!
    const rudderGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.56, 0.52, 0.15, 0.24), {
        depth: 0.026,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.006,
        bevelSegments: 2,
      })
    );
    rudderGeo.translate(-0.26, 0, -0.013);
    rudderGeo.rotateY(Math.PI / 2);

    for (const side of [-1, 1]) {
      const nacelle = makeMesh(trackGeo(new THREE.CylinderGeometry(0.185, 0.19, 1.48, 20)), titaniumAccent);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(side * 0.62, 0.58, -0.82);
      bodyGroup.add(nacelle);

      // Protruding pointed Mach 3.3 inlet shock cone!
      const shockCone = makeMesh(trackGeo(new THREE.ConeGeometry(0.135, 0.44, 16)), blackbirdMat);
      shockCone.rotation.x = Math.PI / 2;
      shockCone.position.set(side * 0.62, 0.58, 0.08);
      bodyGroup.add(shockCone);

      const coneTip = makeMesh(trackGeo(new THREE.ConeGeometry(0.045, 0.14, 12)), chromeMetal);
      coneTip.rotation.x = Math.PI / 2;
      coneTip.position.set(side * 0.62, 0.58, 0.31);
      bodyGroup.add(coneTip);

      // Inward-canted tailfin mounted directly atop each J58 nacelle
      const rudder = makeMesh(rudderGeo, blackbirdMat);
      rudder.position.set(side * 0.62, 0.74, -1.24);
      rudder.rotation.z = side * 0.28; // tilted INWARD!
      bodyGroup.add(rudder);

      const tailStripe = makeMesh(trackGeo(new THREE.BoxGeometry(0.032, 0.06, 0.28)), redWarningMat);
      tailStripe.position.set(side * 0.56, 1.02, -1.28);
      tailStripe.rotation.z = side * 0.28;
      bodyGroup.add(tailStripe);

      // Mach 3.3 blue shock-diamond afterburner plume
      const flame = makeMesh(trackGeo(new THREE.ConeGeometry(0.145, 0.76, 16)), shockDiamondMat, false);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(side * 0.62, 0.58, -1.94);
      bodyGroup.add(flame);
      afterburners.push(flame);
    }

    addNavPair(bodyGroup, 1.32, 0.58, -1.28);
    return { handled: true, isHovering: true, baseY: 0.25 };
  }

  // =========================================================================
  // 7. TIÊM KÍCH TÀNG HÌNH SU-57 FELON (Nga) — Wide Flat Blended Body, Arctic Splinter Camo, LEVCONs
  // =========================================================================
  if (aircraftId === 'aircraft_fighter_su57') {
    const arcticBase = trackMat(
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.38, metalness: 0.56 })
    );
    const splinterIce = trackMat(
      new THREE.MeshStandardMaterial({ color: '#BAE6FD', roughness: 0.34, metalness: 0.42 })
    );
    const darkNavyCamo = trackMat(
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.42, metalness: 0.62 })
    );
    const canopyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.08, metalness: 0.92 })
    );
    const plasmaMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        emissive: '#0EA5E9',
        emissiveIntensity: 2.3,
        transparent: true,
        opacity: 0.92,
        roughness: 0.1,
      })
    );

    // Wide flattened 5th-gen blended body
    const fusePts = [
      new THREE.Vector2(0.001, -1.52),
      new THREE.Vector2(0.28, -1.42),
      new THREE.Vector2(0.42, -0.35),
      new THREE.Vector2(0.36, 0.62),
      new THREE.Vector2(0.18, 1.4),
      new THREE.Vector2(0.001, 1.88),
    ];
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, 8));
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = makeMesh(fuseGeo, arcticBase);
    fuse.scale.set(1.45, 0.48, 1.0);
    fuse.position.set(0, 0.56, 0);
    bodyGroup.add(fuse);

    // White radome tip + arctic pixel splinter camo plates
    const radome = makeMesh(trackGeo(new THREE.ConeGeometry(0.13, 0.52, 16)), splinterIce);
    radome.rotation.x = Math.PI / 2;
    radome.position.set(0, 0.56, 1.66);
    bodyGroup.add(radome);

    const camoSpine = makeMesh(trackGeo(new THREE.BoxGeometry(0.48, 0.03, 1.25)), darkNavyCamo);
    camoSpine.position.set(0, 0.73, -0.25);
    bodyGroup.add(camoSpine);

    const canopy = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.14, 0.62, 8, 16)), canopyMat);
    canopy.rotation.x = Math.PI / 2;
    canopy.scale.set(0.92, 1.0, 0.68);
    canopy.position.set(0, 0.72, 0.64);
    bodyGroup.add(canopy);

    // Signature movable forward LEVCONs + wide stealth trapezoid wings
    const wingShape = makeSweptWingShape(1.42, 1.18, 0.28, 0.74);
    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.032,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(wingGeo, arcticBase);
    rWing.position.set(0.26, 0.54, 0.14);
    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.26;
    bodyGroup.add(rWing, lWing);

    // Digital splinter ice-blue wing accents & LEVCON strakes
    for (const side of [-1, 1]) {
      const levcon = makeMesh(trackGeo(new THREE.BoxGeometry(0.28, 0.025, 0.54)), splinterIce);
      levcon.position.set(side * 0.42, 0.58, 0.68);
      levcon.rotation.y = side * -0.22;
      bodyGroup.add(levcon);

      const splinter = makeMesh(trackGeo(new THREE.BoxGeometry(0.72, 0.02, 0.26)), splinterIce);
      splinter.position.set(side * 0.92, 0.58, -0.18);
      splinter.rotation.y = side * 0.45;
      bodyGroup.add(splinter);
    }

    // Widely-spaced twin thrust-vectoring nacelles + sharply canted compact twin tailfins!
    const finGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.46, 0.42, 0.12, 0.26), {
        depth: 0.026,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.006,
        bevelSegments: 2,
      })
    );
    finGeo.translate(-0.21, 0, -0.013);
    finGeo.rotateY(Math.PI / 2);

    for (const side of [-1, 1]) {
      const pod = makeMesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.16, 1.32, 16)), darkNavyCamo);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 0.36, 0.52, -0.82);
      bodyGroup.add(pod);

      const nozzle = makeMesh(trackGeo(new THREE.CylinderGeometry(0.115, 0.14, 0.26, 16)), darkMetal);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(side * 0.36, 0.52, -1.58);
      bodyGroup.add(nozzle);

      const flame = makeMesh(trackGeo(new THREE.ConeGeometry(0.105, 0.62, 14)), plasmaMat, false);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(side * 0.36, 0.52, -1.98);
      bodyGroup.add(flame);
      afterburners.push(flame);

      const fin = makeMesh(finGeo, arcticBase);
      fin.position.set(side * 0.46, 0.62, -1.16);
      fin.rotation.z = side * -0.58; // sharply canted all-moving Su-57 fins
      bodyGroup.add(fin);
    }

    const stabShape = makeSweptWingShape(0.56, 0.34, 0.12, 0.24);
    const stabGeo = trackGeo(new THREE.ExtrudeGeometry(stabShape, { depth: 0.022, bevelEnabled: false }));
    stabGeo.rotateX(-Math.PI / 2);
    const rStab = makeMesh(stabGeo, arcticBase);
    rStab.position.set(0.38, 0.53, -1.18);
    const lStab = rStab.clone();
    lStab.scale.x = -1;
    lStab.position.x = -0.38;
    bodyGroup.add(rStab, lStab);

    addNavPair(bodyGroup, 1.66, 0.56, -0.42);
    return { handled: true, isHovering: true, baseY: 0.24 };
  }

  // =========================================================================
  // 8. TIÊM KÍCH SIÊU CƠ ĐỘNG SU-35S FLANKER-E (Nga) — Swan-Neck Nose, Sky-Blue Camo, Twin Pods + Tail Sting
  // =========================================================================
  if (aircraftId === 'aircraft_fighter_su35') {
    const flankerBlue = trackMat(
      new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.34, metalness: 0.48 })
    );
    const deepBlue = trackMat(
      new THREE.MeshStandardMaterial({ color: '#1E3A8A', roughness: 0.36, metalness: 0.52 })
    );
    const radomeWhite = trackMat(
      new THREE.MeshStandardMaterial({ color: '#F1F5F9', roughness: 0.28, metalness: 0.2 })
    );
    const canopyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.08, metalness: 0.94 })
    );
    const flameMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FB923C',
        emissive: '#FF6B00',
        emissiveIntensity: 2.3,
        transparent: true,
        opacity: 0.92,
        roughness: 0.1,
      })
    );

    // Classic graceful Flanker swan-neck spine & central tail sting
    const fusePts = [
      new THREE.Vector2(0.001, -1.78),
      new THREE.Vector2(0.11, -1.5),
      new THREE.Vector2(0.24, -0.45),
      new THREE.Vector2(0.28, 0.45),
      new THREE.Vector2(0.22, 1.12),
      new THREE.Vector2(0.1, 1.62),
      new THREE.Vector2(0.001, 1.92),
    ];
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, 20));
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = makeMesh(fuseGeo, flankerBlue);
    fuse.scale.set(1.12, 0.68, 1.0);
    fuse.position.set(0, 0.62, 0);
    bodyGroup.add(fuse);

    // White dielectric nose radome
    const radome = makeMesh(trackGeo(new THREE.ConeGeometry(0.115, 0.48, 16)), radomeWhite);
    radome.rotation.x = Math.PI / 2;
    radome.position.set(0, 0.6, 1.72);
    bodyGroup.add(radome);

    // Raised Flanker bubble canopy
    const canopy = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.135, 0.58, 8, 16)), canopyMat);
    canopy.rotation.x = Math.PI / 2;
    canopy.scale.set(0.9, 1.0, 0.72);
    canopy.position.set(0, 0.78, 0.76);
    bodyGroup.add(canopy);

    // Swept Flanker main wings with wingtip R-77 missile pods
    const wingShape = makeSweptWingShape(1.36, 1.04, 0.24, 0.68);
    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.032,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(wingGeo, flankerBlue);
    rWing.position.set(0.2, 0.56, 0.16);
    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.2;
    bodyGroup.add(rWing, lWing);

    // Twin wide underslung AL-41F1S engine nacelles + tall twin vertical tails
    const finGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.68, 0.52, 0.16, 0.28), {
        depth: 0.028,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    finGeo.translate(-0.26, 0, -0.014);
    finGeo.rotateY(Math.PI / 2);

    for (const side of [-1, 1]) {
      // Deep-blue camo band
      const camo = makeMesh(trackGeo(new THREE.BoxGeometry(0.68, 0.02, 0.3)), deepBlue);
      camo.position.set(side * 0.8, 0.6, -0.14);
      camo.rotation.y = side * 0.46;
      bodyGroup.add(camo);

      // Wingtip missile
      const missile = makeMesh(trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.58, 10)), radomeWhite);
      missile.rotation.x = Math.PI / 2;
      missile.position.set(side * 1.56, 0.57, -0.28);
      bodyGroup.add(missile);

      // Underslung engine nacelle
      const pod = makeMesh(trackGeo(new THREE.CylinderGeometry(0.145, 0.16, 1.58, 16)), deepBlue);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 0.34, 0.48, -0.68);
      bodyGroup.add(pod);

      const nozzle = makeMesh(trackGeo(new THREE.CylinderGeometry(0.115, 0.145, 0.28, 16)), darkMetal);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(side * 0.34, 0.48, -1.56);
      bodyGroup.add(nozzle);

      const flame = makeMesh(trackGeo(new THREE.ConeGeometry(0.11, 0.66, 14)), flameMat, false);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(side * 0.34, 0.48, -1.98);
      bodyGroup.add(flame);
      afterburners.push(flame);

      // Tall twin Flanker vertical stabilizers
      const fin = makeMesh(finGeo, deepBlue);
      fin.position.set(side * 0.38, 0.6, -1.16);
      bodyGroup.add(fin);
    }

    const stabShape = makeSweptWingShape(0.6, 0.36, 0.12, 0.24);
    const stabGeo = trackGeo(new THREE.ExtrudeGeometry(stabShape, { depth: 0.022, bevelEnabled: false }));
    stabGeo.rotateX(-Math.PI / 2);
    const rStab = makeMesh(stabGeo, flankerBlue);
    rStab.position.set(0.36, 0.54, -1.18);
    const lStab = rStab.clone();
    lStab.scale.x = -1;
    lStab.position.x = -0.36;
    bodyGroup.add(rStab, lStab);

    addNavPair(bodyGroup, 1.58, 0.58, -0.32);
    return { handled: true, isHovering: true, baseY: 0.22 };
  }

  // =========================================================================
  // 9. ĐÁNH CHẶN SIÊU THANH MIG-31 FOXHOUND (Nga) — Boxy Rectangular Intakes, Heavy Mach 2.83 Twin Burners
  // =========================================================================
  if (aircraftId === 'aircraft_fighter_mig31') {
    const steelGray = trackMat(
      new THREE.MeshStandardMaterial({ color: '#64748B', roughness: 0.4, metalness: 0.6 })
    );
    const darkSlate = trackMat(
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.42, metalness: 0.66 })
    );
    const redAccent = trackMat(
      new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.35, metalness: 0.25 })
    );
    const canopyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.1, metalness: 0.9 })
    );
    const flameMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FACC15',
        emissive: '#EA580C',
        emissiveIntensity: 2.35,
        transparent: true,
        opacity: 0.92,
        roughness: 0.1,
      })
    );

    // Heavy rectangular interceptor core + sharp long nose cone
    const core = makeMesh(trackGeo(new THREE.BoxGeometry(0.68, 0.34, 2.05)), steelGray);
    core.position.set(0, 0.58, -0.35);
    bodyGroup.add(core);

    const nose = makeMesh(trackGeo(new THREE.ConeGeometry(0.24, 1.28, 16)), steelGray);
    nose.rotation.x = Math.PI / 2;
    nose.scale.set(1.0, 1.0, 0.85);
    nose.position.set(0, 0.58, 1.3);
    bodyGroup.add(nose);

    const noseTip = makeMesh(trackGeo(new THREE.ConeGeometry(0.08, 0.34, 12)), darkSlate);
    noseTip.rotation.x = Math.PI / 2;
    noseTip.position.set(0, 0.58, 1.92);
    bodyGroup.add(noseTip);

    // Signature massive boxy rectangular side intakes!
    for (const side of [-1, 1]) {
      const intakeBox = makeMesh(trackGeo(new THREE.BoxGeometry(0.24, 0.3, 1.62)), darkSlate);
      intakeBox.position.set(side * 0.44, 0.58, -0.18);
      bodyGroup.add(intakeBox);

      const intakeHole = makeMesh(trackGeo(new THREE.BoxGeometry(0.2, 0.24, 0.06)), darkMetal);
      intakeHole.position.set(side * 0.44, 0.58, 0.64);
      bodyGroup.add(intakeHole);
    }

    // Tandem 2-seat heavy interceptor canopy
    const canopy = makeMesh(trackGeo(new THREE.BoxGeometry(0.24, 0.14, 0.78)), canopyMat);
    canopy.position.set(0, 0.78, 0.62);
    bodyGroup.add(canopy);

    // High-mounted cropped-delta swept wings
    const wingShape = makeSweptWingShape(1.16, 0.92, 0.34, 0.54);
    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.032,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(wingGeo, steelGray);
    rWing.position.set(0.5, 0.66, -0.02);
    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.5;
    bodyGroup.add(rWing, lWing);

    // Tall outward-canted twin tails + red interceptor stripes
    const finGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.68, 0.56, 0.2, 0.24), {
        depth: 0.03,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    finGeo.translate(-0.28, 0, -0.015);
    finGeo.rotateY(Math.PI / 2);

    for (const side of [-1, 1]) {
      const fin = makeMesh(finGeo, steelGray);
      fin.position.set(side * 0.42, 0.72, -1.08);
      fin.rotation.z = side * -0.18;
      bodyGroup.add(fin);

      const stripe = makeMesh(trackGeo(new THREE.BoxGeometry(0.036, 0.1, 0.26)), redAccent);
      stripe.position.set(side * 0.48, 1.22, -1.16);
      stripe.rotation.z = side * -0.18;
      bodyGroup.add(stripe);

      // Oversized Mach 2.83 twin D-30F6 nozzles & afterburners!
      const nozzle = makeMesh(trackGeo(new THREE.CylinderGeometry(0.155, 0.185, 0.34, 18)), darkMetal);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(side * 0.22, 0.56, -1.52);
      bodyGroup.add(nozzle);

      const flame = makeMesh(trackGeo(new THREE.ConeGeometry(0.145, 0.76, 14)), flameMat, false);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(side * 0.22, 0.56, -2.02);
      bodyGroup.add(flame);
      afterburners.push(flame);
    }

    const stabShape = makeSweptWingShape(0.56, 0.38, 0.16, 0.24);
    const stabGeo = trackGeo(new THREE.ExtrudeGeometry(stabShape, { depth: 0.024, bevelEnabled: false }));
    stabGeo.rotateX(-Math.PI / 2);
    const rStab = makeMesh(stabGeo, steelGray);
    rStab.position.set(0.38, 0.56, -1.16);
    const lStab = rStab.clone();
    lStab.scale.x = -1;
    lStab.position.x = -0.38;
    bodyGroup.add(rStab, lStab);

    addNavPair(bodyGroup, 1.64, 0.67, -0.38);
    return { handled: true, isHovering: true, baseY: 0.22 };
  }

  // =========================================================================
  // 10. TRỰC THĂNG VŨ TRANG KA-52 ALLIGATOR (Nga) — Counter-Rotating Twin Coaxial Rotors + Rocket Wings!
  // =========================================================================
  const oliveArmor = trackMat(
    new THREE.MeshStandardMaterial({ color: '#2E3A36', roughness: 0.5, metalness: 0.45 })
  );
  const darkArmor = trackMat(
    new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.42, metalness: 0.65 })
  );
  const limeAccent = trackMat(
    new THREE.MeshStandardMaterial({ color: '#84CC16', roughness: 0.36, metalness: 0.35 })
  );
  const armoredGlass = trackMat(
    new THREE.MeshStandardMaterial({ color: '#0F2942', roughness: 0.08, metalness: 0.9 })
  );

  // Armored angular Ka-52 nose & side-by-side hull
  const hull = makeMesh(trackGeo(new THREE.BoxGeometry(0.58, 0.46, 1.38)), oliveArmor);
  hull.position.set(0, 0.58, 0.12);
  bodyGroup.add(hull);

  // Tapered Alligator snout radome + under-nose electro-optical ball
  const snout = makeMesh(trackGeo(new THREE.ConeGeometry(0.32, 0.72, 6)), oliveArmor);
  snout.rotation.x = Math.PI / 2;
  snout.scale.set(1.05, 0.68, 1.0);
  snout.position.set(0, 0.5, 1.12);
  bodyGroup.add(snout);

  const flirBall = makeMesh(trackGeo(new THREE.SphereGeometry(0.11, 14, 12)), darkMetal);
  flirBall.position.set(0, 0.38, 1.18);
  bodyGroup.add(flirBall);

  // Wide side-by-side armored cockpit canopy
  const canopy = makeMesh(trackGeo(new THREE.BoxGeometry(0.52, 0.24, 0.62)), armoredGlass);
  canopy.position.set(0, 0.82, 0.56);
  canopy.rotation.x = 0.24;
  bodyGroup.add(canopy);

  // Twin stub weapon wings + 4 rocket & missile pods
  const stubWing = makeMesh(trackGeo(new THREE.BoxGeometry(1.76, 0.055, 0.34)), oliveArmor);
  stubWing.position.set(0, 0.56, 0.05);
  bodyGroup.add(stubWing);

  for (const side of [-1, 1]) {
    // Side engine turbine fairing
    const enginePod = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.12, 0.52, 8, 12)), darkArmor);
    enginePod.rotation.x = Math.PI / 2;
    enginePod.position.set(side * 0.36, 0.76, -0.05);
    bodyGroup.add(enginePod);

    // 2 underwing weapon pods per side
    for (const wx of [0.54, 0.78]) {
      const rocketPod = makeMesh(trackGeo(new THREE.CylinderGeometry(0.062, 0.062, 0.44, 12)), darkArmor);
      rocketPod.rotation.x = Math.PI / 2;
      rocketPod.position.set(side * wx, 0.46, 0.06);
      bodyGroup.add(rocketPod);

      const podRing = makeMesh(trackGeo(new THREE.TorusGeometry(0.062, 0.012, 8, 14)), limeAccent);
      podRing.position.set(side * wx, 0.46, 0.28);
      bodyGroup.add(podRing);
    }
  }

  // Tapered tail boom with twin-endplate stabilizer (no tail rotor needed for coaxial Ka-52!)
  const boom = makeMesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.2, 1.38, 12)), oliveArmor);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.64, -1.16);
  bodyGroup.add(boom);

  const finGeo = trackGeo(
    new THREE.ExtrudeGeometry(makeTailFinShape(0.46, 0.36, 0.14, 0.16), {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    })
  );
  finGeo.translate(-0.18, 0, -0.02);
  finGeo.rotateY(Math.PI / 2);
  const vFin = makeMesh(finGeo, oliveArmor);
  vFin.position.set(0, 0.66, -1.74);
  bodyGroup.add(vFin);

  const hStab = makeMesh(trackGeo(new THREE.BoxGeometry(0.76, 0.032, 0.18)), darkArmor);
  hStab.position.set(0, 0.68, -1.56);
  bodyGroup.add(hStab);
  for (const side of [-1, 1]) {
    const endplate = makeMesh(trackGeo(new THREE.BoxGeometry(0.028, 0.24, 0.18)), limeAccent);
    endplate.position.set(side * 0.38, 0.68, -1.56);
    bodyGroup.add(endplate);
  }

  // Wheeled landing gear
  const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.072, 0.072, 0.055, 14));
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [gx, gz] of [
    [0, 0.92],
    [-0.36, -0.08],
    [0.36, -0.08],
  ]) {
    const w = makeMesh(wheelGeo, rubberMat);
    w.position.set(gx, 0.09, gz);
    const strut = makeMesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.02, 0.3, 8)), chromeMetal);
    strut.position.set(gx, 0.24, gz);
    bodyGroup.add(w, strut);
  }

  // Iconic Kamov TWIN COAXIAL COUNTER-ROTATING STACKED ROTORS!
  const mast = makeMesh(trackGeo(new THREE.CylinderGeometry(0.052, 0.068, 0.56, 14)), darkMetal);
  mast.position.set(0, 1.15, 0.04);
  bodyGroup.add(mast);

  const buildCoaxialHub = (yPos: number): THREE.Group => {
    const hubGroup = new THREE.Group();
    hubGroup.position.set(0, yPos, 0.04);
    const cap = makeMesh(trackGeo(new THREE.CylinderGeometry(0.09, 0.1, 0.065, 14)), chromeMetal);
    hubGroup.add(cap);
    const bladeGeo = trackGeo(new THREE.BoxGeometry(1.42, 0.018, 0.095));
    for (let i = 0; i < 3; i++) {
      const holder = new THREE.Group();
      holder.rotation.y = (i / 3) * Math.PI * 2;
      const blade = makeMesh(bladeGeo, darkArmor);
      blade.position.x = 0.74;
      holder.add(blade);
      hubGroup.add(holder);
    }
    bodyGroup.add(hubGroup);
    return hubGroup;
  };

  const lowerRotor = buildCoaxialHub(1.22);
  const upperRotor = buildCoaxialHub(1.44);

  addNavPair(bodyGroup, 0.88, 0.58, 0.08);
  return {
    handled: true,
    mainRotor: lowerRotor,
    coaxialRotor: upperRotor,
    isHovering: true,
    baseY: 0.16,
  };
}
