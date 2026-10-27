import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '../../store/usePlayerStore';

const PARTICLE_COUNT = 250;

export const ParticleVortex = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const visibleLayers = usePlayerStore(state => state.visibleLayers);

  // 250 subtle ambient particles distributed in a wide sphere
  const { positions, speeds, angles, radii, heights } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const spd = new Float32Array(PARTICLE_COUNT);
    const ang = new Float32Array(PARTICLE_COUNT);
    const rad = new Float32Array(PARTICLE_COUNT);
    const hgt = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 3.5 + Math.random() * 8.5;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 7.0;
      const speed = (0.04 + Math.random() * 0.08) * (Math.random() > 0.5 ? 1 : -1);

      rad[i] = radius;
      ang[i] = angle;
      hgt[i] = height;
      spd[i] = speed;

      pos[i * 3 + 0] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }

    return { positions: pos, speeds: spd, angles: ang, radii: rad, heights: hgt };
  }, []);

  useFrame((_, delta) => {
    if (!visibleLayers.particles || !pointsRef.current) return;

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    // Slow, calm ambient floating drift
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      angles[i] += speeds[i] * delta * 0.5;
      posArray[i * 3 + 0] = Math.cos(angles[i]) * radii[i];
      posArray[i * 3 + 1] = heights[i] + Math.sin(angles[i] * 1.5) * 0.3;
      posArray[i * 3 + 2] = Math.sin(angles[i]) * radii[i];
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!visibleLayers.particles) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#ffffff"
        transparent={true}
        opacity={0.35}
        depthWrite={false}
      />
    </points>
  );
};
