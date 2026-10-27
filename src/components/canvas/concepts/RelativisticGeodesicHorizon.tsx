import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';
import { usePlayerStore } from '../../../store/usePlayerStore';

const NUM_POINTS = 512;           // High-precision vertex count for infinite reach
const HORIZON_SPAN = 160.0;       // Infinitely long cosmic horizon: spans x = -80.0 to +80.0
const LENS_RADIUS = 3.2;          // Schwarzschild gravitational lensing boundary around Sol
const LENS_STRENGTH = 0.26;       // Curvature factor of the Einstein deflection arc

/**
 * RelativisticGeodesicHorizon.tsx
 * 
 * Infinitely long 3D Relativistic Geodesic Horizon beam:
 * - Extends from x = -80.0 to +80.0, piercing far beyond the camera viewport into infinity.
 * - Stretched grid distribution: high vertex density focused around Sol (|x| < 3.2).
 * - Upper beam: Solar Gold (#ffcc44)
 * - Lower beam: Ionized Cyan (#00f3ff)
 * - Beyond Sol: Upper + Lower overlap with Additive Blending into a pristine infinite laser.
 * - Around Sol: Gravitational deflection splits them into dual arcs embracing Sol's photosphere.
 */
export const RelativisticGeodesicHorizon: React.FC = () => {
  // Pre-allocate coordinate buffers for 512 vertices
  const [topPositions, bottomPositions] = useMemo(() => {
    return [
      new Float32Array(NUM_POINTS * 3),
      new Float32Array(NUM_POINTS * 3),
    ];
  }, []);

  const geomTop = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(topPositions, 3));
    return geom;
  }, [topPositions]);

  const geomBottom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(bottomPositions, 3));
    return geom;
  }, [bottomPositions]);

  // Materials with Additive Blending (Scotopic Starlight Silver & Celestial Icy Diamond)
  const matTop = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.40,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const matBottom = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: 0xb8d4f0,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const lineTop = useMemo(() => new THREE.Line(geomTop, matTop), [geomTop, matTop]);
  const lineBottom = useMemo(() => new THREE.Line(geomBottom, matBottom), [geomBottom, matBottom]);

  useFrame(() => {
    const engine = AudioEngine.getInstance();
    const spectralMode = usePlayerStore.getState().auroraSpectralMode;
    const { bass, beatIntensity, timeDomainArray } = engine;

    if (spectralMode) {
      matTop.color.setHex(0xe2e8f0);    // Pristine Diamond Starlight Silver
      matTop.opacity = 0.38 + beatIntensity * 0.15;
      matBottom.color.setHex(0xb8d4f0); // Subtle Celestial Icy Diamond Blue
      matBottom.opacity = 0.30 + beatIntensity * 0.12;
    } else {
      matTop.color.setHex(0xffffff);
      matTop.opacity = 0.34 + beatIntensity * 0.15;
      matBottom.color.setHex(0xffffff);
      matBottom.opacity = 0.26 + beatIntensity * 0.12;
    }

    const posTop = geomTop.attributes.position.array as Float32Array;
    const posBottom = geomBottom.attributes.position.array as Float32Array;

    const waveGain = 0.28 + bass * 0.24 + beatIntensity * 0.35;
    const rLensSq = LENS_RADIUS * LENS_RADIUS;
    const halfSpan = HORIZON_SPAN * 0.5; // 80.0
    const numSamples = timeDomainArray.length || 1024;

    for (let i = 0; i < NUM_POINTS; i++) {
      const u = i / (NUM_POINTS - 1);
      const s = 2.0 * u - 1.0; // [-1.0, +1.0]

      // Stretched coordinate grid: concentrates resolution in gravitational well (|x| < 3.5)
      // while shooting smoothly to +/- 80.0 at the outer boundaries
      const absS = Math.abs(s);
      const signS = Math.sign(s);
      const stretchedFactor = 0.32 * absS + 0.68 * Math.pow(absS, 2.2);
      const x = signS * stretchedFactor * halfSpan;
      const absX = Math.abs(x);

      // Map audio waveform samples with smooth distance falloff towards infinity
      const sampleIdx = Math.min(numSamples - 1, Math.floor(absS * (numSamples - 1)));
      const rawSample = timeDomainArray[sampleIdx] !== undefined
        ? (timeDomainArray[sampleIdx] - 128) / 128.0
        : 0;

      // Audio wave ripples along the beam, stabilizing to straight line in deep space
      const distFalloff = 1.0 / (1.0 + Math.pow(absX / 30.0, 2));
      const yWave = rawSample * waveGain * distFalloff;

      // Einstein gravitational deflection curvature around Sol's gravity well
      let arc = 0;
      if (absX < LENS_RADIUS) {
        arc = Math.sqrt(rLensSq - absX * absX) * LENS_STRENGTH;
      }

      // Upper Geodesic Ray
      posTop[i * 3 + 0] = x;
      posTop[i * 3 + 1] = yWave + arc;
      posTop[i * 3 + 2] = 0;

      // Lower Geodesic Ray
      posBottom[i * 3 + 0] = x;
      posBottom[i * 3 + 1] = yWave - arc;
      posBottom[i * 3 + 2] = 0;
    }

    geomTop.attributes.position.needsUpdate = true;
    geomBottom.attributes.position.needsUpdate = true;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Infinite Upper Einstein Geodesic Beam */}
      <primitive object={lineTop} />

      {/* Infinite Lower Einstein Geodesic Beam */}
      <primitive object={lineBottom} />
    </group>
  );
};
