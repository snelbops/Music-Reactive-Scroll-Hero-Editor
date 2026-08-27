import { defineConfig, type Plugin } from 'vite'
import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

function remotionExportPlugin(): Plugin {
  return {
    name: 'remotion-export-plugin',
    configureServer(server) {
      server.middlewares.use('/api/export-remotion', async (req, res, next) => {
        // A GET answers the availability probe. Without it the app cannot tell a running
        // renderer from Vite's SPA fallback, which serves index.html for anything unmatched
        // — so a built copy with no renderer at all looks identical to a working one.
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ available: true, renderer: 'remotion-dev-server' }));
          return;
        }
        if (req.method !== 'POST') return next();

        // Prevent Node HTTP server socket timeout during Remotion rendering
        req.setTimeout(600000);
        res.setTimeout(600000);

        // Accumulate raw Buffer chunks — avoids V8 string-concat OOM for large base64 payloads (50-200 MB)
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => { chunks.push(chunk); });
        req.on('end', async () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8');
            const data = JSON.parse(body);
            const { renderRemotionVideoServer } = await import('./src/server/remotionServer');

            const publicDir = path.resolve(process.cwd(), 'public');
            if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

            if (!data.inputProps) data.inputProps = {};

            // The temp files below are written into public/, so this very server already
            // serves them. This used to hand Remotion a hard-coded http://localhost:5174,
            // a second Vite instance that nothing in the project starts — so headless
            // Chrome got a refused connection and the render failed unless one happened
            // to be running.
            const origin = `http://${req.headers.host ?? 'localhost:5173'}`;

            // Save video buffer to static public folder for Headless Chrome
            if (data.videoBase64) {
              // Strip any data URL header regardless of MIME type
              const base64Data = data.videoBase64.replace(/^data:[^;]+;base64,/, '');
              const videoBuffer = Buffer.from(base64Data, 'base64');
              const tempVideoPath = path.resolve(publicDir, 'temp-export-video.mp4');
              fs.writeFileSync(tempVideoPath, videoBuffer);
              console.log(`[Remotion] Wrote video: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB → ${tempVideoPath}`);
              data.inputProps.videoUrl = `${origin}/temp-export-video.mp4`;
            } else {
              console.warn('[Remotion] No videoBase64 received — Remotion will render without video');
            }

            // Save audio buffer to static public folder for Headless Chrome
            if (data.audioBase64) {
              const base64Data = data.audioBase64.replace(/^data:[^;]+;base64,/, '');
              const audioBuffer = Buffer.from(base64Data, 'base64');
              const tempAudioPath = path.resolve(publicDir, 'temp-export-audio.mp3');
              fs.writeFileSync(tempAudioPath, audioBuffer);
              data.inputProps.audioUrl = `${origin}/temp-export-audio.mp3`;
            }

            const outDir = path.resolve(process.cwd(), 'out');
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

            const outputPath = path.resolve(outDir, `remotion-export-${Date.now()}.mp4`);

            await renderRemotionVideoServer({
              durationInFrames: data.durationInFrames || 600,
              fps: data.fps || 60,
              width: data.width || 1920,
              height: data.height || 1080,
              startFrame: data.startFrame || 0,
              inputProps: data.inputProps,
              outputPath,
            });

            if (fs.existsSync(outputPath)) {
              const stat = fs.statSync(outputPath);
              res.writeHead(200, {
                'Content-Type': 'video/mp4',
                'Content-Length': stat.size,
                'Content-Disposition': 'attachment; filename="scroll-hero-remotion.mp4"',
              });
              fs.createReadStream(outputPath).pipe(res);
            } else {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Render file not generated' }));
            }
          } catch (err: any) {
            console.error('Remotion Export Error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}


// https://vite.dev/config/
// Stamped into the app so the running build is identifiable at a glance. Feeds the
// temporary build banner in Layout.tsx — remove both together when it is no longer needed.
const BUILD_STAMP = (() => {
  try {
    const sha = execSync('git rev-parse --short HEAD').toString().trim();
    const when = execSync("git log -1 --format=%cd --date=format:'%d %b %H:%M'").toString().trim().replace(/'/g, '');
    return `${sha} · ${when}`;
  } catch {
    return 'unknown build';
  }
})();

export default defineConfig({
  define: { __BUILD_STAMP__: JSON.stringify(BUILD_STAMP) },
  plugins: [react(), tailwindcss(), remotionExportPlugin()],
  optimizeDeps: {
    // @ffmpeg/ffmpeg uses a worker internally — exclude from Vite pre-bundling
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  // Tauri prints Rust compiler errors into this same terminal; clearing the screen
  // between rebuilds throws them away before they can be read.
  clearScreen: false,
  server: {
    allowedHosts: true,
    // Pinned rather than left to drift. The desktop shell loads http://localhost:5173 and
    // the e2e suite targets the same port, so silently moving to 5174 when the port is
    // busy would point the window at nothing — the failure the Remotion export already had
    // when it assumed a second server on 5174.
    port: 5173,
    strictPort: true,
    // Rust build output churns constantly and is not part of the frontend.
    watch: { ignored: ["**/src-tauri/**"] },
    // Required for SharedArrayBuffer used by ffmpeg WASM
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
