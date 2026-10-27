import React, { useState, useEffect, useCallback } from 'react';
import { VisualizerCanvas } from './components/canvas/VisualizerCanvas';
import { TopTelemetry } from './components/hud/TopTelemetry';
import { TrackDrawer } from './components/hud/TrackDrawer';
import { PlayerDeck } from './components/hud/PlayerDeck';
import { SwissBrutalistFraming } from './components/hud/SwissBrutalistFraming';
import { SpacecraftObservationDeck } from './components/hud/SpacecraftObservationDeck';
import { SpacecraftHangar } from './components/hangar/SpacecraftHangar';
import { usePlayerStore } from './store/usePlayerStore';
import { AudioEngine } from './audio/AudioEngine';
import { UploadCloud } from 'lucide-react';

export const App: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const loadFiles = usePlayerStore(state => state.loadFiles);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const isDemoSynth = usePlayerStore(state => state.isDemoSynth);
  const tracks = usePlayerStore(state => state.tracks);
  const toggleDemoSynth = usePlayerStore(state => state.toggleDemoSynth);
  const activeTab = usePlayerStore(state => state.activeTab);

  // Global Drag and Drop event handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadFiles(e.dataTransfer.files);
    }
  }, [loadFiles]);

  // Handle first user gesture to unlock AudioContext
  useEffect(() => {
    const unlockAudio = () => {
      AudioEngine.getInstance().initContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  if (activeTab === 'hangar') {
    return <SpacecraftHangar />;
  }

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#050505] text-white select-none font-mono"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Minimalist Monochrome 3D Canvas */}
      <VisualizerCanvas />

      {/* Swiss Brutalist Framing (4 Corner Reticles & Technical Flank Readouts) */}
      <SwissBrutalistFraming />

      {/* Cinematic Spacecraft Observation Deck Canopy (When aboard SS Horizon) */}
      <SpacecraftObservationDeck />

      {/* Top HUD Telemetry (Solid black, NO backdrop-blur) */}
      <TopTelemetry
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(prev => !prev)}
      />

      {/* Side Track Drawer */}
      <TrackDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Bottom Transport Player Deck */}
      <PlayerDeck />

      {/* Drag & Drop Monochrome Overlay: NO backdrop-blur */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#050505]/95 flex flex-col items-center justify-center border-2 border-dashed border-white p-8 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-[#121212] border border-white flex items-center justify-center text-white mb-4 animate-pulse">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="font-mono text-xl font-bold text-white tracking-widest uppercase text-center">
            DROP AUDIO FILES
          </h2>
          <p className="font-mono text-xs text-neutral-500 mt-2 uppercase">
            MP3 / WAV / FLAC / OGG / M4A
          </p>
        </div>
      )}
    </main>
  );
};
export default App;
