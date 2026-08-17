# Running the desktop app for the first time

A Tauri shell is now scaffolded in `scroll-hero-editor/src-tauri/`. This is the throwaway
spike described in `docs/desktop-app-plan.md` §7 — enough to open the editor in a real macOS
window and see what survives. Nothing here is committed to permanently.

Everything below runs on **your Mac**. It cannot be tested from a Linux container, because
Tauri borrows the operating system's browser engine: WKWebView on macOS, WebKitGTK on Linux.
Those are different engines, so a Linux result would not tell you anything about your Mac.

## One-time setup

Two things Tauri needs that a web project does not. Both are installed once and then
forgotten.

**1. Apple's command line tools** (the C compiler and linker):

```
xcode-select --install
```

A dialog appears; accept it. If it says they are already installed, you are done.

**2. Rust** (Tauri's native half is written in it — you will never edit this code):

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Accept the default option. Then **close and reopen your terminal** so it picks Rust up.
Check it worked:

```
cargo --version
```

**It must report 1.85 or newer.** If Rust was already installed from before, it may well be
older — update it with:

```
rustup update stable
```

An out-of-date toolchain fails partway through the first build with `feature edition2024 is
required`, naming some crate you have never heard of. That message means "your Rust is too
old", nothing more.

## Get the branch

```
cd "Music-Reactive Scroll Hero Editor"
git fetch origin
git checkout claude/review-desktop-app-plan-k2v1nc
```

> Type each line separately. Do not paste a `#` comment onto the end of a command — the Mac
> terminal does not treat those as comments and hands them to git as if they were filenames.

## Install

```
cd scroll-hero-editor
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is not optional. Theatre.js asks for React Three Fiber 8 while this
project uses 9, so a plain `npm install` stops with an `ERESOLVE` error. The two work fine
together; only npm's strictness objects.

## Run it

```
npm run tauri dev
```

The first run compiles Rust from scratch — **expect 5–15 minutes** and a wall of scrolling
build output. That is normal and happens once. Later runs take seconds.

A desktop window opens with the editor in it. It is the real app: editing a file in
`src/` still reloads it live, exactly like the browser version.

## What to look for

The point of the spike is to find what breaks. In rough order of interest:

| Check | Why |
|---|---|
| Does the preview render? | THREE/WebGL under WKWebView is the biggest unknown after MIDI |
| Do the video pads scrub smoothly? | The proxy path is the performance work of the last month |
| Does audio play in time? | Web Audio under WKWebView |
| Do the number-pad keys fire pads? | Your current input route, so this one matters today |
| Does saving and reloading a project work? | IndexedDB inside a Tauri window |

**MP4 export will not work in a built app.** It works under `npm run tauri dev`, because
that still runs the Vite dev server behind the window. It will not survive
`npm run tauri build`. That is not a Tauri problem — it is the dev-server dependency
described in `docs/desktop-app-plan.md` §1, and fixing it is the main work of a real port.

**MIDI is expected to be the casualty.** Safari has historically not shipped Web MIDI, so
`navigator.requestMIDIAccess` is likely missing under WKWebView. You are on number-pad input
for now, so this is not blocking — but it is the thing that decides Tauri vs Electron later.

## Making an actual .dmg

```
npm run tauri build
```

Minutes, not seconds — Rust compiles in release mode. The installer lands in
`src-tauri/target/release/bundle/dmg/`.

**It will not open by double-clicking.** macOS Gatekeeper blocks unsigned apps, including
ones you built yourself. Right-click the app → **Open** → **Open** gets past it on your own
machine. Handing it to anyone else needs an Apple Developer account and notarization; see
`docs/desktop-app-plan.md` §4.

## Undoing all of this

The spike is one folder and two lines of config. To remove it:

```
rm -rf scroll-hero-editor/src-tauri
npm uninstall @tauri-apps/cli
```

Then drop the `"tauri"` script from `package.json`. Nothing in `src/` was touched.
