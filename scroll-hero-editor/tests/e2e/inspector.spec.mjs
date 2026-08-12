// Inspector: which panel appears, and whether edits land where they are shown.
import { launch, freshPage, project, pickTool, laneBox, laneDots, setTimelineTop, inspectorText, createReporter, shot } from './harness.mjs';

const r = createReporter('inspector');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await freshPage(ctx);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));

await setTimelineTop(page, 150);

const labelPoint = (name) => page.evaluate((n) => {
    const col = [...document.querySelectorAll('span')].filter((s) => s.textContent?.trim() === n)
        .map((s) => s.closest('[class*="w-[120px]"]')).find(Boolean);
    const rc = col?.getBoundingClientRect();
    return rc ? { x: rc.x + 20, y: rc.y + rc.height / 2 } : null;
}, name);

const inspValue = () => page.evaluate(() => {
    const a = [...document.querySelectorAll('aside')].find((x) => x.textContent?.includes('INSPECTOR'));
    const m = (a?.innerText || '').match(/Value\s*\n?\s*([-\d.]+)/);
    return m ? parseFloat(m[1]) : NaN;
});
const cpReadout = () => page.evaluate(() => {
    const a = [...document.querySelectorAll('aside')].find((x) => x.textContent?.includes('INSPECTOR'));
    const m = (a?.innerText || '').match(/CP1:\s*\(([^)]*)\)\s*CP2:\s*\(([^)]*)\)/);
    return m ? `CP1(${m[1]}) CP2(${m[2]})` : 'none';
});

// ── Lanes without keyframes still deserve a panel ──
{
    const audio = await labelPoint('Audio Wave');
    await page.mouse.click(audio.x, audio.y);
    await page.waitForTimeout(500);
    const text = await inspectorText(page);
    r.ok('Audio Wave lane shows a panel rather than a blank inspector',
        text.includes('Audio Wave') && text.length > 40, `"${text.slice(0, 60)}…"`);

    // Switching between a configured and an unconfigured lane must not change hook count.
    const rot = await labelPoint('Rotation Speed');
    for (const p of [rot, audio, rot, audio]) { await page.mouse.click(p.x, p.y); await page.waitForTimeout(250); }
    const hookErrors = errors.filter((e) => /hook|Rendered (more|fewer)/i.test(e));
    r.ok('switching between lane types does not break hooks', hookErrors.length === 0, hookErrors[0] ?? 'none');
    await shot(page, 'inspector-audio');
}

// ── Editing a single keyframe ──
{
    const box = await laneBox(page, 'Rotation Speed');
    await pickTool(page, 'Pen / Edit (P)');
    await page.mouse.move(box.x + box.w * 0.4, box.y + box.h * 0.5);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(400);
    await pickTool(page, 'Select (V)');
    await page.mouse.click(box.x + box.w * 0.4, box.y + box.h * 0.5);
    await page.waitForTimeout(500);

    const input = page.locator('aside input[type="number"]').first();
    if (await input.count()) {
        await input.fill('1.2345');
        await input.press('Enter');
        await page.waitForTimeout(500);
        r.ok('Enter commits the Edit Value field', Math.abs((await inspValue()) - 1.2345) < 0.001, `readout ${await inspValue()}`);
    } else {
        r.ok('Edit Value field present', false, 'not found');
    }
}

// ── Batch editing across lanes with different ranges ──
{
    const depth = await laneBox(page, 'Particle Depth (Add-on)');
    const opacity = await laneBox(page, 'CSS Opacity');
    const rot = await laneBox(page, 'Rotation Speed');
    await pickTool(page, 'Pen / Edit (P)');
    await page.mouse.move(depth.x + depth.w * 0.35, depth.y + depth.h * 0.5);
    await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(250);
    await page.mouse.move(opacity.x + opacity.w * 0.55, opacity.y + opacity.h * 0.5);
    await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(250);
    // Park the playhead clear of both dots.
    await page.mouse.move(rot.x + rot.w * 0.95, rot.y + rot.h * 0.5);
    await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(400);

    await pickTool(page, 'Select (V)');
    const dDot = (await laneDots(page, 'Particle Depth (Add-on)'))[0];
    const oDot = (await laneDots(page, 'CSS Opacity'))[0];
    await page.mouse.click(dDot.x, dDot.y); await page.waitForTimeout(350);
    await page.keyboard.down('Shift');
    await page.mouse.click(oDot.x, oDot.y);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(400);
    r.ok('shift-click builds a multi-selection', await page.locator('aside input[placeholder="Value..."]').count() > 0);

    const batch = page.locator('aside input[placeholder="Value..."]').first();
    await batch.fill('5');
    await batch.press('Enter');
    await page.waitForTimeout(600);
    const value = (dot, min, max) => min + (1 - dot.top / 100) * (max - min);
    const depthVal = value((await laneDots(page, 'Particle Depth (Add-on)'))[0], 0, 10);
    const opacityVal = value((await laneDots(page, 'CSS Opacity'))[0], 0, 1);
    r.ok('Set All clamps against each keyframe’s own lane',
        Math.abs(depthVal - 5) < 0.05 && Math.abs(opacityVal - 1) < 0.05,
        `depth=${depthVal.toFixed(2)} (0-10), opacity=${opacityVal.toFixed(2)} (0-1)`);

    const before = await inspValue();
    await page.locator('aside button:has-text("-0.5")').first().click();
    await page.waitForTimeout(500);
    const after = await inspValue();
    r.ok('Nudge refreshes the displayed value', !isNaN(before) && before !== after, `${before} -> ${after}`);
    await shot(page, 'inspector-batch');
}

// ── The bezier editor must follow the selection ──
{
    const rot = await laneBox(page, 'Rotation Speed');
    await pickTool(page, 'Pen / Edit (P)');
    for (const f of [0.25, 0.6]) {
        await page.mouse.move(rot.x + rot.w * f, rot.y + rot.h * 0.5);
        await page.mouse.down(); await page.mouse.up();
        await page.waitForTimeout(200);
    }
    // Park the playhead on another lane so it does not cover either dot.
    const park = await laneBox(page, 'CSS Opacity');
    await page.mouse.move(park.x + park.w * 0.05, park.y + park.h * 0.5);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(300);
    // The inspector needs room for the bezier editor, or it is scrolled out of view.
    await setTimelineTop(page, 620);
    await pickTool(page, 'Select (V)');
    const dots = (await laneDots(page, 'Rotation Speed')).filter((d) => d.left > 20 && d.left < 70);
    if (dots.length >= 2) {
        await page.mouse.click(dots[0].x, dots[0].y);
        await page.waitForTimeout(450);
        const before = await cpReadout();
        const circles = page.locator('aside circle.cursor-move');
        if (await circles.count()) {
            await circles.first().scrollIntoViewIfNeeded();
            const cb = await circles.first().boundingBox();
            await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
            await page.mouse.down();
            await page.mouse.move(cb.x + cb.width / 2 + 30, cb.y + cb.height / 2 - 40, { steps: 15 });
            await page.mouse.up();
            await page.waitForTimeout(450);
        }
        const dragged = await cpReadout();
        r.ok('dragging a control point changes the curve', dragged !== before && dragged !== 'none', `${before} -> ${dragged}`);

        await page.mouse.click(dots[1].x, dots[1].y);
        await page.waitForTimeout(500);
        const other = await cpReadout();
        r.ok('selecting another keyframe resets the editor', other !== 'none' && other !== dragged, `other=${other}`);

        await page.mouse.click(dots[0].x, dots[0].y);
        await page.waitForTimeout(500);
        r.ok('returning restores that keyframe’s own curve', (await cpReadout()) === dragged);
    } else {
        r.ok('two keyframes available for bezier check', false, `${dots.length} found`);
    }
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
