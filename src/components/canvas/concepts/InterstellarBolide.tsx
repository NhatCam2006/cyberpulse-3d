import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';
import { usePlayerStore } from '../../../store/usePlayerStore';

const MAX_BOLIDES = 2;
// 32 frames history (~0.53s) at speed ~4.2 = ~2.2 AU sleek straight tail
const NUM_TRAIL_POINTS = 32;

interface BolideInstance {
  active: boolean;
  fading: boolean;
  cooldownTimer: number;
  fadeAlpha: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  history: THREE.Vector3[];
  lastClimaxTime: number;
  trajectorySign: number;
  trailGeom: THREE.BufferGeometry;
  lineObject: THREE.Line;
  headGeom: THREE.BufferGeometry;
  headMat: THREE.PointsMaterial;
  headObject: THREE.Points;
}

/**
 * InterstellarBolide.tsx
 * 
 * Straight-line gliding interstellar meteor with distinct ion tail:
 * - Trajectory: Pure straight-line inertial motion (Newton's 1st Law, 0 gravitational bending).
 * - Velocity: Moderate, graceful glide speed (~4.0 units/s), crossing screen in ~5.0s.
 * - Tail: Distinct 32-point trailing ion tail (~2.2 AU) with smooth linear-quadratic fade.
 * - Head: Crisp pinpoint star sprite (size 0.055, Additive).
 * - Zero GC allocations per frame (100% pre-allocated Float32Array buffers).
 */
export const InterstellarBolide: React.FC = () => {
  const containerRef = useRef<THREE.Group>(null);

  // Initialize pool of 2 independent bolides
  const bolides = useMemo<BolideInstance[]>(() => {
    return Array.from({ length: MAX_BOLIDES }, (_, idx) => {
      // 1. Trail Line Buffers
      const tPos = new Float32Array(NUM_TRAIL_POINTS * 3);
      const tCol = new Float32Array(NUM_TRAIL_POINTS * 3);
      const trailGeom = new THREE.BufferGeometry();

      const pAttr = new THREE.BufferAttribute(tPos, 3);
      pAttr.setUsage(THREE.DynamicDrawUsage);
      trailGeom.setAttribute('position', pAttr);

      const cAttr = new THREE.BufferAttribute(tCol, 3);
      cAttr.setUsage(THREE.DynamicDrawUsage);
      trailGeom.setAttribute('color', cAttr);

      const trailMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const lineObject = new THREE.Line(trailGeom, trailMat);
      lineObject.frustumCulled = false;
      lineObject.visible = false;

      // 2. Head Pinpoint Star Sprite
      const headGeom = new THREE.BufferGeometry();
      const hPos = new Float32Array([0, 9999, 0]);
      headGeom.setAttribute('position', new THREE.BufferAttribute(hPos, 3));

      const headMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.065,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const headObject = new THREE.Points(headGeom, headMat);
      headObject.frustumCulled = false;
      headObject.visible = false;

      return {
        active: false,
        fading: false,
        // Natural cadence: Bolide 0 spawns after ~3.5s, Bolide 1 after ~18s
        cooldownTimer: idx === 0 ? 3.5 : 18.0,
        fadeAlpha: 0.0,
        pos: new THREE.Vector3(0, 9999, 0),
        vel: new THREE.Vector3(0, 0, 0),
        history: Array.from({ length: NUM_TRAIL_POINTS }, () => new THREE.Vector3(0, 9999, 0)),
        lastClimaxTime: 0,
        trajectorySign: idx === 0 ? 1 : -1,
        trailGeom,
        lineObject,
        headGeom,
        headMat,
        headObject,
      };
    });
  }, []);

  useFrame((state, delta) => {
    const engine = AudioEngine.getInstance();
    const spectralMode = usePlayerStore.getState().auroraSpectralMode;
    const { isClimax, beatIntensity } = engine;
    const dt = Math.min(0.035, Math.max(0.005, delta));
    const now = state.clock.elapsedTime;

    for (let bIdx = 0; bIdx < bolides.length; bIdx++) {
      const b = bolides[bIdx];

      // 1. SPAWN / RESPAWN LOGIC (Straight-line corridor)
      if (!b.active && !b.fading) {
        b.cooldownTimer -= dt;
        const isClimaxTrigger = isClimax && now - b.lastClimaxTime > 15.0;

        if (b.cooldownTimer <= 0 || isClimaxTrigger) {
          if (isClimaxTrigger) b.lastClimaxTime = now;
          // Random cadence: 18s to 32s
          b.cooldownTimer = 18.0 + Math.random() * 14.0;

          // Alternate direction (Left-to-Right or Right-to-Left)
          b.trajectorySign = Math.random() > 0.5 ? 1 : -1;
          const sign = b.trajectorySign;

          // Straight entrance point (upper quadrant of frustum)
          const spawnX = sign * (14.0 + Math.random() * 3.0);
          const spawnY = 4.5 + Math.random() * 2.5;
          const spawnZ = -3.0 + (Math.random() - 0.5) * 4.0;
          b.pos.set(spawnX, spawnY, spawnZ);

          // Straight exit point (lower opposite quadrant)
          const exitX = -sign * (14.0 + Math.random() * 3.0);
          const exitY = -1.5 - Math.random() * 2.5;
          const exitZ = 1.0 + (Math.random() - 0.5) * 4.0;
          const targetPos = new THREE.Vector3(exitX, exitY, exitZ);

          // Graceful straight-line glide speed (~4.0 units/s)
          const glideSpeed = 3.8 + Math.random() * 0.8;
          b.vel.copy(targetPos).sub(b.pos).normalize().multiplyScalar(glideSpeed);

          // Pre-fill history buffer with spawn position
          for (let i = 0; i < b.history.length; i++) {
            b.history[i].copy(b.pos);
          }

          b.active = true;
          b.fading = false;
          b.fadeAlpha = 1.0;
          b.lineObject.visible = true;
          b.headObject.visible = true;
        }
      }

      // 2. PURE STRAIGHT-LINE MOTION (Constant Velocity v)
      if (b.active || b.fading) {
        if (b.active) {
          // Strictly straight-line translation: pos += vel * dt (0 curved bending)
          b.pos.addScaledVector(b.vel, dt);

          // Shift history ring buffer
          for (let i = b.history.length - 1; i > 0; i--) {
            b.history[i].copy(b.history[i - 1]);
          }
          b.history[0].copy(b.pos);

          // Exit boundary check: reached distance > 18.0 and flying outward
          const rDist = b.pos.length();
          if (rDist > 18.0 && b.vel.dot(b.pos) > 0) {
            b.active = false;
            b.fading = true;
          }
        }

        // Smooth dissolution of tail
        if (b.fading) {
          b.fadeAlpha -= dt * 1.8;
          if (b.fadeAlpha <= 0.0) {
            b.fading = false;
            b.fadeAlpha = 0.0;
            b.lineObject.visible = false;
            b.headObject.visible = false;
          }
        }

        // 3. UPDATE PINPOINT HEAD STAR
        const hArr = b.headGeom.attributes.position.array as Float32Array;
        hArr[0] = b.history[0].x;
        hArr[1] = b.history[0].y;
        hArr[2] = b.history[0].z;
        b.headGeom.attributes.position.needsUpdate = true;
        b.headMat.opacity = b.fadeAlpha * (0.95 + beatIntensity * 0.25);

        // 4. UPDATE DISTINCT ION TAIL (Linear-quadratic luminance gradient)
        const pArr = b.trailGeom.attributes.position.array as Float32Array;
        const cArr = b.trailGeom.attributes.color.array as Float32Array;

        for (let i = 0; i < NUM_TRAIL_POINTS; i++) {
          const pt = b.history[i];
          pArr[i * 3 + 0] = pt.x;
          pArr[i * 3 + 1] = pt.y;
          pArr[i * 3 + 2] = pt.z;

          // Power 1.4 fade: keeps the tail visibly luminous along its length
          const t = 1.0 - (i / (NUM_TRAIL_POINTS - 1));
          const lum = Math.pow(t, 1.4) * b.fadeAlpha * (0.95 + beatIntensity * 0.2);

          let cr = 1.0, cg = 1.0, cb = 1.0;
          if (spectralMode) {
            if (t > 0.65) {
              cr = 1.0; cg = 1.0; cb = 1.0; // Pure white leading core
            } else if (t > 0.25) {
              cr = 0.45; cg = 0.88; cb = 1.0; // Ionized electric cyan tail
            } else {
              cr = 0.18; cg = 0.55; cb = 0.95; // Faint deep cosmic blue tip
            }
          }

          cArr[i * 3 + 0] = cr * lum;
          cArr[i * 3 + 1] = cg * lum;
          cArr[i * 3 + 2] = cb * lum;
        }

        b.trailGeom.attributes.position.needsUpdate = true;
        b.trailGeom.attributes.color.needsUpdate = true;
      }
    }
  });

  return (
    <group ref={containerRef}>
      {bolides.map((b, idx) => (
        <group key={idx}>
          <primitive object={b.lineObject} />
          <primitive object={b.headObject} />
        </group>
      ))}
    </group>
  );
};
