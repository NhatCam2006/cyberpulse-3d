import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LiquidChromeShader } from '../../shaders/liquidChromeShader';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AudioEngine } from '../../audio/AudioEngine';

const RING_POINTS = 128;

export const LiquidCore = () => {
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const visibleLayers = usePlayerStore(state => state.visibleLayers);

  // Liquid Chrome Shader Material
  const shaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: LiquidChromeShader.vertexShader,
      fragmentShader: LiquidChromeShader.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
      side: THREE.FrontSide,
    });
  }, []);

  // Inner Audio Resonance Ring
  const innerRing = useMemo(() => {
    const pos = new Float32Array(RING_POINTS * 3);
    for (let i = 0; i < RING_POINTS; i++) {
      const theta = (i / RING_POINTS) * Math.PI * 2;
      pos[i * 3 + 0] = Math.cos(theta) * 2.85;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.sin(theta) * 2.85;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    return new THREE.LineLoop(geom, mat);
  }, []);

  // Outer Harmonic Orbit Ring
  const outerRing = useMemo(() => {
    const pos = new Float32Array(RING_POINTS * 3);
    for (let i = 0; i < RING_POINTS; i++) {
      const theta = (i / RING_POINTS) * Math.PI * 2;
      pos[i * 3 + 0] = Math.cos(theta) * 3.8;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.sin(theta) * 3.8;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.45,
    });
    return new THREE.LineLoop(geom, mat);
  }, []);

  useFrame((state, delta) => {
    const engine = AudioEngine.getInstance();
    const audioData = engine.update();
    const { bass, mid, high, beatIntensity, dataArray } = audioData;

    // 1. Update Liquid Chrome Shader Uniforms
    shaderMat.uniforms.uTime.value = state.clock.elapsedTime;
    shaderMat.uniforms.uBass.value = bass;
    shaderMat.uniforms.uMid.value = mid;
    shaderMat.uniforms.uHigh.value = high;
    shaderMat.uniforms.uBeatIntensity.value = beatIntensity;

    // Smooth organic rotation and swelling
    if (coreMeshRef.current) {
      coreMeshRef.current.rotation.y += delta * 0.18;
      coreMeshRef.current.rotation.x += delta * 0.1;
      const baseScale = 1.0 + bass * 0.18 + beatIntensity * 0.12;
      coreMeshRef.current.scale.set(baseScale, baseScale, baseScale);
    }

    // 2. Animate Audio Rings
    if (visibleLayers.rings) {
      // Inner Equatorial Audio Waveform Ring
      const innerPos = innerRing.geometry.attributes.position.array as Float32Array;
      const baseR = 2.85;

      for (let i = 0; i < RING_POINTS; i++) {
        const theta = (i / RING_POINTS) * Math.PI * 2;
        // Bilateral mirror symmetry
        const bin = i < 64 ? i : 127 - i;
        const rawFft = dataArray[bin] || 0;
        const norm = (rawFft / 255.0) * (1.0 + bin * 0.02);

        const r = baseR + Math.pow(norm, 1.4) * 1.5 * (1.0 + bass * 0.4);
        innerPos[i * 3 + 0] = Math.cos(theta) * r;
        innerPos[i * 3 + 1] = Math.sin(theta * 4.0 + state.clock.elapsedTime * 2.0) * 0.08 * bass;
        innerPos[i * 3 + 2] = Math.sin(theta) * r;
      }
      innerRing.geometry.attributes.position.needsUpdate = true;
      innerRing.rotation.y += delta * 0.15;

      // Outer Harmonic Orbit Ring
      const outerPos = outerRing.geometry.attributes.position.array as Float32Array;
      const outerR = 3.8;

      for (let i = 0; i < RING_POINTS; i++) {
        const theta = (i / RING_POINTS) * Math.PI * 2;
        const bin = (i * 2) % 64;
        const rawFft = dataArray[bin] || 0;
        const norm = (rawFft / 255.0);

        const r = outerR + Math.pow(norm, 1.3) * 0.8 * (1.0 + mid * 0.5);
        outerPos[i * 3 + 0] = Math.cos(theta) * r;
        outerPos[i * 3 + 1] = Math.sin(theta * 6.0 - state.clock.elapsedTime * 1.5) * 0.06;
        outerPos[i * 3 + 2] = Math.sin(theta) * r;
      }
      outerRing.geometry.attributes.position.needsUpdate = true;
      outerRing.rotation.y -= delta * 0.08;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. LIQUID MERCURY / CHROME ORB */}
      {visibleLayers.core && (
        <mesh ref={coreMeshRef} material={shaderMat}>
          <sphereGeometry args={[1.85, 64, 64]} />
        </mesh>
      )}

      {/* 2. INNER & OUTER AUDIO WAVEFORM RINGS */}
      {visibleLayers.rings && (
        <>
          <primitive object={innerRing} />
          <primitive object={outerRing} />
        </>
      )}
    </group>
  );
};
