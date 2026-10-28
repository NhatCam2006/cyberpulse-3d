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
      <div className={`pointer-events-none select-none font-mono flex flex-col items-center justify-center ${className}`}>
        <div className="flex items-center gap-1.5 text-[7.5px] tracking-[0.2em] text-neutral-500 uppercase">
          <span className="w-1 h-1 rounded-full bg-white/40 animate-ping" />
          <span>[ ◰ ACQUIRING LYRICS ]</span>
        </div>
      </div>
    );
  }

  if (!isSynced && !plainLyrics) {
    return null;
  }

  return (
    <div className={`pointer-events-none select-none font-mono flex flex-col items-center justify-center text-center transition-all duration-300 ${className}`}>
      {/* Micro Telemetry Header */}
      <div className="flex items-center gap-1.5 text-[7.5px] tracking-[0.25em] text-neutral-500 uppercase mb-0.5">
        <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#ffffff] animate-pulse" />
        <span>VOICE CARRIER</span>
      </div>

      {/* Main Lyric Readout */}
      {isSynced ? (
        <div className="flex flex-col items-center justify-center gap-0.5 max-w-lg px-2">
          {/* Active Line (Compact, crisp white) */}
          <div className="text-xs sm:text-[13px] font-semibold text-white tracking-wider leading-relaxed transition-all duration-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]">
            {activeLine ? activeLine.text : (lines.length > 0 ? '• • •' : '')}
          </div>

          {/* Next Line Subtle Preview (Very faint, smaller) */}
          {nextLine && (
            <div className="text-[9.5px] text-neutral-500 tracking-wide truncate max-w-md opacity-45 transition-opacity duration-300">
              {nextLine.text}
            </div>
          )}
        </div>
      ) : (
        /* Fallback for unsynced plain lyrics */
        <div className="text-[11px] text-neutral-400 max-w-md line-clamp-2 px-2 text-center tracking-wide">
          {plainLyrics}
        </div>
      )}
    </div>
  );
};
