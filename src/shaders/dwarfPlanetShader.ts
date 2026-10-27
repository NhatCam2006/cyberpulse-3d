/**
 * dwarfPlanetShader.ts
 * Masterpiece Physical Shader for Dwarf Planets:
 * - Ceres (Type 0): Dark carbonaceous chondrite regolith, Occator Crater with brilliant
 *   Cerealia & Vinalia Faculae (sodium-carbonate salt domes).
 * - Pluto (Type 1): Heart-shaped Tombaugh Regio / Sputnik Planitia (nitrogen ice sheet with cellular
 *   convection polygons), water-ice mountain ranges (Hillary & Norgay Montes), and dark tholin Cthulhu Macula.
 * - Charon (Type 2): Mordor Macula dark tholin north polar cap, Serenity Chasma equatorial canyon.
 */

export const dwarfPlanetVertexShader = /* glsl */ `
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

export const dwarfPlanetFragmentShader = /* glsl */ `
  uniform int uDwarfType; // 0=Ceres, 1=Pluto, 2=Charon
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

  // 3-octave Fractional Brownian Motion
  float fbm(vec3 p) {
    float val = 0.0;
    float amp = 0.52;
    float freq = 1.0;
    for (int i = 0; i < 3; i++) {
      val += amp * snoise(p * freq);
      freq *= 2.15;
      amp *= 0.48;
    }
    return val;
  }

  void main() {
    vec3 lightDir = normalize(-vWorldPosition);
    float NdotL = dot(vNormal, lightDir);
    float dayNight = step(0.0, NdotL); // Sharp vacuum shadow

    vec3 pNorm = normalize(vPosition);
    float lat = pNorm.y;
    float phi = atan(pNorm.z, pNorm.x);

    float baseAlbedo = 0.45;

    // ==========================================
    // --- CERES (Type 0) ---
    // ==========================================
    if (uDwarfType == 0) {
      // Dark carbonaceous asteroid regolith
      float craters = fbm(pNorm * 10.0) * 0.22 + snoise(pNorm * 38.0) * 0.08;

      // Occator Crater & Cerealia Facula bright sodium-carbonate dome (lat ~ 0.20, long ~ 0.35)
      vec3 occatorPos = normalize(vec3(0.35, 0.20, 0.91));
      float dOccator = length(pNorm - occatorPos);

      // Deep crater floor with terraced rim
      float craterFloor = smoothstep(0.24, 0.0, dOccator) * 0.18;
      float craterRim = sin(dOccator * 42.0) * smoothstep(0.26, 0.06, dOccator) * 0.22;

      // Cerealia Facula (blinding bright central salt dome, albedo ~ 0.85)
      float cerealiaFacula = smoothstep(0.065, 0.0, dOccator) * 0.85;

      // Vinalia Faculae (secondary salt spots to the side)
      vec3 vinaliaPos = normalize(vec3(0.42, 0.18, 0.89));
      float dVinalia = length(pNorm - vinaliaPos);
      float vinaliaFaculae = smoothstep(0.045, 0.0, dVinalia) * 0.65;

      baseAlbedo = 0.30 + craters + craterRim - craterFloor + cerealiaFacula + vinaliaFaculae;
    }

    // ==========================================
    // --- PLUTO (Type 1) ---
    // ==========================================
    else if (uDwarfType == 1) {
      // Ancient cratered water-ice bedrock with tholin coatings
      float bedrockTerrain = fbm(pNorm * 8.0) * 0.18 + snoise(pNorm * 28.0) * 0.08;

      // Dark equatorial tholin band (Cthulhu Macula along equator lat ~ -0.1 to +0.1)
      float cthulhuMacula = (1.0 - smoothstep(0.02, 0.28, abs(lat + 0.05))) * 0.38;

      // Heart-shaped Tombaugh Regio / Sputnik Planitia centered at (phi = 0.0, lat = 0.12)
      vec2 heartCenter = vec2(0.0, 0.12);
      float dPhi = mod(phi - heartCenter.x + 3.14159, 6.28318) - 3.14159;
      float dLat = lat - heartCenter.y;

      // Analytical cardioid / heart lobe equation: (x^2 + y^2 - r^2)^3 - x^2 * y^3 <= 0
      vec2 heartCoords = vec2(dPhi * 2.6, dLat * 2.4 + 0.05);
      float hX = heartCoords.x;
      float hY = heartCoords.y;
      float heartShape = (hX * hX + hY * hY - 0.30);
      float heartDist = heartShape * heartShape * heartShape - hX * hX * hY * hY * hY;
      float sputnikPlanitia = smoothstep(0.03, -0.05, heartDist);

      // Cellular convection polygons within the nitrogen ice glacier (20-30 km convective cells)
      float cellularIce = (0.78 + snoise(pNorm * 42.0) * 0.14) * sputnikPlanitia * 0.75;

      // Hillary & Norgay Montes: Rugged water-ice mountain peaks along western margin of glacier
      float mountainRidge = smoothstep(0.05, 0.0, abs(heartDist + 0.02)) * pow(max(0.0, snoise(pNorm * 32.0)), 2.0) * 0.35;

      baseAlbedo = 0.44 + bedrockTerrain - cthulhuMacula + cellularIce + mountainRidge;
    }

    // ==========================================
    // --- CHARON (Type 2) ---
    // ==========================================
    else {
      // Grey water-ice crust with impact craters
      float terrain = fbm(pNorm * 9.0) * 0.22 + snoise(pNorm * 35.0) * 0.10;

      // Mordor Macula (dark reddish tholin north polar cap lat > 0.65)
      float mordorMacula = smoothstep(0.55, 0.80, lat) * 0.45;

      // Serenity Chasma (colossal equatorial rift canyon system)
      float chasma = smoothstep(0.035, 0.0, abs(lat + 0.05)) * 0.35;

      baseAlbedo = 0.54 + terrain - mordorMacula - chasma;
    }

    // Perceptual Stellar Irradiance
    float helioDist = max(0.1, length(vWorldPosition));
    float rNorm = helioDist / 3.25;
    float irradiance = pow(1.85 / (sqrt(rNorm) + 0.85), 1.25);

    float directLight = max(0.0, NdotL) * dayNight * irradiance * 1.15;

    // Scotopic Starlight Ambient for distant Kuiper belt (deep space starlight)
    vec3 scotopicAmbient = vec3(0.092, 0.102, 0.132);

    vec3 surfaceColor = baseAlbedo * (vec3(directLight) + scotopicAmbient);
    vec3 finalColor = surfaceColor * (1.0 + uBass * 0.08);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
