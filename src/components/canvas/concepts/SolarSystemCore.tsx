import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AudioEngine } from '../../../audio/AudioEngine';
import {
  JPL_PLANETS,
  DWARF_PLANETS,
  getHeliocentricPosition,
  generateOrbitalEllipsePoints,
  getVisualPlanetRadius,
  getVisualSemiMajorAxis,
  heliocentricPositions,
} from '../../../utils/celestialMechanics';
import {
  sunAtmosphereVertexShader,
  sunAtmosphereFragmentShader,
} from '../../../shaders/sunAtmosphereShader';
import {
  cmeShockwaveVertexShader,
  cmeShockwaveFragmentShader,
} from '../../../shaders/cmeShockwaveShader';
import {
  keplerOrbitVertexShader,
  keplerOrbitFragmentShader,
} from '../../../shaders/keplerOrbitShader';
import {
  saturnRingVertexShader,
  saturnRingFragmentShader,
} from '../../../shaders/saturnRingShader';
import {
  jupiterAtmosphereVertexShader,
  jupiterAtmosphereFragmentShader,
} from '../../../shaders/jupiterAtmosphereShader';
import {
  terrestrialAtmosphereVertexShader,
  terrestrialAtmosphereFragmentShader,
} from '../../../shaders/terrestrialAtmosphereShader';
import {
  iceGiantVertexShader,
  iceGiantFragmentShader,
} from '../../../shaders/iceGiantShader';
import {
  saturnAtmosphereVertexShader,
  saturnAtmosphereFragmentShader,
} from '../../../shaders/saturnAtmosphereShader';
import {
  dwarfPlanetVertexShader,
  dwarfPlanetFragmentShader,
} from '../../../shaders/dwarfPlanetShader';
import {
  auroralCurtainVertexShader,
  auroralCurtainFragmentShader,
} from '../../../shaders/auroralCurtainShader';
import { SolarCoronaBillboard } from './SolarCoronaBillboard';
import { RelativisticGeodesicHorizon } from './RelativisticGeodesicHorizon';
import { InterstellarBolide } from './InterstellarBolide';
import { KeplerHarmonograph } from './KeplerHarmonograph';
import { KuiperRadarBoundary } from './KuiperRadarBoundary';
import { OuterHeliosphericPulseRing } from './OuterHeliosphericPulseRing';
import { MilkyWayBackdrop } from './MilkyWayBackdrop';
import { usePlayerStore } from '../../../store/usePlayerStore';

const NUM_ASTEROIDS = 850;

export const SolarSystemCore = () => {
  const visibleLayers = usePlayerStore(state => state.visibleLayers);
  const selectedPlanet = usePlayerStore(state => state.selectedPlanet);
  const auroraSpectralMode = usePlayerStore(state => state.auroraSpectralMode);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const isDemoSynth = usePlayerStore(state => state.isDemoSynth);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const coronaMeshRef = useRef<THREE.Mesh>(null);
  const cmeGroupRef = useRef<THREE.Group>(null);
  const planetsGroupRef = useRef<THREE.Group>(null);
  const dwarfGroupRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const jupiterMoonsGroupRef = useRef<THREE.Group>(null);
  const marsMoonsGroupRef = useRef<THREE.Group>(null);
  const saturnMoonsGroupRef = useRef<THREE.Group>(null);
  const saturnRingsRef = useRef<THREE.Mesh>(null);
  const asteroidPointsRef = useRef<THREE.Points>(null);

  // 1. Solar Photosphere Shader (Eddington-Barbier Limb Darkening + Sunspots + Granulation)
  const sunShaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: sunAtmosphereVertexShader,
      fragmentShader: sunAtmosphereFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // 2. Coronal Mass Ejection (CME) 2D Planar Sedov-Taylor Blast Shockwave Material
  const cmeShaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: cmeShockwaveVertexShader,
      fragmentShader: cmeShockwaveFragmentShader,
      uniforms: {
        uExpansionProgress: { value: 0 },
        uBeatIntensity: { value: 0 },
        uTime: { value: 0 },
        uSpectralMode: { value: 1.0 },
        uInnerRadius: { value: 0.72 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, []);

  // 3. Terrestrial Planet Physical Shaders
  // Mercury: Airless, harsh cratered regolith
  const mercuryMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 0 },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // Venus: Opaque super-rotating sulfuric cloud deck
  const venusMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 1 },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // Earth: Continents, specular ocean water glint, Coriolis cloud swirls, Megalopolis lights & Aurora Ovals
  const earthMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 2 },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // Mars: Ochre desert + CO2 dry-ice polar caps
  const marsMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 3 },
        uTime: { value: 0 },
        uBass: { value: 0 },
      },
    });
  }, []);

  // Moon (Luna) with Basalt Maria & Tycho Ray Craters
  const moonMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 4 },
        uTime: { value: 0 },
        uBass: { value: 0 },
      },
    });
  }, []);

  // Galilean Moons of Jupiter:
  // Io: Hyperactive sulfur volcanism & beat-reactive eruption plumes (Loki & Pele)
  const ioMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 5 },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // Europa: Smooth water-ice shell with lineae cracks
  const europaMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 6 },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // Ganymede: Grooved tectonic ridges and dark cratered terrain
  const ganymedeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 7 },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // Callisto: Heavily cratered ancient crust with Valhalla multi-ring basin
  const callistoMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 8 },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // Enceladus: Pure water ice with South Polar Tiger Stripes & Cryovolcanic Geysers
  const enceladusMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: terrestrialAtmosphereVertexShader,
      fragmentShader: terrestrialAtmosphereFragmentShader,
      uniforms: {
        uPlanetType: { value: 9 },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // 4. Dwarf Planet Shaders (Ceres, Pluto, Charon)
  const ceresMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: dwarfPlanetVertexShader,
      fragmentShader: dwarfPlanetFragmentShader,
      uniforms: {
        uDwarfType: { value: 0 },
        uTime: { value: 0 },
        uBass: { value: 0 },
      },
    });
  }, []);

  const plutoMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: dwarfPlanetVertexShader,
      fragmentShader: dwarfPlanetFragmentShader,
      uniforms: {
        uDwarfType: { value: 1 },
        uTime: { value: 0 },
        uBass: { value: 0 },
      },
    });
  }, []);

  const charonMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: dwarfPlanetVertexShader,
      fragmentShader: dwarfPlanetFragmentShader,
      uniforms: {
        uDwarfType: { value: 2 },
        uTime: { value: 0 },
        uBass: { value: 0 },
      },
    });
  }, []);

  // 4. Jupiter Zonal Jets & Jovian Aurora Shader
  const jupiterShaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: jupiterAtmosphereVertexShader,
      fragmentShader: jupiterAtmosphereFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uBeatIntensity: { value: 0 },
      },
    });
  }, []);

  // 4b. 3D Ionospheric Auroral Curtain Drapery Materials (Earth & Jupiter)
  const earthAuroraMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: auroralCurtainVertexShader,
      fragmentShader: auroralCurtainFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBeatIntensity: { value: 0 },
        uBass: { value: 0 },
        uSpectralMode: { value: 1.0 },
        uPlanetMode: { value: 0.0 },
        uIoPhase: { value: 0.0 },
        uAuroraActivity: { value: 0.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  const jupiterAuroraMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: auroralCurtainVertexShader,
      fragmentShader: auroralCurtainFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBeatIntensity: { value: 0 },
        uBass: { value: 0 },
        uSpectralMode: { value: 1.0 },
        uPlanetMode: { value: 1.0 },
        uIoPhase: { value: 0.0 },
        uAuroraActivity: { value: 0.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // 5. Saturn Analytical Ring Optical Depth Shader (Cassini & Encke divisions)
  const saturnRingShaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: saturnRingVertexShader,
      fragmentShader: saturnRingFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  // 6. Saturn Atmosphere & Ring Shadow Shader
  const saturnAtmosphereMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: saturnAtmosphereVertexShader,
      fragmentShader: saturnAtmosphereFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
      },
    });
  }, []);

  // 7. Ice Giant Methane Absorption Shaders (Uranus & Neptune)
  const uranusMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: iceGiantVertexShader,
      fragmentShader: iceGiantFragmentShader,
      uniforms: {
        uGiantType: { value: 0 },
        uTime: { value: 0 },
        uBass: { value: 0 },
      },
    });
  }, []);

  const neptuneMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: iceGiantVertexShader,
      fragmentShader: iceGiantFragmentShader,
      uniforms: {
        uGiantType: { value: 1 },
        uTime: { value: 0 },
        uBass: { value: 0 },
      },
    });
  }, []);

  // 7. Corona Outer Atmospheric Glow (Fresnel envelope)
  const coronaMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
    });
  }, []);

  // 8. Precompute Dynamic Keplerian Orbit Lines with Velocity Wakes
  const orbitLines = useMemo(() => {
    return JPL_PLANETS.map((planet) => {
      const numPts = 144;
      const points = generateOrbitalEllipsePoints(planet, numPts);
      const geom = new THREE.BufferGeometry().setFromPoints(points);

      // Attach aAnomaly attribute for each vertex [0 .. 2pi]
      const aAnomaly = new Float32Array(points.length);
      for (let k = 0; k < points.length; k++) {
        aAnomaly[k] = (k / numPts) * Math.PI * 2;
      }
      geom.setAttribute('aAnomaly', new THREE.BufferAttribute(aAnomaly, 1));

      // Velocity scaling: faster planets have longer trailing wakes (v ~ a^-0.42)
      const vRel = Math.pow(1.0 / planet.a_AU, 0.42);
      const wakeLength = Math.min(0.24, Math.max(0.06, 0.13 * vRel));

      const mat = new THREE.ShaderMaterial({
        vertexShader: keplerOrbitVertexShader,
        fragmentShader: keplerOrbitFragmentShader,
        uniforms: {
          uPlanetAnomaly: { value: 0 },
          uWakeLength: { value: wakeLength },
          uBass: { value: 0 },
          uBeatIntensity: { value: 0 },
          uColor: { value: new THREE.Color(0xe2e8f0) },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      return new THREE.Line(geom, mat);
    });
  }, []);

  // Dwarf Planet Orbit Lines (Ceres & Pluto) with Dynamic Velocity Wakes
  const dwarfOrbitLines = useMemo(() => {
    return DWARF_PLANETS.map((dp) => {
      const numPts = 128;
      const pts = generateOrbitalEllipsePoints(dp, numPts);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);

      const aAnomaly = new Float32Array(pts.length);
      for (let k = 0; k < pts.length; k++) {
        aAnomaly[k] = (k / numPts) * Math.PI * 2;
      }
      geom.setAttribute('aAnomaly', new THREE.BufferAttribute(aAnomaly, 1));

      const vRel = Math.pow(1.0 / dp.a_AU, 0.42);
      const wakeLength = Math.min(0.18, Math.max(0.05, 0.10 * vRel));

      const mat = new THREE.ShaderMaterial({
        vertexShader: keplerOrbitVertexShader,
        fragmentShader: keplerOrbitFragmentShader,
        uniforms: {
          uPlanetAnomaly: { value: 0 },
          uWakeLength: { value: wakeLength },
          uBass: { value: 0 },
          uBeatIntensity: { value: 0 },
          uColor: { value: new THREE.Color(0xb0b8c4) },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      return new THREE.Line(geom, mat);
    });
  }, []);

  // 9. Saturn's Ring Geometry
  const saturnRingsGeom = useMemo(() => {
    return new THREE.RingGeometry(0.38, 0.72, 96);
  }, []);

  // 9b. 3D Auroral Curtain Geometries (Decoupled S-curve meandering ribbon with controlled atmospheric height)
  const earthAuroraGeom = useMemo(() => {
    return new THREE.CylinderGeometry(0.046, 0.040, 0.022, 96, 24, true);
  }, []);

  const earthAuroraInnerGeom = useMemo(() => {
    return new THREE.CylinderGeometry(0.040, 0.034, 0.018, 96, 24, true);
  }, []);

  const jupiterAuroraGeom = useMemo(() => {
    return new THREE.CylinderGeometry(0.155, 0.142, 0.038, 96, 24, true);
  }, []);

  // 11. Main Asteroid Belt with cleared Kirkwood Gaps (Resonances 3:1, 5:2, 2:1 with Jupiter)
  const asteroidData = useMemo(() => {
    const pos = new Float32Array(NUM_ASTEROIDS * 3);
    const angles = new Float32Array(NUM_ASTEROIDS);
    const radii = new Float32Array(NUM_ASTEROIDS);
    const speeds = new Float32Array(NUM_ASTEROIDS);
    const yOffsets = new Float32Array(NUM_ASTEROIDS);

    const gap1 = getVisualSemiMajorAxis(2.50);
    const gap2 = getVisualSemiMajorAxis(2.82);
    const gap3 = getVisualSemiMajorAxis(3.28);
    const rBeltMin = getVisualSemiMajorAxis(2.15);
    const rBeltMax = getVisualSemiMajorAxis(3.35);

    let count = 0;
    while (count < NUM_ASTEROIDS) {
      const rCandidate = rBeltMin + Math.random() * (rBeltMax - rBeltMin);

      if (Math.abs(rCandidate - gap1) < 0.08 ||
          Math.abs(rCandidate - gap2) < 0.07 ||
          Math.abs(rCandidate - gap3) < 0.09) {
        continue;
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = (1.0 / Math.pow(rCandidate, 1.5)) * 2.2;
      const y = (Math.random() - 0.5) * 0.22;

      angles[count] = angle;
      radii[count] = rCandidate;
      speeds[count] = speed;
      yOffsets[count] = y;

      pos[count * 3 + 0] = Math.cos(angle) * rCandidate;
      pos[count * 3 + 1] = y;
      pos[count * 3 + 2] = Math.sin(angle) * rCandidate;
      count++;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.026,
      transparent: true,
      opacity: 0.75,
    });

    return { geom, mat, angles, radii, speeds, yOffsets, pos };
  }, []);

  // State tracking: Mean anomalies - gracefully dispersed around 360-degree orbits using golden ratio
  const meanAnomaliesRef = useRef<number[]>(
    JPL_PLANETS.map((_, idx) => (idx * 2.39996) % (Math.PI * 2))
  );
  const dwarfAnomaliesRef = useRef<number[]>([1.8, 4.2]);

  // CME 2D Planar Blast wave state & Planet-specific wavefront arrival shock timers
  const cmeStateRef = useRef<{ active: boolean; progress: number; radius: number; cooldown: number }>({
    active: false,
    progress: 1.0,
    radius: 0.85,
    cooldown: 0,
  });
  const earthShockTriggeredRef = useRef<boolean>(false);
  const jupiterShockTriggeredRef = useRef<boolean>(false);
  const earthAuroraTimerRef = useRef<number>(0);
  const jupiterAuroraTimerRef = useRef<number>(0);

  useFrame((state, delta) => {
    const engine = AudioEngine.getInstance();
    const audioData = engine.update();
    const { bass, mid, high, beatIntensity, isBeat, acousticEnergy, isClimax, climaxIntensity } = audioData;
    const time = state.clock.elapsedTime;

    // 1. Sun & Corona Shader Uniforms & Physical Scale
    if (sunMeshRef.current) {
      sunShaderMat.uniforms.uTime.value = time;
      sunShaderMat.uniforms.uBass.value = bass;
      sunShaderMat.uniforms.uMid.value = mid;
      sunShaderMat.uniforms.uBeatIntensity.value = beatIntensity;

      const sunScale = 1.0 + bass * 0.28 + beatIntensity * 0.45;
      sunMeshRef.current.scale.set(sunScale, sunScale, sunScale);
      sunMeshRef.current.rotation.y += delta * 0.08;
    }

    // 2. Update All Planetary Shader Uniforms
    mercuryMat.uniforms.uTime.value = time;
    mercuryMat.uniforms.uBass.value = bass;

    venusMat.uniforms.uTime.value = time;
    venusMat.uniforms.uBass.value = bass;

    earthMat.uniforms.uTime.value = time;
    earthMat.uniforms.uBass.value = bass;

    earthMat.uniforms.uBeatIntensity.value = beatIntensity;

    marsMat.uniforms.uTime.value = time;
    marsMat.uniforms.uBass.value = bass;

    moonMat.uniforms.uTime.value = time;
    moonMat.uniforms.uBass.value = bass;

    ioMat.uniforms.uTime.value = time;
    ioMat.uniforms.uBass.value = bass;
    ioMat.uniforms.uBeatIntensity.value = beatIntensity;

    europaMat.uniforms.uTime.value = time;
    europaMat.uniforms.uBass.value = bass;

    ganymedeMat.uniforms.uTime.value = time;
    ganymedeMat.uniforms.uBass.value = bass;

    callistoMat.uniforms.uTime.value = time;
    callistoMat.uniforms.uBass.value = bass;

    enceladusMat.uniforms.uTime.value = time;
    enceladusMat.uniforms.uBass.value = bass;
    enceladusMat.uniforms.uBeatIntensity.value = beatIntensity;

    charonMat.uniforms.uTime.value = time;
    charonMat.uniforms.uBass.value = bass;

    jupiterShaderMat.uniforms.uTime.value = time;
    jupiterShaderMat.uniforms.uBass.value = bass;
    jupiterShaderMat.uniforms.uBeatIntensity.value = beatIntensity;

    saturnRingShaderMat.uniforms.uTime.value = time;
    saturnRingShaderMat.uniforms.uBass.value = bass;

    saturnAtmosphereMat.uniforms.uTime.value = time;
    saturnAtmosphereMat.uniforms.uBass.value = bass;

    // 2b. CME Triggering & Wavefront Arrival Detection
    cmeStateRef.current.cooldown = Math.max(0, cmeStateRef.current.cooldown - delta);

    // Apocalyptic CME Shockwave triggers EXCLUSIVELY on Musical Climaxes / Drops (ĐOẠN CAO TRÀO)!
    // Strictly NO periodic repetition, NO firing on ordinary verses or random kick beats.
    const shouldTriggerCme = isClimax && cmeStateRef.current.cooldown <= 0;

    if (shouldTriggerCme) {
      cmeStateRef.current.active = true;
      cmeStateRef.current.progress = 0;
      // 7s lockout prevents spamming during the same chorus/drop (allowing auroras to dance and fade)
      cmeStateRef.current.cooldown = 7.0;
      earthShockTriggeredRef.current = false;
      jupiterShockTriggeredRef.current = false;
    }

    // 3. 2D Planar Coronal Mass Ejection (CME) Sedov-Taylor Blast Shockwave in Ecliptic
    if (cmeGroupRef.current) {
      const isCmeActive = cmeStateRef.current.active && cmeStateRef.current.progress < 1.0;
      cmeGroupRef.current.visible = isCmeActive;

      if (isCmeActive) {
        cmeStateRef.current.progress = Math.min(1.0, cmeStateRef.current.progress + delta * (0.28 + bass * 0.14));
        const rMax = 15.0;
        const r = 0.85 + Math.pow(cmeStateRef.current.progress, 0.75) * (rMax - 0.85);
        cmeStateRef.current.radius = r;

        // Scale symmetrically in 2D horizontal ecliptic plane (XZ plane) -> Perfect expanding circle!
        cmeGroupRef.current.scale.set(r, 1, r);
        cmeShaderMat.uniforms.uExpansionProgress.value = cmeStateRef.current.progress;
        cmeShaderMat.uniforms.uBeatIntensity.value = beatIntensity;
        cmeShaderMat.uniforms.uTime.value = time;
        cmeShaderMat.uniforms.uSpectralMode.value = auroraSpectralMode ? 1.0 : 0.0;
        cmeShaderMat.uniforms.uInnerRadius.value = 0.72;

        // Real-time Wavefront Arrival Detection:
        // When the 2D circular wave reaches Earth's orbital radius -> Trigger Earth's Aurora!
        const pEarth = heliocentricPositions['Earth'];
        if (pEarth && !earthShockTriggeredRef.current) {
          const rEarth = Math.hypot(pEarth.x, pEarth.z);
          if (r >= rEarth) {
            earthShockTriggeredRef.current = true;
            earthAuroraTimerRef.current = 4.2; // 4.2s auroral display on Earth
          }
        }

        // When the 2D circular wave reaches Jupiter's orbital radius -> Trigger Jupiter's Aurora!
        const pJup = heliocentricPositions['Jupiter'];
        if (pJup && !jupiterShockTriggeredRef.current) {
          const rJup = Math.hypot(pJup.x, pJup.z);
          if (r >= rJup) {
            jupiterShockTriggeredRef.current = true;
            jupiterAuroraTimerRef.current = 4.2; // 4.2s auroral display on Jupiter
          }
        }
      }
    }

    // Auroral Storm Activity on Earth: rises upon shock arrival, dances, then fades away ("rồi hết")
    if (earthAuroraTimerRef.current > 0) {
      earthAuroraTimerRef.current = Math.max(0, earthAuroraTimerRef.current - delta);
    }
    const tEarth = earthAuroraTimerRef.current;
    let earthActivity = 0.0;
    if (tEarth > 0) {
      if (tEarth > 3.6) {
        earthActivity = (4.2 - tEarth) / 0.6; // 0.6s fast rise on wave collision
      } else if (tEarth > 1.4) {
        earthActivity = 1.0; // 2.2s peak dancing aurora
      } else {
        earthActivity = tEarth / 1.4; // 1.4s smooth fade out to 0 ("rồi hết")
      }
    }

    // Auroral Storm Activity on Jupiter: rises upon shock arrival, dances, then fades away
    if (jupiterAuroraTimerRef.current > 0) {
      jupiterAuroraTimerRef.current = Math.max(0, jupiterAuroraTimerRef.current - delta);
    }
    const tJup = jupiterAuroraTimerRef.current;
    let jupiterActivity = 0.0;
    if (tJup > 0) {
      if (tJup > 3.6) {
        jupiterActivity = (4.2 - tJup) / 0.6;
      } else if (tJup > 1.4) {
        jupiterActivity = 1.0;
      } else {
        jupiterActivity = tJup / 1.4;
      }
    }

    // 2c. 3D Ionospheric Auroral Draperies (Earth & Jupiter)
    earthAuroraMat.uniforms.uTime.value = time;
    earthAuroraMat.uniforms.uBeatIntensity.value = beatIntensity;
    earthAuroraMat.uniforms.uBass.value = bass;
    earthAuroraMat.uniforms.uAuroraActivity.value = earthActivity;
    earthAuroraMat.uniforms.uSpectralMode.value = THREE.MathUtils.lerp(
      earthAuroraMat.uniforms.uSpectralMode.value,
      auroraSpectralMode ? 1.0 : 0.0,
      0.15
    );

    jupiterAuroraMat.uniforms.uTime.value = time;
    jupiterAuroraMat.uniforms.uBeatIntensity.value = beatIntensity;
    jupiterAuroraMat.uniforms.uBass.value = bass;
    jupiterAuroraMat.uniforms.uAuroraActivity.value = jupiterActivity;
    jupiterAuroraMat.uniforms.uIoPhase.value = (time * 5.2 / (2 * Math.PI)) % 1.0;
    jupiterAuroraMat.uniforms.uSpectralMode.value = THREE.MathUtils.lerp(
      jupiterAuroraMat.uniforms.uSpectralMode.value,
      auroraSpectralMode ? 1.0 : 0.0,
      0.15
    );

    uranusMat.uniforms.uTime.value = time;
    uranusMat.uniforms.uBass.value = bass;

    neptuneMat.uniforms.uTime.value = time;
    neptuneMat.uniforms.uBass.value = bass;

    ceresMat.uniforms.uTime.value = time;
    ceresMat.uniforms.uBass.value = bass;

    plutoMat.uniforms.uTime.value = time;
    plutoMat.uniforms.uBass.value = bass;

    // 5. Planetary Positions via Kepler's Equation & Euler Rotation
    if (planetsGroupRef.current) {
      JPL_PLANETS.forEach((planet, idx) => {
        const omega = (1.0 / Math.pow(planet.a_AU, 1.5)) * 1.85 * (0.4 + mid * 0.12);
        meanAnomaliesRef.current[idx] += delta * omega;

        const { position: p3d } = getHeliocentricPosition(planet, meanAnomaliesRef.current[idx]);
        heliocentricPositions[planet.name] = p3d;

        // Update Keplerian Velocity Orbit Wake Shader (0 GC)
        const lineMat = orbitLines[idx]?.material as THREE.ShaderMaterial;
        if (lineMat && lineMat.uniforms) {
          lineMat.uniforms.uPlanetAnomaly.value = meanAnomaliesRef.current[idx];
          lineMat.uniforms.uBass.value = bass;
          lineMat.uniforms.uBeatIntensity.value = beatIntensity;
        }

        const planetGroup = planetsGroupRef.current?.children[idx] as THREE.Group;
        if (planetGroup) {
          planetGroup.position.copy(p3d);

          // Planet sphere is child index 1
          const planetSphere = planetGroup.children[1] as THREE.Mesh;
          if (planetSphere) {
            planetSphere.rotation.y += delta * (1.2 / Math.sqrt(planet.radius_km / 6000));
          }

          // Earth's Moon (Luna) with 5.14 deg orbital tilt
          if (planet.name === 'Earth' && moonRef.current) {
            const moonTime = time * 4.5;
            const moonDist = 0.28;
            moonRef.current.position.set(
              p3d.x + Math.cos(moonTime) * moonDist,
              p3d.y + Math.sin(moonTime) * 0.05,
              p3d.z + Math.sin(moonTime) * moonDist
            );
          }

          // Jupiter's Galilean Moons in 4:2:1 Laplace Resonance
          if (planet.name === 'Jupiter' && jupiterMoonsGroupRef.current) {
            jupiterMoonsGroupRef.current.position.copy(p3d);
            const moons = [
              { r: 0.52, speed: 5.2 },   // Io (4x)
              { r: 0.68, speed: 2.6 },   // Europa (2x)
              { r: 0.86, speed: 1.3 },   // Ganymede (1x)
              { r: 1.08, speed: 0.55 },  // Callisto
            ];
            jupiterMoonsGroupRef.current.children.forEach((mMesh, mIdx) => {
              const mc = moons[mIdx];
              const a = time * mc.speed;
              mMesh.position.set(Math.cos(a) * mc.r, 0, Math.sin(a) * mc.r);
            });
          }
          // Mars Moons (Phobos & Deimos)
          if (planet.name === 'Mars' && marsMoonsGroupRef.current) {
            marsMoonsGroupRef.current.position.copy(p3d);
            const marsMoons = [
              { r: 0.16, speed: 7.8 }, // Phobos (rapid 7h 39m orbit)
              { r: 0.26, speed: 3.2 }, // Deimos (30h orbit)
            ];
            marsMoonsGroupRef.current.children.forEach((mMesh, mIdx) => {
              const mc = marsMoons[mIdx];
              const a = time * mc.speed + mIdx * 1.8;
              mMesh.position.set(Math.cos(a) * mc.r, Math.sin(a) * 0.02, Math.sin(a) * mc.r);
            });
          }

          // Saturn Moons (Titan & Enceladus)
          if (planet.name === 'Saturn' && saturnMoonsGroupRef.current) {
            saturnMoonsGroupRef.current.position.copy(p3d);
            const saturnMoons = [
              { r: 0.88, speed: 3.4 }, // Enceladus (icy geyser moon just outside A ring)
              { r: 1.25, speed: 1.6 }, // Titan (massive hazy nitrogen-atmosphere moon)
            ];
            saturnMoonsGroupRef.current.children.forEach((mMesh, mIdx) => {
              const mc = saturnMoons[mIdx];
              const a = time * mc.speed + mIdx * 2.2;
              const tilt = (26.73 * Math.PI) / 180;
              const x0 = Math.cos(a) * mc.r;
              const z0 = Math.sin(a) * mc.r;
              mMesh.position.set(x0, -Math.sin(tilt) * z0 * 0.35, z0);
            });
          }
        }
      });
    }

    // 6. Dwarf Planets: Ceres & Pluto Positions
    if (dwarfGroupRef.current) {
      DWARF_PLANETS.forEach((dp, idx) => {
        const omega = (1.0 / Math.pow(dp.a_AU, 1.5)) * 1.85 * (0.4 + mid * 0.12);
        dwarfAnomaliesRef.current[idx] += delta * omega;
        const { position: dpPos } = getHeliocentricPosition(dp, dwarfAnomaliesRef.current[idx]);
        heliocentricPositions[dp.name] = dpPos;

        // Update Dwarf Keplerian Velocity Orbit Wake Shader (0 GC)
        const dwarfMat = dwarfOrbitLines[idx]?.material as THREE.ShaderMaterial;
        if (dwarfMat && dwarfMat.uniforms) {
          dwarfMat.uniforms.uPlanetAnomaly.value = dwarfAnomaliesRef.current[idx];
          dwarfMat.uniforms.uBass.value = bass;
          dwarfMat.uniforms.uBeatIntensity.value = beatIntensity;
        }

        const group = dwarfGroupRef.current?.children[idx] as THREE.Group;
        if (group) {
          group.position.copy(dpPos);
          const sphere = group.children[1] as THREE.Mesh;
          if (sphere) {
            sphere.rotation.y += delta * 0.12;
          }
        }
      });
    }

    // 7. Asteroid Belt Orbital Motion with Keplerian Shear
    if (asteroidPointsRef.current) {
      const { angles, radii, speeds, yOffsets, pos } = asteroidData;
      for (let i = 0; i < NUM_ASTEROIDS; i++) {
        angles[i] += delta * speeds[i] * (0.35 + high * 0.25);
        const theta = angles[i];
        const r = radii[i];
        pos[i * 3 + 0] = Math.cos(theta) * r;
        pos[i * 3 + 1] = yOffsets[i] + Math.sin(theta * 2.0) * 0.03;
        pos[i * 3 + 2] = Math.sin(theta) * r;
      }
      asteroidPointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  // Helper to resolve physical shader per planet name
  const getPlanetMaterial = (name: string) => {
    switch (name) {
      case 'Mercury': return mercuryMat;
      case 'Venus': return venusMat;
      case 'Earth': return earthMat;
      case 'Mars': return marsMat;
      case 'Jupiter': return jupiterShaderMat;
      case 'Saturn': return saturnAtmosphereMat;
      case 'Uranus': return uranusMat;
      case 'Neptune': return neptuneMat;
      default: return mercuryMat;
    }
  };

  return (
    <group position={[0, 0, 0]}>
      {/* 1. CENTRAL SUN WITH LIMB DARKENING, SUNSPOTS & BOILING PLASMA */}
      <mesh ref={sunMeshRef} material={sunShaderMat}>
        <sphereGeometry args={[0.62, 64, 64]} />
      </mesh>

      {/* Astrophysical Solar Corona Optical Diffraction Rays & Halo */}
      <SolarCoronaBillboard />

      {/* Relativistic Geodesic Oscilloscope Horizon (Ryoji Ikeda / Einstein General Relativity) */}
      {visibleLayers.rings && <RelativisticGeodesicHorizon />}

      {/* Hyperbolic Interstellar Bolide / Meteor (Ephemeral Gravitational Slingshot) */}
      <InterstellarBolide />

      {/* Johannes Kepler's Harmonices Mundi (Music of the Spheres 8:13 Earth-Venus Resonance Chords) */}
      <KeplerHarmonograph />

      {/* Solar Heliocentric Point Light for Real-time Day/Night Planetary Terminator */}
      <pointLight position={[0, 0, 0]} intensity={4.5} distance={42} decay={1.0} color="#ffffff" />

      {/* 2. CORONAL MASS EJECTION (CME) 2D RELATIVISTIC PLANAR BLAST SHOCKWAVE IN ECLIPTIC */}
      <group ref={cmeGroupRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 1.0, 192, 16]} />
          <primitive object={cmeShaderMat} attach="material" />
        </mesh>
      </group>

      {/* 4. KEPLERIAN 3D ELLIPTICAL ORBITS (NASA JPL EPHEMERIDES) */}
      {orbitLines.map((line, idx) => (
        <primitive key={idx} object={line} />
      ))}

      {/* Dwarf Planet Orbits (Ceres & Pluto) */}
      {dwarfOrbitLines.map((line, idx) => (
        <primitive key={idx} object={line} />
      ))}

      {/* 5. PLANETARY SPHERES WITH DEDICATED PHYSICAL ATMOSPHERE SHADERS */}
      <group ref={planetsGroupRef}>
        {JPL_PLANETS.map((planet) => {
          const visRadius = getVisualPlanetRadius(planet.radius_km, planet.isGasGiant);
          const pMat = getPlanetMaterial(planet.name);
          const tiltRad = (planet.obliquity_deg * Math.PI) / 180;
          const isFocused = selectedPlanet === planet.name;
          const isPlanetVisible = !selectedPlanet || selectedPlanet === 'Sol' || isFocused;
          const reticleInner = planet.hasRings ? 0.78 : visRadius * 1.55;
          const reticleOuter = planet.hasRings ? 0.83 : visRadius * 1.62;

          return (
            <group key={planet.name} visible={isPlanetVisible}>
              {/* Planetary Tracking Reticle Ring (NASA Mission Control Style - flat in ecliptic plane, hidden when focused) */}
              {!isFocused && (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[reticleInner, reticleOuter, 64]} />
                  <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.28}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}

              {/* Tilted & Rotating Planet Sphere Body */}
              <mesh
                rotation={[0, 0, tiltRad]}
                material={pMat}
              >
                <sphereGeometry args={[visRadius, 64, 64]} />

                {/* Earth's 3D Ionospheric Auroral Curtains (Aurora Borealis & Australis) */}
                {planet.name === 'Earth' && (
                  <group rotation={[0.18, 0, 0.08]}>
                    {/* North Polar Cascading Draperies (Aurora Borealis) */}
                    <mesh
                      position={[0, 0.118, 0]}
                      geometry={earthAuroraGeom}
                      material={earthAuroraMat}
                    />
                    <mesh
                      position={[0, 0.120, 0]}
                      rotation={[0, 0.75, 0]}
                      geometry={earthAuroraInnerGeom}
                      material={earthAuroraMat}
                    />
                    {/* South Polar Cascading Draperies (Aurora Australis) */}
                    <mesh
                      position={[0, -0.118, 0]}
                      rotation={[Math.PI, 0, 0]}
                      geometry={earthAuroraGeom}
                      material={earthAuroraMat}
                    />
                    <mesh
                      position={[0, -0.120, 0]}
                      rotation={[Math.PI, 0.75, 0]}
                      geometry={earthAuroraInnerGeom}
                      material={earthAuroraMat}
                    />
                  </group>
                )}

                {/* Jupiter's 3D Polar Auroral Crowns & Io Magnetic Footprint */}
                {planet.name === 'Jupiter' && (
                  <group rotation={[0.16, 0, 0.05]}>
                    {/* North Jovian Crown */}
                    <mesh
                      position={[0, 0.502, 0]}
                      geometry={jupiterAuroraGeom}
                      material={jupiterAuroraMat}
                    />
                    {/* South Jovian Crown */}
                    <mesh
                      position={[0, -0.502, 0]}
                      rotation={[Math.PI, 0, 0]}
                      geometry={jupiterAuroraGeom}
                      material={jupiterAuroraMat}
                    />
                  </group>
                )}

                {/* Saturn's Rings in equatorial plane (perpendicular to polar axis) */}
                {planet.hasRings && visibleLayers.rings && (
                  <mesh
                    ref={saturnRingsRef}
                    rotation={[-Math.PI / 2, 0, 0]}
                    geometry={saturnRingsGeom}
                    material={saturnRingShaderMat}
                  />
                )}

                {/* Uranus's Thin Dark Epsilon Ring tilted at 97.8 degrees */}
                {planet.name === 'Uranus' && visibleLayers.rings && (
                  <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[visRadius * 1.55, visRadius * 1.72, 96]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.18} side={THREE.DoubleSide} />
                  </mesh>
                )}
              </mesh>
            </group>
          );
        })}
      </group>

      {/* 6. DWARF PLANETS: CERES & PLUTO WITH PHYSICAL SHADERS */}
      <group ref={dwarfGroupRef}>
        {DWARF_PLANETS.map((dp, idx) => {
          const isPluto = dp.name === 'Pluto';
          const isFocused = selectedPlanet === dp.name;
          const isDwarfVisible = !selectedPlanet || selectedPlanet === 'Sol' || isFocused;

          return (
            <group key={dp.name} visible={isDwarfVisible}>
              {/* Planetary Tracking Reticle Ring (hidden when focused) */}
              {!isFocused && (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.075, 0.082, 64]} />
                  <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.22}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}

              {/* Dwarf Planet Sphere */}
              <mesh material={idx === 0 ? ceresMat : plutoMat} rotation={[0, isPluto ? 1.5 : 0.4, 0]}>
                <sphereGeometry args={[0.048, 48, 48]} />

                {/* Charon Binary Companion Moon for Pluto */}
                {isPluto && (
                  <mesh position={[-0.11, 0.03, 0.04]} material={charonMat}>
                    <sphereGeometry args={[0.024, 32, 32]} />
                  </mesh>
                )}
              </mesh>
            </group>
          );
        })}
      </group>

      {/* 7. EARTH'S MOON (LUNA) WITH AIRLESS REGOLITH SHADER */}
      <mesh ref={moonRef} material={moonMat} visible={!selectedPlanet || selectedPlanet === 'Sol' || selectedPlanet === 'Earth'}>
        <sphereGeometry args={[0.035, 32, 32]} />
      </mesh>

      {/* 8. JUPITER'S 4 GALILEAN MOONS (Io, Europa, Ganymede, Callisto) */}
      <group ref={jupiterMoonsGroupRef} visible={!selectedPlanet || selectedPlanet === 'Sol' || selectedPlanet === 'Jupiter'}>
        {[
          { rad: 0.040, mat: ioMat },
          { rad: 0.035, mat: europaMat },
          { rad: 0.052, mat: ganymedeMat },
          { rad: 0.046, mat: callistoMat },
        ].map((moonCfg, idx) => (
          <mesh key={idx} material={moonCfg.mat}>
            <sphereGeometry args={[moonCfg.rad, 32, 32]} />
          </mesh>
        ))}
      </group>

      {/* 8b. MARS MOONS: PHOBOS & DEIMOS */}
      <group ref={marsMoonsGroupRef} visible={!selectedPlanet || selectedPlanet === 'Sol' || selectedPlanet === 'Mars'}>
        {[
          { rad: 0.014, mat: moonMat },  // Phobos: cratered regolith
          { rad: 0.010, mat: ceresMat }, // Deimos: dark asteroid
        ].map((mCfg, idx) => (
          <mesh key={idx} material={mCfg.mat}>
            <sphereGeometry args={[mCfg.rad, 24, 24]} />
          </mesh>
        ))}
      </group>

      {/* 8c. SATURN MOONS: ENCELADUS & TITAN */}
      <group ref={saturnMoonsGroupRef} visible={!selectedPlanet || selectedPlanet === 'Sol' || selectedPlanet === 'Saturn'}>
        {[
          { rad: 0.020, mat: enceladusMat }, // Enceladus: brilliant water ice & South Polar Cryovolcanic Geysers
          { rad: 0.046, mat: venusMat },  // Titan: dense hazy atmosphere
        ].map((mCfg, idx) => (
          <mesh key={idx} material={mCfg.mat}>
            <sphereGeometry args={[mCfg.rad, 32, 32]} />
          </mesh>
        ))}
      </group>

      {/* 9. MAIN ASTEROID BELT WITH CLEARED KIRKWOOD GAPS */}
      <points ref={asteroidPointsRef} geometry={asteroidData.geom} material={asteroidData.mat} />

      {/* 10. KUIPER BELT ICY PLANETESIMALS */}
      <KuiperRadarBoundary />

      {/* 10b. EPHEMERAL OUTER HELIOSPHERIC PULSE RING (THREAD BLOOM ON BEATS) */}
      <OuterHeliosphericPulseRing />

      {/* 11. DEEP SPACE MILKY WAY GALACTIC PLANE & DUST RIFT BACKDROP */}
      <MilkyWayBackdrop />
    </group>
  );
};
