import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';
import { usePlayerStore } from '../../../store/usePlayerStore';
import { heliocentricPositions } from '../../../utils/celestialMechanics';

const NUM_CHORDS = 38; // Ephemeral Harmonograph chords
const CHORD_SAMPLE_STEP = 0.052; // Radians of Earth movement between chord samples
const SOLAR_OCCLUSION_RADIUS = 0.95; // Solar limb clearance: never slice through the incandescent Sun

/**
 * KeplerHarmonograph.tsx
 * 
 * Johannes Kepler's Harmonices Mundi (Music of the Spheres):
 * - Ephemeral Mean Motion Resonance (MMR) chords between Earth and Venus (8:13 celestial rose).
 * - Solar Limb Occlusion: Automatically fades chords when passing behind/through Sol (d < 0.95),
 *   guaranteeing the central Sun remains 100% pristine and unblemished.
 * - Quadratic luminance decay: Chords gently dissolve, keeping space clean and uncluttered.
 * - Audio-harmonic breathing: Mid & High frequencies breathe life into the resonance lines.
 * - 0 GC allocation per frame (100% pre-allocated Float32Array buffers).
 */
export const KeplerHarmonograph: React.FC = () => {
  // Pre-allocated coordinate & vertex color buffers (NUM_CHORDS * 2 vertices * 3 coords)
  const [positions, colors] = useMemo(() => {
    return [
      new Float32Array(NUM_CHORDS * 2 * 3),
      new Float32Array(NUM_CHORDS * 2 * 3),
    ];
  }, []);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pAttr = new THREE.BufferAttribute(positions, 3);
    pAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', pAttr);

    const cAttr = new THREE.BufferAttribute(colors, 3);
    cAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('color', cAttr);
    return g;
  }, [positions, colors]);

  const mat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const lineSegments = useMemo(() => {
    const l = new THREE.LineSegments(geom, mat);
    l.frustumCulled = false;
    return l;
  }, [geom, mat]);

  // Ring buffer for chord endpoint history
  const chordsHistory = useRef<{ earth: THREE.Vector3; venus: THREE.Vector3 }[]>(
    Array.from({ length: NUM_CHORDS }, () => ({
      earth: new THREE.Vector3(0, 0, 0),
      venus: new THREE.Vector3(0, 0, 0),
    }))
  );

  const lastSampleAngleRef = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);

  // Reusable vectors for distance-to-origin calculation (0 GC)
  const [vChord, vCross] = useMemo(() => [new THREE.Vector3(), new THREE.Vector3()], []);

  useFrame(() => {
    const earthPos = heliocentricPositions['Earth'];
    const venusPos = heliocentricPositions['Venus'];

    if (!earthPos || !venusPos) return;

    const engine = AudioEngine.getInstance();
    const spectralMode = usePlayerStore.getState().auroraSpectralMode;
    const { mid, high, beatIntensity } = engine;

    // Current Earth orbital angle
    const earthAngle = Math.atan2(earthPos.z, earthPos.x);

    // Initialize buffer on first available frame
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSampleAngleRef.current = earthAngle;
      for (let i = 0; i < NUM_CHORDS; i++) {
        chordsHistory.current[i].earth.copy(earthPos);
        chordsHistory.current[i].venus.copy(venusPos);
      }
    }

    // Check if Earth has moved by CHORD_SAMPLE_STEP to record a new resonant chord
    let angleDiff = Math.abs(earthAngle - lastSampleAngleRef.current);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    if (angleDiff >= CHORD_SAMPLE_STEP) {
      lastSampleAngleRef.current = earthAngle;

      // Shift chords history back
      for (let i = NUM_CHORDS - 1; i > 0; i--) {
        chordsHistory.current[i].earth.copy(chordsHistory.current[i - 1].earth);
        chordsHistory.current[i].venus.copy(chordsHistory.current[i - 1].venus);
      }
      chordsHistory.current[0].earth.copy(earthPos);
      chordsHistory.current[0].venus.copy(venusPos);
    } else {
      // Real-time leading chord update
      chordsHistory.current[0].earth.copy(earthPos);
      chordsHistory.current[0].venus.copy(venusPos);
    }

    // Update geometry buffers
    const pArr = geom.attributes.position.array as Float32Array;
    const cArr = geom.attributes.color.array as Float32Array;

    const harmonicBoost = 0.70 + mid * 0.35 + high * 0.25 + beatIntensity * 0.15;

    for (let i = 0; i < NUM_CHORDS; i++) {
      const chord = chordsHistory.current[i];
      const baseIdx = i * 6;

      pArr[baseIdx + 0] = chord.earth.x;
      pArr[baseIdx + 1] = chord.earth.y;
      pArr[baseIdx + 2] = chord.earth.z;

      pArr[baseIdx + 3] = chord.venus.x;
      pArr[baseIdx + 4] = chord.venus.y;
      pArr[baseIdx + 5] = chord.venus.z;

      // Calculate minimum distance from chord segment to Sol (0,0,0)
      vChord.copy(chord.venus).sub(chord.earth);
      const chordLen = vChord.length();
      let dMin = 999.0;
      if (chordLen > 0.001) {
        vCross.crossVectors(chord.earth, chord.venus);
        dMin = vCross.length() / chordLen;
      }

      // Solar occlusion factor: if chord intersects or passes near Sol, fade to 0
      let solarFade = 1.0;
      if (dMin < SOLAR_OCCLUSION_RADIUS) {
        solarFade = Math.max(0.0, (dMin - 0.65) / (SOLAR_OCCLUSION_RADIUS - 0.65));
        solarFade = Math.pow(solarFade, 2.0); // Smooth quadratic taper away from Sol
      }

      // Age falloff: leading chord (1.0) to trailing tail (0.0)
      const t = 1.0 - (i / (NUM_CHORDS - 1));
      const chordAlpha = Math.pow(t, 1.8) * 0.35 * harmonicBoost * solarFade;

      if (spectralMode) {
        // Earth end: Solar Amber / Gold
        cArr[baseIdx + 0] = 1.0 * chordAlpha;
        cArr[baseIdx + 1] = 0.85 * chordAlpha;
        cArr[baseIdx + 2] = 0.35 * chordAlpha;

        // Venus end: Electric Ion Cyan
        cArr[baseIdx + 3] = 0.25 * chordAlpha;
        cArr[baseIdx + 4] = 0.90 * chordAlpha;
        cArr[baseIdx + 5] = 1.0 * chordAlpha;
      } else {
        // Monochrome Avant-Garde (Ryoji Ikeda): Pure Silver-White
        const lum = chordAlpha * 0.82;
        cArr[baseIdx + 0] = lum;
        cArr[baseIdx + 1] = lum;
        cArr[baseIdx + 2] = lum;
        cArr[baseIdx + 3] = lum;
        cArr[baseIdx + 4] = lum;
        cArr[baseIdx + 5] = lum;
      }
    }

    geom.attributes.position.needsUpdate = true;
    geom.attributes.color.needsUpdate = true;
  });

  return <primitive object={lineSegments} />;
};
