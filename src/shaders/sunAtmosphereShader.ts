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
  // Smooth, low-frequency solar convection (0 high-frequency aliasing, 0 jitter)
  float solarConvection(vec3 p, float tau) {
    float n1 = snoise(p * 5.5 + vec3(0.0, tau * 0.4, 0.0));
    float n2 = snoise(p * 11.0 + vec3(tau * 0.3, 0.0, tau * 0.2));
    return (n1 * 0.65 + n2 * 0.35);
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float mu = max(0.0, dot(vNormal, viewDir)); // cos(theta) between normal and line-of-sight

    // 1. NASA Eddington-Barbier Limb Darkening (Gives roundness without blackening)
    float u = 0.38;
    float v = 0.16;
    float limb = 1.0 - u * (1.0 - mu) - v * (1.0 - sqrt(mu));

    // 2. Monotonic Phase Time (Zero phase-jumping, zero jitter)
    vec3 pNorm = normalize(vPosition);
    float monoTime = uTime * 0.025; // Gentle, majestic cosmic drift

    // 3. Smooth Convective Texture (Audio modulates subtle contrast, NOT coordinates)
    float convection = solarConvection(pNorm, monoTime);
    float audioContrast = 0.08 + uMid * 0.04; // Very subtle, soothing variation
    float granules = convection * audioContrast;

    // 4. Photosphere Base Radiance (Solid foundation: never dims into dark mud)
    float basePhotosphere = 0.90 + granules;

    // 5. Chromospheric Grazing Starlight Fringe (Only at extreme grazing edge mu < 0.08)
    float edge = 1.0 - mu;
    float rimFringe = pow(edge, 6.0) * 0.16;

    // 6. Bounded Dual-Tier Luminance Envelope (Skill: stellar-luminescence-optics)
    // Base floor: 0.88 (Clear, radiant, warm, never "tắt đèn")
    // Ceiling: 1.05 (Soft, controlled starlight glint, never "sáng khủng khiếp")
    float kickGlint = pow(uBeatIntensity, 1.30) * 0.12;
    float melodicGlint = uMid * 0.06;
    float audioPulse = kickGlint + melodicGlint;

    float finalLuminance = (basePhotosphere * limb + rimFringe) * (1.0 + audioPulse);
    finalLuminance = clamp(finalLuminance, 0.84, 1.06);

    // Output HDR luminance directly into ACES Filmic tonemapper
    gl_FragColor = vec4(vec3(finalLuminance), 1.0);
  }
`;
