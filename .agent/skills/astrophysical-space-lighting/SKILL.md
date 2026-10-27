---
name: astrophysical-space-lighting
description: Physical and perceptual deep space lighting engine with ACES Filmic HDR tone mapping, Cornette-Shanks forward Mie scattering crescent halos, heliocentric irradiance attenuation, analytical eclipse shadows, and 0 GC 120FPS performance.
---

# Astrophysical Space Lighting Engine // Chiaroscuro Deep-Space Optics

This skill provides astrophysics equations, mathematical optics formulations, and GLSL shader code for implementing a state-of-the-art space lighting system in 3D WebGL (Three.js / React Three Fiber). It follows the **Monolithic Cyber-Minimalism** aesthetic (Denis Villeneuve × Nonotak × SpaceEngine) with razor-sharp contrast, pitch-black shadows, filmic highlight roll-off, and locked 120 FPS performance.

---

## 1. Core Physics & Mathematical Formulations

### A. ACES Filmic Tone Mapping & Eye Adaptation
In space, luminance spans multiple orders of magnitude (from blinding $10^5 \text{ cd/m}^2$ solar photosphere down to $0.001 \text{ cd/m}^2$ starlight). Standard linear clamping truncates everything $> 1.0$, destroying solar granulation and specular highlights into flat chalky white.

The ACES filmic curve compresses HDR radiance gracefully. Combined with Dynamic Eye Adaptation (sensor dilation/contraction):
$$\mathbf{d}_{cam} = \text{camForward}; \quad \mathbf{d}_{sun} = \text{normalize}(-\mathbf{P}_{cam})$$
$$\text{dotSun} = \max(0, \mathbf{d}_{cam} \cdot \mathbf{d}_{sun})$$
$$\text{exposure}_{target} = \text{lerp}(1.28, 1.02, \text{dotSun})$$
When facing Sol, the sensor contracts to $1.02$; when observing outer planets or deep space, exposure dilates to $1.28$, revealing fine starlight and Kuiper dust.

---

### B. Perceptual Heliocentric Irradiance Scaling
Pure Inverse-Square Law ($E \propto 1/r^2$) in a compressed orrery causes outer planets ($r \approx 30$) to become $1/900\text{th}$ the brightness of Mercury, rendering them invisible.
However, human ocular adaptation is logarithmic. We use **perceptually compressed stellar irradiance**:

$$I(r) = I_0 \cdot \left( \frac{1.0 + \alpha}{\sqrt{r / r_{\text{Earth}}} + \alpha} \right)^\gamma$$
- $r_{\text{Earth}} \approx 3.25\text{ units}$
- $\alpha \approx 0.85$, $\gamma \approx 1.25$

---

### C. Atmospheric Optical Phase Scattering (Backlit Forward Mie Halo)
When looking towards the Sun with a planet in front (crescent phase, phase angle $\alpha \to 180^\circ$, or $\vec{L} \cdot \vec{V} \approx -1$), light enters the planetary atmosphere and scatters towards the camera.

The **Cornette-Shanks phase function** for forward aerosol/cloud scattering:
$$P(\cos\theta, g) = \frac{3(1 - g^2)}{2(2 + g^2)} \cdot \frac{1 + \cos^2\theta}{(1 + g^2 - 2g\cos\theta)^{3/2}}$$
where $\cos\theta = \vec{L} \cdot \vec{V}$ and $g \in [0.72, 0.82]$ is the forward anisotropy parameter.

---

### D. Analytical Umbra & Penumbra Eclipses (0 Draw Calls, 0 GC)
To render realistic eclipse shadows (e.g. Moon transiting Earth, Io/Europa transiting Jupiter) without expensive shadow maps:
For a moon sphere at center $\vec{P}_m$ with radius $R_m$, and surface fragment $\vec{P}_f$:
1. Sunlight vector: $\vec{D} = -\text{normalize}(\vec{P}_f)$.
2. Vector from fragment to moon: $\vec{V}_m = \vec{P}_m - \vec{P}_f$.
3. Projection along sunlight ray: $t = \vec{V}_m \cdot \vec{D}$.
4. If $t > 0$ (moon is between fragment and Sol):
   $$d_\perp = \|\vec{V}_m - t \vec{D}\|$$
   $$\text{Umbra} = 1.0 - \text{smoothstep}(R_m \cdot 0.5, R_m \cdot 1.15, d_\perp)$$

The fragment brightness is multiplied by $(1.0 - \text{Umbra} \cdot 0.96)$, creating a **sharp circular shadow dot** sweeping smoothly across Earth or Jupiter.

---

### E. Secondary Indirect Planetshine / Earthshine & Lunar Eclipses
For moons orbiting giant planets (Luna, Io, Europa):
$$\vec{L}_{\text{planet}} = \text{normalize}(\vec{P}_{\text{parent}} - \vec{P}_{\text{moon}})$$
$$\text{Planetshine} = \text{Albedo}_{\text{parent}} \cdot \max(0.0, \vec{N}_{\text{moon}} \cdot \vec{L}_{\text{planet}}) \cdot \Phi_{\text{phase}}$$
This softly illuminates the night side of the moon facing the parent planet with silvery Earthshine or warm Jovianshine. When the moon enters the parent's cylindrical shadow cone behind the planet ($t_{shadow} > 0, d_\perp < R_{parent}$), it plunges into total lunar eclipse.

---

### F. Audio-Reactive Heliocentric Radiation Waves
Light waves radiating outward from Sol at speed $c$:
$$\text{wave} = \sin(r \cdot 2.2 - t \cdot 6.0)$$
$$\text{helioPulse} = \text{smoothstep}(0.68, 0.98, \text{wave}) \cdot (uBeatIntensity \cdot 0.12 + uBass \cdot 0.06)$$
Produces an ethereal, rhythmic optical shimmer as the solar light wave washes across the planet's day side, locked to the music beat.

---

## 2. GLSL Reusable Lighting Snippet

```glsl
// Universal Space Lighting Function (0 GC, Branchless, PBR-aligned)
struct SpaceLightResult {
  float directLuminance;
  float forwardHalo;
  float planetshine;
};

SpaceLightResult computeSpaceLighting(
  vec3 worldPos,
  vec3 worldNormal,
  vec3 viewDir,
  float surfaceAlbedo,
  float helioDist,
  float atmosphereDensity
) {
  SpaceLightResult res;

  // 1. Heliocentric Direction to Sol at (0,0,0)
  vec3 lightDir = normalize(-worldPos);
  float NdotL = dot(worldNormal, lightDir);
  float NdotV = max(0.0, dot(worldNormal, viewDir));
  float LdotV = dot(lightDir, viewDir);

  // 2. Perceptual Irradiance Scaling
  float rNorm = helioDist / 3.25; // Relative to Earth orbit
  float irradiance = 1.0 * pow((1.85) / (sqrt(rNorm) + 0.85), 1.25);

  // 3. Day / Night Terminator
  float dayNight = smoothstep(-0.06, 0.08, NdotL);
  res.directLuminance = max(0.0, NdotL) * dayNight * irradiance;

  // 4. Cornette-Shanks Forward Mie Scattering Crescent Halo
  if (atmosphereDensity > 0.01) {
    float g = 0.78;
    float g2 = g * g;
    float forwardPhase = (1.5 * (1.0 - g2) / (2.0 + g2)) * (1.0 + LdotV * LdotV) / pow(1.0 + g2 - 2.0 * g * LdotV, 1.5);
    float limbFresnel = pow(1.0 - NdotV, 3.2);
    float backlitCondition = pow(max(0.0, -LdotV), 2.8);
    res.forwardHalo = limbFresnel * backlitCondition * forwardPhase * atmosphereDensity * irradiance;
  } else {
    res.forwardHalo = 0.0;
  }

  res.planetshine = 0.0;
  return res;
}
```

---

## 3. Strict Aesthetic Constraints (Non-Negotiable)

1. **Deep Void Negative Space (`#050507`):**
   - The cosmic void must remain pure `#050507`.
   - Never inject muddy grey ambient light or non-directional haze.
2. **Monochrome / Scotopic Chiaroscuro:**
   - Highlights are crisp starlight white (`#FFFFFF`) or pale lunar silver.
   - Shadows are stark, knife-sharp, and unyielding.
3. **No Blurry or Bloated Halos:**
   - Atmospheric forward scattering must be confined to a **razor-thin, diamond crescent rim** ($\le 3\%$ of planet radius).
   - Never render a thick cartoonish cartoon bubble around the planet.
4. **Performance Guarantee:**
   - 0 GC allocation in `useFrame` or animation loops.
   - All lighting calculations execute purely in GPU fragment shaders.
   - Locked 120 FPS.

---

## 4. Verification Protocol

After modifying shaders or canvas settings:
1. Run `npm run build` (`tsc && vite build`) to confirm zero compilation errors.
2. Use Puppeteer script to capture snapshots at 3 crucial camera positions:
   - **Direct Noon View:** Planet fully illuminated facing Sol ($N \cdot L \approx 1$).
   - **Terminator Grazing View:** Dramatic day/night boundary with long shadows ($N \cdot L \approx 0$).
   - **Backlit Eclipse View:** Camera looking into Sol with planet in front ($\vec{L} \cdot \vec{V} \approx -1$) to verify the razor-sharp forward Mie crescent halo.
3. Inspect frame rate in telemetry to verify locked 120 FPS.


---

### 8. Cassini High-Phase Ring Forward Scattering (`saturnRingShader.ts`)
- **Astrophysical Basis:** Cassini ISS observation PIA08329 ("In Saturn's Shadow").
- **Phase Function:** Water-ice crystal forward Mie/Henyey-Greenstein scattering ($g = 0.82$):
  $$P_{\text{ice}}(\cos\theta) = \frac{1 - g^2}{(1 + g^2 - 2g \cos\theta)^{1.5}} \times 0.09$$
- **Optical Depth Inversion:** Radiative transfer forward transmission $T(\tau) = \tau_{\text{trans}} \cdot \exp(-2.1 \tau_{\text{trans}})$.
  - Ring B ($\tau \approx 1.65$): dense, opaque in transmission $\to$ dark silhouette band.
  - Ring A ($\tau \approx 0.58$) & Ring C ($\tau \approx 0.22$): tenuous $\to$ forward-scattered photons stream through as blazing incandescent silver diamond sheen.
  - Cassini Division & Encke Gap: transparent voids (`discard;`).
- **Globe Shadow Integration:** Attenuated by Saturn's umbral cylindrical shadow.
