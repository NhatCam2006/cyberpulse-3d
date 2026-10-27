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

    // 1. Inner Photosphere Core Mask (the solar sphere sits in r < 0.26)
    float innerCut = smoothstep(0.22, 0.32, r);

    // 2. Dynamic Audio Reach: Coronal streamers stretch gently when music swells
    float energyReach = 0.72 + pow(uBeatIntensity, 1.25) * 0.35 + (uMid * 0.28 + uAcousticEnergy * 0.20);
    float rScaled = r / energyReach;

    // Multi-Harmonic Coronal Streamer Rays (Parker solar wind streamers)
    // Streamers twist and shimmer dynamically with melody (piano/vocals) and bass
    float melodicRayTwist = uMid * 0.55 + uBass * 0.25;
    float rays1 = sin((angle + melodicRayTwist) * 12.0 + uTime * 0.18) * 0.5 + 0.5;
    float rays2 = sin((angle - melodicRayTwist * 0.5) * 28.0 - uTime * 0.25) * 0.5 + 0.5;
    float rays3 = sin(angle * 64.0 + uTime * 0.40 + uMid * 1.0) * 0.5 + 0.5;
    float streamers = pow(rays1 * 0.50 + rays2 * 0.30 + rays3 * 0.20, 2.4);

    // 3. Optical Diffraction Spikes (Hairline 4-Point Cardinal Cross + 45-degree secondary cross)
    // Subtle, elegant starlight diffraction glint (never thick or blinding)
    float spikePower = 0.85 + pow(uBeatIntensity, 1.25) * 0.45 + (uMid * 0.35 + uAcousticEnergy * 0.20);
    float spikeWidth = 0.0032;
    float spikeH = spikeWidth / (abs(p.y) + spikeWidth) * smoothstep(1.0, 0.02, abs(p.x) / spikePower);
    float spikeV = spikeWidth / (abs(p.x) + spikeWidth) * smoothstep(1.0, 0.02, abs(p.y) / spikePower);
    
    // 45-degree secondary diffraction cross
    vec2 rot45 = vec2(p.x * 0.7071 - p.y * 0.7071, p.x * 0.7071 + p.y * 0.7071);
    float spikeD1 = (spikeWidth * 0.50) / (abs(rot45.y) + spikeWidth * 0.50) * smoothstep(0.85, 0.03, abs(rot45.x) / spikePower);
    float spikeD2 = (spikeWidth * 0.50) / (abs(rot45.x) + spikeWidth * 0.50) * smoothstep(0.85, 0.03, abs(rot45.y) / spikePower);

    float diffractionSpikes = (spikeH + spikeV) * 0.65 + (spikeD1 + spikeD2) * 0.35;

    // 4. Exponential Coronal Falloff with rapid, graceful decay (no thick white fog)
    float coronaFalloff = pow(max(0.0, 1.0 - rScaled), 3.0) / (rScaled * 3.2 + 0.16);

    // 5. Dual-Layer Audio Pulsation (Tuned for pure chiaroscuro starlight, 0% eye-strain):
    float kickFlare = uBass * 0.08 + pow(uBeatIntensity, 1.25) * 0.35;
    float kickMask = smoothstep(0.12, 0.55, uBeatIntensity);
    float melodicBreath = (uMid * 0.25 + uAcousticEnergy * 0.18) * (1.0 - kickMask * 0.5);
    float flare = kickFlare + melodicBreath;

    float totalCorona = (coronaFalloff * (0.35 + streamers * 0.65) + diffractionSpikes * 0.30) * (1.0 + flare);

    // Outer feathering with zero boundary derivative
    float edgeMask = pow(clamp(1.0 - r, 0.0, 1.0), 2.2);
    float finalAlpha = clamp(totalCorona * edgeMask * innerCut, 0.0, 1.0);

    // Silky, translucent starlight silver (anti-glare, non-blinding)
    gl_FragColor = vec4(vec3(0.92), finalAlpha * 0.30);
  }
`;
