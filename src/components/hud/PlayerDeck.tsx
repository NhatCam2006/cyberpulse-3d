import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Disc,
} from 'lucide-react';
import { usePlayerStore, getGlobalAudio } from '../../store/usePlayerStore';
import { AudioEngine } from '../../audio/AudioEngine';

export const PlayerDeck: React.FC = () => {
  const tracks = usePlayerStore(state => state.tracks);
  const currentTrackIndex = usePlayerStore(state => state.currentTrackIndex);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const isDemoSynth = usePlayerStore(state => state.isDemoSynth);
  const volume = usePlayerStore(state => state.volume);
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);
  const playbackProgress = usePlayerStore(state => state.playbackProgress);

  const togglePlay = usePlayerStore(state => state.togglePlay);
  const playNext = usePlayerStore(state => state.playNext);
  const playPrev = usePlayerStore(state => state.playPrev);
  const seek = usePlayerStore(state => state.seek);
  const setVolume = usePlayerStore(state => state.setVolume);
  const updateTime = usePlayerStore(state => state.updateTime);
  const handleTrackEnd = usePlayerStore(state => state.handleTrackEnd);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(volume);

  const currentTrack = currentTrackIndex >= 0 && currentTrackIndex < tracks.length
    ? tracks[currentTrackIndex]
    : null;

  // Audio element listeners for time update (triggered only by native audio event, not rAF)
  useEffect(() => {
    const audio = getGlobalAudio();

    const onTimeUpdate = () => {
      updateTime(audio.currentTime, audio.duration || 0);
    };

    const onEnded = () => {
      handleTrackEnd();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [updateTime, handleTrackEnd]);

  // 60FPS 2D Canvas Spectrum Analyzer (Pure Monochrome Ryoji Ikeda style)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const NUM_BARS = 64;
    const peakBars = new Float32Array(NUM_BARS);

    const renderSpectrum = () => {
      animId = requestAnimationFrame(renderSpectrum);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const engine = AudioEngine.getInstance();
      const data = engine.dataArray;
      const step = Math.max(1, Math.floor(data.length / NUM_BARS));
      const barWidth = width / NUM_BARS;

      for (let i = 0; i < NUM_BARS; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += data[i * step + j] || 0;
        }
        const val = sum / (step * 255);
        const boostedVal = Math.min(1.0, Math.pow(val, 1.2) * (1.0 + (i / NUM_BARS) * 0.7));
        const barHeight = Math.max(1, boostedVal * (height - 3));

        // Peak hold decay
        if (barHeight > peakBars[i]) {
          peakBars[i] = barHeight;
        } else {
          peakBars[i] = Math.max(0, peakBars[i] - 0.6);
        }

        const x = i * barWidth;
        const y = height - barHeight;

        // Monochrome white gradient
        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, 'rgba(80, 80, 80, 0.85)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);

        // Pure white peak cap
        if (peakBars[i] > 2) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 1, height - peakBars[i] - 1, Math.max(1, barWidth - 2), 1.5);
        }
      }
    };

    animId = requestAnimationFrame(renderSpectrum);
    return () => cancelAnimationFrame(animId);
  }, []);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDemoSynth) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(ratio);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setVolume(prevVolumeRef.current || 0.8);
      setIsMuted(false);
    } else {
      prevVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none select-none">
      {/* Solid Black Deck: NO backdrop-blur */}
      <div className="mx-3 mb-3 rounded bg-[#080808] border border-white/15 shadow-2xl pointer-events-auto flex flex-col overflow-hidden">
        
        {/* 64-Bar Monochrome Spectrum Analyzer */}
        <div className="w-full h-7 bg-[#050505] relative overflow-hidden border-b border-white/10">
          <canvas
            ref={canvasRef}
            width={768}
            height={28}
            className="w-full h-full block opacity-90"
          />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
        </div>

        {/* Progress Bar (Clickable) */}
        {!isDemoSynth && (
          <div
            className="group relative w-full h-1 bg-[#121212] cursor-pointer overflow-hidden transition-all hover:h-2"
            onClick={handleProgressBarClick}
          >
            <div
              className="h-full bg-white relative"
              style={{ width: `${Math.min(100, Math.max(0, playbackProgress * 100))}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        {/* Minimalist Player Controls */}
        <div className="px-4 py-2 flex items-center justify-between gap-4 font-mono text-xs">
          
          {/* Left: Track Information */}
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-[280px] md:max-w-xs">
            <div className="w-8 h-8 rounded bg-[#121212] border border-white/10 flex items-center justify-center shrink-0">
              <Disc
                className={`w-4 h-4 text-neutral-300 ${
                  isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {isDemoSynth
                  ? 'PROCEDURAL 128 BPM SYNTH'
                  : currentTrack
                  ? currentTrack.title
                  : 'NO TRACK LOADED'}
              </div>
              <div className="text-[10px] text-neutral-500 truncate">
                {isDemoSynth
                  ? 'KICK & SAWTOOTH BASSLINE'
                  : currentTrack
                  ? currentTrack.artist
                  : 'READY'}
              </div>
            </div>
          </div>

          {/* Center: Controls & Time */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              {/* Prev */}
              <button
                onClick={playPrev}
                disabled={isDemoSynth || tracks.length <= 1}
                className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 transition-colors"
                title="Previous"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Play / Pause Primary Button */}
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-all active:scale-95 shadow-md"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black stroke-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={playNext}
                disabled={isDemoSynth || tracks.length <= 1}
                className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 transition-colors"
                title="Next"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Time Display */}
            {!isDemoSynth && (
              <div className="text-[10px] text-neutral-500 font-mono tracking-wider">
                <span>{formatTime(currentTime)}</span>
                <span className="mx-1 text-neutral-700">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            )}
            {isDemoSynth && (
              <div className="text-[9px] text-neutral-400 font-mono tracking-widest uppercase">
                128 BPM ANALOG CLOCK
              </div>
            )}
          </div>

          {/* Right: Volume Control */}
          <div className="flex items-center gap-2 justify-end flex-1 max-w-[160px]">
            <button
              onClick={handleToggleMute}
              className="p-1 text-neutral-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-neutral-600" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-neutral-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 sm:w-20 h-1 bg-[#1c1c1c] rounded appearance-none cursor-pointer accent-white"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

        </div>
      </div>
    </footer>
  );
};
