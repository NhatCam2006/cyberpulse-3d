---
name: macro-system-cinematics
description: Mathematical formulation, shader architecture, and 120FPS GPU implementation for macro-scale solar system dynamics: Keplerian velocity orbit wakes, scotopic interstellar bolide tuning, and symphonic multi-movement cinematic camera choreography.
---

# Macro System Cinematics & Orrery Dynamics // Visual Architecture

This skill governs the high-level macro visual system of **Cyberpulse 3D**, transforming the macroscopic Solar System overview from a static geometric CAD diagram into a living, breathing, audio-synchronized cosmic masterwork following **Swiss Brutalist & Ryoji Ikeda** minimalism and **Denis Villeneuve** chiaroscuro cinematography.

---

## 1. Pillar I: Keplerian Velocity Orbit Wakes (`keplerOrbitShader.ts`)

### A. Astrophysical & Celestial Mechanics Foundation
According to Kepler's Second and Third Laws:
$$\frac{dA}{dt} = \frac{1}{2} r^2 \dot{\theta} = \text{const}, \quad \omega(a) = \sqrt{\frac{G M_\odot}{a^3}} \propto a^{-3/2}$$
Orbital velocity scales inversely with the square root of the semi-major axis:
$$v_{\text{orb}}(a) \propto a^{-1/2}$$
- **Mercury** ($a = 0.387\text{ AU}$): Extreme velocity ($v \approx 47.4\text{ km/s}$), short energetic wake.
- **Earth** ($a = 1.000\text{ AU}$): Moderate velocity ($v \approx 29.8\text{ km/s}$), balanced harmonic wake.
- **Jupiter** ($a = 5.204\text{ AU}$): Slow majestic glide ($v \approx 13.1\text{ km/s}$), long sweeping wake.
- **Neptune** ($a = 30.07\text{ AU}$): Deep space cold drift ($v \approx 5.4\text{ km/s}$).

### B. Mathematical Formulation & Shader Geometry
Existing orbit lines consist of $N = 144$ elliptical points in the ecliptic frame:
$$\mathbf{P}_k = \left(x_k, y_k, z_k\right), \quad k \in [0, N-1]$$
Each vertex carries an attribute or uniform:
1. **Angular Distance to Planet $\Delta \theta$:**
   $$\Delta \theta = \text{mod}(\theta_{\text{vertex}} - \theta_{\text{planet}} + 2\pi, 2\pi)$$
2. **Trailing Wake Profile:**
   The wake stretches **behind** the planet along the trajectory ($\Delta \theta \in [0, \Theta_{\text{wake}}]$):
   $$\Theta_{\text{wake}} = \Theta_0 \cdot \left(\frac{v_{\text{planet}}}{v_{\text{Earth}}}\right)^{0.65}$$
   $$\text{wakeIntensity} = \text{pow}\left(1.0 - \frac{\Delta \theta}{\Theta_{\text{wake}}}, 1.8\right)$$
3. **Heliocentric Photometric Falloff:**
   $$I_{\text{helio}}(r) = \text{clamp}\left(\frac{2.2}{\sqrt{r / 2.0} + 0.8}, 0.25, 1.35\right)$$
4. **Base Orbit Luminance:**
   A subtle resting vector line ($\alpha_0 \approx 0.12 - 0.16$) maintains the orbital ellipse geometry even when the planet is distant.
5. **Combined Luminance:**
   $$\alpha(\Delta \theta, r) = \text{clamp}\left(\alpha_0 + \text{wakeIntensity} \cdot 0.72 \cdot (1.0 + uBass \cdot 0.25), 0.0, 1.0\right) \cdot I_{\text{helio}}(r)$$

### C. Zero-GC Performance Guarantee
- Pre-allocated vertex buffers.
- Fragment shader handles all exponential decay, angular wrapping, and audio modulation.
- 0 bytes allocated per frame in `useFrame` at locked 120 FPS.

---

## 2. Pillar II: Scotopic Interstellar Bolide Tuning (`InterstellarBolide.tsx`)

### A. Eliminating Arcade Neon
- **Current Defect:** Bright lime-green (`#a3e635`) trajectory line that clashes with the deep monochrome `#050507` void and ACES Filmic Chiaroscuro starlight.
- **Astrophysical Grounding (NASA / ESO 'Oumuamua & 2I/Borisov):**
  Interstellar bolides are carbonaceous, water-ice, and nitrogen-rich planetesimals. As they dive through perihelion, volatile outgassing creates:
  1. **Nucleus & Coma:** Blinding incandescent diamond-silver point (`#FFFFFF` to `#E2E8F0`).
  2. **Ion Tail:** Neutral scotopic starlight silver with a subtle icy-cyan tinge (`vec3(0.78, 0.88, 1.00)`), pointing strictly anti-solar due to solar wind radiation pressure ($\vec{F}_{\text{rad}} \propto -\mathbf{P}_{\text{bolide}}$).
  3. **Trajectory Trace:** Deep translucent silver thread (`opacity: 0.18 - 0.28`), tapering quadratically into the infinite hyperbolic asymptote.

### B. Color Palette Mapping
- Replace all lime-green hex codes with:
  - Trajectory Core: `#E2E8F0` / `0xe2e8f0`
  - Coma Glow: `#C8D6E5` / `0xc8d6e5`
  - Anti-solar Ion Fan: `vec3(0.82, 0.90, 1.00)`

---

## 3. Pillar III: Symphonic Multi-Movement Overview Camera Director (`VisualizerCanvas.tsx`)

### A. The 4 Classical Overview Cinematic Movements
To prevent visual monotony during prolonged listening sessions, the macro camera choreographs between 4 distinct vantage points:

| Movement | Name | Altitude ($Y$) | Radius ($R$) | Pitch Angle | Description & Artistic Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **I** | **Ecliptic Horizon Glider** | $1.20 - 1.80$ | $14.2$ | Low grazing | Glides right along the ecliptic plane, looking across stacked planetary orbits and Saturn's rings like a vast cosmic vinyl disc. |
| **II** | **Keplerian God's-Eye Vista** | $14.5 - 16.0$ | $8.2 - 9.5$ | High polar ($> 65^\circ$) | Looks straight down at the concentric geometric harmony of all 8 planets and the asteroid belt. |
| **III** | **Golden-Angle Vista** | $5.2 - 6.2$ | $13.0$ | Classic $35^\circ$ | Balanced golden-ratio perspective framing Sol in the center, Milky Way in the background, and Kuiper rim. |
| **IV** | **Climax Inward Slingshot** | $3.2 \to 2.4$ | $13.0 \to 8.5$ | Dynamic | On drop/climax (`isClimax`), slowly pushes in toward inner planets as CME expands, then gently recoils out to wide vista. |

### B. Mathematical State Interpolation (0 GC)
- Movement transition period: $T_{\text{move}} \approx 28 - 36\text{ seconds}$ per phase.
- Hermite smoothstep blend:
  $$S(t) = 3t^2 - 2t^3$$
- Reusable static module vectors `_camTarget`, `_moveA`, `_moveB` for 0 runtime memory allocation.
- In `cameraMode === 'orbit'`, the director is completely disabled to grant the user 100% interactive mouse freedom.

---

## 4. 5-Gate Clearance & Verification Protocol

Before declaring complete:
1. **Gate 1:** Production build (`npm run build`) compiles with 0 errors.
2. **Gate 2:** Telemetry confirms locked 120 FPS.
3. **Gate 3:** Zero GC allocations verified in all `useFrame` loops.
4. **Gate 4:** Puppeteer snapshots captured for all 3 features.
5. **Gate 5:** Negative space `#050507` and central Sol integrity 100% preserved.
