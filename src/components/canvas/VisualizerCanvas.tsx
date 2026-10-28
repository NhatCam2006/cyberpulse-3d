import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SolarSystemCore } from './concepts/SolarSystemCore';
import { heliocentricPositions } from '../../utils/celestialMechanics';
import { HorizonSpacecraft } from './concepts/HorizonSpacecraft';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AudioEngine } from '../../audio/AudioEngine';

const PLANET_ZOOM_DISTANCES: Record<string, number> = {
  Sol: 2.10,
  Mercury: 0.20,
  Venus: 0.24,
  Earth: 0.26,
  Mars: 0.22,
  Jupiter: 0.88,
  Saturn: 1.15,
  Uranus: 0.72,
  Neptune: 0.72,
  Ceres: 0.16,
  Pluto: 0.18,
};

// 0 GC Static Vectors for Camera & Eye Adaptation
const _camTarget = new THREE.Vector3();
const _defaultTarget = new THREE.Vector3(0, 0, 0);
const _camDir = new THREE.Vector3();
const _sunDir = new THREE.Vector3();

const CameraRig = () => {
  const cameraMode = usePlayerStore(state => state.cameraMode);
  const selectedPlanet = usePlayerStore(state => state.selectedPlanet);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  // Cinematic Dolly Micro-Drift State (Climax / Drop recoil & smooth recovery)
  const climaxDriftRef = useRef({
    energy: 0.0,
    amplitude: 0.0,
    cooldown: 0.0,
  });

  useFrame((state, delta) => {
    const engine = AudioEngine.getInstance();
    const audioData = engine.update();
    const { beatIntensity, isClimax, climaxIntensity } = audioData;

    // Cinematic Dolly Micro-Drift Dynamics (Drop Recoil & Ecliptic Elevation)
    const drift = climaxDriftRef.current;
    drift.cooldown = Math.max(0, drift.cooldown - delta);

    if (isClimax && drift.cooldown <= 0) {
      drift.energy = Math.max(0.80, climaxIntensity || 1.0);
      drift.cooldown = 6.5; // Lockout synchronized with CME expansion lifecycle
    }

    // Natural dissipation (eases back to zero over ~4.8s)
    drift.energy = Math.max(0, drift.energy - delta * 0.21);

    // Asymmetric camera physics: snappy shockwave recoil (0.12), gentle floating return (0.032)
    const lerpRate = drift.energy > drift.amplitude ? 0.12 : 0.032;
    drift.amplitude += (drift.energy - drift.amplitude) * lerpRate;

    const driftDist = drift.amplitude * 2.4;        // Pull back up to +2.4 units (~18% wider vista)
    const driftElevation = drift.amplitude * 1.15;  // Elevate view angle by 2.2 - 2.8 degrees
    const driftFov = drift.amplitude * 2.2;         // Micro dolly-zoom expansion (+2.2 deg FOV)

    // Dynamic FOV Dolly-Zoom & Observation Deck Framing
    // In spacecraft mode: 100% rock-solid 52.0° FOV, completely immune to CME/drop zooms or music shake
    const baseFov = cameraMode === 'spacecraft' ? 52.0 : 46.0;
    const targetFov = cameraMode === 'spacecraft' ? 52.0 : (baseFov + driftFov);
    if ('fov' in state.camera) {
      const persCam = state.camera as THREE.PerspectiveCamera;
      if (Math.abs(persCam.fov - targetFov) > 0.02) {
        persCam.fov = THREE.MathUtils.lerp(persCam.fov, targetFov, 0.08);
        persCam.updateProjectionMatrix();
      }
    }

    // Dynamic Optical Exposure Adaptation (Pillar V - Eye Adaptation)
    state.camera.getWorldDirection(_camDir);
    _sunDir.copy(state.camera.position).negate().normalize();
    const dotSun = Math.max(0, _camDir.dot(_sunDir));
    const targetExposure = THREE.MathUtils.lerp(1.28, 1.02, dotSun);
    state.gl.toneMappingExposure = THREE.MathUtils.lerp(
      state.gl.toneMappingExposure || 1.15,
      targetExposure,
      0.04
    );

    // 1. External Planet Tracking (Vista / Orbit Mode)
    if (cameraMode !== 'spacecraft' && selectedPlanet && heliocentricPositions[selectedPlanet]) {
      const pPos = heliocentricPositions[selectedPlanet];

      if (controlsRef.current && cameraMode === 'orbit') {
        controlsRef.current.target.lerp(pPos, 0.08);
      }

      // Smoothly expand zoom and elevate during climax to frame expanding shockwave
      const baseZoomDist = PLANET_ZOOM_DISTANCES[selectedPlanet] ?? 0.85;
      const zoomDist = baseZoomDist * (1.0 + drift.amplitude * 0.24);

      if (selectedPlanet === 'Sol') {
        const time = state.clock.elapsedTime * 0.15;
        const targetX = Math.sin(time) * zoomDist;
        const targetZ = Math.cos(time) * zoomDist;
        const targetY = 0.8 + Math.sin(time * 0.5) * 0.3 + driftElevation * 0.25;
        _camTarget.set(targetX, targetY, targetZ);
        state.camera.position.lerp(_camTarget, 0.08);
        state.camera.lookAt(0, 0, 0);
      } else {
        // Heliocentric vector from Sun (0,0,0) to Planet
        const rSun = Math.max(0.1, Math.hypot(pPos.x, pPos.z));
        const dirX = pPos.x / rSun;
        const dirZ = pPos.z / rSun;

        // Tangent perpendicular vector for lateral phase angle (~40 degrees)
        const tanX = -dirZ;
        const tanZ = dirX;

        // Camera positioned with optimal terminator/auroral viewing angle for Earth & Jupiter,
        // dynamic Cassini high-phase orbital sweep for Saturn, sunward for others
        const time = state.clock.elapsedTime * 0.18;
        const isAuroralPlanet = selectedPlanet === 'Earth' || selectedPlanet === 'Jupiter';
        let dirWeight = -0.82;
        let lateralPhase = 0.65 + Math.sin(time) * 0.20;
        let elevRatio = 0.46;

        if (selectedPlanet === 'Saturn') {
          // Breathtaking 36-second Cassini sweep around Saturn: seamlessly moves from high-sunlit ring striations
          // to the razor-thin silver thấu quang crescent and backlit forward scattering!
          const sweepAngle = time * 0.17;
          dirWeight = Math.sin(sweepAngle) * 0.75 - 0.15; // drifts between -0.90 (sunlit) and +0.60 (backlit)
          lateralPhase = Math.cos(sweepAngle) * 0.82;
          elevRatio = 0.42 + Math.sin(sweepAngle * 0.5) * 0.15;
        } else if (isAuroralPlanet) {
          dirWeight = 0.42;
          elevRatio = 0.68;
        }

        const camX = pPos.x + dirX * (zoomDist * dirWeight) + tanX * (zoomDist * lateralPhase);
        const camY = pPos.y + zoomDist * elevRatio + driftElevation * 0.25;
        const camZ = pPos.z + dirZ * (zoomDist * dirWeight) + tanZ * (zoomDist * lateralPhase);

        if (cameraMode !== 'orbit') {
          _camTarget.set(camX, camY, camZ);
          state.camera.position.lerp(_camTarget, 0.08);
          state.camera.lookAt(pPos.x, pPos.y, pPos.z);
        }
      }
      return;
    }

    // 2. Default System Overview Mode (Mode 1: Fixed Golden Vista, Mode 2: Spacecraft Grand Tour)
    const time = state.clock.elapsedTime;

    if (cameraMode === 'vista') {
      // MODE 1: ROTATING GOLDEN VISTA ("để cho cam vista quay như cũ đi")
      // Duy trì độ cao hoàng kim (Y = 5.12, R = 13.2) và xoay tròn 360° mượt mà quanh Sol (chu kỳ 180s thanh bình)
      state.camera.up.set(0, 1, 0);
      const initialAngle = 0.248; // Góc bắt đầu chuẩn xác
      const orbitSpeed = 0.035;   // Tốc độ xoay thư thái, êm dịu (~180s/vòng)
      const vistaAngle = initialAngle + time * orbitSpeed;

      const baseDist = 13.2 - beatIntensity * 0.35 + driftDist;
      const targetX = Math.sin(vistaAngle) * baseDist;
      const targetZ = Math.cos(vistaAngle) * baseDist;
      let targetY = 5.12 + driftElevation;

      // Subtle organic harmonic focal pulse on heavy kicks (không trượt góc nhìn)
      if (beatIntensity > 0.25) {
        targetY += Math.sin(time * 12.0) * beatIntensity * 0.020;
      }

      _camTarget.set(targetX, targetY, targetZ);
      state.camera.position.lerp(_camTarget, 0.05);
      state.camera.lookAt(0, 0, 0);

      if (controlsRef.current) {
        controlsRef.current.target.lerp(_defaultTarget, 0.05);
      }
    } else if (cameraMode === 'spacecraft') {
      // MODE 2: PASSENGER OBSERVATION DECK
      // Synchronously locked to SS Horizon in HorizonSpacecraft.tsx in the exact same render tick.
      // Guarantees strict 0-lag, 0-GC, 0-jitter, and zero rocking/wobbling.
      return;
    } else {
      // MODE 3: FREE ORBIT (Manual mouse inspection)
      state.camera.up.set(0, 1, 0);
      if (controlsRef.current && (!selectedPlanet || !heliocentricPositions[selectedPlanet])) {
        controlsRef.current.target.lerp(_defaultTarget, 0.05);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.06}
      minDistance={0.5}
      maxDistance={45}
      target={[0, 0, 0]}
      enabled={cameraMode === 'orbit'}
    />
  );
};

const SceneLights = () => {
  // In Solar System mode, the Sun at (0,0,0) is the primary celestial light source.
  // Ambient starlight carries a subtle scotopic silver-blue tint (#C4D2E0) from the galactic plane,
  // illuminating the intricate titanium keel and rotating centrifuge of ISV Archimedes.
  return (
    <>
      <ambientLight intensity={0.11} color="#c4d2e0" />
    </>
  );
};

export const VisualizerCanvas = () => {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#050507] overflow-hidden">
      <Canvas
        camera={{ position: [3.24, 5.12, 12.78], fov: 46, near: 0.02, far: 350 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        dpr={1}
      >
        {/* Deep Monochrome Canvas Background */}
        <color attach="background" args={['#050507']} />
        
        <SceneLights />
        <CameraRig />


        {/* Solar System Core */}
        <SolarSystemCore />

        {/* SS Horizon Interplanetary Spacecraft in Orbit */}
        <Suspense fallback={null}>
          <HorizonSpacecraft />
        </Suspense>
      </Canvas>
    </div>
  );
};
