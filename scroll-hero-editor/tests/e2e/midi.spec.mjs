// MIDI input. Driven by a fake controller injected before the app boots, so the mapping and
// the recording timing can be checked without hardware — the reason this had gone untested.
import { launch, freshPage, project, laneDots, setTimelineTop, createReporter } from './harness.mjs';

const r = createReporter('midi');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

/** A MIDIAccess stand-in with one input, plus window.__midi(bytes) to play notes into it. */
const FAKE_MIDI = () => {
    const input = {
        id: 'fake-in-1',
        name: 'Fake Controller',
        manufacturer: 'Test',
        type: 'input',
        state: 'connected',
        onmidimessage: null,
    };
    const access = {
        inputs: new Map([[input.id, input]]),
        outputs: new Map(),
        onstatechange: null,
        sysexEnabled: false,
    };
    navigator.requestMIDIAccess = () => Promise.resolve(access);
    window.__midi = (bytes) => {
        if (input.onmidimessage) input.onmidimessage({ data: new Uint8Array(bytes) });
    };
    window.__midiAccess = access;
};

const page = await ctx.newPage();
await page.addInitScript(FAKE_MIDI);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('ScrollHeroMediaDB'); });
await page.addInitScript(FAKE_MIDI);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);

const send = (bytes) => page.evaluate((b) => window.__midi(b), bytes);
const activePad = () => page.evaluate(() =>
    JSON.parse(localStorage.getItem('scroll-hero-current-project') || '{}').activeVideoPadIdx ?? null);

r.ok('the app subscribed to the fake controller',
    await page.evaluate(() => !!window.__midiAccess.inputs.get('fake-in-1').onmidimessage));

const midiChip = page.locator('[data-purpose="midi-status"]');
r.ok('the transport reports the connected controller', await midiChip.count() === 1,
    await midiChip.count() ? await midiChip.getAttribute('title') : 'no indicator');

// ── Pads ──
{
    // Note On 45 → pad index 0, per the Akai LPD8 map.
    await send([0x90, 45, 100]);
    await page.waitForTimeout(300);
    r.ok('a note-on switches the active video pad', (await activePad()) === 0, `pad ${await activePad()}`);

    await send([0x90, 38, 100]);
    await page.waitForTimeout(300);
    r.ok('a different note selects a different pad', (await activePad()) === 8, `pad ${await activePad()}`);

    // Note On with velocity 0 is a note-off; it must not retrigger.
    await send([0x90, 45, 0]);
    await page.waitForTimeout(250);
    r.ok('a zero-velocity note-on is ignored, as a note-off', (await activePad()) === 8,
        `pad ${await activePad()}`);

    await send([0x90, 60, 100]);
    await page.waitForTimeout(250);
    r.ok('an unmapped note changes nothing', (await activePad()) === 8, `pad ${await activePad()}`);
}

// ── Knob recording: the timing that was fixed but never verified ──
{
    await setTimelineTop(page, 300);
    await page.locator('button[title*="Record"]').first().click();
    await page.waitForTimeout(4200); // 3-2-1 countdown, then recording starts with playback

    const recording = await page.evaluate(() =>
        !!document.querySelector('button[title*="Record"]')?.className.match(/red/i));
    r.note(`record button reads ${recording ? 'armed' : 'idle'}`);

    // Sweep the knob across ~2.5s of playback.
    const values = [10, 40, 70, 100, 127];
    for (const v of values) {
        await send([0xb0, 16, v]);
        await page.waitForTimeout(500);
    }
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);

    const kfs = (await project(page)).scrollKeyframes ?? [];
    r.ok('the knob sweep recorded keyframes', kfs.length >= 3, `${kfs.length} keyframes`);

    const times = kfs.map((k) => k.time);
    const spread = Math.max(...times) - Math.min(...times);
    r.ok('keyframes are spread across the recording, not bunched at the start',
        spread > 1, `spread ${spread.toFixed(2)}s over ${times.length} points`);

    // The old bug took the time from scrollProgress — a 0..1 value that had just been
    // overwritten with the knob's own reading — so the whole sweep landed inside the first
    // fraction of a second. Reintroducing it collapses the spread above to ~0.04s.
    r.ok('the recording reaches past the first second', Math.max(...times) > 1,
        `last at ${Math.max(...times).toFixed(2)}s`);

    const dots = await laneDots(page, 'Scroll POS');
    r.ok('the recorded curve is drawn on the lane', dots.length >= 3, `${dots.length} dots`);
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
