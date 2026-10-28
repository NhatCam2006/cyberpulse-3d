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
  fetchLyrics: (title: string, artist: string, duration?: number, album?: string) => Promise<void>;
  setSyncedData: (title: string, artist: string, data: { synced?: boolean; lines?: LyricLine[]; plainLyrics?: string | null }) => void;
  updateActiveLine: (currentTime: number) => void;
  reset: () => void;
}

function cleanTrackTitle(title: string): string {
  return title
    .replace(/\s*[\(\[](feat|ft|with|prod|explicit|clean|remastered|live|version|ver\.).*?[\)\]]/gi, '')
    .replace(/\s*[\(\[].*?[\)\]]/g, '')
    .trim();
}

function cleanArtistName(artist: string): string {
  return artist
    .split(/[,&/]/)[0]
    .replace(/\s*[\(\[](feat|ft|with|prod).*?[\)\]]/gi, '')
    .trim();
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

  setSyncedData: (title: string, artist: string, data: { synced?: boolean; lines?: LyricLine[]; plainLyrics?: string | null }) => {
    if (!title || !title.trim()) return;
    const cTitle = cleanTrackTitle(title) || title.trim();
    const cArtist = cleanArtistName(artist) || (artist || '').trim();
    const trackKey = `${cTitle.toLowerCase()} - ${cArtist.toLowerCase()}`;
    const lines = data.lines || [];

    // Avoid clearing activeLine and resetting activeLineIndex if already set for this track
    if (get().currentTrackKey === trackKey && get().lines.length > 0 && get().lines.length === lines.length) {
      return;
    }

    set({
      currentTrackKey: trackKey,
      trackName: title,
      artistName: artist,
      isLoading: false,
      isSynced: !!data.synced && lines.length > 0,
      lines,
      plainLyrics: data.plainLyrics || null,
      activeLineIndex: -1,
      activeLine: null,
      prevLine: null,
      nextLine: lines.length > 0 ? lines[0] : null,
    });
  },

  fetchLyrics: async (title: string, artist: string, duration?: number, album?: string) => {
    if (!title || !title.trim()) return;

    const cTitle = cleanTrackTitle(title) || title.trim();
    const cArtist = cleanArtistName(artist) || (artist || '').trim();
    const trackKey = `${cTitle.toLowerCase()} - ${cArtist.toLowerCase()}`;

    // Avoid duplicate fetch for same track or while fetch is already in flight
    if (get().currentTrackKey === trackKey && (get().lines.length > 0 || get().isLoading)) {
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
      const albParam = album ? `&album=${encodeURIComponent(album)}` : '';
      const res = await fetch(
        `/api/lyrics?track=${encodeURIComponent(cTitle)}&artist=${encodeURIComponent(cArtist)}${durParam}${albParam}`
      );

      if (res.ok) {
        const data = await res.json();
        if (get().currentTrackKey === trackKey) {
          const isSynced = !!data.synced && Array.isArray(data.lines) && data.lines.length > 0;
          const lines: LyricLine[] = data.lines || [];
          set({
            isLoading: false,
            isSynced,
            lines,
            plainLyrics: data.plainLyrics || null,
            activeLineIndex: -1,
            activeLine: null,
            prevLine: null,
            nextLine: lines.length > 0 ? lines[0] : null,
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
        // Before first line begins (during song intro), preview lines[0] so the user knows lyrics are loaded!
        nextLine: best >= 0
          ? (best + 1 < lines.length ? lines[best + 1] : null)
          : (lines.length > 0 ? lines[0] : null),
      });
    } else if (best === -1 && get().nextLine === null && lines.length > 0) {
      set({ nextLine: lines[0] });
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
