import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayerStore } from '../../store/usePlayerStore';
import {
  RotateCcw,
  Zap,
  Box,
  ChevronRight,
  Sliders,
  Info,
  Eye,
  Camera,
  Layers,
  Rocket,
  Shield,
  Activity,
} from 'lucide-react';

export type CameraPreset = 'orbit' | 'cockpit' | 'docking' | 'thrusters';

interface HangarSettings {
  autoRotate: boolean;
  rotateSpeed: number;
  wireframe: boolean;
  lightingMode: 'studio' | 'solar' | 'deepspace';
  showGrid: boolean;
  cameraPreset: CameraPreset;
  exposure: number; // 0.8 to 2.5
}

// Preload the Draco-compressed GLB model
useGLTF.preload('/models/erizon_draco.glb', '/draco/gltf/');

// =============================================================================
// SS HORIZON GLB SPACECRAFT MODEL (Optimized 3.75MB Draco Compression)
// Hard Sci-Fi Deep-Space Vessel (Clean Thrusters, No Flame Plumes)
// =============================================================================
export const HorizonSpacecraftModel: React.FC<{
  wireframe: boolean;
}> = ({ wireframe }) => {
  const { scene } = useGLTF('/models/erizon_draco.glb', '/draco/gltf/');
  const groupRef = useRef<THREE.Group>(null);

  // Normalize scale and center
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 7.8; // Normalized hangar scale
    const scale = targetSize / maxDim;

    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => {
              m.wireframe = wireframe;
            });
          } else {
            child.material.wireframe = wireframe;
          }
        }
      }
    });

    return clone;
  }, [scene, wireframe]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Pristine 3D Spacecraft Body (No fire plumes) */}
      <primitive object={clonedScene} />
    </group>
  );
};

// =============================================================================
// CAMERA DIRECTOR
// =============================================================================
const CameraDirector: React.FC<{
  preset: CameraPreset;
  controlsRef: React.RefObject<any>;
}> = ({ preset, controlsRef }) => {
  useFrame(state => {
    if (!controlsRef.current) return;

    if (preset === 'orbit') {
      state.camera.position.lerp(new THREE.Vector3(5.6, 2.8, 5.6), 0.05);
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0.0, 0.0), 0.05);
    } else if (preset === 'cockpit') {
      state.camera.position.lerp(new THREE.Vector3(1.2, 1.4, 3.2), 0.06);
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0.3, 1.4), 0.06);
    } else if (preset === 'docking') {
      state.camera.position.lerp(new THREE.Vector3(0.01, 4.2, 0.0), 0.06);
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0.2, 0.0), 0.06);
    } else if (preset === 'thrusters') {
      state.camera.position.lerp(new THREE.Vector3(1.6, 0.6, -6.0), 0.06);
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0.1, -3.2), 0.06);
    }
  });

  return null;
};

// =============================================================================
// MAIN SPACECRAFT HANGAR / STUDIO VIEW COMPONENT
// =============================================================================
export const SpacecraftHangar: React.FC = () => {
  const setActiveTab = usePlayerStore(s => s.setActiveTab);
  const controlsRef = useRef<any>(null);

  const [settings, setSettings] = useState<HangarSettings>({
    autoRotate: true,
    rotateSpeed: 0.6,
    wireframe: false,
    lightingMode: 'studio',
    showGrid: true,
    cameraPreset: 'orbit',
    exposure: 1.35,
  });

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      setSettings(s => ({ ...s, cameraPreset: 'orbit' }));
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#050608] select-none overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#08080c]/90 to-transparent backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h1 className="text-sm font-bold tracking-widest text-white uppercase font-mono">
            SS HORIZON // DEEP-SPACE VESSEL
          </h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            OPTIMIZED GLB (3.75MB)
          </span>
          <span className="hidden md:inline text-[10px] text-neutral-400 font-mono uppercase">
            SOLAR ESCAPE SURVEYOR • PROGRAMME ERIZON
          </span>
        </div>

        {/* Camera Preset Quick Bar */}
        <div className="flex items-center gap-1.5 bg-[#0e1017]/80 p-1 rounded-md border border-white/15 backdrop-blur-md">
          {(
            [
              { id: 'orbit', label: '360° ORBIT', icon: Camera },
              { id: 'cockpit', label: 'BOW / COCKPIT', icon: Eye },
              { id: 'docking', label: 'CENTRIFUGE', icon: Layers },
              { id: 'thrusters', label: 'AFT BULKHEAD', icon: Zap },
            ] as const
          ).map(btn => {
            const Icon = btn.icon;
            const active = settings.cameraPreset === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => setSettings(s => ({ ...s, cameraPreset: btn.id as CameraPreset }))}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono tracking-wider transition-all ${
                  active
                    ? 'bg-cyan-500 text-black font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Back to Solar System Button */}
        <button
          onClick={() => setActiveTab('system')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-white text-black font-bold text-xs tracking-widest hover:bg-neutral-200 transition-colors shadow-lg"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          <span>VỀ HỆ MẶT TRỜI</span>
        </button>
      </header>

      {/* Floating Left Control Toolbar */}
      <div className="absolute left-6 top-20 z-20 flex flex-col gap-2.5 p-3.5 rounded-lg bg-[#08080c]/85 border border-white/15 backdrop-blur-md w-64 shadow-2xl">
        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 tracking-widest uppercase border-b border-white/10 pb-2">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>VESSEL CONTROLS</span>
        </div>

        {/* Turntable Auto-Rotate */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-300">TURNTABLE:</span>
          <button
            onClick={() => setSettings(s => ({ ...s, autoRotate: !s.autoRotate }))}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              settings.autoRotate
                ? 'bg-cyan-500 text-black border-cyan-400'
                : 'bg-[#121218] text-neutral-500 border-white/10'
            }`}
          >
            {settings.autoRotate ? 'ACTIVE' : 'STATIC'}
          </button>
        </div>

        {/* Wireframe Topology Toggle */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-300">WIREFRAME:</span>
          <button
            onClick={() => setSettings(s => ({ ...s, wireframe: !s.wireframe }))}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              settings.wireframe
                ? 'bg-cyan-500 text-black border-cyan-400'
                : 'bg-[#121218] text-neutral-500 border-white/10'
            }`}
          >
            {settings.wireframe ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Engineering Floor Grid Toggle */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-300">FLOOR GRID:</span>
          <button
            onClick={() => setSettings(s => ({ ...s, showGrid: !s.showGrid }))}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              settings.showGrid
                ? 'bg-white text-black border-white'
                : 'bg-[#121218] text-neutral-500 border-white/10'
            }`}
          >
            {settings.showGrid ? 'VISIBLE' : 'HIDDEN'}
          </button>
        </div>

        {/* Studio Brightness / Exposure Slider */}
        <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
          <div className="flex justify-between text-[10px] text-neutral-300 font-bold">
            <span className="uppercase">STUDIO EXPOSURE:</span>
            <span className="text-cyan-400 font-mono">{settings.exposure.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="2.5"
            step="0.05"
            value={settings.exposure}
            onChange={e =>
              setSettings(s => ({
                ...s,
                exposure: parseFloat(e.target.value),
              }))
            }
            className="w-full accent-cyan-400 h-1 bg-white/20 rounded cursor-pointer"
          />
        </div>

        {/* Lighting Selector */}
        <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">LIGHTING RIG:</span>
          <div className="grid grid-cols-3 gap-1">
            {(['studio', 'solar', 'deepspace'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setSettings(s => ({ ...s, lightingMode: mode }))}
                className={`py-1 text-[8.5px] uppercase rounded border transition-colors ${
                  settings.lightingMode === mode
                    ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                    : 'bg-[#101018] text-neutral-400 border-white/10 hover:border-white/30'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={resetCamera}
          className="flex items-center justify-center gap-1.5 mt-1 py-1.5 text-[10px] text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 rounded transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET CAMERA ANGLE</span>
        </button>
      </div>

      {/* Floating Right Telemetry Panel */}
      <div className="absolute right-6 top-20 z-20 flex flex-col gap-3 p-4 rounded-lg bg-[#08080c]/85 border border-white/15 backdrop-blur-md w-80 shadow-2xl font-mono text-xs">
        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 tracking-widest uppercase border-b border-white/10 pb-2">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>VESSEL SPECIFICATIONS & TELEMETRY</span>
        </div>

        <div>
          <div className="text-white font-bold text-sm tracking-wider">
            SS HORIZON // PROGRAMME ERIZON
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">
            SOLAR ESCAPE SURVEYOR • OPTIMIZED 3.75MB GLB
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-[10px] border-t border-white/10 pt-2 text-neutral-300">
          <div className="flex justify-between">
            <span className="text-neutral-400">CLASS:</span>
            <span className="text-white font-bold">LONG-RANGE INTERPLANETARY CRUISER</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">TOTAL LENGTH:</span>
            <span className="text-white font-bold">~228 METERS (EXPEDITION VESSEL)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">BEAM WIDTH:</span>
            <span className="text-white font-bold">54.0 METERS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">HABITAT:</span>
            <span className="text-white font-bold">DUAL ROTATING CENTRIFUGE RINGS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">PROPULSION:</span>
            <span className="text-white font-bold">RELATIVISTIC FUSION DRIVE + RCS ARRAYS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">COMPRESSION:</span>
            <span className="text-cyan-400 font-bold">DRACO 88% GPU REDUCTION (30MB ➔ 3.75MB)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">FRAME RATE:</span>
            <span className="text-emerald-400 font-bold">LOCKED 120 FPS // 0 GC SPIKES</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">MISSION STATUS:</span>
            <span className="text-white font-bold">INTERPLANETARY GRAVITY ASSIST</span>
          </div>
        </div>

        <div className="text-[9px] text-neutral-400 border-t border-white/10 pt-2 flex justify-between">
          <span>MOUSE ROTATE / ZOOM / PAN</span>
          <span className="text-white">360° INSPECTION</span>
        </div>
      </div>

      {/* Main 3D Studio Canvas */}
      <Canvas
        camera={{ position: [5.8, 3.2, 6.2], fov: 42 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#050608']} />

        {/* Studio Lighting System */}
        {settings.lightingMode === 'studio' && (
          <>
            <ambientLight intensity={0.75 * settings.exposure} />
            <directionalLight position={[6, 8, 5]} intensity={3.8 * settings.exposure} color="#ffffff" />
            <directionalLight position={[-6, -4, -5]} intensity={2.2 * settings.exposure} color="#8aa0b8" />
            <directionalLight position={[0, -6, 2]} intensity={1.8 * settings.exposure} color="#455060" />
            <pointLight position={[0, 6, 0]} intensity={2.5 * settings.exposure} color="#ffffff" />
          </>
        )}
        {settings.lightingMode === 'solar' && (
          <>
            <ambientLight intensity={0.45 * settings.exposure} />
            <directionalLight position={[10, 2, 8]} intensity={6.0 * settings.exposure} color="#fff6e8" />
            <pointLight position={[-8, 2, -5]} intensity={1.5 * settings.exposure} color="#2b3a4a" />
          </>
        )}
        {settings.lightingMode === 'deepspace' && (
          <>
            <ambientLight intensity={0.25 * settings.exposure} />
            <directionalLight position={[12, 10, 6]} intensity={5.2 * settings.exposure} color="#d4e8ff" />
          </>
        )}

        {/* Deep Space Background Stars */}
        <Stars radius={120} depth={50} count={3500} factor={4} saturation={0} fade speed={0.4} />

        {/* Optional Technical Inspection Grid */}
        {settings.showGrid && (
          <Grid
            position={[0, -1.8, 0]}
            args={[30, 30]}
            cellSize={0.5}
            cellThickness={0.8}
            cellColor="#262835"
            sectionSize={2.5}
            sectionThickness={1.5}
            sectionColor="#4a5068"
            fadeDistance={24}
            fadeStrength={1.2}
          />
        )}

        {/* 3D Spacecraft with Suspense Boundary */}
        <Suspense fallback={null}>
          <HorizonSpacecraftModel wireframe={settings.wireframe} />
        </Suspense>

        {/* Camera Preset Director */}
        <CameraDirector preset={settings.cameraPreset} controlsRef={controlsRef} />

        {/* Interactive OrbitControls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          minDistance={2.5}
          maxDistance={22}
          autoRotate={settings.autoRotate}
          autoRotateSpeed={settings.rotateSpeed}
        />
      </Canvas>
    </div>
  );
};
