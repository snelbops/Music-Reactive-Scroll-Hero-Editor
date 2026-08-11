import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

function remotionExportPlugin(): Plugin {
  return {
    name: 'remotion-export-plugin',
    configureServer(server) {
      server.middlewares.use('/api/export-remotion', async (req, res, next) => {
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

            // Save video buffer to static public folder for Headless Chrome
            if (data.videoBase64) {
              // Strip any data URL header regardless of MIME type
              const base64Data = data.videoBase64.replace(/^data:[^;]+;base64,/, '');
              const videoBuffer = Buffer.from(base64Data, 'base64');
              const tempVideoPath = path.resolve(publicDir, 'temp-export-video.mp4');
              fs.writeFileSync(tempVideoPath, videoBuffer);
              console.log(`[Remotion] Wrote video: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB → ${tempVideoPath}`);
              data.inputProps.videoUrl = 'http://localhost:5174/temp-export-video.mp4';
            } else {
              console.warn('[Remotion] No videoBase64 received — Remotion will render without video');
            }

            // Save audio buffer to static public folder for Headless Chrome
            if (data.audioBase64) {
              const base64Data = data.audioBase64.replace(/^data:[^;]+;base64,/, '');
              const audioBuffer = Buffer.from(base64Data, 'base64');
              const tempAudioPath = path.resolve(publicDir, 'temp-export-audio.mp3');
              fs.writeFileSync(tempAudioPath, audioBuffer);
              data.inputProps.audioUrl = 'http://localhost:5174/temp-export-audio.mp3';
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
export default defineConfig({
  plugins: [react(), tailwindcss(), remotionExportPlugin()],
  optimizeDeps: {
    // @ffmpeg/ffmpeg uses a worker internally — exclude from Vite pre-bundling
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    allowedHosts: true,
    // Required for SharedArrayBuffer used by ffmpeg WASM
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
