// Project lifecycle: transport keys, curve cleanup, export duration, load and reset.
import fs from 'node:fs';
import path from 'node:path';
import { launch, freshPage, seededPage, project, pickTool, laneBox, laneDots, setTimelineTop, createReporter, shot, ARTIFACT_DIR, CLIP_A } from './harness.mjs';

const r = createReporter('project');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
let page = await freshPage(ctx);

const setLength = async (p, n) => {
    const input = p.locator('input[type="number"]:visible').last();
    await input.fill(String(n));
    await input.press('Enter');
    await p.waitForTimeout(600);
};

// ── One keypress is one undo step ──
{
    await setTimelineTop(page, 400);
    const box = await laneBox(page, 'Rotation Speed');
    await pickTool(page, 'Pen / Edit (P)');
    for (const f of [0.2, 0.4, 0.6, 0.8]) {
        await page.mouse.move(box.x + box.w * f, box.y + box.h * 0.5);
        await page.mouse.down(); await page.mouse.up();
        await page.waitForTimeout(250);
    }
    await pickTool(page, 'Select (V)');
    const before = (await laneDots(page, 'Rotation Speed')).length;
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(600);
    const afterUndo = (await laneDots(page, 'Rotation Speed')).length;
    r.ok('one keypress undoes exactly one step', before - afterUndo === 1, `${before} -> ${afterUndo}`);

    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(600);
    r.ok('one keypress redoes exactly one step', (await laneDots(page, 'Rotation Speed')).length - afterUndo === 1);

    const field = page.locator('input:visible').first();
    const kfBefore = (await laneDots(page, 'Rotation Speed')).length;
    await field.click();
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(400);
    r.ok('undo is ignored while typing in a field', (await laneDots(page, 'Rotation Speed')).length === kfBefore);
}

// ── Curve cleanup: smoothing and thinning, reachable from any tab ──
{
    const box = await laneBox(page, 'Rotation Speed');
    await pickTool(page, 'Freehand Draw (D)');
    await page.mouse.move(box.x + box.w * 0.1, box.y + box.h * 0.5);
    await page.mouse.down();
    for (let i = 0; i <= 80; i++) {
        const x = box.x + box.w * (0.1 + 0.8 * (i / 80));
        const y = box.y + box.h * (0.5 + (i % 2 === 0 ? -0.32 : 0.32));
        await page.mouse.move(x, y, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(600);
    const dense = (await laneDots(page, 'Rotation Speed')).length;

    const menu = 'div[class*="w-[330px]"]';
    const jitter = async () => {
        const tops = (await laneDots(page, 'Rotation Speed')).map((d) => d.top);
        if (tops.length < 2) return 0;
        let sum = 0; for (let i = 1; i < tops.length; i++) sum += Math.abs(tops[i] - tops[i - 1]);
        return sum / (tops.length - 1);
    };

    await pickTool(page, 'Select (V)');
    await page.mouse.click(box.x + box.w * 0.5, box.y + box.h * 0.5, { button: 'right' });
    await page.waitForTimeout(500);
    r.ok('Tidy row sits outside the tabs', await page.locator(`${menu} :text-is("Tidy")`).count() > 0);
    await shot(page, 'project-menu');

    await page.locator(`${menu} button:has-text("Rotation")`).first().click();
    await page.waitForTimeout(200);
    await page.locator(`${menu} button:has-text("Reduce")`).first().click();
    await page.waitForTimeout(600);
    const reduced = (await laneDots(page, 'Rotation Speed')).length;
    r.ok('Reduce thins the curve', reduced < dense && reduced > 1, `${dense} -> ${reduced}`);

    await page.mouse.click(box.x + box.w * 0.5, box.y + box.h * 0.5, { button: 'right' });
    await page.waitForTimeout(400);
    await page.locator(`${menu} button:has-text("Shapes")`).first().click();
    await page.waitForTimeout(300);
    r.ok('Tidy stays reachable from another tab', await page.locator(`${menu} button:has-text("Smooth")`).count() > 0);
    await page.locator(`${menu} button:has-text("Rotation")`).first().click();
    await page.waitForTimeout(200);
    const jitterBefore = await jitter();
    await page.locator(`${menu} button:has-text("Smooth")`).first().click();
    await page.waitForTimeout(600);
    const jitterAfter = await jitter();
    r.ok('Smooth reduces jitter', jitterAfter < jitterBefore, `${jitterBefore.toFixed(2)} -> ${jitterAfter.toFixed(2)}`);
}

// ── Exports carry the project's real length, not a fixed 10s ──
await page.close();
page = await freshPage(ctx);
{
    const TARGET = 27;
    await setLength(page, TARGET);
    const grab = async (label) => {
        const dl = page.waitForEvent('download', { timeout: 15000 });
        await page.locator('button[title="More export options"]').click();
        await page.waitForTimeout(300);
        await page.locator(`button:has-text("${label}")`).first().click();
        const d = await dl;
        const file = path.join(ARTIFACT_DIR, d.suggestedFilename());
        await d.saveAs(file);
        return fs.readFileSync(file, 'utf8');
    };
    const curves = JSON.parse(await grab('Export Curves'));
    r.ok('curves.json carries the real duration', curves.sequenceDuration === TARGET, `${curves.sequenceDuration} (want ${TARGET})`);
    const html = await grab('Export Standalone HTML');
    const m = html.match(/const SEQUENCE_DURATION = ([\d.]+);/);
    r.ok('exported page runs for the real duration', m && Number(m[1]) === TARGET, `${m ? m[1] : 'not found'} (want ${TARGET})`);
}

// ── Scroll shape presets span the whole project ──
{
    await page.evaluate(() => {
        const col = [...document.querySelectorAll('span')].filter((s) => /scro/i.test(s.textContent || ''))
            .map((s) => s.closest('[class*="w-[120px]"]')).find(Boolean);
        col?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(600);
    const shape = page.locator('aside button').filter({ hasText: 'S-Curve' }).first();
    if (await shape.count()) {
        await shape.click();
        await page.waitForTimeout(700);
        const kfs = (await project(page)).scrollKeyframes || [];
        const last = kfs.length ? kfs[kfs.length - 1].time : null;
        r.ok('shape preset spans the whole project', last === 27, `last keyframe ${last}s (want 27)`);
    } else {
        r.ok('shape presets reachable', false, 'S-Curve not found');
    }
}

// ── Renderer choice stays consistent, and survives reopening ──
{
    await page.setInputFiles('#pad-upload-0', CLIP_A);
    await page.waitForTimeout(2500);
    const afterUpload = (await project(page)).activePreset;
    await page.evaluate(() => {
        const input = document.getElementById('pad-color-0');
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '#ff0000');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    r.ok('recolouring a pad does not switch the renderer', (await project(page)).activePreset === afterUpload,
        `${afterUpload} -> ${(await project(page)).activePreset}`);

    await page.evaluate(() => {
        const el = document.getElementById('pad-upload-0')?.closest('[draggable="true"]');
        [...(el?.querySelectorAll('button') || [])].find((b) => b.title === 'Clear Pad Video')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    const cleared = (await project(page)).videoPads?.[0] ?? {};
    r.ok('clearing a pad drops its stored clip reference', !cleared.mediaKey && !cleared.url);
    await page.close();

    page = await seededPage(ctx, "p.activePreset = 'orbit'; p.activeVideoPadIdx = 0;");
    r.ok('project reopens with the preset it was saved with', (await project(page)).activePreset === 'orbit',
        `got ${(await project(page)).activePreset}`);
    await page.close();
}

// ── New Project starts genuinely empty ──
{
    page = await seededPage(ctx,
        "p.recordedEvents = [{time:1,x:0.5,y:0.5,click:false},{time:2,x:0.6,y:0.4,click:true}];" +
        "p.padSwitchEvents = [{time:1.5,padIdx:3}];");
    const seeded = await project(page);
    r.ok('seed loaded (sanity check)', (seeded.recordedEvents?.length ?? 0) === 2);

    page.once('dialog', (d) => d.accept());
    await page.locator('button[title="File operations"]').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("New Project")').first().click();
    await page.waitForTimeout(1500);
    const fresh = await project(page);
    r.ok('New Project clears the mouse recording', (fresh.recordedEvents?.length ?? 0) === 0);
    r.ok('New Project clears pad switches', (fresh.padSwitchEvents?.length ?? 0) === 0);
}

// ── A full localStorage must be visible, not silent ──
{
    await page.close();
    page = await freshPage(ctx);
    const status = () => page.evaluate(() => {
        const el = [...document.querySelectorAll('span')].find((s) => /^(saved|saved without recording|not saved)$/.test(s.textContent?.trim() || ''));
        return el?.textContent?.trim() ?? 'none';
    });
    r.ok('a healthy session reports itself saved', (await status()) === 'saved', await status());

    // Make every write fail the way a full quota does.
    await page.evaluate(() => {
        const real = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
            if (k === 'scroll-hero-current-project') {
                const err = new Error('QuotaExceededError');
                err.name = 'QuotaExceededError';
                throw err;
            }
            return real.call(this, k, v);
        };
    });
    // Any store mutation triggers an autosave; the length field is the surest one.
    await setLength(page, 12);
    await page.waitForTimeout(800);
    const failedStatus = await status();
    r.ok('a failed autosave is surfaced, not swallowed', failedStatus === 'not saved', `header reads "${failedStatus}"`);
    await shot(page, 'project-save-failed');
}

// ── A blob: URL from a previous session is dead on arrival and must not be restored ──
{
    await page.close();
    const DEAD = 'blob:http://127.0.0.1:5173/00000000-dead-0000-0000-000000000000';
    const failedRequests = [];
    const warnings = [];
    page = await seededPage(
        ctx,
        `p.audioUrl = '${DEAD}'; p.videoUrl = p.audioUrl;`,
        async (p) => {
            p.on('requestfailed', (req) => failedRequests.push(req.url()));
            p.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
        },
    );

    // The Audio Wave lane only offers "Remove audio track" while an audio URL is set, so
    // its absence is the observable sign that the dead one was dropped.
    const hasAudio = await page.locator('button[title="Remove audio track"]').count();
    r.ok('a dead blob audio URL is not restored', hasAudio === 0,
        hasAudio ? 'the lane still thinks it has audio' : 'lane offers an upload instead');

    r.ok('nothing tries to fetch the dead URL', !failedRequests.some((u) => u.includes('0000-dead-')),
        failedRequests.find((u) => u.includes('0000-dead-')) ?? 'no failed requests');
    r.ok('the waveform decoder is not handed a dead URL',
        !warnings.some((w) => w.includes('useKickDrumData')),
        warnings.find((w) => w.includes('useKickDrumData')) ?? 'no decode warning');
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
