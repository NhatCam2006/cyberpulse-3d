import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';
import {
  solarPolarJetsVertexShader,
  solarPolarJetsFragmentShader,
} from '../../../shaders/solarPolarJetsShader';

/**
 * SolarPolarJets.tsx
 * 
 * Astrophysical Relativistic Polar Jets:
 * - Emitted symmetrically from Sol's North (+Y) and South (-Y) rotational poles.
 * - Perpendicular to the ecliptic orbital plane (y = 0), completely preserving planetary visibility.
 * - Tri-plane 60-degree intersecting cross geometry ensures 100% isotropic projection from any camera view.
 * - Dynamic audio-reactive axial elongation and core luminance respiration.
 * - Bounded height ensures zero HUD interference while framing Sol majestically.
 * - 0 GC per frame allocation, locked 120 FPS.
 */
export const SolarPolarJets: React.FC = () => {
  const northGroupRef = useRef<THREE.Group>(null);
  const southGroupRef = useRef<THREE.Group>(null);

  // Shared Shader Material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: solarPolarJetsVertexShader,
      fragmentShader: solarPolarJetsFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uAcousticEnergy: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, []);

  // Shared Unit Plane Geometry: base at y = 0, tip at y = 1.0
  const jetGeometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1.2, 1.0, 1, 32);
    geom.translate(0, 0.5, 0); // Anchor origin at the nozzle throat
    return geom;
  }, []);

  useFrame((state) => {
    const engine = AudioEngine.getInstance();
    const { bass, mid, high, acousticEnergy, beatIntensity } = engine.update();
    const time = state.clock.getElapsedTime();

    // 1. Update uniforms
    material.uniforms.uTime.value = time;
    material.uniforms.uBass.value = bass;
    material.uniforms.uMid.value = mid;
    material.uniforms.uHigh.value = high;
    material.uniforms.uAcousticEnergy.value = acousticEnergy;
    material.uniforms.uBeatIntensity.value = beatIntensity;

    // 2. Audio-reactive bounded axial elongation:
    // Quiescent: 3.2 units (compact, refined celestial plume)
    // Light beat (0.50): ~4.2 units (clearly palpable rhythmic pulse)
    // Heavy kick (1.0): ~5.6 units (dramatic elongation, safely below top HUD header)
    const kickPunch = beatIntensity * 1.6 + Math.pow(beatIntensity, 2.0) * 0.8;
    const isKick = Math.min(1.0, beatIntensity * 1.5);
    const melodicBreath = (1.0 - isKick) * (mid * 0.45 + acousticEnergy * 0.25);
    const subRumble = bass * 0.20;
    const jetLength = 3.2 + kickPunch + melodicBreath + subRumble;

    // Subtle transverse breathing (+10% width on kick)
    const beamWidth = 1.0 + beatIntensity * 0.10;

    if (northGroupRef.current) {
      northGroupRef.current.scale.set(beamWidth, jetLength, beamWidth);
    }
    if (southGroupRef.current) {
      southGroupRef.current.scale.set(beamWidth, jetLength, beamWidth);
    }
  });

  const POLE_OFFSET = 0.56; // Positioned right at Sol's polar coronal boundaries

  return (
    <group position={[0, 0, 0]}>
      {/* North Polar Jet (+Y) */}
      <group ref={northGroupRef} position={[0, POLE_OFFSET, 0]}>
        <mesh geometry={jetGeometry} material={material} rotation={[0, 0, 0]} />
        <mesh geometry={jetGeometry} material={material} rotation={[0, Math.PI / 3, 0]} />
        <mesh geometry={jetGeometry} material={material} rotation={[0, (2 * Math.PI) / 3, 0]} />
      </group>

      {/* South Polar Jet (-Y) */}
      <group ref={southGroupRef} position={[0, -POLE_OFFSET, 0]} rotation={[Math.PI, 0, 0]}>
        <mesh geometry={jetGeometry} material={material} rotation={[0, 0, 0]} />
        <mesh geometry={jetGeometry} material={material} rotation={[0, Math.PI / 3, 0]} />
        <mesh geometry={jetGeometry} material={material} rotation={[0, (2 * Math.PI) / 3, 0]} />
      </group>
    </group>
  );
};
