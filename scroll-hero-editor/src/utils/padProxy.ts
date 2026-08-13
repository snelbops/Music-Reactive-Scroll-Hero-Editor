import { useStore, type VideoPad } from '../store/useStore';
import { getMediaBlob, putMediaValue, getMediaValue } from './mediaStore';
import { extractFrames } from '../packages/ffmpegExtractor';

/**
 * Per-pad video proxies.
 *
 * Scrubbing a pad's clip seeks the video element on every tick, which is cheap for 720p and
 * hopeless for anything larger — the browser decodes from the nearest keyframe each time. A
 * proxy replaces that with picking a still by index. The frame extractor already builds one;
 * this is the part that gives each pad its own, keeps it, and finds it again on reload.
 */

/**
 * A pad's proxy is keyed by its clip, not its slot, so reordering pads cannot desync them —
 * the same reason `mediaKey` exists. Pads still on the bundled sample fall back to their URL.
 */
export function padProxyKey(pad: VideoPad | undefined): string | null {
    if (!pad) return null;
    if (pad.mediaKey) return `proxy-${pad.mediaKey}`;
    if (pad.url) return `proxy-url-${pad.url}`;
    return null;
}

/** Only one extraction at a time: ffmpeg.wasm is single-threaded and memory-hungry. */
let queue: Promise<unknown> = Promise.resolve();

export function buildPadProxy(padIdx: number): Promise<void> {
    const run = async () => {
        const pad = useStore.getState().videoPads[padIdx];
        const key = padProxyKey(pad);
        if (!key) return;

        const store = useStore.getState();
        if (store.padProxies[key]?.status === 'ready') return;

        store.setPadProxy(key, { status: 'building', progress: 0, frames: [] });
        try {
            // Prefer the stored bytes; a pad on the bundled sample only has a URL.
            const source = (pad.mediaKey ? await getMediaBlob(pad.mediaKey) : null)
                ?? (pad.url ? pad.url : null);
            if (!source) throw new Error('This pad has no clip to build a proxy from');

            const file = typeof source === 'string'
                ? source
                : new File([source], pad.name || 'clip.mp4', { type: source.type || 'video/mp4' });

            const frames = await extractFrames(file, (progress) => {
                useStore.getState().setPadProxy(key, {
                    status: 'building',
                    progress,
                    frames: [],
                });
            });

            useStore.getState().setPadProxy(key, { status: 'ready', progress: 1, frames });
            await putMediaValue(key, frames);
        } catch (err) {
            useStore.getState().setPadProxy(key, {
                status: 'error',
                progress: 0,
                frames: [],
                error: err instanceof Error ? err.message : String(err),
            });
        }
    };

    queue = queue.then(run, run);
    return queue as Promise<void>;
}

/** Re-attach proxies stored in a previous session. Missing ones are simply absent. */
export async function rehydratePadProxies(): Promise<void> {
    const pads = useStore.getState().videoPads;
    for (const pad of pads) {
        const key = padProxyKey(pad);
        if (!key || useStore.getState().padProxies[key]) continue;
        const frames = await getMediaValue<Blob[]>(key);
        if (frames?.length) {
            useStore.getState().setPadProxy(key, { status: 'ready', progress: 1, frames });
        }
    }
}
