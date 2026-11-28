import * as THREE from 'three';

export interface AnimalCompanionResult {
  companionOrbit: THREE.Group | null;
  companionGroundGroup: THREE.Group | null;
  companionTail: THREE.Object3D | null;
  companionWingLeft: THREE.Object3D | null;
  companionWingRight: THREE.Object3D | null;
  companionHead: THREE.Object3D | null;
}

interface BuilderContext {
  root: THREE.Group;
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T;
  trackMat: <T extends THREE.Material>(m: T) => T;
  makeMesh: (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    castShadow?: boolean,
    receiveShadow?: boolean
  ) => THREE.Mesh;
  goldMat: THREE.Material;
  darkMetalMat: THREE.Material;
  eyeWhiteMat: THREE.Material;
  eyeDarkMat: THREE.Material;
}

const ANIMAL_COMPANION_IDS = new Set([
  'companion_dog',
  'companion_cat',
  'companion_squirrel',
  'companion_tiger',
  'companion_parrot',
]);

export function isAnimalCompanion(companionId: string): boolean {
  return ANIMAL_COMPANION_IDS.has(companionId);
}

/**
 * Builds composite multi-part procedural 3D animal companions for the 3D Pilot:
 * - Grounded companions (y = 0 beside pilot): Corgi Dog, Captain Black Cat, Flying Squirrel, Guardian Tiger
 * - Orbiting flying companion: Scarlet Macaw Parrot with flapping wings
 */
export function buildAnimalCompanion(
  companionId: string,
  ctx: BuilderContext
): AnimalCompanionResult {
  const { root, trackGeo, trackMat, makeMesh, goldMat, darkMetalMat, eyeWhiteMat, eyeDarkMat } =
    ctx;

  let companionOrbit: THREE.Group | null = null;
  let companionGroundGroup: THREE.Group | null = null;
  let companionTail: THREE.Object3D | null = null;
  let companionWingLeft: THREE.Object3D | null = null;
  let companionWingRight: THREE.Object3D | null = null;
  let companionHead: THREE.Object3D | null = null;

  const pinkInnerMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.72, metalness: 0.02 })
  );
  const noseBlackMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.12 })
  );
  const lensCyanMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.08,
      metalness: 0.28,
      clearcoat: 1.0,
    })
  );
  const redScarfMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.78, metalness: 0.04 })
  );

  // Helper: cute expressive eyes with sparkle catchlights
  const addEyes = (
    head: THREE.Group,
    spacingX: number,
    y: number,
    z: number,
    radius: number,
    irisMat: THREE.Material = eyeDarkMat
  ) => {
    const eyeGeo = trackGeo(new THREE.SphereGeometry(radius, 14, 12));
    const catchGeo = trackGeo(new THREE.SphereGeometry(radius * 0.34, 8, 8));
    for (const side of [-1, 1]) {
      const eye = makeMesh(eyeGeo, irisMat, false, false);
      eye.position.set(side * spacingX, y, z);
      head.add(eye);

      const catchlight = makeMesh(catchGeo, eyeWhiteMat, false, false);
      catchlight.position.set(side * spacingX - side * radius * 0.25, y + radius * 0.3, z + radius * 0.8);
      head.add(catchlight);
    }
  };

  // Helper: miniature brass aviator goggles across forehead
  const addMiniGoggles = (head: THREE.Group, y: number, z: number, scale = 1) => {
    const gGroup = new THREE.Group();
    gGroup.position.set(0, y, z);
    gGroup.scale.setScalar(scale);
    for (const side of [-1, 1]) {
      const rim = makeMesh(trackGeo(new THREE.TorusGeometry(0.052, 0.012, 8, 18)), goldMat);
      rim.position.set(side * 0.068, 0, 0);
      rim.rotation.y = side * 0.22;
      gGroup.add(rim);

      const lens = makeMesh(trackGeo(new THREE.CylinderGeometry(0.046, 0.046, 0.014, 14)), lensCyanMat);
      lens.rotation.x = Math.PI / 2;
      lens.rotation.z = -side * 0.22;
      lens.position.set(side * 0.068, 0, -0.004);
      gGroup.add(lens);
    }
    const bridge = makeMesh(trackGeo(new THREE.BoxGeometry(0.05, 0.016, 0.02)), darkMetalMat);
    gGroup.add(bridge);
    head.add(gGroup);
  };

  // =========================================================================
  // 1. CHÓ CORGI PHI CÔNG (Grounded beside Pilot at y = 0)
  // =========================================================================
  if (companionId === 'companion_dog') {
    const petRoot = new THREE.Group();
    petRoot.position.set(0.76, 0, 0.34);
    petRoot.rotation.y = -0.32;
    root.add(petRoot);
    companionGroundGroup = petRoot;

    const furOrangeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.82, metalness: 0.02 })
    );
    const furCreamMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.86, metalness: 0.01 })
    );

    // 4 short sturdy Corgi legs + white paws resting on y = 0
    const legGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.038, 0.16, 12));
    const pawGeo = trackGeo(new THREE.SphereGeometry(0.046, 12, 10));
    const legCoords: Array<[number, number]> = [
      [-0.11, 0.15],
      [0.11, 0.15],
      [-0.11, -0.15],
      [0.11, -0.15],
    ];
    for (const [lx, lz] of legCoords) {
      const paw = makeMesh(pawGeo, furCreamMat);
      paw.scale.set(1, 0.68, 1.25);
      paw.position.set(lx, 0.032, lz + 0.015);
      petRoot.add(paw);

      const leg = makeMesh(legGeo, furOrangeMat);
      leg.position.set(lx, 0.12, lz);
      petRoot.add(leg);
    }

    // Plump Corgi loaf torso + fluffy cream chest
    const torso = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.15, 0.28, 10, 18)), furOrangeMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(1.06, 1.0, 0.96);
    torso.position.set(0, 0.27, 0);
    petRoot.add(torso);

    const chest = makeMesh(trackGeo(new THREE.SphereGeometry(0.145, 16, 14)), furCreamMat);
    chest.scale.set(0.92, 1.0, 0.85);
    chest.position.set(0, 0.26, 0.18);
    petRoot.add(chest);

    // Red aviator collar scarf
    const scarf = makeMesh(trackGeo(new THREE.TorusGeometry(0.12, 0.028, 10, 20)), redScarfMat);
    scarf.rotation.x = Math.PI / 2 + 0.22;
    scarf.position.set(0, 0.37, 0.18);
    petRoot.add(scarf);

    const scarfKnot = makeMesh(trackGeo(new THREE.ConeGeometry(0.042, 0.11, 8)), redScarfMat);
    scarfKnot.rotation.z = -0.35;
    scarfKnot.rotation.x = -0.3;
    scarfKnot.position.set(0.08, 0.32, 0.26);
    petRoot.add(scarfKnot);

    // Head Group
    const head = new THREE.Group();
    head.position.set(0, 0.49, 0.22);
    petRoot.add(head);
    companionHead = head;

    const skull = makeMesh(trackGeo(new THREE.SphereGeometry(0.155, 20, 16)), furOrangeMat);
    skull.scale.set(1.05, 0.96, 1.0);
    head.add(skull);

    // Cream face blaze + snout
    const snout = makeMesh(trackGeo(new THREE.SphereGeometry(0.082, 14, 12)), furCreamMat);
    snout.scale.set(1.02, 0.78, 1.2);
    snout.position.set(0, -0.04, 0.14);
    head.add(snout);

    const nose = makeMesh(trackGeo(new THREE.SphereGeometry(0.028, 12, 10)), noseBlackMat);
    nose.scale.set(1.2, 0.85, 0.9);
    nose.position.set(0, -0.015, 0.225);
    head.add(nose);

    const tongue = makeMesh(trackGeo(new THREE.SphereGeometry(0.026, 10, 8)), pinkInnerMat, false, false);
    tongue.scale.set(0.85, 1.15, 0.45);
    tongue.position.set(0, -0.085, 0.19);
    head.add(tongue);

    // Big signature upright Corgi ears
    const earGeo = trackGeo(new THREE.ConeGeometry(0.068, 0.17, 12));
    const innerEarGeo = trackGeo(new THREE.ConeGeometry(0.04, 0.11, 10));
    for (const side of [-1, 1]) {
      const ear = makeMesh(earGeo, furOrangeMat);
      ear.scale.set(0.95, 1.0, 0.55);
      ear.position.set(side * 0.115, 0.155, -0.01);
      ear.rotation.z = -side * 0.28;
      head.add(ear);

      const inner = makeMesh(innerEarGeo, pinkInnerMat, false, false);
      inner.scale.set(0.85, 1.0, 0.35);
      inner.position.set(side * 0.115, 0.15, 0.015);
      inner.rotation.z = -side * 0.28;
      head.add(inner);
    }

    addEyes(head, 0.065, 0.025, 0.135, 0.024);
    addMiniGoggles(head, 0.095, 0.125, 0.85);

    // Fluffy wagging tail
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.33, -0.24);
    const tailPlume = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.045, 0.11, 8, 12)), furCreamMat);
    tailPlume.rotation.x = -0.65;
    tailPlume.position.set(0, 0.06, -0.05);
    tailPivot.add(tailPlume);
    petRoot.add(tailPivot);
    companionTail = tailPivot;
  }

  // =========================================================================
  // 2. MÈO MUN CƠ TRƯỞNG (Grounded beside Pilot at y = 0)
  // =========================================================================
  else if (companionId === 'companion_cat') {
    const petRoot = new THREE.Group();
    petRoot.position.set(0.75, 0, 0.35);
    petRoot.rotation.y = -0.34;
    root.add(petRoot);
    companionGroundGroup = petRoot;

    const catBlackMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.62, metalness: 0.08 })
    );
    const whiteSockMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8, metalness: 0.02 })
    );
    const amberEyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.55,
        roughness: 0.12,
      })
    );
    const navyCapMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x132743, roughness: 0.6, metalness: 0.1 })
    );

    // Sitting elegant cat silhouette (bottom sits flush at y = 0)
    const haunch = makeMesh(trackGeo(new THREE.SphereGeometry(0.155, 18, 16)), catBlackMat);
    haunch.scale.set(1.0, 1.25, 1.05);
    haunch.position.set(0, 0.19, -0.04);
    petRoot.add(haunch);

    const chest = makeMesh(trackGeo(new THREE.SphereGeometry(0.125, 16, 14)), catBlackMat);
    chest.scale.set(0.95, 1.15, 0.92);
    chest.position.set(0, 0.32, 0.05);
    petRoot.add(chest);

    // Tuxedo white chest locket
    const locket = makeMesh(trackGeo(new THREE.SphereGeometry(0.068, 12, 10)), whiteSockMat);
    locket.scale.set(0.9, 1.15, 0.55);
    locket.position.set(0, 0.31, 0.145);
    petRoot.add(locket);

    // Front straight paws & white mittens at y = 0
    for (const side of [-1, 1]) {
      const fLeg = makeMesh(trackGeo(new THREE.CylinderGeometry(0.036, 0.032, 0.26, 12)), catBlackMat);
      fLeg.position.set(side * 0.068, 0.15, 0.12);
      petRoot.add(fLeg);

      const paw = makeMesh(trackGeo(new THREE.SphereGeometry(0.042, 12, 10)), whiteSockMat);
      paw.scale.set(1.0, 0.65, 1.25);
      paw.position.set(side * 0.068, 0.028, 0.14);
      petRoot.add(paw);
    }

    // Golden bell collar
    const collar = makeMesh(trackGeo(new THREE.TorusGeometry(0.095, 0.018, 8, 18)), redScarfMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.42, 0.06);
    petRoot.add(collar);
    const bell = makeMesh(trackGeo(new THREE.SphereGeometry(0.026, 10, 10)), goldMat);
    bell.position.set(0, 0.40, 0.16);
    petRoot.add(bell);

    // Head Group
    const head = new THREE.Group();
    head.position.set(0, 0.53, 0.08);
    petRoot.add(head);
    companionHead = head;

    const skull = makeMesh(trackGeo(new THREE.SphereGeometry(0.145, 20, 16)), catBlackMat);
    skull.scale.set(1.06, 0.95, 0.98);
    head.add(skull);

    // Cute muzzle cheeks + pink nose
    for (const side of [-1, 1]) {
      const cheek = makeMesh(trackGeo(new THREE.SphereGeometry(0.042, 10, 8)), whiteSockMat);
      cheek.position.set(side * 0.036, -0.04, 0.125);
      head.add(cheek);
    }
    const nose = makeMesh(trackGeo(new THREE.SphereGeometry(0.018, 10, 8)), pinkInnerMat);
    nose.position.set(0, -0.022, 0.152);
    head.add(nose);

    // Whiskers
    const whiskerGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.006, 0.006));
    for (const side of [-1, 1]) {
      for (const tilt of [-0.14, 0.12]) {
        const w = makeMesh(whiskerGeo, whiteSockMat, false, false);
        w.position.set(side * 0.11, -0.035 + tilt * 0.06, 0.11);
        w.rotation.z = side * tilt;
        head.add(w);
      }
    }

    // Pointy cat ears
    const earGeo = trackGeo(new THREE.ConeGeometry(0.056, 0.14, 10));
    const innerGeo = trackGeo(new THREE.ConeGeometry(0.032, 0.09, 8));
    for (const side of [-1, 1]) {
      const ear = makeMesh(earGeo, catBlackMat);
      ear.scale.set(0.9, 1.0, 0.52);
      ear.position.set(side * 0.098, 0.14, 0);
      ear.rotation.z = -side * 0.22;
      head.add(ear);

      const inner = makeMesh(innerGeo, pinkInnerMat, false, false);
      inner.scale.set(0.85, 1.0, 0.35);
      inner.position.set(side * 0.098, 0.135, 0.016);
      inner.rotation.z = -side * 0.22;
      head.add(inner);
    }

    // Glowing amber eyes + pupils
    addEyes(head, 0.058, 0.015, 0.125, 0.028, amberEyeMat);
    for (const side of [-1, 1]) {
      const slit = makeMesh(trackGeo(new THREE.BoxGeometry(0.01, 0.032, 0.01)), eyeDarkMat, false, false);
      slit.position.set(side * 0.058, 0.015, 0.152);
      head.add(slit);
    }

    // Miniature Captain Cap perched between ears!
    const capBand = makeMesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.068, 0.04, 16)), navyCapMat);
    capBand.position.set(0, 0.145, 0.01);
    head.add(capBand);
    const capTop = makeMesh(trackGeo(new THREE.CylinderGeometry(0.095, 0.075, 0.045, 16)), navyCapMat);
    capTop.position.set(0, 0.175, 0);
    head.add(capTop);
    const capGold = makeMesh(trackGeo(new THREE.TorusGeometry(0.072, 0.008, 6, 18)), goldMat);
    capGold.rotation.x = Math.PI / 2;
    capGold.position.set(0, 0.135, 0.01);
    head.add(capGold);
    const capBrim = makeMesh(trackGeo(new THREE.BoxGeometry(0.11, 0.012, 0.065)), darkMetalMat);
    capBrim.position.set(0, 0.13, 0.07);
    capBrim.rotation.x = 0.18;
    head.add(capBrim);

    // Long curved swishing cat tail
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.12, -0.17);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.05, 0.08, -0.14),
      new THREE.Vector3(0.09, 0.25, -0.18),
      new THREE.Vector3(0.04, 0.42, -0.11),
    ]);
    const tailMesh = makeMesh(trackGeo(new THREE.TubeGeometry(tailCurve, 18, 0.028, 10, false)), catBlackMat);
    tailPivot.add(tailMesh);
    const tailTip = makeMesh(trackGeo(new THREE.SphereGeometry(0.03, 10, 10)), whiteSockMat);
    tailTip.position.set(0.04, 0.42, -0.11);
    tailPivot.add(tailTip);
    petRoot.add(tailPivot);
    companionTail = tailPivot;
  }

  // =========================================================================
  // 3. SÓC BAY NĂNG ĐỘNG (Grounded beside Pilot at y = 0, big fluffy curled tail!)
  // =========================================================================
  else if (companionId === 'companion_squirrel') {
    const petRoot = new THREE.Group();
    petRoot.position.set(0.74, 0, 0.34);
    petRoot.rotation.y = -0.35;
    root.add(petRoot);
    companionGroundGroup = petRoot;

    const russetMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82, metalness: 0.02 })
    );
    const creamBellyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.86, metalness: 0.01 })
    );
    const acornCapMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x5c3419, roughness: 0.78, metalness: 0.04 })
    );

    // Hind feet grounded at y = 0
    for (const side of [-1, 1]) {
      const foot = makeMesh(trackGeo(new THREE.SphereGeometry(0.048, 12, 10)), russetMat);
      foot.scale.set(0.85, 0.55, 1.55);
      foot.position.set(side * 0.08, 0.026, 0.06);
      petRoot.add(foot);
    }

    // Upright rounded squirrel body
    const body = makeMesh(trackGeo(new THREE.SphereGeometry(0.145, 18, 16)), russetMat);
    body.scale.set(0.92, 1.28, 0.96);
    body.position.set(0, 0.21, 0);
    petRoot.add(body);

    const belly = makeMesh(trackGeo(new THREE.SphereGeometry(0.11, 14, 12)), creamBellyMat);
    belly.scale.set(0.88, 1.18, 0.65);
    belly.position.set(0, 0.2, 0.095);
    petRoot.add(belly);

    // Little front paws holding a golden acorn!
    for (const side of [-1, 1]) {
      const arm = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.026, 0.08, 6, 10)), russetMat);
      arm.position.set(side * 0.075, 0.27, 0.11);
      arm.rotation.z = side * 0.52;
      arm.rotation.x = 0.65;
      petRoot.add(arm);
    }
    const acornNut = makeMesh(trackGeo(new THREE.SphereGeometry(0.044, 12, 10)), goldMat);
    acornNut.scale.set(0.9, 1.15, 0.9);
    acornNut.position.set(0, 0.26, 0.165);
    petRoot.add(acornNut);
    const acornCap = makeMesh(
      trackGeo(new THREE.SphereGeometry(0.048, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.48)),
      acornCapMat
    );
    acornCap.position.set(0, 0.275, 0.165);
    petRoot.add(acornCap);

    // Squirrel Head Group
    const head = new THREE.Group();
    head.position.set(0, 0.44, 0.04);
    petRoot.add(head);
    companionHead = head;

    const skull = makeMesh(trackGeo(new THREE.SphereGeometry(0.125, 18, 14)), russetMat);
    skull.scale.set(1.08, 0.96, 1.0);
    head.add(skull);

    // Chubby cheeks & snout
    for (const side of [-1, 1]) {
      const chubby = makeMesh(trackGeo(new THREE.SphereGeometry(0.056, 12, 10)), creamBellyMat);
      chubby.position.set(side * 0.075, -0.028, 0.075);
      head.add(chubby);
    }
    const nose = makeMesh(trackGeo(new THREE.SphereGeometry(0.02, 10, 8)), noseBlackMat);
    nose.position.set(0, -0.015, 0.135);
    head.add(nose);

    // Perky tufted squirrel ears
    for (const side of [-1, 1]) {
      const ear = makeMesh(trackGeo(new THREE.ConeGeometry(0.042, 0.115, 10)), russetMat);
      ear.scale.set(0.85, 1.0, 0.55);
      ear.position.set(side * 0.085, 0.125, -0.01);
      ear.rotation.z = -side * 0.18;
      head.add(ear);
    }

    addEyes(head, 0.056, 0.022, 0.105, 0.024);
    addMiniGoggles(head, 0.082, 0.095, 0.72);

    // Iconic giant plush S-curve fluffy squirrel tail!
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.12, -0.11);
    const fluffyCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.12, -0.15),
      new THREE.Vector3(0, 0.34, -0.2),
      new THREE.Vector3(0, 0.52, -0.08),
      new THREE.Vector3(0, 0.47, 0.02),
    ]);
    const tailTube = makeMesh(trackGeo(new THREE.TubeGeometry(fluffyCurve, 22, 0.085, 12, false)), russetMat);
    tailTube.scale.set(0.95, 1.0, 1.05);
    tailPivot.add(tailTube);

    const tailFluffTip = makeMesh(trackGeo(new THREE.SphereGeometry(0.095, 14, 12)), creamBellyMat);
    tailFluffTip.position.set(0, 0.47, 0.01);
    tailPivot.add(tailFluffTip);
    petRoot.add(tailPivot);
    companionTail = tailPivot;
  }

  // =========================================================================
  // 4. HỔ VẰN HỘ VỆ (Grounded sturdy tiger cub guardian beside Pilot at y = 0)
  // =========================================================================
  else if (companionId === 'companion_tiger') {
    const petRoot = new THREE.Group();
    petRoot.position.set(0.82, 0, 0.32);
    petRoot.rotation.y = -0.3;
    root.add(petRoot);
    companionGroundGroup = petRoot;

    const tigerOrangeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.76, metalness: 0.03 })
    );
    const tigerCreamMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.84, metalness: 0.01 })
    );
    const stripeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.82, metalness: 0.05 })
    );
    const tigerEyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.5,
        roughness: 0.12,
      })
    );

    // 4 strong tiger legs + cream paws grounded at y = 0
    const legGeo = trackGeo(new THREE.CylinderGeometry(0.058, 0.048, 0.24, 12));
    const pawGeo = trackGeo(new THREE.SphereGeometry(0.058, 12, 10));
    const legs: Array<[number, number]> = [
      [-0.135, 0.19],
      [0.135, 0.19],
      [-0.135, -0.18],
      [0.135, -0.18],
    ];
    for (const [lx, lz] of legs) {
      const paw = makeMesh(pawGeo, tigerCreamMat);
      paw.scale.set(1.0, 0.65, 1.25);
      paw.position.set(lx, 0.038, lz + 0.015);
      petRoot.add(paw);

      const leg = makeMesh(legGeo, tigerOrangeMat);
      leg.position.set(lx, 0.16, lz);
      petRoot.add(leg);
    }

    // Muscular tiger torso + cream chest
    const torso = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.18, 0.34, 10, 20)), tigerOrangeMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 0.34, 0);
    petRoot.add(torso);

    const chest = makeMesh(trackGeo(new THREE.SphereGeometry(0.165, 16, 14)), tigerCreamMat);
    chest.scale.set(0.9, 1.0, 0.85);
    chest.position.set(0, 0.33, 0.22);
    petRoot.add(chest);

    // Bold black tiger dorsal stripes wrapping torso
    for (const sz of [-0.14, -0.02, 0.1]) {
      const stripe = makeMesh(
        trackGeo(new THREE.TorusGeometry(0.175, 0.022, 8, 22, Math.PI * 1.15)),
        stripeMat
      );
      stripe.rotation.z = -Math.PI * 0.075;
      stripe.position.set(0, 0.345, sz);
      petRoot.add(stripe);
    }

    // Heroic red pilot bandana
    const bandana = makeMesh(trackGeo(new THREE.TorusGeometry(0.145, 0.028, 10, 22)), redScarfMat);
    bandana.rotation.x = Math.PI / 2 + 0.2;
    bandana.position.set(0, 0.47, 0.22);
    petRoot.add(bandana);

    // Tiger Head Group
    const head = new THREE.Group();
    head.position.set(0, 0.61, 0.28);
    petRoot.add(head);
    companionHead = head;

    const skull = makeMesh(trackGeo(new THREE.SphereGeometry(0.185, 22, 18)), tigerOrangeMat);
    skull.scale.set(1.08, 0.96, 1.0);
    head.add(skull);

    // Fluffy white cheek ruffs & muzzle
    for (const side of [-1, 1]) {
      const ruff = makeMesh(trackGeo(new THREE.SphereGeometry(0.08, 12, 10)), tigerCreamMat);
      ruff.scale.set(1.25, 0.78, 0.72);
      ruff.position.set(side * 0.14, -0.055, 0.07);
      head.add(ruff);
    }
    const muzzle = makeMesh(trackGeo(new THREE.SphereGeometry(0.088, 14, 12)), tigerCreamMat);
    muzzle.scale.set(1.1, 0.82, 1.12);
    muzzle.position.set(0, -0.048, 0.155);
    head.add(muzzle);

    const nose = makeMesh(trackGeo(new THREE.SphereGeometry(0.032, 12, 10)), pinkInnerMat);
    nose.scale.set(1.25, 0.82, 0.9);
    nose.position.set(0, -0.018, 0.24);
    head.add(nose);

    // Signature forehead "王" (King) tiger stripes
    const fStripeV = makeMesh(trackGeo(new THREE.BoxGeometry(0.022, 0.095, 0.02)), stripeMat, false, false);
    fStripeV.position.set(0, 0.105, 0.165);
    head.add(fStripeV);
    for (const fy of [0.08, 0.125]) {
      const fStripeH = makeMesh(trackGeo(new THREE.BoxGeometry(0.095, 0.018, 0.02)), stripeMat, false, false);
      fStripeH.position.set(0, fy, 0.168);
      head.add(fStripeH);
    }

    // Rounded tiger ears with black rims
    for (const side of [-1, 1]) {
      const ear = makeMesh(trackGeo(new THREE.SphereGeometry(0.062, 14, 12)), tigerOrangeMat);
      ear.scale.set(1.0, 1.0, 0.55);
      ear.position.set(side * 0.135, 0.15, -0.01);
      head.add(ear);

      const earInner = makeMesh(trackGeo(new THREE.SphereGeometry(0.038, 10, 8)), tigerCreamMat, false, false);
      earInner.scale.set(1.0, 1.0, 0.35);
      earInner.position.set(side * 0.135, 0.15, 0.014);
      head.add(earInner);
    }

    addEyes(head, 0.075, 0.028, 0.16, 0.028, tigerEyeMat);
    for (const side of [-1, 1]) {
      const pupil = makeMesh(trackGeo(new THREE.SphereGeometry(0.015, 10, 8)), eyeDarkMat, false, false);
      pupil.position.set(side * 0.075, 0.028, 0.184);
      head.add(pupil);
    }

    // Long striped tiger tail
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.36, -0.28);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, -0.04, -0.18),
      new THREE.Vector3(0.04, 0.06, -0.34),
      new THREE.Vector3(0.02, 0.18, -0.38),
    ]);
    const tailMesh = makeMesh(trackGeo(new THREE.TubeGeometry(tailCurve, 16, 0.032, 10, false)), tigerOrangeMat);
    tailPivot.add(tailMesh);
    const tailTip = makeMesh(trackGeo(new THREE.SphereGeometry(0.034, 10, 10)), stripeMat);
    tailTip.position.set(0.02, 0.18, -0.38);
    tailPivot.add(tailTip);
    petRoot.add(tailPivot);
    companionTail = tailPivot;
  }

  // =========================================================================
  // 5. VẸT MACAW HOA TIÊU (Flying in orbit around Pilot with flapping wings!)
  // =========================================================================
  else if (companionId === 'companion_parrot') {
    companionOrbit = new THREE.Group();
    companionOrbit.position.set(0, 1.98, 0);
    root.add(companionOrbit);

    const petRoot = new THREE.Group();
    petRoot.position.set(1.06, 0.24, 0.12);
    // Face tangent direction of orbit
    petRoot.rotation.y = Math.PI;
    companionOrbit.add(petRoot);

    const scarletMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.56, metalness: 0.06 })
    );
    const royalBlueMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45, metalness: 0.12 })
    );
    const sunnyGoldMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5, metalness: 0.08 })
    );
    const ivoryBeakMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.32, metalness: 0.08 })
    );

    // Aerodynamic scarlet body
    const body = makeMesh(trackGeo(new THREE.CapsuleGeometry(0.095, 0.18, 10, 16)), scarletMat);
    body.rotation.x = Math.PI * 0.36;
    petRoot.add(body);

    // Parrot Head
    const head = new THREE.Group();
    head.position.set(0, 0.14, 0.14);
    petRoot.add(head);
    companionHead = head;

    const skull = makeMesh(trackGeo(new THREE.SphereGeometry(0.092, 16, 14)), scarletMat);
    head.add(skull);

    // White Macaw cheek patches
    for (const side of [-1, 1]) {
      const patch = makeMesh(trackGeo(new THREE.SphereGeometry(0.045, 10, 8)), eyeWhiteMat, false, false);
      patch.scale.set(0.55, 0.9, 1.0);
      patch.position.set(side * 0.072, 0.01, 0.035);
      head.add(patch);
    }

    // Iconic curved Macaw beak (upper ivory hook + dark lower jaw)
    const upperBeak = makeMesh(trackGeo(new THREE.ConeGeometry(0.042, 0.115, 12)), ivoryBeakMat);
    upperBeak.rotation.x = Math.PI * 0.62;
    upperBeak.position.set(0, -0.01, 0.11);
    head.add(upperBeak);

    const lowerBeak = makeMesh(trackGeo(new THREE.ConeGeometry(0.028, 0.055, 10)), noseBlackMat);
    lowerBeak.rotation.x = Math.PI * 0.42;
    lowerBeak.position.set(0, -0.045, 0.082);
    head.add(lowerBeak);

    // Crown feather crest
    const crest = makeMesh(trackGeo(new THREE.ConeGeometry(0.025, 0.08, 8)), sunnyGoldMat);
    crest.rotation.x = -0.5;
    crest.position.set(0, 0.105, -0.02);
    head.add(crest);

    addEyes(head, 0.068, 0.018, 0.052, 0.018);
    addMiniGoggles(head, 0.055, 0.068, 0.56);

    // Articulated multi-color flapping wings (Red shoulder -> Yellow mid -> Royal Blue tips!)
    for (const side of [-1, 1]) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.085, 0.05, 0.02);

      const innerWing = makeMesh(trackGeo(new THREE.BoxGeometry(0.18, 0.024, 0.13)), scarletMat);
      innerWing.position.set(side * 0.09, 0, 0);
      wingPivot.add(innerWing);

      const midWing = makeMesh(trackGeo(new THREE.BoxGeometry(0.14, 0.02, 0.115)), sunnyGoldMat);
      midWing.position.set(side * 0.22, 0.005, -0.015);
      wingPivot.add(midWing);

      const outerWing = makeMesh(trackGeo(new THREE.BoxGeometry(0.17, 0.016, 0.095)), royalBlueMat);
      outerWing.position.set(side * 0.34, 0.008, -0.03);
      outerWing.rotation.y = side * 0.18;
      wingPivot.add(outerWing);

      petRoot.add(wingPivot);
      if (side === -1) companionWingLeft = wingPivot;
      else companionWingRight = wingPivot;
    }

    // Long royal-blue & gold streaming tail feathers
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, -0.08, -0.14);
    const mainFeather = makeMesh(trackGeo(new THREE.ConeGeometry(0.042, 0.38, 10)), royalBlueMat);
    mainFeather.rotation.x = -Math.PI * 0.55;
    mainFeather.position.set(0, -0.03, -0.18);
    tailPivot.add(mainFeather);

    const sideFeatherL = makeMesh(trackGeo(new THREE.ConeGeometry(0.028, 0.28, 8)), sunnyGoldMat);
    sideFeatherL.rotation.x = -Math.PI * 0.55;
    sideFeatherL.rotation.z = 0.16;
    sideFeatherL.position.set(-0.04, -0.025, -0.14);
    const sideFeatherR = sideFeatherL.clone();
    sideFeatherR.rotation.z = -0.16;
    sideFeatherR.position.x = 0.04;
    tailPivot.add(sideFeatherL, sideFeatherR);

    petRoot.add(tailPivot);
    companionTail = tailPivot;
  }

  return {
    companionOrbit,
    companionGroundGroup,
    companionTail,
    companionWingLeft,
    companionWingRight,
    companionHead,
  };
}
