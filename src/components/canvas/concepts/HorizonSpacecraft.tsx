import React, { useRef, useMemo } from 'react';
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

// Global 0-GC state vectors shared with CameraRig & Observation Deck in VisualizerCanvas
export const horizonGlobalPosition = new THREE.Vector3();
export const horizonGlobalForward = new THREE.Vector3(0, 0, 1);
export const horizonGlobalRight = new THREE.Vector3(1, 0, 0);
export const horizonGlobalUp = new THREE.Vector3(0, 1, 0);

// Static math objects (0 GC in useFrame)
const _shipPos = new THREE.Vector3();
const _shipNextPos = new THREE.Vector3();
const _shipVel = new THREE.Vector3();
const _shipForward = new THREE.Vector3();
const _shipWorldUp = new THREE.Vector3(0, 1, 0);
const _shipRight = new THREE.Vector3();
const _dynamicUp = new THREE.Vector3();
const _rotMatrix = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();

// Preload the Draco model
useGLTF.preload('/models/erizon_draco.glb', '/draco/gltf/');

export const HorizonSpacecraft: React.FC = () => {
  const { scene } = useGLTF('/models/erizon_draco.glb', '/draco/gltf/');
  const shipGroupRef = useRef<THREE.Group>(null);
  const selectedPlanet = usePlayerStore(state => state.selectedPlanet);

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

  useFrame(state => {
    if (!shipGroupRef.current) return;
    const time = state.clock.elapsedTime;

    // 1. Compute exact Keplerian or Low-Orbit position
    computeHorizonOrbitalPosition(time, _shipPos, selectedPlanet);
    computeHorizonOrbitalPosition(time + 0.12, _shipNextPos, selectedPlanet);

    // 2. Physical flight velocity & prograde orientation
    _shipVel.subVectors(_shipNextPos, _shipPos).normalize();
    _shipForward.copy(_shipVel);

    // 3. Orthonormal Right-Handed Coordinate Frame (Det = +1, Không lật ảnh, Không rung lắc)
    _shipRight.crossVectors(_shipWorldUp, _shipForward).normalize();
    _dynamicUp.crossVectors(_shipForward, _shipRight).normalize();

    _rotMatrix.makeBasis(_shipRight, _dynamicUp, _shipForward);
    _targetQuat.setFromRotationMatrix(_rotMatrix);

    // 4. Update ship transform - EXACT SYNCHRONIZATION WITH CAMERA (ZERO JITTER)
    shipGroupRef.current.position.copy(_shipPos);
    shipGroupRef.current.quaternion.copy(_targetQuat);

    // 5. Derive global vectors directly from the exact synchronized quaternion
    _shipForward.set(0, 0, 1).applyQuaternion(_targetQuat);
    _shipRight.set(1, 0, 0).applyQuaternion(_targetQuat);
    _dynamicUp.set(0, 1, 0).applyQuaternion(_targetQuat);

    horizonGlobalPosition.copy(_shipPos);
    horizonGlobalForward.copy(_shipForward);
    horizonGlobalRight.copy(_shipRight);
    horizonGlobalUp.copy(_dynamicUp);
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
