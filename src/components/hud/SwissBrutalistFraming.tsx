import React, { useEffect, useRef } from 'react';
import { AudioEngine } from '../../audio/AudioEngine';
import { usePlayerStore } from '../../store/usePlayerStore';

const SOLAR_FRAMING = {
  topLeft: '',
  topRight: 'KEPLER T^2 ∝ a^3 // RESONANCE',
  bottomLeft: 'CASSINI DIVISION // SATURN RINGS',
  bottomRight: 'KIRKWOOD GAPS // ASTEROID BELT',
  leftHeader: 'CELESTIAL EPHEMERIS',
  leftParamName: 'SOLAR MASS M_⊙',
  leftParamVal: '1.989e30 KG',
  rightHeader: 'CORONAL SHOCKWAVE',
  rightParamName: 'SOLAR WIND VELOCITY',
};

export const SwissBrutalistFraming: React.FC = () => {
  const dominantFreqRef = useRef<HTMLSpanElement>(null);
  const acousticEnergyRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // 120ms interval for direct DOM textContent updates (ZERO React re-renders)
    const interval = setInterval(() => {
      const engine = AudioEngine.getInstance();
      
      if (dominantFreqRef.current) {
        dominantFreqRef.current.textContent = `${engine.dominantFreqHz} HZ`;
      }
      if (acousticEnergyRef.current) {
        const pct = Math.round(engine.acousticEnergy * 100);
        acousticEnergyRef.current.textContent = `${pct}%`;
      }
      if (phaseRef.current) {
        const phaseVal = ((engine.bass * 180) % 360).toFixed(1);
        phaseRef.current.textContent = `${phaseVal}°`;
      }
      const strainEl = document.getElementById('strain-tensor-val');
      if (strainEl) {
        const windSpeed = (450 + engine.bass * 350).toFixed(0);
        strainEl.textContent = `v_sw = ${windSpeed} KM/S`;
      }
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const cameraMode = usePlayerStore(state => state.cameraMode);
  const isSpacecraft = cameraMode === 'spacecraft';

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-10 select-none font-mono transition-opacity duration-700 ease-in-out ${
        isSpacecraft ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* 4 Corner Crosshair Reticles (+) */}
      <div className="opacity-60">
        {/* Top-Left */}
        <div className="absolute top-16 left-6 flex items-center gap-1.5 text-neutral-500 text-[10px] tracking-widest">
          <span className="text-white text-xs font-bold">+</span>
          {SOLAR_FRAMING.topLeft && <span>{SOLAR_FRAMING.topLeft}</span>}
        </div>

        {/* Top-Right */}
        <div className="absolute top-16 right-6 flex items-center gap-1.5 text-neutral-500 text-[10px] tracking-widest">
          <span>{SOLAR_FRAMING.topRight}</span>
          <span className="text-white text-xs font-bold">+</span>
        </div>

        {/* Bottom-Left */}
        <div className="absolute bottom-20 left-6 flex items-center gap-1.5 text-neutral-500 text-[10px] tracking-widest">
          <span className="text-white text-xs font-bold">+</span>
          <span>{SOLAR_FRAMING.bottomLeft}</span>
        </div>

        {/* Bottom-Right */}
        <div className="absolute bottom-20 right-6 flex items-center gap-1.5 text-neutral-500 text-[10px] tracking-widest">
          <span>{SOLAR_FRAMING.bottomRight}</span>
          <span className="text-white text-xs font-bold">+</span>
        </div>
      </div>

      {/* Left Flank Technical Readout */}
      <div className="hidden lg:flex absolute left-6 top-1/2 -translate-y-1/2 flex-col gap-2 text-[9px] tracking-widest text-neutral-500 border-l border-white/10 pl-2">
        <div className="text-[8px] text-neutral-600 uppercase">{SOLAR_FRAMING.leftHeader}</div>
        <div>
          <span className="text-neutral-400">DOMINANT FREQ</span>
          <div className="text-white font-bold text-[11px] mt-0.5">
            <span ref={dominantFreqRef}>120 HZ</span>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-neutral-400">{SOLAR_FRAMING.leftParamName}</span>
          <div className="text-neutral-300 font-medium text-[10px] mt-0.5 font-mono">
            {SOLAR_FRAMING.leftParamVal}
          </div>
        </div>
      </div>

      {/* Right Flank Technical Readout */}
      <div className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col items-end gap-2 text-[9px] tracking-widest text-neutral-500 border-r border-white/10 pr-2">
        <div className="text-[8px] text-neutral-600 uppercase">{SOLAR_FRAMING.rightHeader}</div>
        <div className="text-right">
          <span className="text-neutral-400">ACOUSTIC ENERGY</span>
          <div className="text-white font-bold text-[11px] mt-0.5">
            <span ref={acousticEnergyRef}>0%</span>
          </div>
        </div>
        <div className="text-right mt-2">
          <span className="text-neutral-400">{SOLAR_FRAMING.rightParamName}</span>
          <div className="text-neutral-300 font-medium text-[10px] mt-0.5 font-mono">
            <span id="strain-tensor-val">v_sw = 450 KM/S</span>
          </div>
        </div>
      </div>
    </div>
  );
};
