# PROJECT SPECIFICATION: CYBERPULSE 3D (Production-Grade Audio Visualizer)

## 1. Realistic Architecture & Constraints
Build a rock-solid, crash-free 60FPS 3D Cyberpunk Audio Visualizer running in Vite + React + TypeScript + Three.js (`@react-three/fiber`, `@react-three/drei`).

*   **NO Fragile Post-Processing Dependencies:** Do NOT install `@react-three/postprocessing` (it frequently breaks with latest Three.js/React peer dependencies). Instead, achieve Cyberpunk neon glow using pure GLSL Fresnel HDR lighting, `THREE.AdditiveBlending`, multi-layered glowing wireframes, and dynamic scene point lights.
*   **Single Masterpiece Scene Over Multiple Mediocre Presets:** Focus 100% of visual complexity into ONE cohesive, multi-layered Cyberpunk scene with toggleable visual layers (Core, Rings, Terrain Grid, Particles) and camera modes (Free Orbit vs. Beat-Synced Cinematic Auto-Cam).

---

## 2. Project File Structure
    src/
    ├── audio/
    │   └── AudioEngine.ts         # Singleton Web Audio API + Adaptive Beat Detector + Synth Demo
    ├── store/
    │   └── usePlayerStore.ts      # Zustand store (Tracklist, playback controls, camera/color themes)
    ├── shaders/
    │   ├── simplexNoise.glsl.ts   # Complete Ashima 3D Simplex Noise
    │   ├── coreShader.ts          # Derivative flat-shaded crystal core GLSL shader
    │   └── gridShader.ts          # Audio-displaced synthwave terrain shader
    ├── components/
    │   ├── canvas/
    │   │   ├── VisualizerCanvas.tsx  # R3F Canvas, Dynamic Lights, Camera Rig
    │   │   ├── CyberCore.tsx         # Faceted morphing core + dual counter-rotating gyro rings
    │   │   ├── SynthGrid.tsx         # 3D wireframe terrain floor reacting to frequency spectrum
    │   │   └── ParticleVortex.tsx    # Additive-blended neon particles
    │   └── hud/
    │       ├── TopTelemetry.tsx      # Real-time FPS, adaptive BPM/Kick detector, Color Theme switcher
    │       ├── TrackDrawer.tsx       # Lazy ObjectURL folder loader + Drag & Drop tracklist
    │       └── PlayerDeck.tsx        # Bottom HUD transport + 64-bar 2D Canvas Spectrum Analyzer
    ├── App.tsx
    └── main.tsx

---

## 3. Visual Layers of the Scene
1.  **The Faceted Cyber Core:**
    *   `IcosahedronGeometry(1.6, 20)` with custom GLSL shader using screen-space derivatives (`dFdx`, `dFdy`) in the Fragment Shader to compute real-time faceted normals after vertex displacement. This creates razor-sharp cyberpunk crystal reflections on every bass hit.
2.  **Gyroscopic Energy Rings:**
    *   3 concentric `TorusGeometry` rings rotating on X/Y/Z axes, scaling and glowing with `THREE.AdditiveBlending` on Mid and High frequencies.
3.  **Audio-Reactive Synthwave Terrain (`SynthGrid.tsx`):**
    *   A high-segment `PlaneGeometry(60, 60, 64, 64)` below the core where the outer edges rise into neon mountains driven by the FFT frequency array.
4.  **Lazy Memory Management for Local Music:**
    *   When loading a folder via `webkitdirectory` or Drag & Drop, store raw `File` references in memory. Only call `URL.createObjectURL(file)` when a track is actively selected to play, and call `URL.revokeObjectURL(prevUrl)` when switching tracks.