// Punch-in recording, and the timeline opening on the Scroll POS lane alone.
import { launch, freshPage, project, createReporter } from './harness.mjs';

const r = createReporter('punchin');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
// The one spec that wants the shipped layout rather than the harness's ALL.
const page = await freshPage(ctx, { isolate: 'default' });

const laneVisible = (name) => page.evaluate((n) => [...document.querySelectorAll('span')]
    .some((s) => s.textContent?.trim() === n), name);

// ── The timeline opens on scroll ──
{
    r.ok('the Scroll POS lane is shown', await laneVisible('Scroll POS'));
    r.ok('the waveform is still shown — it is what you write against',
        await laneVisible('Audio Wave'));

    for (const lane of ['Rotation Speed', 'Mouse X', 'Mouse Y']) {
        r.ok(`${lane} is out of the way`, !(await laneVisible(lane)));
    }

    // And the other lanes are one click away, not gone.
    await page.locator('button', { hasText: /^ALL$/ }).first().click().catch(() => {});
    await page.waitForTimeout(400);
    r.ok('the isolate row brings the others back', await laneVisible('Rotation Speed'));
    await page.locator('button', { hasText: /^SCROLL$/ }).first().click().catch(() => {});
    await page.waitForTimeout(400);
}

// ── Punch-in: the overwrite span ends when input stops ──
{
    const punch = await page.evaluate(async () => {
        const { createPunchIn } = await import('/src/utils/punchIn.ts');
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const p = createPunchIn(120);
        const out = {};

        // A continuous gesture: each event extends the span from the last.
        out.first = p.at(1.0);
        await wait(20);
        out.continued = p.at(1.5);
        await wait(20);
        out.stillGoing = p.at(2.0);

        // Holding the control still — same value, still performing.
        await wait(20);
        out.heldStill = p.at(2.5);

        // Let go, come back later: a new gesture, nothing before it is swept.
        await wait(300);
        out.afterPause = p.at(8.0);

        // A loop wrap sends the playhead backwards.
        await wait(20);
        out.afterWrap = p.at(0.4);

        p.reset();
        await wait(20);
        out.afterReset = p.at(3.0);
        return out;
    });

    r.ok('the first touch overwrites nothing before it', punch.first === undefined, String(punch.first));
    r.ok('a continuing gesture sweeps from where it started', punch.continued === 1.0, String(punch.continued));
    r.ok('and keeps extending', punch.stillGoing === 1.5, String(punch.stillGoing));
    r.ok('holding the control still counts as performing', punch.heldStill === 2.0,
        `${punch.heldStill} — a deliberate flat value, not an absence of input`);
    r.ok('coming back after a pause starts a fresh punch-in', punch.afterPause === undefined,
        `${punch.afterPause} — the untouched stretch in between is left alone`);
    r.ok('a loop wrap starts a fresh punch-in', punch.afterWrap === undefined, String(punch.afterWrap));
    r.ok('reset ends the gesture', punch.afterReset === undefined, String(punch.afterReset));
}

// ── End to end: a second pass only overwrites where it was actually touched ──
//
// The first pass fills the timeline. The second touches the control twice with a long gap
// between them — so the stretch in the middle carries first-pass keyframes that the second
// pass never went near. Leaving the span open across that gap is what used to wipe them.
{
    const viewport = await page.locator('main').first().boundingBox();
    const cx = viewport.x + viewport.width / 2, cy = viewport.y + viewport.height / 2;
    await page.mouse.move(cx, cy);

    const record = async (fn) => {
        await page.locator('button[title*="Record"]').first().click();
        await page.waitForTimeout(4200);   // 3-2-1 countdown
        // Clicking the button moved the pointer off the preview; wheel events go to
        // whatever is under it, so put it back before scrolling.
        await page.mouse.move(cx, cy);
        await fn();
        // Space only pauses playback; recording stays armed until the button is clicked
        // again, and a still-armed recorder makes the next "start" a stop.
        await page.locator('button[title*="Record"]').first().click();
        await page.keyboard.press('Space');
        await page.waitForTimeout(600);
    };
    const times = async () => ((await project(page)).scrollKeyframes ?? []).map((k) => k.time);

    // Pass one: scroll continuously, filling the timeline.
    await record(async () => {
        for (let i = 0; i < 16; i++) {
            await page.mouse.wheel(0, 40);
            await page.waitForTimeout(120);
        }
    });
    const firstPass = await times();
    r.ok('the first pass laid down a curve', firstPass.length >= 8, `${firstPass.length} keyframes`);

    // Pass two: one touch early, a long silence, one touch late.
    const gapStart = 0.8, gapEnd = 2.6;
    const inGap = firstPass.filter((t) => t > gapStart && t < gapEnd).length;
    r.ok('the first pass left keyframes in the stretch the second will skip', inGap > 0,
        `${inGap} keyframes between ${gapStart}s and ${gapEnd}s`);

    // Back to the start, or the second pass would play out past the stretch it is meant
    // to skip over and never come near those keyframes at all.
    await page.locator('button[title*="Rewind"]').first().click();
    await page.waitForTimeout(400);

    await record(async () => {
        await page.mouse.wheel(0, -40);
        await page.waitForTimeout(1900);   // well past the 250ms gesture gap
        await page.mouse.wheel(0, -40);
        await page.waitForTimeout(200);
    });

    const secondPass = await times();
    r.ok('the second pass recorded something', secondPass.length > firstPass.length,
        `${firstPass.length} → ${secondPass.length} keyframes`);
    const survivors = secondPass.filter((t) => t > gapStart && t < gapEnd).length;
    r.ok('keyframes in the untouched stretch survive the second pass', survivors > 0,
        `${inGap} before → ${survivors} after`);
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
