/**
 * keplerOrbitShader.ts
 * 
 * Dynamic Heliocentric Keplerian Orbit Shader with Outward Wave Propagation:
 * - Heliocentric Photometric Falloff: Orbits physically illuminated by Sol.
 * - Planetary Velocity Wake: Tapering gradient tail extending behind each planet.
 * - Traveling Heliocentric Gravitational Ripple:
 *   Continuous, silky Archimedean wave undulating outward from inner to outer planets.
 *   Modulated gently by audio rhythm (heavy kicks + light beats).
 * - Crest Luminescence Wave: Traveling starlight glint sweeping outward across the disk.
 * - 0 GC allocation per frame, 120 FPS performance.
 */

export const keplerOrbitVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uBeatIntensity;

  attribute float aAnomaly;
  varying float vAnomaly;
  varying vec3 vWorldPosition;
  varying float vWaveGlint;

  void main() {
    vAnomaly = aAnomaly;

    // Displace vertex along Y axis following heliocentric wave propagation
    vec3 pos = position;
    float r = length(pos.xz);
    float theta = atan(pos.z, pos.x);

    // Traveling wave phase: propagates outward from inner planets to outer planets
    // Speed ~ 3.5 units/s (takes ~3.5s to sweep across the entire planetary system)
    float wavePhase = r * 1.35 - theta * 0.35 - uTime * 4.8;
    float waveSine = sin(wavePhase);

    // Responsive amplitude: gentle baseline (0.025) pulsing with music (up to 0.075 on beats)
    float waveAmp = 0.025 + uBeatIntensity * 0.042 + uBass * 0.016;
    
    // Radial envelope: gentle ramp near Mercury, smooth taper at outer Kuiper rim
    float envelope = smoothstep(0.5, 1.4, r) * (1.0 - smoothstep(11.0, 16.0, r) * 0.30);

    // Apply gentle vertical undulation
    pos.y += waveSine * waveAmp * envelope;

    // Traveling wave crest glint (soft starlight shimmer along wave crests)
    vWaveGlint = pow(max(0.0, waveSine * 0.5 + 0.5), 2.8) * envelope;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const keplerOrbitFragmentShader = /* glsl */ `
  uniform float uPlanetAnomaly; // Mean anomaly of planet [0 .. 2pi]
  uniform float uWakeLength;     // Fraction of orbit for trailing wake
  uniform float uBass;
  uniform float uBeatIntensity;
  uniform vec3 uColor;

  varying float vAnomaly;
  varying vec3 vWorldPosition;
  varying float vWaveGlint;

  void main() {
    // Angular difference behind planet in normalized [0 .. 1] cycle
    float deltaM = fract((uPlanetAnomaly - vAnomaly) / 6.28318530718);

    // 1. Trailing Velocity Wake behind the planet
    float wake = 0.0;
    if (deltaM < uWakeLength) {
      float t = 1.0 - (deltaM / uWakeLength);
      wake = pow(t, 1.7) * 0.72;
    }

    // 2. Micro leading anticipation glow directly in front of the planet (0.012 of cycle)
    float ahead = 1.0 - deltaM;
    float leadGlow = 0.0;
    if (ahead < 0.014) {
      leadGlow = (1.0 - ahead / 0.014) * 0.65;
    }

    // 3. Base resting orbit line
    float baseLine = 0.15;

    // 4. Heliocentric Photometric Falloff from Sol at (0,0,0)
    float rHelio = length(vWorldPosition);
    float helioAtten = clamp(2.35 / (sqrt(rHelio / 2.2) + 0.85), 0.42, 1.35);

    // 5. Traveling Starlight Wave Crest Luminescence
    // Sweeps gently from inner orbits to outer orbits in sync with the physical ripple
    float waveLight = vWaveGlint * (0.16 + uBeatIntensity * 0.24);

    // 6. Total Dynamic Alpha
    float pulseFactor = 1.0 + uBass * 0.25 + uBeatIntensity * 0.20;
    float activeGlow = (max(wake, leadGlow) + waveLight) * pulseFactor;
    float finalAlpha = clamp((baseLine + activeGlow) * helioAtten, 0.0, 0.98);

    gl_FragColor = vec4(uColor, finalAlpha);
  }
`;
