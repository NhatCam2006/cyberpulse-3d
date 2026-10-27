import React, { useEffect, useState, useRef } from 'react';
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

interface TopTelemetryProps {
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
}

const CELESTIAL_BODIES = [
  { name: 'Sol', symbol: '☉', type: 'STAR' },
  { name: 'Mercury', symbol: '☿', type: 'TERRESTRIAL' },
  { name: 'Venus', symbol: '♀', type: 'TERRESTRIAL' },
  { name: 'Earth', symbol: '🜨', type: 'TERRESTRIAL' },
  { name: 'Mars', symbol: '♂', type: 'TERRESTRIAL' },
  { name: 'Jupiter', symbol: '♃', type: 'GAS GIANT' },
  { name: 'Saturn', symbol: '♄', type: 'GAS GIANT' },
  { name: 'Uranus', symbol: '♅', type: 'ICE GIANT' },
  { name: 'Neptune', symbol: '♆', type: 'ICE GIANT' },
  { name: 'Ceres', symbol: '⚳', type: 'ASTEROID' },
  { name: 'Pluto', symbol: '♇', type: 'DWARF' },
];

export const TopTelemetry: React.FC<TopTelemetryProps> = ({ onToggleDrawer, isDrawerOpen }) => {
  const [fps, setFps] = useState<number>(60);
  const [showPlanetMenu, setShowPlanetMenu] = useState<boolean>(false);

  const cameraMode = usePlayerStore(state => state.cameraMode);
  const setCameraMode = usePlayerStore(state => state.setCameraMode);
  const activeTab = usePlayerStore(state => state.activeTab);
  const selectedPlanet = usePlayerStore(state => state.selectedPlanet);
  const setSelectedPlanet = usePlayerStore(state => state.setSelectedPlanet);
  const trackCount = usePlayerStore(state => state.tracks.length);

  // Direct DOM Refs for 60FPS telemetry (ZERO React re-renders)
  const bassBarRef = useRef<HTMLDivElement>(null);
  const midBarRef = useRef<HTMLDivElement>(null);
  const highBarRef = useRef<HTMLDivElement>(null);
  const beatBadgeRef = useRef<HTMLDivElement>(null);
  const beatDotRef = useRef<HTMLDivElement>(null);

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

      // Direct update of Beat Indicator via style/class
      if (beatBadgeRef.current && beatDotRef.current) {
        const isBeat = audioData.isBeat || audioData.beatIntensity > 0.3;
        if (isBeat) {
          beatBadgeRef.current.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          beatBadgeRef.current.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
          beatBadgeRef.current.style.color = '#ffffff';
          beatDotRef.current.style.backgroundColor = '#ffffff';
          beatDotRef.current.style.boxShadow = '0 0 6px #ffffff';
        } else {
          beatBadgeRef.current.style.borderColor = 'rgba(255, 255, 255, 0.10)';
          beatBadgeRef.current.style.backgroundColor = '#0a0a0e';
          beatBadgeRef.current.style.color = '#555566';
          beatDotRef.current.style.backgroundColor = '#33333f';
          beatDotRef.current.style.boxShadow = 'none';
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
      <div className="flex flex-col gap-1 border-l border-white/20 pl-2.5 font-mono pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
          <span className="font-mono font-bold tracking-[0.2em] text-xs text-white">
            CYBERPULSE
          </span>
          <span className="text-[10px] text-neutral-500 font-normal">/ 01</span>
        </div>

        <div className="flex items-center gap-2.5 text-[9px] text-neutral-400 font-mono tracking-wider">
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">FPS</span>
            <span className={`font-bold ${fps >= 55 ? 'text-white' : fps >= 30 ? 'text-neutral-300' : 'text-neutral-500'}`}>
              {fps}
            </span>
          </div>

          <span className="text-white/15">|</span>

          {/* Micro Frequency Meters (B / M / H) */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-neutral-500 font-semibold text-[8px]">B</span>
              <div className="w-6 h-1 bg-white/10 overflow-hidden">
                <div
                  ref={bassBarRef}
                  className="h-full bg-white origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-neutral-500 font-semibold text-[8px]">M</span>
              <div className="w-6 h-1 bg-white/10 overflow-hidden">
                <div
                  ref={midBarRef}
                  className="h-full bg-white/80 origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-neutral-500 font-semibold text-[8px]">H</span>
              <div className="w-6 h-1 bg-white/10 overflow-hidden">
                <div
                  ref={highBarRef}
                  className="h-full bg-white/60 origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>
          </div>

          <span className="text-white/15 hidden sm:inline">|</span>

          {/* Micro Beat Indicator */}
          <div
            ref={beatBadgeRef}
            className="flex items-center gap-1 text-[8.5px] tracking-widest text-neutral-500 transition-colors duration-75"
          >
            <div
              ref={beatDotRef}
              className="w-1.5 h-1.5 rounded-full bg-neutral-600 transition-all duration-75"
            />
            <span>BEAT</span>
          </div>
        </div>
      </div>

      {/* Center Section: Pure Floating Reticle Coordinates */}
      <div className="hidden md:flex items-center gap-2 font-mono text-[9.5px] tracking-[0.25em] text-neutral-400 select-none pt-0.5">
        <span className="text-white/30">+</span>
        <span className="text-neutral-300 font-semibold">SOLAR SYSTEM</span>
        <span className="text-neutral-600">//</span>
        <span className="text-neutral-500">DE440 EPHEMERIS</span>
        <span className="text-white/30">+</span>
      </div>

      {/* Right Section: Compact Swiss Brutalist Controls (Matching Right Flank border-r) */}
      <div className="flex flex-col items-end gap-1 border-r border-white/20 pr-2.5 font-mono pointer-events-auto">
        <div className="flex items-center gap-3 text-xs">
          
          {/* Planet Inspection Selector Popover */}
          <div className="relative">
            <button
              onClick={() => setShowPlanetMenu(!showPlanetMenu)}
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
              <div className="absolute right-0 mt-2 w-64 rounded bg-[#08080c]/95 border border-white/20 shadow-2xl p-2.5 z-50 flex flex-col gap-1 font-mono text-xs backdrop-blur-md">
                <div className="flex items-center justify-between px-1.5 py-1 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold border-b border-white/10">
                  <span>MISSION CONTROL</span>
                  <button
                    onClick={() => {
                      setSelectedPlanet(null);
                      setShowPlanetMenu(false);
                    }}
                    className="text-neutral-400 hover:text-white text-[9px] underline cursor-pointer"
                  >
                    [ OVERVIEW ]
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 mt-1 max-h-64 overflow-y-auto pr-1">
                  {CELESTIAL_BODIES.map((body) => (
                    <button
                      key={body.name}
                      onClick={() => {
                        setSelectedPlanet(body.name);
                        setShowPlanetMenu(false);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors cursor-pointer ${
                        selectedPlanet === body.name
                          ? 'bg-white/20 text-white font-bold border border-white/30'
                          : 'hover:bg-white/5 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-neutral-400 text-xs">{body.symbol}</span>
                        <span>{body.name}</span>
                      </span>
                      <span className="text-[8px] text-neutral-500">{body.type}</span>
                    </button>
                  ))}
                </div>
              </div>
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

          {/* Track Drawer Button */}
          <button
            onClick={onToggleDrawer}
            title="Open Track Archive"
            className={`flex items-center gap-1 text-[10px] tracking-widest font-mono uppercase transition-colors cursor-pointer py-0.5 ${
              isDrawerOpen ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>[ ARCHIVE {trackCount > 0 ? `// 0${trackCount}` : ''} ]</span>
          </button>
        </div>

        <div className="text-[8.5px] text-neutral-500 tracking-widest">
          OPTICAL GRATICULE // 46° FOV
        </div>
      </div>

      {/* Floating Detailed Ephemeris Card (Appears gracefully on the left flank ONLY when a planet is selected) */}
      <SolarSystemHud />
    </header>
  );
};
