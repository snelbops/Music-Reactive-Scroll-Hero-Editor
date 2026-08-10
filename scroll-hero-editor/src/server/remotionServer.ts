import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';

let cachedBundleLocation: string | null = null;

export async function renderRemotionVideoServer(options: {
    durationInFrames: number;
    fps: number;
    width: number;
    height: number;
    startFrame?: number;
    inputProps: Record<string, any>;
    outputPath: string;
    onProgress?: (progress: number) => void;
}) {
    const entryPoint = path.resolve(process.cwd(), 'src/remotion/Root.tsx');

    if (!cachedBundleLocation) {
        cachedBundleLocation = await bundle(entryPoint);
    }

    const composition = await selectComposition({
        serveUrl: cachedBundleLocation,
        id: 'ScrollHero',
        inputProps: options.inputProps,
    });

    const startFrame = options.startFrame || 0;
    const totalFramesNeeded = Math.max(600, startFrame + options.durationInFrames + 10);

    const customComposition = {
        ...composition,
        durationInFrames: totalFramesNeeded,
        fps: options.fps,
        width: options.width,
        height: options.height,
    };

    await renderMedia({
        composition: customComposition,
        serveUrl: cachedBundleLocation,
        codec: 'h264',
        outputLocation: options.outputPath,
        inputProps: options.inputProps,
        frameRange: [startFrame, startFrame + options.durationInFrames - 1],
        onProgress: ({ progress }) => {
            options.onProgress?.(progress);
        },
    });
}
