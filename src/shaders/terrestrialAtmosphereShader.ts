/**
 * terrestrialAtmosphereShader.ts
 * Masterpiece Physical Shader for Terrestrial Bodies:
 * - Mercury (Type 0): Airless basalt crust, Caloris multi-ring impact basin, bright ray crater ejecta, lobate scarps.
 * - Venus (Type 1): Super-rotating sulfuric cloud deck, Pioneer UV chevron Y-pattern, polar dipole vortex, thick twilight halo.
 * - Earth (Type 2): Recognizable fractal continents, ocean specular water glint, Coriolis cyclonic cloud swirls with ground shadows, City Night Lights, Rayleigh limb haze.
 * - Mars (Type 3): Ochre terrain, Valles Marineris grand canyon, Olympus Mons caldera shield, Tharsis volcanic chain, Syrtis Major basalt plains, spiral dry-ice polar caps.
 * - Moon / Luna (Type 4): Dark basalt Maria basins (Imbrium, Tranquillitatis), bright anorthosite highlands, Tycho/Copernicus ray ejecta systems, stark airless shadows.
 */

export const terrestrialAtmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vCenter;
  varying vec2 vUv;

  void main() {
    // Exact World Space Normal for true heliocentric illumination
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vPosition = position;
    vUv = uv;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const terrestrialAtmosphereFragmentShader = /* glsl */ `
  uniform int uPlanetType; // 0=Mercury, 1=Venus, 2=Earth, 3=Mars, 4=Moon, 5=Io, 6=Europa, 7=Ganymede, 8=Callisto, 9=Enceladus
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

  // 4-octave Fractional Brownian Motion
  float fbm(vec3 p) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      val += amp * snoise(p * freq);
      freq *= 2.15;
      amp *= 0.48;
    }
    return val;
  }

  // Crater profile helper: creates raised circular rim with depressed interior
  float crater(vec3 p, vec3 center, float radius, float depth) {
    float d = length(p - center);
    if (d > radius * 1.8) return 0.0;
    float rNorm = d / radius;
    // Raised rim at r = 1.0, deep floor at r < 0.8
    float rim = smoothstep(1.3, 1.0, rNorm) * smoothstep(0.7, 1.0, rNorm) * (depth * 0.7);
    float floorDepr = smoothstep(0.9, 0.2, rNorm) * depth;
    // Central peak rebound at center
    float rebound = smoothstep(0.25, 0.0, rNorm) * (depth * 0.45);
    return rim - floorDepr + rebound;
  }

  void main() {
    // 1. Heliocentric Direction from Sun at (0,0,0) in World Space
    vec3 lightDir = normalize(-vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float NdotL = dot(vNormal, lightDir);
    float dayNight = smoothstep(-0.06, 0.08, NdotL);

    // Specular half-vector for ocean reflection
    vec3 halfVec = normalize(lightDir + viewDir);
    float NdotH = max(0.0, dot(vNormal, halfVec));

    vec3 pNorm = normalize(vPosition);
    float lat = pNorm.y;
    float phi = atan(pNorm.z, pNorm.x);

    float surfaceAlbedo = 0.5;
    float specular = 0.0;
    float atmosphereHaze = 0.0;

    // ==========================================
    // --- MERCURY (Type 0) ---
    // ==========================================
    if (uPlanetType == 0) {
      // Airless, ancient basalt crust saturated with multi-scale impact craters
      float macroRegolith = fbm(pNorm * 8.0) * 0.22;
      float microPits = snoise(pNorm * 45.0) * 0.12 + snoise(pNorm * 90.0) * 0.06;

      // 1. Caloris Basin (lat ~ 0.35, long ~ 0.42): Massive multi-ring impact basin
      vec3 calorisCenter = normalize(vec3(0.55, 0.35, 0.76));
      float dCaloris = length(pNorm - calorisCenter);
      float calorisRings = sin(dCaloris * 32.0) * 0.18 * smoothstep(0.52, 0.08, dCaloris);
      float calorisBasaltFloor = smoothstep(0.32, 0.0, dCaloris) * 0.22;

      // 2. Debussy / Kuiper Bright Ray Craters
      vec3 debussyCenter = normalize(vec3(-0.48, -0.32, 0.81));
      float dDeb = length(pNorm - debussyCenter);
      float debAngle = atan(pNorm.z - debussyCenter.z, pNorm.x - debussyCenter.x);
      float debRays = pow(abs(sin(debAngle * 11.0)), 8.0) * smoothstep(0.65, 0.04, dDeb) * 0.52;
      float debPit = smoothstep(0.06, 0.0, dDeb) * 0.42;

      // 3. Discovery Rupes (Lobate thrust scarps from planetary cooling)
      float scarpLine = smoothstep(0.015, 0.0, abs(pNorm.x + pNorm.y * 0.6 - 0.25)) * 0.18;

      surfaceAlbedo = 0.32 + macroRegolith + microPits + calorisRings - calorisBasaltFloor + debRays + debPit + scarpLine;
      // Absolute airless terminator shadow
      dayNight = step(0.0, NdotL);
    }

    // ==========================================
    // --- VENUS (Type 1) ---
    // ==========================================
    else if (uPlanetType == 1) {
      // Retrograde super-rotating sulfuric acid cloud deck (winds ~ 360 km/h)
      float superRotate = uTime * 0.32;
      float shearedPhi = phi + superRotate;

      // Pioneer Venus UV Chevron Pattern ($<$ shape along equator)
      float chevron = abs(lat * 2.8) - cos(shearedPhi * 2.0) * 0.55;
      float uvAbsorption = smoothstep(0.15, 0.85, sin(chevron * 3.14159)) * 0.22;

      // Mid-latitude cloud bands & turbulent billows
      float cloudBands = sin(lat * 16.0 + uTime * 0.1) * 0.06;
      float turbulence = snoise(vec3(shearedPhi * 5.0, lat * 12.0, uTime * 0.15)) * 0.10;
      float microHaze = snoise(vec3(shearedPhi * 22.0, lat * 35.0, uTime * 0.25)) * 0.05;

      // Polar Dipole Vortex Collars (|lat| > 0.72)
      float polarCollar = smoothstep(0.68, 0.88, abs(lat)) * (0.15 + sin(phi * 2.0 - uTime * 0.8) * 0.08);

      surfaceAlbedo = 0.84 - uvAbsorption + cloudBands + turbulence + microHaze - polarCollar;

      // Extremely dense 92-bar atmosphere causes light to scatter deep into the night hemisphere
      dayNight = smoothstep(-0.32, 0.14, NdotL);

      // Thick sulfuric acid / forward Mie & Rayleigh limb scattering halo
      float limb = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.4);
      atmosphereHaze = limb * 0.78;
    }

    // ==========================================
    // --- EARTH (Type 2) ---
    // ==========================================
    else if (uPlanetType == 2) {
      // 1. High-Fidelity Continental Synthesis
      // Spherical coordinates: lat in [-1, 1], phi in [-pi, pi]
      float normLat = lat; // sin(latitude)
      float normLong = phi; // longitude

      // Analytical continental masses:
      // Eurasian/African supercontinent (long -0.5 to 2.2, lat -0.6 to 0.9)
      float eurasiaMask = smoothstep(0.9, 0.2, abs(normLong - 0.75)) * smoothstep(-0.65, 0.1, normLat) * smoothstep(0.95, 0.65, normLat);
      // Americas (long -2.6 to -1.0, lat -0.8 to 0.85)
      float americasMask = smoothstep(0.95, 0.25, abs(normLong + 1.85)) * smoothstep(-0.85, -0.1, normLat) * smoothstep(0.9, 0.55, normLat);
      // Australia (long 1.8 to 2.8, lat -0.65 to -0.25)
      float ausMask = smoothstep(0.55, 0.15, abs(normLong - 2.35)) * smoothstep(0.25, 0.05, abs(normLat + 0.42));
      // Polar Ice sheets: Fractal Antarctica (South Pole) & Greenland/Arctic (North Pole)
      float antarcticaMask = smoothstep(-0.84, -0.95, normLat) * 0.95 + fbm(pNorm * 8.0) * 0.18;
      float greenlandMask = smoothstep(0.86, 0.96, normLat) * (smoothstep(0.85, 0.15, abs(normLong + 0.65)) * 0.7 + 0.3) + fbm(pNorm * 8.5) * 0.15;
      float polarCaps = max(smoothstep(0.62, 0.82, antarcticaMask), smoothstep(0.58, 0.78, greenlandMask));

      // Multi-octave fractal noise for jagged coastlines & island chains
      float fractalCoast = fbm(pNorm * 7.5) * 0.65 + snoise(pNorm * 22.0) * 0.25;
      float landmass = (eurasiaMask * 1.1 + americasMask * 0.95 + ausMask * 0.9) + fractalCoast;
      bool isOcean = landmass < 0.42 && polarCaps < 0.2;

      if (isOcean) {
        // Deep blue-black ocean albedo
        surfaceAlbedo = 0.10;
        // Specular Ocean Glint (Blinn-Phong reflection)
        specular = pow(NdotH, 80.0) * 1.55 * dayNight;
      } else if (polarCaps > 0.45) {
        // High-albedo polar ice sheets
        surfaceAlbedo = 0.94;
        specular = pow(NdotH, 20.0) * 0.55 * dayNight;
      } else {
        // Continental Landmass Terrain:
        // Arid desert belts (lat ~ 0.2 to 0.4: Sahara/Arabian/Gobi)
        float desertBelt = smoothstep(0.18, 0.32, abs(normLat)) * (1.0 - smoothstep(0.38, 0.48, abs(normLat)));
        float desertAlbedo = desertBelt * 0.24;

        // Mountain ranges (Andes, Himalayas, Rockies)
        float mountainRidges = pow(max(0.0, snoise(pNorm * 18.0)), 2.2) * 0.25;
        surfaceAlbedo = 0.38 + desertAlbedo + mountainRidges;

        // Megacity Night Lights (Radiating on dark hemisphere)
        float nightMask = 1.0 - smoothstep(-0.18, 0.04, NdotL);
        float urbanClusters = pow(max(0.0, snoise(pNorm * 32.0 + vec3(2.5))), 3.8);
        float microNodes = pow(max(0.0, snoise(pNorm * 85.0)), 4.5);
        float cityLights = (urbanClusters * 2.8 + microNodes * 1.6) * nightMask;
        specular += cityLights; // Piercing golden-white megalopolis lights
      }

      // 2. Coriolis Swirling Cloud Decks
      // ITCZ equatorial cloud band + mid-latitude comma cyclones
      float cloudTime = uTime * 0.08;
      vec3 cloudP = pNorm * 4.2 + vec3(cloudTime, 0.0, cloudTime * 0.7);
      // Coriolis rotation differential with latitude
      float coriolis = lat * 0.8;
      cloudP.x += coriolis * 0.4;

      float itcz = (1.0 - smoothstep(0.0, 0.18, abs(lat))) * 0.35;
      float cycloneNoise = fbm(cloudP) + itcz;
      float cloudCoverage = smoothstep(0.32, 0.72, cycloneNoise);

      // Cloud shadow projected onto land/ocean below
      float cloudShadow = smoothstep(0.35, 0.75, fbm(cloudP - lightDir * 0.035)) * 0.38;
      surfaceAlbedo = surfaceAlbedo * (1.0 - cloudShadow * dayNight);

      // Blend bright cloud tops
      surfaceAlbedo = mix(surfaceAlbedo, 0.96, cloudCoverage * 0.88);

      // 3. Rayleigh Atmospheric Blue/White Limb Scattering
      float limb = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.0);
      atmosphereHaze = limb * (0.65 + dayNight * 0.45);

      // 4. Geomagnetic Polar Aurora Ovals (Aurora Borealis & Australis)
      vec3 geomagneticPole = normalize(vec3(0.12, 0.98, 0.15));
      float magLat = dot(pNorm, geomagneticPole);
      float dOval = abs(abs(magLat) - 0.82);
      float auroraRing = smoothstep(0.065, 0.0, dOval);
      
      // Dynamic vertical curtain striations and magnetic wave ripples
      float curtainPillars = pow(abs(sin(phi * 28.0 + uTime * 3.5 + snoise(pNorm * 18.0) * 1.5)), 3.0);
      float auroraGlow = auroraRing * (0.45 + curtainPillars * 0.75);

      // Night-side & twilight enhancement: Ground reflection of floating 3D auroral curtains
      float nightSide = 1.0 - smoothstep(-0.25, 0.12, NdotL);
      float auroraIntensity = auroraGlow * nightSide * (0.2 + uBeatIntensity * 0.8 + uBass * 0.3);
      specular += auroraIntensity * 0.28; // Subtle ground reflection under 3D ionospheric curtains
    }

    // ==========================================
    // --- MARS (Type 3) ---
    // ==========================================
    else if (uPlanetType == 3) {
      // Ochre iron oxide terrain with basaltic wind-scoured plains
      float desertFbm = fbm(pNorm * 6.0) * 0.22;
      float craterRegolith = snoise(pNorm * 28.0) * 0.09;

      // 1. Syrtis Major & Dark Basalt Lowlands (lat ~ 0.15, long ~ 0.8)
      vec3 syrtisCenter = normalize(vec3(0.72, 0.18, 0.67));
      float dSyrtis = length(pNorm - syrtisCenter);
      float syrtisMajor = (1.0 - smoothstep(0.05, 0.35, dSyrtis)) * 0.28;

      // 2. Olympus Mons (Colossal shield volcano: lat ~ 0.32, long ~ -0.45)
      vec3 olympusPos = normalize(vec3(-0.48, 0.32, 0.81));
      float dOlympus = length(pNorm - olympusPos);
      float olympusShield = smoothstep(0.20, 0.0, dOlympus) * 0.38; // Volcanic shield
      float olympusScarp = smoothstep(0.02, 0.0, abs(dOlympus - 0.14)) * 0.15; // Outer cliff scarp
      float olympusCaldera = smoothstep(0.045, 0.0, dOlympus) * 0.32; // Central summit caldera

      // 3. Tharsis Montes volcanic chain (Ascraeus, Pavonis, Arsia Mons in a line)
      vec3 pavonisPos = normalize(vec3(-0.35, 0.02, 0.93));
      float dPav = length(pNorm - pavonisPos);
      float tharsis = smoothstep(0.08, 0.0, dPav) * 0.24;

      // 4. Valles Marineris (Colossal grand canyon rift: 4000 km across equator)
      float canyonX = smoothstep(0.12, 0.68, pNorm.x);
      float canyonY = smoothstep(0.038, 0.0, abs(pNorm.y + 0.14));
      // Jagged canyon walls & chasmata
      float canyonWallDetail = snoise(pNorm * 38.0) * 0.12;
      float vallesMarineris = canyonX * canyonY * (0.42 + canyonWallDetail);

      // 5. Hellas Planitia Impact Basin (lat ~ -0.45, long ~ 0.7)
      vec3 hellasPos = normalize(vec3(0.68, -0.45, 0.58));
      float dHellas = length(pNorm - hellasPos);
      float hellasFloor = smoothstep(0.28, 0.0, dHellas) * 0.18;

      surfaceAlbedo = 0.52 + desertFbm + craterRegolith - syrtisMajor + (olympusShield + olympusScarp - olympusCaldera) + tharsis - vallesMarineris - hellasFloor;

      // 6. Brilliant Reflective CO2 Dry-Ice Polar Caps with Spiral Chasmata (compact at |lat| > 0.91)
      float poleDist = abs(lat);
      if (poleDist > 0.90) {
        float spiralTroughs = sin(phi * 4.0 + poleDist * 32.0) * 0.04;
        float cap = smoothstep(0.91 + spiralTroughs, 0.965, poleDist);
        surfaceAlbedo = mix(surfaceAlbedo, 0.98, cap);
        // Direct ice specular reflection on polar cap
        specular += pow(NdotH, 24.0) * 0.85 * cap * dayNight;
      }

      // Thin CO2 Atmospheric Limb Haze
      atmosphereHaze = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.8) * 0.32;
    }

    // ==========================================
    // --- MOON / LUNA (Type 4) ---
    // ==========================================
    else if (uPlanetType == 4) {
      // 1. Lunar Maria Basalt volcanic flood plains
      // Oceanus Procellarum, Mare Imbrium, Mare Serenitatis, Mare Tranquillitatis
      float mariaFbm = smoothstep(0.12, 0.58, fbm(pNorm * 3.2)) * 0.38;

      // 2. Anorthositic bright cratered highlands
      float highlandRoughness = snoise(pNorm * 24.0) * 0.22 + snoise(pNorm * 65.0) * 0.12;

      // 3. Tycho Ray Crater (lat ~ -0.65, long ~ 0.25)
      vec3 tychoPos = normalize(vec3(0.24, -0.65, 0.72));
      float dTycho = length(pNorm - tychoPos);
      float tychoAngle = atan(pNorm.z - tychoPos.z, pNorm.x - tychoPos.x);
      // Brilliant ray filaments spanning across the lunar disk
      float tychoRays = pow(abs(sin(tychoAngle * 8.0)), 7.0) * smoothstep(0.58, 0.04, dTycho) * 0.62;
      float tychoPit = smoothstep(0.05, 0.0, dTycho) * 0.48;

      // 4. Copernicus Crater (lat ~ 0.16, long ~ -0.32)
      vec3 copernicusPos = normalize(vec3(-0.32, 0.16, 0.93));
      float dCop = length(pNorm - copernicusPos);
      float copRays = pow(abs(sin(atan(pNorm.z - copernicusPos.z, pNorm.x - copernicusPos.x) * 6.0)), 6.0) * smoothstep(0.42, 0.03, dCop) * 0.45;

      surfaceAlbedo = 0.48 - mariaFbm + highlandRoughness + tychoRays + tychoPit + copRays;
      dayNight = step(0.0, NdotL); // True airless vacuum shadow
    }
    // ==========================================
    // --- IO (Type 5: Volcanic Moon) ---
    // ==========================================
    else if (uPlanetType == 5) {
      // Hyperactive sulfur volcanism: yellow/ochre plains dotted with black caldera pits (Loki, Pele)
      float sulfurPlains = fbm(pNorm * 6.0) * 0.18;
      float volcanicCalderas = smoothstep(0.45, 0.72, snoise(pNorm * 18.0)) * 0.45;
      float lavaLakes = smoothstep(0.62, 0.85, snoise(pNorm * 38.0)) * 0.35;
      surfaceAlbedo = 0.68 + sulfurPlains - volcanicCalderas - lavaLakes;

      // Active Volcanic Eruption Plumes (Loki & Pele) pulsating with audio transients!
      vec3 lokiPos = normalize(vec3(0.55, 0.22, 0.81));
      float dLoki = length(pNorm - lokiPos);
      float lokiPlume = smoothstep(0.12, 0.0, dLoki) * (0.35 + uBeatIntensity * 1.5);

      vec3 pelePos = normalize(vec3(-0.62, -0.35, 0.70));
      float dPele = length(pNorm - pelePos);
      float pelePlume = smoothstep(0.10, 0.0, dPele) * (0.30 + uBeatIntensity * 1.4);

      specular += (lokiPlume + pelePlume) * 1.5;
      dayNight = step(0.0, NdotL);
    }
    // ==========================================
    // --- EUROPA (Type 6: Icy Ocean Moon) ---
    // ==========================================
    else if (uPlanetType == 6) {
      // Brilliant smooth water-ice shell crisscrossed with dark tectonic lineae fractures
      float lineae1 = smoothstep(0.025, 0.0, abs(sin(pNorm.x * 24.0 + pNorm.y * 18.0) * 0.05)) * 0.35;
      float lineae2 = smoothstep(0.025, 0.0, abs(sin(pNorm.z * 28.0 - pNorm.y * 22.0) * 0.05)) * 0.30;
      float microCracks = snoise(pNorm * 52.0) * 0.08;
      surfaceAlbedo = 0.88 - (lineae1 + lineae2) + microCracks;
      dayNight = step(0.0, NdotL);
    }
    // ==========================================
    // --- GANYMEDE (Type 7: Largest Moon) ---
    // ==========================================
    else if (uPlanetType == 7) {
      // Ancient dark cratered terrain cut by bright grooved tectonic bands
      float darkTerrain = smoothstep(0.25, 0.65, fbm(pNorm * 4.0)) * 0.40;
      float groovedRidges = abs(sin(pNorm.y * 35.0 + snoise(pNorm * 12.0) * 4.0)) * 0.22;
      float craters = snoise(pNorm * 32.0) * 0.12;
      surfaceAlbedo = 0.55 - darkTerrain + groovedRidges + craters;
      dayNight = step(0.0, NdotL);
    }
    // ==========================================
    // --- CALLISTO (Type 8: Ancient Cratered Moon) ---
    // ==========================================
    else if (uPlanetType == 8) {
      // Ancient, saturated dark ice-rock crust with Valhalla multi-ring basin
      float craterDensity = fbm(pNorm * 14.0) * 0.22 + snoise(pNorm * 42.0) * 0.12;
      // Valhalla multi-ring impact basin
      vec3 valhallaPos = normalize(vec3(0.35, 0.25, 0.90));
      float dVal = length(pNorm - valhallaPos);
      float valhallaRings = sin(dVal * 36.0) * 0.18 * smoothstep(0.65, 0.05, dVal);
      surfaceAlbedo = 0.32 + craterDensity + valhallaRings;
      dayNight = step(0.0, NdotL);
    }
    // ==========================================
    // --- ENCELADUS (Type 9: Cryovolcanic Ice Moon) ---
    // ==========================================
    else {
      // Pure water-ice surface (solar system record albedo 0.96)
      float iceCrust = 0.94 + snoise(pNorm * 35.0) * 0.04;
      
      // South Polar Tiger Stripes (Damascus, Baghdad, Alexandria, Cairo Sulci)
      float southPolar = smoothstep(-0.70, -0.92, lat);
      float tigerStripes = abs(sin(pNorm.x * 32.0 + pNorm.z * 18.0)) * 0.28 * southPolar;
      
      // Active Cryovolcanic Geyser Plumes erupting into space from the south pole
      float geyserCenter = smoothstep(-0.82, -0.98, lat);
      float geyserEruption = geyserCenter * (0.45 + uBeatIntensity * 1.8 + uBass * 0.8);
      
      surfaceAlbedo = iceCrust - tigerStripes;
      specular += geyserEruption * 1.8; // Incandescent cryogenic water-ice plume
      dayNight = step(0.0, NdotL);
    }

    // Direct Heliocentric Sunlight scaled by Perceptual Stellar Irradiance
    float helioDist = max(0.1, length(vWorldPosition));
    float rNorm = helioDist / 3.25;
    float irradiance = pow(1.85 / (sqrt(rNorm) + 0.85), 1.25);

    // 1. Analytical Solar Eclipse (Moon transit shadow traversing Earth)
    float eclipseShadow = 0.0;
    if (uPlanetType == 2) {
      vec3 moonPos = vCenter + vec3(cos(uTime * 4.5) * 0.28, sin(uTime * 4.5) * 0.05, sin(uTime * 4.5) * 0.28);
      vec3 toMoon = moonPos - vWorldPosition;
      float tMoon = dot(toMoon, lightDir);
      if (tMoon > 0.0) {
        float dPerp = length(toMoon - lightDir * tMoon);
        eclipseShadow = (1.0 - smoothstep(0.016, 0.038, dPerp)) * 0.96;
      }
    }

    // 2. Secondary Indirect Planetshine / Earthshine
    float planetshine = 0.0;
    float parentEclipse = 0.0;

    // Luna receiving Earthshine
    if (uPlanetType == 4) {
      vec3 earthPos = vCenter - vec3(cos(uTime * 4.5) * 0.28, sin(uTime * 4.5) * 0.05, sin(uTime * 4.5) * 0.28);
      vec3 toEarth = normalize(earthPos - vWorldPosition);
      float NdotEarth = max(0.0, dot(vNormal, toEarth));
      float earthPhase = clamp(0.5 + 0.5 * dot(normalize(-earthPos), -toEarth), 0.0, 1.0);
      planetshine = NdotEarth * earthPhase * 0.075;

      // Lunar eclipse (Moon entering Earth's shadow cone)
      float distShadow = dot(vWorldPosition - earthPos, -lightDir);
      if (distShadow > 0.0) {
        float dPerpEarth = length((vWorldPosition - earthPos) - (-lightDir * distShadow));
        parentEclipse = (1.0 - smoothstep(0.13, 0.15, dPerpEarth)) * 0.94;
      }
    }
    // Galilean Moons (Io & Europa) receiving Jovianshine and Jupiter shadow eclipse
    else if (uPlanetType == 5 || uPlanetType == 6) {
      float mSpeed = uPlanetType == 5 ? 5.2 : 2.6;
      float mRad = uPlanetType == 5 ? 0.52 : 0.68;
      vec3 jupPos = vCenter - vec3(cos(uTime * mSpeed) * mRad, 0.0, sin(uTime * mSpeed) * mRad);
      vec3 toJup = normalize(jupPos - vWorldPosition);
      float NdotJup = max(0.0, dot(vNormal, toJup));
      float jupPhase = clamp(0.5 + 0.5 * dot(normalize(-jupPos), -toJup), 0.0, 1.0);
      planetshine = NdotJup * jupPhase * 0.095;

      // Jupiter cylindrical umbral eclipse
      float distShadowJup = dot(vWorldPosition - jupPos, -lightDir);
      if (distShadowJup > 0.0) {
        float dPerpJup = length((vWorldPosition - jupPos) - (-lightDir * distShadowJup));
        parentEclipse = (1.0 - smoothstep(0.36, 0.40, dPerpJup)) * 0.96;
      }
    }

    // 3. Audio-Reactive Heliocentric Radiation Waves (Feature 3)
    float waveDist = length(vWorldPosition);
    float radiationWave = sin(waveDist * 2.2 - uTime * 6.0);
    float helioPulse = smoothstep(0.68, 0.98, radiationWave) * (uBeatIntensity * 0.12 + uBass * 0.06);

    // Cornette-Shanks Forward Mie Scattering Crescent Halo for Atmospheres
    float atmoDensity = 0.0;
    if (uPlanetType == 1) atmoDensity = 1.45;      // Venus: Super-thick sulfuric deck
    else if (uPlanetType == 2) atmoDensity = 1.00; // Earth: N2-O2 atmosphere
    else if (uPlanetType == 3) atmoDensity = 0.35; // Mars: Thin CO2 haze

    float forwardCrescent = 0.0;
    if (atmoDensity > 0.01) {
      float LdotV = dot(lightDir, viewDir);
      float g = 0.76;
      float g2 = g * g;
      float forwardPhase = (1.5 * (1.0 - g2) / (2.0 + g2)) * (1.0 + LdotV * LdotV) / pow(max(0.01, 1.0 + g2 - 2.0 * g * LdotV), 1.5);
      float limbFresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.2);
      float backlitCondition = pow(max(0.0, -LdotV), 2.8);
      forwardCrescent = limbFresnel * backlitCondition * forwardPhase * atmoDensity * 0.42;
    }

    float directLight = max(0.0, NdotL) * dayNight * irradiance * 1.18 * (1.0 - max(eclipseShadow, parentEclipse)) * (1.0 + helioPulse);

    // Scotopic Starlight Ambient from Galactic Plane (pale celestial silver starlight)
    vec3 scotopicAmbient = vec3(0.048, 0.054, 0.068);
    vec3 planetshineColor = uPlanetType == 4 ? vec3(0.88, 0.94, 1.06) : vec3(1.02, 0.98, 0.92);
    vec3 ambientTotal = scotopicAmbient + planetshine * planetshineColor;

    vec3 surfaceColor = surfaceAlbedo * (vec3(directLight) + ambientTotal);
    vec3 specularAndHaze = vec3(specular * irradiance + atmosphereHaze + forwardCrescent * irradiance);
    vec3 finalColor = (surfaceColor + specularAndHaze) * (1.0 + uBass * 0.08);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
