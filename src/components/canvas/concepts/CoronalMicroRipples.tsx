import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';

const NUM_RIPPLES = 4;
const SUN_LIMB_RADIUS = 0.64;
const MAX_RIPPLE_RADIUS = 2.40;

interface RippleState {
  active: boolean;
  progress: number;
  speed: number;
  intensity: number;
}

/**
 * CoronalMicroRipples.tsx
 * 
 * Delicate 1px concentric starlight ripples expanding outwards in the ecliptic plane from Sol.
 * Triggers on heavy drum kicks AND gentle melodic piano/vocal notes, giving visual life
 * to every musical nuance without ballooning the Sun or cluttering space.
 * 
 * 0 GC allocations per frame.
 */
export const CoronalMicroRipples: React.FC = () => {
  const ripplesRef = useRef<RippleState[]>(
    Array.from({ length: NUM_RIPPLES }, () => ({
      active: false,
      progress: 0,
      speed: 1.8,
      intensity: 0,
    }))
  );

  const lastTriggerTime = useRef<number>(0);
  const nextIdxRef = useRef<number>(0);

  // Pre-allocate 1 reusable RingGeometry (unit radius 1.0, width 0.012)
  const geom = useMemo(() => new THREE.RingGeometry(0.988, 1.0, 128), []);

  // Pre-allocate materials for the 4 ripples in the pool
  const materials = useMemo(() => {
    return Array.from({ length: NUM_RIPPLES }, () => {
      return new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    });
  }, []);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    const engine = AudioEngine.getInstance();
    const { isBeat, beatIntensity, mid, acousticEnergy } = engine;
    const now = state.clock.getElapsedTime();

    // Trigger on drum kick OR melodic acoustic impulse (piano chord, vocal peak)
    const isMelodicImpulse = (mid > 0.30 || acousticEnergy > 0.25) && (now - lastTriggerTime.current > 0.24);
    const shouldTrigger = isBeat || isMelodicImpulse;

    if (shouldTrigger && now - lastTriggerTime.current > 0.16) {
      lastTriggerTime.current = now;
      const idx = nextIdxRef.current;
      nextIdxRef.current = (idx + 1) % NUM_RIPPLES;

      const rip = ripplesRef.current[idx];
      rip.active = true;
      rip.progress = 0;
      rip.intensity = isBeat ? 0.38 + beatIntensity * 0.15 : 0.24 + mid * 0.16;
      rip.speed = 1.4 + (isBeat ? 0.6 : 0.2);
    }

    // Update active ripples in the pool
    for (let i = 0; i < NUM_RIPPLES; i++) {
      const rip = ripplesRef.current[i];
      const mesh = meshRefs.current[i];
      const mat = materials[i];

      if (!mesh || !mat) continue;

      if (rip.active) {
        rip.progress += delta * rip.speed;

        if (rip.progress >= 1.0) {
          rip.active = false;
          mat.opacity = 0;
          mesh.visible = false;
        } else {
          mesh.visible = true;
          // Smooth power expansion from Sun's limb to outer limit
          const r = SUN_LIMB_RADIUS + Math.pow(rip.progress, 0.75) * (MAX_RIPPLE_RADIUS - SUN_LIMB_RADIUS);
          mesh.scale.set(r, r, 1);

          // Quadratic decay towards zero opacity
          const fade = Math.pow(1.0 - rip.progress, 1.8);
          mat.opacity = rip.intensity * fade;
        }
      } else {
        mesh.visible = false;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {Array.from({ length: NUM_RIPPLES }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (meshRefs.current[i] = el)}
          geometry={geom}
          material={materials[i]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        />
      ))}
    </group>
  );
};
