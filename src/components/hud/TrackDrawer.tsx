import React, { useRef } from 'react';
import {
  FolderOpen,
  FilePlus,
  X,
  Music,
  Play,
  Volume2,
  Trash2,
  Disc3,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

interface TrackDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrackDrawer: React.FC<TrackDrawerProps> = ({ isOpen, onClose }) => {
  const tracks = usePlayerStore(state => state.tracks);
  const currentTrackIndex = usePlayerStore(state => state.currentTrackIndex);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const isDemoSynth = usePlayerStore(state => state.isDemoSynth);
  const loadFiles = usePlayerStore(state => state.loadFiles);
  const selectTrack = usePlayerStore(state => state.selectTrack);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadFiles(e.target.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadFiles(e.target.files);
    }
  };

  const handleClearPlaylist = () => {
    usePlayerStore.setState({
      tracks: [],
      currentTrackIndex: -1,
      isPlaying: false,
    });
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-[#080808] border-l border-white/15 shadow-2xl flex flex-col font-mono select-none">
      {/* Hidden file inputs for webkitdirectory and normal audio files */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in WebKit/Blink
        webkitdirectory=""
        directory=""
        multiple
        accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
        className="hidden"
        onChange={handleFolderSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Disc3 className="w-4 h-4 text-white animate-[spin_6s_linear_infinite]" />
          <div>
            <h2 className="text-xs font-bold text-white tracking-widest uppercase">
              AUDIO ARCHIVE
            </h2>
            <p className="text-[10px] text-neutral-500">
              {tracks.length} {tracks.length === 1 ? 'FILE' : 'FILES'} LOADED
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons: Load Folder & Add Files */}
      <div className="p-3 border-b border-white/10 flex flex-col gap-2 bg-[#0c0c0c]">
        <div className="grid grid-cols-2 gap-2">
          {/* Folder Picker */}
          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-1.5 px-3 rounded bg-white text-black hover:bg-neutral-200 text-xs font-bold tracking-wider transition-all"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>FOLDER</span>
          </button>

          {/* Add Files */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-1.5 px-3 rounded bg-[#181818] hover:bg-[#222222] border border-white/15 text-white text-xs font-medium tracking-wider transition-all"
          >
            <FilePlus className="w-3.5 h-3.5 text-neutral-300" />
            <span>FILES</span>
          </button>
        </div>

        {tracks.length > 0 && (
          <button
            onClick={handleClearPlaylist}
            className="flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-transparent hover:bg-white/5 border border-white/10 text-neutral-400 hover:text-neutral-200 text-[10px] transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>CLEAR ALL</span>
          </button>
        )}
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-white/20">
        {tracks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <Music className="w-10 h-10 text-neutral-700 mb-3 stroke-1" />
            <div className="text-xs font-semibold text-neutral-400 mb-1 tracking-wider uppercase">
              NO LOCAL TRACKS
            </div>
            <div className="text-[11px] text-neutral-600 leading-relaxed mb-4">
              Click &quot;Folder&quot;, &quot;Files&quot;, or Drag &amp; Drop audio files anywhere.
            </div>
            <div className="text-[9px] text-neutral-500 bg-[#121212] px-2.5 py-1 rounded border border-white/5 uppercase">
              MP3, WAV, FLAC, OGG, M4A
            </div>
          </div>
        ) : (
          tracks.map((track, idx) => {
            const isSelected = currentTrackIndex === idx && !isDemoSynth;
            const isCurrentlyActive = isSelected && isPlaying;

            return (
              <div
                key={track.id}
                onClick={() => selectTrack(idx)}
                className={`group relative p-2 rounded border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#181818] border-white/40'
                    : 'bg-[#101010] border-white/10 hover:bg-[#141414] hover:border-white/20'
                }`}
              >
                {/* Index / Play status */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 text-center text-xs text-neutral-500 flex items-center justify-center">
                    {isCurrentlyActive ? (
                      <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
                    ) : (
                      <span className="group-hover:hidden text-[10px]">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                    )}
                    <Play className="w-3 h-3 text-white hidden group-hover:block" />
                  </div>

                  {/* Metadata */}
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-medium truncate ${
                        isSelected ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                      }`}
                    >
                      {track.title}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {track.artist}
                    </div>
                  </div>
                </div>

                {/* File Badge */}
                <div className="shrink-0 text-[9px] text-neutral-500 uppercase px-1.5 py-0.5 rounded bg-[#0a0a0a] border border-white/10">
                  {track.fileName.split('.').pop()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-[#0a0a0a] border-t border-white/10 text-[10px] text-neutral-500 flex items-center justify-between">
        <span>MEM-MANAGEMENT</span>
        <span className="text-neutral-300">ACTIVE</span>
      </div>
    </aside>
  );
};
