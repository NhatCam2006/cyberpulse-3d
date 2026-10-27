import { simplexNoiseGLSL } from './simplexNoise.glsl';

export const milkyWayVertexShader = /* glsl */ `
varying vec3 vWorldDir;

void main() {
  // Pass normalized local/world direction vector to fragment shader
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const milkyWayFragmentShader = /* glsl */ `
${simplexNoiseGLSL}

uniform float uTime;
uniform float uBass;
uniform float uMid;

varying vec3 vWorldDir;

void main() {
  vec3 dir = normalize(vWorldDir);

  // 1. ASTRONOMICAL GALACTIC PLANE ORIENTATION (J2000 Inclination ~60.2 deg)
  // Normal vector to the Milky Way Galactic Plane
  vec3 nGal = normalize(vec3(-0.866, 0.497, 0.0545));

  // Galactic Center direction (Sagittarius A* in galactic equator)
  vec3 vCore = normalize(vec3(-0.18, -0.15, -0.97));

  // Galactic latitude sine: sin(b) = dir . nGal
  float sinB = dot(dir, nGal);
  float absB = abs(sinB);

  // 2. GALACTIC DISC LUMINANCE PROFILE (Gaussian band with soft cosmic falloff)
  // Disc thickness sigma ~ 0.12 (~7 degrees)
  float discIntensity = exp(- (absB * absB) / (2.0 * 0.11 * 0.11));
  discIntensity *= smoothstep(0.38, 0.02, absB);

  // 3. GALACTIC BULGE (Sagittarius A* Core Glow)
  float distCore = length(dir - vCore);
  float bulgeIntensity = exp(- (distCore * distCore) / (2.0 * 0.24 * 0.24));
  // Microscopic breathing of core on deep sub-bass (imperceptible, living cosmos)
  bulgeIntensity *= (1.0 + uBass * 0.08);

  // 4. THE GREAT RIFT (Interstellar Molecular Dust Extinction)
  // Fractal 3D noise sculpting organic dark silhouettes across the galactic equator
  float dust1 = snoise(dir * 3.6 + vec3(0.2, 0.5, 0.1));
  float dust2 = snoise(dir * 7.5 + vec3(1.4, -0.8, 0.6));
  float dustFbm = clamp(dust1 * 0.65 + dust2 * 0.35 + 0.15, 0.0, 1.0);

  // Dark dust is concentrated strictly near the galactic equator
  float dustMask = smoothstep(0.12, 0.01, absB);
  float dustExtinction = 1.0 - dustMask * dustFbm * 0.72;

  // Secondary fine dust filaments
  float fineDust = snoise(dir * 16.0);
  if (fineDust > 0.4 && absB < 0.06) {
    dustExtinction *= 0.85;
  }

  // 5. COMBINED GALACTIC LUMINANCE
  float totalLum = (discIntensity * 0.68 + bulgeIntensity * 0.42) * dustExtinction;

  // 6. SCOTOPIC SILVER-CHARCOAL PALETTE (Strict Ryoji Ikeda / Bortle 1 night sky)
  // Silver moonlit starlight #C8D0DC
  vec3 starLightCol = vec3(0.80, 0.84, 0.92);
  // Warm core tint for Sagittarius A*
  vec3 coreWarmCol = vec3(0.92, 0.88, 0.80);
  vec3 bandCol = mix(starLightCol, coreWarmCol, bulgeIntensity * 0.5);

  // 7. STRICT LOW-OPACITY CEILING (Max alpha <= 0.11, completely non-distracting)
  float alpha = clamp(totalLum * 0.11, 0.0, 0.11);

  gl_FragColor = vec4(bandCol, alpha);
}
`;
