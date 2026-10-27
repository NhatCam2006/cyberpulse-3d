import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GridShaderMaterial } from '../../shaders/gridShader';
import { usePlayerStore, THEMES } from '../../store/usePlayerStore';
import { AudioEngine } from '../../audio/AudioEngine';

export const SynthGrid = () => {
  const colorTheme = usePlayerStore(state => state.colorTheme);
  const visibleLayers = usePlayerStore(state => state.visibleLayers);
  const theme = THEMES[colorTheme];

  const shaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: GridShaderMaterial.vertexShader,
      fragmentShader: GridShaderMaterial.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uBeatIntensity: { value: 0 },
        uColorA: { value: new THREE.Color(theme.colorA) },
        uColorB: { value: new THREE.Color(theme.colorB) },
        uGridDensity: { value: 36.0 },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false, // Ensures smooth alpha blending with fog and dark background
    });
  }, []);

  const colorA = useMemo(() => new THREE.Color(theme.colorA), [theme.colorA]);
  const colorB = useMemo(() => new THREE.Color(theme.colorB), [theme.colorB]);

  // 100% GPU vertex displacement: only uniform updates in useFrame (NO CPU position loops or normal recalculations)
  useFrame((state) => {
    if (!visibleLayers.grid) return;

    const engine = AudioEngine.getInstance();
    const audioData = engine.update();

    shaderMat.uniforms.uTime.value = state.clock.elapsedTime;
    shaderMat.uniforms.uBass.value = audioData.bass;
    shaderMat.uniforms.uMid.value = audioData.mid;
    shaderMat.uniforms.uHigh.value = audioData.high;
    shaderMat.uniforms.uBeatIntensity.value = audioData.beatIntensity;
    shaderMat.uniforms.uColorA.value.lerp(colorA, 0.1);
    shaderMat.uniforms.uColorB.value.lerp(colorB, 0.1);
  });

  if (!visibleLayers.grid) return null;

  return (
    <mesh
      position={[0, -4.5, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={shaderMat}
    >
      {/* Optimized resolution: PlaneGeometry(70, 70, 36, 36) for 60FPS high performance */}
      <planeGeometry args={[70, 70, 36, 36]} />
    </mesh>
  );
};
