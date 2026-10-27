---
name: kuiper-radar-boundary
description: Deep space Kuiper belt planetesimal distribution and NASA DSN astronomical radar rangefinder wave propagation at locked 120FPS with 0 GC allocations.
---

# Kuiper Radar Boundary // Deep Space Telemetry

This skill specifies physical ephemeris boundaries and real-time GPU radar rangefinder telemetry for the outer Solar System ($R = 12.5\text{ AU}$ to $22.0\text{ AU}$).

## 1. Kuiper Belt Planetesimal Mechanics

The Edgeworth-Kuiper Belt extends beyond Neptune's orbit ($a = 30\text{ AU} \to \text{visual } 12.4$).
- **Spatial Distribution:** Semi-major axis $a \in [13.2, 18.5]\text{ units}$.
- **Eccentricity & Inclination:** Classical KBOs have low eccentricity ($e \in [0.03, 0.12]$) and Rayleigh inclination ($i \in [-0.14, +0.14]\text{ rad}$).
- **Rendering:** Single `THREE.Points` object with $M = 400$ microscopic vertices (`size: 0.03`).
- **Spectral Scintillation:** Planetesimal brightness softly scintillates with audio high frequencies (treble / hi-hats $\ge 4000\text{ Hz}$).

## 2. Astronomical Radar Wavefront Propagation (NASA DSN Telemetry)

Deep Space Network (DSN) astronomical radar rangefinder pings expand outward in concentric circular reticles:
- **Wavefront Propagation:**
  $$R_w(t) = R_{start} + v_{radar} \cdot (t - t_{ping})$$
  Where $R_{start} = 12.4$ (Neptune orbital AU boundary) and expands outward to $R_{max} = 22.0$.
- **Luminance Quadratic Fade:**
  $$\alpha(R_w) = \alpha_0 \cdot \left(1.0 - \frac{R_w - R_{start}}{R_{max} - R_{start}}\right)^2$$
- **Telemetry Reticle Structure:**
  - Fine dashed polar segments (64-128 vertices).
  - Astronomical distance markers (e.g. 40 AU, 50 AU reference circles).
  - Sub-bass impulse coupling: each kick beat triggers an expanding coherent radar ping.

## 3. Performance & Aesthetics (Ryoji Ikeda Standard)

- 100% pre-allocated `Float32Array` buffers.
- Additive blending (`THREE.AdditiveBlending`) on `#050507` background.
- Zero polygonal fills or cloudy fog sheets.
- Locked 120 FPS performance with zero Garbage Collection spikes.
