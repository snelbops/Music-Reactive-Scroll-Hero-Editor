// Shared setup for the end-to-end checks.
//
// These drive the real app in a browser. They exist because the editor has no unit tests and
// most of its bugs live in pointer handling, z-order and persistence — none of which show up
// in a type check. Every assertion here was written against a reproduced bug and confirmed to
// fail before its fix.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(TEST_DIR, '../..');
export const ARTIFACT_DIR = path.join(TEST_DIR, '.artifacts');
export const APP_URL = process.env.SCROLL_HERO_URL ?? 'http://127.0.0.1:5173/';

/** Two clips of different byte lengths, so tests can tell which one a pad is serving. */
export const CLIP_A = path.join(APP_ROOT, 'out/scroll-hero-export.mp4');
export const CLIP_B = path.join(APP_ROOT, 'out/remotion-export-1786346266903.mp4');

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

/**
 * Launch a browser. Honours PLAYWRIGHT_BROWSERS_PATH-installed Chromium when a bundled
 * browser is not available, which is the usual case in a container.
 */
export async function launch() {
    const explicit = process.env.CHROMIUM_PATH;
    const candidates = [explicit, '/opt/pw-browsers/chromium'].filter(Boolean);
    const executablePath = candidates.find((p) => fs.existsSync(p));
    return chromium.launch(executablePath ? { executablePath } : {});
}

/** A page on a clean slate: no saved project, no stored media. */
export async function freshPage(ctx) {
    const page = await ctx.newPage();
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        localStorage.clear();
        indexedDB.deleteDatabase('ScrollHeroMediaDB');
    });
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    return page;
}

/**
 * A page whose saved project has been altered before the app boots.
 *
 * The app autosaves on beforeunload, so writing localStorage and reloading is always
 * clobbered by the outgoing page. Seeding has to happen in an init script.
 */
export async function seededPage(ctx, mutateSource) {
    const page = await ctx.newPage();
    await page.addInitScript((src) => {
        const raw = localStorage.getItem('scroll-hero-current-project');
        if (!raw) return;
        const proj = JSON.parse(raw);
        new Function('p', src)(proj);
        localStorage.setItem('scroll-hero-current-project', JSON.stringify(proj));
    }, mutateSource);
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    return page;
}

// ── App queries ──────────────────────────────────────────────────────────────

/** The autosaved working project, i.e. what the store currently holds. */
export const project = (page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem('scroll-hero-current-project') || '{}'));

export const pickTool = async (page, title) => {
    await page.locator(`button[title="${title}"]`).first().click();
    await page.waitForTimeout(150);
};

/** Bounding box of a lane's track area, found via its label column. */
export const laneBox = (page, name) => page.evaluate((n) => {
    const col = [...document.querySelectorAll('span')]
        .filter((s) => s.textContent?.trim() === n)
        .map((s) => s.closest('[class*="w-[120px]"]'))
        .find(Boolean);
    const r = col?.nextElementSibling?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
}, name);

/** Keyframe dots on a lane. `top` is the value mapped into the lane, so it reads back exactly. */
export const laneDots = (page, name) => page.evaluate((n) => {
    const col = [...document.querySelectorAll('span')]
        .filter((s) => s.textContent?.trim() === n)
        .map((s) => s.closest('[class*="w-[120px]"]'))
        .find(Boolean);
    return [...(col?.nextElementSibling?.querySelectorAll('div') || [])]
        .filter((d) => d.style.width === '18px' && d.style.left.endsWith('%'))
        .map((d) => {
            const r = d.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2, left: parseFloat(d.style.left), top: parseFloat(d.style.top) };
        })
        .sort((a, b) => a.left - b.left);
}, name);

/** Drag the timeline/preview divider so the automation lanes are reachable. */
export async function setTimelineTop(page, y) {
    const d = await page.locator('div.cursor-row-resize').first().boundingBox();
    await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2);
    await page.mouse.down();
    await page.mouse.move(d.x + d.width / 2, y, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(400);
}

/** Move the playhead clear of a region: its grab strip can sit over a keyframe dot. */
export async function parkPlayhead(page, laneName, frac = 0.95) {
    const box = await laneBox(page, laneName);
    if (!box) return;
    await pickTool(page, 'Pen / Edit (P)');
    await page.mouse.move(box.x + box.w * frac, box.y + box.h * 0.5);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(300);
}

export const inspectorText = (page) => page.evaluate(() => {
    const a = [...document.querySelectorAll('aside')].find((x) => x.textContent?.includes('INSPECTOR'));
    return (a?.innerText || '').replace(/\s+/g, ' ').trim();
});

// ── Assertions ───────────────────────────────────────────────────────────────

export function createReporter(specName) {
    const results = [];
    return {
        results,
        ok(name, pass, detail) {
            results.push({ name, pass: !!pass, detail });
            console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
        },
        note(msg) { console.log(`  ·     ${msg}`); },
        summary() {
            const failed = results.filter((r) => !r.pass);
            console.log(`  ${results.length - failed.length}/${results.length} passed in ${specName}`);
            return failed.length === 0;
        },
    };
}

export const shot = (page, name) => page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`) });
