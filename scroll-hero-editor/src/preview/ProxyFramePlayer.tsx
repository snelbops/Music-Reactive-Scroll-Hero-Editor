import { useEffect, useRef } from 'react';
import { createBitmapCache } from '../packages/frameCache';

/**
 * Draws a pad's frame proxy at the given progress.
 *
 * This is the payoff for building a proxy: picking a still by index costs nothing, where
 * seeking the original on every scroll tick makes the browser decode from the nearest
 * keyframe — the reason high-resolution clips stutter. Frames are decoded on demand through
 * the same bounded cache the R3F scene uses, so memory does not grow with the clip.
 */
export default function ProxyFramePlayer({ frames, progress }: { frames: Blob[]; progress: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cacheRef = useRef<ReturnType<typeof createBitmapCache> | null>(null);
    const progressRef = useRef(progress);
    progressRef.current = progress;

    useEffect(() => {
        if (!frames.length) { cacheRef.current = null; return; }
        const cache = createBitmapCache(frames);
        cacheRef.current = cache;
        cache.request(0);
        return () => { cacheRef.current = null; cache.dispose(); };
    }, [frames]);

    useEffect(() => {
        let raf = 0;
        let lastDrawn: ImageBitmap | null = null;

        const draw = () => {
            raf = requestAnimationFrame(draw);
            const cache = cacheRef.current;
            const canvas = canvasRef.current;
            if (!cache?.length || !canvas) return;

            const idx = Math.min(
                Math.floor(Math.max(0, Math.min(1, progressRef.current)) * cache.length),
                cache.length - 1,
            );
            cache.request(idx);
            // Falls back to the closest decoded frame, so a fast scrub lands near the right
            // place rather than holding the frame it started from.
            const bitmap = cache.nearest(idx);
            if (!bitmap) return;

            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.max(1, Math.round(rect.width * dpr));
            const h = Math.max(1, Math.round(rect.height * dpr));
            const resized = canvas.width !== w || canvas.height !== h;
            if (resized) { canvas.width = w; canvas.height = h; }
            if (bitmap === lastDrawn && !resized) return;
            lastDrawn = bitmap;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            // object-fit: cover, to match the video element this stands in for.
            const scale = Math.max(w / bitmap.width, h / bitmap.height);
            const dw = bitmap.width * scale;
            const dh = bitmap.height * scale;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(bitmap, (w - dw) / 2, (h - dh) / 2, dw, dh);
        };

        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden bg-black">
            <canvas
                ref={canvasRef}
                data-purpose="pad-proxy-canvas"
                className="w-full h-full block"
            />
        </div>
    );
}
