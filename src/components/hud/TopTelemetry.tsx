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
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none select-none">
      {/* 
        Single-Row Unified Top Telemetry Bar:
        Chiaroscuro Dark Architecture, Zero Glare, Zero 2nd Row Clutter
      */}
      <div className="mx-3 mt-3 px-4 py-1.5 rounded bg-[#08080c]/90 border border-white/10 shadow-xl flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-sm">
        
        {/* Left Section: Typography & Real-time Meters */}
        <div className="flex items-center gap-3.5">
          {/* Logo Identity */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/90 shadow-[0_0_4px_#ffffff]" />
            <span className="font-mono font-bold tracking-widest text-xs text-white">
              CYBERPULSE
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* FPS Counter */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] bg-[#101014] px-2 py-0.5 rounded border border-white/10">
            <Activity className="w-3 h-3 text-neutral-400" />
            <span className="text-neutral-500">FPS:</span>
            <span className={`font-bold ${fps >= 55 ? 'text-white' : fps >= 30 ? 'text-neutral-400' : 'text-neutral-600'}`}>
              {fps}
            </span>
          </div>

          {/* Micro Frequency Meters (B / M / H) */}
          <div className="hidden md:flex items-center gap-2.5 font-mono text-[9px]">
            {/* Bass */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 font-semibold">B</span>
              <div className="w-10 h-1.5 bg-[#14141a] rounded-none overflow-hidden border border-white/10 p-0">
                <div
                  ref={bassBarRef}
                  className="h-full bg-white origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>

            {/* Mid */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 font-semibold">M</span>
              <div className="w-10 h-1.5 bg-[#14141a] rounded-none overflow-hidden border border-white/10 p-0">
                <div
                  ref={midBarRef}
                  className="h-full bg-neutral-300 origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>

            {/* High */}
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 font-semibold">H</span>
              <div className="w-10 h-1.5 bg-[#14141a] rounded-none overflow-hidden border border-white/10 p-0">
                <div
                  ref={highBarRef}
                  className="h-full bg-neutral-400 origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>
          </div>

          {/* BEAT DETECTED Badge */}
          <div
            ref={beatBadgeRef}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono tracking-widest border border-white/10 bg-[#0a0a0e] text-neutral-500 transition-colors duration-75"
          >
            <div
              ref={beatDotRef}
              className="w-1.5 h-1.5 rounded-full bg-neutral-600"
            />
            BEAT
          </div>
        </div>

        {/* Center Section: Minimal Clean Title (Zero Glare, Clean English) */}
        <div className="flex items-center gap-2 px-3 py-1 text-xs font-mono tracking-widest text-neutral-300 font-semibold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_#ffffff]" />
          <span>SOLAR SYSTEM</span>
        </div>

        {/* Right Section: Compact Controls & Celestial Popover */}
        <div className="flex items-center gap-2">
          
          {/* Planet Inspection Selector Popover (Integrated in Top Bar, Eliminating Row 2) */}
          {activeTab === 'system' && (
            <div className="relative">
              <button
                onClick={() => setShowPlanetMenu(!showPlanetMenu)}
                title="Select Celestial Body to Inspect"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-all cursor-pointer ${
                  selectedPlanet
                    ? 'bg-white/20 text-white border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.15)] font-bold'
                    : 'bg-[#101014] text-neutral-300 border-white/15 hover:border-white/30 hover:text-white'
                }`}
              >
                <Orbit className="w-3.5 h-3.5 text-neutral-300" />
                <span className="font-bold tracking-wider uppercase text-[10px]">
                  {selectedPlanet ? `${selectedPlanet.toUpperCase()}` : 'PLANETS'}
                </span>
                {selectedPlanet ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlanet(null);
                    }}
                    className="hover:text-white text-neutral-400 ml-0.5 p-0.5 cursor-pointer"
                    title="Return to Overview"
                  >
                    <X className="w-3 h-3" />
                  </span>
                ) : (
                  <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform duration-150 ${showPlanetMenu ? 'rotate-180' : ''}`} />
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
          )}


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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-all cursor-pointer ${
              cameraMode === 'vista'
                ? 'bg-white/15 text-white border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.12)]'
                : cameraMode === 'spacecraft'
                ? 'bg-white/20 text-white border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.15)]'
                : 'bg-[#101014] text-neutral-400 border-white/15 hover:text-white'
            }`}
          >
            {cameraMode === 'vista' && <Eye className="w-3 h-3 text-white" />}
            {cameraMode === 'spacecraft' && <Crosshair className="w-3 h-3 text-white animate-pulse" />}
            {cameraMode === 'orbit' && <Camera className="w-3 h-3 text-neutral-400" />}
            <span className="font-bold tracking-wider uppercase text-[10px]">
              {cameraMode === 'vista'
                ? 'VISTA'
                : cameraMode === 'spacecraft'
                ? 'PASSENGER DECK'
                : 'ORBIT'}
            </span>
          </button>


          {/* Track Drawer Button */}
          <button
            onClick={onToggleDrawer}
            title="Open Track Archive"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
              isDrawerOpen
                ? 'bg-white/20 text-white border-white/30'
                : 'bg-[#101014] text-neutral-300 border-white/15 hover:border-white/30 hover:text-white'
            }`}
          >
            <FolderOpen className="w-3 h-3" />
            <span className="hidden sm:inline">TRACKS</span>
            {trackCount > 0 && (
              <span className="bg-white/15 px-1 rounded text-[9px] font-bold text-neutral-300">
                {trackCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Floating Detailed Ephemeris Card (Appears gracefully on the left flank ONLY when a planet is selected) */}
      <SolarSystemHud />
    </header>
  );
};
