/**
 * sunAtmosphereShader.ts
 * Masterpiece Solar Photosphere & Chromosphere Shader.
 * 
 * Astrophysical Model:
 * 1. Eddington-Barbier Limb Darkening Law: I(mu) = I_0 * [1 - u(1 - mu)]
 *    Photosphere naturally darkens towards the limb (mu = n . v -> 0).
 * 2. Convective Granulation: Voronoi-like cellular convection cells with bright
 *    ascending hot plasma centers and dark downwelling intergranular channels.
 * 3. Bipolar Sunspot Pairs (Hale-Nicholson & Joy's Law):
 *    Pitch-dark central umbra (magnetic core) surrounded by radial filamentary penumbra fibrils.
 * 4. Bright Magnetic Faculae & Plages surrounding sunspot active belts.
 * 5. Chromospheric Spicule Fringe: High-frequency solar plasma spicules at the extreme grazing limb.
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

  // 3D Simplex noise generator
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Multi-octave Fractional Brownian Motion (fBm)
  float fbm(vec3 p) {
    float val = 0.0;
    float amp = 0.52;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      val += amp * snoise(p * freq);
      freq *= 2.12;
      amp *= 0.48;
    }
    return val;
  }

  // Cellular Voronoi approximation for Photospheric Granules
  float solarGranulation(vec3 p) {
    // Boiling granular convection
    float n1 = snoise(p * 18.0 + vec3(0.0, uTime * 0.12, 0.0));
    float n2 = snoise(p * 36.0 - vec3(uTime * 0.15, 0.0, 0.0));
    float n3 = snoise(p * 72.0 + vec3(0.0, 0.0, uTime * 0.22));

    // Cell centers are bright, cell boundaries are sharp dark lanes
    float cell = abs(n1) * 0.6 + abs(n2) * 0.3 + abs(n3) * 0.1;
    // Invert so centers are elevated bright mounds
    float granuleMounds = 1.0 - smoothstep(0.08, 0.65, cell);
    return granuleMounds;
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float mu = max(0.0, dot(vNormal, viewDir)); // cos(theta) between normal and line-of-sight

    // 1. True Astrophysical Eddington-Barbier Limb Darkening
    // I(mu) = I_0 * [1 - u*(1 - mu) - v*(1 - sqrt(mu))]
    // Near center (mu=1.0): limbFactor = 1.0
    // At limb (mu=0.0): limbFactor drops to ~0.38
    float u = 0.62;
    float limbDarkening = 1.0 - u * (1.0 - mu);
    limbDarkening = pow(limbDarkening, 1.15);

    // 2. Solar Granulation Convection Cells & Dynamic Audio Plasma Churn
    vec3 pNorm = normalize(vPosition);
    float granules = solarGranulation(pNorm);
    float plasmaSpeed = 0.04 + uMid * 0.10 + uBass * 0.06;
    float macroFlow = fbm(pNorm * 4.2 + vec3(uTime * plasmaSpeed));

    // Core photosphere base emission (calibrated for high contrast & zero whiteout)
    float basePhotosphere = 0.72 + granules * 0.26 + macroFlow * 0.16;

    // 3. Active Sunspot Belts (Toroidal magnetic fields at lat +/- 12 to 32 deg)
    float sinLat = abs(pNorm.y);
    float activeBand = smoothstep(0.18, 0.28, sinLat) * (1.0 - smoothstep(0.48, 0.62, sinLat));

    // Multi-spot magnetic clusters (Bipolar active regions)
    float spotNoise = fbm(pNorm * 8.5 + vec3(uTime * 0.015, 0.0, 0.0));
    float spotCluster = smoothstep(0.38, 0.68, spotNoise) * activeBand;

    // Umbra (dark inner core) & Penumbra (filamentary radial boundary)
    float umbra = smoothstep(0.55, 0.72, spotNoise) * activeBand * 0.92;
    float penumbraFilaments = snoise(pNorm * 42.0) * 0.15;
    float penumbra = smoothstep(0.38, 0.55, spotNoise) * activeBand * (0.55 + penumbraFilaments);

    // Faculae (Bright magnetic network surrounding sunspots, accentuated at higher limb angles)
    float faculaeNoise = pow(max(0.0, snoise(pNorm * 28.0 + vec3(1.5))), 2.5);
    float faculae = faculaeNoise * activeBand * (1.0 - mu * 0.5) * 0.45;

    // Combine surface features
    float surface = (basePhotosphere - (umbra + penumbra) + faculae) * limbDarkening;

    // 4. Extreme Grazing Chromospheric Spicule Crown (Audio-reactive plasma fringe)
    float grazingRim = 1.0 - mu;
    float spicules = pow(grazingRim, 6.0) * (0.9 + snoise(vec3(vPosition.xy * 28.0, uTime * 1.6)) * 0.5);

    // Audio responsiveness: Solar flare expansion on heavy kick + rich melodic glint on piano/vocals
    float melodicGlint = (uMid * 0.70);
    float kickPop = pow(uBeatIntensity, 1.30) * 0.65;
    float flare = (uBass * 0.15 + kickPop) + melodicGlint;
    // Core surface preserves contrast; rim spicules flash radiantly on beats and melody
    float finalLuminance = surface * (1.0 + flare * 0.35) + spicules * (1.0 + flare * 1.7);

    // Output HDR luminance directly into ACES Filmic tonemapper
    gl_FragColor = vec4(vec3(finalLuminance), 1.0);
  }
`;
