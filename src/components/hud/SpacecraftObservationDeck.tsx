import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { HORIZON_ORBIT, computeHorizonOrbitalPosition } from '../canvas/concepts/HorizonSpacecraft';
import * as THREE from 'three';

const _tempPos = new THREE.Vector3();
const _nextPos = new THREE.Vector3();

export const SpacecraftObservationDeck: React.FC = () => {
  const cameraMode = usePlayerStore(state => state.cameraMode);
  const activeTab = usePlayerStore(state => state.activeTab);

  // Direct DOM Refs for 0-GC 60FPS whisper telemetry updates
  const distRef = useRef<HTMLSpanElement>(null);
  const velRef = useRef<HTMLSpanElement>(null);
  const cruiseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (cameraMode !== 'spacecraft' || activeTab !== 'system') return;

    let animId: number;
    let lastUpdate = 0;

    const updateLoop = (now: number) => {
      // Throttle DOM text updates to ~8 FPS (every 125ms) to preserve 120FPS GPU rendering
      if (now - lastUpdate >= 125) {
        lastUpdate = now;
        const timeSec = now * 0.001;

        const selPlanet = usePlayerStore.getState().selectedPlanet;
        const r = computeHorizonOrbitalPosition(timeSec, _tempPos, selPlanet);
        computeHorizonOrbitalPosition(timeSec + 0.1, _nextPos, selPlanet);
        const distDelta = _tempPos.distanceTo(_nextPos);
        const speedApprox = (distDelta / 0.1) * 3.4 + 11.2; // ~12 - 16 km/s orbital cruise

        if (distRef.current) {
          if (selPlanet && selPlanet !== 'Sol') {
            distRef.current.textContent = `LOW ORBIT // ${selPlanet.toUpperCase()}`;
          } else if (selPlanet === 'Sol') {
            distRef.current.textContent = `PERIHELION // SOL`;
          } else {
            distRef.current.textContent = `${r.toFixed(2)} AU`;
          }
        }
        if (velRef.current) {
          velRef.current.textContent = `${speedApprox.toFixed(1)} KM/S`;
        }
        if (cruiseRef.current) {
          cruiseRef.current.textContent = selPlanet ? `INSERTION: ${selPlanet.toUpperCase()}` : 'CRUISE: GRAND TOUR';
        }
      }
      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [cameraMode, activeTab]);

  if (cameraMode !== 'spacecraft' || activeTab !== 'system') {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 font-mono overflow-hidden">
      {/* 
        1. Fused Quartz Perimeter Vignette:
        Subtle optical density falloff simulating radiation-hardened multi-ply cupola glass
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 92% 86% at 50% 50%, transparent 68%, rgba(5, 5, 8, 0.45) 86%, rgba(2, 2, 4, 0.88) 100%)',
        }}
      />

      {/* 
        2. Top Canopy Brow Bulkhead:
        Sleek monolithic titanium frame with a razor-thin 1px silver highlight bevel
      */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#0a0c10]/90 to-transparent flex items-start justify-center pt-2">
        <div className="w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      {/* 
        3. 4-Corner Diagonal Chamfer Structural Mullions:
        Titanium bridge trusses framing the panoramic observation viewport
      */}
      {/* Top-Left Chamfer Truss */}
      <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-[1px] bg-white/20 origin-top-left rotate-45 transform translate-y-3" />
        <div className="absolute top-3 left-3 text-[9px] text-white/30 tracking-widest uppercase">
          MULLION // A1
        </div>
      </div>

      {/* Top-Right Chamfer Truss */}
      <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-[1px] bg-white/20 origin-top-right -rotate-45 transform translate-y-3" />
        <div className="absolute top-3 right-3 text-[9px] text-white/30 tracking-widest uppercase text-right">
          MULLION // A2
        </div>
      </div>

      {/* 
        4. Central Sub-Millimeter Sighting Graticule:
        Delicate optical target tick marks reminiscent of Apollo / Hubble viewfinders
      */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Central hairline cross */}
        <div className="relative w-8 h-8 flex items-center justify-center opacity-40">
          <div className="absolute w-full h-[1px] bg-white/40" />
          <div className="absolute h-full w-[1px] bg-white/40" />
          <div className="w-1.5 h-1.5 rounded-full border border-white/60 bg-transparent" />
        </div>

        {/* Framing tick brackets [  ] */}
        <div className="absolute w-36 h-24 border-t border-b border-white/10 flex justify-between">
          <div className="w-2 h-full border-l border-white/20" />
          <div className="w-2 h-full border-r border-white/20" />
        </div>
      </div>

      {/* 
        5. Lower Whisper Telemetry:
        Understated, hyper-minimalist status strip directly above player deck.
        Zero visual noise, exactly 1 clean line.
      */}
      <div className="absolute bottom-28 left-0 right-0 flex justify-center items-center">
        <div className="flex items-center gap-3 px-4 py-1 rounded bg-[#08090d]/90 border border-white/20 backdrop-blur-md text-[10px] tracking-widest uppercase text-neutral-400 shadow-2xl">
          <span className="flex h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-white font-bold">SS HORIZON</span>
          <span className="text-neutral-600">//</span>
          <span className="text-neutral-300">OBSERVATION DECK</span>
          <span className="text-neutral-600">//</span>
          <span className="text-neutral-400">R: <strong ref={distRef} className="text-white font-mono">16.20 AU</strong></span>
          <span className="text-neutral-600">//</span>
          <span className="text-neutral-400">V: <strong ref={velRef} className="text-white font-mono">14.2 KM/S</strong></span>
          <span className="text-neutral-600">//</span>
          <span ref={cruiseRef} className="text-neutral-400">CRUISE: GRAND TOUR</span>
        </div>
      </div>
    </div>
  );
};
