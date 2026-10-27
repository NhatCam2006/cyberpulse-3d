import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { JPL_PLANETS, DWARF_PLANETS } from '../../utils/celestialMechanics';
import { Compass, Orbit, X } from 'lucide-react';

export const SolarSystemHud: React.FC = () => {
  const selectedPlanet = usePlayerStore(state => state.selectedPlanet);
  const setSelectedPlanet = usePlayerStore(state => state.setSelectedPlanet);
  const auroraSpectralMode = usePlayerStore(state => state.auroraSpectralMode);
  const toggleAuroraSpectralMode = usePlayerStore(state => state.toggleAuroraSpectralMode);

  const allBodies = [
    { name: 'Sol', symbol: '☉', a_AU: 0, radius_km: 696340, obliquity_deg: 7.25, orbitalPeriod_yr: 0 },
    ...JPL_PLANETS,
    ...DWARF_PLANETS,
  ];

  const currentBody = allBodies.find(b => b.name === selectedPlanet);

  return (
    <div className="mx-3 mt-2 flex flex-col gap-2 pointer-events-auto select-none font-mono">
      {/* 1. Quick Planet Inspection Navigation Strip */}
      <div className="flex items-center gap-1 bg-[#0a0a0c] p-1 rounded border border-white/10 shadow-lg overflow-x-auto max-w-full">
        <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] uppercase tracking-wider text-neutral-400 font-semibold border-r border-white/10 shrink-0">
          <Orbit className="w-3 h-3 text-white" />
          <span>MISSION CONTROL</span>
        </div>

        <button
          onClick={() => setSelectedPlanet(null)}
          className={`px-2 py-0.5 text-[10px] tracking-wider rounded-sm shrink-0 transition-colors cursor-pointer uppercase ${
            selectedPlanet === null
              ? 'bg-white text-black font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          [ OVERVIEW ]
        </button>

        {allBodies.map(body => {
          const isActive = selectedPlanet === body.name;
          return (
            <button
              key={body.name}
              onClick={() => setSelectedPlanet(body.name)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-wider rounded-sm shrink-0 transition-colors cursor-pointer uppercase ${
                isActive
                  ? 'bg-white text-black font-bold shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-neutral-500 font-normal">{body.symbol}</span>
              <span>{body.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Detailed Ephemeris Telemetry Overlay when a Body is Focused */}
      {currentBody && (
        <div className="bg-[#08080a] border border-white/15 rounded p-2.5 max-w-md shadow-2xl flex flex-col gap-1.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-widest">
                {currentBody.symbol} {currentBody.name.toUpperCase()}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 bg-white/10 text-neutral-300 rounded">
                {currentBody.name === 'Sol' ? 'STELLAR CORE' : (currentBody as any).isGasGiant ? 'GAS GIANT' : (currentBody as any).a_AU > 2 ? 'DWARF / ICE' : 'TERRESTRIAL'}
              </span>
            </div>
            <button
              onClick={() => setSelectedPlanet(null)}
              className="text-neutral-500 hover:text-white transition-colors p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-neutral-400">
            <div>
              <span className="text-neutral-600">SEMI-MAJOR AXIS:</span>{' '}
              <span className="text-white font-semibold">
                {currentBody.a_AU === 0 ? '0.00 AU (BARYCENTER)' : `${currentBody.a_AU.toFixed(3)} AU`}
              </span>
            </div>
            <div>
              <span className="text-neutral-600">EQUAT. RADIUS:</span>{' '}
              <span className="text-white font-semibold">
                {currentBody.radius_km.toLocaleString()} km
              </span>
            </div>
            <div>
              <span className="text-neutral-600">ORBITAL PERIOD:</span>{' '}
              <span className="text-white font-semibold">
                {currentBody.orbitalPeriod_yr === 0 ? 'N/A' : `${currentBody.orbitalPeriod_yr.toFixed(2)} Earth Yrs`}
              </span>
            </div>
            <div>
              <span className="text-neutral-600">AXIAL TILT:</span>{' '}
              <span className="text-white font-semibold">
                {currentBody.obliquity_deg.toFixed(2)}°
              </span>
            </div>
          </div>

          <div className="text-[9px] text-neutral-400 border-t border-white/5 pt-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Compass className="w-2.5 h-2.5 text-neutral-400" />
              PHYSICAL SHADER: PHOTOREALISTIC HELIOCENTRIC ILLUMINATION
            </span>
            <span className="text-neutral-400">JPL DE440</span>
          </div>

          {/* 3. Auroral Curtain Spectroscopy Mode Toggle for Earth & Jupiter */}
          {(currentBody.name === 'Earth' || currentBody.name === 'Jupiter') && (
            <div className="flex items-center justify-between border-t border-white/10 pt-1.5 mt-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    auroraSpectralMode
                      ? currentBody.name === 'Earth'
                        ? 'bg-emerald-400 shadow-[0_0_6px_#2af598]'
                        : 'bg-cyan-400 shadow-[0_0_6px_#00f3ff]'
                      : 'bg-white shadow-[0_0_6px_#ffffff]'
                  } animate-pulse`}
                />
                <span className="text-[9px] text-neutral-300">
                  {currentBody.name === 'Earth'
                    ? '3D IONOSPHERIC DRAPERIES [557.7nm O I]'
                    : 'JOVIAN POLAR CROWN [H₂ LYMAN / UV]'}
                </span>
              </div>
              <button
                onClick={toggleAuroraSpectralMode}
                className={`px-2 py-0.5 text-[8.5px] font-mono font-bold rounded tracking-wider border cursor-pointer uppercase transition-all ${
                  auroraSpectralMode
                    ? currentBody.name === 'Earth'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(42,245,152,0.35)]'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(0,243,255,0.35)]'
                    : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                }`}
              >
                {auroraSpectralMode ? 'SPECTRAL [EMISSION]' : 'MONOCHROME [IKEDA]'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
