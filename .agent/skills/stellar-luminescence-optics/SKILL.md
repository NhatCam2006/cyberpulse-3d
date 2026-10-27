---
name: stellar-luminescence-optics
description: Mathematical formulation and GLSL shader architecture for astrophysical stellar luminescence, bounded dual-tier HDR luminance envelopes, non-jittery convective photospheres, and anti-glare coronal radiance for Cyberpulse 3D.
---

# Stellar Luminescence Optics // Photosphere Radiation & Anti-Glare Architecture

This skill governs the physical modeling, optical radiation transfer, and real-time shader implementation of the central star (**Sol**) in Cyberpulse 3D. It provides the definitive mathematical and perceptual solution to eliminate:
1. **The "Blinking Light Bulb" Failure Mode:** Wild swings between blinding nuclear glare ("sáng khủng khiếp") and muddy grey extinction ("như tắt đèn").
2. **The "Internal Jitter / Wobble" Failure Mode:** Texture jitter, swimming phase jumps, and alias flutter inside the solar sphere ("cái ở trong lắc lắc").
3. **The "Additive Fog" Failure Mode:** Dense white billboard boxes that wash out surrounding planetary orbits.

---

## 1. Root Cause Analysis of Previous Lighting Failures

### A. Why Sol Swung Between "Sáng khủng khiếp" and "Như tắt đèn"
In 3D engines using **ACES Filmic Tone Mapping**, luminance $L$ does not map linearly to screen pixel intensity $C_{out}$:

$$\text{ACES}(L) = \frac{L(a L + b)}{L(c L + d) + e}$$

* **The Shoulder (Blinding Glare):** When $L > 1.2$, ACES compresses all values into asymptotic pure white ($\#ffffff$). If audio flaring multiplies luminance by $(1.0 + \text{flare})$ where $\text{flare} \approx 1.5 - 2.5$, peak radiance hits $3.5 - 5.0$, completely blowing out the entire screen into blinding white glare.
* **The Toe (Extinction / "Tắt đèn"):** When $L < 0.45$, ACES compresses the response curve steeply towards black. If baseline photosphere emission is set too low ($0.55$) and attenuated by limb darkening ($0.38$), the quiescent luminance drops to $0.20 - 0.35$. In ACES space, this collapses into a muddy, dead, unlit grey disc, looking like the star was suddenly turned off!

### B. Why the Internal Texture Shook / Wobbled ("Lắc lắc ở trong")
The noise coordinates were written as:
$$\text{coord} = \mathbf{p} + \vec{v} \cdot (uTime \times plasmaSpeed)$$
where $plasmaSpeed = f(uMid, uBass)$.
Because $plasmaSpeed$ varied discontinuously with every audio frame, multiplying $uTime$ ($t \approx 100\text{s}$) by a fluctuating factor caused **massive phase velocity jumps** ($\Delta \phi \approx 10 - 20\text{ rad/s}$ in a single frame!). This caused the internal noise lattice to violently snap back and forth, producing the illusion that the core was shaking or shivering.

---

## 2. Mathematical Formulations for True Stellar Luminescence

### A. The Bounded Dual-Tier Luminance Envelope (Non-Negotiable)
A star is a self-gravitating thermonuclear reactor in hydrostatic equilibrium. Its core fusion output never drops to zero, nor does it instantaneously double its mass.
Luminance must be strictly bounded within a **calibrated perceptual window**:

$$L_{\text{photosphere}} \in [L_{\text{floor}}, L_{\text{ceiling}}] = [0.84, 1.06]$$

* **Quiescent Floor ($L_{\text{floor}} = 0.84$):** During silence, quiet ballad passages, and piano intros, Sol remains a warm, incandescent, radiant starlight sphere. It **never dims below 0.84**, preventing the ACES toe from extinguishing it.
* **Transient Ceiling ($L_{\text{ceiling}} = 1.06$):** At peak kick transient or melodic climax, luminance increases by at most **$+15\%$ to $+22\%$**. It never exceeds $1.08$, preventing the ACES shoulder from blowing out into blinding glare.

$$\text{flareMultiplier} = 1.0 + 0.12 \cdot \text{pow}(uBeatIntensity, 1.3) + 0.08 \cdot uMid$$
$$L_{\text{final}} = \text{clamp}(L_{\text{base}} \cdot \text{flareMultiplier}, 0.82, 1.06)$$

---

### B. Stable, Continuous Convective Granulation (Zero Jitter)
To eliminate texture jitter and alias wobble:
1. **Separation of Space and Time:** Convection drift velocity must be driven by a smooth, monotonic phase accumulator $\tau(t)$ integrated over time, completely decoupled from instantaneous audio amplitude:
   $$\tau(t) = t \cdot 0.025 \quad (\text{fixed, serene, continuous drift})$$
2. **Audio Modulation of Contrast, Not Phase:** Audio energy ($uMid, uBass$) modulates the **depth of contrast** between hot convective granules and cool intergranular lanes, NEVER the spatial coordinates:
   $$\text{contrast} = 0.18 + 0.08 \cdot uMid$$
   $$\text{granules} = \text{baseGranules}(\mathbf{p}, \tau) \cdot \text{contrast}$$
3. **NASA Eddington-Barbier Limb Darkening:**
   $$I(\mu) = 1.0 - u(1.0 - \mu) - v(1.0 - \sqrt{\mu})$$
   where $\mu = \vec{N} \cdot \vec{V}$, $u = 0.42$, $v = 0.18$.
   This yields a natural limb factor $I(0) \approx 0.40$ at the grazing rim, giving Sol a spherical volume without blackening the edges into mud.

---

### C. Silky Starlight Corona (Translucent, Zero White Fog)
The Coronal Atmosphere must look like delicate optical diffraction through a camera lens, not a solid glowing polygon:
1. **Strictly Clamped Alpha Peak:**
   $$A_{\text{corona}} \le 0.28$$
2. **Inner Cutout Mask:**
   The billboard corona must cleanly feather out from the limb radius $R_{limb} = 0.62$ with zero overlap over the sphere's interior disc:
   $$\text{innerCut} = \text{smoothstep}(0.22, 0.30, r_{uv})$$
3. **Hairline Optical Diffraction Spikes:**
   Cross spikes ($4\text{-point cardinal} + 45^\circ\text{ secondary}$) must have an ultra-thin aperture width:
   $$w_{spike} = 0.0030$$
   $$\text{spikeH} = \frac{w}{|p_y| + w} \cdot \text{smoothstep}(1.0, 0.02, |p_x| / \text{reach})$$

---

### D. Heliocentric Irradiance Invariance
The central `pointLight` illuminates Mercury through Neptune. Its intensity must follow a stable, majestic baseline:
$$I_{point} = 3.4 + 0.6 \cdot \text{punch}$$
- Minimum: $3.4$ (deep space day-side illumination).
- Maximum: $4.0$ (gentle $+17\%$ audio glint).
- Outer planets NEVER plunge into darkness.

---

## 3. Production GLSL Reference Implementation

```glsl
// ============================================================================
// STABLE, ANTI-GLARE STELLAR PHOTOSPHERE SHADER (0 JITTER, BOUNDED HDR)
// ============================================================================
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uBeatIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;

// High-speed simplex noise helper
float snoise(vec3 v);

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewPosition);
  float mu = max(0.0, dot(N, V));

  // 1. Eddington-Barbier Limb Darkening (NASA Solar Physics)
  float u = 0.42;
  float v = 0.18;
  float limb = 1.0 - u * (1.0 - mu) - v * (1.0 - sqrt(mu));

  // 2. Monotonic Phase Time (0 Jitter, Independent of Audio Amplitude)
  vec3 p = normalize(vPosition);
  float monoTime = uTime * 0.025; // Continuous smooth drift

  // 3. Convection Granules (Audio modulates contrast, NOT coordinate phase)
  float granuleNoise = snoise(p * 14.0 + vec3(monoTime, monoTime * 0.5, 0.0));
  float audioContrast = 0.12 + uMid * 0.06;
  float granules = granuleNoise * audioContrast;

  // 4. Photosphere Base Radiance (Strictly calibrated floor)
  float baseRadiance = 0.88 + granules;

  // 5. Chromospheric Grazing Limb Halo (Extreme edge mu < 0.10)
  float edge = 1.0 - mu;
  float spiculeRim = pow(edge, 6.0) * 0.25;

  // 6. Bounded Audio Glint (Strictly within +15% to +20% maximum)
  float audioPulse = pow(uBeatIntensity, 1.30) * 0.14 + (uMid * 0.08 + uBass * 0.04);
  float finalLuminance = (baseRadiance * limb + spiculeRim) * (1.0 + audioPulse);

  // Clamp to guarantee zero ACES blowout and zero ACES toe collapse
  finalLuminance = clamp(finalLuminance, 0.82, 1.08);

  gl_FragColor = vec4(vec3(finalLuminance), 1.0);
}
```

---

## 4. Architectural Verification Rules

1. **The 3-Second Pause Rule:** When audio stops or enters a ballad pause, Sol must look like a luminous, dignified, calm star. If it looks grey, dull, or unlit, $L_{floor}$ is too low.
2. **The Full-Volume Kick Rule:** When a heavy 128 BPM kick hits, Sol must glint with starlight authority without flashing or causing screen blowout. If pixels turn into chalky solid white or the eye wants to look away, $L_{ceiling}$ is too high.
3. **The Texture Stillness Rule:** When zooming in on Sol, the surface features must gently, smoothly rotate with the star. If any dark spots, dots, or veins flicker, jump, or jitter, coordinate phase is being contaminated by audio.
4. **Zero GC & 120 FPS Guarantee:** All noise functions and optical calculations must execute purely on the GPU in single-pass fragment shaders.
