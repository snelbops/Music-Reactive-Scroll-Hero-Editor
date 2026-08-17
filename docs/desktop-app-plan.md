# 🖥️ Desktop App Conversion & Performance Analysis Plan Document

This document outlines the performance analysis, framework comparison, conversion steps, development workflow, and **automated GitHub Releases self-updating pipeline** for converting **Music-Reactive Scroll Hero Editor** into a native desktop application.

---

## 1. Would performance be better as a desktop app?

**Yes, significantly better**—especially for audio timeline scrubbing, canvas rendering, and video export.

### Current Web Browser Bottlenecks:
- **Tab Memory Throttling**: Browsers aggressively limit tab memory for HTML5 video decoders, Web Audio buffers, and canvas frame caches.
- **Main-Thread Competition**: UI interactions, DOM re-renders, canvas drawing, and Theatre.js sequence evaluation compete on the browser's single-threaded event loop.
- **Audio/Video Scrubbing Jitter**: Browsers handle HTML5 `<audio>` and `<video>` seeking asynchronously, which can introduce micro-latencies when scrubbing the timeline rapidly.

### Desktop App Advantages:
- **Uncapped Hardware Acceleration**: Full access to GPU resources (Metal/AVFoundation on macOS) without browser sandbox throttling.
- **Multi-Threaded Native Workers**: Heavy operations—like audio peak extraction, wave analysis, or Remotion/FFmpeg video rendering—can run on separate background threads in native code without locking the timeline UI.
- **Direct File System Access**: Unlimited local disk caching for extracted video frames and audio data (no browser `Blob` or `indexedDB` storage quotas).

---

## 2. Best Framework Options

| Metric | **Tauri 2.0 (Recommended)** | **Electron** |
| :--- | :--- | :--- |
| **Backend Engine** | Rust + Native System Webview (WKWebView on macOS) | Chromium + Node.js |
| **App Bundle Size** | ~10–15 MB | ~120+ MB |
| **RAM Usage** | ~30–60 MB | ~250–400 MB |
| **React/Vite Code Reuse** | **100%** (Keeps existing frontend code) | **100%** (Keeps existing frontend code) |

> 💡 **Recommendation**: **Tauri 2.0** is ideal because it keeps 100% of your existing React + Vite + Zustand + Theatre.js code untouched while producing a lightweight, native desktop app (`.dmg` / `.app`).

---

## 3. What is Involved in Converting?

The conversion process is straightforward and does not require rewriting your frontend logic:

1. **Add Tauri Wrapper**:
   - Run `npx @tauri-apps/cli init` inside the project folder. This creates a `src-tauri/` configuration directory.
2. **Link Vite Build Server**:
   - Point Tauri to dev server `http://localhost:5173` and production build folder `dist/`.
3. **Add Native Features (Optional)**:
   - **Native File Dialogs**: Use native OS file pickers for importing audio/video stems and saving `.json` project files.
   - **Bundled FFmpeg**: Include a bundled FFmpeg executable for fast offline video rendering directly on your machine.
   - **Native Menu Bar**: Native macOS top menu (`File`, `Edit`, `Timeline`, `Export`).
4. **Compile Desktop Bundle**:
   - Run `npm run tauri build` to output a standalone macOS `.dmg` / `.app`.

---

## 4. Development & Maintenance Workflow

### How updating works:
- **Same Codebase**: All application code (`src/editor/Timeline.tsx`, `src/store/useStore.ts`, etc.) stays as the exact same React + TypeScript project.
- **Real-time Dev Mode**: When developing or fixing bugs together, we run the dev server. Any changes update instantly (Hot Module Replacement) so you can test them live on your screen immediately.
- **Building a New `.dmg` File**: Whenever you are happy with a set of bug fixes or new features, running one single command (`npm run tauri build`) creates a fresh, updated `.dmg` installer in seconds. You simply double-click the new `.dmg` to replace/update your desktop app.

---

## 5. 🔄 Automatic GitHub Updates Pipeline (Tauri Auto-Updater)

You can configure the desktop application to automatically check GitHub Releases on launch and self-update without requiring manual `.dmg` downloads.

### Step 1: Generate Code Signing Keys
Run the Tauri signer tool to generate an Ed25519 public/private key pair:
```bash
npx tauri signer generate
```
- **Public Key**: Placed in `src-tauri/tauri.conf.json`.
- **Private Key**: Saved in your GitHub Repository Secrets as `TAURI_SIGNING_PRIVATE_KEY`.

### Step 2: Configure Tauri Updater in `src-tauri/tauri.conf.json`
Point the updater plugin to your GitHub Releases endpoint:
```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_GENERATED_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://github.com/snelbops/Music-Reactive-Scroll-Hero-Editor/releases/latest/download/latest.json"
      ]
    }
  }
}
```

### Step 3: Add In-App Update Prompt (React Hook)
In your React code, check for updates on startup:
```tsx
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

async function checkForUpdates() {
  const update = await check();
  if (update) {
    console.log(`Found update ${update.version} from ${update.date}`);
    let downloaded = 0;
    let contentLength = 0;
    
    // Download and install update
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength;
          break;
        case 'Progress':
          downloaded += event.data.chunkLength;
          break;
        case 'Finished':
          console.log('Download finished');
          break;
      }
    });

    // Relaunch the desktop app into the updated version!
    await relaunch();
  }
}
```

### Step 4: GitHub Actions Automated Build Workflow (`.github/workflows/release.yml`)
Whenever you push a git version tag (e.g. `v1.9.0`), GitHub Actions will automatically:
1. Compile the macOS `.dmg` / `.app` bundle.
2. Sign the build with your Ed25519 private key.
3. Create a GitHub Release and upload `latest.json` alongside the `.dmg`.

```yaml
name: "Release Desktop App"

on:
  push:
    tags:
      - 'v*'

jobs:
  publish-tauri:
    permissions:
      contents: write
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
        with:
          tagName: v__VERSION__
          releaseName: "Scroll Hero Editor v__VERSION__"
          releaseBody: "See release notes for full list of updates."
          releaseDraft: false
          prerelease: false
```

### How the User Experience Works:
1. You make changes with me here.
2. You commit and push a tag: `git tag v1.9.0 && git push origin main --tags`.
3. GitHub Actions builds and publishes the release automatically.
4. When you open your Desktop App on your Mac, it notices the new update, installs it seamlessly in the background, and restarts into the new version!

---

# Review of the plan above

Written against the codebase as of `6cf0c58`, revalidated at `a92acce`. The plan's shape is
sound and the framework choice is probably right. What follows is where it does not match
this repository, and what I would change.

The auto-update pipeline needs the most work: as written it would build, publish, and then
never update anything — see §3.

See also `docs/future-plans-ableton-desktop.md`, which covers the Ableton side and reaches
the same framework conclusion by a different route.

## 1. "100% code reuse" is not true of this app

The Remotion MP4 export is **Vite dev-server middleware** — registered in `configureServer`
in `vite.config.ts`. It does not exist in a production build. `npm run build` today produces
an app whose MP4 export has no backend at all.

That is not an argument against the plan; it is the single best argument *for* it. But it
means the port does not preserve that code, it replaces it. Budget for reimplementing the
render backend as a Rust command or a bundled ffmpeg sidecar.

*Partly addressed:* `src/export/exporter.ts` now names this boundary. The modal asks an
`Exporter` to render rather than calling `fetch` directly, and reports honestly when no
renderer is present instead of failing with a bare 404. A desktop build swaps the
implementation; nothing in the UI changes.

## 2. Tauri on macOS means WKWebView, not Chromium

The framework table compares bundle size and RAM but not engine compatibility, which is
what will actually decide this. Three things in this app sit on that fault line:

- **Web MIDI.** Safari does not ship it. `src/utils/webMidi.ts` is built on
  `navigator.requestMIDIAccess`; under WKWebView that call is likely absent, and MIDI would
  have to be reimplemented natively (Rust `midir`) and bridged into JS. Electron keeps Web
  MIDI because it bundles Chromium.
- **MediaRecorder codecs.** `src/export/exportVideo.ts` picks a MIME type by walking a list
  and testing `isTypeSupported`. The MP4 list leads with `avc1`, which WKWebView does
  support, so MP4 capture degrades gracefully. The WebM list does not: every entry on it is
  VP8/VP9, none of which Safari's MediaRecorder supports, and the final fallback is a bare
  `mimeType = 'video/webm'` that was never tested at all. Under WKWebView that reaches the
  `MediaRecorder` constructor unsupported and throws. Either drop the WebM option on desktop
  or make the fallback the first *supported* type rather than a guess.
- **SharedArrayBuffer.** `vite.config.ts` sets COOP/COEP headers for ffmpeg.wasm. Those are
  a dev-server setting; getting them onto Tauri's custom protocol is fiddly. Moot if the
  desktop build uses native ffmpeg, which it should.

**Verify Web MIDI in WKWebView before committing to Tauri.** It is the cheapest question to
answer and the most expensive to get wrong.

## 3. The release pipeline would build but never update

Section 5 is the most detailed part of the plan and the part with the most missing pieces.
Taken as written it produces a working `.dmg` and a self-updater that finds nothing.

**The updater artifacts are never generated.** Tauri 2 only emits them when the bundle asks
for it:

```json
{ "bundle": { "createUpdaterArtifacts": true } }
```

Without that there is no `latest.json` and no signature, so the endpoint in Step 2 is a 404
forever. Nothing in the plan sets it.

**The `.dmg` is not the update artifact.** Step 4 says the release uploads `latest.json`
"alongside the `.dmg`", and Step 5 has the app updating from it. It cannot. On macOS the
updater consumes `<app>.app.tar.gz` plus its `.sig` — the `.dmg` is the first-install
format only. Both need to be on the release.

**The plugin is only half-installed.** Step 3 shows the React hook, which is the last part.
Before it works you need the npm packages (`@tauri-apps/plugin-updater`,
`@tauri-apps/plugin-process`), the matching Rust crates registered in `lib.rs`
(`app.handle().plugin(tauri_plugin_updater::Builder::new().build())`), and the permissions
in `src-tauri/capabilities/default.json` — Tauri 2 denies uninvited plugin calls, so
`check()` fails at runtime without an `updater:default` entry.

**Signing needs the passphrase too.** `npx tauri signer generate` prompts for one. If you
set it, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` must be in the workflow env beside the key, or
the bundler cannot sign and the build fails late. Simplest is to generate the key with an
empty passphrase and still pass the (empty) secret.

Then the workflow itself:

- `uses: setup-node@v4` → `actions/setup-node@v4`.
- The app lives in `scroll-hero-editor/`, not the repo root. `npm install` at the root
  installs the BMAD tooling, not the app. `tauri-action` needs `projectPath: scroll-hero-editor`,
  and the `npm install` step needs a `working-directory` to match.
- **Two `package.json` files disagree about the version.** The root is `1.1.0`, the app is
  `1.9.0`. `__VERSION__` and the version the updater compares against both come from the app
  one, so a tag has to track `scroll-hero-editor/package.json` — and `v1.9.0` is already the
  current version, meaning the first tagged release needs a bump before it means anything.
- `macos-latest` is Apple Silicon. That is fine for your own machine, but the build it
  produces will not run on an Intel Mac. Universal binaries need
  `args: --target universal-apple-darwin` plus both Rust targets installed.
- `npm run tauri build` takes minutes, not seconds — Rust compiles, and the first build is
  much longer than later ones. Section 4's "in seconds" is wrong.

## 4. Missing: Apple notarization

An unsigned `.dmg` from CI will not open — Gatekeeper blocks it, including on your own Mac
(right-click → Open is the workaround). Distributing to anyone else needs an Apple Developer
account and a notarization step in the workflow. It is a real cost and about a day of
fiddling, and it belongs in the plan.

## 5. Native ffmpeg should not be optional

It is listed under "Add Native Features (Optional)". It is the largest single win:

- Proxy builds drop from ~9s for a short clip to well under a second.
- The wasm heap ceiling disappears. That ceiling is why proxies are capped at 480p, and the
  cap turned out to be optimistic: 480p failed outright on a real machine, so
  `packages/ffmpegExtractor.ts` now steps down through 360p, 240p and 180p when the core
  traps or stops answering. How far it has to fall varies by machine and by browser, which
  means the proxy quality a user actually gets is not something the app can promise. Native
  ffmpeg removes the whole ladder — and the deadline guard, and the retry, and the caveat.

## 6. A correction to the premise

Section 1 attributes the slowness to tab memory throttling and main-thread competition.
That is not what was wrong. The stutter was the cost of seeking a long-GOP file on every
scroll tick, and it is now largely fixed **in the browser** by the per-pad proxies.

So the raw performance case for desktop is weaker than the document assumes. The arguments
that survive are worth stating plainly, because they are the real ones:

1. Export works outside a dev server.
2. Proxy builds are fast enough to be unremarkable, at full resolution.
3. Storage headroom — ten pads of proxies will meet IndexedDB quotas eventually.
4. Native file access, multi-monitor output, and a menu bar.

## 7. When to convert

**Not yet. Spend a day, not a month.** Wrap the current app in Tauri as a throwaway spike
and answer three questions:

1. Does Web MIDI work under WKWebView?
2. Does the preview render acceptably — THREE, WebGL, the proxy canvas?
3. Can a bundled ffmpeg be driven from Rust and its output handed back to the UI?

That tells you whether it is Tauri or Electron. The decision gets expensive to reverse once
`src-tauri/` holds real code.

**Port properly when something only native can fix is blocking you** — most likely proxy
build times on 4K footage, or wanting to hand someone an app rather than a dev server.

**Meanwhile, keep the seams.** The platform-specific surface is already small and already
isolated:

| Seam | What a desktop build swaps in |
|---|---|
| `packages/ffmpegExtractor.ts` | Native ffmpeg instead of wasm |
| `utils/mediaStore.ts` | Files on disk instead of IndexedDB |
| `utils/padProxy.ts` | Proxies cached on disk |
| `export/exporter.ts` | Native render instead of an HTTP call |
| `utils/webMidi.ts` | Native MIDI if WKWebView cannot |

Keep new platform-dependent work behind those five, and the port stays a set of swapped
implementations rather than a rewrite.
