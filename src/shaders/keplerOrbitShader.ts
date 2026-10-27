/**
 * keplerOrbitShader.ts
 * 
 * High-Precision Dynamic Keplerian Orbit Shader:
 * - Heliocentric Photometric Falloff: Orbits physically illuminated by Sol (brighter near Sol, softer in deep space).
 * - Planetary Velocity Wake: Tapering gradient tail extending behind each planet along its orbital trajectory,
 *   proportional to its real Keplerian orbital velocity v ~ a^(-1/2).
 * - Subtle Leading Micro-Glow: Frames the planet's forward momentum.
 * - Audio-Harmonic Resonance: Breathes gently on bass kicks and musical chords.
 * - 0 GC allocation per frame.
 */

export const keplerOrbitVertexShader = /* glsl */ `
  attribute float aAnomaly;
  varying float vAnomaly;
  varying vec3 vWorldPosition;

  void main() {
    vAnomaly = aAnomaly;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const keplerOrbitFragmentShader = /* glsl */ `
  uniform float uPlanetAnomaly; // Mean anomaly of planet [0 .. 2pi]
  uniform float uWakeLength;     // Fraction of orbit for trailing wake (e.g. 0.08 to 0.22)
  uniform float uBass;
  uniform float uBeatIntensity;
  uniform vec3 uColor;

  varying float vAnomaly;
  varying vec3 vWorldPosition;

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

    // 5. Total Dynamic Alpha
    float pulseFactor = 1.0 + uBass * 0.35 + uBeatIntensity * 0.25;
    float activeGlow = max(wake, leadGlow) * pulseFactor;
    float finalAlpha = clamp((baseLine + activeGlow) * helioAtten, 0.0, 0.98);

    gl_FragColor = vec4(uColor, finalAlpha);
  }
`;
