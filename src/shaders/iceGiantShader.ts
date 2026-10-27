/**
 * iceGiantShader.ts
 * Masterpiece Methane Absorption & Atmospheric Dynamics for Ice Giants:
 * - Uranus (Type 0): Extreme 98 deg obliquity, high-altitude photochemical hydrocarbon haze,
 *   polar hood brightening, enhanced-contrast stratospheric cloud bands.
 * - Neptune (Type 1): Deep methane absorption, supersonic equatorial jet winds (2,100 km/h),
 *   high-altitude bright methane cirrus clouds ("Scooter"), Great Dark Spot (GDS) with bright companion clouds.
 */

export const iceGiantVertexShader = /* glsl */ `
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

export const iceGiantFragmentShader = /* glsl */ `
  uniform int uGiantType; // 0=Uranus, 1=Neptune
  uniform float uTime;
  uniform float uBass;

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

  void main() {
    vec3 lightDir = normalize(-vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float NdotL = dot(vNormal, lightDir);
    float dayNight = smoothstep(-0.10, 0.12, NdotL);

    vec3 pNorm = normalize(vPosition);
    float lat = pNorm.y; // [-1.0 .. +1.0]
    float phi = atan(pNorm.z, pNorm.x);

    float baseAlbedo = 0.65;
    float atmosphereHaze = 0.0;

    // ==========================================
    // --- URANUS (Type 0) ---
    // ==========================================
    if (uGiantType == 0) {
      // Enhanced-contrast stratospheric haze with distinct polar hood (Keck AO / Voyager 2 style)
      float polarHood = smoothstep(0.38, 0.85, abs(lat)) * 0.22;
      float zonalBands = sin(lat * 14.0) * 0.08 + sin(lat * 28.0 + uTime * 0.03) * 0.04;
      
      // High-altitude subtle methane cirrus streaks (evaluated in 3D to eliminate polar pinching)
      float cirrusStreaks = pow(max(0.0, snoise(pNorm * vec3(5.0, 18.0, 5.0) + vec3(0.0, 0.0, uTime * 0.05))), 2.2) * 0.16;

      baseAlbedo = 0.68 + polarHood + zonalBands + cirrusStreaks;

      // High-altitude methane Rayleigh scattering
      atmosphereHaze = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.8) * 0.58;
    }

    // ==========================================
    // --- NEPTUNE (Type 1) ---
    // ==========================================
    else if (uGiantType == 1) {
      // Supersonic differential zonal winds (v ~ 400 m/s): steady drift along azimuth
      float zonalVelocity = (1.2 - 0.7 * cos(lat * 3.14159)); // Mid-latitude retrograde & equatorial prograde jets
      float drift = mod(uTime * 0.15 * zonalVelocity, 6.28318);
      float cW = cos(drift);
      float sW = sin(drift);
      vec3 windPos = vec3(pNorm.x * cW - pNorm.z * sW, pNorm.y, pNorm.x * sW + pNorm.z * cW);

      // Deep zonal belts and zones (band-limited for silky fluid smoothness)
      float neptuneBands = sin(lat * 6.0) * 0.12 + sin(lat * 14.0) * 0.05;

      // High-altitude bright methane cirrus clouds ("Scooter" fast white clouds)
      float cirrus1 = smoothstep(0.40, 0.72, snoise(windPos * vec3(3.5, 8.0, 3.5))) * 0.35;
      float cirrus2 = smoothstep(0.46, 0.78, snoise(windPos * vec3(5.5, 12.0, 5.5) + vec3(1.2, 0.0, 0.8))) * 0.22;

      // Great Dark Spot (GDS: Voyager 2 anticyclone prominently displayed on sunlit face)
      vec2 gdsPos = vec2(-0.85, -0.22);
      float dPhi = mod(phi - gdsPos.x + 3.14159, 6.28318) - 3.14159;
      float dLat = lat - gdsPos.y;
      float rGds = sqrt(dPhi * dPhi * 3.0 + dLat * dLat * 9.5);

      // Dark elliptical vortex core
      float darkSpot = (1.0 - smoothstep(0.08, 0.24, rGds)) * 0.38;
      // Bright white companion cirrus storm clouds flanking the dark spot
      float companionCloud = smoothstep(0.26, 0.19, rGds) * (1.0 - smoothstep(0.19, 0.13, rGds)) * 0.48;

      // Small Dark Spot DS2 at 55 deg South (lat ~ -0.82)
      vec2 d2Pos = vec2(1.2, -0.82);
      float dPhi2 = mod(phi - d2Pos.x + 3.14159, 6.28318) - 3.14159;
      float dLat2 = lat - d2Pos.y;
      float rD2 = sqrt(dPhi2 * dPhi2 * 4.0 + dLat2 * dLat2 * 14.0);
      float darkSpot2 = (1.0 - smoothstep(0.06, 0.18, rD2)) * 0.28;

      baseAlbedo = 0.50 + neptuneBands + cirrus1 + cirrus2 - darkSpot + companionCloud - darkSpot2;

      // Intense blue methane limb haze
      atmosphereHaze = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.2) * 0.65;
    }

    // Perceptual Stellar Irradiance
    float helioDist = max(0.1, length(vWorldPosition));
    float rNorm = helioDist / 3.25;
    float irradiance = pow(1.85 / (sqrt(rNorm) + 0.85), 1.25);

    // Cornette-Shanks Forward Mie Scattering Crescent Halo (backlit side)
    float LdotV = dot(lightDir, viewDir);
    float g = 0.78;
    float g2 = g * g;
    float forwardPhase = (1.5 * (1.0 - g2) / (2.0 + g2)) * (1.0 + LdotV * LdotV) / pow(max(0.01, 1.0 + g2 - 2.0 * g * LdotV), 1.5);
    float limbFresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.2);
    float backlitCondition = pow(max(0.0, -LdotV), 2.8);
    float forwardCrescent = limbFresnel * backlitCondition * forwardPhase * 0.58;

    float directLight = max(0.0, NdotL) * dayNight * irradiance * 1.15;

    // Scotopic Starlight Ambient from Galactic Plane
    vec3 scotopicAmbient = vec3(0.046, 0.052, 0.070);

    vec3 surfaceColor = baseAlbedo * (vec3(directLight) + scotopicAmbient);
    vec3 highlights = (atmosphereHaze + forwardCrescent) * irradiance * vec3(1.0);
    vec3 finalColor = (surfaceColor + highlights) * (1.0 + uBass * 0.1);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
