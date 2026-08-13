// The transport clock. Theatre clamps its own sequence position to a length fixed at
// project creation, which pinned the playhead at 10.000s on any longer project.
import { launch, freshPage, setTimelineTop, createReporter, shot } from './harness.mjs';

const r = createReporter('transport');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await freshPage(ctx);

/** The transport readout, "HH:MM:SS:mmm", as seconds. */
const clock = () => page.evaluate(() => {
    const el = [...document.querySelectorAll('div')]
        .find((d) => /^\d\d:\d\d:\d\d:\d{3}$/.test(d.textContent?.trim() || ''));
    if (!el) return null;
    const [h, m, s, ms] = el.textContent.trim().split(':').map(Number);
    return h * 3600 + m * 60 + s + ms / 1000;
});

/** The lanes container, whose track area maps the whole sequence across its width.
    Matched on its scrollbar class — `cursor-col-resize` alone also hits the panel dividers. */
const lanes = () => page.evaluate(() => {
    const el = document.querySelector('div.overflow-x-auto.thin-scrollbar');
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width };
});

/** Click in the ruler band, which always scrubs regardless of the active tool. */
async function scrubTo(frac) {
    const l = await lanes();
    await page.mouse.click(l.x + 120 + (l.w - 120) * frac, l.y + 20);
    await page.waitForTimeout(350);
}

const setLength = async (n) => {
    const input = page.locator('input[type="number"]:visible').last();
    await input.fill(String(n));
    await input.press('Enter');
    await page.waitForTimeout(500);
};

await setTimelineTop(page, 300);
await setLength(30);

// ── Scrubbing past the old ceiling ──
{
    await scrubTo(0.25);
    const quarter = await clock();
    r.ok('scrubbing lands where it was clicked', quarter !== null && Math.abs(quarter - 7.5) < 1.2,
        `${quarter}s (want ~7.5s)`);

    await scrubTo(0.8);
    const late = await clock();
    r.ok('the playhead goes past 10s on a 30s project', late !== null && late > 12,
        `${late}s (want ~24s)`);
    r.ok('the playhead reaches where it was sent', late !== null && Math.abs(late - 24) < 1.5,
        `${late}s (want ~24s)`);
    await shot(page, 'transport-past-ten');
}

// ── The red playhead line tracks it, rather than parking at the 10s mark ──
{
    // Measured rather than read off the inline style: the browser folds the calc() into
    // its own form, so the fraction is no longer in there to parse.
    const linePct = await page.evaluate(() => {
        const line = [...document.querySelectorAll('div')].find((d) =>
            typeof d.className === 'string'
            && d.className.includes('w-[1.5px]')
            && d.className.includes('bg-red-500'));
        const track = document.querySelector('div.overflow-x-auto.thin-scrollbar');
        if (!line || !track) return null;
        const a = line.getBoundingClientRect(), b = track.getBoundingClientRect();
        return (a.x - b.x - 120) / (b.width - 120);
    });
    r.ok('the playhead line follows past the old ceiling', linePct !== null && linePct > 0.4,
        `at ${linePct === null ? '?' : (linePct * 100).toFixed(0)}% of the sequence`);
}

// ── Playback crosses 10s instead of sticking there ──
{
    await scrubTo(0.3);
    const before = await clock();
    await page.locator('button[title="Toggle Loop Region"]').click();
    await page.waitForTimeout(200);
    const looping = await page.evaluate(() => {
        const b = document.querySelector('button[title="Toggle Loop Region"]');
        return b?.className.includes('#d9d9d9');
    });
    if (looping) {
        await page.locator('button[title="Toggle Loop Region"]').click();
        await page.waitForTimeout(200);
    }

    await page.keyboard.press('Space');
    await page.waitForTimeout(2500);
    const during = await clock();
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    r.ok('playback advances the clock', during !== null && before !== null && during > before + 1,
        `${before}s → ${during}s`);
    r.ok('playback does not stall at 10.000s', during !== null && Math.abs(during - 10) > 0.2,
        `${during}s`);
}

// ── Scrolled far enough, the playhead hides behind the lane labels ──
//
// The playhead is pinned to its time in the scrolling content, so scrolling right slides it
// left. The label column is sticky and opaque, so it should cover it — otherwise the
// playhead is drawn over the lane names and looks like it has run off before the start.
{
    await scrubTo(0);   // the playhead has to be near the start for a small scroll to reach it
    // Zoom in so the lanes are actually scrollable; at 1x there is nothing to scroll.
    for (let i = 0; i < 6; i++) {
        await page.locator('button[title*="Zoom"]').last().click().catch(() => {});
        await page.waitForTimeout(120);
    }
    const geom = await page.evaluate(() => {
        const el = document.querySelector('div.overflow-x-auto.thin-scrollbar');
        el.scrollLeft = 42;
        const line = [...document.querySelectorAll('div')].find((d) =>
            typeof d.className === 'string'
            && d.className.includes('w-[1.5px]')
            && d.className.includes('bg-red-500'));
        const label = [...document.querySelectorAll('span')]
            .filter((s) => s.textContent?.trim() === 'Audio Wave')
            .map((s) => s.closest('[class*="w-[120px]"]'))
            .find(Boolean);
        const lb = label.getBoundingClientRect();
        return {
            playheadX: Math.round(line.getBoundingClientRect().x),
            labelLeft: Math.round(lb.x),
            labelRight: Math.round(lb.right),
            playheadZ: Number(getComputedStyle(line).zIndex),
            labelZ: Number(getComputedStyle(label).zIndex),
        };
    });
    await page.waitForTimeout(200);

    const behindLabels = geom.playheadX >= geom.labelLeft && geom.playheadX < geom.labelRight;
    r.ok('scrolling puts the playhead inside the label column (sanity check)', behindLabels,
        `playhead at ${geom.playheadX}, labels ${geom.labelLeft}..${geom.labelRight}`);
    r.ok('the labels are painted over it rather than under it', geom.labelZ > geom.playheadZ,
        `label z-${geom.labelZ} vs playhead z-${geom.playheadZ}`);
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
