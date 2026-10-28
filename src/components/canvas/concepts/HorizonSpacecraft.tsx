import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  solveKepler,
  heliocentricPositions,
  JPL_PLANETS,
  DWARF_PLANETS,
  getVisualPlanetRadius,
} from '../../../utils/celestialMechanics';
import { usePlayerStore } from '../../../store/usePlayerStore';

// =============================================================================
// GRAND TOUR INTERPLANETARY CRUISE ORBIT (System Overview)
// Bán trục lớn a = 6.2 AU, e = 0.32, i = 8.5°, period = 140.0s
// Lướt qua các hành tinh trong và ngoài, tạo đại cảnh vũ trụ sống động
// =============================================================================
export const HORIZON_ORBIT = {
  a: 6.2,
  e: 0.32,
  i: (8.5 * Math.PI) / 180,
  omega: (75.0 * Math.PI) / 180,
  node: (45.0 * Math.PI) / 180,
  period: 140.0,
};

/**
 * 0-GC Orbital Position Calculator for SS Horizon
 * Supports both Grand Tour interplanetary cruise and Low-Orbit Planetary Insertion
 */
export function computeHorizonOrbitalPosition(
  t: number,
  outPos: THREE.Vector3,
  selectedPlanet?: string | null
): number {
  // 1. Low-Orbit Flyby Insertion around selected celestial body
  if (selectedPlanet && heliocentricPositions[selectedPlanet]) {
    const pCenter = heliocentricPositions[selectedPlanet];

    let flybyR = 0.45;
    let flybyPeriod = 38.0;
    let flybyInc = (22.5 * Math.PI) / 180;

    if (selectedPlanet === 'Sol') {
      flybyR = 1.95; // Just outside the boiling coronal streamer zone
      flybyPeriod = 48.0;
      flybyInc = (15.0 * Math.PI) / 180;
    } else {
      const ephem =
        JPL_PLANETS.find(p => p.name === selectedPlanet) ||
        DWARF_PLANETS.find(p => p.name === selectedPlanet);
      const visR = ephem ? getVisualPlanetRadius(ephem.radius_km, ephem.isGasGiant) : 0.25;

      // Saturn: fly above ring plane with generous clearance
      if (selectedPlanet === 'Saturn') {
        flybyR = visR * 2.15;
        flybyInc = (26.5 * Math.PI) / 180;
        flybyPeriod = 42.0;
      } else {
        // Skimming close to the upper exosphere (Colossal scale)
        flybyR = visR * 1.45;
        flybyInc = (22.0 * Math.PI) / 180;
        flybyPeriod = 36.0;
      }
    }

    const phi = ((t % flybyPeriod) / flybyPeriod) * Math.PI * 2;
    const xRel = flybyR * Math.cos(phi);
    const zRel = flybyR * Math.sin(phi) * Math.cos(flybyInc);
    const yRel = flybyR * Math.sin(phi) * Math.sin(flybyInc);

    outPos.set(pCenter.x + xRel, pCenter.y + yRel, pCenter.z + zRel);
    return flybyR;
  }

  // 2. Default Grand Tour System Overview Orbit
  const M = ((t % HORIZON_ORBIT.period) / HORIZON_ORBIT.period) * Math.PI * 2;
  const E = solveKepler(M, HORIZON_ORBIT.e);
  const nu = 2.0 * Math.atan2(
    Math.sqrt(1.0 + HORIZON_ORBIT.e) * Math.sin(E * 0.5),
    Math.sqrt(1.0 - HORIZON_ORBIT.e) * Math.cos(E * 0.5)
  );
  const r = (HORIZON_ORBIT.a * (1.0 - HORIZON_ORBIT.e * HORIZON_ORBIT.e)) / (1.0 + HORIZON_ORBIT.e * Math.cos(nu));

  const xOrb = r * Math.cos(nu);
  const zOrb = r * Math.sin(nu);

  const x1 = xOrb * Math.cos(HORIZON_ORBIT.omega) - zOrb * Math.sin(HORIZON_ORBIT.omega);
  const z1 = xOrb * Math.sin(HORIZON_ORBIT.omega) + zOrb * Math.cos(HORIZON_ORBIT.omega);

  const y2 = z1 * Math.sin(HORIZON_ORBIT.i);
  const z2 = z1 * Math.cos(HORIZON_ORBIT.i);

  outPos.x = x1 * Math.cos(HORIZON_ORBIT.node) - z2 * Math.sin(HORIZON_ORBIT.node);
  outPos.y = y2;
  outPos.z = x1 * Math.sin(HORIZON_ORBIT.node) + z2 * Math.cos(HORIZON_ORBIT.node);

  return r;
}

// Global 0-GC state vectors shared with Observation Deck
export const horizonGlobalPosition = new THREE.Vector3();
export const horizonGlobalForward = new THREE.Vector3(0, 0, 1);
export const horizonGlobalRight = new THREE.Vector3(1, 0, 0);
export const horizonGlobalUp = new THREE.Vector3(0, 1, 0);

// Static math objects (0 GC in useFrame)
const _shipPos = new THREE.Vector3();
const _shipNextPos = new THREE.Vector3();
const _shipForward = new THREE.Vector3();
const _shipRight = new THREE.Vector3();
const _dynamicUp = new THREE.Vector3();
const _rotMatrix = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();

// Passenger Camera Rigid Kinematics (0-GC, 0-Lag, 0-Jitter)
const _passengerCamPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookDirLocal = new THREE.Vector3();
const _lookDirWorld = new THREE.Vector3();
const _rotPitch = new THREE.Quaternion();
const _rotYaw = new THREE.Quaternion();
const _headRot = new THREE.Quaternion();
const _pitchAxis = new THREE.Vector3(1, 0, 0);
const _yawAxis = new THREE.Vector3(0, 1, 0);

// Mathematical Invariants:
// Local camera position on observation deck:
// -0.075 along ship forward, +0.052 along ship up, +0.025 along ship starboard
const LOCAL_CAM_OFFSET = new THREE.Vector3(0.025, 0.052, -0.075);

// Base sightline in ship's local coordinates:
// Viewing diagonally forward-port across the canopy window towards the passing planet
const BASE_LOOK_PLANET = new THREE.Vector3(-0.48, -0.06, 0.52).normalize();
const BASE_LOOK_GRAND_TOUR = new THREE.Vector3(-0.42, -0.04, 0.58).normalize();

// Invariant Grand Tour Orbit Normal:
// Calculated analytically from Keplerian inclination (8.5°) and ascending node (45.0°)
const GRAND_TOUR_NORMAL = new THREE.Vector3(0.104528, 0.989016, -0.104528).normalize();

// Preload the Draco model
useGLTF.preload('/models/erizon_draco.glb', '/draco/gltf/');

export const HorizonSpacecraft: React.FC = () => {
  const { scene } = useGLTF('/models/erizon_draco.glb', '/draco/gltf/');
  const shipGroupRef = useRef<THREE.Group>(null);
  const selectedPlanet = usePlayerStore(state => state.selectedPlanet);
  const cameraMode = usePlayerStore(state => state.cameraMode);

  // Elastic Inertial Head-Look (Left-drag with Hookean spring return)
  const headLookRef = useRef({
    currentYaw: 0,
    currentPitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Left mouse button only
      if (usePlayerStore.getState().cameraMode !== 'spacecraft') return;

      const target = e.target as HTMLElement | null;
      if (target?.closest('button, input, select, textarea, [role="button"], a')) return;

      const hl = headLookRef.current;
      hl.isDragging = true;
      hl.lastX = e.clientX;
      hl.lastY = e.clientY;
      document.body.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      const hl = headLookRef.current;
      if (!hl.isDragging) return;
      if (usePlayerStore.getState().cameraMode !== 'spacecraft') return;

      const dx = e.clientX - hl.lastX;
      const dy = e.clientY - hl.lastY;
      hl.lastX = e.clientX;
      hl.lastY = e.clientY;

      const yawSens = 0.0024;
      const pitchSens = 0.0020;
      const maxYaw = 0.488;   // 28 deg
      const maxPitch = 0.279; // 16 deg

      hl.targetYaw = THREE.MathUtils.clamp(hl.targetYaw + dx * yawSens, -maxYaw, maxYaw);
      hl.targetPitch = THREE.MathUtils.clamp(hl.targetPitch - dy * pitchSens, -maxPitch, maxPitch);
    };

    const handleMouseUp = () => {
      const hl = headLookRef.current;
      if (hl.isDragging) {
        hl.isDragging = false;
        hl.targetYaw = 0;
        hl.targetPitch = 0;
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, []);

  // Pre-process and scale model for astronomical visualizer scale
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const targetSize = 0.32;
    const scale = targetSize / maxDim;

    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    if (!shipGroupRef.current) return;
    const time = state.clock.elapsedTime;
    const activeCameraMode = usePlayerStore.getState().cameraMode;

    // 1. Orbital Kinematics & Coordinate Basis
    if (selectedPlanet && heliocentricPositions[selectedPlanet]) {
      const pCenter = heliocentricPositions[selectedPlanet];

      let flybyR = 0.45;
      let flybyPeriod = 38.0;
      let flybyInc = (22.5 * Math.PI) / 180;

      if (selectedPlanet === 'Sol') {
        flybyR = 1.95;
        flybyPeriod = 48.0;
        flybyInc = (15.0 * Math.PI) / 180;
      } else {
        const ephem =
          JPL_PLANETS.find(p => p.name === selectedPlanet) ||
          DWARF_PLANETS.find(p => p.name === selectedPlanet);
        const visR = ephem ? getVisualPlanetRadius(ephem.radius_km, ephem.isGasGiant) : 0.25;

        if (selectedPlanet === 'Saturn') {
          flybyR = visR * 2.15;
          flybyInc = (26.5 * Math.PI) / 180;
          flybyPeriod = 42.0;
        } else {
          flybyR = visR * 1.45;
          flybyInc = (22.0 * Math.PI) / 180;
          flybyPeriod = 36.0;
        }
      }

      const phi = ((time % flybyPeriod) / flybyPeriod) * Math.PI * 2;
      const xRel = flybyR * Math.cos(phi);
      const zRel = flybyR * Math.sin(phi) * Math.cos(flybyInc);
      const yRel = flybyR * Math.sin(phi) * Math.sin(flybyInc);

      _shipPos.set(pCenter.x + xRel, pCenter.y + yRel, pCenter.z + zRel);

      // Analytical Velocity Vector (Prograde flight direction)
      _shipForward.set(
        -Math.sin(phi),
        Math.cos(phi) * Math.sin(flybyInc),
        Math.cos(phi) * Math.cos(flybyInc)
      ).normalize();

      // Analytical Orbital Plane Normal: 100% CONSTANT IN TIME (Zero roll oscillation / Triệt tiêu lắc lư)
      _dynamicUp.set(0, Math.cos(flybyInc), -Math.sin(flybyInc)).normalize();

      // Right Vector: points radially outward from planet center
      _shipRight.crossVectors(_dynamicUp, _shipForward).normalize();
    } else {
      // Grand Tour Cruise
      computeHorizonOrbitalPosition(time, _shipPos, null);
      computeHorizonOrbitalPosition(time + 0.01, _shipNextPos, null);

      _shipForward.subVectors(_shipNextPos, _shipPos).normalize();
      _dynamicUp.copy(GRAND_TOUR_NORMAL);
      _shipRight.crossVectors(_dynamicUp, _shipForward).normalize();
      _dynamicUp.crossVectors(_shipForward, _shipRight).normalize();
    }

    // Assemble Orthonormal Right-Handed Coordinate Basis (Det = +1, no flipping, no jitter)
    _rotMatrix.makeBasis(_shipRight, _dynamicUp, _shipForward);
    _targetQuat.setFromRotationMatrix(_rotMatrix);

    // Update physical ship mesh
    shipGroupRef.current.position.copy(_shipPos);
    shipGroupRef.current.quaternion.copy(_targetQuat);

    // Sync global vectors
    horizonGlobalPosition.copy(_shipPos);
    horizonGlobalForward.copy(_shipForward);
    horizonGlobalRight.copy(_shipRight);
    horizonGlobalUp.copy(_dynamicUp);

    // 2. Synchronous Passenger Deck Camera Lock (Strict 0-Lag, 0-GC, 0-Jitter, 0-Wobble)
    if (activeCameraMode === 'spacecraft') {
      // Rigidly mount camera to the observation deck in the exact same render frame
      _passengerCamPos.copy(_shipPos)
        .addScaledVector(_shipForward, LOCAL_CAM_OFFSET.z)
        .addScaledVector(_dynamicUp, LOCAL_CAM_OFFSET.y)
        .addScaledVector(_shipRight, LOCAL_CAM_OFFSET.x);

      state.camera.position.copy(_passengerCamPos);

      // Local sightline: base vista angle looking diagonally towards the colossal planet
      const baseLook = (selectedPlanet && heliocentricPositions[selectedPlanet])
        ? BASE_LOOK_PLANET
        : BASE_LOOK_GRAND_TOUR;
      _lookDirLocal.copy(baseLook);

      // Elastic head-look yaw & pitch
      const hl = headLookRef.current;
      const springRate = Math.min(1.0, hl.isDragging ? delta * 14.0 : delta * 5.2);
      hl.currentYaw += (hl.targetYaw - hl.currentYaw) * springRate;
      hl.currentPitch += (hl.targetPitch - hl.currentPitch) * springRate;

      _rotPitch.setFromAxisAngle(_pitchAxis, -hl.currentPitch);
      _rotYaw.setFromAxisAngle(_yawAxis, hl.currentYaw);
      _headRot.multiplyQuaternions(_rotYaw, _rotPitch);
      _lookDirLocal.applyQuaternion(_headRot);

      // Transform sightline to world orientation
      _lookDirWorld.copy(_lookDirLocal).applyQuaternion(_targetQuat);
      _camTarget.copy(_passengerCamPos).addScaledVector(_lookDirWorld, 10.0);

      state.camera.up.copy(_dynamicUp);
      state.camera.lookAt(_camTarget);

      // Rigid 52° FOV
      if ('fov' in state.camera) {
        const persCam = state.camera as THREE.PerspectiveCamera;
        if (Math.abs(persCam.fov - 52.0) > 0.01) {
          persCam.fov = 52.0;
          persCam.updateProjectionMatrix();
        }
      }
    }
  });

  return (
    <group>
      {/* SS Horizon Vessel in Cinematic Low-Orbit or Grand Tour */}
      <group ref={shipGroupRef}>
        <primitive object={clonedScene} />

        {/* Localized Cinematic Starlight Accent */}
        <pointLight position={[0.1, 0.2, 0.2]} intensity={0.5} color="#e2e8f0" distance={1.2} />
      </group>
    </group>
  );
};
