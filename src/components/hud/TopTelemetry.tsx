import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  Radio,
  Camera,
  Layers,
  Eye,
  Rocket,
  Crosshair,
  FolderOpen,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { SolarSystemHud } from './SolarSystemHud';

interface TopTelemetryProps {
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
}

export const TopTelemetry: React.FC<TopTelemetryProps> = ({ onToggleDrawer, isDrawerOpen }) => {
  // Only FPS is kept in state, updated at most twice a second (every 500ms)
  const [fps, setFps] = useState<number>(60);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  const cameraMode = usePlayerStore(state => state.cameraMode);
  const setCameraMode = usePlayerStore(state => state.setCameraMode);
  const activeTab = usePlayerStore(state => state.activeTab);
  const setActiveTab = usePlayerStore(state => state.setActiveTab);
  const visibleLayers = usePlayerStore(state => state.visibleLayers);
  const toggleLayer = usePlayerStore(state => state.toggleLayer);
  const isDemoSynth = usePlayerStore(state => state.isDemoSynth);
  const toggleDemoSynth = usePlayerStore(state => state.toggleDemoSynth);
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
          beatBadgeRef.current.style.borderColor = '#ffffff';
          beatBadgeRef.current.style.backgroundColor = '#ffffff';
          beatBadgeRef.current.style.color = '#000000';
          beatDotRef.current.style.backgroundColor = '#000000';
          beatDotRef.current.style.boxShadow = '0 0 10px #ffffff';
        } else {
          beatBadgeRef.current.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          beatBadgeRef.current.style.backgroundColor = '#080808';
          beatBadgeRef.current.style.color = '#666666';
          beatDotRef.current.style.backgroundColor = '#333333';
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
      {/* Top Monochrome Telemetry Bar: NO backdrop-blur, solid #080808 */}
      <div className="mx-3 mt-3 px-4 py-2 rounded bg-[#080808] border border-white/15 shadow-2xl flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        
        {/* Left Section: Nothing OS Style Typography & Meters */}
        <div className="flex items-center gap-4">
          {/* Logo / Dot Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
            <div>
              <div className="font-mono font-bold tracking-widest text-xs text-white">
                CYBERPULSE <span className="text-neutral-500 font-normal">/ 01</span>
              </div>
              <div className="text-[9px] font-mono tracking-wider text-neutral-400 uppercase">
                CELESTIAL MECHANICS // KEPLER ORRERY
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* FPS Counter (State updated max 2 times/sec) */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] bg-[#101010] px-2 py-0.5 rounded border border-white/10">
            <Activity className="w-3 h-3 text-neutral-400" />
            <span className="text-neutral-500">FPS:</span>
            <span className={`font-bold ${fps >= 55 ? 'text-white' : fps >= 30 ? 'text-neutral-400' : 'text-neutral-600'}`}>
              {fps}
            </span>
          </div>

          {/* Frequency Meters updated via scaleX on Ref (ZERO React re-renders) */}
          <div className="hidden md:flex items-center gap-3 font-mono text-[10px]">
            {/* Bass */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-semibold">B</span>
              <div className="w-12 h-1.5 bg-[#141414] rounded-none overflow-hidden border border-white/10 p-0">
                <div
                  ref={bassBarRef}
                  className="h-full bg-white origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>

            {/* Mid */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-semibold">M</span>
              <div className="w-12 h-1.5 bg-[#141414] rounded-none overflow-hidden border border-white/10 p-0">
                <div
                  ref={midBarRef}
                  className="h-full bg-neutral-300 origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>

            {/* High */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-semibold">H</span>
              <div className="w-12 h-1.5 bg-[#141414] rounded-none overflow-hidden border border-white/10 p-0">
                <div
                  ref={highBarRef}
                  className="h-full bg-neutral-400 origin-left will-change-transform"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>
          </div>

          {/* BEAT DETECTED Badge (updated via direct ref manipulation) */}
          <div
            ref={beatBadgeRef}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-widest border border-white/15 bg-[#080808] text-neutral-500 transition-colors duration-75"
          >
            <div
              ref={beatDotRef}
              className="w-1.5 h-1.5 rounded-full bg-neutral-600"
            />
            BEAT
          </div>
        </div>

        {/* Center Section: Tab Switcher (HỆ MẶT TRỜI vs KIỂM TRA TÀU 3D) */}
        <div className="flex items-center gap-1 p-0.5 rounded bg-[#101018] border border-white/20 select-none">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1 rounded text-xs font-mono font-bold tracking-wider transition-all ${
              activeTab === 'system'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            ☉ HỆ MẶT TRỜI
          </button>
          <button
            onClick={() => setActiveTab('hangar')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold tracking-wider transition-all ${
              activeTab === 'hangar'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>KIỂM TRA TÀU (3D HANGAR)</span>
          </button>
        </div>

        {/* Right Section: Minimalist Controls */}
        <div className="flex items-center gap-2">
          
          {/* DEMO SYNTH TOGGLE (Minimalist Nothing OS button) */}
          <button
            onClick={toggleDemoSynth}
            title="Toggle 128 BPM Procedural Synthwave Demo"
            className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono font-medium tracking-wider uppercase border transition-colors ${
              isDemoSynth
                ? 'bg-white text-black border-white'
                : 'bg-[#101010] text-neutral-300 border-white/15 hover:border-white/40 hover:text-white'
            }`}
          >
            <Radio className={`w-3 h-3 ${isDemoSynth ? 'animate-pulse text-black' : 'text-neutral-400'}`} />
            <span>SYNTH DEMO</span>
            <span
              className={`text-[9px] px-1 rounded-sm font-bold ${
                isDemoSynth ? 'bg-black text-white' : 'bg-[#1c1c1c] text-neutral-400'
              }`}
            >
              {isDemoSynth ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* 3-Mode Camera Selector (VISTA -> PASSENGER DECK -> ORBIT) */}
          <button
            onClick={handleCycleCameraMode}
            title={`Camera: ${
              cameraMode === 'vista'
                ? 'Golden Vista (Toàn cảnh Hệ Mặt Trời chuẩn xác)'
                : cameraMode === 'spacecraft'
                ? 'Observation Deck (Góc nhìn Hành khách trên boong tàu SS Horizon)'
                : 'Manual Orbit (Xoay chuột tự do)'
            }`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-all cursor-pointer ${
              cameraMode === 'vista'
                ? 'bg-white/10 text-white border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.15)]'
                : cameraMode === 'spacecraft'
                ? 'bg-white text-black border-white shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                : 'bg-[#101010] text-neutral-400 border-white/15 hover:text-white'
            }`}
          >
            {cameraMode === 'vista' && <Eye className="w-3 h-3 text-white" />}
            {cameraMode === 'spacecraft' && <Crosshair className="w-3 h-3 text-black animate-pulse" />}
            {cameraMode === 'orbit' && <Camera className="w-3 h-3 text-neutral-400" />}
            <span className="font-bold tracking-wider uppercase text-[10px]">
              {cameraMode === 'vista'
                ? 'VISTA'
                : cameraMode === 'spacecraft'
                ? 'PASSENGER DECK'
                : 'ORBIT'}
            </span>
          </button>

          {/* Layer Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              title="Toggle 3D Scene Layers"
              className={`p-1 rounded border transition-colors ${
                showLayerMenu
                  ? 'bg-white text-black border-white'
                  : 'bg-[#101010] text-neutral-400 border-white/15 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-2 w-40 rounded bg-[#080808] border border-white/20 shadow-2xl p-2 z-50 flex flex-col gap-1 font-mono text-xs">
                <div className="text-[10px] text-neutral-500 px-2 py-1 uppercase tracking-wider font-semibold border-b border-white/10">
                  Layers
                </div>
                {(['core', 'rings', 'particles'] as const).map((layer) => (
                  <button
                    key={layer}
                    onClick={() => toggleLayer(layer)}
                    className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#141414] text-left transition-colors"
                  >
                    <span className="capitalize text-neutral-300">{layer}</span>
                    <Eye
                      className={`w-3 h-3 ${
                        visibleLayers[layer] ? 'text-white' : 'text-neutral-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Track Drawer Button */}
          <button
            onClick={onToggleDrawer}
            title="Open Track Archive"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
              isDrawerOpen
                ? 'bg-white text-black border-white'
                : 'bg-[#101010] text-neutral-300 border-white/15 hover:border-white/40 hover:text-white'
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

      {/* Planetary Mission Control Sub-HUD (Active exclusively in Solar System mode) */}
      <SolarSystemHud />
    </header>
  );
};
