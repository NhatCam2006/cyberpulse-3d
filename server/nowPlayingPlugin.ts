import { Plugin } from 'vite';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

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

const artworkCache = new Map<string, string | null>();
const pendingFetches = new Set<string>();

async function fetchArtworkForTrack(title: string, artist: string): Promise<string | null> {
  const cleanTitle = title.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cleanArtist = artist.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cacheKey = `${cleanTitle.toLowerCase()} - ${cleanArtist.toLowerCase()}`;

  if (artworkCache.has(cacheKey)) {
    return artworkCache.get(cacheKey) || null;
  }
  if (pendingFetches.has(cacheKey)) {
    return null;
  }

  pendingFetches.add(cacheKey);

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
          pendingFetches.delete(cacheKey);
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
            pendingFetches.delete(cacheKey);
            return cover;
          }
        }
      }
    } catch {
      // Fall through
    }

    artworkCache.set(cacheKey, null);
    pendingFetches.delete(cacheKey);
    return null;
  } catch {
    pendingFetches.delete(cacheKey);
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

                    if (!cachedMediaInfo.artwork) {
                      const cleanTitle = data.title.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
                      const cleanArtist = (data.artist || '').replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
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

      // Cleanup child process on server exit
      const killChild = () => {
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
