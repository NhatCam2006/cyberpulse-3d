import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';

const NUM_POINTS = 512;
const HALF_SPAN = 100.0; // Infinite reach: spans x = -100.0 to +100.0 (200 units total)

/**
 * SolarEquatorialFilament.tsx
 * 
 * Infinite Horizontal Oscillating Starlight Thread (1-pixel hairline):
 * - Camera-aligned: ALWAYS strictly horizontal across the screen through Sol, rotating with camera view.
 * - Infinite length: spans 200 units across the entire viewport into deep space.
 * - Single hair-thin thread (THREE.Line, strictly 1px, zero bloating, zero clutter).
 * - "Nhảy nhảy theo nhịp nhạc": Audio waveform jumps and dances dynamically with beats and bass.
 * - 0 GC per frame allocation, locked 120 FPS.
 */
export const SolarEquatorialFilament: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

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
    if (!groupRef.current) return;

    // Camera-Aligned Billboard: Guarantees the line is ALWAYS strictly horizontal across the screen through Sol
    groupRef.current.quaternion.copy(camera.quaternion);

    const engine = AudioEngine.getInstance();
    const { bass, beatIntensity, isBeat, timeDomainArray } = engine;

    // Dynamic starlight opacity breathing
    material.opacity = 0.50 + beatIntensity * 0.35 + bass * 0.15;

    const posArray = geometry.attributes.position.array as Float32Array;
    const numSamples = timeDomainArray.length || 1024;

    // Beat-reactive vertical jump gain ("nhảy nhảy theo nhịp nhạc"):
    // On drum kicks & rhythmic beats, wave amplitude jumps crisply
    const beatJump = beatIntensity * 0.85 + Math.pow(beatIntensity, 2.0) * 0.45;
    const bassRumble = bass * 0.30;
    const waveGain = 0.22 + bassRumble + beatJump;

    for (let i = 0; i < NUM_POINTS; i++) {
      const u = i / (NUM_POINTS - 1);
      const s = (u - 0.5) * 2.0; // [-1.0, +1.0]

      // Stretched non-linear grid: concentrates vertex density around Sol (|x| < 12)
      // while smoothly extending to +/- 100.0 in deep space
      const absS = Math.abs(s);
      const signS = Math.sign(s);
      const stretchedFactor = 0.32 * absS + 0.68 * Math.pow(absS, 2.2);
      const x = signS * stretchedFactor * HALF_SPAN;
      const absX = Math.abs(x);

      // 3-point smoothed audio waveform sample to prevent jagged static
      const sampleIdx = Math.min(numSamples - 1, Math.floor(u * (numSamples - 1)));
      const raw = timeDomainArray[sampleIdx] !== undefined ? (timeDomainArray[sampleIdx] - 128) / 128.0 : 0;
      const prev = timeDomainArray[Math.max(0, sampleIdx - 2)] !== undefined ? (timeDomainArray[Math.max(0, sampleIdx - 2)] - 128) / 128.0 : raw;
      const next = timeDomainArray[Math.min(numSamples - 1, sampleIdx + 2)] !== undefined ? (timeDomainArray[Math.min(numSamples - 1, sampleIdx + 2)] - 128) / 128.0 : raw;
      const smoothedSample = prev * 0.25 + raw * 0.50 + next * 0.25;

      // Distance falloff: active dancing wave around the solar system (|x| < 25),
      // smoothly tapering to a razor-straight horizontal laser line in outer space
      const distFalloff = Math.exp(-Math.pow(absX / 28.0, 2.0));
      const y = smoothedSample * waveGain * distFalloff;

      posArray[i * 3 + 0] = x;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = 0;
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} renderOrder={10}>
      <primitive object={lineMesh} />
    </group>
  );
};
