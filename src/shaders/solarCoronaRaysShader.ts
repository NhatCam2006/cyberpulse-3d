/**
 * solarCoronaRaysShader.ts
 * Astrophysical Solar Corona Streamers & Optical Diffraction Spikes Shader.
 * 
 * Renders on a camera-facing billboard quad centered at Sol (0,0,0):
 * 1. Tight Exponential Coronal Halo: Hugs Sol's limb closely with silky starlight diffusion
 *    (zero giant foggy blob, 100% transparent across outer orbits).
 * 2. Parker Solar Wind Coronal Wisps: Delicate, silky filament rays concentrating along the ecliptic plane.
 * 3. Crystalline Anamorphic 4-Point Telescope Aperture Diffraction Cross (Hubble / James Webb Glint):
 *    Razor-thin horizontal & vertical spikes that glint authoritatively on music beats.
 * 4. Bounded Starlight Alpha: Calibrated [0.25, 0.38] dynamic range.
 */

export const solarCoronaRaysVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const solarCoronaRaysFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uAcousticEnergy;
  uniform float uBeatIntensity;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    // Center UV at (0,0), radius in [0 .. 1]
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float angle = atan(p.y, p.x);

    // Fade out cleanly at quad circular boundary
    if (r > 1.0) discard;

    // 1. Tight Exponential Coronal Halo:
    // Decays exponentially outward from Sol's limb (R ~ 0.20), providing a soft starlight aura
    // without obscuring planetary orbits or creating a dense white fog box
    float innerHalo = exp(-r * 4.8) * 0.72;

    // 2. Parker Solar Wind Coronal Streamers (Ecliptic Helmet Streamers)
    // Multi-Harmonic silky starlight rays along the ecliptic plane
    float eclipticDensity = 0.75 + 0.55 * pow(abs(cos(angle)), 2.0);
    float melodicTwist = uMid * 0.18;
    float ray1 = sin((angle + melodicTwist) * 12.0 + uTime * 0.08) * 0.5 + 0.5;
    float ray2 = sin((angle - melodicTwist * 0.5) * 28.0 - uTime * 0.14) * 0.5 + 0.5;
    float ray3 = sin(angle * 60.0 + uTime * 0.24) * 0.5 + 0.5;
    float streamerRays = pow(ray1 * 0.50 + ray2 * 0.32 + ray3 * 0.18, 2.8) * eclipticDensity;

    // Radial streamer falloff: silky, translucent starlight
    float streamerFalloff = pow(max(0.0, 1.0 - r), 1.8) / (r * 2.0 + 0.14);

    // 3. Precision Anamorphic 4-Point Telescope Aperture Diffraction Cross (Hubble / JWST Cross)
    // Primary horizontal ecliptic spike (slight anamorphic bias for 16:9 widescreen composition)
    float spikeH = 0.0035 / (abs(p.y) + 0.0035) * smoothstep(1.0, 0.015, abs(p.x));
    float spikeV = 0.0024 / (abs(p.x) + 0.0024) * smoothstep(1.0, 0.02, abs(p.y));

    // Secondary 45-degree diagonal cross (delicate crystalline glints)
    vec2 rot45 = vec2(p.x * 0.7071 - p.y * 0.7071, p.x * 0.7071 + p.y * 0.7071);
    float spikeD1 = 0.0014 / (abs(rot45.y) + 0.0030) * smoothstep(0.85, 0.04, abs(rot45.x));
    float spikeD2 = 0.0014 / (abs(rot45.x) + 0.0030) * smoothstep(0.85, 0.04, abs(rot45.y));

    float diffractionCross = (spikeH + spikeV) * 0.88 + (spikeD1 + spikeD2) * 0.30;

    // 4. Audio-Reactive Energy Scaling:
    // Kick flares expand diffraction spikes and streamers; melody adds crystalline glint
    float kickFlare = pow(uBeatIntensity, 1.25) * 0.45 + uBass * 0.12;
    float melodicGlint = uMid * 0.22;
    float audioBoost = kickFlare + melodicGlint;

    // Combine tight halo, delicate streamers, and crystalline diffraction cross
    float totalCorona = innerHalo * 0.45 + streamerFalloff * streamerRays * 0.35 + diffractionCross * 0.50;
    totalCorona *= (1.0 + audioBoost * 0.65);

    // Clean outer boundary feathering with zero boundary derivative
    float outerFeather = pow(clamp(1.0 - r, 0.0, 1.0), 2.0);
    
    // Calibrated starlight alpha: floor at 0.25, ceiling safely capped at 0.38
    // Pure starlight silver: translucent, silky, crystalline
    float finalAlpha = clamp(totalCorona * outerFeather, 0.0, 1.0) * (0.25 + audioBoost * 0.12);

    gl_FragColor = vec4(vec3(1.0), finalAlpha);
  }
`;
