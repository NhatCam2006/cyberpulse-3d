import React from 'react';
import { useLyricsStore } from '../../store/useLyricsStore';

interface SyncedLyricsProps {
  className?: string;
}

export const SyncedLyrics: React.FC<SyncedLyricsProps> = ({ className = '' }) => {
  const isSynced = useLyricsStore(state => state.isSynced);
  const isLoading = useLyricsStore(state => state.isLoading);
  const activeLine = useLyricsStore(state => state.activeLine);
  const nextLine = useLyricsStore(state => state.nextLine);
  const lines = useLyricsStore(state => state.lines);
  const plainLyrics = useLyricsStore(state => state.plainLyrics);

  if (isLoading) {
    return (
      <div className={`pointer-events-none select-none font-mono ${className}`}>
        <div className="flex items-center gap-2 text-[8px] tracking-widest text-neutral-500 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-ping" />
          <span>DECODING TRANSMISSION // ACQUIRING LYRICS...</span>
        </div>
      </div>
    );
  }

  if (!isSynced && !plainLyrics) {
    return null;
  }

  return (
    <div className={`pointer-events-none select-none font-mono flex flex-col gap-1 transition-all duration-300 ${className}`}>
      {/* Telemetry Header */}
      <div className="flex items-center gap-2 text-[8px] tracking-widest text-neutral-500 uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] animate-pulse" />
        <span>VOICE CARRIER // DECODED TRANSMISSION</span>
      </div>

      {/* Main Lyric Readout */}
      {isSynced ? (
        <div className="flex flex-col gap-1 min-h-[48px] justify-center border-l-2 border-white/60 pl-3">
          {/* Active Line */}
          <div className="text-sm sm:text-base font-bold text-white tracking-wide transition-all duration-200 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            {activeLine ? activeLine.text : (lines.length > 0 ? '— — —' : '')}
          </div>

          {/* Next Line Preview */}
          {nextLine && (
            <div className="text-xs text-neutral-500 tracking-wider truncate max-w-lg transition-opacity duration-300 opacity-60">
              {nextLine.text}
            </div>
          )}
        </div>
      ) : (
        /* Fallback for unsynced plain lyrics: display first few lines */
        <div className="border-l-2 border-white/30 pl-3 text-xs text-neutral-400 max-w-md line-clamp-2">
          {plainLyrics}
        </div>
      )}
    </div>
  );
};
