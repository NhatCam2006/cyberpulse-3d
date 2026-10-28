import { Plugin } from 'vite';
import { spawn, ChildProcess } from 'child_process';
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

async function fetchLyricsForTrack(title: string, artist: string, duration?: number): Promise<LyricsResponse | null> {
  const cleanTitle = title.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cleanArtist = artist.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cacheKey = `${cleanTitle.toLowerCase()} - ${cleanArtist.toLowerCase()}`;

  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey) || null;
  }
  if (pendingLyricsFetches.has(cacheKey)) {
    return null;
  }

  pendingLyricsFetches.add(cacheKey);

  try {
    const headers = { 'User-Agent': 'Cyberpulse3D/1.0.0 (https://github.com/NhatCam2006/cyberpulse-3d)' };

    // 1. Try exact match on lrclib.net /api/get
    let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    if (duration && duration > 0) {
      getUrl += `&duration=${Math.round(duration)}`;
    }

    try {
      const res = await fetch(getUrl, { headers, signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = (await res.json()) as {
          trackName?: string;
          artistName?: string;
          syncedLyrics?: string;
          plainLyrics?: string;
        };

        if (json.syncedLyrics) {
          const lines = parseLrc(json.syncedLyrics);
          const response: LyricsResponse = {
            trackName: json.trackName || title,
            artistName: json.artistName || artist,
            synced: true,
            lines,
            plainLyrics: json.plainLyrics,
          };
          lyricsCache.set(cacheKey, response);
          pendingLyricsFetches.delete(cacheKey);
          return response;
        } else if (json.plainLyrics) {
          const response: LyricsResponse = {
            trackName: json.trackName || title,
            artistName: json.artistName || artist,
            synced: false,
            lines: [],
            plainLyrics: json.plainLyrics,
          };
          lyricsCache.set(cacheKey, response);
          pendingLyricsFetches.delete(cacheKey);
          return response;
        }
      }
    } catch {
      // Fall through to search
    }

    // 2. Fallback to lrclib.net /api/search
    try {
      const searchQuery = `${cleanTitle} ${cleanArtist}`.trim() || cleanTitle;
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`;
      const sRes = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(4000) });
      if (sRes.ok) {
        const list = (await sRes.json()) as Array<{
          trackName?: string;
          artistName?: string;
          syncedLyrics?: string;
          plainLyrics?: string;
        }>;

        if (Array.isArray(list) && list.length > 0) {
          const match = list.find((item) => !!item.syncedLyrics) || list[0];
          if (match.syncedLyrics) {
            const lines = parseLrc(match.syncedLyrics);
            const response: LyricsResponse = {
              trackName: match.trackName || title,
              artistName: match.artistName || artist,
              synced: true,
              lines,
              plainLyrics: match.plainLyrics,
            };
            lyricsCache.set(cacheKey, response);
            pendingLyricsFetches.delete(cacheKey);
            return response;
          } else if (match.plainLyrics) {
            const response: LyricsResponse = {
              trackName: match.trackName || title,
              artistName: match.artistName || artist,
              synced: false,
              lines: [],
              plainLyrics: match.plainLyrics,
            };
            lyricsCache.set(cacheKey, response);
            pendingLyricsFetches.delete(cacheKey);
            return response;
          }
        }
      }
    } catch {
      // Fall through
    }

    lyricsCache.set(cacheKey, null);
    pendingLyricsFetches.delete(cacheKey);
    return null;
  } catch {
    pendingLyricsFetches.delete(cacheKey);
    return null;
  }
}

async function fetchArtworkForTrack(title: string, artist: string): Promise<string | null> {
  const cleanTitle = title.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cleanArtist = artist.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
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
                    cachedMediaInfo = {
                      ...data,
                      artwork: prevArtwork,
                    };

                    const cleanTitle = data.title.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
                    const cleanArtist = (data.artist || '').replace(/\s*[\(\[].*?[\)\]]/g, '').trim();

                    // Pre-fetch artwork if not cached
                    if (!cachedMediaInfo.artwork) {
                      const cacheKey = `${cleanTitle.toLowerCase()} - ${cleanArtist.toLowerCase()}`;
                      const cached = artworkCache.get(cacheKey);
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

                    // Pre-fetch lyrics in background
                    fetchLyricsForTrack(cleanTitle, cleanArtist, data.duration);
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
        res.end(JSON.stringify(cachedMediaInfo || { status: 'idle' }));
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

      // Serve GET /api/lyrics?track=...&artist=...&duration=...
      server.middlewares.use('/api/lyrics', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        try {
          const url = new URL(req.url || '', 'http://localhost');
          const track = url.searchParams.get('track') || '';
          const artist = url.searchParams.get('artist') || '';
          const durStr = url.searchParams.get('duration');
          const duration = durStr ? parseFloat(durStr) : undefined;

          if (!track && !artist) {
            res.end(JSON.stringify({ synced: false, lines: [] }));
            return;
          }

          const lyrics = await fetchLyricsForTrack(track, artist, duration);
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
