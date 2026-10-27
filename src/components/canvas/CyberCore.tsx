import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CoreShaderMaterial } from '../../shaders/coreShader';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AudioEngine } from '../../audio/AudioEngine';

// Pure Minimalist Dial: 64 laser-thin tick marks (5.625° separation)
const NUM_DIAL_BARS = 64;
const DIAL_RADIUS = 2.65;

export const CyberCore = () => {
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const instancedBarsRef = useRef<THREE.InstancedMesh>(null);

  const visibleLayers = usePlayerStore(state => state.visibleLayers);

  // Pure Monolithic Obsidian Core Shader Material
  const shaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: CoreShaderMaterial.vertexShader,
      fragmentShader: CoreShaderMaterial.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
      side: THREE.DoubleSide,
    });
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-calculate angular directions for all 64 ticks around 360 degrees
  const dialAngles = useMemo(() => {
    const angles = new Float32Array(NUM_DIAL_BARS);
    for (let i = 0; i < NUM_DIAL_BARS; i++) {
      angles[i] = (i / NUM_DIAL_BARS) * Math.PI * 2;
    }
    return angles;
  }, []);

  // Initial setup of instance matrices
  useEffect(() => {
    if (!instancedBarsRef.current) return;
    for (let i = 0; i < NUM_DIAL_BARS; i++) {
      const theta = dialAngles[i];
      dummy.position.set(Math.cos(theta) * DIAL_RADIUS, 0, Math.sin(theta) * DIAL_RADIUS);
      dummy.rotation.set(0, -theta + Math.PI / 2, 0);
      dummy.scale.set(1, 1, 0.06);
      dummy.updateMatrix();
      instancedBarsRef.current.setMatrixAt(i, dummy.matrix);
    }
    instancedBarsRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy, dialAngles]);

  useFrame((state, delta) => {
    const engine = AudioEngine.getInstance();
    const audioData = engine.update();

    // 1. Update Core Shader Uniforms
    shaderMat.uniforms.uTime.value = state.clock.elapsedTime;
    shaderMat.uniforms.uBass.value = audioData.bass;
    shaderMat.uniforms.uMid.value = audioData.mid;
    shaderMat.uniforms.uHigh.value = audioData.high;
    shaderMat.uniforms.uBeatIntensity.value = audioData.beatIntensity;

    // Organic breathing of the obsidian core
    if (coreMeshRef.current) {
      coreMeshRef.current.rotation.y += delta * 0.1;
      coreMeshRef.current.rotation.x += delta * 0.06;
      const baseScale = 1.0 + audioData.bass * 0.1 + audioData.beatIntensity * 0.08;
      coreMeshRef.current.scale.set(baseScale, baseScale, baseScale);
    }

    // 2. Bilateral Mirror Mapping on 64 Laser Ticks
    if (instancedBarsRef.current && visibleLayers.rings) {
      const fft = audioData.dataArray;

      for (let i = 0; i < NUM_DIAL_BARS; i++) {
        const theta = dialAngles[i];
        
        // Bilateral mirror: index maps to first 64 bins with spacing
        const bin = i < 32 ? i * 2 : (63 - i) * 2;
        const rawFftVal = fft[bin] || 0;
        
        // High-frequency compensation boost for balanced 360-degree bloom
        const highComp = 1.0 + bin * 0.025;
        const normVal = Math.min(1.0, (rawFftVal / 255.0) * highComp);

        // Quiet state: resting 0.06m tick. Loud state: extends cleanly outward up to 1.6m
        const barLength = Math.max(0.06, Math.pow(normVal, 1.35) * 1.6 * (1.0 + audioData.bass * 0.35));
        const r = DIAL_RADIUS + barLength * 0.5;

        dummy.position.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
        dummy.rotation.set(0, -theta + Math.PI / 2, 0);
        dummy.scale.set(1, 1, barLength);
        dummy.updateMatrix();
        instancedBarsRef.current.setMatrixAt(i, dummy.matrix);
      }
      instancedBarsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. PURE MONOLITHIC OBSIDIAN CORE */}
      {visibleLayers.core && (
        <mesh ref={coreMeshRef} material={shaderMat}>
          <icosahedronGeometry args={[1.75, 48]} />
        </mesh>
      )}

      {/* 2. 64-POINT PRECISION LASER DIAL */}
      {visibleLayers.rings && (
        <>
          {/* Razor-thin Circular Reference Track */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.645, 2.655, 64]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent={true}
              opacity={0.2}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* 64 Precision Laser Tick Marks */}
          <instancedMesh
            ref={instancedBarsRef}
            args={[undefined, undefined, NUM_DIAL_BARS]}
          >
            <boxGeometry args={[0.015, 0.015, 1.0]} />
            <meshBasicMaterial color="#ffffff" />
          </instancedMesh>
        </>
      )}
    </group>
  );
};
