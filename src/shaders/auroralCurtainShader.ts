/**
 * auroralCurtainShader.ts
 * 
 * Physically-based 3D Ionospheric Auroral Curtain Drapery Shader.
 * 
 * Major Upgrades (Anti-Crown / Dynamic Traveling Dancing Aurora):
 * 1. Open Serpentine Veil (Anti-Crown): Uses true heliocentric midnight vector
 *    (dot(localOffset, sunToPlanet)) so the sunlit half fades completely to 0.0.
 *    The aurora is transformed into an OPEN S-CURVE RIVER OF LIGHT dancing across
 *    the dark night limb, completely eliminating the "closed round crown" look!
 * 2. Real-Time Traveling Waves (Vertex Shader): Crests physically travel along the perimeter
 *    (sin(4*phi - 2.4*time)), so the ribbon visibly undulates like living silk in space.
 * 3. Continuous Longitudinal Plasma River: Fibrils and plasma vortices stream continuously
 *    around the arc (flowX = vUv.x - uTime * 0.16).
 * 4. Audio-Reactive Substorm Surges: Kick drum beats ignite racing waves of emerald & crimson
 *    plasma that surge along the curtain.
 * 5. High-Speed Ray Shimmer: Vertical magnetic fibrils shimmer and dance at audio tempo.
 */

import { simplexNoiseGLSL } from './simplexNoise.glsl';

export const auroralCurtainVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBeatIntensity;
  uniform float uBass;
  uniform float uPlanetMode; // 0.0 = Earth, 1.0 = Jupiter

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vLocalOffset;
  varying float vNightMask;

  ${simplexNoiseGLSL}

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Angle around the auroral oval ring
    float phi = atan(pos.z, pos.x);
    float radius = length(pos.xz);
    vec2 radialDir = normalize(pos.xz);
    vec2 tangentDir = vec2(-radialDir.y, radialDir.x);

    // Altitude factor (0.0 at base 100km, 1.0 at top 400km)
    float altFactor = smoothstep(0.0, 1.0, uv.y);

    // 1. Dynamic Traveling S-Curve Waves (Crests visibly travel along the ribbon in real-time)
    // Mode 2 (phi * 2.0) is the fundamental S-curve serpent: bends the circle into an undulating snake of light!
    float waveSpeed = uPlanetMode > 0.5 ? 3.2 : 2.0;
    
    // Wave 1: The Grand S-Curve Serpent (Mode 2 creates two deep traveling serpentine bends)
    float wave1 = sin(phi * 2.0 - uTime * waveSpeed);
    // Wave 2: Harmonic Meander (Mode 4 creates sweeping wandering folds)
    float wave2 = sin(phi * 4.0 + uTime * (waveSpeed * 1.3));
    // Wave 3: Kelvin-Helmholtz drapery pleats (Mode 9 creates fine ripple drapery)
    float wave3 = cos(phi * 9.0 - uTime * (waveSpeed * 2.0));

    // Decoupled Horizontal S-Curve Amplitude:
    // Earth: 0.018 base amp; audio transients surge it up to 0.038-0.045
    // Displaces boldly in the XZ plane to produce an organic, free-flowing S-shape river!
    float horizontalBaseAmp = uPlanetMode > 0.5 ? 0.036 : 0.018;
    float beatHorizontalAmp = horizontalBaseAmp * (1.0 + uBeatIntensity * 1.6 + uBass * 0.8);
    // Folds broaden towards the top of the curtain
    float foldAmp = beatHorizontalAmp * (0.42 + altFactor * 0.88);

    // 3D Simplex turbulence drifting with time along the plasma flow
    float turbulence = snoise(vec3(pos.xz * (uPlanetMode > 0.5 ? 10.0 : 22.0), uTime * 1.1)) * 0.40;

    // Combined S-shape displacement
    float sShapeDisplacement = (wave1 * 0.60 + wave2 * 0.28 + wave3 * 0.12 + turbulence) * foldAmp;

    // Displace both radially and tangentially (creates authentic curled and folded S-curves)
    pos.x += (radialDir.x * 0.85 + tangentDir.x * 0.55) * sShapeDisplacement;
    pos.z += (radialDir.y * 0.85 + tangentDir.y * 0.55) * sShapeDisplacement;

    // 2. Controlled Vertical Height (Atmospheric Scale - NOT towering skyscrapers)
    // Vertical flutter breathes with the audio, strictly clamped to real atmospheric scale
    float verticalAmp = uPlanetMode > 0.5 ? 0.005 : 0.0028;
    float verticalFlutter = sin(phi * 4.0 - uTime * 2.6) * verticalAmp * altFactor;
    float beatLift = uBeatIntensity * (verticalAmp * 1.1) * (altFactor * altFactor);
    pos.y += verticalFlutter + beatLift;

    // Save local offset from planet center (modelMatrix origin is planet center)
    vLocalOffset = pos;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;

    // Calculate heliocentric night-side orientation in vertex shader
    vec4 centerWorld = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 sunToPlanet = normalize(centerWorld.xyz);
    vec3 fragmentDir = normalize(worldPos.xyz - centerWorld.xyz);
    float nightDot = dot(fragmentDir, sunToPlanet);
    // Nightside blazes, dayside softly fades to 0.0 to create an open river/veil of light!
    vNightMask = smoothstep(-0.25, 0.22, nightDot);

    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = mvPosition.xyz;

    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const auroralCurtainFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBeatIntensity;
  uniform float uBass;
  uniform float uSpectralMode;   // 0.0 = Avant-Garde Monochrome, 1.0 = Quantum Spectral Emission
  uniform float uPlanetMode;     // 0.0 = Earth, 1.0 = Jupiter
  uniform float uIoPhase;        // Longitude phase [0..1] of Io magnetic footprint
  uniform float uAuroraActivity; // 0.0 = dormant/invisible, 1.0 = full geomagnetic storm brilliance

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vLocalOffset;
  varying float vNightMask;

  ${simplexNoiseGLSL}

  // Nimitz Triangle wave helper for sharp pleated drapery ridges
  float tri(float x) {
    return abs(fract(x) - 0.5);
  }

  vec2 tri2(vec2 p) {
    return vec2(tri(p.x + tri(p.y)), tri(p.y + tri(p.x)));
  }

  // Domain-warped pleated drapery noise
  float triNoiseDrapery(vec2 p, float time) {
    float z = 1.4;
    float rz = 0.0;
    vec2 bp = p;
    for (float i = 0.0; i <= 2.0; i++) {
      vec2 dg = tri2(bp * 2.0);
      p += dg + vec2(time * 0.10, time * 0.06);
      bp *= 1.9;
      z *= 1.6;
      p *= 1.3;
      float t = tri(p.x + tri(p.y));
      rz += t / z;
      bp += 0.15;
    }
    return rz;
  }

  void main() {
    // 1. CONTINUOUS LONGITUDINAL PLASMA FLOW (The Northern Lights Flow & Drift Continuously!)
    float driftSpeed = uPlanetMode > 0.5 ? 0.28 : 0.16;
    float flowX = vUv.x - uTime * driftSpeed;

    // 2. HELIOCENTRIC NIGHT-SIDE ORIENTATION (Completely destroys the "closed round crown" look)
    // Uses interpolated vNightMask from vertex shader (1.0 on night hemisphere, 0.0 on dayside)
    float nightMask = vNightMask;

    // 3. Sinuous Drapery Folds & Substorm Surges (Nimitz Tri-Noise)
    float draperyFolds = triNoiseDrapery(vec2(flowX * 7.0, vUv.y * 3.5), uTime);
    float ribbonClusters = 0.40 + 0.60 * smoothstep(0.12, 0.70, draperyFolds);

    // Substorm Traveling Surge (waves of intense luminescence sweeping along the curtains)
    float surgePhase = flowX * 4.0 - uTime * 2.2;
    float surge = pow(abs(sin(surgePhase)), 6.0) * (uBeatIntensity * 2.6 + uBass * 1.2);

    // 4. Dynamic Dancing Flame Height Erosion (Ragged flickering top tips)
    float flameNoise1 = snoise(vec3(flowX * 9.0, uTime * 0.55, 1.5)) * 0.24;
    float flameNoise2 = snoise(vec3(flowX * 26.0, -uTime * 1.1, 3.2)) * 0.14;
    float dynamicCeiling = 0.88 + flameNoise1 + flameNoise2;
    float topFade = smoothstep(dynamicCeiling, dynamicCeiling - 0.42, vUv.y);

    // 5. Soft Atmospheric Base Anchoring (Translucent base, no harsh cut)
    float baseFade = smoothstep(0.01, 0.18, vUv.y);
    float altEnvelope = baseFade * topFade;

    // 6. Rapidly Shimmering Field-Aligned Fibrils (Ray Striations dancing at audio tempo)
    float fibrilDensity = uPlanetMode > 0.5 ? 96.0 : 68.0;
    float rayPhase = flowX * fibrilDensity + snoise(vec3(vWorldPosition * 22.0)) * 1.6;
    float ray1 = pow(abs(sin(rayPhase + uTime * 3.2)), 3.8);
    float ray2 = pow(abs(sin(flowX * (fibrilDensity * 2.2) - uTime * 4.5)), 4.0) * 0.55;
    float fibrils = (ray1 + ray2);

    // 7. Tangential Limb Brightening (Looking through the curtain edge-on from space)
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vViewPosition);
    float edgeFactor = 1.0 - abs(dot(normal, viewDir));
    float limbBrightening = pow(edgeFactor, 1.4) * 2.8 + 0.70;

    // 8. Total Dynamic Plasma Luminescence (modulated by CME Geomagnetic Storm Activity)
    float audioPower = 0.80 + uBeatIntensity * 2.4 + uBass * 0.90;
    float plasma = (0.45 + fibrils * 1.35 + surge) * altEnvelope * ribbonClusters * nightMask * limbBrightening * audioPower * 2.4 * uAuroraActivity;

    // Jovian Io Magnetic Footprint Spot (For Jupiter)
    if (uPlanetMode > 0.5) {
      float dIo = abs(vUv.x - fract(uIoPhase));
      dIo = min(dIo, 1.0 - dIo);
      float ioSpot = smoothstep(0.045, 0.0, dIo) * (3.5 + uBeatIntensity * 4.5);
      float tailDist = fract(vUv.x - uIoPhase);
      float tail = smoothstep(0.35, 0.0, tailDist) * exp(-tailDist * 10.0) * 1.8;
      plasma += (ioSpot + tail) * altEnvelope * uAuroraActivity;
    }

    // ==========================================
    // COLOR PALETTES
    // ==========================================

    // Option A: Avant-Garde Monochrome (Ryoji Ikeda / Nothing OS)
    vec3 monoColor = vec3(clamp(plasma * 1.45, 0.0, 3.2));

    // Option B: Quantum Emission Spectroscopy
    vec3 spectralColor;
    if (uPlanetMode > 0.5) {
      // Jovian Ultraviolet & Hydrogen Lyman/Werner bands (Electric Cyan to Royal Purple)
      vec3 jovianCyan = vec3(0.05, 0.94, 1.0);
      vec3 jovianViolet = vec3(0.70, 0.16, 1.0);
      spectralColor = mix(jovianCyan, jovianViolet, smoothstep(0.18, 0.85, vUv.y)) * plasma * 1.6;
    } else {
      // Earth Ionosphere Quantum Transitions:
      // 557.7nm Atomic Oxygen Singlet-S: Luminous Mint/Cyan-Green (100-200 km)
      vec3 green557 = vec3(0.12, 1.0, 0.65);
      // 630.0nm Atomic Oxygen Singlet-D: High-Altitude Ruby Crimson Flame Tips (250-400 km)
      vec3 red630 = vec3(1.0, 0.18, 0.45);
      // 427.8nm Ionized Molecular Nitrogen: Subtle Electric Violet Base Border
      vec3 violet428 = vec3(0.38, 0.18, 0.95);

      vec3 oxygenGrad = mix(green557, red630, smoothstep(0.20, 0.80, vUv.y));
      spectralColor = mix(violet428, oxygenGrad, smoothstep(0.02, 0.16, vUv.y)) * plasma * 1.7;
    }

    vec3 finalRgb = mix(monoColor, spectralColor, uSpectralMode);
    float alpha = clamp(plasma * (0.65 + uSpectralMode * 0.35) * uAuroraActivity, 0.0, 0.98);

    if (alpha < 0.005) {
      discard;
    }

    gl_FragColor = vec4(finalRgb, alpha);
  }
`;
