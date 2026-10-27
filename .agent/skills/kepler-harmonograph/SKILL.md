---
name: kepler-harmonograph
description: Mathematical formulation and 120FPS GPU implementation of Keplerian orbital resonance harmonographs (Music of the Spheres) with ephemeral chord envelopes and zero GC allocation.
---

# Kepler Harmonograph // Music of the Spheres

This skill provides physics, geometry, and rendering instructions for visualizing planetary orbital resonance harmonographs in 3D WebGL (Three.js / React Three Fiber) following Swiss Brutalist and Ryoji Ikeda vector aesthetics.

## 1. Celestial Resonance Mechanics

In Johannes Kepler's *Harmonices Mundi* (1619), planetary orbital frequencies form musical intervals. In celestial mechanics, Mean Motion Resonances (MMR) create geometric chord envelopes:
- **Earth - Venus (8:13 MMR):** Over 8 Earth years (13 Venusian years), the heliocentric line segment connecting Earth and Venus traces a 5-lobed rose curve (Pentagram of Venus).
- **Jupiter - Saturn (5:2 MMR):** The "Great Inequality" generates triangular resonance envelopes.

### Mathematical Formulation
Let $\mathbf{r}_A(t)$ and $\mathbf{r}_B(t)$ be the heliocentric 3D positions of two resonant planets at time $t$:
$$\mathbf{r}_A(t) = (x_A(t), y_A(t), z_A(t))$$
$$\mathbf{r}_B(t) = (x_B(t), y_B(t), z_B(t))$$

A chord connecting planet $A$ and planet $B$ is a line segment in $\mathbb{R}^3$:
$$\mathbf{L}(s, t) = (1 - s)\mathbf{r}_A(t) + s\mathbf{r}_B(t), \quad s \in [0, 1]$$

To maintain a pristine vector aesthetic without wireframe spaghetti:
- Maintain an ephemeral ring buffer of $N$ chords ($N = 36$ to $48$).
- Chords are sampled every $\Delta \theta$ orbital step.
- Each chord $k \in [0, N-1]$ has a normalized age $u_k = k / (N - 1) \in [0, 1]$.
- Opacity tapers quadratically: $\alpha_k = \alpha_0 \cdot (1 - u_k)^2$.
- Maximum line width is 1px vector line using `THREE.LineSegments`.

## 2. Audio Harmonic Coupling

- **Mid/Treble Audio Modulation:** Chord brightness pulses with musical harmony.
- **Beat Intensity:** Enhances leading chord brilliance while trailing chords maintain subtle ghosting ($\alpha \approx 0.12 - 0.22$).
- **Color Palettes:**
  - *Monochrome:* Pure incandescent white `#FFFFFF` fading to deep silver `#2A2A30`.
  - *Spectral:* Electric Cyan `#00F0FF` for Venus to Solar Gold `#FFD700` for Earth.

## 3. WebGL Buffer Architecture (0 GC Rule)

- Use a pre-allocated `Float32Array(N * 2 * 3)` for coordinates (`THREE.LineSegments`).
- Use a pre-allocated `Float32Array(N * 2 * 3)` for vertex colors.
- Call `geometry.attributes.position.needsUpdate = true` and `color.needsUpdate = true`.
- Zero dynamic object allocation inside `useFrame`.
- Frustum culling disabled (`lineSegments.frustumCulled = false`).
