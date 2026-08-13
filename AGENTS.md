# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

**Scroll Hero Editor** — a DAW/video-editor-style tool for choreographing scroll-based web
animations against music. Audio waveform, scroll position, mouse and MIDI input are mapped
onto visual layer properties through a timeline of automation lanes, and the result can be
exported as a standalone HTML hero or rendered to MP4.

## Where the app is

**`scroll-hero-editor/` is the application.** Everything below refers to it, and it is where
`npm` commands must be run from.

```bash
cd scroll-hero-editor
npm install
npm run dev        # Vite dev server on :5173
npm run build      # tsc -b && vite build
npm run test:e2e   # end-to-end suite; needs a dev server already running
```

`stitch-frontEnd-draft/code.html` is the **original static mockup** the UI was designed from.
It is a reference artefact, not the app — no build step, no behaviour. Do not make changes
there expecting them to appear in the editor. `_bmad/`, `Claude Design/`, `Presets/` and
`Sample Projects/` are likewise supporting material rather than code.

## Stack

React 19 · TypeScript · Vite 7 · Zustand · Tailwind 4 · Three.js / @react-three/fiber ·
Theatre.js · Remotion (MP4 render) · ffmpeg.wasm (frame extraction) · Playwright (tests).

## Layout

| Zone | File | Role |
|------|------|------|
| Top nav | `editor/Layout.tsx` | Project name, export, save indicator, undo/redo |
| Left sidebar | `editor/LeftPanel.tsx` | Media, video pads, frame extractor, 3D scene presets |
| Centre viewport | `preview/Viewport.tsx` | The live preview; picks a renderer from `activePreset` |
| Right inspector | `editor/Inspector.tsx` | Keyframe values, easing, bezier editor |
| Bottom timeline | `editor/Timeline.tsx` | Transport, ruler, loop region, automation lanes |

`Timeline.tsx` is ~3,700 lines and holds most of the editor's interaction logic. Be aware
that some behaviour is implemented **twice** — the Scroll POS lane and the parameter lanes
have separate drawing implementations, and a fix to one usually needs applying to the other.

## State

`store/useStore.ts` (Zustand) is the single source of truth: keyframes, pads, transport
flags, selection, undo/redo history. Persistence lives in `utils/project.ts` (localStorage
autosave, `.shero` files) with media bytes in IndexedDB via `utils/mediaStore.ts`.

Two rules worth knowing:

- **Blob URLs are never durable.** They die with the document that minted them, so a saved
  project stores media in IndexedDB and re-mints URLs on load. Anything read back out of a
  saved project that starts with `blob:` is already dead.
- **Theatre does not own the clock.** `theatre/playhead.ts` does. Theatre clamps its own
  sequence position to a length fixed at project creation, which is unfixable from outside
  (`sequence.length` is not a setter, and a seeded length is ignored once Studio has saved
  state). Position is mirrored into Theatre only to keep the Studio UI in step.

## Testing

`tests/e2e/` drives the real app in a browser. There are no unit tests — most bugs here live
in pointer handling, z-order and persistence, none of which a type check catches.

**Every assertion must be confirmed to fail against the previous code before its fix lands.**
This has caught several tests that passed both before and after and proved nothing. See
`tests/README.md` for the traps specific to this app.

## Docs

- `docs/Feature-Requests.md` — running list from testing, what shipped and what is still open
- `docs/Scroll-Hero-Editor-Audit.md` — the codebase audit and its findings

## Conventions

- Tailwind 4 with a custom `editor.*` theme; accents: purple `#a855f7`, teal `#14b8a6`,
  orange `#f97316`, green `#22c55e`, blue `#3b82f6`; background `#0a0a0f`
- `data-purpose` attributes mark elements that tests and tooling target
- `<body>` carries `select-none`; text selection is disabled globally
