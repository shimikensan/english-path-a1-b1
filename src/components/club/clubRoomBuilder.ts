import * as THREE from 'three';

export interface ClubRoomAssets {
  roomGroup: THREE.Group;
  floorHitMesh: THREE.Mesh;
  walkTargetRing: THREE.Mesh;
  dispose: () => void;
}

function createWoodParquetTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#D9B996';
    ctx.fillRect(0, 0, 512, 512);

    const plankH = 64;
    const plankW = 256;
    const tones = ['#D7B48E', '#DFC09C', '#CFA982', '#E3C7A6', '#D4B089'];

    for (let row = 0; row < 512 / plankH; row++) {
      const offsetX = row % 2 === 0 ? 0 : plankW / 2;
      for (let col = -1; col < 512 / plankW + 1; col++) {
        const x = col * plankW + offsetX;
        const y = row * plankH;
        const tone = tones[(row * 3 + col + 10) % tones.length];
        ctx.fillStyle = tone;
        ctx.fillRect(x, y, plankW, plankH);

        // Subtle wood grain lines
        ctx.strokeStyle = 'rgba(130, 88, 52, 0.11)';
        ctx.lineWidth = 1.2;
        for (let g = 8; g < plankH; g += 10) {
          ctx.beginPath();
          ctx.moveTo(x, y + g);
          ctx.bezierCurveTo(
            x + plankW * 0.35,
            y + g + ((row + g) % 3) - 1,
            x + plankW * 0.7,
            y + g - ((col + g) % 3) + 1,
            x + plankW,
            y + g
          );
          ctx.stroke();
        }

        // Plank seams
        ctx.strokeStyle = 'rgba(110, 74, 42, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, plankW, plankH);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function createWovenRugTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    const cx = 256;
    const cy = 256;

    // Cream woven outer disc
    ctx.beginPath();
    ctx.arc(cx, cy, 248, 0, Math.PI * 2);
    ctx.fillStyle = '#F7EFE4';
    ctx.fill();

    // Concentric woven bands
    const rings = [
      { r: 234, color: '#E8C5A5', w: 12 },
      { r: 210, color: '#D97B48', w: 7 },
      { r: 186, color: '#EFE2D1', w: 22 },
      { r: 148, color: '#6E9A8B', w: 6 },
      { r: 120, color: '#F3E7D8', w: 18 },
      { r: 78, color: '#E2A073', w: 6 },
    ];
    rings.forEach((ring) => {
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.w;
      ctx.stroke();
    });

    // Subtle woven stipple
    ctx.strokeStyle = 'rgba(120, 90, 65, 0.08)';
    ctx.lineWidth = 2;
    for (let r = 20; r < 245; r += 9) {
      ctx.beginPath();
      ctx.setLineDash([5, 6]);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function createChalkboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Deep matte slate-green chalkboard surface
    const bg = ctx.createLinearGradient(0, 0, 1024, 512);
    bg.addColorStop(0, '#223632');
    bg.addColorStop(0.5, '#1D2F2B');
    bg.addColorStop(1, '#192926');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle chalk dust smudges
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.ellipse(300, 220, 260, 110, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(760, 320, 200, 90, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Decorative chalk border
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, 968, 456);

    // Header
    ctx.fillStyle = '#FDBA74';
    ctx.font = '800 58px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PILOT ENGLISH CLUB', 512, 138);

    // Subtitle
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 32px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Click any member to start practicing English!', 512, 212);

    // Helpful English conversation starters written in chalk
    ctx.fillStyle = '#A7F3D0';
    ctx.font = '600 26px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillText('"Hi! How is your English study going today?"', 512, 298);

    ctx.fillStyle = '#BAE6FD';
    ctx.font = '600 26px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillText('"What new word did you learn this week?"', 512, 354);

    ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
    ctx.font = '500 22px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Click floor or press W A S D to walk around the lounge', 512, 434);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWindowSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#7CC5F8');
    grad.addColorStop(0.52, '#C7E8FE');
    grad.addColorStop(0.84, '#FFF2D6');
    grad.addColorStop(1, '#FCE2BA');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    // Soft puffy sunlit clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    const drawCloud = (x: number, y: number, s: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 28 * s, 0, Math.PI * 2);
      ctx.arc(x + 26 * s, y - 8 * s, 24 * s, 0, Math.PI * 2);
      ctx.arc(x + 52 * s, y + 2 * s, 22 * s, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCloud(50, 125, 1.0);
    drawCloud(130, 240, 0.85);
    drawCloud(42, 340, 0.7);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createClubRoom(maxAnisotropy = 4): ClubRoomAssets {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const roomGroup = new THREE.Group();
  roomGroup.name = 'pilot_english_club_room';

  // === FLOOR & WOVEN LOUNGE RUG ===
  const woodTex = track(createWoodParquetTexture(maxAnisotropy));
  const floorGeo = track(new THREE.PlaneGeometry(15.2, 15.2));
  const floorMat = track(
    new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.62,
      metalness: 0.04,
    })
  );
  const floorHitMesh = new THREE.Mesh(floorGeo, floorMat);
  floorHitMesh.rotation.x = -Math.PI / 2;
  floorHitMesh.receiveShadow = true;
  floorHitMesh.name = 'club_floor';
  roomGroup.add(floorHitMesh);

  // Outer stone slab apron under the diorama so edges feel crafted and architectural
  const apronGeo = track(new THREE.BoxGeometry(15.6, 0.36, 15.6));
  const apronMat = track(new THREE.MeshStandardMaterial({ color: 0xb7997a, roughness: 0.85 }));
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.position.y = -0.19;
  apron.receiveShadow = true;
  roomGroup.add(apron);

  // Center circular woven rug (lifted slightly with polygonOffset to avoid z-fighting)
  const rugTex = track(createWovenRugTexture(maxAnisotropy));
  const rugGeo = track(new THREE.CircleGeometry(3.15, 48));
  const rugMat = track(
    new THREE.MeshStandardMaterial({
      map: rugTex,
      transparent: true,
      roughness: 0.94,
      metalness: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  const rug = new THREE.Mesh(rugGeo, rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.008, 0.25);
  rug.receiveShadow = true;
  roomGroup.add(rug);

  // Floor click-to-walk target indicator ring
  const walkRingGeo = track(new THREE.RingGeometry(0.24, 0.34, 32));
  const walkRingMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xff6b00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const walkTargetRing = new THREE.Mesh(walkRingGeo, walkRingMat);
  walkTargetRing.rotation.x = -Math.PI / 2;
  walkTargetRing.position.y = 0.022;
  roomGroup.add(walkTargetRing);

  // === SHARED ARCHITECTURAL MATERIALS ===
  const wallPlasterMat = track(new THREE.MeshStandardMaterial({ color: 0xf7efe4, roughness: 0.9 }));
  const oakTrimMat = track(new THREE.MeshStandardMaterial({ color: 0xb9895f, roughness: 0.68 }));
  const walnutMat = track(new THREE.MeshStandardMaterial({ color: 0x6f4a32, roughness: 0.56 }));
  const brassMat = track(new THREE.MeshStandardMaterial({ color: 0xd9a85b, roughness: 0.28, metalness: 0.82 }));
  const chromeMat = track(new THREE.MeshStandardMaterial({ color: 0xdce3ea, roughness: 0.2, metalness: 0.88 }));
  const ceramicWhiteMat = track(new THREE.MeshStandardMaterial({ color: 0xfdfbf7, roughness: 0.16, metalness: 0.02 }));
  const ceramicMintMat = track(new THREE.MeshStandardMaterial({ color: 0x99d1c3, roughness: 0.18, metalness: 0.02 }));
  const ceramicTerracottaMat = track(new THREE.MeshStandardMaterial({ color: 0xc97352, roughness: 0.84 }));
  const leafMat = track(new THREE.MeshStandardMaterial({ color: 0x458057, roughness: 0.38 }));
  const leafLightMat = track(new THREE.MeshStandardMaterial({ color: 0x5d9d6c, roughness: 0.42 }));
  const warmGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfff3d4,
      emissive: 0xffcc70,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    })
  );

  // === L-SHAPED SUNLIT CAFE WALLS ===
  const wallH = 4.6;
  const backWallGeo = track(new THREE.BoxGeometry(15.2, wallH, 0.3));
  const backWall = new THREE.Mesh(backWallGeo, wallPlasterMat);
  backWall.position.set(0, wallH / 2, -7.45);
  backWall.receiveShadow = true;
  roomGroup.add(backWall);

  const leftWallGeo = track(new THREE.BoxGeometry(0.3, wallH, 15.2));
  const leftWall = new THREE.Mesh(leftWallGeo, wallPlasterMat);
  leftWall.position.set(-7.45, wallH / 2, 0);
  leftWall.receiveShadow = true;
  roomGroup.add(leftWall);

  // Oak wainscot paneling along lower walls
  const backWainscotGeo = track(new THREE.BoxGeometry(15.0, 1.15, 0.08));
  const backWainscot = new THREE.Mesh(backWainscotGeo, oakTrimMat);
  backWainscot.position.set(0, 0.575, -7.27);
  backWainscot.receiveShadow = true;
  roomGroup.add(backWainscot);

  const leftWainscotGeo = track(new THREE.BoxGeometry(0.08, 1.15, 15.0));
  const leftWainscot = new THREE.Mesh(leftWainscotGeo, oakTrimMat);
  leftWainscot.position.set(-7.27, 0.575, 0);
  leftWainscot.receiveShadow = true;
  roomGroup.add(leftWainscot);

  // Upper cornice rails
  const backCorniceGeo = track(new THREE.BoxGeometry(15.3, 0.16, 0.38));
  const backCornice = new THREE.Mesh(backCorniceGeo, walnutMat);
  backCornice.position.set(0, wallH + 0.05, -7.42);
  roomGroup.add(backCornice);

  const leftCorniceGeo = track(new THREE.BoxGeometry(0.38, 0.16, 15.3));
  const leftCornice = new THREE.Mesh(leftCorniceGeo, walnutMat);
  leftCornice.position.set(-7.42, wallH + 0.05, 0);
  roomGroup.add(leftCornice);

  // === TWO LARGE SUNLIT WINDOWS ON LEFT WALL ===
  const skyTex = track(createWindowSkyTexture());
  const windowGlassMat = track(
    new THREE.MeshBasicMaterial({
      map: skyTex,
    })
  );
  const frameBarMat = walnutMat;

  const buildWindow = (zPos: number) => {
    const winGroup = new THREE.Group();
    winGroup.position.set(-7.25, 2.75, zPos);

    const paneGeo = track(new THREE.PlaneGeometry(2.8, 2.35));
    const pane = new THREE.Mesh(paneGeo, windowGlassMat);
    pane.rotation.y = Math.PI / 2;
    pane.position.x = 0.03;
    winGroup.add(pane);

    // Outer frame bars
    const hBarGeo = track(new THREE.BoxGeometry(0.14, 0.12, 3.0));
    const topBar = new THREE.Mesh(hBarGeo, frameBarMat);
    topBar.position.y = 1.22;
    const botBar = new THREE.Mesh(hBarGeo, frameBarMat);
    botBar.position.y = -1.22;
    const midHBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.06, 2.84)), frameBarMat);
    midHBar.position.y = 0.12;
    winGroup.add(topBar, botBar, midHBar);

    const vBarGeo = track(new THREE.BoxGeometry(0.14, 2.52, 0.12));
    const leftBar = new THREE.Mesh(vBarGeo, frameBarMat);
    leftBar.position.z = -1.44;
    const rightBar = new THREE.Mesh(vBarGeo, frameBarMat);
    rightBar.position.z = 1.44;
    const midVBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 2.4, 0.06)), frameBarMat);
    winGroup.add(leftBar, rightBar, midVBar);

    // Warm sunlit patch cast onto the oak floor
    const sunPatchGeo = track(new THREE.PlaneGeometry(3.2, 2.6));
    const sunPatchMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xffe4b3,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const sunPatch = new THREE.Mesh(sunPatchGeo, sunPatchMat);
    sunPatch.rotation.x = -Math.PI / 2;
    sunPatch.position.set(2.8, -2.72, 0.25);
    winGroup.add(sunPatch);

    roomGroup.add(winGroup);
  };
  buildWindow(-2.6);
  buildWindow(2.5);

  // === PILOT ENGLISH CLUB CHALKBOARD ON BACK WALL ===
  const chalkTex = track(createChalkboardTexture());
  const boardGroup = new THREE.Group();
  boardGroup.position.set(-1.6, 2.85, -7.23);

  const boardFrameGeo = track(new THREE.BoxGeometry(4.4, 2.25, 0.1));
  const boardFrame = new THREE.Mesh(boardFrameGeo, walnutMat);
  boardFrame.castShadow = true;
  boardGroup.add(boardFrame);

  const boardSurfaceGeo = track(new THREE.PlaneGeometry(4.14, 1.98));
  const boardSurfaceMat = track(
    new THREE.MeshStandardMaterial({
      map: chalkTex,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const boardSurface = new THREE.Mesh(boardSurfaceGeo, boardSurfaceMat);
  boardSurface.position.z = 0.056;
  boardGroup.add(boardSurface);
  roomGroup.add(boardGroup);

  // === ESPRESSO COFFEE BAR COUNTER (Back-Right) ===
  const barGroup = new THREE.Group();
  barGroup.position.set(3.9, 0, -5.75);

  const barBaseGeo = track(new THREE.BoxGeometry(4.6, 1.05, 1.15));
  const barBase = new THREE.Mesh(barBaseGeo, oakTrimMat);
  barBase.position.y = 0.525;
  barBase.castShadow = true;
  barBase.receiveShadow = true;
  barGroup.add(barBase);

  const barTopGeo = track(new THREE.BoxGeometry(4.8, 0.1, 1.32));
  const barTop = new THREE.Mesh(barTopGeo, walnutMat);
  barTop.position.y = 1.08;
  barTop.castShadow = true;
  barTop.receiveShadow = true;
  barGroup.add(barTop);

  // Espresso machine (multi-part metallic silhouette)
  const machineBodyGeo = track(new THREE.BoxGeometry(0.86, 0.56, 0.54));
  const machineBody = new THREE.Mesh(machineBodyGeo, chromeMat);
  machineBody.position.set(-1.1, 1.41, -0.08);
  machineBody.castShadow = true;
  barGroup.add(machineBody);

  const machineTrayGeo = track(new THREE.BoxGeometry(0.82, 0.06, 0.24));
  const machineTray = new THREE.Mesh(machineTrayGeo, walnutMat);
  machineTray.position.set(-1.1, 1.16, 0.24);
  barGroup.add(machineTray);

  // Ceramic mugs lined up on bar
  const mugGeo = track(new THREE.CylinderGeometry(0.065, 0.055, 0.12, 14));
  [-0.35, -0.15, 0.05].forEach((mx, idx) => {
    const mug = new THREE.Mesh(mugGeo, idx === 1 ? ceramicMintMat : ceramicWhiteMat);
    mug.position.set(mx, 1.19, 0.12);
    mug.castShadow = true;
    barGroup.add(mug);
  });

  // Pastry glass cloche dome on wooden cake stand
  const standGeo = track(new THREE.CylinderGeometry(0.28, 0.14, 0.08, 20));
  const stand = new THREE.Mesh(standGeo, oakTrimMat);
  stand.position.set(1.15, 1.17, 0.05);
  barGroup.add(stand);

  const croissantMat = track(new THREE.MeshStandardMaterial({ color: 0xd99244, roughness: 0.72 }));
  const pastryGeo = track(new THREE.TorusGeometry(0.08, 0.04, 8, 12, Math.PI * 1.35));
  const pastry = new THREE.Mesh(pastryGeo, croissantMat);
  pastry.rotation.x = Math.PI / 2;
  pastry.position.set(1.15, 1.24, 0.05);
  barGroup.add(pastry);

  const clocheGeo = track(new THREE.SphereGeometry(0.25, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2));
  const clocheMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.06,
      metalness: 0.02,
      transmission: 0.82,
      transparent: true,
      opacity: 0.45,
    })
  );
  const cloche = new THREE.Mesh(clocheGeo, clocheMat);
  cloche.position.set(1.15, 1.21, 0.05);
  barGroup.add(cloche);

  // 3 Brass pendant lamps suspended above coffee bar
  const cordGeo = track(new THREE.CylinderGeometry(0.015, 0.015, 1.15, 8));
  const shadeGeo = track(new THREE.ConeGeometry(0.26, 0.28, 20, 1, true));
  const bulbGeo = track(new THREE.SphereGeometry(0.085, 12, 10));
  [-1.35, 0, 1.35].forEach((lx) => {
    const cord = new THREE.Mesh(cordGeo, walnutMat);
    cord.position.set(lx, 3.85, 0.05);
    barGroup.add(cord);

    const shade = new THREE.Mesh(shadeGeo, brassMat);
    shade.position.set(lx, 3.22, 0.05);
    shade.castShadow = true;
    barGroup.add(shade);

    const bulb = new THREE.Mesh(bulbGeo, warmGlowMat);
    bulb.position.set(lx, 3.12, 0.05);
    barGroup.add(bulb);
  });

  roomGroup.add(barGroup);

  // === BOOKSHELF NOOK (Back-Left Corner) ===
  const shelfGroup = new THREE.Group();
  shelfGroup.position.set(-5.65, 0, -6.55);

  const shelfBackGeo = track(new THREE.BoxGeometry(2.1, 2.85, 0.08));
  const shelfBack = new THREE.Mesh(shelfBackGeo, walnutMat);
  shelfBack.position.set(0, 1.425, -0.24);
  shelfGroup.add(shelfBack);

  const sidePanelGeo = track(new THREE.BoxGeometry(0.09, 2.85, 0.56));
  [-1.02, 1.02].forEach((sx) => {
    const side = new THREE.Mesh(sidePanelGeo, walnutMat);
    side.position.set(sx, 1.425, 0);
    side.castShadow = true;
    shelfGroup.add(side);
  });

  const plankGeo = track(new THREE.BoxGeometry(2.04, 0.07, 0.54));
  const bookColors = [0xe06c55, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x0ea5e9];
  const bookMats = bookColors.map((hex) =>
    track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.72 }))
  );
  const bookGeo = track(new THREE.BoxGeometry(0.08, 0.34, 0.28));

  [0.2, 0.85, 1.5, 2.15, 2.8].forEach((sy, levelIdx) => {
    const plank = new THREE.Mesh(plankGeo, oakTrimMat);
    plank.position.set(0, sy, 0);
    plank.castShadow = true;
    plank.receiveShadow = true;
    shelfGroup.add(plank);

    if (levelIdx < 4) {
      for (let b = 0; b < 9; b++) {
        const bx = -0.8 + b * 0.18 + (levelIdx % 2) * 0.05;
        const book = new THREE.Mesh(bookGeo, bookMats[(b + levelIdx * 2) % bookMats.length]);
        const hScale = 0.85 + ((b * 7 + levelIdx) % 4) * 0.1;
        book.scale.set(1, hScale, 1);
        book.position.set(bx, sy + 0.035 + 0.17 * hScale, 0.04);
        book.rotation.z = b === 8 ? -0.24 : 0;
        shelfGroup.add(book);
      }
    }
  });
  roomGroup.add(shelfGroup);

  // === 4 COZY CAFE TABLES WITH CHAIRS & MUGS (Perimeter, leaving center rug open) ===
  const tableTopGeo = track(new THREE.CylinderGeometry(0.68, 0.68, 0.07, 26));
  const tableLegGeo = track(new THREE.CylinderGeometry(0.07, 0.09, 0.72, 12));
  const tableBaseGeo = track(new THREE.CylinderGeometry(0.32, 0.38, 0.05, 18));
  const chairSeatGeo = track(new THREE.CylinderGeometry(0.26, 0.24, 0.06, 18));
  const chairLegGeo = track(new THREE.CylinderGeometry(0.025, 0.02, 0.44, 8));
  const chairBackGeo = track(new THREE.BoxGeometry(0.42, 0.34, 0.05));
  const cushionMat = track(new THREE.MeshStandardMaterial({ color: 0xe6a88c, roughness: 0.9 }));

  const buildCafeTable = (x: number, z: number, rotY: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const base = new THREE.Mesh(tableBaseGeo, walnutMat);
    base.position.y = 0.025;
    base.receiveShadow = true;
    const leg = new THREE.Mesh(tableLegGeo, walnutMat);
    leg.position.y = 0.39;
    leg.castShadow = true;
    const top = new THREE.Mesh(tableTopGeo, oakTrimMat);
    top.position.y = 0.76;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(base, leg, top);

    // 2 Coffee mugs + open English notebook on tabletop
    const mugA = new THREE.Mesh(mugGeo, ceramicWhiteMat);
    mugA.position.set(-0.22, 0.855, 0.14);
    mugA.castShadow = true;
    const mugB = new THREE.Mesh(mugGeo, ceramicMintMat);
    mugB.position.set(0.24, 0.855, -0.18);
    mugB.castShadow = true;
    group.add(mugA, mugB);

    const notebookGeo = track(new THREE.BoxGeometry(0.32, 0.024, 0.22));
    const notebook = new THREE.Mesh(notebookGeo, ceramicWhiteMat);
    notebook.position.set(0.04, 0.808, 0.2);
    notebook.rotation.y = 0.35;
    group.add(notebook);

    // 2 Chairs flanking table
    [-0.95, 0.95].forEach((cx) => {
      const chair = new THREE.Group();
      chair.position.set(cx, 0, 0);
      chair.rotation.y = cx < 0 ? Math.PI / 2 : -Math.PI / 2;

      const seat = new THREE.Mesh(chairSeatGeo, cushionMat);
      seat.position.y = 0.45;
      seat.castShadow = true;
      seat.receiveShadow = true;
      chair.add(seat);

      [
        [-0.16, -0.16],
        [0.16, -0.16],
        [-0.16, 0.16],
        [0.16, 0.16],
      ].forEach(([lx, lz]) => {
        const cLeg = new THREE.Mesh(chairLegGeo, walnutMat);
        cLeg.position.set(lx, 0.22, lz);
        cLeg.castShadow = true;
        chair.add(cLeg);
      });

      const back = new THREE.Mesh(chairBackGeo, oakTrimMat);
      back.position.set(0, 0.72, -0.22);
      back.rotation.x = -0.12;
      back.castShadow = true;
      chair.add(back);

      group.add(chair);
    });

    roomGroup.add(group);
  };

  buildCafeTable(-4.4, -3.0, 0.35);
  buildCafeTable(4.4, -1.6, -0.4);
  buildCafeTable(-4.3, 3.2, -0.25);
  buildCafeTable(4.3, 3.4, 0.45);

  // === 4 POTTED INDOOR PLANTS IN TERRACOTTA PLANTERS ===
  const potGeo = track(new THREE.CylinderGeometry(0.28, 0.2, 0.42, 16));
  const soilMat = track(new THREE.MeshStandardMaterial({ color: 0x4b382c, roughness: 0.95 }));
  const soilGeo = track(new THREE.CircleGeometry(0.25, 16));
  const stemGeo = track(new THREE.CylinderGeometry(0.032, 0.045, 0.72, 8));
  const leafGeo = track(new THREE.SphereGeometry(0.24, 12, 10));

  const buildPottedPlant = (x: number, z: number, scale = 1) => {
    const plant = new THREE.Group();
    plant.position.set(x, 0, z);
    plant.scale.setScalar(scale);

    const pot = new THREE.Mesh(potGeo, ceramicTerracottaMat);
    pot.position.y = 0.21;
    pot.castShadow = true;
    pot.receiveShadow = true;
    plant.add(pot);

    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.415;
    plant.add(soil);

    const stem = new THREE.Mesh(stemGeo, walnutMat);
    stem.position.y = 0.75;
    stem.castShadow = true;
    plant.add(stem);

    const clusterSpec = [
      { x: 0, y: 1.24, z: 0, sx: 1.25, sy: 0.78, sz: 1.25, light: true },
      { x: -0.22, y: 1.04, z: 0.16, sx: 1.05, sy: 0.65, sz: 0.95, light: false },
      { x: 0.24, y: 1.06, z: -0.14, sx: 1.05, sy: 0.65, sz: 0.95, light: true },
      { x: 0.14, y: 0.96, z: 0.24, sx: 0.95, sy: 0.6, sz: 0.95, light: false },
      { x: -0.2, y: 0.98, z: -0.22, sx: 0.95, sy: 0.6, sz: 0.95, light: false },
    ];
    clusterSpec.forEach((c) => {
      const leaf = new THREE.Mesh(leafGeo, c.light ? leafLightMat : leafMat);
      leaf.scale.set(c.sx, c.sy, c.sz);
      leaf.position.set(c.x, c.y, c.z);
      leaf.castShadow = true;
      plant.add(leaf);
    });

    roomGroup.add(plant);
  };

  buildPottedPlant(-6.4, -0.15, 1.05);
  buildPottedPlant(-6.35, 5.4, 0.95);
  buildPottedPlant(6.45, -5.6, 1.1);
  buildPottedPlant(6.35, 5.4, 0.95);

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return {
    roomGroup,
    floorHitMesh,
    walkTargetRing,
    dispose,
  };
}
