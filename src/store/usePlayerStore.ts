import { create } from 'zustand';
import { AudioEngine } from '../audio/AudioEngine';

export interface Track {
  id: string;
  title: string;
  artist: string;
  fileName: string;
  file?: File;
  url?: string;
  duration?: number;
}

export type ColorTheme = 'cyan-magenta' | 'matrix-green' | 'solar-gold';
export type PhysicsConcept = 'solarsystem';
export type CameraMode = 'vista' | 'spacecraft' | 'orbit';
export type ActiveTab = 'system' | 'hangar';

export interface ThemeColors {
  name: string;
  colorA: string; // Primary Neon
  colorB: string; // Secondary Neon
  accent: string;
}

export const THEMES: Record<ColorTheme, ThemeColors> = {
  'cyan-magenta': {
    name: 'NEON MATRIX (CYAN / MAGENTA)',
    colorA: '#00f3ff',
    colorB: '#ff007f',
    accent: '#7b00ff',
  },
  'matrix-green': {
    name: 'CYBER GRID (MATRIX GREEN)',
    colorA: '#00ff66',
    colorB: '#05ffa1',
    accent: '#003816',
  },
  'solar-gold': {
    name: 'SOLAR FLARE (AMBER / GOLD)',
    colorA: '#ffaa00',
    colorB: '#ff2255',
    accent: '#ffe600',
  },
};

export interface PlayerState {
  tracks: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  isDemoSynth: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  playbackProgress: number;

  // Active object URL for memory safety
  activeAudioUrl: string | null;

  // Live Audio Input (Spotify / System / Mic)
  isLiveInput: boolean;
  liveInputType: 'system' | 'mic' | null;
  liveTrackTitle: string | null;
  liveTrackArtist: string | null;
  setLiveTrackInfo: (title: string | null, artist: string | null) => void;
  toggleSystemAudio: () => Promise<boolean>;
  toggleMicAudio: () => Promise<boolean>;

  // Visualizer settings
  activeTab: ActiveTab;
  colorTheme: ColorTheme;
  cameraMode: CameraMode;
  physicsConcept: PhysicsConcept;
  selectedPlanet: string | null;
  auroraSpectralMode: boolean;
  visibleLayers: {
    core: boolean;
    rings: boolean;
    grid: boolean;
    particles: boolean;
  };

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setPhysicsConcept: (concept: PhysicsConcept) => void;
  setSelectedPlanet: (planet: string | null) => void;
  toggleAuroraSpectralMode: () => void;
  setAuroraSpectralMode: (val: boolean) => void;
  loadFiles: (fileList: FileList | File[]) => void;
  selectTrack: (index: number) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (progress: number) => void;
  setVolume: (volume: number) => void;
  toggleDemoSynth: () => void;
  setColorTheme: (theme: ColorTheme) => void;
  setCameraMode: (mode: CameraMode | 'cinematic') => void;
  toggleLayer: (layer: 'core' | 'rings' | 'grid' | 'particles') => void;
  updateTime: (currentTime: number, duration: number) => void;
  handleTrackEnd: () => void;
}

// Global HTMLAudioElement reference
let globalAudio: HTMLAudioElement | null = null;

export const getGlobalAudio = (): HTMLAudioElement => {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.preload = 'metadata';

    const engine = AudioEngine.getInstance();
    engine.connectAudioElement(globalAudio);
  }
  return globalAudio;
};

/**
 * Parses track title and artist cleanly from filename
 */
function parseTrackMetadata(fileName: string): { title: string; artist: string } {
  // Strip common audio extensions
  const cleanName = fileName.replace(/\.(mp3|wav|flac|ogg|m4a|aac|opus)$/i, '').trim();

  // Check for "Artist - Title" format
  if (cleanName.includes(' - ')) {
    const parts = cleanName.split(' - ');
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
    };
  }

  return {
    artist: 'SOLSYS ARCHIVE',
    title: cleanName,
  };
}

const DEFAULT_PRELOAD_TRACKS: Track[] = [
  {
    id: 'track-preload-sick-enough-to-die',
    title: 'Sick Enough To Die (Part 2)',
    artist: 'MC Mong Ft. Sweden Laundry',
    fileName: 'Sick Enough To Die (Part 2) - MC Mong Ft. Sweden Laundry.mp3',
    url: '/music/Sick Enough To Die (Part 2) - MC Mong Ft. Sweden Laundry.mp3',
  },
];

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: DEFAULT_PRELOAD_TRACKS,
  currentTrackIndex: 0,
  isPlaying: false,
  isDemoSynth: false,
  volume: 0.85,
  currentTime: 0,
  duration: 0,
  playbackProgress: 0,
  activeAudioUrl: null,

  isLiveInput: false,
  liveInputType: null,
  liveTrackTitle: null,
  liveTrackArtist: null,
  setLiveTrackInfo: (title: string | null, artist: string | null) =>
    set({ liveTrackTitle: title, liveTrackArtist: artist }),
  activeTab: 'system',
  colorTheme: 'cyan-magenta',
  cameraMode: 'vista',
  physicsConcept: 'solarsystem',
  selectedPlanet: null,
  auroraSpectralMode: true,
  visibleLayers: {
    core: true,
    rings: true,
    grid: true,
    particles: true,
  },

  setActiveTab: (tab: ActiveTab) => set({ activeTab: tab }),

  setPhysicsConcept: (concept: PhysicsConcept) => set({ physicsConcept: concept, selectedPlanet: null }),
  setSelectedPlanet: (planet: string | null) => set({ selectedPlanet: planet }),
  toggleAuroraSpectralMode: () => set((state) => ({ auroraSpectralMode: !state.auroraSpectralMode })),
  setAuroraSpectralMode: (val: boolean) => set({ auroraSpectralMode: val }),

  loadFiles: (fileList: FileList | File[]) => {
    const validExtensions = /\.(mp3|wav|flac|ogg|m4a|aac|opus)$/i;
    const files = Array.from(fileList).filter(f => validExtensions.test(f.name) || f.type.startsWith('audio/'));

    if (files.length === 0) return;

    const newTracks: Track[] = files.map((file, idx) => {
      const { title, artist } = parseTrackMetadata(file.name);
      return {
        id: `track-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        artist,
        fileName: file.name,
        file,
      };
    });

    const currentTracks = get().tracks;
    const combinedTracks = [...currentTracks, ...newTracks];
    const startIndex = currentTracks.length === 0 ? 0 : get().currentTrackIndex;

    set({ tracks: combinedTracks });

    // If nothing was playing, select and play the first newly added track
    if (get().currentTrackIndex === -1 && combinedTracks.length > 0) {
      get().selectTrack(startIndex);
    }
  },

  selectTrack: (index: number) => {
    const { tracks, activeAudioUrl, isDemoSynth } = get();
    if (index < 0 || index >= tracks.length) return;

    // Stop demo synth if running
    if (isDemoSynth) {
      AudioEngine.getInstance().stopDemoSynth();
      set({ isDemoSynth: false });
    }

    // Lazy memory management: Revoke previous Object URL to save RAM
    if (activeAudioUrl) {
      try {
        URL.revokeObjectURL(activeAudioUrl);
      } catch (e) {
        console.warn('Error revoking ObjectURL:', e);
      }
    }

    const targetTrack = tracks[index];
    let nextUrl: string;

    if (targetTrack.file) {
      // Lazy ObjectURL creation
      nextUrl = URL.createObjectURL(targetTrack.file);
    } else if (targetTrack.url) {
      nextUrl = targetTrack.url;
    } else {
      return;
    }

    const audio = getGlobalAudio();

    // Critical: For local files (blob:/data:) or same-origin paths (/music/...), NEVER use crossorigin; it triggers Chromium security zeroing out Web Audio FFT!
    if (nextUrl.startsWith('blob:') || nextUrl.startsWith('data:') || nextUrl.startsWith('/')) {
      audio.removeAttribute('crossorigin');
    } else if (nextUrl.startsWith('http')) {
      audio.crossOrigin = 'anonymous';
    }

    audio.src = nextUrl;
    audio.volume = get().volume;
    audio.currentTime = 0;

    const engine = AudioEngine.getInstance();
    engine.initContext();
    if (engine.ctx && engine.ctx.state === 'suspended') {
      engine.ctx.resume().catch(console.error);
    }
    engine.connectAudioElement(audio);
    engine.resetAudioTracking();

    audio.play().then(() => {
      set({
        currentTrackIndex: index,
        activeAudioUrl: nextUrl,
        isPlaying: true,
        playbackProgress: 0,
        currentTime: 0,
      });
    }).catch(err => {
      console.warn('Playback error / Autoplay prevented:', err);
      set({
        currentTrackIndex: index,
        activeAudioUrl: nextUrl,
        isPlaying: false,
      });
    });
  },

  togglePlay: () => {
    const { isPlaying, currentTrackIndex, tracks, isDemoSynth } = get();

    if (isDemoSynth) {
      // If demo synth is active, toggle demo synth
      const playing = AudioEngine.getInstance().toggleDemoSynth();
      set({ isPlaying: playing, isDemoSynth: playing });
      return;
    }

    if (currentTrackIndex === -1) {
      if (tracks.length > 0) {
        get().selectTrack(0);
      } else {
        // No tracks loaded -> start demo synth
        get().toggleDemoSynth();
      }
      return;
    }

    const audio = getGlobalAudio();
    // If audio has not been assigned a src yet (e.g. preloaded default track), select it first
    if (!audio.src && currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
      get().selectTrack(currentTrackIndex);
      return;
    }

    const engine = AudioEngine.getInstance();
    engine.initContext();
    if (engine.ctx && engine.ctx.state === 'suspended') {
      engine.ctx.resume().catch(console.error);
    }
    engine.connectAudioElement(audio);
    engine.resetAudioTracking();

    if (isPlaying) {
      audio.pause();
      set({ isPlaying: false });
    } else {
      audio.play().then(() => {
        set({ isPlaying: true });
      }).catch(console.error);
    }
  },

  playNext: () => {
    const { tracks, currentTrackIndex } = get();
    if (tracks.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    get().selectTrack(nextIndex);
  },

  playPrev: () => {
    const { tracks, currentTrackIndex } = get();
    if (tracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    get().selectTrack(prevIndex);
  },

  seek: (progress: number) => {
    const audio = getGlobalAudio();
    if (audio.duration && !isNaN(audio.duration)) {
      audio.currentTime = progress * audio.duration;
      AudioEngine.getInstance().resetAudioTracking();
      set({ playbackProgress: progress, currentTime: audio.currentTime });
    }
  },

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    const audio = getGlobalAudio();
    audio.volume = clamped;
    set({ volume: clamped });
  },

  toggleDemoSynth: () => {
    const engine = AudioEngine.getInstance();
    const isCurrentlyDemo = get().isDemoSynth;

    if (isCurrentlyDemo) {
      engine.stopDemoSynth();
      set({ isDemoSynth: false, isPlaying: false });
    } else {
      // Pause real audio if playing
      const audio = getGlobalAudio();
      audio.pause();

      engine.resetAudioTracking();
      engine.startDemoSynth();
      set({ isDemoSynth: true, isPlaying: true });
    }
  },

  setColorTheme: (theme: ColorTheme) => {
    set({ colorTheme: theme });
  },

  setCameraMode: (mode: CameraMode | 'cinematic') => {
    const resolvedMode: CameraMode = mode === 'cinematic' ? 'vista' : mode;
    set({ cameraMode: resolvedMode });
  },

  toggleLayer: (layer: 'core' | 'rings' | 'grid' | 'particles') => {
    set(state => ({
      visibleLayers: {
        ...state.visibleLayers,
        [layer]: !state.visibleLayers[layer],
      },
    }));
  },

  updateTime: (currentTime: number, duration: number) => {
    const progress = duration > 0 ? currentTime / duration : 0;
    set({ currentTime, duration, playbackProgress: progress });
  },

  toggleSystemAudio: async () => {
    const engine = AudioEngine.getInstance();
    const { isLiveInput, isDemoSynth } = get();

    if (isLiveInput) {
      engine.stopLiveInput();
      const audio = getGlobalAudio();
      audio.muted = false;
      set({ isLiveInput: false, liveInputType: null, liveTrackTitle: null, liveTrackArtist: null });
      return false;
    } else {
      // Always pause and mute local audio so it NEVER conflicts with Spotify
      const audio = getGlobalAudio();
      audio.pause();
      audio.muted = true;
      if (isDemoSynth) {
        engine.stopDemoSynth();
        set({ isDemoSynth: false });
      }
      set({ isPlaying: false });

      const success = await engine.startSystemAudioCapture(() => {
        getGlobalAudio().muted = false;
        set({ isLiveInput: false, liveInputType: null, liveTrackTitle: null, liveTrackArtist: null });
      });

      if (success) {
        let initialTitle = engine.liveTrackMeta ? engine.liveTrackMeta.title : 'SPOTIFY LIVE STREAM';
        let initialArtist = engine.liveTrackMeta ? engine.liveTrackMeta.artist : 'DESKTOP AUDIO';

        try {
          const res = await fetch('/api/now-playing');
          if (res.ok) {
            const data = await res.json();
            if (data && data.title && data.title.trim().length > 0) {
              initialTitle = data.title;
              initialArtist = data.artist || 'SPOTIFY';
            }
          }
        } catch {
          // ignore offline fallback
        }

        set({
          isLiveInput: true,
          liveInputType: 'system',
          liveTrackTitle: initialTitle,
          liveTrackArtist: initialArtist,
        });
      } else {
        set({ isLiveInput: false, liveInputType: null });
      }
      return success;
    }
  },

  toggleMicAudio: async () => {
    const engine = AudioEngine.getInstance();
    const { isLiveInput, isDemoSynth } = get();

    if (isLiveInput) {
      engine.stopLiveInput();
      const audio = getGlobalAudio();
      audio.muted = false;
      set({ isLiveInput: false, liveInputType: null, liveTrackTitle: null, liveTrackArtist: null });
      return false;
    } else {
      const audio = getGlobalAudio();
      audio.pause();
      audio.muted = true;
      if (isDemoSynth) {
        engine.stopDemoSynth();
        set({ isDemoSynth: false });
      }
      set({ isPlaying: false });

      const success = await engine.startMicAudioCapture(() => {
        getGlobalAudio().muted = false;
        set({ isLiveInput: false, liveInputType: null, liveTrackTitle: null, liveTrackArtist: null });
      });

      if (success) {
        set({
          isLiveInput: true,
          liveInputType: 'mic',
          liveTrackTitle: 'MICROPHONE / STEREO MIX',
          liveTrackArtist: 'LOCAL AUDIO INPUT',
        });
      } else {
        set({ isLiveInput: false, liveInputType: null });
      }
      return success;
    }
  },

  handleTrackEnd: () => {
    const { tracks, currentTrackIndex } = get();
    if (tracks.length > 1) {
      get().playNext();
    } else {
      set({ isPlaying: false, playbackProgress: 0, currentTime: 0 });
    }
  },
}));

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).usePlayerStore = usePlayerStore;
}
