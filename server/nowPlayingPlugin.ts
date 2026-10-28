import { Plugin } from 'vite';
import { spawn, execFile, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface NowPlayingData {
  title?: string;
  artist?: string;
  album?: string;
  status?: string;
  position?: number;
  duration?: number;
  source?: string;
  artwork?: string;
  lyrics?: LyricsResponse | null;
  spotifyVolume?: { volume: number; muted: boolean } | null;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface LyricsResponse {
  trackName?: string;
  artistName?: string;
  synced: boolean;
  lines: LyricLine[];
  plainLyrics?: string;
}

const artworkCache = new Map<string, string | null>();
const pendingArtworkFetches = new Set<string>();

const lyricsCache = new Map<string, LyricsResponse | null>();
const lyricsNegativeCache = new Map<string, number>(); // cacheKey -> expiresAt timestamp (15s TTL)
const pendingLyricsFetches = new Set<string>();

function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = parseFloat('0.' + match[3]);
      const time = min * 60 + sec + ms;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

function hasHangul(str: string): boolean {
  return /[\uac00-\ud7af]/.test(str || '');
}

function hasJapanese(str: string): boolean {
  return /[\u3040-\u30ff]/.test(str || '');
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

interface LrcItem {
  id: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: string;
  plainLyrics?: string;
}

async function fetchLyricsForTrack(
  title: string,
  artist: string,
  duration?: number,
  album?: string
): Promise<LyricsResponse | null> {
  const cTitle = cleanTrackTitle(title) || title.trim();
  const cArtist = cleanArtistName(artist) || artist.trim();
  const cacheKey = `${cTitle.toLowerCase()} - ${cArtist.toLowerCase()}`;

  // Positive cache check (cached successful lyrics)
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey) || null;
  }

  // Temporary negative cache check (short 3s cooldown to allow fast auto-healing)
  const negExpires = lyricsNegativeCache.get(cacheKey);
  if (negExpires && Date.now() < negExpires) {
    return null;
  }

  if (pendingLyricsFetches.has(cacheKey)) {
    return null;
  }

  pendingLyricsFetches.add(cacheKey);

  try {
    const headers = { 'User-Agent': 'Cyberpulse3D/1.0.0 (https://github.com/NhatCam2006/cyberpulse-3d)' };

    // Build multi-tier search & direct get URLs fired concurrently for high recall & resilience
    const urls: string[] = [
      `https://lrclib.net/api/search?q=${encodeURIComponent(cTitle + ' ' + cArtist)}`,
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(cTitle)}&artist_name=${encodeURIComponent(cArtist)}`,
      `https://lrclib.net/api/get?track_name=${encodeURIComponent(cTitle)}&artist_name=${encodeURIComponent(cArtist)}`,
    ];

    if (duration && duration > 0) {
      urls.unshift(`https://lrclib.net/api/get?track_name=${encodeURIComponent(cTitle)}&artist_name=${encodeURIComponent(cArtist)}&duration=${Math.round(duration)}`);
    }

    // If artist has multiple words or moniker (e.g. "HENRY LAU" -> "HENRY"), query first word
    const artistTokens = cArtist.split(/\s+/).filter(Boolean);
    if (artistTokens.length > 1) {
      urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(cTitle + ' ' + artistTokens[0])}`);
      urls.push(`https://lrclib.net/api/get?track_name=${encodeURIComponent(cTitle)}&artist_name=${encodeURIComponent(artistTokens[0])}`);
    }

    // If original title had bracketed/Hangul alternate (e.g. "태풍 (The Eye)" or "Only One"), query raw title
    if (title !== cTitle) {
      urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(title.trim() + ' ' + cArtist)}`);
      urls.push(`https://lrclib.net/api/get?track_name=${encodeURIComponent(title.trim())}&artist_name=${encodeURIComponent(cArtist)}`);
    }

    const fetchPromises = urls.map((u) =>
      fetch(u, { headers, signal: AbortSignal.timeout(3800) })
        .then(async (res) => {
          if (!res.ok) return [] as LrcItem[];
          const json = await res.json();
          if (Array.isArray(json)) return json as LrcItem[];
          if (json && typeof json === 'object' && (json as LrcItem).id) return [json as LrcItem];
          return [] as LrcItem[];
        })
        .catch(() => [] as LrcItem[])
    );

    const results = await Promise.allSettled(fetchPromises);
    const candidates: LrcItem[] = [];

    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        candidates.push(...r.value);
      }
    }

    // Deduplicate by entry ID
    const seen = new Set<number>();
    const unique = candidates.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    if (unique.length === 0) {
      lyricsNegativeCache.set(cacheKey, Date.now() + 3000);
      pendingLyricsFetches.delete(cacheKey);
      return null;
    }

    // Detect if this song has Korean context (Korean artist or any candidate contains Hangul)
    const isKoreanContext =
      hasHangul(title) ||
      hasHangul(artist) ||
      unique.some(
        (item) =>
          hasHangul(item.syncedLyrics || '') ||
          hasHangul(item.plainLyrics || '') ||
          hasHangul(item.artistName || '') ||
          hasHangul(item.trackName || '')
      ) ||
      /henry|boa|woodz|vixx|tvxq|bts|blackpink|exo|twice|newjeans|aespa|stray kids|seventeen|taeyeon|iu|monsta x|red velvet|nct|ateez|mc mong|bigbang|shinee|super junior|infinite/i.test(
        cArtist
      );

    // Score and rank candidates to preserve native language and authentic version
    const scored = unique.map((item) => {
      let score = 0;
      const lrc = item.syncedLyrics || item.plainLyrics || '';
      const itemTitleLower = (item.trackName || '').toLowerCase();
      const userTitleLower = cTitle.toLowerCase();

      if (item.syncedLyrics) score += 100;
      else if (item.plainLyrics) score += 20;

      // Penalize unwanted localized translations if the original track doesn't ask for them
      if (!userTitleLower.includes('english') && (itemTitleLower.includes('english') || itemTitleLower.includes('(eng)'))) {
        score -= 250;
      }
      if (!userTitleLower.includes('japanese') && (itemTitleLower.includes('japanese') || itemTitleLower.includes('(jap)') || hasJapanese(lrc))) {
        score -= 250;
      }
      if (!userTitleLower.includes('chinese') && itemTitleLower.includes('chinese')) {
        score -= 250;
      }

      // Authentic Korean Hangul priority (never replace Korean with Romanized English or Japanese)
      if (isKoreanContext) {
        if (hasHangul(lrc)) {
          score += 300; // Strongest boost for authentic Korean Hangul characters
        }
      }

      // Exact title match bonus
      if (itemTitleLower === userTitleLower) {
        score += 60;
      }

      // Duration proximity (closer to Spotify duration gets higher score)
      if (duration && item.duration) {
        const diff = Math.abs(duration - item.duration);
        if (diff < 4) score += 50;
        else if (diff < 10) score += 25;
        else if (diff > 35) score -= 40;
      }

      // Album title match bonus
      if (album && item.albumName && item.albumName.toLowerCase().includes(album.toLowerCase())) {
        score += 30;
      }

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]?.item;

    if (best) {
      if (best.syncedLyrics) {
        const lines = parseLrc(best.syncedLyrics);
        const response: LyricsResponse = {
          trackName: best.trackName || title,
          artistName: best.artistName || artist,
          synced: true,
          lines,
          plainLyrics: best.plainLyrics,
        };
        lyricsCache.set(cacheKey, response);
        lyricsNegativeCache.delete(cacheKey);
        pendingLyricsFetches.delete(cacheKey);
        return response;
      } else if (best.plainLyrics) {
        const response: LyricsResponse = {
          trackName: best.trackName || title,
          artistName: best.artistName || artist,
          synced: false,
          lines: [],
          plainLyrics: best.plainLyrics,
        };
        lyricsCache.set(cacheKey, response);
        lyricsNegativeCache.delete(cacheKey);
        pendingLyricsFetches.delete(cacheKey);
        return response;
      }
    }

    lyricsNegativeCache.set(cacheKey, Date.now() + 15000);
    pendingLyricsFetches.delete(cacheKey);
    return null;
  } catch {
    lyricsNegativeCache.set(cacheKey, Date.now() + 10000);
    pendingLyricsFetches.delete(cacheKey);
    return null;
  }
}

async function fetchArtworkForTrack(title: string, artist: string): Promise<string | null> {
  const cleanTitle = cleanTrackTitle(title) || title.trim();
  const cleanArtist = cleanArtistName(artist) || artist.trim();
  const cacheKey = `${cleanTitle.toLowerCase()} - ${cleanArtist.toLowerCase()}`;

  if (artworkCache.has(cacheKey)) {
    return artworkCache.get(cacheKey) || null;
  }
  if (pendingArtworkFetches.has(cacheKey)) {
    return null;
  }

  pendingArtworkFetches.add(cacheKey);

  try {
    const query = `${cleanTitle} ${cleanArtist}`.trim() || cleanTitle;

    // 1. Try iTunes Search API (High resolution 600x600)
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (itunesRes.ok) {
        const json = (await itunesRes.json()) as { results?: Array<{ artworkUrl100?: string }> };
        if (json.results && json.results.length > 0 && json.results[0].artworkUrl100) {
          const hdUrl = json.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
          artworkCache.set(cacheKey, hdUrl);
          pendingArtworkFetches.delete(cacheKey);
          return hdUrl;
        }
      }
    } catch {
      // Fall through to Deezer
    }

    // 2. Try Deezer Search API
    try {
      const deezerRes = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (deezerRes.ok) {
        const json = (await deezerRes.json()) as {
          data?: Array<{ album?: { cover_big?: string; cover_medium?: string } }>;
        };
        if (json.data && json.data.length > 0 && json.data[0].album) {
          const cover = json.data[0].album.cover_big || json.data[0].album.cover_medium;
          if (cover) {
            artworkCache.set(cacheKey, cover);
            pendingArtworkFetches.delete(cacheKey);
            return cover;
          }
        }
      }
    } catch {
      // Fall through
    }

    artworkCache.set(cacheKey, null);
    pendingArtworkFetches.delete(cacheKey);
    return null;
  } catch {
    pendingArtworkFetches.delete(cacheKey);
    return null;
  }
}

export function nowPlayingPlugin(): Plugin {
  let cachedMediaInfo: NowPlayingData | null = null;
  let child: ChildProcess | null = null;
  let lastPrefetchedTrackKey: string | null = null;

  const setSpotifyVolumeExe = path.resolve(__dirname, 'SetSpotifyVolume.exe');
  let isSettingVolume = false;
  let pendingVolume: number | string | null = null;
  let currentSpotifyVolume: { volume: number; muted: boolean } | null = null;
  let lastVolumeQueryTime = 0;

  function applySpotifyVolume(val: number | 'mute' | 'unmute') {
    if (!fs.existsSync(setSpotifyVolumeExe)) return;
    if (isSettingVolume) {
      pendingVolume = val;
      return;
    }
    isSettingVolume = true;
    const arg = typeof val === 'number' ? val.toFixed(3) : val;
    execFile(setSpotifyVolumeExe, [arg], (err, stdout) => {
      isSettingVolume = false;
      if (!err && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.ok) {
            currentSpotifyVolume = { volume: parsed.volume, muted: parsed.muted };
            lastVolumeQueryTime = Date.now();
          }
        } catch {}
      }
      if (pendingVolume !== null) {
        const next = pendingVolume;
        pendingVolume = null;
        applySpotifyVolume(next as any);
      }
    });
  }

  function refreshSpotifyVolume() {
    const now = Date.now();
    if (now - lastVolumeQueryTime < 1200) return;
    lastVolumeQueryTime = now;
    if (!fs.existsSync(setSpotifyVolumeExe)) return;
    execFile(setSpotifyVolumeExe, ['get'], (err, stdout) => {
      if (!err && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.ok) {
            currentSpotifyVolume = { volume: parsed.volume, muted: parsed.muted };
          }
        } catch {}
      }
    });
  }

  return {
    name: 'vite-now-playing-plugin',
    configureServer(server) {
      if (process.platform === 'win32') {
        const scriptPath = path.resolve(__dirname, 'smtc-bridge.ps1');

        try {
          child = spawn(
            'powershell.exe',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
            {
              stdio: ['ignore', 'pipe', 'ignore'],
              windowsHide: true,
            }
          );

          child.stdout?.setEncoding('utf8');
          let buffer = '';

          child.stdout?.on('data', (chunk: string) => {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                  const data = JSON.parse(trimmed) as NowPlayingData;
                  if (data && data.title) {
                    const prevArtwork = cachedMediaInfo?.title === data.title ? cachedMediaInfo.artwork : undefined;
                    const prevLyrics = cachedMediaInfo?.title === data.title ? cachedMediaInfo.lyrics : undefined;
                    cachedMediaInfo = {
                      ...data,
                      artwork: prevArtwork,
                      lyrics: prevLyrics,
                    };

                    const cleanTitle = cleanTrackTitle(data.title) || data.title.trim();
                    const cleanArtist = cleanArtistName(data.artist || '') || (data.artist || '').trim();
                    const trackKey = `${cleanTitle.toLowerCase()} - ${cleanArtist.toLowerCase()}`;

                    // Pre-fetch artwork and lyrics on song change or auto-heal if previously missing
                    const isNewTrack = lastPrefetchedTrackKey !== trackKey;
                    const isMissingLyrics = !cachedMediaInfo.lyrics && Boolean(data.duration && data.duration > 0);

                    if (isNewTrack || isMissingLyrics) {
                      if (isNewTrack) {
                        lastPrefetchedTrackKey = trackKey;
                      }

                      // Pre-fetch artwork
                      if (!cachedMediaInfo.artwork) {
                        const cached = artworkCache.get(trackKey);
                        if (cached) {
                          cachedMediaInfo.artwork = cached;
                        } else {
                          fetchArtworkForTrack(data.title, data.artist || '').then((art) => {
                            if (art && cachedMediaInfo && cachedMediaInfo.title === data.title) {
                              cachedMediaInfo.artwork = art;
                            }
                          });
                        }
                      }

                      // Pre-fetch lyrics and embed directly into cachedMediaInfo
                      if (!cachedMediaInfo.lyrics) {
                        fetchLyricsForTrack(cleanTitle, cleanArtist, data.duration, data.album).then((lyr) => {
                          if (lyr && cachedMediaInfo && cachedMediaInfo.title === data.title) {
                            cachedMediaInfo.lyrics = lyr;
                          }
                        });
                      }
                    }
                  }
                } catch {
                  // ignore JSON parse errors
                }
              }
            }
          });

          child.on('error', (err) => {
            console.warn('[NowPlaying] PowerShell bridge error:', err.message);
          });
        } catch (e) {
          console.warn('[NowPlaying] Could not start bridge:', e);
        }
      }

      // Serve GET /api/now-playing
      server.middlewares.use('/api/now-playing', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store');

        refreshSpotifyVolume();

        if (cachedMediaInfo && cachedMediaInfo.title) {
          const cleanTitle = cleanTrackTitle(cachedMediaInfo.title) || cachedMediaInfo.title.trim();
          const cleanArtist = cleanArtistName(cachedMediaInfo.artist || '') || (cachedMediaInfo.artist || '').trim();
          const trackKey = `${cleanTitle.toLowerCase()} - ${cleanArtist.toLowerCase()}`;
          if (!cachedMediaInfo.lyrics && lyricsCache.has(trackKey)) {
            cachedMediaInfo.lyrics = lyricsCache.get(trackKey);
          }
          if (!cachedMediaInfo.artwork && artworkCache.has(trackKey)) {
            cachedMediaInfo.artwork = artworkCache.get(trackKey) || undefined;
          }
        }

        const payload: NowPlayingData = {
          ...(cachedMediaInfo || { status: 'idle' }),
          spotifyVolume: currentSpotifyVolume,
        };

        res.end(JSON.stringify(payload));
      });

      // Serve POST /api/media-control
      server.middlewares.use('/api/media-control', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const { action, value } = JSON.parse(body || '{}');

              // Spotify WASAPI Direct Volume & Mute control
              if (action === 'volume' && typeof value === 'number') {
                const clamped = Math.max(0, Math.min(1, value));
                applySpotifyVolume(clamped);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ ok: true, action: 'volume', value: clamped }));
                return;
              }

              if (action === 'mute') {
                applySpotifyVolume('mute');
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ ok: true, action: 'mute' }));
                return;
              }

              if (action === 'unmute') {
                applySpotifyVolume('unmute');
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ ok: true, action: 'unmute' }));
                return;
              }

              const cmdPath = path.resolve(__dirname, '.cmd');
              let cmdStr = '';
              if (action === 'play_pause') {
                cmdStr = 'PLAY_PAUSE';
              } else if (action === 'next') {
                cmdStr = 'NEXT';
              } else if (action === 'prev') {
                cmdStr = 'PREV';
              } else if (action === 'seek' && typeof value === 'number') {
                cmdStr = `SEEK:${value}`;
              }

              if (cmdStr) {
                fs.writeFileSync(cmdPath, cmdStr, 'utf8');
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ ok: true, action }));
                return;
              }
            } catch {
              // ignore
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ ok: false }));
          });
          return;
        }
        res.statusCode = 405;
        res.end();
      });

      // Serve GET /api/artwork?term=...&artist=...
      server.middlewares.use('/api/artwork', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        try {
          const url = new URL(req.url || '', 'http://localhost');
          const term = url.searchParams.get('term') || '';
          const artist = url.searchParams.get('artist') || '';

          if (!term && !artist) {
            res.end(JSON.stringify({ artwork: null }));
            return;
          }

          const art = await fetchArtworkForTrack(term, artist);
          res.end(JSON.stringify({ artwork: art }));
        } catch {
          res.end(JSON.stringify({ artwork: null }));
        }
      });

      // Serve GET /api/lyrics?track=...&artist=...&duration=...&album=...
      server.middlewares.use('/api/lyrics', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        try {
          const url = new URL(req.url || '', 'http://localhost');
          const track = url.searchParams.get('track') || url.searchParams.get('title') || '';
          const artist = url.searchParams.get('artist') || '';
          const album = url.searchParams.get('album') || '';
          const durStr = url.searchParams.get('duration');
          const duration = durStr ? parseFloat(durStr) : undefined;

          if (!track && !artist) {
            res.end(JSON.stringify({ synced: false, lines: [] }));
            return;
          }

          const lyrics = await fetchLyricsForTrack(track, artist, duration, album);
          res.end(JSON.stringify(lyrics || { synced: false, lines: [] }));
        } catch {
          res.end(JSON.stringify({ synced: false, lines: [] }));
        }
      });

      // Cleanup child process on server exit
      const killChild = () => {
        const cmdPath = path.resolve(__dirname, '.cmd');
        try {
          fs.unlinkSync(cmdPath);
        } catch {}
        if (child) {
          try {
            child.kill();
          } catch {
            // ignore
          }
          child = null;
        }
      };

      server.httpServer?.on('close', killChild);
      process.on('exit', killChild);
      process.on('SIGINT', () => {
        killChild();
        process.exit();
      });
    },
  };
}
