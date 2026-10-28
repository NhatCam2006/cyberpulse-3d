/**
 * sunAtmosphereShader.ts
 * Masterpiece Solar Photosphere & Chromosphere Shader.
 * 
 * Hard Sci-Fi Stellar Luminescence Model (Pure Astrophysical Light):
 * 1. Pure Incandescent Starlight Core:
 *    Thermonuclear fusion core radiating pure, monolithic starlight (SpaceEngine × NASA).
 *    Zero internal squiggles, zero brain coral, zero camouflage worms, zero jitter.
 * 2. True Physical 3D Spherical Volume (Eddington-Barbier Limb Darkening):
 *    Center (mu = 1.0) is incandescent (1.05); limb (mu -> 0) rolls off softly to (0.45),
 *    establishing rich, unmistakable 3D spherical roundness and volumetric depth.
 * 3. Atmospheric Silhouette Feathering:
 *    Grazing edge (mu < 0.08) feathers smoothly into the transparent void, completely
 *    dissolving the polygonal sphere into the surrounding coronal starlight.
 * 4. Dual-Tier Audio Starlight Glint:
 *    Linear + quadratic response ensures BOTH heavy kicks (+12%) and light beats (+6.2%)
 *    produce crisp, palpable pulses without nuclear blowout or dark extinction.
 */

export const sunAtmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vPosition = position;
    vUv = uv;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const sunAtmosphereFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uBeatIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float mu = max(0.0, dot(vNormal, viewDir)); // cos(theta) between surface normal and line-of-sight

    // 1. True Physical 3D Spherical Volume (Eddington-Barbier Limb Darkening Law)
    // Fusion core (mu = 1.0) is brilliant starlight (1.05).
    // Toward the limb (mu -> 0), optical path through upper atmospheric layers yields a smooth,
    // spherical gradient down to 0.45, establishing tactile 3D curvature and volumetric depth.
    float limbDarkening = 0.45 + 0.60 * pow(mu, 0.65);

    // 2. Responsive Audio Starlight Glint (Heavy kicks + Light rhythmic beats):
    // Heavy beat (1.0): +12% starlight glint
    // Light beat (0.5): +6.2% starlight glint (clearly felt pulse!)
    float kickFlare = uBeatIntensity * 0.085 + pow(uBeatIntensity, 2.0) * 0.035;
    float melodicGlint = uMid * 0.04;
    float finalLuminance = limbDarkening * (1.0 + kickFlare + melodicGlint);

    // 3. Atmospheric Silhouette Feathering:
    // Grazing edge (mu < 0.08) feathers smoothly into the transparent void, completely
    // dissolving the hard polygonal geometric silhouette into the surrounding corona halo.
    float edgeAlpha = smoothstep(0.005, 0.08, mu);

    // Output HDR luminance directly into ACES Filmic tonemapper
    gl_FragColor = vec4(vec3(finalLuminance), edgeAlpha);
  }
`;
