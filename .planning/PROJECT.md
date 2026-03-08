# Music-Reactive Scroll Hero Editor

## What This Is

A DAW-style web editor that lets creators choreograph scroll-driven webpage heroes. Creators import an AI-generated video clip (Seedance, Kling, Veo3) or select a built-in Three.js particle preset, then use a Theatre.js timeline to record live scroll motions, draw automation curves, and optionally sync to an audio track. The output is a standalone HTML file where real page scroll — mapped through their saved curves — drives ScrollyVideo.js or a particle scene, exactly as performed.

Inspired by the "AI Video + Claude Code = Scrollable Web Hero" technique, extended into a full interactive editor with Theatre.js automation lanes, audio sync, and live input recording.

## Core Value

Turning ephemeral scrubbing into editable, music-synced scroll hero code — capturing what DaVinci Resolve cannot: live scroll/jog motion recorded as reusable automation keyframes.

## Requirements

### Validated

<!-- Shipped and confirmed valuable from existing scaffold -->

- ✓ Project scaffolded: React 19 + TypeScript strict + Vite 7 + Tailwind v4 — existing
- ✓ Tailwind v4 custom theme in `src/index.css` with `editor-*` colour tokens — existing
- ✓ Zustand store at `src/store/useStore.ts` with flat key+setter shape — existing
- ✓ 5-zone layout shell (Layout, LeftPanel, Inspector, Timeline, Viewport) component files created — existing
- ✓ Theatre.js core integration (`src/theatre/core.ts`, `TheatreSync.tsx`) scaffolded — existing
- ✓ `frameLoader` package present at `src/packages/frameLoader.ts` — existing
- ✓ `useKickDrumData` hook present at `src/packages/useKickDrumData.ts` (deferred, not wired) — existing
- ✓ ScrollyVideoPlayer, GhostTrailCanvas, RecordMode component files created — existing

### Active

<!-- Epics 1–5: what needs to actually be built and wired up -->

- [ ] Epic 1: Live Scene Preview — Orbit/Classic particle presets render in viewport; left panel preset switcher; aspect ratio + fullscreen controls
- [ ] Epic 2: Playhead Control & Live Motion Recording — `setProgress()` interface; Theatre.js timeline + Scroll Progress lane; transport bar (Play/Stop/Loop); viewport scrub handle + progress overlay; arm record → Theatre.js keyframe capture; recorded curve playback + edit
- [ ] Epic 3: Curve Editing & Multi-Lane Parameters — scene parameter lanes (Rotation Speed, Depth, Size); CSS Opacity lane; right inspector (lane defaults + keyframe easing picker with bezier)
- [ ] Epic 4: Frame Sequence Video Hero — Assets panel + MP4 upload; ffmpeg WASM Web Worker frame extraction; PNG frames as THREE.Texture[] via frameLoader; FrameSequenceScene with setProgress()
- [ ] Epic 5: Export Standalone Scroll Hero — Export Theatre.js JSON (curves.json); export particle scene HTML; export video hero HTML (ScrollyVideo.js runtime + GSAP)

### Out of Scope

- Audio lane / beat markers / BPM display — deferred to v2 (useKickDrumData already scaffolded)
- Multi-layer blending / compositing — v1 is single active scene only
- MP4 bake (render to video) — v2
- SSR / server-side execution — browser-only, hard constraint
- Remotion — explicitly rejected (incompatible output model)
- n8n integration — not applicable
- OAuth / user accounts — local editor only

## Context

**Static prototype:** `stitch-frontEnd-draft/code.html` — reference design with full visual layout; no real interactivity. Used as the visual spec for building the React app.

**React app under construction:** `scroll-hero-editor/` — Vite project with component shells and Theatre.js core integration already in place. Key deps not yet installed: `@theatre/studio`, `@theatre/r3f`, `@react-three/fiber`, `three`, `gsap`.

**Reuse from existing project:** `frameLoader` and `useKickDrumData` are already copied in. The particle-lab-package presets (GithubTestParticleField + TouchTexture for Orbit; iframe for Classic) must be copied into `src/presets/ParticleLab/`.

**Editor preview vs. export split:** Editor uses PNG frame sequences (smooth random-access scrub via THREE.Texture[]); export uses ScrollyVideo.js (compact ~10KB runtime with perfect reverse support). This is a key architectural decision.

**Theatre.js Studio is dev-only** — strips to @theatre/core runtime in the export bundle.

## Constraints

- **Tech stack**: Theatre.js + ScrollyVideo.js (export) + GSAP ScrollTrigger (CSS in export) + R3F + Three.js + React + Tailwind v4 — fixed, do not substitute
- **Browser-only**: No SSR, no Node.js runtime in output; ffmpeg WASM runs in Web Worker
- **TypeScript strict**: `noUnusedLocals`, `erasableSyntaxOnly`, `verbatimModuleSyntax` enforced; no `any`, no `enum`
- **Tailwind v4**: Config in `src/index.css @theme {}` only — no tailwind.config.js
- **Zustand**: Single flat store, always use selectors, no async logic in store
- **Single audio track**: v1 only; audio sync deferred to v2

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Theatre.js over custom curve editor | Built-in keyframe UI, recording, bezier handles | — Pending |
| PNG frames for editor preview | Smooth random-access scrub; no keyframe decoder dependency | — Pending |
| ScrollyVideo.js for export | Compact runtime (~10KB), handles reverse perfectly with pre-recorded curves | — Pending |
| ffmpeg WASM in Web Worker | Non-blocking frame extraction; no server required | — Pending |
| R3F + @theatre/r3f for Three.js | Mouse events work inside viewport; Theatre.js records them simultaneously | — Pending |
| Reject Remotion | Output is scroll-driven HTML, not MP4; incompatible primary axis | ✓ Good |

---
*Last updated: 2026-03-08 after initialization*
