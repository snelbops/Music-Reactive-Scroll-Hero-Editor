// Per-pad proxies: building one from the pad's own button, scrubbing from it instead of the
// video element, and picking it back up after a reload.
//
// Driven entirely through the UI. Reaching into the store from page.evaluate does not work
// here — a dynamic import of the store module gets its own instance, not the app's.
import { launch, freshPage, createReporter, shot, CLIP_A } from './harness.mjs';

const r = createReporter('padproxy');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await freshPage(ctx);

const proxyButton = page.locator('[data-purpose="pad-proxy-button"]').first();
const proxyCanvas = page.locator('[data-purpose="pad-proxy-canvas"]');
const videoEl = page.locator('video[data-purpose="active-video-element"]');

/** Click in the timeline ruler, which scrubs regardless of the active tool. */
async function scrubTo(frac) {
    const l = await page.evaluate(() => {
        const el = document.querySelector('div.overflow-x-auto.thin-scrollbar');
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width };
    });
    await page.mouse.click(l.x + 120 + (l.w - 120) * frac, l.y + 20);
    await page.waitForTimeout(500);
}

const canvasSample = () => page.evaluate(() => {
    const c = document.querySelector('[data-purpose="pad-proxy-canvas"]');
    return c ? c.toDataURL('image/jpeg', 0.4).slice(-160) : null;
});

// ── The key belongs to the clip, not the slot ──
{
    const keys = await page.evaluate(async () => {
        const { padProxyKey } = await import('/src/utils/padProxy.ts');
        return {
            byMediaKey: padProxyKey({ id: 1, name: 'a', url: 'blob:xyz', mediaKey: 'pad-media-42' }),
            sameClipMovedSlot: padProxyKey({ id: 9, name: 'a', url: 'blob:other', mediaKey: 'pad-media-42' }),
            byUrl: padProxyKey({ id: 2, name: 'b', url: '/sample.mp4' }),
            empty: padProxyKey({ id: 3, name: '', url: '' }),
        };
    });
    r.ok('a proxy is keyed by the clip, so moving the pad keeps it',
        keys.byMediaKey === keys.sameClipMovedSlot, String(keys.byMediaKey));
    r.ok('a pad on a plain URL still gets a key', !!keys.byUrl?.includes('sample.mp4'), String(keys.byUrl));
    r.ok('an empty pad has no proxy key', keys.empty === null, String(keys.empty));
}

// ── Building one from the pad ──
{
    // A pad with no stored media has its URL blanked on load, so give pad 0 a real clip
    // first — which is also the case that matters, a clip the user brought themselves.
    await page.setInputFiles('#pad-upload-0', CLIP_A);
    await page.waitForTimeout(1500);

    r.ok('the pad offers a proxy button', await proxyButton.count() === 1);
    r.ok('the viewport starts on the video element',
        await videoEl.count() === 1 && await proxyCanvas.count() === 0);

    const started = Date.now();
    await proxyButton.click();
    await page.waitForFunction(
        () => /Proxy ready|Proxy failed/.test(
            document.querySelector('[data-purpose="pad-proxy-button"]')?.getAttribute('title') ?? ''),
        undefined,
        { timeout: 180000 },
    );
    const title = await proxyButton.getAttribute('title');
    r.note(`built in ${((Date.now() - started) / 1000).toFixed(1)}s — ${title}`);

    r.ok('the proxy builds without error', /Proxy ready/.test(title ?? ''), title ?? '');
    const frames = Number((title ?? '').match(/(\d+) frames/)?.[1] ?? 0);
    r.ok('the proxy covers the clip rather than its first seconds', frames > 100, `${frames} frames`);
}

// ── It is what the viewport draws ──
{
    await page.waitForTimeout(600);
    r.ok('the viewport switches to the proxy canvas', await proxyCanvas.count() === 1,
        `${await proxyCanvas.count()} canvases`);
    r.ok('the video element is no longer mounted, so nothing is being seeked',
        await videoEl.count() === 0);

    await scrubTo(0.05);
    const early = await canvasSample();
    await scrubTo(0.85);
    const late = await canvasSample();

    r.ok('the canvas has painted something', !!early && early.length > 40);
    r.ok('scrubbing paints a different frame', early !== late,
        `${String(early).slice(-12)} vs ${String(late).slice(-12)}`);
    await shot(page, 'pad-proxy');
}

// ── It survives a reload ──
{
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    const title = await proxyButton.getAttribute('title');
    r.ok('a stored proxy is picked back up on reload', /Proxy ready/.test(title ?? ''), title ?? 'no button');
    r.ok('the viewport uses it straight away', await proxyCanvas.count() === 1);
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
