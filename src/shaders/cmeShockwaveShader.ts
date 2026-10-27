/**
 * cmeShockwaveShader.ts
 * 
 * 2D Planar Relativistic Coronal Mass Ejection (CME) Blast Shockwave.
 * Simulates a planar Sedov-Taylor interplanetary blast shock front expanding
 * flatly across the horizontal ecliptic orbital plane (XZ plane) as an expanding
 * 2D concentric circular wave (water ripples spreading on a pond):
 * - Sharp relativistic bow shock leading edge (outer circular rim)
 * - Trailing acoustic wake ripples in the interplanetary magnetic field (IMF)
 * - 3D Simplex noise turbulent plasma shredding
 * - Sedov-Taylor energy dissipation R(t) ~ t^(2/5) as the circular blast sweeps past planets
 */

import { simplexNoiseGLSL } from './simplexNoise.glsl';

export const cmeShockwaveVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  void main() {
    vUv = uv;
    vLocalPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const cmeShockwaveFragmentShader = /* glsl */ `
  uniform float uExpansionProgress; // 0.0 -> 1.0
  uniform float uBeatIntensity;
  uniform float uTime;
  uniform float uSpectralMode;      // 0.0 = Monochrome, 1.0 = Spectral Gold/Cyan
  uniform float uInnerRadius;       // Default 0.72

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  ${simplexNoiseGLSL}

  void main() {
    // Exact circular radial coordinate from 2D local vertex position
    float localR = length(vLocalPosition.xy);
    float rInner = uInnerRadius > 0.0 ? uInnerRadius : 0.72;
    float radialT = clamp((localR - rInner) / (1.0 - rInner), 0.0, 1.0);
    float azimuth = atan(vLocalPosition.y, vLocalPosition.x);

    // 1. Sharp Relativistic Bow Shock Leading Front (outer circular edge radialT -> 1.0)
    float bowShock = smoothstep(0.20, 0.90, radialT) * (1.0 - smoothstep(0.94, 1.0, radialT));
    bowShock = pow(bowShock, 0.70) * 3.0;

    // 2. Trailing Acoustic Wake Ripples (concentric wavelets trailing behind the shock front)
    float ripples = (sin(radialT * 42.0 - uTime * 6.5) * 0.5 + 0.5) * 0.40;

    // 3. Azimuthal Solar Wind Turbulence (plasma shredding and filamentation along 360 degrees)
    vec2 pCoords = vec2(cos(azimuth), sin(azimuth)) * 4.5;
    float turbulence = (snoise(vec3(pCoords, uTime * 1.5)) * 0.5 + 0.5) * 0.35;
    float fineFibrils = (snoise(vec3(pCoords * 3.8, -uTime * 2.2)) * 0.5 + 0.5) * 0.25;

    // 4. Smooth inner rim fade (avoids harsh cutoff at inner radius)
    float innerFade = smoothstep(0.0, 0.16, radialT);

    // 5. Sedov-Taylor Dissipation as blast front expands outward into deep space
    // High initial intensity, dissipates smoothly as uExpansionProgress -> 1.0
    float dissipation = pow(max(0.0, 1.0 - uExpansionProgress), 1.25);

    // 6. Total Planar Shockwave Luminescence (always strictly positive and continuous)
    float totalWake = (bowShock + 0.35) * (1.0 + ripples + turbulence + fineFibrils) * innerFade;
    float shockIntensity = totalWake * dissipation * (1.0 + uBeatIntensity * 1.5);

    if (shockIntensity < 0.005) {
      discard;
    }

    // ==========================================
    // COLOR PALETTES
    // ==========================================
    // Mode A: High-Contrast Ryoji Ikeda Monochrome White
    vec3 monoColor = vec3(clamp(shockIntensity * 1.5, 0.0, 3.0));

    // Mode B: Solar Flare Extreme UV (SDO 304A / 171A):
    // Brilliant Gold-White leading bow shock with electric turquoise/cyan ionized wake
    vec3 leadingGold = vec3(1.0, 0.85, 0.40) * 2.8;
    vec3 trailingCyan = vec3(0.10, 0.95, 1.0) * 2.0;
    vec3 spectralColor = mix(trailingCyan, leadingGold, smoothstep(0.40, 0.90, radialT)) * shockIntensity;

    vec3 finalRgb = mix(monoColor, spectralColor, uSpectralMode);
    float alpha = clamp(shockIntensity * (0.85 + uSpectralMode * 0.15), 0.0, 0.95);

    gl_FragColor = vec4(finalRgb, alpha);
  }
`;
