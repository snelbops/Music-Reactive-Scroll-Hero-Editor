# Project Memory — Music-Reactive Scroll Hero Editor

## GitHub
https://github.com/snelbops/Music-Reactive-Scroll-Hero-Editor

## Key Docs
- `docs/architecture.md` — core architecture, progress interface, tech stack decisions
- `docs/ux-design.md` — 5-zone layout, lanes, style tokens
- `_bmad-output/planning-artifacts/prd.md` — PRD with unique value statement
- `_bmad-output/planning-artifacts/epics.md` — 5 epics, 20 stories, all validated

## Scroll Keyframe System
See `memory/project_scroll_keyframes.md` — custom automation system, recording, overdub, UI resize, countdown, all committed to main.

## Build Status
**Phase 1 (live-scene-preview): COMPLETE** — 3 plans executed, pushed to GitHub

### Phase 1 Delivered
- `src/presets/ParticleLab/` — GithubTestParticleField (R3F orbit) + TouchTexture + barrel index
- `public/github-test-app/` — Classic preset static bundle (5 sample PNGs)
- Zustand store: `activePreset`, `aspectRatio`, `isFullscreen` state
- LeftPanel: interactive Orbit/Classic preset switcher
- Viewport: conditional R3F Canvas (orbit) / iframe (classic) renderer
- Aspect ratio letterbox (16:9, 9:16, 1:1, free) — height:100% + width:auto pattern
- Fullscreen overlay via Layout guard — `fixed inset-0 flex` container required for flex-1 to work
- `useKickDrumData.ts` annotated as deferred (v2)

### Known Fixes Applied Post-Checkpoint
- Fullscreen container needs `flex` class so Viewport's `flex-1 main` expands correctly
- Letterbox stage must use `height:100%; width:auto` (not undefined) so `aspect-ratio` CSS has a base dimension

### Phase 2 — next
Playhead control + live motion recording

## Core Architecture (CRITICAL)
- Everything centres on a `progress` value (0–1) via `setProgress(p: number)`
- Theatre.js owns progress in the editor; GSAP ScrollTrigger maps real scroll in export
- Two scene types: R3F (particle preset) and FrameSequence (PNG frames)
- Editor uses PNG frames for smooth scrubbing; export uses ScrollyVideo.js

## Tech Stack
Theatre.js + React Three Fiber + Three.js + ScrollyVideo.js (export) + GSAP (CSS export) + ffmpeg WASM (frame extraction) + React + Tailwind + Vite

## Epic Summary (20 stories)
- Epic 1 (4 stories): Editor shell + particle preset in viewport
- Epic 2 (6 stories): Playhead control + live motion recording
- Epic 3 (3 stories): Curve editing + multi-lane parameters
- Epic 4 (3 stories): MP4 → PNG frames → frame sequence scene
- Epic 5 (4 stories): Export standalone scroll hero HTML

## Presets
- `Presets/particle-lab-package/` — Orbit (R3F GLSL) + Classic (iframe) presets
- First story (1.1) copies this into `src/presets/ParticleLab/`

## Key Decisions
- PNG frames in editor (smooth random-access scrub), ScrollyVideo.js in export
- GIF not suitable (256 colour limit)
- No Remotion, no SSR
- Audio (useKickDrumData) deferred to v2
- ffmpeg WASM runs in Web Worker (non-blocking)
