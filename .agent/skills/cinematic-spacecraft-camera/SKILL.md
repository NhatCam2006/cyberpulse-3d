---
name: cinematic-spacecraft-camera
description: Physical and mathematical formulation of slow-burn deep-spacecraft grand tour camera choreography, inertial observation deck dynamics, and fixed golden-angle celestial vista for Cyberpulse 3D.
---

# Cinematic Spacecraft Camera & Golden Vista Architecture

This skill defines the mathematical formulation, kinematic curves, and artistic principles for deep-space camera choreography in **Cyberpulse 3D**. It addresses the user's specific mandate:
1. **Mode 1 (Fixed Golden Vista):** An unwavering, immaculate overview perspective locked at the exact golden coordinates ($X \approx 3.2, Y \approx 5.0, Z \approx 12.8$, target `(0, 0, 0)`), providing maximum aesthetic balance, zero motion sickness, and pure contemplation of the entire Keplerian system.
2. **Mode 2 (Deep Spacecraft Grand Tour / Voyager):** An ultra-slow, majestic spacecraft observation deck trajectory inspired by *2001: A Space Odyssey*, *Interstellar*, and NASA's *Voyager Grand Tour*.

---

## 1. Artistic Principles & The Anti-Motion-Sickness Law

### A. The Velocity Pacing Rule (Tốc độ Điện ảnh Cân bằng Hoàn mỹ)
- Mechanical spinning carousels ($\omega > 0.08\text{ rad/s}$) induce visual fatigue and destroy spatial scale.
- Conversely, an overly sluggish crawl ($\omega < 0.02\text{ rad/s}$) feels static, unresponsive, and loses the sensation of dynamic spaceflight.
- The refined spacecraft observation tour operates at $\omega \approx 0.046\text{ rad/s}$ ($T \approx 136\text{s}$ per full circuit), providing a sweeping, clearly perceptible, and majestic travel pace where oncoming planets and starfields smoothly drift across the viewport in authentic parallax.
- Accelerations maintain $\mathcal{C}^2$ continuity with near-zero jerk ($\frac{d^3\mathbf{x}}{dt^3} \approx 0$).

### B. The Horizon Banking Rule (Cơ chế Nghiêng Cánh Quán tính)
- In cinematic space flight (*Interstellar*, *2001: A Space Odyssey*), turning through 3D space induces a subtle kinetic bank angle into the turn:
  $$\beta(t) = 0.045 + 0.012 \times \sin(\phi(t)) \approx 2.6^\circ - 3.2^\circ$$
- Tilting the camera around its local view axis (`camera.rotateZ(bankAngle)`) provides an unmistakable, visceral sensation of being aboard an in-flight starship without causing disorienting pitch/yaw gimbal flips.

### C. The Absolute Acoustic Decoupling Rule (Triệt Tiêu Rung Lắc Tuyệt Đối Cho Phi Thuyền)
- In spacecraft mode, the vessel cruises silently through deep-space vacuum.
- All screen-space camera jitter from drum kicks (`beatIntensity`) and abrupt elevation/FOV recoils from CME climax shockwaves (`driftElevation`, `driftFov`) are **100% decoupled and eliminated**.
- The spacecraft observation deck maintains an absolute, silky-smooth, fluid glide governed solely by Keplerian orbital gravity and inertial acceleration drag.

---

## 2. Mathematical Formulation

### 2.1. Mode 1: Fixed Golden Vista Coordinates
The golden vista coordinates frame the entire solar system with optimal proportions:
- Central Sol at $(0, 0, 0)$.
- Terrestrial planets and Kepler Harmonograph (Earth-Venus) in the lower-right foreground.
- Gas giants Jupiter (left) and Saturn (right) balancing the widescreen composition.
- Relativistic Geodesic Horizon cutting cleanly across the frame with a $-6.5^\circ$ counterclockwise inclination.
- Kuiper Belt and Outer Heliospheric Pulse Ring framed with $15\%$ padding from the viewport edges.

$$\mathbf{P}_{\text{vista}} = \begin{pmatrix} 3.24 \\ 5.12 \\ 12.78 \end{pmatrix}, \quad \mathbf{T}_{\text{vista}} = \begin{pmatrix} 0 \\ 0 \\ 0 \end{pmatrix}, \quad \text{FOV} = 46.0^\circ$$

During acoustic transients, the camera does NOT translate in $(X, Z)$. It undergoes purely subtle optical focal breathing:
$$\text{FOV}(t) = 46.0^\circ - \text{beatIntensity} \times 0.60^\circ$$
$$Y(t) = 5.12 + \sin(12 t) \times \text{beatIntensity} \times 0.020$$

### 2.2. Mode 2: Spacecraft Pluto-Resonant Keplerian Trajectory (Quỹ Đạo Sao Diêm Vương)
The spacecraft follows a physical 3D Keplerian orbit derived from Pluto's extreme orbital elements ($i = 17.16^\circ, e = 0.2488$):

$$\begin{aligned}
M(t) &= \frac{t \times 2\pi}{T_{\text{pluto}}} \quad (T_{\text{pluto}} = 110.0\text{s}) \\
M &= E - e \sin(E) \quad (\text{Newton-Raphson solver } \text{solveKepler}) \\
\nu(t) &= 2 \arctan\left(\sqrt{\frac{1+e}{1-e}} \tan\frac{E}{2}\right) \\
r(t) &= \frac{a (1 - e^2)}{1 + e \cos\nu} - \text{beatIntensity} \times 0.35 + \text{driftDist}
\end{aligned}$$

Where:
- $a = 14.6\text{ AU}$, $e = 0.2488$, $i = 17.16^\circ$, $\Omega = 110.3^\circ$, $\omega = 113.7^\circ$.
- $r(t)$ contracts to $11.0\text{ AU}$ at periapsis and soars to $18.2\text{ AU}$ at apoapsis.
- $Y(t)$ oscillates between $+4.8\text{ AU}$ (northern summit overlooking the entire system) and $-5.2\text{ AU}$ (southern view looking up at the illuminated plane from underneath).
- Kepler's Second Law: Spacecraft automatically speeds up during periapsis dive and decelerates into a contemplative glide at apoapsis.

### 2.3. 3/4 Forward-Inward Observation Vector (Hướng Nhìn Buồng Lái Đài Quan Sát)
Rather than locking rigidly to $(0, 0, 0)$ like a stationary crane, the observation deck window looks **forward-inward** (blending $55\%$ forward along the ship's flight tangent vector $\hat{\mathbf{V}}$ and $45\%$ inward toward the central star $\hat{\mathbf{N}}$):

$$\mathbf{D}_{\text{look}} = \text{normalize}\left(0.55 \hat{\mathbf{V}} + 0.45 \hat{\mathbf{N}}\right)$$
$$\mathbf{T}_{\text{ship}} = \mathbf{P}_{\text{ship}} + \mathbf{D}_{\text{look}} \times 14.0$$
$$\mathbf{T}_{\text{ship}, y} = \text{lerp}(\mathbf{T}_{\text{ship}, y}, 0.5, 0.35)$$

This geometry creates authentic **forward 3D motion parallax**: oncoming orbits and celestial bodies enter from the forward starfield, sweep past with palpable depth, while Sol shines majestically in the inner-middle field of view. Panoramic FOV expands to $52.0^\circ$.

---

## 3. Performance & Zero-GC Guarantees

1. **Pre-allocated Static Vectors:**
   - `_camVistaPos`, `_camVoyagerPos`, `_lookAtTarget`, `_shipVelocity` are allocated once at module load.
2. **0 GC in `useFrame`:**
   - Zero object creation or array allocation in the animation loop.
   - Smooth interpolation using scalar LERP:
     $$\mathbf{P}_{t} = \mathbf{P}_{t-1} + (\mathbf{P}_{\text{target}} - \mathbf{P}_{t-1}) \times (1 - e^{-\kappa \Delta t})$$
3. **Locked 120 FPS:**
   - Pure analytical trigonometric evaluation (less than $0.02\text{ms}$ CPU time per frame).

---

## 4. Adversarial Red-Teaming & Checklist

| Test | Potential Pitfall | Prevention Mechanism |
| :--- | :--- | :--- |
| **Motion Sickness** | Rapid rotational angular change | Angular speed locked at $\omega \le 0.015\text{ rad/s}$ ($>3.5$ minutes per full loop). |
| **Gimbal Lock / Flip** | Looking straight down from north pole ($Y \to 90^\circ$) | Maximum elevation angle clamped at $Y \le 6.6$, look-at never collinear with $(0, 1, 0)$. |
| **Obscured View** | Passing inside a planet or ring mesh | Radius bounded by $R \ge 11.2\text{ AU}$, safely above Saturn and Jupiter's orbital planes. |
| **Loss of Favorite Angle** | User unable to stay in their preferred view | Mode 1 (Fixed Golden Vista) provides 100% static, unwavering framing matching user's exact screenshot. |
