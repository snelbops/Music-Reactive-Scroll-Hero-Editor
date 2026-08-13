// The video proxy: how a clip is sampled, what extraction actually produces, and the
// bound on how much of it is held on the GPU at once.
//
// The app modules are imported through the dev server, so these run the real code rather
// than a copy of it. The page is a static asset on the same origin so the editor itself
// (and its own background extraction) is not competing for the CPU.
import { launch, createReporter, APP_URL } from './harness.mjs';

const r = createReporter('proxy');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
// A blank document on the app's origin: the modules still come from the dev server, but
// the editor is not booted alongside them competing for the same single-threaded decoder.
await page.route('**/__proxy_spec', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>proxy spec</title>' }));
await page.goto(new URL('/__proxy_spec', APP_URL).href, { waitUntil: 'domcontentloaded' });

// ── Sampling: the whole clip is covered, at a bounded cost ──
{
    const plans = await page.evaluate(async () => {
        const m = await import('/src/packages/ffmpegExtractor.ts');
        return {
            short: m.planProxy(20, 1080),
            long: m.planProxy(600, 2160),
            small: m.planProxy(20, 360),
            unknown: m.planProxy(0, null),
            // What the old fixed 'fps=10, -frames:v 120' covered, for comparison.
            legacySeconds: 120 / 10,
        };
    });

    const covers = (plan, duration) => plan.frames / plan.fps >= duration * 0.98;

    r.ok('a short clip is sampled densely', plans.short.fps >= 20, `${plans.short.fps}fps`);
    r.ok('a short clip is covered end to end', covers(plans.short, 20),
        `${plans.short.frames} frames at ${plans.short.fps}fps`);

    r.ok('a 10-minute clip is still covered end to end', covers(plans.long, 600),
        `${plans.long.frames} frames at ${plans.long.fps}fps = ${Math.round(plans.long.frames / plans.long.fps)}s`);
    r.ok('the long clip trades rate for coverage rather than truncating',
        plans.long.fps < plans.short.fps && plans.long.frames <= 600,
        `${plans.long.fps}fps, ${plans.long.frames} frames`);
    r.ok('coverage beats the old fixed 12-second window',
        plans.long.frames / plans.long.fps > plans.legacySeconds * 10);

    r.ok('frames are downscaled', plans.short.height === 480, `${plans.short.height}px tall`);
    r.ok('a source smaller than the proxy size is not upscaled', plans.small.height === 360,
        `${plans.small.height}px tall`);
    r.ok('an unreadable duration still yields a workable plan',
        plans.unknown.fps > 0 && plans.unknown.frames > 0 && plans.unknown.height === null,
        JSON.stringify(plans.unknown));
}

// ── Reading the clip's shape out of ffmpeg's own output ──
{
    const parsed = await page.evaluate(async () => {
        const m = await import('/src/packages/ffmpegExtractor.ts');
        const log = [
            'Input #0, mov,mp4,m4a,3gp,3g2,mj2, from \'input.mp4\':',
            '  Duration: 00:01:05.21, start: 0.000000, bitrate: 13579 kb/s',
            '  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9], 13577 kb/s, 24 fps',
            'Output #0, null, to \'pipe:\':',
            '  Stream #0:0(und): Video: wrapped_avframe, yuv420p, 1920x1080, q=2-31, 200 kb/s',
        ].join('\n');
        return { parsed: m.parseProbeLog(log), empty: m.parseProbeLog('') };
    });

    r.ok('duration is read from the log', parsed.parsed.duration === 65.21, `${parsed.parsed.duration}s`);
    r.ok('height is read from the input stream, not the output', parsed.parsed.height === 1080,
        `${parsed.parsed.height}px`);
    r.ok('an unparseable log reports nothing rather than guessing',
        parsed.empty.duration === null && parsed.empty.height === null);
}

// ── Extraction end to end, against the real clip ──
//
// maxHeight is lowered from the app's 540 because headless Chromium here cannot grow the
// wasm heap far enough for larger frames — the core stops answering above roughly 170k
// output pixels. That ceiling is the container's, not the app's: the previous
// full-resolution command stalls here too. Everything else runs exactly as it ships.
const PROXY_HEIGHT = 360;
{
    const result = await page.evaluate(async (maxHeight) => {
        const m = await import('/src/packages/ffmpegExtractor.ts');
        const seen = [];
        const started = performance.now();
        const frames = await m.extractFrames('/sample.mp4', (p) => seen.push(p), { maxHeight });
        const bitmap = frames.length ? await createImageBitmap(frames[0]) : null;
        return {
            count: frames.length,
            bytes: frames.reduce((n, b) => n + b.size, 0),
            type: frames[0]?.type ?? null,
            width: bitmap?.width ?? 0,
            height: bitmap?.height ?? 0,
            reachedOne: seen.length > 0 && seen[seen.length - 1] === 1,
            ms: Math.round(performance.now() - started),
        };
    }, PROXY_HEIGHT);
    r.note(`extracted ${result.count} frames in ${result.ms}ms, ${Math.round(result.bytes / 1024)}kB total`);

    // sample.mp4 is 5.21s of 512x768 at 24fps, so a 20fps proxy is ~104 frames. The old
    // fixed 10fps sampling produced 52 for the same clip, and stopped dead at 12 seconds
    // on anything longer.
    r.ok('the proxy samples the clip at the planned rate', result.count > 100,
        `${result.count} frames`);
    r.ok('frames come back as JPEG', result.type === 'image/jpeg', String(result.type));
    r.ok('frames are downscaled to the proxy height', result.height === PROXY_HEIGHT,
        `${result.width}x${result.height} from 512x768`);
    r.ok('the proxy stays small enough to hold', result.bytes < 40 * 1024 * 1024,
        `${Math.round(result.bytes / 1024)}kB`);
    r.ok('progress is reported through to completion', result.reachedOne);
}

// ── A decoder that stops answering is reported, not waited on forever ──
{
    const failure = await page.evaluate(async () => {
        const m = await import('/src/packages/ffmpegExtractor.ts');
        const started = performance.now();
        try {
            await m.extractFrames('/sample.mp4', () => {}, { timeoutMs: 1 });
            return { threw: false, ms: Math.round(performance.now() - started) };
        } catch (e) {
            return { threw: true, message: String(e.message), ms: Math.round(performance.now() - started) };
        }
    });
    r.ok('extraction gives up instead of hanging', failure.threw, `after ${failure.ms}ms`);
    r.ok('the failure says what went wrong', /gave up|too large/.test(failure.message || ''),
        failure.message);
}

// ── GPU memory: decoded frames are capped no matter how long the proxy is ──
{
    const cache = await page.evaluate(async () => {
        const { FrameCache } = await import('/src/packages/frameLoader.ts');

        // 400 distinct 1px JPEGs — enough that an unbounded cache would hold them all.
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx2d = canvas.getContext('2d');
        const blobs = [];
        for (let i = 0; i < 400; i++) {
            ctx2d.fillStyle = `rgb(${i % 256},0,0)`;
            ctx2d.fillRect(0, 0, 1, 1);
            blobs.push(await new Promise((res) => canvas.toBlob(res, 'image/jpeg')));
        }

        const cache = new FrameCache(blobs, 24);
        const settle = () => new Promise((res) => setTimeout(res, 120));

        let peak = 0;
        // Walk the whole sequence the way a scrub would.
        for (let i = 0; i < blobs.length; i += 7) {
            cache.request(i);
            await settle();
            peak = Math.max(peak, cache.size);
        }
        const atEnd = cache.size;
        const hasCurrent = cache.nearest(blobs.length - 1) !== null;

        cache.request(0);
        await settle();
        const backAtStart = cache.nearest(0) !== null;

        cache.dispose();
        return { peak, atEnd, hasCurrent, backAtStart, afterDispose: cache.size, total: blobs.length };
    });

    r.ok('the cache never exceeds its capacity', cache.peak <= 24, `peak ${cache.peak} of ${cache.total} frames`);
    r.ok('scrubbing to the end still holds far fewer frames than the sequence',
        cache.atEnd <= 24 && cache.total === 400, `${cache.atEnd} held`);
    r.ok('the frame under the playhead is available', cache.hasCurrent);
    r.ok('scrubbing back re-decodes what was evicted', cache.backAtStart);
    r.ok('dispose releases everything', cache.afterDispose === 0);
}

// ── A frame too big for the heap steps down rather than failing ──
//
// This is the container's actual limit and a real one on some machines: the decoder either
// traps with "memory access out of bounds" or stops answering. Asking for 540p here exceeds
// what headless Chromium can grow to for this clip, so the retry ladder is what makes it
// succeed at all.
{
    const result = await page.evaluate(async () => {
        const m = await import('/src/packages/ffmpegExtractor.ts');
        const warnings = [];
        const realWarn = console.warn;
        console.warn = (...args) => { warnings.push(String(args[0])); realWarn(...args); };
        try {
            const started = performance.now();
            const frames = await m.extractFrames('/sample.mp4', () => {}, { maxHeight: 540 });
            const bitmap = frames.length ? await createImageBitmap(frames[0]) : null;
            return {
                count: frames.length,
                height: bitmap?.height ?? 0,
                steppedDown: warnings.filter((w) => w.includes('did not fit the decoder')),
                ms: Math.round(performance.now() - started),
            };
        } finally {
            console.warn = realWarn;
        }
    });
    r.note(`asked for 540p, got ${result.height}p in ${result.ms}ms`);

    r.ok('extraction succeeds despite the first size being too large', result.count > 100,
        `${result.count} frames`);
    r.ok('it stepped the frame size down', result.steppedDown.length > 0,
        result.steppedDown[0] ?? 'no step-down logged');
    r.ok('the frames it settled on are smaller than asked for',
        result.height > 0 && result.height < 540, `${result.height}p`);
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
