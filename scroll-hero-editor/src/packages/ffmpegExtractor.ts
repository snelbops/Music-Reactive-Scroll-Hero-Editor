import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

/**
 * extractFrames — converts an MP4 File to PNG Blob[] using ffmpeg WASM.
 * Runs in ffmpeg's internal worker thread (non-blocking).
 * Extracts up to 120 frames at 10fps from the first 12 seconds.
 */
export async function extractFrames(
    file: File,
    onProgress: (progress: number, current: number) => void,
): Promise<Blob[]> {
    const ffmpeg = new FFmpeg();

    ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.min(progress, 0.99), 0);
    });

    await ffmpeg.load({
        coreURL: '/ffmpeg-core.js',
        wasmURL: '/ffmpeg-core.wasm',
    });

    await ffmpeg.writeFile('input.mp4', await fetchFile(file));

    // Extract at 10fps, max 120 frames
    await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', 'fps=10',
        '-frames:v', '120',
        '-q:v', '3',
        'frame%04d.png',
    ]);

    const frames: Blob[] = [];
    for (let i = 1; i <= 120; i++) {
        try {
            const data = await ffmpeg.readFile(`frame${String(i).padStart(4, '0')}.png`);
            frames.push(new Blob([data as Uint8Array], { type: 'image/png' }));
        } catch {
            break;
        }
    }

    onProgress(1, frames.length);
    return frames;
}
