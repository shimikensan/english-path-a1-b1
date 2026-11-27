import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Sparkles,
  User,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { EquippedPilotGear } from '../../data/pilotGearCatalog';
import {
  buildPilotAvatar,
  createContactShadowTexture,
  createHangarPedestalTexture,
  type PilotRigHandles,
} from './buildPilotAvatar';

type CameraPresetId = 'full' | 'head' | 'back' | 'hero';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'full',
    label: 'Toàn thân',
    position: [0.35, 1.48, 3.65],
    target: [0, 1.02, 0],
  },
  {
    id: 'head',
    label: 'Mũ & Kính',
    position: [0.22, 1.72, 1.95],
    target: [0, 1.54, 0],
  },
  {
    id: 'back',
    label: 'Phản lực sau',
    position: [-1.45, 1.52, -2.85],
    target: [0, 1.08, 0],
  },
  {
    id: 'hero',
    label: 'Góc 3/4',
    position: [2.15, 1.62, 2.75],
    target: [0, 1.05, 0],
  },
];

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '')
      : '';
    const isSoft = /SwiftShader|llvmpipe|Software|Basic Render Driver/i.test(rendererStr);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return isSoft;
  } catch {
    return true;
  }
}

export interface Pilot3DCanvasProps {
  equipped: EquippedPilotGear;
  celebrateTrigger?: number;
  previewBadgeText?: string | null;
  className?: string;
}

export function Pilot3DCanvas({
  equipped,
  celebrateTrigger = 0,
  previewBadgeText = null,
  className = '',
}: Pilot3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('full');
  const [autoRotate, setAutoRotate] = useState(true);
  const [dockExpanded, setDockExpanded] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Refs shared between React controls and Three.js loop without recreating renderer
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rigRef = useRef<PilotRigHandles | null>(null);
  const isSoftRef = useRef<boolean>(false);
  const autoRotateRef = useRef<boolean>(autoRotate);
  const desiredCamPosRef = useRef<THREE.Vector3 | null>(null);
  const desiredTargetRef = useRef<THREE.Vector3 | null>(null);
  const celebrateTimerRef = useRef<number>(0);
  const equippedKeyRef = useRef<string>('');

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const applyCameraPreset = (presetId: CameraPresetId) => {
    const found = CAMERA_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePreset(presetId);
    desiredCamPosRef.current = new THREE.Vector3(...found.position);
    desiredTargetRef.current = new THREE.Vector3(...found.target);
  };

  const triggerWaveEmote = () => {
    celebrateTimerRef.current = 1.35;
  };

  // Trigger celebration bounce/wave when parent increments celebrateTrigger
  useEffect(() => {
    if (celebrateTrigger > 0) {
      celebrateTimerRef.current = 1.45;
    }
  }, [celebrateTrigger]);

  // Mount Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    isSoftRef.current = isSoftwareGl;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglError('Trình duyệt hiện chưa bật WebGL để hiển thị nhân vật phi công 3D.');
      return;
    }

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 360);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    if (!isSoftwareGl) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07111F');
    scene.fog = new THREE.FogExp2('#07111F', 0.042);
    sceneRef.current = scene;

    // Studio IBL reflections via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;

    // Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
    camera.position.set(0.35, 1.48, 3.65);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.02, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 1.65;
    controls.maxDistance = 5.8;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 1.1;
    controls.update();

    // User drag cancels any ongoing camera preset lerp
    const handleControlsStart = () => {
      desiredCamPosRef.current = null;
      desiredTargetRef.current = null;
    };
    controls.addEventListener('start', handleControlsStart);

    // 3-Point Studio Hangar Lighting
    const hemiLight = new THREE.HemisphereLight('#DCEBFF', '#1E293B', 0.82);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFF3E0', 2.2);
    keyLight.position.set(3.2, 5.2, 3.8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 14;
      keyLight.shadow.camera.left = -2.4;
      keyLight.shadow.camera.right = 2.4;
      keyLight.shadow.camera.top = 3.0;
      keyLight.shadow.camera.bottom = -1.2;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#FF8524', 1.25);
    rimLight.position.set(-3.4, 2.8, -3.2);
    scene.add(rimLight);

    const coolFill = new THREE.DirectionalLight('#38BDF8', 0.65);
    coolFill.position.set(-2.6, 1.9, 2.6);
    scene.add(coolFill);

    // Track local environment resources for clean disposal
    const envGeometries: THREE.BufferGeometry[] = [];
    const envMaterials: THREE.Material[] = [];
    const envTextures: THREE.Texture[] = [];

    // --- Hangar Turntable Pedestal ---
    const pedestalGroup = new THREE.Group();
    const maxAniso = isSoftwareGl ? 1 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const topDeckTex = createHangarPedestalTexture(maxAniso);
    envTextures.push(topDeckTex);

    const baseCylGeo = new THREE.CylinderGeometry(1.18, 1.32, 0.16, 48);
    const baseSideMat = new THREE.MeshStandardMaterial({
      color: '#132238',
      roughness: 0.42,
      metalness: 0.72,
    });
    const baseTopMat = new THREE.MeshStandardMaterial({
      map: topDeckTex,
      roughness: 0.45,
      metalness: 0.35,
    });
    envGeometries.push(baseCylGeo);
    envMaterials.push(baseSideMat, baseTopMat);

    const pedestalMesh = new THREE.Mesh(baseCylGeo, [baseSideMat, baseTopMat, baseSideMat]);
    pedestalMesh.position.y = -0.08;
    pedestalMesh.receiveShadow = !isSoftwareGl;
    pedestalGroup.add(pedestalMesh);

    // Glowing cockpit-orange rim ring around the turntable
    const rimRingGeo = new THREE.TorusGeometry(1.19, 0.022, 12, 64);
    const rimRingMat = new THREE.MeshStandardMaterial({
      color: '#FF7E1F',
      emissive: '#FF6B00',
      emissiveIntensity: 1.5,
      roughness: 0.25,
      metalness: 0.5,
    });
    envGeometries.push(rimRingGeo);
    envMaterials.push(rimRingMat);
    const rimRing = new THREE.Mesh(rimRingGeo, rimRingMat);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = -0.005;
    pedestalGroup.add(rimRing);

    // Subtle secondary dark steel lower ring
    const lowerStepGeo = new THREE.CylinderGeometry(1.42, 1.54, 0.08, 48);
    const lowerStepMat = new THREE.MeshStandardMaterial({
      color: '#0C1728',
      roughness: 0.55,
      metalness: 0.65,
    });
    envGeometries.push(lowerStepGeo);
    envMaterials.push(lowerStepMat);
    const lowerStep = new THREE.Mesh(lowerStepGeo, lowerStepMat);
    lowerStep.position.y = -0.2;
    pedestalGroup.add(lowerStep);

    // Hangar subtle floor plane fading smoothly into fog
    const floorGeo = new THREE.CircleGeometry(14, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#081324',
      roughness: 0.78,
      metalness: 0.22,
    });
    envGeometries.push(floorGeo);
    envMaterials.push(floorMat);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.242;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Grounded contact shadow directly beneath the pilot's boots
    const contactShadowTex = createContactShadowTexture();
    envTextures.push(contactShadowTex);
    const contactGeo = new THREE.PlaneGeometry(1.1, 1.1);
    const contactMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
    envGeometries.push(contactGeo);
    envMaterials.push(contactMat);
    const contactShadow = new THREE.Mesh(contactGeo, contactMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.003;
    pedestalGroup.add(contactShadow);

    scene.add(pedestalGroup);

    // --- Decorative Floating Knowledge Gems around Hangar Perimeter ---
    const gemOrbitGroup = new THREE.Group();
    const gemGeo = new THREE.OctahedronGeometry(0.068, 0);
    const gemMatCyan = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#0284C7',
      emissiveIntensity: 0.85,
      roughness: 0.14,
      metalness: 0.25,
    });
    const gemMatOrange = new THREE.MeshStandardMaterial({
      color: '#FB923C',
      emissive: '#EA580C',
      emissiveIntensity: 0.75,
      roughness: 0.16,
      metalness: 0.3,
    });
    envGeometries.push(gemGeo);
    envMaterials.push(gemMatCyan, gemMatOrange);

    const floatingGems: Array<{ mesh: THREE.Mesh; baseY: number; phase: number }> = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const radius = 1.92 + (i % 2) * 0.28;
      const baseY = 0.55 + (i % 3) * 0.42;
      const mesh = new THREE.Mesh(gemGeo, i % 2 === 0 ? gemMatCyan : gemMatOrange);
      mesh.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
      gemOrbitGroup.add(mesh);
      floatingGems.push({ mesh, baseY, phase: i * 1.1 });
    }
    scene.add(gemOrbitGroup);

    // --- Initial Pilot Avatar ---
    const initialRig = buildPilotAvatar(equipped, isSoftwareGl);
    scene.add(initialRig.root);
    rigRef.current = initialRig;
    equippedKeyRef.current = JSON.stringify(equipped);

    // Pre-compile shaders only on hardware GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // ResizeObserver for crisp layout transitions
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 240);
        const h = Math.max(Math.floor(entry.contentRect.height), 280);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    // WebGL context lost / restored handling
    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // Animation loop with software WebGL pacing (`afterDraw`)
    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const afterDraw = (next: () => void) => {
      const gl = renderer.getContext();
      if (gl instanceof WebGL2RenderingContext) {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          if (!sync || gl.clientWaitSync(sync, 0, 0) !== gl.TIMEOUT_EXPIRED) {
            if (sync) gl.deleteSync(sync);
            timerId = window.setTimeout(() => {
              if (!disposed) next();
            }, 80);
          } else {
            timerId = window.setTimeout(poll, 16);
          }
        };
        timerId = window.setTimeout(poll, 16);
      } else {
        timerId = window.setTimeout(() => {
          if (!disposed) next();
        }, 120);
      }
    };

    const tick = () => {
      if (disposed) return;

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      // Sync autoRotate toggle cleanly
      controls.autoRotate = autoRotateRef.current && desiredCamPosRef.current === null;

      // Damped camera preset transitions
      if (desiredCamPosRef.current && desiredTargetRef.current) {
        const lambda = 6.5;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          desiredCamPosRef.current.x,
          lambda,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          desiredCamPosRef.current.y,
          lambda,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          desiredCamPosRef.current.z,
          lambda,
          dt
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          desiredTargetRef.current.x,
          lambda,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          desiredTargetRef.current.y,
          lambda,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          desiredTargetRef.current.z,
          lambda,
          dt
        );

        if (
          camera.position.distanceTo(desiredCamPosRef.current) < 0.015 &&
          controls.target.distanceTo(desiredTargetRef.current) < 0.015
        ) {
          desiredCamPosRef.current = null;
          desiredTargetRef.current = null;
        }
      }

      // Animate Pilot Avatar
      const rig = rigRef.current;
      if (rig) {
        const breath = Math.sin(elapsed * 2.2);
        let bounceY = 0;
        let celebrateWave = 0;

        if (celebrateTimerRef.current > 0) {
          celebrateTimerRef.current = Math.max(0, celebrateTimerRef.current - dt);
          const progress = 1 - celebrateTimerRef.current / 1.45;
          bounceY = Math.abs(Math.sin(progress * Math.PI * 2)) * 0.11;
          celebrateWave = Math.sin(elapsed * 14) * 0.32;
        }

        rig.bodyGroup.position.y = breath * 0.014 + bounceY;
        rig.headGroup.rotation.y = Math.sin(elapsed * 0.9) * 0.11;
        rig.headGroup.rotation.x = Math.sin(elapsed * 1.4) * 0.035;

        if (celebrateTimerRef.current > 0) {
          rig.rightArm.rotation.z = THREE.MathUtils.damp(
            rig.rightArm.rotation.z,
            2.45 + celebrateWave,
            10,
            dt
          );
          rig.leftArm.rotation.z = THREE.MathUtils.damp(
            rig.leftArm.rotation.z,
            -0.38,
            8,
            dt
          );
        } else {
          rig.rightArm.rotation.z = THREE.MathUtils.damp(
            rig.rightArm.rotation.z,
            0.14 + Math.sin(elapsed * 2.0) * 0.04,
            6,
            dt
          );
          rig.leftArm.rotation.z = THREE.MathUtils.damp(
            rig.leftArm.rotation.z,
            -0.14 - Math.sin(elapsed * 2.0) * 0.04,
            6,
            dt
          );
        }

        if (rig.scarfTail) {
          rig.scarfTail.rotation.x = 0.25 + Math.sin(elapsed * 3.8) * 0.14;
          rig.scarfTail.rotation.z = Math.sin(elapsed * 2.4) * 0.08;
        }

        if (rig.wingLeft && rig.wingRight) {
          const flutter = Math.sin(elapsed * 3.2) * 0.08;
          rig.wingLeft.rotation.y = 0.28 + flutter;
          rig.wingRight.rotation.y = -0.28 - flutter;
        }

        if (rig.jetFlameLeft && rig.jetFlameRight) {
          const flicker = 0.85 + Math.sin(elapsed * 24) * 0.22;
          rig.jetFlameLeft.scale.set(1, flicker, 1);
          rig.jetFlameRight.scale.set(1, 0.9 + Math.cos(elapsed * 26) * 0.2, 1);
        }

        if (rig.companionOrbit) {
          rig.companionOrbit.rotation.y = elapsed * 0.72;
          rig.companionOrbit.position.y = Math.sin(elapsed * 2.6) * 0.07;
        }
        if (rig.companionSpinner) {
          rig.companionSpinner.rotation.z = elapsed * 14;
        }
      }

      // Gently orbit perimeter knowledge gems
      gemOrbitGroup.rotation.y = elapsed * 0.16;
      for (const item of floatingGems) {
        item.mesh.position.y = item.baseY + Math.sin(elapsed * 1.8 + item.phase) * 0.09;
        item.mesh.rotation.y = elapsed * 1.4 + item.phase;
        item.mesh.rotation.x = Math.sin(elapsed * 0.9 + item.phase) * 0.25;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      if (rigRef.current) {
        scene.remove(rigRef.current.root);
        rigRef.current.dispose();
        rigRef.current = null;
      }

      for (const g of envGeometries) g.dispose();
      for (const m of envMaterials) m.dispose();
      for (const t of envTextures) t.dispose();

      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hot-swap 3D pilot rig when equipped gear changes (without tearing down WebGLRenderer)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const nextKey = JSON.stringify(equipped);
    if (nextKey === equippedKeyRef.current) return;
    equippedKeyRef.current = nextKey;

    if (rigRef.current) {
      scene.remove(rigRef.current.root);
      rigRef.current.dispose();
      rigRef.current = null;
    }

    const nextRig = buildPilotAvatar(equipped, isSoftRef.current);
    scene.add(nextRig.root);
    rigRef.current = nextRig;
    celebrateTimerRef.current = 1.15;
  }, [equipped]);

  if (webglError) {
    return (
      <div
        className={`relative rounded-2xl bg-[#07111F] border border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-300 ${className}`}
      >
        <User className="w-10 h-10 text-[#FF8524] mb-3" />
        <p className="text-sm font-semibold text-white">{webglError}</p>
        <p className="text-xs text-slate-400 mt-1">
          Vui lòng thử mở trên Chrome, Edge hoặc bật tăng tốc phần cứng WebGL.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#07111F] border border-slate-800 select-none ${className}`}
    >
      {/* Dedicated isolated WebGL canvas mount — never shares children with React overlays */}
      <div ref={mountRef} className="w-full h-full min-h-[400px]" />

      {/* Top minimal unboxed preview notice (solid dark surface, zero backdrop-filter) */}
      {previewBadgeText && (
        <div
          className="absolute top-3.5 left-3.5 right-3.5 sm:right-auto pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#FF6B00]/60 text-xs font-semibold text-amber-200"
          style={{ backgroundColor: 'rgba(12, 23, 40, 0.92)' }}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FF8524] shrink-0" />
          <span className="truncate">{previewBadgeText}</span>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (solid dark surface, zero backdrop-filter, zero side cards) */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-center pointer-events-none">
        <div
          className="pointer-events-auto rounded-xl border border-slate-700/90 text-slate-100 shadow-lg max-w-full"
          style={{ backgroundColor: 'rgba(9, 17, 30, 0.92)' }}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <Camera className="w-3.5 h-3.5 text-[#FF8524]" />
              <span>Góc nhìn 3D</span>
              <span className="hidden sm:inline text-slate-500">· Kéo xoay / Cuộn thu phóng</span>
            </div>
            <button
              type="button"
              onClick={() => setDockExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-expanded={dockExpanded}
              aria-label={dockExpanded ? 'Thu gọn thanh điều khiển 3D' : 'Mở rộng thanh điều khiển 3D'}
            >
              <span>{dockExpanded ? 'Thu gọn' : 'Mở điều khiển'}</span>
              {dockExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {dockExpanded && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 px-2.5 pb-2.5 pt-1 border-t border-slate-800">
              {CAMERA_PRESETS.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyCameraPreset(preset.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              <span className="h-4 w-px bg-slate-700 mx-0.5 hidden sm:inline-block" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setAutoRotate((prev) => !prev)}
                aria-pressed={autoRotate}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  autoRotate
                    ? 'bg-sky-600/25 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{autoRotate ? 'Đang xoay' : 'Tự xoay'}</span>
              </button>

              <button
                type="button"
                onClick={triggerWaveEmote}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vẫy chào</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
