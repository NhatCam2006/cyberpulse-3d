/**
 * solarCoronaRaysShader.ts
 * Astrophysical Solar Corona Streamers & Optical Diffraction Spikes Shader.
 * Renders on a camera-facing billboard quad centered at Sol (0,0,0):
 * 1. 1/r^gamma radial solar wind coronal streamers.
 * 2. 4-point / 6-point Optical Diffraction Spikes (Telescope aperture diffraction).
 * 3. Superheated Inner Coronal Halo with exponential luminance decay.
 * 4. Audio-reactive flare bursts driven by Bass & Beat transients.
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

    // Fade out at borders
    if (r > 1.0) discard;

    // 1. Inner Photosphere Core Mask (the solar sphere sits in r < 0.24)
    float innerCut = smoothstep(0.18, 0.25, r);

    // 2. Dynamic Audio Reach: Coronal streamers stretch outward when music swells
    float energyReach = 0.72 + pow(uBeatIntensity, 1.25) * 0.70 + (uMid * 0.60 + uAcousticEnergy * 0.45);
    float rScaled = r / energyReach;

    // Multi-Harmonic Coronal Streamer Rays (Parker solar wind streamers)
    // Streamers twist and shimmer dynamically with melody (piano/vocals) and bass
    float melodicRayTwist = uMid * 0.75 + uBass * 0.35;
    float rays1 = sin((angle + melodicRayTwist) * 12.0 + uTime * 0.22) * 0.5 + 0.5;
    float rays2 = sin((angle - melodicRayTwist * 0.6) * 28.0 - uTime * 0.32) * 0.5 + 0.5;
    float rays3 = sin(angle * 64.0 + uTime * 0.55 + uMid * 1.5) * 0.5 + 0.5;
    float streamers = pow(rays1 * 0.50 + rays2 * 0.30 + rays3 * 0.20, 2.2);

    // 3. Optical Diffraction Spikes (4-Point Cardinal Cross + 45-degree secondary cross)
    // Spikes dynamically elongate and glint on beat kicks and melodic phrases
    float spikePower = 0.90 + pow(uBeatIntensity, 1.25) * 1.10 + (uMid * 0.85 + uAcousticEnergy * 0.50);
    float spikeWidth = 0.007 * (0.85 + uMid * 0.35);
    float spikeH = spikeWidth / (abs(p.y) + spikeWidth) * smoothstep(1.0, 0.01, abs(p.x) / spikePower);
    float spikeV = spikeWidth / (abs(p.x) + spikeWidth) * smoothstep(1.0, 0.01, abs(p.y) / spikePower);
    
    // 45-degree secondary diffraction cross
    vec2 rot45 = vec2(p.x * 0.7071 - p.y * 0.7071, p.x * 0.7071 + p.y * 0.7071);
    float spikeD1 = (spikeWidth * 0.55) / (abs(rot45.y) + spikeWidth * 0.55) * smoothstep(0.90, 0.02, abs(rot45.x) / spikePower);
    float spikeD2 = (spikeWidth * 0.55) / (abs(rot45.x) + spikeWidth * 0.55) * smoothstep(0.90, 0.02, abs(rot45.y) / spikePower);

    float diffractionSpikes = (spikeH + spikeV) * 0.90 + (spikeD1 + spikeD2) * 0.50;

    // 4. Exponential Coronal Falloff with dynamic reaching
    float coronaFalloff = pow(max(0.0, 1.0 - rScaled), 2.2) / (rScaled * 1.6 + 0.04);

    // 5. Dual-Layer Audio Pulsation:
    // Heavy kick: explosive transient pop (+120%)
    // Melodic sections (ballad / piano / vocal): warm, visible organic breathing (+75%)
    float kickFlare = uBass * 0.18 + pow(uBeatIntensity, 1.25) * 1.20;
    float kickMask = smoothstep(0.12, 0.55, uBeatIntensity);
    float melodicBreath = (uMid * 0.75 + uAcousticEnergy * 0.55) * (1.0 - kickMask * 0.5);
    float flare = kickFlare + melodicBreath;

    float totalCorona = (coronaFalloff * (0.40 + streamers * 0.60) + diffractionSpikes * 0.40) * (1.0 + flare);

    // Outer feathering with zero boundary derivative
    float edgeMask = pow(clamp(1.0 - r, 0.0, 1.0), 2.0);
    float finalAlpha = clamp(totalCorona * edgeMask * innerCut, 0.0, 1.0);

    // Pure monochrome laboratory HDR glow
    gl_FragColor = vec4(vec3(1.0), finalAlpha * 0.85);
  }
`;
