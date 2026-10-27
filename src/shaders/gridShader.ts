import * as THREE from 'three';
import { simplexNoiseGLSL } from './simplexNoise.glsl';

export const GridShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uBeatIntensity: { value: 0 },
    uColorA: { value: new THREE.Color('#00f3ff') },
    uColorB: { value: new THREE.Color('#ff007f') },
    uGridDensity: { value: 36.0 },
  },

  vertexShader: /* glsl */ `
    ${simplexNoiseGLSL}

    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uBeatIntensity;

    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;

      vec3 pos = position;

      // Canyon threshold: Center corridor |x| < 8.0 is completely flat (elevation = 0.0)
      // Only outer sides |x| >= 8.0 rise into synthwave mountain ranges
      float distFromCenter = abs(pos.x);
      float canyonEdge = smoothstep(8.0, 26.0, distFromCenter);

      // Simplex noise mountain ridges on outer flanks
      float noiseVal = snoise(vec3(pos.x * 0.07, pos.y * 0.07 - uTime * 0.25, 0.0));
      float noiseDetail = snoise(vec3(pos.x * 0.16, pos.y * 0.16 - uTime * 0.4, 1.0)) * 0.4;

      // Outer mountains amplified by Bass and Beat Intensity
      float mountainHeight = (noiseVal + noiseDetail + 0.3) * (2.2 + uBass * 4.0 + uBeatIntensity * 2.2);
      float elevation = mountainHeight * canyonEdge;

      pos.z += elevation;
      vElevation = pos.z;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uTime;
    uniform float uBass;
    uniform float uBeatIntensity;
    uniform float uGridDensity;

    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vViewPosition;

    void main() {
      // Calculate sharp neon grid wireframe lines using screen derivatives
      vec2 gridUv = fract(vUv * uGridDensity);
      vec2 gridWidth = fwidth(vUv * uGridDensity);
      
      vec2 line = smoothstep(vec2(0.04), vec2(0.04) + gridWidth * 1.5, gridUv) * 
                  smoothstep(vec2(0.04), vec2(0.04) + gridWidth * 1.5, vec2(1.0) - gridUv);
      float gridFactor = 1.0 - min(line.x, line.y);

      // Subtle pulse wave along Y
      float pulse = fract(vUv.y * 5.0 - uTime * 1.0);
      float pulseWave = smoothstep(0.0, 0.12, pulse) * smoothstep(0.24, 0.12, pulse) * (0.25 + uBeatIntensity * 0.35);

      // Grid line color: Use uColorB (darker/secondary color) to prevent clashing with the bright Core
      vec3 gridLineColor = mix(uColorB * 0.75, uColorA * 0.45, smoothstep(0.5, 5.0, vElevation));
      gridLineColor += uColorB * pulseWave;

      // Deep dark void floor
      vec3 floorColor = vec3(0.015, 0.015, 0.035);

      vec3 finalColor = mix(floorColor, gridLineColor, gridFactor);

      // Distance fog towards dark abyss (#040409)
      float dist = length(vViewPosition);
      float fog = smoothstep(10.0, 38.0, dist);
      vec3 fogColor = vec3(0.015, 0.015, 0.035);
      finalColor = mix(finalColor, fogColor, fog);

      // Strict opacity={0.28} for the grid as specified, fading in distant fog
      float alpha = mix(0.1, 0.28, gridFactor) * (1.0 - fog * 0.9);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};
