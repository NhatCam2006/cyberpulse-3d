import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';

/**
 * Procedural Milky Way Texture Generator (Runs ONCE at startup)
 * Generates an astronomical 2048x1024 equirectangular map of the Milky Way:
 * - Galactic plane inclined at 60.2 deg relative to ecliptic J2000.
 * - Sagittarius A* galactic bulge with warm core glow.
 * - The Great Rift (interstellar molecular dust extinction carving the spine).
 * - Scotopic silver-charcoal palette with zero noisy artifacts.
 */
function createMilkyWayTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Pure dark void base
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Astronomical constants
  // Normal vector to the Milky Way Galactic Plane (inclined ~60.2 deg to ecliptic)
  const nx = -0.866;
  const ny = 0.497;
  const nz = 0.0545;
  const nLen = Math.hypot(nx, ny, nz);
  const nGalX = nx / nLen;
  const nGalY = ny / nLen;
  const nGalZ = nz / nLen;

  // Galactic Center direction (Sagittarius A*)
  const cx = -0.18;
  const cy = -0.15;
  const cz = -0.97;
  const cLen = Math.hypot(cx, cy, cz);
  const coreX = cx / cLen;
  const coreY = cy / cLen;
  const coreZ = cz / cLen;

  // Simple, deterministic pseudo-random 2D noise generator for offline texture baking
  const hash = (x: number, y: number) => {
    const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return h - Math.floor(h);
  };

  const smoothNoise = (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const sx = fx * fx * (3.0 - 2.0 * fx);
    const sy = fy * fy * (3.0 - 2.0 * fy);

    const a = hash(i, j);
    const b = hash(i + 1, j);
    const c = hash(i, j + 1);
    const d = hash(i + 1, j + 1);

    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };

  const fbm = (x: number, y: number) => {
    let v = 0.0;
    let a = 0.5;
    let shiftX = 0;
    let shiftY = 0;
    for (let o = 0; o < 4; o++) {
      v += a * smoothNoise(x + shiftX, y + shiftY);
      x *= 2.1;
      y *= 2.1;
      a *= 0.5;
      shiftX += 1.3;
      shiftY += 1.7;
    }
    return v;
  };

  for (let py = 0; py < height; py++) {
    // Latitude phi from +PI/2 (top) to -PI/2 (bottom)
    const phi = (0.5 - py / height) * Math.PI;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    for (let px = 0; px < width; px++) {
      // Longitude lambda from -PI to +PI
      const lambda = (px / width - 0.5) * Math.PI * 2.0;
      const cosLambda = Math.cos(lambda);
      const sinLambda = Math.sin(lambda);

      // 3D Direction vector on celestial sphere
      const dx = cosPhi * cosLambda;
      const dy = sinPhi;
      const dz = cosPhi * sinLambda;

      // 1. Galactic Latitude (b): sin(b) = d . nGal
      const sinB = dx * nGalX + dy * nGalY + dz * nGalZ;
      const absB = Math.abs(sinB);

      // 2. Galactic Disc Luminance Profile (Gaussian band with soft cosmic falloff)
      // Disc thickness ~ 0.11 (~6.5 deg half-width)
      let disc = Math.exp(-(absB * absB) / (2.0 * 0.11 * 0.11));
      // Outer cutoff
      if (absB > 0.40) {
        disc = 0.0;
      } else if (absB > 0.22) {
        disc *= (0.40 - absB) / 0.18;
      }

      // 3. Galactic Bulge (Sagittarius A* Core Glow)
      const distCoreSq = (dx - coreX) * (dx - coreX) + (dy - coreY) * (dy - coreY) + (dz - coreZ) * (dz - coreZ);
      const bulge = Math.exp(-distCoreSq / (2.0 * 0.26 * 0.26));

      // 4. The Great Rift (Molecular Dust Extinction)
      let dustExtinction = 1.0;
      if (absB < 0.15) {
        const nxCoord = px * 0.015;
        const nyCoord = py * 0.025;
        const dustNoise = fbm(nxCoord, nyCoord);
        const dustStrength = Math.pow(Math.max(0, (0.15 - absB) / 0.15), 1.2);
        dustExtinction = 1.0 - dustStrength * dustNoise * 0.78;
      }

      // Total Luminance
      const totalLum = (disc * 0.70 + bulge * 0.45) * dustExtinction;

      if (totalLum > 0.001) {
        const pIdx = (py * width + px) * 4;
        // Moonlit silver starlight with subtle warm core
        const rVal = Math.min(255, Math.floor(totalLum * (200 + bulge * 45)));
        const gVal = Math.min(255, Math.floor(totalLum * (210 + bulge * 35)));
        const bVal = Math.min(255, Math.floor(totalLum * (235 - bulge * 15)));
        const aVal = Math.min(255, Math.floor(totalLum * 255));

        data[pIdx + 0] = rVal;
        data[pIdx + 1] = gVal;
        data[pIdx + 2] = bVal;
        data[pIdx + 3] = aVal;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

/**
 * MilkyWayBackdrop.tsx
 * 
 * High-Performance 120FPS Deep Space Celestial Sphere:
 * - Pre-computed 2048x1024 astronomical canvas texture baked once on startup.
 * - 0 runtime GPU fragment noise evaluations (locked 120 FPS, 0 GC).
 * - Rendered on inverted sphere at radius R = 140 units (far outside Orrery).
 * - Scotopic moonlight silver starlight (#C8D0DC) with Sagittarius A* warm core glow.
 * - Additive blending, depthWrite: false, renderOrder: -999.
 */
export const MilkyWayBackdrop: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => createMilkyWayTexture(), []);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.24, // Balanced scotopic luminance: clearly visible as majestic galactic arch, but strictly behind Orrery
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });
  }, [texture]);

  useFrame(() => {
    const engine = AudioEngine.getInstance();
    // Microscopic breathing of background starlight on deep bass kick
    material.opacity = 0.22 + engine.bass * 0.04;
  });

  return (
    <mesh
      ref={meshRef}
      renderOrder={-999}
      material={material}
    >
      <sphereGeometry args={[140, 48, 36]} />
    </mesh>
  );
};
