import { simplexNoiseGLSL } from './simplexNoise.glsl';

export const LiquidChromeShader = {
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
    varying vec3 vWorldNormal;
    varying vec3 vWorldPos;
    varying float vDisplacement;

    void main() {
      vec3 pos = position;

      // Silky smooth harmonic wave frequencies (organic liquid mercury)
      float freq = 0.8 + uMid * 0.3;
      float t = uTime * 0.6;

      float n1 = snoise(pos * freq + vec3(0.0, t * 0.7, 0.0));
      float n2 = snoise(pos * (freq * 1.8) - vec3(t * 0.5));

      // Displacement: Large graceful swells on Bass, subtle ripples on High
      float displacement = (n1 * (0.18 + uBass * 0.55) + n2 * (0.06 + uHigh * 0.2)) * (1.0 + uBeatIntensity * 0.3);
      vDisplacement = displacement;

      vec3 newPosition = pos + normal * displacement;

      // Normal transformation
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
      vWorldPos = worldPosition.xyz;
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

      vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
      vViewPosition = mvPosition.xyz;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uBass;
    uniform float uBeatIntensity;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPos;
    varying float vDisplacement;

    void main() {
      // Recompute true geometric surface normal using screen derivatives for faceted liquid tension
      vec3 fdx = dFdx(vViewPosition);
      vec3 fdy = dFdy(vViewPosition);
      vec3 surfaceNormal = normalize(cross(fdx, fdy));

      vec3 viewDir = normalize(-vViewPosition);

      // Reflection vector for procedural environment reflection
      vec3 refl = reflect(-viewDir, surfaceNormal);

      // Procedural Studio Reflection (Simulating a high-end luxury dark room with soft light panels)
      // Overhead softbox reflection
      float overhead = smoothstep(0.3, 0.9, refl.y) * 0.65;
      // Horizon studio reflection strip
      float horizonStrip = exp(-pow(refl.y * 3.5, 2.0)) * 0.45;
      // Front fill reflection
      float frontFill = max(refl.z, 0.0) * 0.2;

      // Base Liquid Chrome color: deep dark silver (#121216) to bright titanium
      float envReflection = clamp(overhead + horizonStrip + frontFill, 0.0, 1.0);
      vec3 chromeBase = mix(vec3(0.04, 0.04, 0.06), vec3(0.85, 0.88, 0.95), envReflection);

      // Specular key light highlight
      vec3 lightDir = normalize(vec3(0.8, 1.2, 1.0));
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(surfaceNormal, halfDir), 0.0), 64.0);

      // High-precision Fresnel Rim (Silhouette glow)
      float fresnel = pow(1.0 - max(dot(surfaceNormal, viewDir), 0.0), 3.2);

      // Subtle iridescent titanium interference along the grazing rim
      vec3 iridColor = vec3(
        0.5 + 0.5 * cos(fresnel * 6.28 + 0.0),
        0.5 + 0.5 * cos(fresnel * 6.28 + 2.0),
        0.5 + 0.5 * cos(fresnel * 6.28 + 4.0)
      );

      // Audio beat ignition: On heavy bass, the chrome flares with pure white photon energy
      float beatFlash = uBeatIntensity * 0.7;

      vec3 finalColor = chromeBase 
                      + vec3(spec * 0.85) 
                      + (vec3(1.0) * fresnel * (1.2 + beatFlash))
                      + (iridColor * fresnel * 0.35);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};
