/**
 * streamMetadata.ts
 * Parses captured MediaStreamTrack labels (e.g. from Chrome getDisplayMedia)
 * into structured Song Title and Artist metadata.
 */

export interface ParsedTrackInfo {
  title: string;
  artist: string;
}

export function parseStreamMetadata(rawLabel?: string | null): ParsedTrackInfo {
  if (!rawLabel || typeof rawLabel !== 'string') {
    return { title: 'SPOTIFY LIVE STREAM', artist: 'SYSTEM AUDIO CAPTURE' };
  }

  let clean = rawLabel.trim();

  // Strip common browser prefixes: "screen:0:0", "window:1234:0", "tab:xyz"
  const isScreenPrefix = /^screen:\d+:\d+/i.test(clean);
  clean = clean.replace(/^(screen|window|tab):\d+:\d+\s*[-:]?\s*/i, '').trim();

  // Generic Entire Screen or Desktop capture
  if (isScreenPrefix || clean === '' || /^(screen|entire screen|màn hình|desktop)/i.test(clean)) {
    return { title: 'SPOTIFY / SYSTEM AUDIO', artist: 'LIVE DESKTOP CAPTURE' };
  }

  // Spotify Web or Desktop
  if (/spotify/i.test(clean)) {
    // Strip trailing "- Spotify" or "| Spotify" or "- Spotify Free"
    clean = clean.replace(/\s*[-–—|•]\s*Spotify(?:\s+(?:Free|Premium))?\s*$/i, '').trim();
    // Strip leading "Spotify - " or "Spotify Free - "
    clean = clean.replace(/^Spotify(?:\s+(?:Free|Premium))?\s*[-–—|•]\s*/i, '').trim();

    // Check bullet separator: "Song Title • Artist" (Spotify Web Player format)
    if (clean.includes('•')) {
      const parts = clean.split('•').map(s => s.trim());
      return {
        title: parts[0] || 'SPOTIFY LIVE',
        artist: parts[1] || 'SPOTIFY',
      };
    }

    // Check dash separator: "Song Title - Artist"
    if (clean.includes(' - ') || clean.includes(' – ') || clean.includes(' — ')) {
      const parts = clean.split(/\s*[-–—]\s*/).map(s => s.trim());
      return {
        title: parts[0] || 'SPOTIFY LIVE',
        artist: parts.slice(1).join(' - ') || 'SPOTIFY',
      };
    }

    if (clean.length > 0 && !/^spotify/i.test(clean)) {
      return { title: clean, artist: 'SPOTIFY' };
    }

    return { title: 'SPOTIFY LIVE STREAM', artist: 'SPOTIFY DESKTOP' };
  }

  // YouTube / YouTube Music: "Title - Artist - YouTube" or "Title - YouTube"
  if (/youtube/i.test(clean)) {
    clean = clean.replace(/\s*[-–—|•]\s*YouTube(?:\s+Music)?\s*$/i, '').trim();
    if (clean.includes(' - ') || clean.includes(' – ') || clean.includes(' — ')) {
      const parts = clean.split(/\s*[-–—]\s*/).map(s => s.trim());
      if (parts.length >= 2) {
        return {
          title: parts[0],
          artist: parts.slice(1).join(' - ') || 'YOUTUBE',
        };
      }
    }
    return { title: clean || 'YOUTUBE STREAM', artist: 'YOUTUBE' };
  }

  // Soundcloud or other media
  if (/soundcloud/i.test(clean)) {
    clean = clean.replace(/\s*[-–—|•]\s*SoundCloud\s*$/i, '').trim();
    return { title: clean || 'SOUNDCLOUD STREAM', artist: 'SOUNDCLOUD' };
  }

  // Generic window/tab with dash: "Title - Artist"
  if (clean.includes(' - ') || clean.includes(' – ') || clean.includes(' — ')) {
    const parts = clean.split(/\s*[-–—]\s*/).map(s => s.trim());
    return {
      title: parts[0] || 'LIVE AUDIO FEED',
      artist: parts.slice(1).join(' - ') || 'ACTIVE STREAM',
    };
  }

  return {
    title: clean || 'LIVE AUDIO FEED',
    artist: 'REALTIME STREAM',
  };
}
