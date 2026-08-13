// The Line tool's gesture, and whether easing presets actually reach the curve.
import { launch, freshPage, seededPage, project, pickTool, laneBox, laneDots, setTimelineTop, createReporter, shot } from './harness.mjs';

const r = createReporter('easing');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
let page = await freshPage(ctx);

const LANE = 'Rotation Speed';

/** The lane's drawn curve, as its path data. */
const curve = (page, name) => page.evaluate((n) => {
    const col = [...document.querySelectorAll('span')]
        .filter((s) => s.textContent?.trim() === n)
        .map((s) => s.closest('[class*="w-[120px]"]'))
        .find(Boolean);
    const paths = [...(col?.nextElementSibling?.querySelectorAll('path') || [])];
    const open = paths.find((p) => p.getAttribute('fill') === 'none');
    return open?.getAttribute('d') ?? null;
}, name);

const rubberBand = (page) => page.evaluate(() => {
    const l = document.querySelector('svg.z-40 line');
    return l ? { x1: +l.getAttribute('x1'), x2: +l.getAttribute('x2') } : null;
});

await setTimelineTop(page, 150);
const box = await laneBox(page, LANE);
const at = (fx, fy) => [box.x + box.w * fx, box.y + box.h * fy];

// ── Click, preview, click ──
{
    await pickTool(page, 'Line Ramp (L)');
    await page.mouse.move(...at(0.25, 0.8));
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200);
    r.ok('the first click drops an anchor without creating keyframes',
        (await laneDots(page, LANE)).length === 0, `${(await laneDots(page, LANE)).length} dots`);

    // Moving with no button held must still preview — that is the whole point of the gesture.
    await page.mouse.move(...at(0.5, 0.4), { steps: 8 });
    await page.waitForTimeout(150);
    const band = await rubberBand(page);
    r.ok('moving with the button up previews the ramp', band !== null && band.x2 > band.x1,
        band ? `x1=${Math.round(band.x1)} x2=${Math.round(band.x2)}` : 'no preview');
    await shot(page, 'line-rubber-band');

    await page.mouse.move(...at(0.7, 0.2), { steps: 8 });
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(300);

    const dots = await laneDots(page, LANE);
    r.ok('the second click commits the ramp', dots.length === 2, `${dots.length} dots`);
    r.ok('the ramp spans the two clicks', dots.length === 2 && dots[0].left < 30 && dots[1].left > 60,
        dots.map((d) => `${Math.round(d.left)}%`).join(' → '));
    r.ok('the preview clears once committed', (await rubberBand(page)) === null);
}

// ── Esc abandons a half-drawn ramp ──
{
    const before = (await laneDots(page, LANE)).length;
    await page.mouse.move(...at(0.3, 0.5));
    await page.mouse.down();
    await page.mouse.up();
    await page.mouse.move(...at(0.9, 0.1), { steps: 6 });
    await page.waitForTimeout(150);
    r.ok('a ramp is in progress before Esc', (await rubberBand(page)) !== null);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    r.ok('Esc clears the preview', (await rubberBand(page)) === null);
    r.ok('Esc leaves the keyframes untouched', (await laneDots(page, LANE)).length === before,
        `${before} → ${(await laneDots(page, LANE)).length}`);

    // And the abandoned anchor must not be picked up by the next click.
    await page.mouse.move(...at(0.9, 0.1));
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(250);
    r.ok('the next click starts fresh rather than completing the abandoned ramp',
        (await laneDots(page, LANE)).length === before,
        `${(await laneDots(page, LANE)).length} dots`);
    await page.keyboard.press('Escape');
}

// ── The Line tool draws a line, not a slight S ──
await page.close();
page = await freshPage(ctx);
{
    await setTimelineTop(page, 150);
    const b = await laneBox(page, LANE);
    await pickTool(page, 'Line Ramp (L)');
    await page.mouse.move(b.x + b.w * 0.2, b.y + b.h * 0.85);
    await page.mouse.down(); await page.mouse.up();
    await page.mouse.move(b.x + b.w * 0.8, b.y + b.h * 0.15, { steps: 8 });
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(400);

    const drawn = await curve(page, LANE);
    r.ok('the Line tool draws a straight segment', drawn !== null && / L /.test(drawn),
        drawn ? drawn.slice(0, 60) : 'no curve');
}

// ── Easing presets reach keyframes that carry bezier handles ──
//
// Seeded rather than drawn: a segment is evaluated from its handles whenever either end has
// one, so handles are exactly the case where presets used to do nothing at all. Anything
// that has been through the custom bezier editor is in this state.
await page.close();
page = await seededPage(ctx, `
    p.paramKeyframes = p.paramKeyframes || {};
    p.paramKeyframes.rotationSpeed = [
        { time: 2, value: 0.3, easing: 'linear', handleOut: { dt: 1.8, dv: 0.4 } },
        { time: 8, value: 1.7, easing: 'linear', handleIn: { dt: -1.8, dv: -0.4 } }
    ];
    p.sequenceDuration = 10;
`);
{
    await setTimelineTop(page, 150);
    const handles = async () => {
        const kfs = (await project(page)).paramKeyframes?.rotationSpeed ?? [];
        return kfs.filter((k) => k.handleIn || k.handleOut).length;
    };
    r.ok('the seeded curve carries handles (sanity check)', (await handles()) === 2,
        `${await handles()} of 2 keyframes have handles`);

    // Marquee the whole lane so both keyframes are selected.
    const b = await laneBox(page, LANE);
    await pickTool(page, 'Select (V)');
    await page.mouse.move(b.x + b.w * 0.05, b.y + b.h * 0.05);
    await page.mouse.down();
    await page.mouse.move(b.x + b.w * 0.95, b.y + b.h * 0.95, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const before = await curve(page, LANE);
    await page.locator('button[title="Ease In"]').click();
    await page.waitForTimeout(400);
    const after = await curve(page, LANE);

    r.ok('applying Ease In changes the drawn curve', before !== after,
        `${String(before).slice(0, 42)} → ${String(after).slice(0, 42)}`);
    r.ok('the handles that would override the preset are cleared', (await handles()) === 0,
        `${await handles()} still have handles`);

    // A second preset must act on the same selection as the first. Applying one used to
    // collapse the selection to the last keyframe, so the second click quietly did less.
    await page.locator('button[title="Ease Out"]').click();
    await page.waitForTimeout(400);
    const easeOut = await curve(page, LANE);
    r.ok('a second preset click still reaches the same keyframes', easeOut !== after,
        `${String(after).slice(0, 42)} → ${String(easeOut).slice(0, 42)}`);
    await shot(page, 'easing-applied');
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
