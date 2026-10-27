---
name: celestial-mechanics
description: Heliocentric Keplerian celestial mechanics, NASA JPL DE440 ephemerides, Laplace resonances, Parker solar wind dynamics, and 60FPS precision orrery visualization.
---

# Heliocentric Celestial Mechanics & Planetary Orrery Rules

## 1. Mathematical Rigor & Orbital Equations
- **Kepler's Equation:** Solve $M = E - e \sin E$ using Newton-Raphson iteration for every planet each frame:
  $$E_{k+1} = E_k - \frac{E_k - e \sin E_k - M}{1 - e \cos E_k}$$
  Initial guess: $E_0 = M + e \sin M + \frac{e^2}{2} \sin(2M)$. Converge in $\le 4$ iterations.
- **True Anomaly ($\nu$) & Radius ($r$):**
  $$r = a(1 - e \cos E), \quad \tan\left(\frac{\nu}{2}\right) = \sqrt{\frac{1 + e}{1 - e}} \tan\left(\frac{E}{2}\right)$$
- **3D Ecliptic Orientation:** Rotate orbital plane coordinates $(x', y', 0)$ into J2000 ecliptic coordinates $(x, y, z)$ via Euler matrix:
  $$P_{\text{ecliptic}} = R_z(-\Omega) \cdot R_x(-i) \cdot R_z(-\omega) \cdot P_{\text{orbital}}$$
  where argument of perihelion $\omega = \varpi - \Omega$.
- **Kepler's 3rd Law:** Orbital angular velocity strictly follows $\omega(a) = \omega_0 \cdot a^{-3/2}$.

## 2. Cosmic Scale Disparity & Power-Law Metric Normalization
True distance ratio from Mercury ($0.387 \text{ AU}$) to Neptune ($30.07 \text{ AU}$) is $\sim 1:78$, and planet diameter vs orbital distance is $1:350,000$. Linear scaling makes planets invisible.
- **Orbital Distance Mapping:**
  $$r_{\text{vis}}(a) = R_{\text{inner}} + C_a \cdot a^\alpha \quad (\alpha \approx 0.52)$$
  Preserves relative ordering, harmonic period ratios, and exact geometric eccentricity ($r_{\text{vis}}(\nu) = r_{\text{vis}}(a) \frac{1 - e^2}{1 + e \cos\nu}$).
- **Planetary Radius Mapping:**
  $$R_{\text{vis}}(R_p) = R_{\text{min}} + C_R \cdot \left(\frac{R_p}{R_\oplus}\right)^\beta \quad (\beta \approx 0.42)$$
  Ensures gas giants (Jupiter, Saturn) maintain visual supremacy over terrestrial planets while keeping terrestrial planets sharp and legible.

## 3. Solar Physics & Coronal Mass Ejection (CME)
- **Photosphere Limb Darkening:** Eddington-Barbier approximation in GLSL:
  $$I(\mu) = I_0 [1 - u(1 - \mu)], \quad \mu = \cos\theta = \sqrt{1 - (r/R_\odot)^2}$$
- **Plasma Convection Cells:** Procedural 3D Simplex noise on solar sphere driven by time.
- **Coronal Mass Ejection (CME):** Self-similar Sedov-Taylor shockwave expansion:
  $$R_{\text{shock}}(t) \propto t^{2/5}$$
  Fires expanding plasma shock torus across planetary orbits on transient audio kicks (`beatIntensity > 0.6`).

## 4. Planetary Subsystems & Resonances
- **Jupiter's Galilean Moons:** Strictly enforce 4:2:1 Laplace resonance:
  $$\lambda_{\text{Io}} - 3\lambda_{\text{Europa}} + 2\lambda_{\text{Ganymede}} = 180^\circ$$
- **Saturn's Ring System:** Double-sided geometry with exact Cassini Division cleared by 2:1 orbital resonance with Mimas ($r_{\text{Cassini}} = a_{\text{Mimas}} (1/2)^{2/3}$).
- **Earth-Moon System:** Inclined lunar orbit ($5.14^\circ$) around Earth with nodal precession.
- **Asteroid Belt:** Instanced GPU particles between $2.1 - 3.3 \text{ AU}$ with completely cleared Kirkwood gaps (resonances 3:1, 5:2, 2:1 with Jupiter).

## 5. Aesthetics & Performance Directives
- Pure monochrome Ryoji Ikeda / Nothing OS styling (`#050507`, `#ffffff`, `#888888`).
- Zero raymarching. All geometry must use pre-allocated Three.js buffer attributes and analytical GLSL shaders.
- Performance must stay locked at 60+ FPS on all devices.
