import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { JPL_PLANETS, DWARF_PLANETS } from '../../utils/celestialMechanics';
import { Compass, X } from 'lucide-react';

export const SolarSystemHud: React.FC = () => {
  const selectedPlanet = usePlayerStore(state => state.selectedPlanet);
  const setSelectedPlanet = usePlayerStore(state => state.setSelectedPlanet);
  const auroraSpectralMode = usePlayerStore(state => state.auroraSpectralMode);
  const toggleAuroraSpectralMode = usePlayerStore(state => state.toggleAuroraSpectralMode);

  // Return null when in system overview to keep screen 100% clean and unobstructed
  if (!selectedPlanet) return null;

  const allBodies = [
    { name: 'Sol', symbol: '☉', a_AU: 0, radius_km: 696340, obliquity_deg: 7.25, orbitalPeriod_yr: 0 },
    ...JPL_PLANETS,
    ...DWARF_PLANETS,
  ];

  const currentBody = allBodies.find(b => b.name === selectedPlanet);
  if (!currentBody) return null;

  return (
    <aside className="absolute top-16 left-4 z-20 pointer-events-auto select-none font-mono max-w-sm animate-fadeIn">
      {/* Detailed Ephemeris Telemetry Overlay when a Body is Focused */}
      <div className="bg-[#08080c]/95 border border-white/20 rounded p-3 shadow-2xl flex flex-col gap-2 backdrop-blur-md text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-widest">
              {currentBody.symbol} {currentBody.name.toUpperCase()}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 bg-white/10 text-neutral-300 rounded font-semibold border border-white/10">
              {currentBody.name === 'Sol'
                ? 'STELLAR CORE'
                : (currentBody as any).isGasGiant
                ? 'GAS GIANT'
                : (currentBody as any).a_AU > 2
                ? 'DWARF / ICE'
                : 'TERRESTRIAL'}
            </span>
          </div>
          <button
            onClick={() => setSelectedPlanet(null)}
            title="Close inspection & return to Overview"
            className="text-neutral-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Technical Ephemeris Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-neutral-400">
          <div>
            <span className="text-neutral-500 block text-[9px]">SEMI-MAJOR AXIS</span>
            <span className="text-white font-semibold">
              {currentBody.a_AU === 0 ? '0.00 AU (BARYCENTER)' : `${currentBody.a_AU.toFixed(3)} AU`}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[9px]">EQUAT. RADIUS</span>
            <span className="text-white font-semibold">
              {currentBody.radius_km.toLocaleString()} km
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[9px]">ORBITAL PERIOD</span>
            <span className="text-white font-semibold">
              {currentBody.orbitalPeriod_yr === 0 ? 'N/A' : `${currentBody.orbitalPeriod_yr.toFixed(2)} Yrs`}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[9px]">AXIAL TILT</span>
            <span className="text-white font-semibold">
              {currentBody.obliquity_deg.toFixed(2)}°
            </span>
          </div>
        </div>

        <div className="text-[9px] text-neutral-400 border-t border-white/5 pt-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[8.5px]">
            <Compass className="w-2.5 h-2.5 text-neutral-400" />
            HELIOCENTRIC DE440
          </span>
          <button
            onClick={() => setSelectedPlanet(null)}
            className="text-[9px] text-neutral-400 hover:text-white underline cursor-pointer"
          >
            [ RESET VIEW ]
          </button>
        </div>

        {/* 3D Ionospheric Auroral Draperies Toggle (Earth & Jupiter) */}
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
                {currentBody.name === 'Earth' ? 'IONOSPHERIC DRAPERIES' : 'JOVIAN POLAR CROWN'}
              </span>
            </div>
            <button
              onClick={toggleAuroraSpectralMode}
              className={`px-2 py-0.5 text-[8.5px] font-mono font-bold rounded tracking-wider border cursor-pointer uppercase transition-all ${
                auroraSpectralMode
                  ? currentBody.name === 'Earth'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
              }`}
            >
              {auroraSpectralMode ? 'SPECTRAL' : 'MONO'}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
