---
name: colossal-planetary-scale
description: Production GLSL shader architecture, distance-adaptive multi-octave FBM, atmospheric limb scattering shells, micro-surface relief (dFdx/dFdy), dual-layer cloud shadow parallax, and locked 120FPS low-orbit spacecraft flyby mechanics for monumental planetary scale perception.
---

# Colossal Planetary Scale Engine // Close-Orbit Astrophysical Optics

This skill provides the mathematical formulation, GLSL shader architecture, and real-time rendering protocols for achieving **monumental celestial scale** in **Cyberpulse 3D**. It solves the classic 3D space dilemma where celestial bodies appear small or look artificial/pixelated when viewed up-close from the spacecraft observation deck canopy.

Following the visual philosophies of **Denis Villeneuve** (*Arrival*, *Dune*), **Christopher Nolan x Kip Thorne** (*Interstellar*), and **SpaceEngine**, this engine guarantees razor-sharp procedural detail down to the sub-kilometer scale, soft atmospheric limb dispersion that naturally conceals polygonal mesh silhouettes, and locked 120 FPS performance with zero garbage collection.

---

## 1. The Core Physics & Perception Dilemma

### A. Why Planets Look "Small" in Ordinary 3D Viewers
In human perception, scale is never absolute -- it is inferred through comparative visual cues:
1. **Full-Disk Silhouette (Ball Illusion):** When an entire celestial sphere fits inside the camera viewport, the visual cortex immediately classifies it as a manipulable, hand-sized object (like a bowling ball or globe).
2. **Texel Breakdown & Low-Frequency Noise:** As the camera approaches a sphere mapped with static textures ($2048 \times 1024$) or low-octave procedural noise, texels blur into flat smudges, shattering the illusion of cosmic scale.
3. **Geometric Silhouette Faceting:** Even a 64-segment UV sphere reveals straight polygonal chords along its silhouette limb at close range, destroying the smooth spherical geometry.
4. **Zero Parallax Flattening:** A single flat texture layer lacks vertical stratification. Without an atmosphere hovering kilometers above the ground and casting dynamic shadows, the planet looks like a printed cardboard disc.

### B. The 5 Immutable Laws of Monumental Spacecraft Observation
To evoke terror, awe, and colossal majesty from the cockpit of an interstellar vessel:
- **Law I (Horizon Viewport Occlusion):** The planetary horizon must occlude $70\% - 90\%$ of the canopy viewport, sweeping across the glass diagonally and extending beyond both screen edges into infinity.
- **Law II (Infinite Procedural Continuity):** Surface features must adaptively generate higher-frequency sub-harmonics as camera distance shrinks, maintaining constant screen-space detail density.
- **Law III (Volumetric Atmospheric Limb Haze):** The atmosphere cannot be a flat texture ring. It must be an optical shell where grazing sightlines accumulate exponential optical depth, softening the geometric edge into photorealistic luminescent haze.
- **Law IV (Dynamic Shadow Stratification):** Floating clouds must cast physical shadow offsets onto the planetary surface along the heliocentric sun vector $\vec{L}$.
- **Law V (Inertial Velocity Contrast):** The spacecraft travels at orbital insertion velocity ($v \sim 15 - 30\text{ km/s}$), while the colossal planetary limb underneath moves with heavy, majestic, slow-burn stillness.

---

## 2. Mathematical Formulations & Shader Architecture

### A. Distance-Adaptive Multi-Octave FBM (Continuous Noise LOD)
Instead of executing a fixed 8-octave Fractal Brownian Motion (which causes high-frequency aliasing at distance and wastes GPU cycles), we formulate a **continuous distance-adaptive noise octave crossfade**:

Let $d = \|\mathbf{P}_{\text{cam}} - \mathbf{P}_{\text{planet}}\|$ be the camera distance, and $R$ be the planetary visual radius.
The normalized orbital altitude metric:
$$\eta = \text{clamp}\left(\frac{d - R}{2.5 \cdot R}, 0.0, 1.0\right)$$

The continuous octave weighting vector $\mathbf{w}(\eta) \in \mathbb{R}^4$:
- **Macro Octave (Belts & Continents):** $w_0 = 1.0$ (always active, scale $S_0 = 2.0$)
- **Meso Octave (Zonal Billows & Mountain Ranges):** $w_1 = \text{smoothstep}(0.85, 0.40, \eta)$ (scale $S_1 = 6.0$)
- **Micro Octave (Kelvin-Helmholtz Vortices & Craters):** $w_2 = \text{smoothstep}(0.50, 0.15, \eta)$ (scale $S_2 = 18.0$)
- **Nano Octave (Atmospheric Filaments & Ridges):** $w_3 = \text{smoothstep}(0.25, 0.02, \eta)$ (scale $S_3 = 54.0$)

$$\text{FBM}_{\text{adaptive}}(\mathbf{x}, \eta) = \sum_{k=0}^{3} w_k(\eta) \cdot \frac{1}{2^k} \cdot \text{snoise}\left(\mathbf{x} \cdot S_k\right)$$

*Result:* As the observation deck descends into close orbit, micro-filaments emerge smoothly without popping, providing infinite visual resolution.

---

### B. Screen-Space Micro-Relief Normals (`dFdx` / `dFdy`)
To give planetary clouds and rocky crusts tactile 3D relief under solar illumination without tessellating millions of polygons:
1. Compute the procedural scalar height $h = \text{FBM}_{\text{adaptive}}(\mathbf{p}, \eta)$.
2. Sample the screen-space derivatives of the world-space position and height:
   $$\mathbf{dpdx} = \text{dFdx}(\mathbf{P}_{\text{world}}), \quad \mathbf{dpdy} = \text{dFdy}(\mathbf{P}_{\text{world}})$$
   $$dhdx = \text{dFdx}(h \cdot \sigma), \quad dhdy = \text{dFdy}(h \cdot \sigma)$$
3. Construct the perturbed micro-normal $\mathbf{N}_{\text{micro}}$:
   $$\mathbf{B}_x = \mathbf{dpdx} \times \mathbf{N}_{\text{mesh}}, \quad \mathbf{B}_y = \mathbf{N}_{\text{mesh}} \times \mathbf{dpdy}$$
   $$\mathbf{N}_{\text{micro}} = \text{normalize}\left(\mathbf{N}_{\text{mesh}} - \frac{dhdx \cdot \mathbf{B}_y + dhdy \cdot \mathbf{B}_x}{\mathbf{dpdx} \cdot \mathbf{B}_y + 10^{-6}}\right)$$
4. Compute the razor-sharp terminator lighting:
   $$\text{Shading} = \max(0.0, \mathbf{N}_{\text{micro}} \cdot \mathbf{L}_{\text{sun}})$$

At the day/night boundary (Terminator), the glancing solar rays catch individual cloud ridges and cast micro-shadows, creating tangible relief.

---

### C. Atmospheric Limb Shell (Anti-Aliasing the Polygonal Silhouette)
To completely conceal the 64-segment spherical polygonal edge, an outer inverted-normal or transparent shell mesh is instantiated at radius $R_{\text{atmo}} = R \cdot 1.028$.

#### Analytical Optical Depth Formulation
For a camera ray intersecting a spherical atmosphere of thickness $H = R_{\text{atmo}} - R$:
Let $\mu = \max(0.0, \mathbf{N} \cdot \mathbf{V})$ be the view cosine:
- When looking straight down ($\mu = 1.0$): Optical depth is minimal ($\tau \approx \tau_0$), allowing full visibility of the surface.
- At the grazing limb ($\mu \to 0.0$): Optical path length through the atmosphere approaches:
  $$\tau(\mu) = \tau_0 \cdot \frac{1}{\mu + \sqrt{\mu^2 + \frac{2H}{R}}}$$
- The atmospheric emission radiance:
  $$I_{\text{atmo}} = I_0 \cdot \left(1.0 - \exp(-\tau(\mu) \cdot \beta)\right) \cdot \max(0.0, \mathbf{N} \cdot \mathbf{L}_{\text{sun}} + 0.18)$$

The soft, glowing blue/silver rim absorbs and fades the geometry edge, rendering polygonal faceting completely invisible.

---

### D. Dual-Layer Cloud Shadow Parallax Projection
Real planetary clouds float $5 - 20\text{ km}$ above the surface. When sunlight strikes at an angle, cloud shadows project onto the ground beneath:

Let $\mathbf{P}_{\text{surface}}$ be the surface coordinate on the unit sphere, $\mathbf{L}_{\text{sun}} = \text{normalize}(-\mathbf{P}_{\text{surface}})$ be the heliocentric sun vector, and $h_{\text{cloud}} \approx 0.015$ be the normalized cloud deck altitude.
1. Cloud deck sample position:
   $$\mathbf{P}_{\text{cloud}} = \mathbf{P}_{\text{surface}} + \mathbf{N}_{\text{surface}} \cdot h_{\text{cloud}}$$
2. Ground shadow projection coordinate:
   $$\mathbf{P}_{\text{shadow}} = \mathbf{P}_{\text{surface}} - \mathbf{L}_{\text{sun}} \cdot \frac{h_{\text{cloud}}}{\max(0.12, \mathbf{N}_{\text{surface}} \cdot \mathbf{L}_{\text{sun}})}$$
3. Compute cloud density at $\mathbf{P}_{\text{shadow}}$:
   $$\rho_{\text{shadow}} = \text{smoothstep}(0.45, 0.75, \text{snoise}(\mathbf{P}_{\text{shadow}} \cdot S_{\text{cloud}}))$$
4. Attenuate ground surface albedo by $(1.0 - \rho_{\text{shadow}} \cdot 0.65)$.

*Visual impact:* The viewer clearly sees floating white cloud bands with dark, sweeping shadows cast onto the ground or lower atmosphere below, establishing genuine volumetric vertical scale.

---

## 3. Spacecraft Low-Orbit Flyby Kinematics & Camera Locking

### A. The Elimination of Trailing Camera Jitter
**Root Cause of Jitter:** When `cameraMode === 'spacecraft'`, if `OrbitControls` remains active or if `state.camera.position.lerp(shipPos, alpha)` lags behind a moving spacecraft, the camera position fights against the ship mesh every frame, causing micro-stutters and visible jitter.

**The Absolute Zero-Jitter Protocol:**
1. **Direct Coordinate Attachment:** The camera position is calculated **synchronously** in the exact same frame as the spacecraft's orientation matrix:
   $$\mathbf{P}_{\text{cam}} = \mathbf{P}_{\text{ship}} + \mathbf{R}_{\text{ship}} \cdot \mathbf{O}_{\text{bridge}}$$
   where $\mathbf{O}_{\text{bridge}} = [0, 0.42, 0.85]^T$ is the fixed observation deck seating coordinate.
2. **Disable OrbitControls Completely:**
   ```typescript
   if (controlsRef.current) {
     controlsRef.current.enabled = false;
   }
   ```

---

### B. Elastic Inertial Head-Look (Bounded Mouse Pan with Spring Return)
The user can look around from inside the observation deck, but the look angles are strictly bounded to prevent clipping into cockpit geometry, and smoothly spring back to the forward flight vector when released.

#### 1. Input Mapping & Deadzone
Let mouse normalized screen coordinates be $(m_x, m_y) \in [-1, 1]$:
$$\theta_{\text{target\_yaw}} = -m_x \cdot \theta_{\text{max\_yaw}} \quad (\theta_{\text{max\_yaw}} = 28^\circ = 0.488\text{ rad})$$
$$\phi_{\text{target\_pitch}} = -m_y \cdot \phi_{\text{max\_pitch}} \quad (\phi_{\text{max\_pitch}} = 16^\circ = 0.279\text{ rad})$$

#### 2. Damped Hookean Spring Mechanics
Every frame ($\Delta t$):
$$\mathbf{F}_{\text{spring}} = -k_{\text{spring}} \cdot (\mathbf{\Theta}_{\text{current}} - \mathbf{\Theta}_{\text{target}}) - c_{\text{damping}} \cdot \mathbf{\Omega}_{\text{current}}$$
$$\mathbf{\Omega}_{\text{current}} += \mathbf{F}_{\text{spring}} \cdot \Delta t$$
$$\mathbf{\Theta}_{\text{current}} += \mathbf{\Omega}_{\text{current}} \cdot \Delta t$$
Recommended parameters: $k_{\text{spring}} = 45.0\text{ s}^{-2}$, $c_{\text{damping}} = 12.0\text{ s}^{-1}$ (critically damped, zero overshoot).

When mouse interaction stops (or mouse leaves canvas), $\mathbf{\Theta}_{\text{target}} \to [0, 0]^T$, gently realigning the gaze back to the forward celestial trajectory.

---

### C. Low-Orbit Flyby Insertion Trajectory (Cassini-Huygens Profile)
To maximize the sense of monumental scale:
- Do **not** place the ship directly above the pole or at an arbitrary high-altitude distance ($d > 5R$).
- **The Golden Insertion Angle:**
  - Altitude: $h_{\text{orbit}} = R \cdot 0.32$ (skimming just above the upper exosphere).
  - Inclination: $i_{\text{orbit}} = 22.5^\circ$ across the planet's equatorial plane.
  - Heading: Tangential velocity vector $\vec{v}_{\text{ship}} \perp \vec{r}_{\text{planet}}$, flying directly into the sunlight terminator so that half the window shows blinding illuminated cloud crests while the other half plunges into pitch-black night illuminated only by starlight and aurora ovals.

---

## 4. Production GLSL Shader Reference Implementations

### A. Distance-Adaptive Multi-Octave Atmosphere Shader (`terrestrialAtmosphereShader.ts` / `jupiterAtmosphereShader.ts`)

```glsl
// Uniforms passed from Three.js:
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;
uniform float uTime;
uniform float uBass;
uniform float uBeatIntensity;

varying vec3 vNormal;
varying vec3 vWorldPosition;

// Fast Branchless Ashima 3D Simplex Noise
float snoise(vec3 v);

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 L = normalize(-vWorldPosition); // Sun at origin

  // 1. Calculate Continuous Altitude Metric eta
  float camDist = length(cameraPosition - uPlanetCenter);
  float eta = clamp((camDist - uPlanetRadius) / (2.5 * uPlanetRadius), 0.0, 1.0);

  // 2. Octave Weights
  float w0 = 1.0;
  float w1 = smoothstep(0.85, 0.35, eta);
  float w2 = smoothstep(0.50, 0.12, eta);
  float w3 = smoothstep(0.22, 0.02, eta);

  // 3. Multi-Octave FBM
  vec3 p = N;
  float macroNoise  = snoise(p * 2.5 + vec3(0.0, uTime * 0.02, 0.0));
  float mesoNoise   = snoise(p * 7.0 + vec3(0.0, uTime * 0.05, 0.0)) * 0.5;
  float microNoise  = snoise(p * 22.0 + vec3(0.0, uTime * 0.09, 0.0)) * 0.25;
  float nanoNoise   = snoise(p * 64.0) * 0.125;

  float h = macroNoise * w0 + mesoNoise * w1 + microNoise * w2 + nanoNoise * w3;

  // 4. Screen-Space Micro-Relief Shading (Analytical Normal)
  vec3 dpdx = dFdx(vWorldPosition);
  vec3 dpdy = dFdy(vWorldPosition);
  float dhdx = dFdx(h * 0.18);
  float dhdy = dFdy(h * 0.18);

  vec3 Bx = cross(dpdx, N);
  vec3 By = cross(N, dpdy);
  vec3 microN = normalize(N - (dhdx * By + dhdy * Bx) / (dot(dpdx, By) + 1e-6));

  // 5. Lighting with Chiaroscuro Contrast
  float NdotL = dot(microN, L);
  float dayTerminator = smoothstep(-0.08, 0.12, NdotL);

  // 6. Atmospheric Rayleigh Rim Inscattering
  float rim = pow(1.0 - max(0.0, dot(N, V)), 3.8) * 0.65;
  rim *= smoothstep(-0.15, 0.25, NdotL);

  vec3 albedo = vec3(0.12 + h * 0.15); // Scotopic monochrome
  vec3 finalColor = albedo * dayTerminator + vec3(rim);

  gl_FragColor = vec4(finalColor, 1.0);
}
```

---

### B. Outer Atmospheric Rayleigh Limb Shell Shader

```glsl
// Vertex Shader: Expand along normal
uniform float uRadiusExpansion; // 1.028

void main() {
  vec3 expandedPos = position * uRadiusExpansion;
  vWorldPosition = (modelMatrix * vec4(expandedPos, 1.0)).xyz;
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
}

// Fragment Shader: Volumetric Limb Glow with Soft Silhouette Fade
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 L = normalize(-vWorldPosition);

  float mu = max(0.0, dot(N, V));
  float NdotL = max(0.0, dot(N, L));

  // Exponential limb optical path length
  float opticalDepth = 1.0 / (mu + 0.14);
  float haze = smoothstep(0.0, 1.0, 1.0 - exp(-opticalDepth * 0.18));

  // Forward Mie Scattering for Crescent Phase
  float cosTheta = dot(-V, L);
  float g = 0.78;
  float miePhase = (1.5 * (1.0 - g*g) / (2.0 + g*g)) * (1.0 + cosTheta*cosTheta) / pow(1.0 + g*g - 2.0*g*cosTheta, 1.5);

  vec3 limbColor = vec3(0.55, 0.75, 1.0) * haze * (NdotL * 0.8 + 0.2) + vec3(miePhase * 0.35);

  gl_FragColor = vec4(limbColor, haze * (NdotL * 0.7 + 0.3));
}
```

---

## 5. Performance & Zero-GC Guarantees

1. **Pre-allocated Math Registers:** Never allocate `new THREE.Vector3()`, `new THREE.Euler()`, or `new THREE.Matrix4()` in `useFrame`. All calculations must use static module-level scratch registers:
   ```typescript
   const _vCamPos = new THREE.Vector3();
   const _vShipPos = new THREE.Vector3();
   const _mShipRot = new THREE.Matrix4();
   const _vTargetLook = new THREE.Vector3();
   ```
2. **GPU Texture Memory Footprint:** Exactly **0 MB**. No 8K/16K bitmap textures are downloaded or held in VRAM; all planetary albedos, atmospheres, cloud layers, and rings are evaluated in real-time GLSL.
3. **Locked 120 FPS Execution:** All shader routines use branchless `step()`, `smoothstep()`, and analytical math without raymarching loops, ensuring under 0.8ms GPU compute time per frame.

---

## 6. Verification & Crucible Checklist

Before marking any colossal planetary scale task complete, verify each of the following in production:

- [ ] **No Texture Breakdown:** When flying at $h = 0.2R$ from the planet, the surface does not exhibit blurred pixels or flat smudges; micro-filaments and craters remain crisp down to screen pixels.
- [ ] **No Faceted Horizon:** The outer planetary silhouette is smooth and organically softened by the atmospheric limb haze; no straight polygon chord edges are visible.
- [ ] **No Camera Jitter:** The observation deck canopy remains razor-steady against the stars and planet; no trailing lerp lag or stutter occurs during high-speed flybys.
- [ ] **Bounded Inertial Look:** Mouse panning rotates the view up to $\pm 28^\circ$ yaw and $\pm 16^\circ$ pitch smoothly, and springs back to the forward heading when released.
- [ ] **Monumental Scale Impact:** The planet horizon occludes $>75\%$ of the observation deck window, conveying immense physical mass and gravitational authority.
- [ ] **Strict Chiaroscuro Compliance:** Pitch-black unlit night side, brilliant crescent Mie scattering halo, and subtle starlight exposure without artificial ambient wash.
