// Timeline: panel sizing, tool cursors, region selection, drawing, curve geometry.
import { launch, freshPage, project, pickTool, laneBox, laneDots, setTimelineTop, parkPlayhead, createReporter, shot } from './harness.mjs';

const r = createReporter('timeline');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
let page = await freshPage(ctx);

// ── The automation lanes must be able to take the space, with the preview shrinking ──
{
    const topBefore = await page.evaluate(() => document.querySelector('div.cursor-row-resize').getBoundingClientRect().top);
    await setTimelineTop(page, 120);
    const topAfter = await page.evaluate(() => document.querySelector('div.cursor-row-resize').getBoundingClientRect().top);
    const grew = 1000 - topAfter;
    r.ok('timeline grows past the old 600px cap', grew > 600, `${Math.round(grew)}px (was ${Math.round(1000 - topBefore)}px)`);
    const viewport = await page.locator('main').first().boundingBox();
    r.ok('preview shrinks but stays on screen', viewport && viewport.height > 0, `${Math.round(viewport?.height ?? 0)}px tall`);
    await shot(page, 'timeline-tall');
}

// ── Each tool has its own cursor, so the active tool is visible without the toolbar ──
{
    await setTimelineTop(page, 620);
    const cursor = () => page.evaluate(() => {
        const col = [...document.querySelectorAll('span')].filter((s) => s.textContent?.trim() === 'Rotation Speed')
            .map((s) => s.closest('[class*="w-[120px]"]')).find(Boolean);
        return col?.nextElementSibling ? getComputedStyle(col.nextElementSibling).cursor : 'no-track';
    });
    await pickTool(page, 'Select (V)');   const select = await cursor();
    await pickTool(page, 'Pen / Edit (P)'); const pen = await cursor();
    await pickTool(page, 'Freehand Draw (D)'); const draw = await cursor();
    await pickTool(page, 'Eraser (E)');   const eraser = await cursor();
    r.ok('pen tool sets a custom cursor image', pen.startsWith('url('));
    r.ok('pen cursor differs from select', pen !== select, `select=${select.slice(0, 16)}`);
    r.ok('draw cursor differs from pen', draw !== pen);
    r.ok('eraser cursor differs from draw', eraser !== draw);
}

// ── The wave lane holds no keyframes, so dragging it always means "select a region" ──
{
    await pickTool(page, 'Freehand Draw (D)');
    const box = await laneBox(page, 'Audio Wave');
    await page.mouse.move(box.x + box.w * 0.3, box.y + box.h / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.w * 0.6, box.y + box.h / 2, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    r.ok('can select an audio region with a drawing tool active', await page.locator('text=/REGION \\(/').count() > 0);
}

// ── Drawing is a pencil: the stroke replaces what it sweeps over ──
await page.close();
page = await freshPage(ctx);
{
    await setTimelineTop(page, 150);
    const box = await laneBox(page, 'Rotation Speed');
    await pickTool(page, 'Pen / Edit (P)');
    // Seeded off the stroke's sample grid, so a survivor is unambiguous.
    const topY = box.y + box.h * 0.3;
    for (const f of [0.283, 0.371, 0.457, 0.548, 0.634, 0.719, 0.86, 0.93]) {
        await page.mouse.move(box.x + box.w * f, topY);
        await page.mouse.down(); await page.mouse.up();
        await page.waitForTimeout(60);
    }
    await page.waitForTimeout(300);
    const seeded = await laneDots(page, 'Rotation Speed');
    r.ok('seeded keyframes high in the lane (sanity check)', seeded.length === 8 && seeded.every((d) => d.top < 50), `${seeded.length} dots`);

    await pickTool(page, 'Freehand Draw (D)');
    const drawY = box.y + box.h * 0.85;
    const from = box.x + box.w * 0.25, to = box.x + box.w * 0.75;
    await page.mouse.move(from, drawY);
    await page.mouse.down();
    for (let i = 0; i <= 30; i++) await page.mouse.move(from + ((to - from) * i) / 30, drawY, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const after = await laneDots(page, 'Rotation Speed');
    const inStroke = after.filter((d) => d.left > 26 && d.left < 74);
    const survivors = inStroke.filter((d) => d.top < 50);
    const outside = after.filter((d) => d.left <= 24 || d.left >= 76);
    r.ok('stroke overwrote the span it swept', survivors.length === 0, `${survivors.length} stray peaks left`);
    r.ok('keyframes outside the stroke were preserved', outside.length > 0, `${outside.length} kept`);
    await shot(page, 'timeline-draw');
}

// ── The Scroll POS lane has its own draw implementation; it must overwrite too ──
// This lane was missed when the param-lane draw was fixed, and the first test written
// for it passed against the broken code because the seeded points happened to land on
// the stroke's sample grid. Seed times here are deliberately off that grid.
{
    const scroll = await laneBox(page, 'Scroll POS') ?? await page.evaluate(() => {
        const col = [...document.querySelectorAll('span')].filter((s) => /scro/i.test(s.textContent || ''))
            .map((s) => s.closest('[class*="w-[120px]"]')).find(Boolean);
        const rc = col?.nextElementSibling?.getBoundingClientRect();
        return rc ? { x: rc.x, y: rc.y, w: rc.width, h: rc.height } : null;
    });
    await pickTool(page, 'Pen / Edit (P)');
    for (const f of [0.3283, 0.4371, 0.5457]) {
        await page.mouse.move(scroll.x + scroll.w * f, scroll.y + scroll.h * 0.25);
        await page.mouse.down(); await page.mouse.up();
        await page.waitForTimeout(300);
    }
    await pickTool(page, 'Freehand Draw (D)');
    const y = scroll.y + scroll.h * 0.85;
    await page.mouse.move(scroll.x + scroll.w * 0.25, y);
    await page.mouse.down();
    for (let i = 0; i <= 40; i++) await page.mouse.move(scroll.x + scroll.w * (0.25 + (0.5 * i) / 40), y, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(700);

    const inside = await page.evaluate(() =>
        (JSON.parse(localStorage.getItem('scroll-hero-current-project')).scrollKeyframes || [])
            .filter((k) => k.time > 2.6 && k.time < 7.4).map((k) => k.value));
    const survivors = inside.filter((v) => v > 0.5);
    r.ok('scroll-lane draw overwrites existing points', survivors.length === 0,
        `${survivors.length} stray peaks left of ${inside.length} keyframes`);
}

// ── A bezier curve must stay single-valued in time however far a handle is dragged ──
await page.close();
page = await freshPage(ctx);
{
    await setTimelineTop(page, 150);
    const box = await laneBox(page, 'Scroll POS') ?? await page.evaluate(() => null);
    const scroll = box ?? await page.evaluate(() => {
        const col = [...document.querySelectorAll('span')].filter((s) => /scro/i.test(s.textContent || ''))
            .map((s) => s.closest('[class*="w-[120px]"]')).find(Boolean);
        const rc = col?.nextElementSibling?.getBoundingClientRect();
        return rc ? { x: rc.x, y: rc.y, w: rc.width, h: rc.height } : null;
    });
    await pickTool(page, 'Pen / Edit (P)');
    for (const [f, v] of [[0.30, 0.75], [0.40, 0.25], [0.75, 0.70]]) {
        await page.mouse.move(scroll.x + scroll.w * f, scroll.y + scroll.h * v);
        await page.mouse.down(); await page.mouse.up();
        await page.waitForTimeout(120);
    }
    await pickTool(page, 'Select (V)');
    await page.mouse.click(scroll.x + scroll.w * 0.40, scroll.y + scroll.h * 0.25);
    await page.waitForTimeout(400);

    const knobs = await page.evaluate(() => {
        const col = [...document.querySelectorAll('span')].filter((s) => /scro/i.test(s.textContent || ''))
            .map((s) => s.closest('[class*="w-[120px]"]')).find(Boolean);
        return [...(col?.nextElementSibling?.querySelectorAll('div') || [])]
            .filter((d) => d.className.includes('w-2') && d.className.includes('h-2') && d.className.includes('rounded-full'))
            .map((d) => { const rc = d.getBoundingClientRect(); return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 }; })
            .sort((a, b) => a.x - b.x);
    });
    if (knobs.length >= 2) {
        const k = knobs[knobs.length - 1];
        await page.mouse.move(k.x, k.y);
        await page.mouse.down();
        await page.mouse.move(scroll.x + scroll.w * 0.98, scroll.y + scroll.h * 0.05, { steps: 25 });
        await page.mouse.up();
        await page.waitForTimeout(400);
    }
    const sample = await page.evaluate(() => {
        const col = [...document.querySelectorAll('span')].filter((s) => /scro/i.test(s.textContent || ''))
            .map((s) => s.closest('[class*="w-[120px]"]')).find(Boolean);
        const paths = [...(col?.nextElementSibling?.querySelectorAll('path') || [])]
            .filter((p) => (p.getAttribute('d') || '').includes('C'));
        const path = paths.find((p) => p.getAttribute('fill') === 'none') || paths[0];
        if (!path) return { worst: -1 };
        const len = path.getTotalLength();
        let worst = 0, prevX = -Infinity;
        for (let i = 0; i <= 400; i++) {
            const pt = path.getPointAtLength((len * i) / 400);
            if (pt.x < prevX) worst = Math.max(worst, prevX - pt.x);
            prevX = Math.max(prevX, pt.x);
        }
        return { worst };
    });
    r.ok('curve never doubles back in time', sample.worst === 0, `worst backtrack ${sample.worst}`);
}

// ── A keyframe sitting under the playhead must still be selectable ──
{
    await parkPlayhead(page, 'Rotation Speed', 0.5);
    const dots = await laneDots(page, 'Rotation Speed');
    const dot = dots[0];
    const covered = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? `${el.tagName}.${(el.getAttribute('class') || '').slice(0, 40)}` : 'none';
    }, [dot.x, dot.y]);
    await pickTool(page, 'Select (V)');
    await page.mouse.click(dot.x, dot.y);
    await page.waitForTimeout(400);
    const insp = await page.evaluate(() => {
        const a = [...document.querySelectorAll('aside')].find((x) => x.textContent?.includes('INSPECTOR'));
        return (a?.innerText || '').replace(/\s+/g, ' ');
    });
    r.ok('keyframe under the playhead is clickable', /Position/.test(insp), `topmost element there: ${covered}`);
}

await browser.close();
process.exit(r.summary() ? 0 : 1);
