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

Written against the codebase as of `6cf0c58`. The plan's mechanics are sound — the
auto-update pipeline in particular is close to right. What follows is where it does not
match this repository, and what I would change.

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
- **MediaRecorder codecs.** `src/export/exportVideo.ts` falls back through
  `video/webm;codecs=vp9`. Safari's MediaRecorder does not support VP8/VP9.
- **SharedArrayBuffer.** `vite.config.ts` sets COOP/COEP headers for ffmpeg.wasm. Those are
  a dev-server setting; getting them onto Tauri's custom protocol is fiddly. Moot if the
  desktop build uses native ffmpeg, which it should.

**Verify Web MIDI in WKWebView before committing to Tauri.** It is the cheapest question to
answer and the most expensive to get wrong.

## 3. Errors in the GitHub Actions workflow

- `uses: setup-node@v4` → `actions/setup-node@v4`.
- The app lives in `scroll-hero-editor/`, not the repo root. `npm install` at the root
  installs the BMAD tooling, not the app. `tauri-action` needs `projectPath: scroll-hero-editor`.
- `npm run tauri build` takes minutes, not seconds — Rust compiles, and the first build is
  much longer than later ones.

## 4. Missing: Apple notarization

An unsigned `.dmg` from CI will not open — Gatekeeper blocks it, including on your own Mac
(right-click → Open is the workaround). Distributing to anyone else needs an Apple Developer
account and a notarization step in the workflow. It is a real cost and about a day of
fiddling, and it belongs in the plan.

## 5. Native ffmpeg should not be optional

It is listed under "Add Native Features (Optional)". It is the largest single win:

- Proxy builds drop from ~9s for a short clip to well under a second.
- The wasm heap ceiling disappears. That ceiling is why proxies are capped at 480p today —
  above roughly 170k output pixels per frame the wasm core stops answering rather than
  failing (see `packages/ffmpegExtractor.ts` and its deadline guard).

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

---

# The scaffold

Added on the `claude/playhead-controller-param-glitches-hhdlzv` branch. It is the wrapper
and nothing else — no native ffmpeg, no native MIDI, no updater. The point is to make the
first local run a real test rather than an afternoon of setup.

**It has never been run.** It was written in a Linux container, which cannot build or launch
a macOS app, so everything below is unverified on the platform it targets. What *was* checked
here is listed at the end.

## What is in it

| Path | What it is |
|---|---|
| `scroll-hero-editor/src-tauri/` | The Rust crate: `Cargo.toml`, `build.rs`, `src/main.rs`, `src/lib.rs` |
| `scroll-hero-editor/src-tauri/tauri.conf.json` | Window 1600×1000, dev URL `:5173`, build output `../dist`, bundle targets `app` + `dmg` |
| `scroll-hero-editor/src-tauri/icons/` | Placeholder icon — a waveform in the project's purple/teal. Replace with `npx tauri icon path/to/art.png` |
| `.github/workflows/release.yml` | Tag `v*` → macOS build → **draft** release, arm64 and Intel |
| `scroll-hero-editor/.npmrc` | `legacy-peer-deps=true`, which this tree already needed |

`package.json` gains `tauri`, `tauri:dev` and `tauri:build`. `vite.config.ts` pins the dev
server to 5173 with `strictPort`, since the desktop window is configured to load that exact
address and drifting to 5174 would point it at nothing.

## Running it the first time

```bash
cd scroll-hero-editor
npm install          # picks up @tauri-apps/cli
npm run tauri:dev    # first run compiles Rust — minutes, not seconds
```

Rust must be present: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`, plus
Xcode command line tools (`xcode-select --install`).

`tauri:dev` starts Vite itself. Do not have `npm run dev` already running or the port will
be taken and `strictPort` will stop it — which is the intended behaviour, not a bug.

## What to look at, in order

The three questions from §7, and the fastest way to answer each. Open devtools with
right-click → Inspect Element.

1. **Does the wrapper work at all?** In the console:
   `await __TAURI__.core.invoke('platform_info')`
   Returns `{ os, arch, ffmpeg }`. If that answers, the JS↔Rust bridge is live. `ffmpeg` is
   the version string of an ffmpeg on `PATH`, or `null` — which also settles how much work
   the bundled-ffmpeg step will be.
2. **Does the preview render?** Load a project and watch the viewport. THREE/WebGL, the
   proxy canvas, the waveform. This is WKWebView, not Chromium.
3. **Does Web MIDI exist?** `typeof navigator.requestMIDIAccess` — `"undefined"` means it
   must be reimplemented natively, and the MIDI chip in the timeline will stay dark.

Also worth a look, because each is a known fault line rather than a guess:

- **Audio.** Web Audio in WKWebView needs a user gesture before it will start. If the
  waveform is silent until you click something, that is why.
- **Proxy extraction.** ffmpeg.wasm in the dev window should behave as it does in Chrome —
  the COOP/COEP headers come from the Vite dev server, which is still serving the page.
  In a **built** app it is served over Tauri's own protocol with no such headers, so if
  proxies work in `tauri:dev` and fail in `tauri:build`, that is the cause.
- **Export.** It will report unavailable, correctly. The Remotion renderer is dev-server
  middleware; a built app has no backend. That is `src/export/exporter.ts` doing its job,
  and replacing it is the actual porting work.

## Deliberately left out

- **The updater.** It needs a signing keypair generated on your machine (`npx tauri signer
  generate`); a placeholder public key in the config would fail the build. The workflow has
  the env var commented in place for when the key exists.
- **Notarization.** Same — needs an Apple Developer account. Until then the release is a
  draft and the build is unsigned, so opening it on another Mac means right-click → Open.
- **Native plugins** (dialog, fs, shell). Each one adds a capabilities file and another
  thing that can fail on a first run. Add them when there is a reason to.

## Verified here, and not

Checked, in this Linux container:

- **The Rust crate compiles** — `cargo check` clean against
  `x86_64-unknown-linux-gnu`. That needed GTK and WebKitGTK dev packages
  (`libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev librsvg2-dev`), which a Mac does
  not: there the system webview is WKWebView and no such packages exist. The check is
  worth more than it looks, because `tauri::generate_context!` runs at compile time —
  it parses `tauri.conf.json` and reads every icon in the bundle list, so a malformed
  config or a bad `icns` fails the build rather than the first launch.
- **The icons** are well-formed PNG and `icns` (written by hand — no ImageMagick here).
- **`tauri info`** resolves the config: dev URL, `frontendDist`, React/Vite detected.
- **The web app** still type-checks and builds (`npm run build`).
- **The e2e suite** still passes, 12/12 specs, with the dev server pinned to 5173.

Not checked, and not checkable from Linux: that the macOS bundle builds, that the window
opens, or anything at all about WKWebView's behaviour — Web MIDI, Web Audio, MediaRecorder
codecs, WebGL. Those are the first run's job, and the list above is deliberately ordered
so the cheapest answers come first.

### The ignore rules, and how they went wrong

Worth recording, because the first attempt failed twice over.

The rules for the Rust build output were written into the repository-root `.gitignore`
as `src-tauri/target/`. A pattern containing a slash anchors to the directory holding the
`.gitignore`, so it matched a path that does not exist — the crate is one level down,
under `scroll-hero-editor/`. Nothing was ignored.

By then `cargo check` had run, and a `git add -A` in the following commit swept the
whole build tree in: **2,859 files, 1.08 GB**. Moving the rules to
`scroll-hero-editor/src-tauri/.gitignore` stopped anything *new* being added but did not
untrack what was already committed — `.gitignore` never does.

The check that was supposed to catch this did not, and the reason is worth knowing:
`git add -A --dry-run` lists files it *would newly stage*. Files already tracked and
unchanged print nothing — identical output to files correctly ignored. It cannot tell the
two apart, so it was the wrong instrument. `git ls-files <path>` answers the actual
question: is this tracked?

The branch was rebuilt from `main` with only the eighteen real files, so the artifacts are
absent from its history rather than merely untracked.
