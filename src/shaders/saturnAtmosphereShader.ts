/**
 * saturnAtmosphereShader.ts
 * Physical Atmospheric Shader for Saturn's Globe:
 * 1. Delicate pastel ammonia/methane atmospheric banding (multiple subtle belts and zones).
 * 2. Cassini North Polar Hexagon standing Rossby wave (n = 6) with central dark polar vortex.
 * 3. Analytical Ring Shadow Cast: Projection of Saturn's dense rings (B & A) onto the globe with Cassini Division light gap.
 * 4. Day/Night terminator with atmospheric forward-scattering twilight.
 */

export const saturnAtmosphereVertexShader = /* glsl */ `
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

export const saturnAtmosphereFragmentShader = /* glsl */ `
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
    vec3 pNorm = normalize(vPosition);
    float lat = pNorm.y; // [-1.0 .. +1.0]
    float phi = atan(pNorm.z, pNorm.x);

    // 1. Zonal Cloud Banding: Fine, harmonic pastel layers
    float macroBands = sin(lat * 14.0) * 0.14;
    float microBands = sin(lat * 38.0 + uTime * 0.03) * 0.06 + sin(lat * 72.0) * 0.03;
    float shear = snoise(pNorm * vec3(6.0, 16.0, 6.0) + vec3(0.0, 0.0, uTime * 0.06)) * 0.06;
    float baseAlbedo = 0.74 + macroBands + microBands + shear;

    // 2. North Polar Hexagon (Cassini standing Rossby wave at lat > 0.74)
    if (lat > 0.72) {
      float rPole = sqrt(pNorm.x * pNorm.x + pNorm.z * pNorm.z);
      // Hexagonal 6-fold harmonic: cos(6 * theta)
      float hexPattern = cos(6.0 * phi);
      float hexRadius = 0.36 + 0.04 * hexPattern;
      float hexWall = smoothstep(0.035, 0.0, abs(rPole - hexRadius)) * 0.35;
      float polarEye = smoothstep(0.18, 0.0, rPole) * 0.55; // Dark inner polar vortex
      baseAlbedo = mix(baseAlbedo, 0.96, hexWall);
      baseAlbedo = mix(baseAlbedo, 0.32, polarEye);
    }

    // 3. Ring Shadow Cast on the Globe:
    // Sunlight originates from Sol at (0,0,0) in world space.
    // Shadows cast across the winter hemisphere (lat 0.06 to 0.44)
    float ringShadow = 0.0;
    if (lat > 0.05 && lat < 0.45) {
      // B-Ring shadow is dense and dark
      float shadowB = smoothstep(0.07, 0.12, lat) * (1.0 - smoothstep(0.24, 0.28, lat));
      // Cassini Division gap in shadow (sunlight shines through the gap onto the globe!)
      float cassiniSunlight = smoothstep(0.27, 0.29, lat) * (1.0 - smoothstep(0.30, 0.32, lat));
      // A-Ring shadow
      float shadowA = smoothstep(0.31, 0.34, lat) * (1.0 - smoothstep(0.41, 0.44, lat));

      ringShadow = (shadowB * 0.88 + shadowA * 0.62) * (1.0 - cassiniSunlight * 0.82);
    }

    // 4. Heliocentric Lighting & Day/Night Terminator
    vec3 lightDir = normalize(-vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float NdotL = dot(vNormal, lightDir);
    float dayNight = smoothstep(-0.10, 0.12, NdotL);

    // Perceptual Stellar Irradiance
    float helioDist = max(0.1, length(vWorldPosition));
    float rNorm = helioDist / 3.25;
    float irradiance = pow(1.85 / (sqrt(rNorm) + 0.85), 1.25);

    // Deep Rayleigh atmospheric limb rim (physically confined to the illuminated crescent)
    float rim = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.0) * 0.45 * smoothstep(-0.15, 0.25, NdotL);

    // Cornette-Shanks Forward Mie Scattering Crescent Halo (backlit side)
    float LdotV = dot(lightDir, viewDir);
    float g = 0.78;
    float g2 = g * g;
    float forwardPhase = (1.5 * (1.0 - g2) / (2.0 + g2)) * (1.0 + LdotV * LdotV) / pow(max(0.01, 1.0 + g2 - 2.0 * g * LdotV), 1.5);
    float limbFresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.2);
    float backlitCondition = pow(max(0.0, -LdotV), 2.8);
    float forwardCrescent = limbFresnel * backlitCondition * forwardPhase * 0.55;

    // Audio-Reactive Heliocentric Radiation Waves
    float waveDist = length(vWorldPosition);
    float radiationWave = sin(waveDist * 2.2 - uTime * 6.0);
    float helioPulse = smoothstep(0.68, 0.98, radiationWave) * (uBass * 0.10);

    float directLight = max(0.0, NdotL) * dayNight * irradiance * 1.15 * (1.0 - ringShadow * 0.92) * (1.0 + helioPulse);

    // Scotopic Starlight Ambient from Galactic Plane
    vec3 scotopicAmbient = vec3(0.048, 0.054, 0.068);

    vec3 surfaceColor = baseAlbedo * (vec3(directLight) + scotopicAmbient);
    vec3 highlights = (rim + forwardCrescent) * irradiance * vec3(1.0);
    vec3 finalColor = (surfaceColor + highlights) * (1.0 + uBass * 0.08);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
