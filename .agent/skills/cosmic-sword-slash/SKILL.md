---
name: cosmic-sword-slash
description: Mathematical formulation and 120FPS GPU WebGL implementation of a cinematic cosmic spacetime sword slash (dimensional rift) with chromatic optical dispersion and 0 GC allocations.
---

# Cosmic Sword Slash // Spacetime Dimensional Fissure

This skill provides astrophysics, geometry, and GLSL chromatic dispersion instructions for rendering a cinematic "sword slash tearing open the cosmos" in 3D WebGL (Three.js / React Three Fiber) following high-end film direction (*Interstellar*, *Dune*, *Bleach*).

## 1. Aesthetic Concept & Geometry

A dimensional rift appearing as if space was cleanly sliced open by a celestial blade:
- **Curved Katana Arc:** The slash follows a graceful 3D Cubic Bézier arc hugging the celestial sphere at radius $R = 90.0\text{ AU}$ with inward-facing surface normals:
  - $P_0$ (Left tip): $\text{Azimuth} = 252^\circ$, $\text{Altitude} = -1.2^\circ$.
  - $P_1$ (Curvature): $\text{Azimuth} = 221^\circ$, $\text{Altitude} = +1.0^\circ$ (subtle Katana sori curve).
  - $P_2$ (Curvature): $\text{Azimuth} = 195^\circ$, $\text{Altitude} = -7.5^\circ$.
  - $P_3$ (Right tip): $\text{Azimuth} = 178^\circ$, $\text{Altitude} = -12.8^\circ$.
- **Needle-Sharp Stroke Taper:** Width peaks at mid-stroke ($MAX\_WIDTH = 4.4\text{ units}$) and tapers to needle-sharp points at both ends:
  $$W(u) = W_{max} \cdot \sin(\pi u)^{1.35}$$
- **Placement & Non-Clutter:** Sits cleanly in the upper celestial void behind the planetary orbits, never crowding the Sun ($Sol$), Earth-Venus Harmonograph, or planetary disks.

## 2. Cinematic Chromatic Dispersion (Non-Gaudy Color Science)

To achieve rich, vibrant color that is **never cheesy, gaudy, or neon**:
1. **Incandescent Starlight Core:** Ultra-thin center fracture ($d < 0.038$) in pure white platinum starlight (`#FFFDFB` / `vec3(1.0, 0.99, 0.98)`).
2. **Electric Cerulean Cyan Halo:** Ionized energetic dispersion ($d < 0.20$) in deep electric cyan (`#0FA5F5` / `vec3(0.06, 0.64, 0.95)`).
3. **Royal Indigo / Cosmic Violet Aura:** Deep space aura ($d < 0.58$) in royal indigo-violet (`#3D24BD` / `vec3(0.24, 0.14, 0.74)`).
4. **Asymmetric Solar Amber Shear:** Trailing blade lip starlight Doppler shear ($d \approx 0.16$) in warm amber (`#E89028` / `vec3(0.92, 0.56, 0.16)`).
5. **Exponential Gaussian Decay:**
   $$I(d) = \exp\left(-\frac{d^2}{2\sigma_d^2}\right)$$
   Decays mathematically into the deep background void `#050507`.

## 3. Audio & Energy Dynamics

- **Bass Pulse:** Sub-bass kicks propel an incandescent pulse wave traveling along the rift length ($v_{pulse} \approx 0.15 \cdot \text{time}$).
- **Micro-Scintillation:** High frequencies introduce subtle plasma scintillation along the razor edge ($f \approx 90.0$).
- **Drop / Climax Surge:** When `isClimax = true`, electric cyan intensity expands outward by $+40\%$.

## 4. WebGL GPU Architecture (0 GC Rule)

- Static GPU BufferGeometry (128 longitudinal segments $\times$ 2 lateral edges = 258 vertices, 768 indices).
- Inward-facing binormal in the tangent plane of the sphere:
  $$\mathbf{B} = \text{normalize}(\mathbf{N}_{sphere} \times \mathbf{T}_{curve})$$
- `renderOrder: -990`, `depthWrite: false`, `depthTest: true`, `blending: THREE.AdditiveBlending`.
- Static geometry: 0 CPU buffer uploads per frame, 0 GC allocation in `useFrame`, locked 120 FPS.
