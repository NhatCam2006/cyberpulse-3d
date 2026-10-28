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
  const isLiveInput = usePlayerStore(state => state.isLiveInput);
  const liveInputType = usePlayerStore(state => state.liveInputType);
  const liveTrackTitle = usePlayerStore(state => state.liveTrackTitle);
  const liveTrackArtist = usePlayerStore(state => state.liveTrackArtist);
  const toggleSystemAudio = usePlayerStore(state => state.toggleSystemAudio);

  const togglePlay = usePlayerStore(state => state.togglePlay);
  const playNext = usePlayerStore(state => state.playNext);
  const playPrev = usePlayerStore(state => state.playPrev);
  const seek = usePlayerStore(state => state.seek);
  const setVolume = usePlayerStore(state => state.setVolume);
  const updateTime = usePlayerStore(state => state.updateTime);
  const handleTrackEnd = usePlayerStore(state => state.handleTrackEnd);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [liveSmtcData, setLiveSmtcData] = useState<{
    position?: number;
    duration?: number;
    title?: string;
    artist?: string;
    album?: string;
    artwork?: string;
  } | null>(null);
  const [localArtwork, setLocalArtwork] = useState<string | null>(null);
  const prevVolumeRef = useRef(volume);

  // Poll SMTC metadata when live input is active
  useEffect(() => {
    if (!isLiveInput) {
      setLiveElapsed(0);
      setLiveSmtcData(null);
      return;
    }

    const timer = setInterval(() => {
      setLiveElapsed(prev => prev + 1);
    }, 1000);

    const pollSmtc = async () => {
      try {
        const res = await fetch('/api/now-playing');
        if (res.ok) {
          const data = await res.json();
          if (data && data.title && data.title.trim().length > 0) {
            setLiveSmtcData(data);
            usePlayerStore.getState().setLiveTrackInfo(data.title, data.artist || 'SPOTIFY');
          }
        }
      } catch {
        // ignore in offline/static environments
      }
    };

    pollSmtc();
    const smtcInterval = setInterval(pollSmtc, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(smtcInterval);
    };
  }, [isLiveInput]);

  const currentTrack = currentTrackIndex >= 0 && currentTrackIndex < tracks.length
    ? tracks[currentTrackIndex]
    : null;

  // Fetch album art for local / offline playback
  useEffect(() => {
    if (isLiveInput || !currentTrack) {
      setLocalArtwork(null);
      return;
    }

    let cancelled = false;
    const fetchLocalArt = async () => {
      try {
        const res = await fetch(
          `/api/artwork?term=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.artwork) {
            setLocalArtwork(data.artwork);
          }
        }
      } catch {
        // ignore
      }
    };

    fetchLocalArt();
    return () => {
      cancelled = true;
    };
  }, [isLiveInput, currentTrack?.title, currentTrack?.artist]);

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

        // Starlight monochrome gradient (pure transparency, zero solid black background)
        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.50)');

        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);

        // Pure white peak cap
        if (peakBars[i] > 2) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillRect(x + 1, height - peakBars[i] - 1, Math.max(1, barWidth - 2), 1.0);
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
    if (isDemoSynth || isLiveInput) return;
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
    <footer className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none select-none flex flex-col justify-end">
      {/* 
        Pure Floating Swiss Brutalist Audio Deck (Zero Container Box, Zero Clutter)
        Directly matches the Left and Right Flank Architectural Etching
      */}
      
      {/* 1. Hairline Spectrum & Scrubbing Rail (Directly on Deep Space Canvas) */}
      <div className="w-full px-6 mb-3 pointer-events-auto flex flex-col items-center">
        {/* Floating Spectrum Bars (16px high, pure transparency) */}
        <div className="w-full h-3 relative overflow-hidden pointer-events-none">
          <canvas
            ref={canvasRef}
            width={1280}
            height={16}
            className="w-full h-full block opacity-75"
          />
        </div>

        {/* 1px Hairline Scrubbing Rail */}
        <div
          className="group relative w-full h-2.5 flex items-center cursor-pointer"
          onClick={handleProgressBarClick}
          title={isLiveInput ? 'Live Audio Stream' : 'Click to seek position'}
        >
          {/* Subtle Background Guide Track */}
          <div className="w-full h-[1px] bg-white/10 group-hover:bg-white/25 transition-colors" />

          {/* Active Elapsed Horizon or Live Sweep */}
          {isLiveInput && (!liveSmtcData?.duration || liveSmtcData.duration <= 0) ? (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="h-[1px] w-36 bg-gradient-to-r from-transparent via-white to-transparent will-change-transform opacity-75"
                style={{
                  animation: 'liveScan 2.5s ease-in-out infinite alternate',
                }}
              />
            </div>
          ) : (
            <div
              className="absolute left-0 h-[1px] bg-white shadow-[0_0_6px_#ffffff] transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    isLiveInput && liveSmtcData?.duration
                      ? ((liveSmtcData.position || 0) / liveSmtcData.duration) * 100
                      : playbackProgress * 100
                  )
                )}%`,
              }}
            />
          )}

          {/* Precision Micro Crosshair Marker on Hover */}
          {!isLiveInput && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${Math.min(100, Math.max(0, playbackProgress * 100))}%` }}
            >
              <span className="text-[10px] text-white font-bold leading-none select-none">+</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Floating Swiss Brutalist Footer Telemetry (Zero Outer Box, Matching Flanks) */}
      <div className="w-full px-6 pb-5 flex items-end justify-between font-mono">
        
        {/* Bottom-Left: Audio Carrier & Metadata (Matches Left Flank border-l) */}
        <div className="flex items-center gap-3 border-l border-white/20 pl-2.5 pointer-events-auto">
          {/* Album Artwork Frame */}
          <div className="relative w-11 h-11 flex-shrink-0 bg-white/5 border border-white/20 rounded-[1px] overflow-hidden shadow-[0_0_12px_rgba(0,0,0,0.8)] flex items-center justify-center group">
            {(isLiveInput ? (liveSmtcData?.artwork || null) : localArtwork) ? (
              <img
                src={(isLiveInput ? liveSmtcData?.artwork : localArtwork)!}
                alt="Album Cover"
                className="w-full h-full object-cover select-none filter contrast-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-neutral-600 select-none">
                <span className="text-[10px] font-mono tracking-tighter text-white/40">[ ◰ ]</span>
                <span className="text-[6.5px] uppercase tracking-widest text-neutral-500 mt-0.5">AUDIO</span>
              </div>
            )}
            {/* Swiss Brutalist corner reticles */}
            <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white/40 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white/40 pointer-events-none" />
          </div>

          {/* Song Metadata Text Block */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-neutral-500 uppercase tracking-widest">
                {isLiveInput ? 'LIVE INGESTION // CHANNEL A' : 'AUDIO CARRIER // CHANNEL A'}
              </span>
              {isLiveInput && (
                <span className="inline-flex items-center gap-1 text-[8px] text-white font-mono tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] animate-pulse" />
                  ACTIVE
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-white tracking-wider truncate max-w-[200px] sm:max-w-[260px] md:max-w-xs">
              {isLiveInput
                ? (liveSmtcData?.title || liveTrackTitle || 'SPOTIFY LIVE STREAM').toUpperCase()
                : (currentTrack ? currentTrack.title.toUpperCase() : 'NO TRACK LOADED')}
            </div>
            <div className="text-[9.5px] text-neutral-400 tracking-wider truncate max-w-[200px] sm:max-w-[260px] md:max-w-xs">
              {isLiveInput
                ? `${(liveSmtcData?.artist || liveTrackArtist || 'DESKTOP AUDIO').toUpperCase()}${
                    liveSmtcData?.album ? ` // ${liveSmtcData.album.toUpperCase()}` : ''
                  }`
                : (currentTrack ? currentTrack.artist.toUpperCase() : 'DRAG & DROP AUDIO FILE')}
            </div>
          </div>
        </div>

        {/* Bottom-Center: Pure Typographic Audio Controls */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto select-none">
          <div className="flex items-center gap-2.5">
            {/* Prev */}
            <button
              onClick={playPrev}
              disabled={tracks.length <= 1 || isLiveInput}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-20 text-[10px] tracking-widest font-mono"
              title="Previous Track"
            >
              [ |◁ ]
            </button>

            {/* Play / Pause - Minimalist Glass Reticle */}
            <button
              onClick={togglePlay}
              disabled={isLiveInput}
              className="w-7 h-7 rounded-full border border-white/40 hover:border-white bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_0_8px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-30"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3 fill-white stroke-none" />
              ) : (
                <Play className="w-3 h-3 fill-white stroke-none ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={playNext}
              disabled={tracks.length <= 1 || isLiveInput}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-20 text-[10px] tracking-widest font-mono"
              title="Next Track"
            >
              [ ▷| ]
            </button>

            <span className="text-white/20 text-xs select-none">|</span>

            {/* Live Input / Spotify System Audio Button */}
            <button
              onClick={toggleSystemAudio}
              className={`px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase border transition-all cursor-pointer flex items-center gap-1.5 ${
                isLiveInput
                  ? 'border-white/60 bg-white/10 text-white shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                  : 'border-white/20 hover:border-white/60 text-neutral-400 hover:text-white bg-transparent hover:bg-white/5'
              }`}
              title={
                isLiveInput
                  ? 'Live Stream Active. Click to Disconnect.'
                  : "Stream Live Audio from Spotify / Desktop (Check 'Share audio')"
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  isLiveInput
                    ? 'bg-white shadow-[0_0_6px_#ffffff] animate-pulse'
                    : 'bg-neutral-600'
                }`}
              />
              <span>{isLiveInput ? 'LIVE ON' : 'SPOTIFY IN'}</span>
              {isLiveInput && (
                <span className="text-neutral-400 hover:text-white text-[8px] ml-0.5">
                  [DISCONNECT]
                </span>
              )}
            </button>
          </div>

          {/* Elapsed / Duration Timestamp */}
          <div className="text-[9.5px] text-neutral-400 font-mono tracking-[0.2em]">
            {isLiveInput ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] animate-pulse" />
                {liveSmtcData?.duration && liveSmtcData.duration > 0 ? (
                  <>
                    <span className="text-white font-semibold">{formatTime(liveSmtcData.position || 0)}</span>
                    <span className="text-neutral-600 mx-1.5">//</span>
                    <span>{formatTime(liveSmtcData.duration)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-white font-semibold">LIVE [{formatTime(liveElapsed)}]</span>
                    <span className="text-neutral-600 mx-1.5">//</span>
                    <span className="text-neutral-400">REALTIME FEED</span>
                  </>
                )}
              </div>
            ) : (
              <>
                <span className="text-white font-semibold">{formatTime(currentTime)}</span>
                <span className="text-neutral-600 mx-1.5">//</span>
                <span>{formatTime(duration)}</span>
              </>
            )}
          </div>
        </div>

        {/* Bottom-Right: Master Stage & Gain Slider (Matches Right Flank border-r) */}
        <div className="flex flex-col items-end gap-0.5 border-r border-white/20 pr-2.5 text-right pointer-events-auto">
          <div className="text-[8px] text-neutral-500 uppercase tracking-widest">
            OUTPUT STAGE // MASTER
          </div>
          <div className="flex items-center gap-2 text-[10px] tracking-wider my-0.5">
            <button
              onClick={handleToggleMute}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-0.5"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3 h-3 text-neutral-500" />
              ) : (
                <Volume2 className="w-3 h-3 text-neutral-300" />
              )}
            </button>
            <div
              className="w-16 h-1 bg-white/15 relative overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setVolume(pct);
                if (isMuted) setIsMuted(false);
              }}
              title={`Master Gain: ${Math.round(volume * 100)}%`}
            >
              <div
                className="h-full bg-white transition-all shadow-[0_0_4px_#ffffff]"
                style={{ width: `${isMuted ? 0 : Math.round(volume * 100)}%` }}
              />
            </div>
            <span className="text-white font-bold text-[9px] w-7 text-right">
              {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
            </span>
          </div>
          <div className="text-[8px] text-neutral-500 tracking-widest">
            48.0 KHZ // 24-BIT STEREO
          </div>
        </div>
      </div>
    </footer>
  );
};
