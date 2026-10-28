import React from 'react';
import { useLyricsStore } from '../../store/useLyricsStore';
import { usePlayerStore } from '../../store/usePlayerStore';

interface SyncedLyricsProps {
  className?: string;
}

export const SyncedLyrics: React.FC<SyncedLyricsProps> = ({ className = '' }) => {
  const isLiveInput = usePlayerStore(state => state.isLiveInput);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const trackName = useLyricsStore(state => state.trackName);
  const artistName = useLyricsStore(state => state.artistName);
  const isSynced = useLyricsStore(state => state.isSynced);
  const isLoading = useLyricsStore(state => state.isLoading);
  const activeLine = useLyricsStore(state => state.activeLine);
  const nextLine = useLyricsStore(state => state.nextLine);
  const lines = useLyricsStore(state => state.lines);
  const plainLyrics = useLyricsStore(state => state.plainLyrics);

  // Strictly render lyrics only when screen sharing is active (isLiveInput) or local playback is running
  if (!isLiveInput && !isPlaying) {
    return null;
  }

  // If no track has ever been loaded or played, render nothing
  if (!trackName && !isLoading && !isSynced && !plainLyrics) {
    return null;
  }

  // Acquisition state while fetching
  if (isLoading) {
    return (
      <div
        className={`pointer-events-none select-none flex flex-col items-center justify-center text-center ${className}`}
        style={{ fontFamily: "'JetBrains Mono', 'Rajdhani', 'Pretendard', 'Noto Sans KR', sans-serif" }}
      >
        <div className="text-[10px] text-neutral-400 tracking-wider font-mono">
          [ ◰ SYNCHRONIZING LYRIC TELEMETRY... ]
        </div>
      </div>
    );
  }

  // Fallback state when track is active but no lyrics exist in database
  if (!isSynced && !plainLyrics) {
    return (
      <div
        className={`pointer-events-auto select-none flex flex-col items-center justify-center text-center transition-all duration-300 ${className}`}
        style={{ fontFamily: "'JetBrains Mono', 'Rajdhani', 'Pretendard', 'Noto Sans KR', sans-serif" }}
        onClick={() => {
          if (trackName) {
            useLyricsStore.getState().fetchLyrics(trackName, artistName || '');
          }
        }}
      >
        <div className="text-[9.5px] text-neutral-500 tracking-wider font-mono uppercase cursor-pointer hover:text-neutral-300 transition-colors" title="Click to retry lyrics acquisition">
          [ NO LYRICS RECORDED FOR CURRENT TRACK ⟳ ]
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none select-none flex flex-col items-center justify-center text-center transition-all duration-300 ${className}`}
      style={{ fontFamily: "'JetBrains Mono', 'Rajdhani', 'Pretendard', 'Noto Sans KR', sans-serif" }}
    >
      {/* Main Lyric Readout */}
      {isSynced ? (
        <div className="flex flex-col items-center justify-center text-center gap-0.5 w-full">
          {/* Active Line (Crisp white, bold, glowing with native CJK/Hangul support) */}
          <div className="w-full text-center text-xs sm:text-[13px] font-semibold text-white tracking-wider leading-relaxed transition-all duration-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            {activeLine ? (
              activeLine.text.trim()
            ) : lines.length > 0 ? (
              <span className="text-neutral-400 font-normal tracking-widest text-[11px]">
                • • • [ INSTRUMENTAL INTRO ] • • •
              </span>
            ) : (
              '• • •'
            )}
          </div>

          {/* Next Line Subtle Preview (Very faint, smaller) */}
          {nextLine && (
            <div className="w-full text-center text-[9.5px] text-neutral-400 tracking-wide truncate opacity-50 transition-opacity duration-300">
              {activeLine ? nextLine.text.trim() : `▷ UPCOMING: ${nextLine.text.trim()}`}
            </div>
          )}
        </div>
      ) : (
        /* Fallback for unsynced plain lyrics */
        <div className="w-full text-center text-[11px] text-neutral-400 line-clamp-2 px-2 tracking-wide">
          {plainLyrics}
        </div>
      )}
    </div>
  );
};
