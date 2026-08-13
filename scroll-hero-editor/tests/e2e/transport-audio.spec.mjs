// One audio player, and a loop that still loops while recording.
import { launch, freshPage, setTimelineTop, createReporter } from './harness.mjs';

const r = createReporter('transport-audio');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await freshPage(ctx);

/** Every audio element the page has created, however it was made. */
const audioPlayers = () => page.evaluate(() => window.__audioCreated ?? []);

// ── Only one thing plays the audio ──
{
    // Count every HTMLAudioElement the app constructs or renders, from before it boots.
    await page.addInitScript(() => {
        window.__audioCreated = [];
        const RealAudio = window.Audio;
        window.Audio = function (...args) {
            window.__audioCreated.push('new Audio()');
            return new RealAudio(...args);
        };
        window.Audio.prototype = RealAudio.prototype;
        const realPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function (...args) {
            if (this.tagName === 'AUDIO') window.__audioCreated.push(`play:${this.src.slice(-24)}`);
            return realPlay.apply(this, args);
        };
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);

    const elements = await page.locator('audio').count();
    const constructed = (await audioPlayers()).filter((e) => e === 'new Audio()').length;
    r.ok('the app has a single audio player', elements + constructed === 1,
        `${elements} <audio> element(s) + ${constructed} constructed`);
}

// ── Looping keeps looping while recording ──
{
    await setTimelineTop(page, 300);

    // A short loop, so a pass completes quickly.
    await page.evaluate(() => {
        const el = document.querySelector('div.overflow-x-auto.thin-scrollbar');
        el.scrollLeft = 0;
    });
    const lanes = await page.evaluate(() => {
        const el = document.querySelector('div.overflow-x-auto.thin-scrollbar');
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width };
    });
    // Click the loop track to centre a loop, then enable looping.
    await page.mouse.click(lanes.x + 120 + (lanes.w - 120) * 0.2, lanes.y + 8);
    await page.waitForTimeout(300);
    const loopButton = page.locator('button[title="Toggle Loop Region"]');
    await loopButton.click();
    await page.waitForTimeout(200);

    const clock = () => page.evaluate(() => {
        const el = [...document.querySelectorAll('div')]
            .find((d) => /^\d\d:\d\d:\d\d:\d{3}$/.test(d.textContent?.trim() || ''));
        if (!el) return null;
        const [h, m, s, ms] = el.textContent.trim().split(':').map(Number);
        return h * 3600 + m * 60 + s + ms / 1000;
    });

    const lengthBefore = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('scroll-hero-current-project') || '{}').sequenceDuration);

    await page.locator('button[title*="Record"]').first().click();
    await page.waitForTimeout(4200); // 3-2-1 countdown, then record + play

    // Watch for the clock going backwards, which only happens on a loop wrap.
    let previous = await clock();
    let wrapped = false;
    let highest = previous ?? 0;
    for (let i = 0; i < 24; i++) {
        await page.waitForTimeout(400);
        const now = await clock();
        if (now === null) break;
        if (previous !== null && now < previous - 0.2) wrapped = true;
        highest = Math.max(highest, now);
        previous = now;
    }
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);

    r.ok('the loop wraps while recording', wrapped, `highest reading ${highest.toFixed(2)}s`);

    const lengthAfter = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('scroll-hero-current-project') || '{}').sequenceDuration);
    r.ok('recording inside a loop does not stretch the sequence', lengthAfter === lengthBefore,
        `${lengthBefore}s → ${lengthAfter}s`);
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
