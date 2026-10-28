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
                    cachedMediaInfo = data;
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
