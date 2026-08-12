// Runs every *.spec.mjs against a dev server and exits non-zero if anything fails.
//
// Usage:  npm run test:e2e            (expects a dev server on :5173)
//         npm run test:e2e -- pads    (run only specs whose name matches)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.SCROLL_HERO_URL ?? 'http://127.0.0.1:5173/';
const filter = process.argv[2];

const specs = fs.readdirSync(DIR).filter((f) => f.endsWith('.spec.mjs'))
    .filter((f) => !filter || f.includes(filter))
    .sort();

if (specs.length === 0) {
    console.error(`No specs matched${filter ? ` "${filter}"` : ''}.`);
    process.exit(1);
}

// Fail fast with a useful message rather than a wall of Playwright timeouts.
try {
    const res = await fetch(URL_, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (e) {
    console.error(`\nCannot reach the app at ${URL_} — ${e.message}`);
    console.error('Start it first:  npm run dev\n');
    process.exit(1);
}

const run = (spec) => new Promise((resolve) => {
    console.log(`\n── ${spec.replace('.spec.mjs', '')} ${'─'.repeat(Math.max(0, 56 - spec.length))}`);
    const child = spawn(process.execPath, [path.join(DIR, spec)], { stdio: 'inherit' });
    child.on('exit', (code) => resolve({ spec, ok: code === 0 }));
});

const results = [];
for (const spec of specs) results.push(await run(spec));

const failed = results.filter((x) => !x.ok);
console.log(`\n${'═'.repeat(60)}`);
for (const { spec, ok } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${spec}`);
console.log(`${results.length - failed.length}/${results.length} specs passed`);
process.exit(failed.length === 0 ? 0 : 1);
