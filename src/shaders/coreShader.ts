import { simplexNoiseGLSL } from './simplexNoise.glsl';

export const CoreShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uBeatIntensity: { value: 0 },
  },

  vertexShader: /* glsl */ `
    ${simplexNoiseGLSL}

    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uBeatIntensity;

    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // Gentle, organic liquid ferrofluid wave
      float freq = 0.55 + uMid * 0.2;
      float displacement = snoise(position * freq + vec3(0.0, uTime * 0.45, 0.0)) * (0.15 + uBass * 0.45);

      vec3 newPosition = position + normal * displacement;

      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
      vViewPosition = mvPosition.xyz;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    uniform float uBass;
    uniform float uBeatIntensity;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vViewPosition);

      // 1. Subtle 3D diffuse lighting (Soft Obsidian form factor)
      vec3 lightDir = normalize(vec3(0.6, 1.0, 0.7));
      float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);

      // 2. High-precision Specular highlight (Glossy Obsidian Ceramic)
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), 48.0);

      // 3. Razor-thin White Eclipse Rim Light (Silhouette Laser Flare)
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.8);
      float rimLight = fresnel * (0.85 + uBeatIntensity * 0.95);

      // Pure Monolithic Obsidian: Deep void interior (#020203) with gleaming white rim
      float baseObsidian = 0.02 + diffuse * 0.06 + spec * 0.4;
      float luminance = clamp(baseObsidian + rimLight, 0.0, 1.0);

      gl_FragColor = vec4(vec3(luminance), 1.0);
    }
  `,
};
