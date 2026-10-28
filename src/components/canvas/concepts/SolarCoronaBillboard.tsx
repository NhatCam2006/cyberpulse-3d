import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';
import {
  solarCoronaRaysVertexShader,
  solarCoronaRaysFragmentShader,
} from '../../../shaders/solarCoronaRaysShader';

export const SolarCoronaBillboard = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: solarCoronaRaysVertexShader,
      fragmentShader: solarCoronaRaysFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uAcousticEnergy: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Billboard: Always orient directly towards the active camera
    meshRef.current.quaternion.copy(camera.quaternion);

    const engine = AudioEngine.getInstance();
    const { bass, mid, acousticEnergy, beatIntensity } = engine.update();
    const time = state.clock.getElapsedTime();

    material.uniforms.uTime.value = time;
    material.uniforms.uBass.value = bass;
    material.uniforms.uMid.value = mid;
    material.uniforms.uAcousticEnergy.value = acousticEnergy;
    material.uniforms.uBeatIntensity.value = beatIntensity;

    // Dual-layer astrophysical coronal breathing:
    // Expands outward on both heavy kicks and light rhythmic beats:
    // Heavy beat (1.0) -> +1.5 units
    // Light beat (0.5) -> +0.75 units (clearly palpable, rhythmic breathing!)
    const kickPunch = beatIntensity * 1.1 + Math.pow(beatIntensity, 2.0) * 0.4;
    const isKick = Math.min(1.0, beatIntensity * 1.5);
    const melodicBreath = (1.0 - isKick) * (mid * 0.65 + acousticEnergy * 0.40);
    const s = 8.8 + kickPunch + melodicBreath;
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <mesh ref={meshRef} material={material} position={[0, 0, 0]}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};
