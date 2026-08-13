import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/**
 * Proxy extraction.
 *
 * Scrubbing a long-GOP H.264 file by setting `currentTime` makes the browser decode
 * from the nearest keyframe on every tick, which is why high-resolution clips stutter.
 * A proxy sidesteps that: decode once, up front, into downscaled stills that can be
 * shown by index at no cost.
 *
 * This used to hard-code `fps=10, -frames:v 120` at full resolution as PNG, so it
 * covered only the first 12 seconds of any clip and produced frames far too large to
 * hold — which is why the path existed but was never usable.
 */

export interface ProxyOptions {
    /** Upper bound on frames held in memory. */
    maxFrames?: number;
    /** Frames are downscaled to at most this height. Never upscaled. */
    maxHeight?: number;
    /** Sampling rate to aim for when the clip is short enough to afford it. */
    targetFps?: number;
    /** JPEG quality, ffmpeg's -q:v scale (2 best … 31 worst). */
    quality?: number;
    /** Give up after this long. A wedged wasm core never recovers on its own. */
    timeoutMs?: number;
}

export interface ProxyPlan {
    /** Sampling rate, chosen so the whole clip fits the frame budget. */
    fps: number;
    /** Expected frame count. */
    frames: number;
    /** Output height, or null when the source height is unknown and no scaling is applied. */
    height: number | null;
}

const DEFAULTS: Required<ProxyOptions> = {
    maxFrames: 600,
    maxHeight: 540,
    targetFps: 20,
    quality: 5,
    timeoutMs: 4 * 60 * 1000,
};

/**
 * When the wasm heap cannot grow to fit a frame, the core does not fail — it stops
 * answering, and the caller waits forever showing a progress figure that never moves.
 * A deadline turns that into an error the UI can report.
 */
function withDeadline<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([
        work,
        new Promise<never>((_, reject) => {
            const elapsed = ms >= 1000 ? `${Math.round(ms / 1000)}s` : `${ms}ms`;
            timer = setTimeout(
                () => reject(new Error(`${what} gave up after ${elapsed} — the clip is likely too large for the in-browser decoder`)),
                ms,
            );
        }),
    ]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Works out how to sample a clip of `duration` seconds.
 *
 * Covering the whole clip always wins over sampling it densely: a proxy that stops
 * part-way through is worse than a coarse one, because the tail simply is not there.
 * So the frame budget lowers the frame rate rather than truncating.
 */
export function planProxy(
    duration: number,
    sourceHeight: number | null,
    options: ProxyOptions = {},
): ProxyPlan {
    const { maxFrames, maxHeight, targetFps } = { ...DEFAULTS, ...options };
    const height = sourceHeight && sourceHeight > 0 ? Math.min(maxHeight, sourceHeight) : null;

    if (!duration || !isFinite(duration) || duration <= 0) {
        // Nothing to plan against — sample at the target rate and stop at the budget.
        return { fps: targetFps, frames: maxFrames, height };
    }

    const fps = Math.max(0.5, Math.min(targetFps, maxFrames / duration));
    const frames = Math.min(maxFrames, Math.max(1, Math.ceil(duration * fps)));
    return { fps: +fps.toFixed(3), frames, height };
}

export interface ProbeResult {
    duration: number | null;
    height: number | null;
}

/**
 * Reads duration and frame height out of what ffmpeg prints for an input.
 *
 * The obvious alternative — loading the clip into a `<video>` and reading its metadata —
 * only works for formats the browser itself can decode, and the whole point of the proxy
 * is to handle clips the browser handles badly or not at all. ffmpeg has already demuxed
 * the header by the time it prints this, so it is the one source that is always available.
 */
export function parseProbeLog(log: string): ProbeResult {
    const time = log.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
    const duration = time
        ? Number(time[1]) * 3600 + Number(time[2]) * 60 + Number(time[3])
        : null;

    const videoLine = log.split('\n').find((line) => /^\s*Stream .*Video:/.test(line)) ?? '';
    // Skips the "[SAR 1:1 DAR 16:9]" that follows, and any bitrate figure before it.
    const size = videoLine.match(/[\s,](\d{2,5})x(\d{2,5})(?:[\s,]|$)/);
    const height = size ? Number(size[2]) : null;

    return {
        duration: duration && isFinite(duration) && duration > 0 ? duration : null,
        height: height && height > 0 ? height : null,
    };
}

const extensionOf = (source: File | string): string => {
    const name = typeof source === 'string' ? source : source.name;
    const ext = name.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    return /^[a-z0-9]{2,4}$/.test(ext) ? ext : 'mp4';
};

/**
 * Decodes a clip into a downscaled JPEG proxy covering its full length.
 *
 * `onProgress` reports 0–1 overall, plus the number of frames read back so far.
 */
export async function extractFrames(
    file: File | string,
    onProgress: (progress: number, current: number) => void,
    options: ProxyOptions = {},
): Promise<Blob[]> {
    const opts = { ...DEFAULTS, ...options };
    const ffmpeg = new FFmpeg();
    const input = `input.${extensionOf(file)}`;

    let log = '';
    ffmpeg.on('log', ({ message }) => { log += `${message}\n`; });

    // ffmpeg's own progress covers the decode; the read-back that follows takes the tail.
    const DECODE_SHARE = 0.9;
    ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.min(Math.max(progress, 0), 1) * DECODE_SHARE, 0);
    });

    try {
        await ffmpeg.load({
            coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
            wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
        });

        await ffmpeg.writeFile(input, await fetchFile(file));

        // Header pass: decode a single frame to nowhere, which makes ffmpeg print what it
        // found for a fraction of the cost of the real run. Leaving the output off
        // altogether would also print it, but that exits non-zero and leaves the wasm
        // core wedged for the run that follows.
        await withDeadline(
            ffmpeg.exec(['-hide_banner', '-i', input, '-frames:v', '1', '-f', 'null', '-']),
            Math.min(30_000, opts.timeoutMs),
            'Reading the clip',
        );
        const meta = parseProbeLog(log);
        const plan = planProxy(meta.duration ?? 0, meta.height, opts);

        // `-2` on the width keeps the aspect ratio and an even pixel count. When the height
        // came back from the probe it is resolved here, so the filter string carries no
        // commas; when it did not, `min()` caps it inside ffmpeg and the quotes keep its
        // comma from reading as a filter separator.
        const filters = [`fps=${plan.fps}`];
        filters.push(plan.height !== null
            ? `scale=-2:${plan.height}`
            : `scale=-2:'min(${opts.maxHeight},ih)'`);

        await withDeadline(
            ffmpeg.exec([
                '-i', input,
                '-an', '-sn',
                '-vf', filters.join(','),
                '-frames:v', String(plan.frames),
                '-q:v', String(opts.quality),
                'proxy%05d.jpg',
            ]),
            opts.timeoutMs,
            'Frame extraction',
        );

        const produced = (await ffmpeg.listDir('/'))
            .filter((entry) => !entry.isDir && /^proxy\d+\.jpg$/.test(entry.name))
            .map((entry) => entry.name)
            .sort();

        const frames: Blob[] = [];
        for (const name of produced) {
            const data = await ffmpeg.readFile(name);
            frames.push(new Blob([new Uint8Array(data as Uint8Array)], { type: 'image/jpeg' }));
            // Freed as we go: the proxy is held once as blobs, not twice.
            await ffmpeg.deleteFile(name).catch(() => {});
            onProgress(DECODE_SHARE + (frames.length / produced.length) * (1 - DECODE_SHARE), frames.length);
        }

        await ffmpeg.deleteFile(input).catch(() => {});
        onProgress(1, frames.length);
        return frames;
    } finally {
        // Without this the wasm heap for every extraction stays alive for the session.
        try { ffmpeg.terminate(); } catch { /* already gone */ }
    }
}
