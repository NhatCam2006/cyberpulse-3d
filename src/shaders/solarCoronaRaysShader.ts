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

    // 1. Inner Photosphere Core Mask (the solar sphere sits in r < 0.25)
    float innerCut = smoothstep(0.20, 0.28, r);

    // 2. Multi-Harmonic Coronal Streamer Rays (Parker solar wind streamers)
    // Streamers gently twist and shimmer with melodic mid frequencies (piano/vocals)
    float melodicRayTwist = uMid * 0.35;
    float rays1 = sin((angle + melodicRayTwist) * 12.0 + uTime * 0.15) * 0.5 + 0.5;
    float rays2 = sin((angle - melodicRayTwist * 0.5) * 28.0 - uTime * 0.25) * 0.5 + 0.5;
    float rays3 = sin(angle * 64.0 + uTime * 0.40) * 0.5 + 0.5;
    float streamers = pow(rays1 * 0.5 + rays2 * 0.3 + rays3 * 0.2, 2.5);

    // 3. Optical Diffraction Spikes (4-Point Cardinal Cross + 45-degree secondary cross)
    // Primary cross (horizontal & vertical aperture diffraction)
    float spikeH = 0.008 / (abs(p.y) + 0.008) * smoothstep(1.0, 0.05, abs(p.x));
    float spikeV = 0.008 / (abs(p.x) + 0.008) * smoothstep(1.0, 0.05, abs(p.y));
    
    // 45-degree secondary diffraction cross
    vec2 rot45 = vec2(p.x * 0.7071 - p.y * 0.7071, p.x * 0.7071 + p.y * 0.7071);
    float spikeD1 = 0.004 / (abs(rot45.y) + 0.008) * smoothstep(0.85, 0.08, abs(rot45.x));
    float spikeD2 = 0.004 / (abs(rot45.x) + 0.008) * smoothstep(0.85, 0.08, abs(rot45.y));

    float diffractionSpikes = (spikeH + spikeV) * 0.85 + (spikeD1 + spikeD2) * 0.45;

    // 4. Exponential Coronal Falloff (1 / r^2.2)
    float coronaFalloff = pow(max(0.0, 1.0 - r), 2.4) / (r * 1.8 + 0.05);

    // 5. Dual-Layer Audio Pulsation:
    // When beat kick hits: explosive transient punch (uBass * 0.4 + uBeatIntensity * 0.8)
    // When in melodic intro/verse (no kick): warm breathing according to vocal melody and piano chords!
    float kickFlare = uBass * 0.40 + uBeatIntensity * 0.85;
    float kickMask = smoothstep(0.12, 0.60, uBeatIntensity);
    float melodicBreath = (uMid * 0.48 + uAcousticEnergy * 0.32) * (1.0 - kickMask);
    float flare = kickFlare + melodicBreath;

    float totalCorona = (coronaFalloff * (0.45 + streamers * 0.55) + diffractionSpikes * 0.35) * (1.0 + flare);

    // Outer feathering with zero boundary derivative
    float edgeMask = pow(clamp(1.0 - r, 0.0, 1.0), 2.2);
    float finalAlpha = clamp(totalCorona * edgeMask * innerCut, 0.0, 1.0);

    // Pure monochrome laboratory HDR glow
    gl_FragColor = vec4(vec3(1.0), finalAlpha * 0.78);
  }
`;
