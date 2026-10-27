/**
 * saturnRingShader.ts
 * Masterpiece Analytical Optical Depth Shader for Saturn's Ring System.
 * Features:
 * - Ring C (Crepe Ring): r in [1.25, 1.52] R_S, tau ~ 0.18 (semi-transparent)
 * - Ring B: r in [1.52, 1.95] R_S, tau ~ 0.88 (dense, brilliant icy reflectivity)
 * - Cassini Division: r in [1.95, 2.025] R_S, tau ~ 0.0 (resonant gap cleared by Mimas 2:1)
 * - Ring A: r in [2.025, 2.30] R_S, tau ~ 0.55
 * - Encke Gap: r ~ 2.21 R_S (narrow gap cleared by Pan)
 * - Planetary Globe Shadow: Saturn casts a pitch-black umbral shadow across the backside of the ring system!
 */

export const saturnRingVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vSaturnCenter;

  void main() {
    vUv = uv;
    vLocalPosition = position;
    // Exact World Space Normal
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vSaturnCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const saturnRingFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vSaturnCenter;

  void main() {
    // Normalized radius from UV coordinates center (0.5, 0.5)
    vec2 p = (vUv - vec2(0.5)) * 2.0;
    float rNorm = length(p);

    // Three.js RingGeometry innerRadius/outerRadius mapping
    // innerRadius = 0.38, outerRadius = 0.72 => rMin = 0.527, rMax = 1.0
    if (rNorm < 0.50 || rNorm > 0.99) discard;

    // Map rNorm to physical radius in Saturn radii R_S [1.25 .. 2.32]
    float rPhys = mix(1.23, 2.32, clamp((rNorm - 0.51) / (0.98 - 0.51), 0.0, 1.0));

    float tau = 0.0;
    float albedo = 0.0;

    // 1. Ring C (Crepe Ring: 1.23 - 1.52 R_S)
    if (rPhys >= 1.23 && rPhys < 1.52) {
      tau = 0.22;
      albedo = 0.38;
      float ripples = sin(rPhys * 120.0) * 0.04;
      albedo += ripples;
    }
    // 2. Ring B (Main dense ring: 1.52 - 1.95 R_S)
    else if (rPhys >= 1.52 && rPhys < 1.95) {
      tau = 0.92;
      albedo = 0.96;
      // Multi-frequency harmonic ringlet striations (anti-aliased)
      float ringlets = sin(rPhys * 85.0) * 0.05 + sin(rPhys * 170.0) * 0.03;
      albedo = clamp(albedo + ringlets, 0.78, 1.0);
    }
    // 3. Cassini Division (Cleared void: 1.95 - 2.025 R_S)
    else if (rPhys >= 1.95 && rPhys < 2.025) {
      discard; // 100% transparent optical void!
    }
    // 4. Ring A (Outer ring: 2.025 - 2.32 R_S)
    else if (rPhys >= 2.025 && rPhys <= 2.32) {
      tau = 0.58;
      albedo = 0.76;

      // Encke Gap (Narrow 325 km void at r = 2.21 R_S)
      if (abs(rPhys - 2.21) < 0.012) {
        discard;
      }

      float fineLines = sin(rPhys * 110.0) * 0.05;
      albedo = clamp(albedo + fineLines, 0.55, 0.88);
    }

    // 5. Planetary Globe Shadow on the Ring System:
    // In local space, Saturn is at (0,0,0) with radius R_saturn ~ 0.32.
    // The Sun is in the negative world position direction.
    // Ring fragments located on the anti-sun side (away from Sun) can be shadowed by Saturn.
    vec3 lightDir = normalize(-vWorldPosition);
    vec3 saturnCenter = vSaturnCenter;
    vec3 ringToSaturn = vWorldPosition - saturnCenter;

    // Component along sunlight direction (anti-sun direction is -lightDir)
    float distAlongShadow = dot(ringToSaturn, -lightDir);
    // Perpendicular cylinder distance from shadow center axis
    vec3 perpDistVec = ringToSaturn - (-lightDir * distAlongShadow);
    float perpDist = length(perpDistVec);

    float globeShadow = 0.0;
    if (distAlongShadow > 0.0) {
      // Cylindrical umbral shadow cast by Saturn's globe (R_globe ~ 0.32)
      globeShadow = 1.0 - smoothstep(0.31, 0.33, perpDist);
    }

    // 6. Heliocentric Distance & Irradiance Attenuation:
    float helioDist = max(0.1, length(vWorldPosition));
    float rNormHelio = helioDist / 3.25;
    float irradiance = pow(1.85 / (sqrt(rNormHelio) + 0.85), 1.25);

    // Double-sided diffuse ring lighting attenuated by Globe Shadow and Irradiance
    float NdotL = abs(dot(vNormal, lightDir));
    float directLight = (0.28 + 0.72 * NdotL) * (1.0 - globeShadow * 0.95) * irradiance * 1.15;

    // 7. Cassini High-Phase Forward Transmission & Scattering (Mie/Henyey-Greenstein ice phase)
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float cosScatter = dot(-lightDir, viewDir); // 1.0 when camera looks back towards Sun through rings

    // Water-ice micro-crystal asymmetry factor (Cassini ISS observation g ~ 0.82)
    float g = 0.82;
    float g2 = g * g;
    float forwardPhase = ((1.0 - g2) / pow(max(0.01, 1.0 + g2 - 2.0 * g * cosScatter), 1.5)) * 0.09;
    float backlitCondition = pow(max(0.0, cosScatter), 2.2);

    // Radiative transfer forward transmission:
    // Ring B is optically thick (transTau ~ 1.65) -> low transmission, appears dark in backlit view.
    // Ring A and C are optically thin/moderate -> forward photons stream through, blazing bright silver!
    float transTau = (rPhys >= 1.52 && rPhys < 1.95) ? 1.65 : tau;
    float opticalTransmission = transTau * exp(-2.1 * transTau);

    float forwardGlow = backlitCondition * forwardPhase * opticalTransmission * (1.0 - globeShadow) * irradiance * 2.2;

    // Scotopic Starlight Ambient from Galactic Plane
    vec3 scotopicAmbient = vec3(0.048, 0.054, 0.068);
    vec3 surfaceColor = albedo * (vec3(directLight) + scotopicAmbient);

    // Forward transmitted light has diamond-ice tint vec3(1.02, 1.05, 1.12)
    vec3 transmissionColor = vec3(1.02, 1.05, 1.12) * forwardGlow;

    vec3 finalColor = (surfaceColor + transmissionColor) * (1.0 + uBass * 0.12);
    float finalAlpha = clamp(tau * (1.0 - globeShadow * 0.4) + forwardGlow * 0.55, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;
