---
name: interstellar-hyperbolic-bolide
description: Physical Newton-Kepler hyperbolic gravitational slingshot, non-coplanar trajectory, and fading ion-tail bolide streaks at locked 60FPS.
---

# Interstellar Hyperbolic Bolide & Transient Meteor Dynamics

## 1. Physical Principles of Interstellar Slingshots
An interstellar interloper (e.g., 1I/'Oumuamua, 2I/Borisov) approaches the Sun from deep interstellar space with hyperbolic excess velocity $v_\infty > 0$ and eccentricity $e > 1.0$:
- **Solar Gravitational Constant:** $\mu = GM_\odot \approx 14.5$ (normalized Three.js units).
- **Newtonian Gravitational Acceleration:**
  $$\mathbf{a}(t) = -\frac{\mu}{\|\mathbf{r}(t)\|^3} \mathbf{r}(t)$$
- **Trajectory Integration (Velocity Verlet / Symplectic Euler):**
  $$\mathbf{v}(t + \Delta t) = \mathbf{v}(t) + \mathbf{a}(t) \cdot \Delta t$$
  $$\mathbf{r}(t + \Delta t) = \mathbf{r}(t) + \mathbf{v}(t) \cdot \Delta t$$
- **Impact Parameter & Perihelion:**
  Spawn distance $R_{\text{spawn}} \approx 20.0 - 26.0$ with steep out-of-plane inclination ($i \approx 45^\circ - 70^\circ$).
  Impact parameter $b \approx 2.2 - 4.5$ ensures the bolide grazes outside the inner solar system, accelerating near Sol, and deflecting smoothly outward.

## 2. Visual Architecture & Trail Fading
- **Trail Buffer:** 48 historical positions stored in a circular ring buffer (`Float32Array(48 * 3)`).
- **Linear Opacity & Color Gradient:**
  - Vertex 0 (Bolide Head): Alpha $1.0$, blinding pure white / cyan core.
  - Vertex 47 (Trail Tail): Alpha $0.0$, seamlessly dissolving into the deep abyss void `#050507`.
- **Zero Memory Allocation:** Single pre-allocated `THREE.Line` geometry; positions and vertex colors updated in-place per frame.
- **Lifecycle State Machine:**
  - `IDLE`: Resting in cooldown ($25 - 45\text{s}$) or awaiting musical climax (`isClimax`).
  - `ACTIVE`: Flying across the solar system for $1.4 - 1.8\text{s}$ with hyperbolic acceleration.
  - `FADING`: Trail dissipates over $0.4\text{s}$ after exiting the system.
  - `COOLDOWN`: Timer reset, ensuring 95% of viewing time maintains pristine celestial purity.
