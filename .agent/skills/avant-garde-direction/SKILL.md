---
name: avant-garde-direction
description: Avant-garde monochrome visual art direction inspired by Ryoji Ikeda, Nonotak, and Teenage Engineering. Fixes flat zebra shaders, asymmetric FFT rings, and empty widescreen composition while maintaining 60FPS.
---

# Avant-Garde Monochrome Art Direction Rules (10/10 Visual Polish)

## 1. Fixing the "Flat Zebra Blob" -> True 3D Obsidian Eclipse Core (`coreShader.ts`)
Never render contour stripes at uniform 50/50 thickness across the entire mesh—it destroys 3D depth and looks like a flat 2D zebra sticker.
- **Hairline Contour Math:** Make the white contour lines razor-thin (`1px` to `1.5px` wide) and mostly dark obsidian black (`88%` black, `12%` white ridge line).
- **3D Directional & Rim Lighting Mask:** Multiply the contour brightness by a combination of directional light and Fresnel rim falloff so the center of the sphere has deep 3D shadow volume and only the ridges and silhouette edges ignite:

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vViewPosition);

      // 1. Directional light for true 3D spherical volume
      vec3 lightDir = normalize(vec3(0.8, 1.0, 0.6));
      float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);

      // 2. Eclipse Fresnel Rim (glowing white silhouette edge)
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.5);

      // 3. Razor-thin Hairline Topographic Contours (88% Obsidian Black, 12% Crisp White)
      float density = 16.0;
      float pattern = vDisplacement * density - uTime * 0.25;
      float distFromLine = abs(fract(pattern) - 0.5);
      float df = fwidth(pattern);
      // Thin hairline only right at the 0.0 boundary:
      float hairline = 1.0 - smoothstep(0.0, df * 1.35, distFromLine - 0.04);

      // 4. Mask contours by 3D lighting so center has deep shadow and ridges pop
      float lightingMask = 0.15 + diffuse * 0.65 + fresnel * 1.2 + uBass * 0.35;
      float contourLum = hairline * lightingMask * (0.45 + uBass * 0.65);

      // 5. Specular highlight on peaks + Rim Light
      float rimLum = fresnel * (0.9 + uBeatIntensity * 0.7);
      float finalLum = clamp(0.015 + contourLum + rimLum, 0.0, 1.0);

      gl_FragColor = vec4(vec3(finalLum), 1.0);
    }

## 2. Fixing Lopsided & Clipping FFT Bars -> Bilateral Symmetrical Halo (`CyberCore.tsx`)
Raw FFT bins `0..127` only have high energy in the first 30 bins, causing a lopsided circle where only one corner moves.
- **Strict Clearance Radius:** Set the inner radius of the radial bars to `R = 2.65` (well outside the maximum displaced radius of the core `~2.2`) and draw a crisp thin boundary circle (`RingGeometry(2.58, 2.60, 128)`) so the core NEVER clips or overlaps the bars.
- **Bilateral Mirror Mapping:** Use `128` bars around the `360°` circle, but map both halves symmetrically using the first `64` musical frequency bins (`const binIndex = i < 64 ? i : 127 - i;`). Apply a logarithmic boost to higher bins (`(1 + binIndex * 0.025)`) so the entire 360-degree halo pulses with architectural balance.

## 3. Breaking the "Lonely Center Blob" -> Gravitational Horizon Oscilloscope
To anchor the full 16:9 widescreen space like a Ryoji Ikeda installation:
- Add a horizontal **Time-Domain Waveform Line** (`THREE.Line` with `256` vertices spanning `x` from `-14` to `+14`) rendered from `analyser.getByteTimeDomainData()`.
- **Gravitational Lensing Effect:** For points along the line where `abs(x) < 3.2`, smoothly bend their `y` coordinate downward/upward along a circular arc (`sqrt(3.2*3.2 - x*x)`) so the horizontal soundwave visibly wraps around the gravity well of the central core.

## 4. Beat Shockwave Rings & Swiss Brutalist Framing
- **Acoustic Shockwave:** Maintain a pool of 3 thin `RingGeometry(2.6, 2.62, 128)` meshes. When `audioEngine.isBeat` triggers, spawn/reset a ring at `scale = 1.0, opacity = 0.6` and expand it outward to `scale = 3.5, opacity = 0.0` in `useFrame`.
- **Swiss Architectural HUD Accents:** Add ultra-clean `1px` crosshair registration marks (`+`) in the four corners of the viewport and vertical technical micro-labels (`PHASE // 00.0`, `PEAK FREQ // HZ`) updated via direct DOM `ref.current.textContent` every 150ms (zero React re-renders).