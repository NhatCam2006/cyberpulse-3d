/**
 * solarPolarJetsShader.ts
 * 
 * Astrophysical Relativistic Polar Jets (Blandford-Znajek magnetic collimation):
 * - Emitted symmetrically from Sol's rotational North (+Y) and South (-Y) poles.
 * - Conical collimation profile: expands gently from nozzle throat (w=0.06) to deep space (w=0.28).
 * - Relativistic Mach shock diamonds (beaded plasma packets) propagating outward at high velocity.
 * - Soft parabolic magnetic funnel at the photospheric launch boundary.
 * - Bounded axial reach: stays strictly within the celestial vista, never piercing UI telemetry.
 * - Scotopic chiaroscuro starlight palette (pure monochrome silver diamond, zero color contamination).
 */

export const solarPolarJetsVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const solarPolarJetsFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uAcousticEnergy;
  uniform float uBeatIntensity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    // vUv.x in [0, 1] (transverse axis: 0.5 is beam spine center)
    // vUv.y in [0, 1] (axial axis: 0.0 is pole launch base, 1.0 is tip fading into space)
    float xTrans = (vUv.x - 0.5) * 2.0; // [-1.0, 1.0]
    float vAxial = vUv.y;               // [0.0, 1.0]

    // 1. Conical Jet Expansion Profile:
    // Narrow collimated throat at base (width ~ 0.08) expanding gently to 0.28 at tip
    float coneWidth = mix(0.08, 0.26, vAxial);
    float rScaled = abs(xTrans) / coneWidth;

    // 2. Soft Photospheric Launch Boundary:
    // Seamless magnetic throat emergence from Sol's coronal hole
    float launchMask = smoothstep(0.01, 0.10, vAxial);

    // 3. Graceful Tip Attenuation:
    // Smooth, feathered falloff into deep space
    float tipMask = pow(1.0 - smoothstep(0.40, 1.0, vAxial), 1.5);

    // 4. Dual-Tier Relativistic Beam Profile:
    // Tier 1: Collimated central core
    float core = exp(-2.2 * pow(rScaled, 2.0));

    // Tier 2: Ethereal magnetized shear sheath
    float sheath = exp(-0.85 * pow(rScaled, 2.0)) * 0.35;
    float beamCross = core * 0.75 + sheath;

    // 5. Relativistic Mach Shock Diamonds (Knots flowing outward):
    // Periodic plasma clumps ejected along the jet axis
    float flowVelocity = 4.0 + uBass * 3.0 + uBeatIntensity * 3.5;
    float knotWave = 0.80 + 0.20 * sin(vAxial * 18.0 - uTime * flowVelocity);

    // 6. Audio-Reactive Luminance Modulation:
    // Core breathes with drum kicks and light rhythmic beats
    float kickPop = uBeatIntensity * 0.45 + pow(uBeatIntensity, 2.0) * 0.25;
    float ambientBase = 0.42 + uBass * 0.15 + uAcousticEnergy * 0.12;
    float totalLuminance = beamCross * knotWave * launchMask * tipMask * (ambientBase + kickPop);

    // 7. Base Magnetic Throat Flare:
    // Gentle triangular flare right at the pole (vAxial < 0.15) for physical connection to Sol
    float baseFlare = exp(-vAxial * 18.0) * exp(-abs(xTrans) * 5.0) * 0.30;
    totalLuminance += baseFlare * (0.6 + kickPop);

    // Clamp peak to avoid blinding CAD axis look
    totalLuminance = clamp(totalLuminance, 0.0, 0.88);

    // 8. Scotopic Monochrome Palette (Diamond Silver & Ethereal Starlight)
    vec3 coreColor = vec3(0.98, 0.99, 1.0);
    vec3 sheathColor = vec3(0.72, 0.80, 0.90);
    vec3 finalColor = mix(sheathColor, coreColor, core);

    gl_FragColor = vec4(finalColor * totalLuminance, totalLuminance * 0.90);
  }
`;
