import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';

export const SpacecraftObservationDeck: React.FC = () => {
  const cameraMode = usePlayerStore(state => state.cameraMode);
  const activeTab = usePlayerStore(state => state.activeTab);

  if (cameraMode !== 'spacecraft' || activeTab !== 'system') {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 font-mono overflow-hidden">
      {/* 
        1. Fused Quartz Perimeter Vignette:
        Subtle optical density falloff simulating radiation-hardened multi-ply cupola glass
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 92% 86% at 50% 50%, transparent 72%, rgba(5, 5, 8, 0.35) 88%, rgba(2, 2, 4, 0.75) 100%)',
        }}
      />

      {/* 
        2. Top Canopy Brow Bulkhead:
        Sleek monolithic titanium frame with a razor-thin 1px silver highlight bevel
      */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0c10]/80 to-transparent flex items-start justify-center pt-1.5">
        <div className="w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    </div>
  );
};
