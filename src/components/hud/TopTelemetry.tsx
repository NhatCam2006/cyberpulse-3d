import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import {
  Activity,
  Camera,
  Eye,
  Crosshair,
  FolderOpen,
  Orbit,
  ChevronDown,
  X,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { SolarSystemHud } from './SolarSystemHud';
import { computeHorizonOrbitalPosition } from '../canvas/concepts/HorizonSpacecraft';

const _tempPos = new THREE.Vector3();
const _nextPos = new THREE.Vector3();

interface TopTelemetryProps {
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
}

const CELESTIAL_BODIES = [
  { id: '00', name: 'Sol', type: 'STAR' },
  { id: '01', name: 'Mercury', type: 'TERRESTRIAL' },
  { id: '02', name: 'Venus', type: 'TERRESTRIAL' },
  { id: '03', name: 'Earth', type: 'TERRESTRIAL' },
  { id: '04', name: 'Mars', type: 'TERRESTRIAL' },
  { id: '05', name: 'Ceres', type: 'ASTEROID' },
  { id: '06', name: 'Jupiter', type: 'GAS GIANT' },
  { id: '07', name: 'Saturn', type: 'GAS GIANT' },
  { id: '08', name: 'Uranus', type: 'ICE GIANT' },
  { id: '09', name: 'Neptune', type: 'ICE GIANT' },
  { id: '10', name: 'Pluto', type: 'DWARF' },
];

export const TopTelemetry: React.FC<TopTelemetryProps> = ({ onToggleDrawer, isDrawerOpen }) => {
  const [fps, setFps] = useState<number>(60);
  const [showPlanetMenu, setShowPlanetMenu] = useState<boolean>(false);
  const [showCompactMenu, setShowCompactMenu] = useState<boolean>(false);

  const cameraMode = usePlayerStore(state => state.cameraMode);
  const setCameraMode = usePlayerStore(state => state.setCameraMode);
  const activeTab = usePlayerStore(state => state.activeTab);
  const selectedPlanet = usePlayerStore(state => state.selectedPlanet);
  const setSelectedPlanet = usePlayerStore(state => state.setSelectedPlanet);
  const trackCount = usePlayerStore(state => state.tracks.length);
  const isLiveInput = usePlayerStore(state => state.isLiveInput);
  const toggleSystemAudio = usePlayerStore(state => state.toggleSystemAudio);

  // Direct DOM Refs for 60FPS telemetry (ZERO React re-renders)
  const bassBarRef = useRef<HTMLDivElement>(null);
  const midBarRef = useRef<HTMLDivElement>(null);
  const highBarRef = useRef<HTMLDivElement>(null);
  const beatBadgeRef = useRef<HTMLSpanElement>(null);

  // Spacecraft Observation Deck Telemetry Refs (0 GC direct text updates)
  const topVelRef = useRef<HTMLSpanElement>(null);
  const topDistRef = useRef<HTMLSpanElement>(null);
  const topStatusRef = useRef<HTMLSpanElement>(null);
  const lastTelemetryUpdateRef = useRef<number>(0);

  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateTimeRef = useRef<number>(performance.now());

  const handleCycleCameraMode = () => {
    if (cameraMode === 'vista') {
      setCameraMode('spacecraft');
    } else if (cameraMode === 'spacecraft') {
      setCameraMode('orbit');
    } else {
      setCameraMode('vista');
    }
  };
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      const now = performance.now();
      frameCountRef.current++;

      // 1. Update FPS state AT MOST twice per second (>= 500ms)
      if (now - lastFpsUpdateTimeRef.current >= 500) {
        const measuredFps = Math.round(
          (frameCountRef.current * 1000) / (now - lastFpsUpdateTimeRef.current)
        );
        setFps(Math.min(120, measuredFps));
        frameCountRef.current = 0;
        lastFpsUpdateTimeRef.current = now;
      }

      // 2. Direct DOM manipulation for Audio Telemetry (NO React re-renders)
      const engine = AudioEngine.getInstance();
      const audioData = engine.update();

      if (bassBarRef.current) {
        bassBarRef.current.style.transform = `scaleX(${Math.min(1, audioData.bass)})`;
      }
      if (midBarRef.current) {
        midBarRef.current.style.transform = `scaleX(${Math.min(1, audioData.mid)})`;
      }
      if (highBarRef.current) {
        highBarRef.current.style.transform = `scaleX(${Math.min(1, audioData.high)})`;
      }

      // Direct update of Beat Indicator via luminescence (Zero box, zero clutter)
      if (beatBadgeRef.current) {
        const isBeat = audioData.isBeat || audioData.beatIntensity > 0.3;
        if (isBeat) {
          beatBadgeRef.current.style.color = '#ffffff';
          beatBadgeRef.current.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.9)';
          beatBadgeRef.current.style.opacity = '1';
        } else {
          beatBadgeRef.current.style.color = '#71717a';
          beatBadgeRef.current.style.textShadow = 'none';
          beatBadgeRef.current.style.opacity = '0.5';
        }
      }

      // 3. Spacecraft Telemetry (Throttled to ~8 FPS / 120ms, 0 GC, 0 React re-renders)
      const currentCameraMode = usePlayerStore.getState().cameraMode;
      if (currentCameraMode === 'spacecraft' && now - lastTelemetryUpdateRef.current >= 120) {
        lastTelemetryUpdateRef.current = now;
        const timeSec = now * 0.001;
        const selPlanet = usePlayerStore.getState().selectedPlanet;
        const r = computeHorizonOrbitalPosition(timeSec, _tempPos, selPlanet);
        computeHorizonOrbitalPosition(timeSec + 0.1, _nextPos, selPlanet);
        const distDelta = _tempPos.distanceTo(_nextPos);
        const speedApprox = (distDelta / 0.1) * 3.4 + 11.2;

        if (topDistRef.current) {
          if (selPlanet && selPlanet !== 'Sol') {
            topDistRef.current.textContent = `LOW ORBIT // ${selPlanet.toUpperCase()}`;
          } else if (selPlanet === 'Sol') {
            topDistRef.current.textContent = `PERIHELION // SOL`;
          } else {
            topDistRef.current.textContent = `${r.toFixed(2)} AU`;
          }
        }
        if (topVelRef.current) {
          topVelRef.current.textContent = `${speedApprox.toFixed(1)} KM/S`;
        }
        if (topStatusRef.current) {
          topStatusRef.current.textContent = selPlanet ? `INSERTION: ${selPlanet.toUpperCase()}` : 'CRUISE: GRAND TOUR';
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none select-none px-6 pt-5 flex items-start justify-between">
      {/* 
        Pure Floating Swiss Brutalist Top Telemetry (Zero Box Encapsulation, Zero Glare)
        Directly matches the Left and Right Flank Architectural Etching
      */}
      
      {/* Left Section: System Identity & Real-Time Performance */}
      <div className="flex flex-col gap-1.5 border-l border-white/20 pl-2.5 font-mono pointer-events-auto">
        <div className="flex items-center">
          <span className="font-mono font-bold tracking-[0.22em] text-xs text-white">
            CYBERPULSE
          </span>
        </div>

        <div className="flex items-center gap-3 text-[9px] font-mono tracking-wider">
          <div className="flex items-baseline gap-1">
            <span className="text-[8px] text-neutral-500 uppercase tracking-widest">FPS</span>
            <span className={`font-bold font-mono text-[9px] ${fps >= 55 ? 'text-white' : fps >= 30 ? 'text-neutral-300' : 'text-neutral-500'}`}>
              {fps}
            </span>
          </div>

          <div className="w-px h-2 bg-white/15" />

          {/* Micro Frequency Meters (B / M / H) */}
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium text-[7.5px] tracking-wider">B</span>
              <div className="w-7 h-[2px] bg-white/10 overflow-hidden rounded-[1px]">
                <div
                  ref={bassBarRef}
                  className="h-full bg-white origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium text-[7.5px] tracking-wider">M</span>
              <div className="w-7 h-[2px] bg-white/10 overflow-hidden rounded-[1px]">
                <div
                  ref={midBarRef}
                  className="h-full bg-white/80 origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium text-[7.5px] tracking-wider">H</span>
              <div className="w-7 h-[2px] bg-white/10 overflow-hidden rounded-[1px]">
                <div
                  ref={highBarRef}
                  className="h-full bg-white/60 origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>
          </div>

          <div className="w-px h-2 bg-white/15 hidden sm:block" />

          {/* Pure Typographic Beat Indicator (Zero Box, Zero Dot, Kinetic Light Pulse) */}
          <span
            ref={beatBadgeRef}
            className="text-[8px] font-mono tracking-[0.2em] uppercase text-neutral-500 transition-all duration-75"
          >
            BEAT
          </span>
        </div>
      </div>

      {/* Center Section: Spacecraft Telemetry when aboard SS Horizon (Exact 50% Screen Center) */}
      {cameraMode === 'spacecraft' && (
        <div className="absolute left-1/2 -translate-x-1/2 top-5 hidden md:flex items-center gap-3 px-3.5 py-1 border border-white/15 bg-black/50 backdrop-blur-sm rounded-[1px] font-mono text-[9px] tracking-widest uppercase pointer-events-auto select-none shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          <span className="flex h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-white font-bold tracking-wider">SS HORIZON</span>
          <span className="text-white/20">//</span>
          <span className="text-neutral-400">V: <strong ref={topVelRef} className="text-white font-mono font-medium">11.9 KM/S</strong></span>
          <span className="text-white/20">//</span>
          <span className="text-neutral-400">R: <strong ref={topDistRef} className="text-white font-mono font-medium">0.07 AU</strong></span>
          <span className="text-white/20">//</span>
          <span ref={topStatusRef} className="text-neutral-300 font-medium">CRUISE: GRAND TOUR</span>
        </div>
      )}

      {/* Center Spacer: Pure Floating Horizon (No clutter) */}
      <div className="flex-1" />

      {/* Right Section: Compact Swiss Brutalist Controls (Matching Right Flank border-r) */}
      <div className="flex items-center gap-3 border-r border-white/20 pr-2.5 font-mono pointer-events-auto">
        <div className="flex items-center gap-3 text-xs">
          
          {/* Planet Inspection Selector Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPlanetMenu(!showPlanetMenu);
                setShowCompactMenu(false);
              }}
              title="Select Celestial Body to Inspect"
              className={`flex items-center gap-1 text-[10px] tracking-widest font-mono uppercase transition-colors cursor-pointer py-0.5 ${
                selectedPlanet ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>[ {selectedPlanet ? selectedPlanet.toUpperCase() : 'PLANETS'} ▾ ]</span>
              {selectedPlanet && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlanet(null);
                  }}
                  className="hover:text-white text-neutral-400 ml-0.5 cursor-pointer"
                  title="Return to Overview"
                >
                  <X className="w-3 h-3 inline" />
                </span>
              )}
            </button>

            {/* Celestial Bodies Grid Popover */}
            {showPlanetMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowPlanetMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-[340px] rounded-sm bg-[#08080c]/98 border border-white/20 shadow-2xl p-3 z-50 flex flex-col font-mono text-xs backdrop-blur-md">
                  <div className="flex items-center justify-between px-1 pb-2 text-[9px] uppercase tracking-widest font-mono border-b border-white/10">
                    <span className="text-white font-bold tracking-[0.16em]">CELESTIAL BODIES</span>
                    <button
                      onClick={() => {
                        setSelectedPlanet(null);
                        setShowPlanetMenu(false);
                      }}
                      className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      [ RESET VIEW ]
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
                    {CELESTIAL_BODIES.map((body) => (
                      <button
                        key={body.name}
                        onClick={() => {
                          setSelectedPlanet(body.name);
                          setShowPlanetMenu(false);
                        }}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-none text-left transition-all cursor-pointer font-mono ${
                          selectedPlanet === body.name
                            ? 'bg-white/15 text-white font-bold border-l-2 border-white pl-1.5'
                            : 'hover:bg-white/5 text-neutral-300 hover:text-white border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-[8px] text-neutral-500 font-normal w-3.5">{body.id}</span>
                          <span className="text-[10px] uppercase tracking-wider">{body.name}</span>
                        </div>
                        <span className="text-[7.5px] text-neutral-500 uppercase tracking-widest whitespace-nowrap ml-2">
                          {body.type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3-Mode Camera Selector */}
          <button
            onClick={handleCycleCameraMode}
            title={`Camera: ${
              cameraMode === 'vista'
                ? 'Golden Vista (Toàn cảnh Hệ Mặt Trời)'
                : cameraMode === 'spacecraft'
                ? 'Observation Deck (Hành khách trên boong tàu SS Horizon)'
                : 'Manual Orbit (Xoay chuột tự do)'
            }`}
            className={`flex items-center gap-1 text-[10px] tracking-widest font-mono uppercase transition-colors cursor-pointer py-0.5 ${
              cameraMode === 'vista'
                ? 'text-white font-bold'
                : cameraMode === 'spacecraft'
                ? 'text-white font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>[ {cameraMode === 'vista' ? 'VISTA' : cameraMode === 'spacecraft' ? 'PASSENGER DECK' : 'ORBIT'} ]</span>
          </button>

          {/* Compact System & Audio Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCompactMenu(!showCompactMenu);
                setShowPlanetMenu(false);
              }}
              title="System Menu & Audio Feed"
              className={`flex items-center gap-1 text-[10px] tracking-widest font-mono uppercase transition-colors cursor-pointer py-0.5 ${
                showCompactMenu || isLiveInput ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>[ {isLiveInput ? 'LIVE ON ▾' : 'MENU ▾'} ]</span>
            </button>

            {/* Compact Popover Dropdown */}
            {showCompactMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCompactMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-sm bg-[#08080c]/98 border border-white/20 shadow-2xl p-3 z-50 flex flex-col gap-2.5 font-mono text-xs backdrop-blur-md">
                  <div className="flex items-center justify-between px-1 text-[8.5px] text-neutral-400 uppercase tracking-widest border-b border-white/10 pb-1.5">
                    <span>AUDIO FEED</span>
                    {isLiveInput && (
                      <span className="text-white font-bold tracking-wider">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      toggleSystemAudio();
                      setShowCompactMenu(false);
                    }}
                    className={`w-full py-2 px-3 text-[10px] uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center justify-center font-mono ${
                      isLiveInput
                        ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.15)]'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                    }`}
                  >
                    <span>{isLiveInput ? 'DISCONNECT SPOTIFY' : 'CONNECT SPOTIFY'}</span>
                  </button>

                  <div className="border-t border-white/10 pt-1.5">
                    <button
                      onClick={() => {
                        onToggleDrawer();
                        setShowCompactMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-none hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer text-[10px] flex items-center justify-between"
                    >
                      <span>TRACK ARCHIVE</span>
                      <span className="text-neutral-500 text-[8px]">{trackCount} TRACKS</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Floating Detailed Ephemeris Card (Appears gracefully on the left flank ONLY when a planet is selected) */}
      <SolarSystemHud />
    </header>
  );
};
