// Video pads: the clip a pad serves must follow the pad, and survive a reload.
import fs from 'node:fs';
import { launch, freshPage, createReporter, CLIP_A, CLIP_B, APP_URL } from './harness.mjs';

const r = createReporter('pads');
const A = fs.statSync(CLIP_A).size;
const B = fs.statSync(CLIP_B).size;
const NAME_A = CLIP_A.split('/').pop();
const NAME_B = CLIP_B.split('/').pop();
r.note(`clip A = ${A} bytes, clip B = ${B} bytes`);

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await freshPage(ctx);

/** What each slot displays, and the bytes actually behind its URL. */
const slots = () => page.evaluate(async () => {
    const raw = localStorage.getItem('scroll-hero-current-project');
    const pads = raw ? JSON.parse(raw).videoPads || [] : [];
    const out = [];
    for (let i = 0; i < 2; i++) {
        const p = pads[i] || {};
        let bytes = null;
        if (p.url) { try { bytes = (await (await fetch(p.url)).blob()).size; } catch { bytes = 'DEAD'; } }
        out.push({ name: p.name, key: (p.mediaKey || '').slice(0, 14), bytes });
    }
    return out;
});
const idbSize = (key) => page.evaluate((k) => new Promise((res) => {
    const req = indexedDB.open('ScrollHeroMediaDB');
    req.onsuccess = () => {
        const g = req.result.transaction('media_files', 'readonly').objectStore('media_files').get(k);
        g.onsuccess = () => res(g.result ? g.result.size : null);
        g.onerror = () => res(null);
    };
}), key);

await page.setInputFiles('#pad-upload-0', CLIP_A);
await page.waitForTimeout(2500);
await page.setInputFiles('#pad-upload-1', CLIP_B);
await page.waitForTimeout(2500);

let s = await slots();
r.ok('each pad serves its own clip', s[0].bytes === A && s[1].bytes === B, JSON.stringify(s));

// ── Reordering moves the clip, not just the label ──
const padPoint = (i) => page.evaluate((n) => {
    const el = document.getElementById(`pad-upload-${n}`)?.closest('[draggable="true"]');
    const rc = el.getBoundingClientRect();
    return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 };
}, i);
const p0 = await padPoint(0), p1 = await padPoint(1);
await page.mouse.move(p0.x, p0.y);
await page.mouse.down();
await page.mouse.move(p1.x, p1.y, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(1200);

s = await slots();
const swapped = s[0].name === NAME_B && s[1].name === NAME_A;
r.ok('drag reorders the pads', swapped, JSON.stringify(s.map((x) => x.name)));
r.ok('stored media follows the clip, not the slot', swapped && s[0].bytes === B && s[1].bytes === A,
    `slot0 shows ${s[0].name} and serves ${s[0].bytes} (want ${B})`);

const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('scroll-hero-current-project')).videoPads.slice(0, 3).map((p) => p.id));
r.ok('numpad labels stay with the slot', JSON.stringify(ids) === JSON.stringify([7, 8, 9]), JSON.stringify(ids));

// ── A reload must revive the pads, not leave dead blob: URLs ──
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
s = await slots();
r.ok('pad media survives a reload', s[0].bytes === B && s[1].bytes === A, JSON.stringify(s));
r.ok('the reorder persists across the reload', s[0].name === NAME_B && s[1].name === NAME_A);

// ── Projects written under the old index-based keys still load ──
const rewound = await page.evaluate(async () => {
    const db = await new Promise((res) => { const q = indexedDB.open('ScrollHeroMediaDB'); q.onsuccess = () => res(q.result); });
    const read = (k) => new Promise((res) => {
        const g = db.transaction('media_files', 'readonly').objectStore('media_files').get(k);
        g.onsuccess = () => res(g.result); g.onerror = () => res(null);
    });
    const proj = JSON.parse(localStorage.getItem('scroll-hero-current-project'));
    const modernKey = proj.videoPads[0].mediaKey;
    const blob = await read(modernKey);
    if (!blob) return { error: 'no blob' };
    await new Promise((res) => {
        const tx = db.transaction('media_files', 'readwrite');
        tx.objectStore('media_files').put(blob, 'video-pad-0');
        tx.objectStore('media_files').delete(modernKey);
        tx.oncomplete = res;
    });
    delete proj.videoPads[0].mediaKey;
    proj.videoPads[0].url = 'blob:http://127.0.0.1:5173/stale-from-a-previous-session';
    localStorage.setItem('scroll-hero-current-project', JSON.stringify(proj));
    return { bytes: blob.size };
});
r.note(`rewound slot 0 to the legacy layout (${rewound.bytes} bytes under video-pad-0)`);

await page.goto(APP_URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
s = await slots();
r.ok('a legacy index-keyed project still loads its media', s[0].bytes === B, `${s[0].bytes} (want ${B})`);
r.ok('legacy media is migrated onto a stable key', s[0].key.startsWith('pad-media-'), s[0].key);

await browser.close();
process.exit(r.summary() ? 0 : 1);
