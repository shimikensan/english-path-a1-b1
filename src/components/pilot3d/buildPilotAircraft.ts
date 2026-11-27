import * as THREE from 'three';

export interface AircraftRigHandles {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  mainRotor: THREE.Object3D | null;
  tailRotor: THREE.Object3D | null;
  propeller: THREE.Object3D | null;
  energyRing: THREE.Object3D | null;
  afterburners: THREE.Object3D[];
  navLights: THREE.MeshStandardMaterial[];
  isHovering: boolean;
  baseY: number;
  dispose: () => void;
}

function makeSweptWingShape(
  span: number,
  rootChord: number,
  tipChord: number,
  sweepBack: number
): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, rootChord * 0.5);
  s.lineTo(span, rootChord * 0.5 - sweepBack);
  s.lineTo(span, rootChord * 0.5 - sweepBack - tipChord);
  s.lineTo(0, -rootChord * 0.5);
  s.closePath();
  return s;
}

function makeTailFinShape(height: number, baseChord: number, topChord: number, rake: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(baseChord, 0);
  s.lineTo(baseChord - rake, height);
  s.lineTo(baseChord - rake - topChord, height);
  s.closePath();
  return s;
}

/**
 * Builds a high-craft composite procedural Three.js 3D aircraft anchored at bottom-center (y = 0).
 * Supports 8 distinct models across 4 categories: Helicopter, Civilian Airliner, Fighter Jet, Spacecraft.
 */
export function buildPilotAircraft(
  aircraftId: string,
  isSoftwareGl: boolean
): AircraftRigHandles | null {
  if (!aircraftId || aircraftId === 'aircraft_none') {
    return null;
  }

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const afterburners: THREE.Object3D[] = [];
  const navLights: THREE.MeshStandardMaterial[] = [];

  let mainRotor: THREE.Object3D | null = null;
  let tailRotor: THREE.Object3D | null = null;
  let propeller: THREE.Object3D | null = null;
  let energyRing: THREE.Object3D | null = null;
  let isHovering = false;
  let baseY = 0;

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
    castShadow = true
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = !isSoftwareGl && castShadow;
    m.receiveShadow = !isSoftwareGl;
    return m;
  };

  // Shared accent materials
  const darkMetal = trackMat(
    new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.35, metalness: 0.78 })
  );
  const chromeMetal = trackMat(
    new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.2, metalness: 0.9 })
  );
  const rubberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.85, metalness: 0.08 })
  );
  const navRed = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#EF4444',
      emissive: '#EF4444',
      emissiveIntensity: 1.8,
      roughness: 0.2,
    })
  );
  const navGreen = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#22C55E',
      emissive: '#22C55E',
      emissiveIntensity: 1.8,
      roughness: 0.2,
    })
  );
  navLights.push(navRed, navGreen);

  const addNavPair = (parent: THREE.Object3D, x: number, y: number, z: number, r = 0.032) => {
    const g = trackGeo(new THREE.SphereGeometry(r, 10, 10));
    const left = makeMesh(g, navRed, false);
    left.position.set(-x, y, z);
    const right = makeMesh(g, navGreen, false);
    right.position.set(x, y, z);
    parent.add(left, right);
  };

  // =========================================================================
  // 1. HELICOPTERS (H-120 Scout & Viper-9 Rescue)
  // =========================================================================
  if (aircraftId === 'aircraft_heli_scout' || aircraftId === 'aircraft_heli_rescue') {
    const isRescue = aircraftId === 'aircraft_heli_rescue';
    isHovering = true;
    baseY = 0.16;

    const hullPrimary = trackMat(
      new THREE.MeshStandardMaterial({
        color: isRescue ? '#DC2626' : '#0284C7',
        roughness: 0.3,
        metalness: 0.42,
      })
    );
    const hullStripe = trackMat(
      new THREE.MeshStandardMaterial({
        color: isRescue ? '#F8FAFC' : '#FF8524',
        roughness: 0.35,
        metalness: 0.25,
      })
    );
    const glassMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: isRescue ? '#1E3A5F' : '#0F2942',
        roughness: 0.08,
        metalness: 0.88,
      })
    );
    const bladeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45, metalness: 0.65 })
    );

    // Dual landing skids grounded near y = 0
    for (const side of [-1, 1]) {
      const skidCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.42, 0.04, -0.58),
        new THREE.Vector3(side * 0.42, 0.04, 0.56),
        new THREE.Vector3(side * 0.42, 0.14, 0.72),
      ]);
      const skid = makeMesh(trackGeo(new THREE.TubeGeometry(skidCurve, 20, 0.026, 8, false)), darkMetal);
      bodyGroup.add(skid);

      for (const zStrut of [-0.28, 0.26]) {
        const strut = makeMesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.022, 0.34, 8)), darkMetal);
        strut.position.set(side * 0.35, 0.2, zStrut);
        strut.rotation.z = side * 0.32;
        bodyGroup.add(strut);
      }
    }

    // Main teardrop fuselage built from LatheGeometry
    const cabinPts = [
      new THREE.Vector2(0.001, -0.75),
      new THREE.Vector2(0.24, -0.68),
      new THREE.Vector2(0.42, -0.35),
      new THREE.Vector2(0.46, 0.12),
      new THREE.Vector2(0.4, 0.52),
      new THREE.Vector2(0.22, 0.78),
      new THREE.Vector2(0.001, 0.88),
    ];
    const cabinGeo = trackGeo(new THREE.LatheGeometry(cabinPts, 24));
    cabinGeo.rotateX(Math.PI / 2);
    const cabin = makeMesh(cabinGeo, hullPrimary);
    cabin.scale.set(0.95, 0.92, 1.05);
    cabin.position.set(0, 0.62, 0.12);
    bodyGroup.add(cabin);

    // Side accent stripe band
    const band = makeMesh(trackGeo(new THREE.CylinderGeometry(0.435, 0.435, 0.14, 24)), hullStripe);
    band.rotation.x = Math.PI / 2;
    band.scale.set(0.96, 1.0, 0.94);
    band.position.set(0, 0.61, 0.08);
    bodyGroup.add(band);

    // Bubble cockpit windshield
    const canopy = makeMesh(
      trackGeo(new THREE.SphereGeometry(0.39, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      glassMat
    );
    canopy.rotation.x = Math.PI * 0.42;
    canopy.scale.set(0.96, 1.08, 0.88);
    canopy.position.set(0, 0.68, 0.45);
    bodyGroup.add(canopy);

    // Top turbine cowling
    const cowl = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.18, 0.58, 8, 16)), hullStripe);
    cowl.rotation.x = Math.PI / 2;
    cowl.position.set(0, 1.03, -0.05);
    bodyGroup.add(cowl);

    // Rescue variant extras: side auxiliary pods + glowing searchlight
    if (isRescue) {
      for (const side of [-1, 1]) {
        const pod = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.095, 0.42, 8, 12)), hullStripe);
        pod.rotation.x = Math.PI / 2;
        pod.position.set(side * 0.48, 0.52, 0.02);
        bodyGroup.add(pod);
      }
      const lightGlow = trackMat(
        new THREE.MeshStandardMaterial({
          color: '#FEF08A',
          emissive: '#FACC15',
          emissiveIntensity: 2.0,
          roughness: 0.15,
        })
      );
      const searchlight = makeMesh(trackGeo(new THREE.SphereGeometry(0.075, 12, 12)), lightGlow, false);
      searchlight.position.set(0, 0.38, 0.92);
      bodyGroup.add(searchlight);
    }

    // Tapered tail boom
    const boom = makeMesh(trackGeo(new THREE.CylinderGeometry(0.065, 0.17, 1.38, 14)), hullPrimary);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 0.72, -1.12);
    bodyGroup.add(boom);

    // Tail vertical stabilizer fin
    const finGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.46, 0.34, 0.14, 0.12), {
        depth: 0.04,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 2,
      })
    );
    finGeo.translate(-0.17, 0, -0.02);
    finGeo.rotateY(Math.PI / 2);
    const tailFin = makeMesh(finGeo, hullStripe);
    tailFin.position.set(0, 0.66, -1.78);
    bodyGroup.add(tailFin);

    // Horizontal tail stabilizer
    const hStab = makeMesh(trackGeo(new THREE.BoxGeometry(0.56, 0.03, 0.15)), hullStripe);
    hStab.position.set(0, 0.72, -1.42);
    bodyGroup.add(hStab);

    // Main rotor mast + spinning blades
    const mast = makeMesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.06, 0.24, 12)), darkMetal);
    mast.position.set(0, 1.24, 0.02);
    bodyGroup.add(mast);

    const rotorHubGroup = new THREE.Group();
    rotorHubGroup.position.set(0, 1.36, 0.02);
    const hubCap = makeMesh(trackGeo(new THREE.CylinderGeometry(0.095, 0.11, 0.07, 14)), chromeMetal);
    rotorHubGroup.add(hubCap);

    const bladeCount = isRescue ? 5 : 4;
    const bladeGeo = trackGeo(new THREE.BoxGeometry(1.48, 0.016, 0.09));
    for (let i = 0; i < bladeCount; i++) {
      const holder = new THREE.Group();
      holder.rotation.y = (i / bladeCount) * Math.PI * 2;
      const blade = makeMesh(bladeGeo, bladeMat);
      blade.position.x = 0.78;
      holder.add(blade);
      rotorHubGroup.add(holder);
    }
    bodyGroup.add(rotorHubGroup);
    mainRotor = rotorHubGroup;

    // Tail rotor spinning on X axis
    const tailRotorGroup = new THREE.Group();
    tailRotorGroup.position.set(0.08, 0.88, -1.82);
    const tBladeGeo = trackGeo(new THREE.BoxGeometry(0.016, 0.44, 0.045));
    const tb1 = makeMesh(tBladeGeo, chromeMetal, false);
    const tb2 = makeMesh(tBladeGeo, chromeMetal, false);
    tb2.rotation.x = Math.PI / 2;
    tailRotorGroup.add(tb1, tb2);
    bodyGroup.add(tailRotorGroup);
    tailRotor = tailRotorGroup;

    addNavPair(bodyGroup, 0.48, 0.62, 0.18);
  }

  // =========================================================================
  // 2. CIVILIAN AIRCRAFT (Cessna Skyhawk Prop & A350 SkyLiner Jet)
  // =========================================================================
  else if (aircraftId === 'aircraft_civil_prop') {
    isHovering = false;
    baseY = 0;

    const whiteMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.28, metalness: 0.25 })
    );
    const accentBlue = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0284C7', roughness: 0.3, metalness: 0.35 })
    );
    const glassMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.1, metalness: 0.85 })
    );

    // Fuselage
    const fusePts = [
      new THREE.Vector2(0.001, -1.35),
      new THREE.Vector2(0.11, -1.2),
      new THREE.Vector2(0.24, -0.45),
      new THREE.Vector2(0.32, 0.25),
      new THREE.Vector2(0.28, 0.85),
      new THREE.Vector2(0.15, 1.1),
      new THREE.Vector2(0.001, 1.18),
    ];
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, 24));
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = makeMesh(fuseGeo, whiteMat);
    fuselage.scale.set(0.92, 1.0, 1.0);
    fuselage.position.set(0, 0.56, 0);
    bodyGroup.add(fuselage);

    // Blue racing stripe along fuselage
    const stripe = makeMesh(trackGeo(new THREE.BoxGeometry(0.61, 0.08, 1.65)), accentBlue);
    stripe.position.set(0, 0.53, -0.1);
    bodyGroup.add(stripe);

    // Cabin windshield
    const windshield = makeMesh(trackGeo(new THREE.BoxGeometry(0.46, 0.22, 0.52)), glassMat);
    windshield.position.set(0, 0.72, 0.26);
    windshield.rotation.x = 0.14;
    bodyGroup.add(windshield);

    // High-mounted straight wings with wing struts
    const wing = makeMesh(trackGeo(new THREE.BoxGeometry(2.85, 0.055, 0.48)), whiteMat);
    wing.position.set(0, 0.86, 0.16);
    bodyGroup.add(wing);

    for (const side of [-1, 1]) {
      const tip = makeMesh(trackGeo(new THREE.BoxGeometry(0.18, 0.06, 0.48)), accentBlue);
      tip.position.set(side * 1.44, 0.86, 0.16);
      bodyGroup.add(tip);

      const wingStrut = makeMesh(trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.68, 8)), darkMetal);
      wingStrut.position.set(side * 0.56, 0.66, 0.16);
      wingStrut.rotation.z = side * -0.92;
      bodyGroup.add(wingStrut);
    }

    // Tail vertical & horizontal stabilizers
    const vFinGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.48, 0.44, 0.18, 0.14), {
        depth: 0.04,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 2,
      })
    );
    vFinGeo.translate(-0.22, 0, -0.02);
    vFinGeo.rotateY(Math.PI / 2);
    const vFin = makeMesh(vFinGeo, accentBlue);
    vFin.position.set(0, 0.64, -1.16);
    bodyGroup.add(vFin);

    const hTail = makeMesh(trackGeo(new THREE.BoxGeometry(0.95, 0.035, 0.26)), whiteMat);
    hTail.position.set(0, 0.62, -1.16);
    bodyGroup.add(hTail);

    // Tricycle landing gear resting cleanly at y = 0
    const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.095, 0.06, 16));
    wheelGeo.rotateZ(Math.PI / 2);
    const gearPositions: Array<[number, number]> = [
      [0, 0.72],
      [-0.36, 0.06],
      [0.36, 0.06],
    ];
    for (const [gx, gz] of gearPositions) {
      const wheel = makeMesh(wheelGeo, rubberMat);
      wheel.position.set(gx, 0.095, gz);
      bodyGroup.add(wheel);
      const leg = makeMesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.02, 0.32, 8)), chromeMetal);
      leg.position.set(gx * 0.75, 0.24, gz);
      leg.rotation.z = gx === 0 ? 0 : Math.sign(gx) * 0.42;
      bodyGroup.add(leg);
    }

    // Spinning front propeller
    const propGroup = new THREE.Group();
    propGroup.position.set(0, 0.56, 1.2);
    const spinner = makeMesh(trackGeo(new THREE.ConeGeometry(0.08, 0.18, 16)), chromeMetal);
    spinner.rotation.x = Math.PI / 2;
    propGroup.add(spinner);
    const pBlade = makeMesh(trackGeo(new THREE.BoxGeometry(0.76, 0.065, 0.018)), darkMetal);
    propGroup.add(pBlade);
    bodyGroup.add(propGroup);
    propeller = propGroup;

    addNavPair(bodyGroup, 1.52, 0.87, 0.18);
  } else if (aircraftId === 'aircraft_civil_airliner') {
    isHovering = false;
    baseY = 0;

    const pearlWhite = trackMat(
      new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.22, metalness: 0.35 })
    );
    const navyBelly = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0F2B5B', roughness: 0.3, metalness: 0.45 })
    );
    const orangeTrim = trackMat(
      new THREE.MeshStandardMaterial({ color: '#FF6B00', roughness: 0.28, metalness: 0.35 })
    );
    const cockpitGlass = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0B1324', roughness: 0.08, metalness: 0.92 })
    );
    const turbineGlow = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        emissive: '#0284C7',
        emissiveIntensity: 1.4,
        roughness: 0.2,
      })
    );

    // Long commercial airliner fuselage
    const fusePts = [
      new THREE.Vector2(0.001, -1.78),
      new THREE.Vector2(0.11, -1.55),
      new THREE.Vector2(0.25, -0.95),
      new THREE.Vector2(0.28, 0.95),
      new THREE.Vector2(0.23, 1.38),
      new THREE.Vector2(0.12, 1.62),
      new THREE.Vector2(0.001, 1.72),
    ];
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, 28));
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = makeMesh(fuseGeo, pearlWhite);
    fuselage.position.set(0, 0.56, 0);
    bodyGroup.add(fuselage);

    // Cockpit wrap-around visor & passenger window strip
    const visor = makeMesh(trackGeo(new THREE.CylinderGeometry(0.235, 0.255, 0.26, 20, 1, false, -0.95, 1.9)), cockpitGlass);
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, 0.62, 1.34);
    bodyGroup.add(visor);

    const windowStrip = makeMesh(trackGeo(new THREE.BoxGeometry(0.57, 0.045, 2.0)), cockpitGlass);
    windowStrip.position.set(0, 0.62, 0.05);
    bodyGroup.add(windowStrip);

    const liveryStripe = makeMesh(trackGeo(new THREE.BoxGeometry(0.565, 0.05, 2.3)), orangeTrim);
    liveryStripe.position.set(0, 0.52, -0.02);
    bodyGroup.add(liveryStripe);

    // Swept main wings with upturned winglets
    const rightWingShape = makeSweptWingShape(1.58, 0.64, 0.22, 0.62);
    const wingExtrude = {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    };
    const rWingGeo = trackGeo(new THREE.ExtrudeGeometry(rightWingShape, wingExtrude));
    rWingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(rWingGeo, pearlWhite);
    rWing.position.set(0.18, 0.44, 0.25);
    rWing.rotation.z = 0.06;
    bodyGroup.add(rWing);

    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.18;
    lWing.rotation.z = -0.06;
    bodyGroup.add(lWing);

    // Upturned orange winglets + underwing turbofan engines
    for (const side of [-1, 1]) {
      const winglet = makeMesh(trackGeo(new THREE.BoxGeometry(0.032, 0.22, 0.18)), orangeTrim);
      winglet.position.set(side * 1.75, 0.62, -0.14);
      winglet.rotation.z = side * -0.22;
      bodyGroup.add(winglet);

      // Turbofan nacelle
      const engineGroup = new THREE.Group();
      engineGroup.position.set(side * 0.72, 0.34, 0.24);
      const nacelle = makeMesh(trackGeo(new THREE.CylinderGeometry(0.13, 0.115, 0.48, 20)), navyBelly);
      nacelle.rotation.x = Math.PI / 2;
      engineGroup.add(nacelle);
      const intakeRing = makeMesh(trackGeo(new THREE.TorusGeometry(0.125, 0.018, 10, 20)), chromeMetal);
      intakeRing.position.z = 0.24;
      engineGroup.add(intakeRing);
      const coreGlow = makeMesh(trackGeo(new THREE.CylinderGeometry(0.065, 0.05, 0.06, 14)), turbineGlow, false);
      coreGlow.rotation.x = Math.PI / 2;
      coreGlow.position.z = -0.24;
      engineGroup.add(coreGlow);
      afterburners.push(coreGlow);
      bodyGroup.add(engineGroup);
    }

    // Swept vertical tailfin & horizontal stabilizers
    const tailGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.72, 0.62, 0.22, 0.36), {
        depth: 0.045,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 2,
      })
    );
    tailGeo.translate(-0.31, 0, -0.022);
    tailGeo.rotateY(Math.PI / 2);
    const vTail = makeMesh(tailGeo, navyBelly);
    vTail.position.set(0, 0.68, -1.42);
    bodyGroup.add(vTail);

    const hTailShape = makeSweptWingShape(0.62, 0.34, 0.14, 0.22);
    const hTailGeo = trackGeo(new THREE.ExtrudeGeometry(hTailShape, { depth: 0.03, bevelEnabled: false }));
    hTailGeo.rotateX(-Math.PI / 2);
    const rhTail = makeMesh(hTailGeo, pearlWhite);
    rhTail.position.set(0.06, 0.56, -1.36);
    const lhTail = rhTail.clone();
    lhTail.scale.x = -1;
    lhTail.position.x = -0.06;
    bodyGroup.add(rhTail, lhTail);

    // Landing gear grounded at y = 0
    const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.075, 0.055, 14));
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [gx, gz] of [
      [0, 1.16],
      [-0.34, -0.08],
      [0.34, -0.08],
    ]) {
      const wheel = makeMesh(wheelGeo, rubberMat);
      wheel.position.set(gx, 0.075, gz);
      const strut = makeMesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8)), chromeMetal);
      strut.position.set(gx, 0.22, gz);
      bodyGroup.add(wheel, strut);
    }

    addNavPair(bodyGroup, 1.77, 0.68, -0.14);
  }

  // =========================================================================
  // 3. FIGHTER JETS (F-16 Chim Ưng & F-22 Stealth Bóng Đêm)
  // =========================================================================
  else if (aircraftId === 'aircraft_fighter_falcon' || aircraftId === 'aircraft_fighter_stealth') {
    const isStealth = aircraftId === 'aircraft_fighter_stealth';
    isHovering = true;
    baseY = 0.22;

    const hullMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: isStealth ? '#1E293B' : '#64748B',
        roughness: isStealth ? 0.42 : 0.3,
        metalness: isStealth ? 0.72 : 0.62,
      })
    );
    const accentMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: isStealth ? '#FF6B00' : '#0EA5E9',
        emissive: isStealth ? '#C2410C' : '#0369A1',
        emissiveIntensity: isStealth ? 0.55 : 0.2,
        roughness: 0.26,
        metalness: 0.55,
      })
    );
    const canopyMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: isStealth ? '#F59E0B' : '#FBBF24',
        emissive: '#78350F',
        emissiveIntensity: 0.25,
        roughness: 0.08,
        metalness: 0.92,
      })
    );
    const flameMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: isStealth ? '#38BDF8' : '#FB923C',
        emissive: isStealth ? '#0EA5E9' : '#FF6B00',
        emissiveIntensity: 2.2,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
      })
    );

    // Sharp supersonic nose & fuselage
    const fusePts = [
      new THREE.Vector2(0.001, -1.55),
      new THREE.Vector2(0.18, -1.48),
      new THREE.Vector2(0.28, -0.7),
      new THREE.Vector2(0.32, 0.25),
      new THREE.Vector2(0.24, 0.95),
      new THREE.Vector2(0.1, 1.52),
      new THREE.Vector2(0.001, 1.82),
    ];
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, isStealth ? 6 : 20));
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = makeMesh(fuseGeo, hullMat);
    fuse.scale.set(isStealth ? 1.38 : 1.05, 0.58, 1.0);
    fuse.position.set(0, 0.55, 0);
    bodyGroup.add(fuse);

    // Gold-tinted teardrop fighter canopy
    const canopy = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.145, 0.56, 8, 16)), canopyMat);
    canopy.rotation.x = Math.PI / 2;
    canopy.scale.set(0.92, 1.0, 0.72);
    canopy.position.set(0, 0.72, 0.42);
    bodyGroup.add(canopy);

    // Delta swept combat wings
    const wingShape = makeSweptWingShape(
      isStealth ? 1.32 : 1.24,
      isStealth ? 1.15 : 0.95,
      0.28,
      isStealth ? 0.76 : 0.62
    );
    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.036,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(wingGeo, hullMat);
    rWing.position.set(0.16, 0.52, 0.16);
    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.16;
    bodyGroup.add(rWing, lWing);

    // Leading-edge combat accent strips
    for (const side of [-1, 1]) {
      const trim = makeMesh(trackGeo(new THREE.BoxGeometry(0.95, 0.02, 0.055)), accentMat);
      trim.position.set(side * 0.76, 0.555, -0.05);
      trim.rotation.y = side * 0.52;
      bodyGroup.add(trim);
    }

    // Tail fins: twin canted V-tails for F-22 stealth, single tall fin for F-16
    const finGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.56, 0.52, 0.16, 0.3), {
        depth: 0.032,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    finGeo.translate(-0.26, 0, -0.016);
    finGeo.rotateY(Math.PI / 2);

    if (isStealth) {
      for (const side of [-1, 1]) {
        const fin = makeMesh(finGeo, hullMat);
        fin.position.set(side * 0.28, 0.6, -1.16);
        fin.rotation.z = side * -0.42;
        bodyGroup.add(fin);
      }
    } else {
      const fin = makeMesh(finGeo, accentMat);
      fin.position.set(0, 0.62, -1.18);
      bodyGroup.add(fin);
    }

    // Horizontal rear stabilators
    const stabShape = makeSweptWingShape(0.58, 0.4, 0.14, 0.25);
    const stabGeo = trackGeo(new THREE.ExtrudeGeometry(stabShape, { depth: 0.024, bevelEnabled: false }));
    stabGeo.rotateX(-Math.PI / 2);
    const rStab = makeMesh(stabGeo, hullMat);
    rStab.position.set(0.14, 0.53, -1.08);
    const lStab = rStab.clone();
    lStab.scale.x = -1;
    lStab.position.x = -0.14;
    bodyGroup.add(rStab, lStab);

    // Exhaust nozzle(s) + live flickering afterburner cones
    const nozzleXs = isStealth ? [-0.16, 0.16] : [0];
    for (const nx of nozzleXs) {
      const nozzle = makeMesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.135, 0.22, 16)), darkMetal);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(nx, 0.54, -1.56);
      bodyGroup.add(nozzle);

      const flame = makeMesh(trackGeo(new THREE.ConeGeometry(0.095, 0.56, 14)), flameMat, false);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(nx, 0.54, -1.9);
      bodyGroup.add(flame);
      afterburners.push(flame);
    }

    addNavPair(bodyGroup, isStealth ? 1.44 : 1.36, 0.54, -0.34);
  }

  // =========================================================================
  // 4. SPACECRAFT (Explorer Space Shuttle & Nova-X Interstellar Starship)
  // =========================================================================
  else if (aircraftId === 'aircraft_space_shuttle') {
    isHovering = true;
    baseY = 0.24;

    const ceramicWhite = trackMat(
      new THREE.MeshStandardMaterial({ color: '#F1F5F9', roughness: 0.34, metalness: 0.2 })
    );
    const thermalBlack = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.72, metalness: 0.25 })
    );
    const thrusterBlue = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#60A5FA',
        emissive: '#2563EB',
        emissiveIntensity: 2.2,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
      })
    );

    // Orbiter upper hull
    const hullPts = [
      new THREE.Vector2(0.001, -1.5),
      new THREE.Vector2(0.38, -1.42),
      new THREE.Vector2(0.4, 0.45),
      new THREE.Vector2(0.32, 1.05),
      new THREE.Vector2(0.16, 1.48),
      new THREE.Vector2(0.001, 1.65),
    ];
    const hullGeo = trackGeo(new THREE.LatheGeometry(hullPts, 24));
    hullGeo.rotateX(Math.PI / 2);
    const orbiter = makeMesh(hullGeo, ceramicWhite);
    orbiter.scale.set(1.02, 0.82, 1.0);
    orbiter.position.set(0, 0.62, 0);
    bodyGroup.add(orbiter);

    // Black thermal protection belly & nose cap
    const belly = makeMesh(trackGeo(new THREE.BoxGeometry(0.76, 0.14, 2.55)), thermalBlack);
    belly.position.set(0, 0.36, -0.08);
    bodyGroup.add(belly);

    const noseCap = makeMesh(trackGeo(new THREE.SphereGeometry(0.16, 16, 14)), thermalBlack);
    noseCap.scale.set(0.95, 0.78, 1.35);
    noseCap.position.set(0, 0.58, 1.5);
    bodyGroup.add(noseCap);

    // Flight deck windows
    const deckWindow = makeMesh(trackGeo(new THREE.BoxGeometry(0.44, 0.1, 0.24)), thermalBlack);
    deckWindow.position.set(0, 0.82, 1.02);
    deckWindow.rotation.x = 0.35;
    bodyGroup.add(deckWindow);

    // Double-delta orbiter wings
    const wingShape = makeSweptWingShape(1.24, 1.48, 0.36, 0.98);
    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.055,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(wingGeo, ceramicWhite);
    rWing.position.set(0.24, 0.42, -0.05);
    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.24;
    bodyGroup.add(rWing, lWing);

    // Tall vertical tailfin
    const finGeo = trackGeo(
      new THREE.ExtrudeGeometry(makeTailFinShape(0.84, 0.74, 0.22, 0.42), {
        depth: 0.06,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 2,
      })
    );
    finGeo.translate(-0.37, 0, -0.03);
    finGeo.rotateY(Math.PI / 2);
    const fin = makeMesh(finGeo, ceramicWhite);
    fin.position.set(0, 0.84, -1.16);
    bodyGroup.add(fin);

    // 3 Main Space Shuttle Rocket Thrusters (triangle cluster)
    const engineOffsets: Array<[number, number]> = [
      [0, 0.74],
      [-0.17, 0.5],
      [0.17, 0.5],
    ];
    for (const [ex, ey] of engineOffsets) {
      const bell = makeMesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.135, 0.24, 16)), darkMetal);
      bell.rotation.x = Math.PI / 2;
      bell.position.set(ex, ey, -1.56);
      bodyGroup.add(bell);

      const plume = makeMesh(trackGeo(new THREE.ConeGeometry(0.11, 0.62, 14)), thrusterBlue, false);
      plume.rotation.x = -Math.PI / 2;
      plume.position.set(ex, ey, -1.94);
      bodyGroup.add(plume);
      afterburners.push(plume);
    }

    addNavPair(bodyGroup, 1.46, 0.46, -0.62);
  } else {
    // aircraft_space_starship — Nova-X Interstellar Starship
    isHovering = true;
    baseY = 0.28;

    const titaniumHull = trackMat(
      new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.18, metalness: 0.86 })
    );
    const obsidianTrim = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.36, metalness: 0.72 })
    );
    const quantumCyan = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#22D3EE',
        emissive: '#06B6D4',
        emissiveIntensity: 2.1,
        roughness: 0.12,
        metalness: 0.3,
      })
    );
    const goldAccent = trackMat(
      new THREE.MeshStandardMaterial({ color: '#FBBF24', roughness: 0.22, metalness: 0.92 })
    );

    // Sleek futuristic spearhead fuselage
    const starPts = [
      new THREE.Vector2(0.001, -1.55),
      new THREE.Vector2(0.28, -1.36),
      new THREE.Vector2(0.42, -0.45),
      new THREE.Vector2(0.38, 0.5),
      new THREE.Vector2(0.22, 1.32),
      new THREE.Vector2(0.001, 1.88),
    ];
    const starGeo = trackGeo(new THREE.LatheGeometry(starPts, 16));
    starGeo.rotateX(Math.PI / 2);
    const hull = makeMesh(starGeo, titaniumHull);
    hull.scale.set(1.22, 0.62, 1.0);
    hull.position.set(0, 0.72, 0);
    bodyGroup.add(hull);

    // Glowing holographic bridge canopy
    const bridge = makeMesh(trackGeo(new THREE.SphereGeometry(0.26, 20, 14)), quantumCyan);
    bridge.scale.set(1.1, 0.56, 1.85);
    bridge.position.set(0, 0.94, 0.38);
    bodyGroup.add(bridge);

    // Swept forward-angled energy wings
    const wingShape = makeSweptWingShape(1.42, 0.98, 0.26, 0.42);
    const wingGeo = trackGeo(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.045,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 2,
      })
    );
    wingGeo.rotateX(-Math.PI / 2);
    const rWing = makeMesh(wingGeo, obsidianTrim);
    rWing.position.set(0.24, 0.68, -0.05);
    const lWing = rWing.clone();
    lWing.scale.x = -1;
    lWing.position.x = -0.24;
    bodyGroup.add(rWing, lWing);

    // Gold plasma rails & dual wingtip ion nacelles
    for (const side of [-1, 1]) {
      const rail = makeMesh(trackGeo(new THREE.BoxGeometry(1.05, 0.03, 0.07)), goldAccent);
      rail.position.set(side * 0.85, 0.73, -0.18);
      rail.rotation.y = side * 0.32;
      bodyGroup.add(rail);

      const nacelle = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.11, 0.72, 8, 16)), titaniumHull);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(side * 1.48, 0.72, -0.26);
      bodyGroup.add(nacelle);

      const ionJet = makeMesh(trackGeo(new THREE.ConeGeometry(0.095, 0.65, 14)), quantumCyan, false);
      ionJet.rotation.x = -Math.PI / 2;
      ionJet.position.set(side * 1.48, 0.72, -0.95);
      bodyGroup.add(ionJet);
      afterburners.push(ionJet);
    }

    // Rotating Quantum Warp Ring encircling the aft hull!
    const warpRingGroup = new THREE.Group();
    warpRingGroup.position.set(0, 0.72, -0.68);
    const outerRing = makeMesh(trackGeo(new THREE.TorusGeometry(0.76, 0.042, 12, 48)), goldAccent);
    const innerEnergy = makeMesh(trackGeo(new THREE.TorusGeometry(0.68, 0.022, 10, 48)), quantumCyan, false);
    warpRingGroup.add(outerRing, innerEnergy);
    bodyGroup.add(warpRingGroup);
    energyRing = warpRingGroup;

    // Main central ion core thruster
    const mainJet = makeMesh(trackGeo(new THREE.ConeGeometry(0.18, 0.82, 16)), quantumCyan, false);
    mainJet.rotation.x = -Math.PI / 2;
    mainJet.position.set(0, 0.72, -1.92);
    bodyGroup.add(mainJet);
    afterburners.push(mainJet);

    addNavPair(bodyGroup, 1.56, 0.78, 0.14);
  }

  // Scale slightly so the aircraft fits harmonically on the hangar apron alongside the Pilot
  root.scale.setScalar(0.86);

  const dispose = () => {
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
  };

  return {
    root,
    bodyGroup,
    mainRotor,
    tailRotor,
    propeller,
    energyRing,
    afterburners,
    navLights,
    isHovering,
    baseY,
    dispose,
  };
}
