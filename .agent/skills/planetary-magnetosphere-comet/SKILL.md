---
name: planetary-magnetosphere-comet
description: Keplerian cometary mechanics with anti-solar radiation pressure tail, and analytical planetary dipole magnetospheres (L-shell equation) with solar wind bow shock compression at locked 60FPS.
---

# Planetary Magnetospheres & Cometary Mechanics

## 1. Cometary Keplerian Dynamics & Anti-Solar Tail
- **Orbit:** Highly eccentric Keplerian ellipse ($e \in [0.80, 0.92]$, $i \approx 17.5^\circ$, $a \approx 4.8 \text{ AU}$).
- **Nucleus & Coma:** Small icy core with sublimating gas coma expanding as $r \to r_{\text{perihelion}}$.
- **Anti-Solar Vector:**
  $$\hat{u}_{\text{tail}} = \frac{\vec{P}_{\text{comet}} - \vec{P}_{\text{Sun}}}{\|\vec{P}_{\text{comet}} - \vec{P}_{\text{Sun}}\|}$$
- **Tail Particle Kinematics:**
  $N$ particles trailing along $\hat{u}_{\text{tail}}$ with length scaling as $L(r) = L_0 \cdot (r_{\text{peri}} / r)^{1.4}$.
  Audio reactive on high frequencies (`high` $\in [6\text{kHz}, 17\text{kHz}]$: hi-hats, cymbals, crisp percussive clicks).

## 2. Planetary Dipole Magnetosphere (L-Shell Field Lines)
- **Dipole Equation:**
  $$r(\lambda) = L \cdot R_p \cdot \cos^2(\lambda)$$
  where $\lambda \in [-\pi/2, +\pi/2]$ is the magnetic latitude.
- **Solar Wind Asymmetry (Bow Shock & Magnetotail):**
  Sunward vector $\hat{s} = (\vec{P}_{\text{Sun}} - \vec{P}_{\text{planet}}) / \|\vec{P}_{\text{Sun}} - \vec{P}_{\text{planet}}\|$.
  Day-side compression: factor $1.0 - 0.25 \cdot \max(0, \hat{s} \cdot \hat{r})$.
  Night-side tail elongation: factor $1.0 + 0.65 \cdot \max(0, -\hat{s} \cdot \hat{r})$.
- **Audio-Reactive VLF Chorus Modulation:**
  Field lines oscillate with audio `mid` and `high` frequencies simulating natural magnetospheric whistler modes.
