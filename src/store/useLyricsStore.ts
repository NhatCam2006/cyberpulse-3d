import { create } from 'zustand';

export interface LyricLine {
  time: number;
  text: string;
}

export interface LyricsState {
  currentTrackKey: string | null;
  trackName: string | null;
  artistName: string | null;
  isLoading: boolean;
  isSynced: boolean;
  lines: LyricLine[];
  plainLyrics: string | null;
  activeLineIndex: number;
  activeLine: LyricLine | null;
  prevLine: LyricLine | null;
  nextLine: LyricLine | null;
  fetchLyrics: (title: string, artist: string, duration?: number) => Promise<void>;
  updateActiveLine: (currentTime: number) => void;
  reset: () => void;
}

export const useLyricsStore = create<LyricsState>((set, get) => ({
  currentTrackKey: null,
  trackName: null,
  artistName: null,
  isLoading: false,
  isSynced: false,
  lines: [],
  plainLyrics: null,
  activeLineIndex: -1,
  activeLine: null,
  prevLine: null,
  nextLine: null,

  fetchLyrics: async (title: string, artist: string, duration?: number) => {
    if (!title || !title.trim()) return;

    const cleanTitle = title.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
    const cleanArtist = (artist || '').replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
    const trackKey = `${cleanTitle.toLowerCase()} - ${cleanArtist.toLowerCase()}`;

    // Avoid duplicate fetch for same track
    if (get().currentTrackKey === trackKey && (get().lines.length > 0 || get().plainLyrics)) {
      return;
    }

    set({
      currentTrackKey: trackKey,
      trackName: title,
      artistName: artist,
      isLoading: true,
      lines: [],
      plainLyrics: null,
      activeLineIndex: -1,
      activeLine: null,
      prevLine: null,
      nextLine: null,
    });

    try {
      const durParam = duration && duration > 0 ? `&duration=${Math.round(duration)}` : '';
      const res = await fetch(
        `/api/lyrics?track=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}${durParam}`
      );

      if (res.ok) {
        const data = await res.json();
        if (get().currentTrackKey === trackKey) {
          set({
            isLoading: false,
            isSynced: !!data.synced && Array.isArray(data.lines) && data.lines.length > 0,
            lines: data.lines || [],
            plainLyrics: data.plainLyrics || null,
          });
          return;
        }
      }
    } catch {
      // ignore
    }

    if (get().currentTrackKey === trackKey) {
      set({ isLoading: false });
    }
  },

  updateActiveLine: (currentTime: number) => {
    const { lines, activeLineIndex } = get();
    if (!lines || lines.length === 0) return;

    // Fast-path: check if current line is still valid
    if (
      activeLineIndex >= 0 &&
      activeLineIndex < lines.length &&
      lines[activeLineIndex].time <= currentTime &&
      (activeLineIndex === lines.length - 1 || currentTime < lines[activeLineIndex + 1].time)
    ) {
      return; // No change needed
    }

    // Binary search for matching line
    let low = 0;
    let high = lines.length - 1;
    let best = -1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (lines[mid].time <= currentTime) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (best !== activeLineIndex) {
      set({
        activeLineIndex: best,
        activeLine: best >= 0 ? lines[best] : null,
        prevLine: best > 0 ? lines[best - 1] : null,
        nextLine: best >= 0 && best + 1 < lines.length ? lines[best + 1] : null,
      });
    }
  },

  reset: () => {
    set({
      currentTrackKey: null,
      trackName: null,
      artistName: null,
      isLoading: false,
      isSynced: false,
      lines: [],
      plainLyrics: null,
      activeLineIndex: -1,
      activeLine: null,
      prevLine: null,
      nextLine: null,
    });
  },
}));
