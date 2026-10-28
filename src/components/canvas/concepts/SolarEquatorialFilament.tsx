import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';

const NUM_POINTS = 512;
const HALF_SPAN = 100.0; // Infinite reach: spans 200 units across the solar system into deep space

/**
 * SolarEquatorialFilament.tsx
 * 
 * 3D Infinite Starlight Chord Anchored in the Solar System:
 * - Anchored in the 3D Solar System (rotates in 3D perspective along with the planets & orbits).
 * - Rotated by +0.248 rad so it starts strictly horizontal across the initial Golden Vista view through Sol.
 * - Single hair-thin 1-pixel thread (THREE.Line, strictly 1px, 0 GC per frame).
 * - "Đập dọc dọc": Sharp, crisp vertical audio waveform displacement (oscilloscope spikes)
 *   punching vertically with drum kicks and bass transients.
 * - Smooth distance falloff into deep space (flatline beyond the planetary orrery).
 */
export const SolarEquatorialFilament: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  // Pre-allocate coordinate buffer for 512 vertices (x, y, z)
  const positions = useMemo(() => new Float32Array(NUM_POINTS * 3), []);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [positions]);

  // Pure 1-pixel starlight hairline with Additive Blending
  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const lineMesh = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);

  useFrame(() => {
    const engine = AudioEngine.getInstance();
    const { bass, beatIntensity, timeDomainArray } = engine;

    // Dynamic starlight opacity breathing
    material.opacity = 0.52 + beatIntensity * 0.35 + bass * 0.12;

    const posArray = geometry.attributes.position.array as Float32Array;
    const numSamples = timeDomainArray.length || 1024;

    // Sharp, punchy vertical beat gain ("đập dọc dọc"):
    // Jumps sharply on kicks (+1.4x gain) and light beats (+0.7x gain)
    const beatJump = beatIntensity * 0.85 + Math.pow(beatIntensity, 2.0) * 0.55;
    const bassRumble = bass * 0.35;
    const waveGain = 0.32 + bassRumble + beatJump;

    for (let i = 0; i < NUM_POINTS; i++) {
      const u = i / (NUM_POINTS - 1);
      const s = (u - 0.5) * 2.0; // [-1.0, +1.0]

      // Stretched non-linear grid: high vertex density focused around Sol (|x| < 12)
      // while smoothly shooting to +/- 100.0 in deep space
      const absS = Math.abs(s);
      const signS = Math.sign(s);
      const stretchedFactor = 0.32 * absS + 0.68 * Math.pow(absS, 2.2);
      const x = signS * stretchedFactor * HALF_SPAN;
      const absX = Math.abs(x);

      // Symmetric audio sampling from Sol outward (crisp vertical spikes "đập dọc dọc")
      const sampleIdx = Math.min(numSamples - 1, Math.floor(absS * (numSamples - 1)));
      const rawSample = timeDomainArray[sampleIdx] !== undefined 
        ? (timeDomainArray[sampleIdx] - 128) / 128.0 
        : 0;

      // Distance falloff: active vertical spikes around the solar system (|x| < 28),
      // smoothly tapering to a razor-straight flatline in outer space
      const distFalloff = 1.0 / (1.0 + Math.pow(absX / 28.0, 2.0));
      const y = rawSample * waveGain * distFalloff;

      posArray[i * 3 + 0] = x;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = 0;
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} rotation={[0, 0.248, 0]} renderOrder={10}>
      <primitive object={lineMesh} />
    </group>
  );
};
