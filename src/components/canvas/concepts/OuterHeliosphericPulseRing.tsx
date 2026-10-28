import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';

const NUM_RINGS = 6;           // Ring buffer pool to handle rapid successive beats (up to 6 concurrent pulses)
const RING_SEGMENTS = 256;     // Sub-millimeter circular smoothness
const BASE_A = 13.5;           // Perfectly framed at the outer planetary frontier (Neptune / Kuiper rim)
const ECCENTRICITY = 0.028;    // Subtle Keplerian ellipse matching outer planetary orbits
const INCLINATION_RAD = (1.4 * Math.PI) / 180; // Subtle 1.4 deg ecliptic tilt

interface PulseRingState {
  active: boolean;
  progress: number;
  peakIntensity: number;
}

/**
 * OuterHeliosphericPulseRing.tsx
 * 
 * Ephemeral Outer Planetary Boundary Pulse Ring:
 * - Positioned at the outer perimeter of the planetary system (R ~ 13.5 units).
 * - Matches the planetary orbital geometry (subtle Keplerian ellipse in the ecliptic plane).
 * - Sợi chỉ vector siêu mảnh (1px dual-filament starlight thread) following Ryoji Ikeda minimalism.
 * - On each music beat (BOTH heavy kicks and light rhythmic beats), blooms outward and dissolves into #050507.
 * - Completely invisible when idle; preserves 100% deep space void.
 * - 0 GC allocation per frame (100% pre-allocated objects and materials).
 */
export const OuterHeliosphericPulseRing: React.FC = () => {
  // Pre-generate the Keplerian elliptical boundary geometry points
  const [coreGeom, haloGeom] = useMemo(() => {
    const ptsCore: THREE.Vector3[] = [];
    const ptsHalo: THREE.Vector3[] = [];
    const b = BASE_A * Math.sqrt(1 - ECCENTRICITY * ECCENTRICITY);

    for (let i = 0; i < RING_SEGMENTS; i++) {
      const theta = (i / RING_SEGMENTS) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Ellipse centered with focal offset -a*e
      const x = BASE_A * cosT - BASE_A * ECCENTRICITY;
      const z = b * sinT;
      const y = sinT * (BASE_A * Math.sin(INCLINATION_RAD));

      ptsCore.push(new THREE.Vector3(x, y, z));

      // Slightly offset second thread (+0.04 units) for dual-filament vector precision
      ptsHalo.push(new THREE.Vector3(x * 1.004, y, z * 1.004));
    }

    return [
      new THREE.BufferGeometry().setFromPoints(ptsCore),
      new THREE.BufferGeometry().setFromPoints(ptsHalo),
    ];
  }, []);

  // Pre-allocate materials for the 6 rings in the pool
  const [coreMaterials, haloMaterials] = useMemo(() => {
    const cores = Array.from({ length: NUM_RINGS }, () => {
      return new THREE.LineBasicMaterial({
        color: 0xffffff, // Incandescent starlight white
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    });

    const halos = Array.from({ length: NUM_RINGS }, () => {
      return new THREE.LineBasicMaterial({
        color: 0xc8d6e5, // Scotopic starlight silver
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    });

    return [cores, halos];
  }, []);

  // Pre-allocate LineLoop meshes
  const ringGroups = useMemo(() => {
    return Array.from({ length: NUM_RINGS }, (_, i) => {
      const grp = new THREE.Group();
      const lineCore = new THREE.LineLoop(coreGeom, coreMaterials[i]);
      const lineHalo = new THREE.LineLoop(haloGeom, haloMaterials[i]);
      lineCore.frustumCulled = false;
      lineHalo.frustumCulled = false;
      grp.add(lineCore);
      grp.add(lineHalo);
      grp.visible = false;
      return grp;
    });
  }, [coreGeom, haloGeom, coreMaterials, haloMaterials]);

  // Pulse animation states
  const pulsePool = useRef<PulseRingState[]>(
    Array.from({ length: NUM_RINGS }, () => ({
      active: false,
      progress: 1.0,
      peakIntensity: 0.0,
    }))
  );

  const nextRingIdxRef = useRef<number>(0);
  const wasBeatRef = useRef<boolean>(false);
  const beatCooldownRef = useRef<number>(0);

  useFrame((_, delta) => {
    const engine = AudioEngine.getInstance();
    const { isBeat, beatIntensity, bass } = engine;
    const dt = Math.min(0.04, Math.max(0.005, delta));

    beatCooldownRef.current = Math.max(0, beatCooldownRef.current - dt);

    // Trigger next ring on new beat detection edge (Heavy kicks OR Light beats / Snares)
    if (isBeat && !wasBeatRef.current && beatIntensity > 0.08 && beatCooldownRef.current <= 0) {
      const idx = nextRingIdxRef.current;
      pulsePool.current[idx].active = true;
      pulsePool.current[idx].progress = 0.0;
      // Proportional peak intensity: light beats (~0.50) to major kicks (1.0)
      pulsePool.current[idx].peakIntensity = beatIntensity;

      nextRingIdxRef.current = (idx + 1) % NUM_RINGS;
      beatCooldownRef.current = 0.11; // 110ms refractory enables rapid alternating rhythms
    }
    wasBeatRef.current = isBeat;

    // Animate active rings
    for (let i = 0; i < NUM_RINGS; i++) {
      const p = pulsePool.current[i];
      const grp = ringGroups[i];
      const matCore = coreMaterials[i];
      const matHalo = haloMaterials[i];

      if (!p.active) {
        grp.visible = false;
        continue;
      }

      // Smooth progression over ~0.65 seconds
      p.progress += dt * (1.45 + bass * 0.25);

      if (p.progress >= 1.0) {
        p.active = false;
        grp.visible = false;
        matCore.opacity = 0.0;
        matHalo.opacity = 0.0;
        continue;
      }

      grp.visible = true;

      // Expand outward:
      // Heavy beat: scale 1.0 -> 1.11
      // Light beat (0.50): scale 1.0 -> 1.075 (crisp, clearly palpable bloom!)
      const expansion = Math.pow(p.progress, 0.60) * (0.045 + p.peakIntensity * 0.065);
      const s = 1.0 + expansion;
      grp.scale.set(s, 1.0, s);

      // Smooth cubic dissolution: bright instant attack, gentle lingering decay
      const fade = Math.pow(1.0 - p.progress, 1.8);
      const alphaCore = fade * (0.35 + p.peakIntensity * 0.55);
      const alphaHalo = fade * (0.20 + p.peakIntensity * 0.40);

      matCore.opacity = Math.min(1.0, alphaCore);
      matHalo.opacity = Math.min(1.0, alphaHalo);
    }
  });

  return (
    <group>
      {ringGroups.map((grp, idx) => (
        <primitive key={idx} object={grp} />
      ))}
    </group>
  );
};
