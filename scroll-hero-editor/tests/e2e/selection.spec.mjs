// The blue time-selection region: resizing by its edges, moving it, and keeping the
// intensity drag and clear button that already lived on its header bar.
import { launch, freshPage, pickTool, laneBox, laneDots, setTimelineTop, createReporter, shot } from './harness.mjs';

const r = createReporter('selection');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await freshPage(ctx);

/** The region's own readout, i.e. what the user sees, in seconds. */
const region = (page) => page.evaluate(() => {
    const el = [...document.querySelectorAll('span')].find((s) => /^REGION \(/.test(s.textContent || ''));
    const m = el?.textContent?.match(/([\d.]+)s\s*-\s*([\d.]+)s/);
    return m ? { start: +m[1], end: +m[2] } : null;
});

/** The region box itself, in track percent — finer than the one-decimal readout. */
const regionPct = (page) => page.evaluate(() => {
    const bar = document.querySelector('div[title^="Drag sideways"]');
    const box = bar?.parentElement;
    if (!box) return null;
    return { left: parseFloat(box.style.left), width: parseFloat(box.style.width) };
});

const loopRange = (page) => page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => /^[\d.]+s - [\d.]+s$/.test(d.textContent?.trim() || ''));
    const m = el?.textContent?.match(/([\d.]+)s - ([\d.]+)s/);
    return m ? { start: +m[1], end: +m[2] } : null;
});

/** Drag out a fresh region across the Audio Wave lane, from `a` to `b` as fractions of it. */
async function selectRegion(page, a, b) {
    const box = await laneBox(page, 'Audio Wave');
    await page.mouse.move(box.x + box.w * a, box.y + box.h / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.w * b, box.y + box.h / 2, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    return box;
}

async function dragBy(page, locator, dx, dy) {
    const b = await locator.boundingBox();
    if (!b) return false;
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx / 2, cy + dy / 2, { steps: 10 });
    await page.mouse.move(cx + dx, cy + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(350);
    return true;
}

const startGrip = page.locator('div[title="Drag to resize region start"]');
const endGrip = page.locator('div[title="Drag to resize region end"]');
const headerBar = page.locator('div[title^="Drag sideways"]');

await setTimelineTop(page, 150);

// ── Keyframes to prove the intensity drag still reaches them ──
const rotBox = await laneBox(page, 'Rotation Speed');
{
    await pickTool(page, 'Pen / Edit (P)');
    for (const f of [0.363, 0.451, 0.537]) {
        await page.mouse.move(rotBox.x + rotBox.w * f, rotBox.y + rotBox.h * 0.35);
        await page.mouse.down(); await page.mouse.up();
        await page.waitForTimeout(60);
    }
    await page.waitForTimeout(250);
    r.ok('seeded 3 keyframes inside the region span (sanity check)', (await laneDots(page, 'Rotation Speed')).length === 3);
}

const waveBox = await selectRegion(page, 0.3, 0.6);
const created = await region(page);
r.ok('region created by dragging the wave lane', created !== null, created && `${created.start}s - ${created.end}s`);
// Seconds per pixel of track, so pixel drags can be checked against the readout.
const secPerPx = created ? (created.end - created.start) / (waveBox.w * 0.3) : 0;

// ── The edges resize, and each moves only its own end ──
{
    r.ok('region has grab handles on both edges', await startGrip.count() === 1 && await endGrip.count() === 1);

    const before = await region(page);
    await dragBy(page, endGrip, 120, 0);
    const afterEnd = await region(page);
    r.ok('dragging the right edge extends the end',
        afterEnd.end > before.end + 0.2, `${before.end}s → ${afterEnd.end}s`);
    r.ok('dragging the right edge leaves the start alone',
        Math.abs(afterEnd.start - before.start) < 0.06, `${before.start}s → ${afterEnd.start}s`);
    r.ok('the end follows the pointer',
        Math.abs((afterEnd.end - before.end) - 120 * secPerPx) < 0.25,
        `moved ${(afterEnd.end - before.end).toFixed(2)}s, expected ${(120 * secPerPx).toFixed(2)}s`);

    await dragBy(page, startGrip, -90, 0);
    const afterStart = await region(page);
    r.ok('dragging the left edge pulls the start back',
        afterStart.start < afterEnd.start - 0.2, `${afterEnd.start}s → ${afterStart.start}s`);
    r.ok('dragging the left edge leaves the end alone',
        Math.abs(afterStart.end - afterEnd.end) < 0.06, `${afterEnd.end}s → ${afterStart.end}s`);
    await shot(page, 'selection-resized');
}

// ── Aiming at the edge and missing must still resize, not throw the region away ──
{
    const missed = [];
    for (const [dx, dy] of [[0, 14], [4, 4], [-6, 10]]) {
        const before = await region(page);
        const g = await endGrip.boundingBox();
        const x = g.x + g.width / 2 + dx, y = g.y + g.height / 2 + dy;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 40, y, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        const after = await region(page);
        missed.push({ dx, dy, kept: !!after && Math.abs(after.start - before.start) < 0.06 && after.end > before.end });
    }
    r.ok('a near miss on the edge resizes instead of starting a new region',
        missed.every((m) => m.kept),
        missed.map((m) => `(${m.dx},${m.dy}) ${m.kept ? 'ok' : 'lost the region'}`).join(' · '));

    const g = await endGrip.boundingBox();
    r.ok('the edge grip is a reasonable target', g.width >= 10 && g.height >= 32,
        `${g.width}x${g.height}px`);
}

// ── An edge cannot be dragged through the opposite one ──
{
    const before = await regionPct(page);
    await dragBy(page, startGrip, 1200, 0);
    const after = await regionPct(page);
    r.ok('the start cannot cross the end', after !== null && after.width > 0,
        after && `${after.left.toFixed(2)}% + ${after.width.toFixed(2)}%`);
    r.ok('the region survives an over-drag as a sliver',
        after !== null && after.width >= 0.4 && after.width < before.width,
        after && `${after.width.toFixed(2)}% wide (was ${before.width.toFixed(2)}%)`);
}

// ── Dragging the header sideways moves the whole region ──
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await setTimelineTop(page, 150);
await selectRegion(page, 0.3, 0.6);
{
    const before = await region(page);
    await dragBy(page, headerBar, 100, 0);
    const after = await region(page);
    r.ok('sideways drag on the header moves the region',
        after.start > before.start + 0.2, `${before.start}s → ${after.start}s`);
    r.ok('moving keeps the region the same width',
        Math.abs((after.end - after.start) - (before.end - before.start)) < 0.06,
        `${(before.end - before.start).toFixed(2)}s → ${(after.end - after.start).toFixed(2)}s`);
    const loop = await loopRange(page);
    r.ok('moving the region leaves the loop where it was',
        loop && Math.abs(loop.start - after.start) > 0.2, loop && `loop ${loop.start}s - ${loop.end}s`);
}

// ── Selection and loop are converted between explicitly, in both directions ──
{
    const sel = await region(page);
    const loopBefore = await loopRange(page);
    r.ok('drawing a region did not move the loop',
        loopBefore && Math.abs(loopBefore.start - sel.start) > 0.2,
        `region ${sel.start}s, loop ${loopBefore.start}s`);

    await page.locator('button[title^="Loop this region"]').click();
    await page.waitForTimeout(300);
    const loopAfter = await loopRange(page);
    r.ok('the region button sets the loop to the region',
        loopAfter && Math.abs(loopAfter.start - sel.start) < 0.11 && Math.abs(loopAfter.end - sel.end) < 0.11,
        loopAfter && `loop ${loopAfter.start}s - ${loopAfter.end}s for region ${sel.start}s - ${sel.end}s`);

    // Move the loop somewhere else, then pull the selection back off it.
    await dragBy(page, page.locator('div[title^="Drag to move the loop"]'), -140, 0);
    await page.waitForTimeout(300);
    const moved = await loopRange(page);
    r.ok('the loop can be dragged clear of the region', moved && moved.start < sel.start - 0.2,
        moved && `loop ${moved.start}s - ${moved.end}s`);

    const bar = await page.locator('div[title^="Drag to move the loop"]').boundingBox();
    await page.mouse.dblclick(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await page.waitForTimeout(400);
    const pulled = await region(page);
    r.ok('double-clicking the loop bar selects that range',
        pulled && Math.abs(pulled.start - moved.start) < 0.11 && Math.abs(pulled.end - moved.end) < 0.11,
        pulled && `region ${pulled.start}s - ${pulled.end}s for loop ${moved.start}s - ${moved.end}s`);
}

// ── Up/down on the header is still the intensity drag ──
{
    const before = await region(page);
    const dotsBefore = await laneDots(page, 'Rotation Speed');
    await dragBy(page, headerBar, 0, 60);
    const after = await region(page);
    const dotsAfter = await laneDots(page, 'Rotation Speed');

    r.ok('vertical drag does not move the region',
        Math.abs(after.start - before.start) < 0.06 && Math.abs(after.end - before.end) < 0.06,
        `${before.start}s-${before.end}s → ${after.start}s-${after.end}s`);

    const inRegion = dotsBefore.length && dotsAfter.length;
    const moved = inRegion && dotsAfter.some((d, i) => dotsBefore[i] && d.top > dotsBefore[i].top + 1);
    r.ok('vertical drag still shifts keyframe intensity', !!moved,
        `tops ${dotsBefore.map((d) => Math.round(d.top)).join(',')} → ${dotsAfter.map((d) => Math.round(d.top)).join(',')}`);
}

// ── The clear button still clears ──
{
    await page.locator('button[title="Clear selection region"]').click();
    await page.waitForTimeout(300);
    r.ok('✕ still clears the region', (await region(page)) === null);
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
