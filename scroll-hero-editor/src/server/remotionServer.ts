import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';

let cachedBundleLocation: string | null = null;

export async function renderRemotionVideoServer(options: {
    durationInFrames: number;
    fps: number;
    width: number;
    height: number;
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

    const customComposition = {
        ...composition,
        durationInFrames: options.durationInFrames,
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
        onProgress: ({ progress }) => {
            options.onProgress?.(progress);
        },
    });
}
