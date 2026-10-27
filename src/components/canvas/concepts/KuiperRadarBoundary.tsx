import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';
import { usePlayerStore } from '../../../store/usePlayerStore';

const NUM_KBO_POINTS = 380; // Kuiper Belt Objects (icy planetesimals)

/**
 * KuiperRadarBoundary.tsx
 * 
 * Deep Space Kuiper Belt Planetesimals:
 * - Edgeworth-Kuiper Belt (R = 12.8 to 18.5 units): 380 microscopic icy comet nuclei
 *   with Keplerian angular drift and audio-reactive high-frequency scintillation.
 * - Removed all artificial radar circles and ruler rings to keep deep space clean and unblemished.
 * - 0 GC allocation per frame (100% pre-allocated Float32Array buffers).
 */
export const KuiperRadarBoundary: React.FC = () => {
  const containerRef = useRef<THREE.Group>(null);

  // 1. KUIPER BELT DUST PLANETESIMALS
  const [kboBaseData, kboPositions] = useMemo(() => {
    const pos = new Float32Array(NUM_KBO_POINTS * 3);
    const data = Array.from({ length: NUM_KBO_POINTS }, () => {
      // Concentrated between 13.0 and 18.5 units (30 to 55 AU)
      const r = 13.0 + Math.pow(Math.random(), 1.2) * 5.4;
      const theta = Math.random() * Math.PI * 2;
      const yOffset = (Math.random() - 0.5) * 0.45; // Rayleigh inclination (~8 deg)
      const driftSpeed = (0.16 / Math.pow(r / 10, 1.5)) * (0.8 + Math.random() * 0.4);
      return { r, theta, yOffset, driftSpeed };
    });

    // Populate initial positions
    for (let i = 0; i < NUM_KBO_POINTS; i++) {
      const d = data[i];
      pos[i * 3 + 0] = Math.cos(d.theta) * d.r;
      pos[i * 3 + 1] = d.yOffset;
      pos[i * 3 + 2] = Math.sin(d.theta) * d.r;
    }

    return [data, pos];
  }, []);

  const kboGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pAttr = new THREE.BufferAttribute(kboPositions, 3);
    pAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', pAttr);
    return g;
  }, [kboPositions]);

  const kboMat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0xc8e6ff,
      size: 0.038,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const kboPoints = useMemo(() => {
    const p = new THREE.Points(kboGeom, kboMat);
    p.frustumCulled = false;
    return p;
  }, [kboGeom, kboMat]);

  useFrame((state, delta) => {
    const engine = AudioEngine.getInstance();
    const spectralMode = usePlayerStore.getState().auroraSpectralMode;
    const { high, beatIntensity } = engine;
    const dt = Math.min(0.04, Math.max(0.005, delta));

    // Update KBO Planetesimals drift & scintillation
    const posArr = kboGeom.attributes.position.array as Float32Array;
    for (let i = 0; i < NUM_KBO_POINTS; i++) {
      const d = kboBaseData[i];
      d.theta += d.driftSpeed * dt;
      posArr[i * 3 + 0] = Math.cos(d.theta) * d.r;
      posArr[i * 3 + 1] = d.yOffset + Math.sin(d.theta * 2.0) * 0.02;
      posArr[i * 3 + 2] = Math.sin(d.theta) * d.r;
    }
    kboGeom.attributes.position.needsUpdate = true;

    // Subtle twinkling with high frequencies
    const twinkle = 0.28 + high * 0.25 + beatIntensity * 0.12;
    kboMat.opacity = twinkle;
    if (spectralMode) {
      kboMat.color.setRGB(0.70, 0.88, 1.0); // Icy crystalline cyan
    } else {
      kboMat.color.setRGB(0.85, 0.85, 0.90); // Monochrome silver dust
    }
  });

  return (
    <group ref={containerRef}>
      {/* Kuiper Belt Planetesimals Points */}
      <primitive object={kboPoints} />
    </group>
  );
};
