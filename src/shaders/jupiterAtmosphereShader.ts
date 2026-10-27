/**
 * jupiterAtmosphereShader.ts
 * Masterpiece Jovian Atmospheric Fluid Dynamics Shader:
 * 1. 16 Alternating East-West Zonal Jet Streams with differential Keplerian/Taylor-Proudman shearing.
 * 2. Kelvin-Helmholtz shear vortices & turbulent eddy billows at belt-zone boundaries.
 * 3. Great Red Spot (GRS): 22 deg South anticyclonic vortex with dark outer collar, spinning laminar core,
 *    and trailing turbulent wake of convective plumes.
 * 4. Oval BA (Red Spot Jr.) secondary anticyclonic vortex at 33 deg South.
 * 5. Equatorial white plumes & North/South Polar stratospheric haze.
 */

export const jupiterAtmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vCenter;
  varying vec2 vUv;

  void main() {
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vPosition = position;
    vUv = uv;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const jupiterAtmosphereFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uBeatIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vCenter;
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

    // 1. Zonal Jet Streams: Alternating East-West jet velocities v_jet(y) = sin(16 * y)
    float jetSpeed = sin(lat * 16.0);

    // Seamless 3D vector rotation around Y axis eliminates longitudinal seam artifacts
    float shearAngle = jetSpeed * (uTime * 0.16);
    float cosA = cos(shearAngle);
    float sinA = sin(shearAngle);
    vec3 shearedPos = vec3(pNorm.x * cosA - pNorm.z * sinA, pNorm.y, pNorm.x * sinA + pNorm.z * cosA);

    // Primary Zonal Belts (dark chromophore-rich) & Zones (bright ammonia ice crystals)
    // North/South Equatorial Belts (NEB / SEB) are prominent dark belts at lat +/- 0.15 to 0.35
    float equatorialBelts = (smoothstep(0.08, 0.20, abs(lat)) * (1.0 - smoothstep(0.30, 0.42, abs(lat)))) * 0.35;
    float fineBanding = sin(lat * 20.0) * 0.18 + sin(lat * 36.0 + uTime * 0.03) * 0.07;

    // Kelvin-Helmholtz shear eddies along jet stream shears (band-limited for zero aliasing)
    float billows = snoise(shearedPos * vec3(6.0, 15.0, 6.0) + vec3(0.0, 0.0, uTime * 0.06)) * 0.18;
    float microFilaments = snoise(shearedPos * vec3(14.0, 30.0, 14.0) + vec3(0.0, 0.0, uTime * 0.10)) * 0.08;

    float baseAlbedo = 0.62 - equatorialBelts + fineBanding + billows + microFilaments;

    // 2. Great Red Spot (GRS: Anticyclonic Vortex in South Tropical Zone, centered in sunlit view)
    vec2 grsPos = vec2(0.0, -0.22);
    float dPhi = mod(phi - grsPos.x + 3.14159, 6.28318) - 3.14159;
    float dLat = lat - grsPos.y;
    // Elliptic coordinate metric (GRS aspect ratio ~ 1.8 : 1)
    float rGrs = sqrt(dPhi * dPhi * 3.0 + dLat * dLat * 9.5);

    if (rGrs < 0.38) {
      // Outer dark peripheral ring/collar
      float collar = smoothstep(0.34, 0.24, rGrs) * (1.0 - smoothstep(0.24, 0.16, rGrs)) * 0.58;
      // High-contrast interior vortex with counter-clockwise rotation
      float vortexAngle = atan(dLat, dPhi);
      float spiralSwirl = sin(vortexAngle * 3.0 - rGrs * 30.0 - uTime * 2.2) * 0.16;
      float coreVortex = smoothstep(0.22, 0.04, rGrs) * (0.42 + spiralSwirl);
      // Dark eye at center
      float eye = smoothstep(0.045, 0.0, rGrs) * 0.32;

      baseAlbedo -= (collar + coreVortex - eye);

      // Trailing turbulent wake (turbulent plumes behind GRS extending westward)
      if (dPhi < 0.0 && dPhi > -0.75 && abs(dLat) < 0.14) {
        float wakeNoise = snoise(vec3(dPhi * 16.0, dLat * 35.0, uTime * 0.4)) * 0.28;
        baseAlbedo += wakeNoise * smoothstep(-0.75, 0.0, dPhi);
      }
    }

    // 3. Oval BA (Red Spot Jr: lat -33 deg = -0.55, phi ~ -1.2)
    vec2 baPos = vec2(-1.2, -0.55);
    float dPhiBa = mod(phi - baPos.x + 3.14159, 6.28318) - 3.14159;
    float dLatBa = lat - baPos.y;
    float rBa = sqrt(dPhiBa * dPhiBa * 4.0 + dLatBa * dLatBa * 14.0);
    if (rBa < 0.14) {
      float baStorm = smoothstep(0.14, 0.03, rBa) * 0.35;
      baseAlbedo -= baStorm;
    }

    // 4. Polar Stratospheric Haze & Jovian Polar Aurora Ovals (excited by solar wind & Io flux tube)
    float polarHaze = smoothstep(0.70, 0.95, abs(lat)) * 0.24;
    baseAlbedo += polarHaze;

    // Jovian Polar Aurora Oval (lat ~ 0.82 to 0.94)
    float dJovianOval = abs(abs(lat) - 0.88);
    float jovianAuroraRing = smoothstep(0.05, 0.0, dJovianOval);
    float jovianCurtains = pow(abs(sin(phi * 24.0 + uTime * 4.0)), 2.5);
    
    // Io Magnetic Flux Tube Footprint Spot (orbiting polar cap)
    float ioAngle = uTime * 1.8;
    vec2 ioFootprint = vec2(cos(ioAngle) * 0.38, sin(ioAngle) * 0.38);
    float dIoSpot = length(pNorm.xz - ioFootprint);
    float ioAuroralSpot = smoothstep(0.045, 0.0, dIoSpot) * smoothstep(0.75, 0.95, lat) * 1.5;

    float jovianAurora = (jovianAuroraRing * (0.6 + jovianCurtains * 0.8) + ioAuroralSpot) * (0.4 + uBeatIntensity * 2.2 + uBass * 0.8);

    // 5. Heliocentric Lighting & Day/Night Terminator
    vec3 lightDir = normalize(-vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float NdotL = dot(vNormal, lightDir);
    float dayNight = smoothstep(-0.14, 0.10, NdotL);

    // Perceptual Stellar Irradiance
    float helioDist = max(0.1, length(vWorldPosition));
    float rNorm = helioDist / 3.25;
    float irradiance = pow(1.85 / (sqrt(rNorm) + 0.85), 1.25);

    // Deep planetary limb atmosphere Rayleigh rim (day side)
    float rim = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.0) * 0.48 * smoothstep(-0.10, 0.20, NdotL);

    // Cornette-Shanks Forward Mie Scattering Crescent Halo (backlit side)
    float LdotV = dot(lightDir, viewDir);
    float g = 0.78;
    float g2 = g * g;
    float forwardPhase = (1.5 * (1.0 - g2) / (2.0 + g2)) * (1.0 + LdotV * LdotV) / pow(max(0.01, 1.0 + g2 - 2.0 * g * LdotV), 1.5);
    float limbFresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.2);
    float backlitCondition = pow(max(0.0, -LdotV), 2.8);
    float forwardCrescent = limbFresnel * backlitCondition * forwardPhase * 0.52;

    // 1. Galilean Moons (Io & Europa) Analytical Transit Shadows (Solar Eclipses)
    float ioSpeed = 5.2;
    float ioRad = 0.52;
    vec3 ioPos = vCenter + vec3(cos(uTime * ioSpeed) * ioRad, 0.0, sin(uTime * ioSpeed) * ioRad);
    vec3 toIo = ioPos - vWorldPosition;
    float tIo = dot(toIo, lightDir);
    float ioShadow = 0.0;
    if (tIo > 0.0) {
      float dPerp = length(toIo - lightDir * tIo);
      ioShadow = (1.0 - smoothstep(0.022, 0.046, dPerp)) * 0.96;
    }

    float europaSpeed = 2.6;
    float europaRad = 0.68;
    vec3 europaPos = vCenter + vec3(cos(uTime * europaSpeed) * europaRad, 0.0, sin(uTime * europaSpeed) * europaRad);
    vec3 toEuropa = europaPos - vWorldPosition;
    float tEuropa = dot(toEuropa, lightDir);
    float europaShadow = 0.0;
    if (tEuropa > 0.0) {
      float dPerpE = length(toEuropa - lightDir * tEuropa);
      europaShadow = (1.0 - smoothstep(0.018, 0.040, dPerpE)) * 0.92;
    }

    float jupEclipseShadow = max(ioShadow, europaShadow);

    // 2. Audio-Reactive Heliocentric Radiation Waves
    float waveDist = length(vWorldPosition);
    float radiationWave = sin(waveDist * 2.2 - uTime * 6.0);
    float helioPulse = smoothstep(0.68, 0.98, radiationWave) * (uBeatIntensity * 0.12 + uBass * 0.06);

    float directLight = max(0.0, NdotL) * dayNight * irradiance * 1.15 * (1.0 - jupEclipseShadow) * (1.0 + helioPulse);

    // Scotopic Starlight Ambient from Galactic Plane
    vec3 scotopicAmbient = vec3(0.048, 0.054, 0.068);

    vec3 surfaceColor = baseAlbedo * (vec3(directLight) + scotopicAmbient);
    vec3 highlights = (rim + forwardCrescent) * irradiance * vec3(1.0) + jovianAurora * vec3(0.16, 0.18, 0.22);
    vec3 finalColor = (surfaceColor + highlights) * (1.0 + uBass * 0.08);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
