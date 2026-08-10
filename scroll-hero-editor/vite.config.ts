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

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const { renderRemotionVideoServer } = await import('./src/server/remotionServer');

            const outDir = path.resolve(process.cwd(), 'out');
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

            const outputPath = path.resolve(outDir, `remotion-export-${Date.now()}.mp4`);

            await renderRemotionVideoServer({
              durationInFrames: data.durationInFrames || 600,
              fps: data.fps || 60,
              width: data.width || 1920,
              height: data.height || 1080,
              inputProps: data.inputProps || {},
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
    // Required for SharedArrayBuffer used by ffmpeg WASM
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
