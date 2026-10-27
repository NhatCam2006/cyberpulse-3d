---
name: milky-way-backdrop
description: Astronomical formulation and 120FPS GPU WebGL implementation of a subtle, non-cluttering Milky Way galactic plane backdrop with molecular dust rifts and 0 GC allocations.
---

# Milky Way Backdrop // Ethereal Galactic Plane & Interstellar Dust Rift

This skill provides astrophysics, mathematical coordinate transformations, and GLSL shader instructions for creating an ultra-subtle, non-distracting Milky Way background in 3D WebGL (Three.js / React Three Fiber) following Swiss Brutalist and Ryoji Ikeda minimalist aesthetics.

## 1. Astrophysics & Celestial Coordinate Geometry

In the Heliocentric Orrery, the ecliptic plane corresponds to $Y = 0$. The Milky Way galactic plane is inclined relative to the ecliptic plane at an angle:
$$\theta_{gal} \approx 60.19^\circ$$
with ascending node longitude $\Omega_{gal} \approx 266.4^\circ$.

### Galactic Normal & Center Direction
Let $\mathbf{n}_{gal}$ be the unit normal vector pointing toward the North Galactic Pole (Coma Berenices, $RA = 12h51m, Dec = +27^\circ07'$).
In ecliptic Cartesian coordinates:
$$\mathbf{n}_{gal} = (\sin\theta_{gal}\sin\Omega_{gal}, \cos\theta_{gal}, -\sin\theta_{gal}\cos\Omega_{gal})$$

Let $\mathbf{v}_{core}$ be the unit vector pointing toward the Galactic Center (Sagittarius $A^*$):
$$\mathbf{v}_{core} \approx (-0.82, -0.48, -0.31)$$

For any unit view vector $\mathbf{v} = \frac{\mathbf{p}}{\|\mathbf{p}\|}$ on the celestial sphere:
1. **Galactic Latitude ($b$):**
   $$\sin b = \mathbf{v} \cdot \mathbf{n}_{gal}$$
2. **Galactic Longitude ($l$):**
   Angular distance around the galactic equator from $\mathbf{v}_{core}$.

## 2. Mathematical Luminance & Dust Rift Formulations

### A. Galactic Disc Luminance Profile
The luminous disc of billions of unresolved stars follows a Gaussian thickness profile:
$$I_{disc}(b) = I_0 \cdot \exp\left(-\frac{\sin^2 b}{2\sigma_b^2}\right)$$
where $\sigma_b \approx 0.16$ ($\sim 9.2^\circ$).

### B. Galactic Bulge (Sagittarius $A^*$)
The central galactic bulge produces a soft, elliptical glow:
$$I_{bulge}(\mathbf{v}) = I_{core} \cdot \exp\left(-\frac{\|\mathbf{v} - \mathbf{v}_{core}\|^2}{2\sigma_{core}^2}\right)$$
where $\sigma_{core} \approx 0.28$.

### C. The Great Rift (Molecular Dust Extinction)
Interstellar dust clouds absorb starlight along the galactic equator. This is modeled via fractal fractional Brownian motion (fBm) noise:
$$\text{dust}(\mathbf{v}) = \text{clamp}\left(\text{fBm}(\mathbf{v} \times 3.8) \times 1.4 - 0.2, 0.0, 1.0\right)$$
$$I_{final} = \left(I_{disc} + I_{bulge}\right) \times \left(1.0 - k_{dust} \cdot \text{dust}(\mathbf{v})\right)$$
where $k_{dust} \approx 0.72$.

## 3. Strict Aesthetic Constraints (Zero Clutter Rule)

1. **Scotopic Low-Contrast Luminance:**
   - Maximum visual opacity must **NEVER** exceed $0.14$ (14%).
   - The Milky Way must remain a whisper in the dark void—noticeable only when looking into deep space, never competing with planets or the Sun.
2. **Monochrome / Silver-Charcoal Palette:**
   - Base void: Pure deep cosmic black `#050507`.
   - Galactic band: Delicate moonlight silver `#D4D8E2` with subtle cool tint.
   - Absolutely **NO** neon purples, magenta, or green nebula clouds.
3. **Infinite Depth (`renderOrder: -999`, `depthWrite: false`):**
   - The celestial sphere has radius $R \approx 140\text{ units}$.
   - It is drawn strictly behind all planets, orbits, and asteroid belts.
   - It never intersects any geometry.

## 4. WebGL GPU Architecture (0 GC Rule)

- Use a single inverted sphere `THREE.SphereGeometry(140, 64, 48)` with `side: THREE.BackSide`.
- Procedural GLSL vertex and fragment shaders evaluate the galactic coordinates analytically per fragment.
- Uniforms: `uTime`, `uBass`, `uMid`, `uCoreIntensity`.
- Zero dynamic allocations inside `useFrame`.
- Framerate locked at 120 FPS.
