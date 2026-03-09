---
phase: 02-playhead-transport-and-motion-recording
plan: "03"
subsystem: theatre-transport
tags: [theatre-js, transport, loop, playhead, recording]
dependency_graph:
  requires: [02-01]
  provides: [TL-01, TL-02, TL-03, TL-04, TL-05, TL-06]
  affects: [TheatreSync, Timeline, core]
tech_stack:
  added: []
  patterns:
    - Theatre.js onChange for reactive position display
    - Pre-seeded state.json for sequenced prop on fresh session
    - studio.initialize() in DEV for transaction-based recording
key_files:
  created:
    - scroll-hero-editor/src/theatre/state.json
  modified:
    - scroll-hero-editor/src/theatre/core.ts
    - scroll-hero-editor/src/theatre/TheatreSync.tsx
    - scroll-hero-editor/src/editor/Timeline.tsx
    - scroll-hero-editor/tsconfig.app.json
decisions:
  - "resolveJsonModule: true added to tsconfig for JSON import type-checking (Vite handles runtime)"
  - "seekTo updated to call setSceneProgress (not setScrollProgress) so adapter is driven on all scrubs including range slider"
  - "progressFromClientX retains scroll-aware formula (clientX - rect.left + el.scrollLeft - LABEL_W) for correct position when zoomed/scrolled"
metrics:
  duration: "3 min"
  completed: "2026-03-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
---

# Phase 2 Plan 03: Theatre.js Transport Fixes Summary

Pre-seeded Theatre.js state JSON so position is sequenced from fresh load, wired Loop toggle into TheatreSync RAF tick and Timeline button, fixed Stop to halt-not-rewind, made transport TIME display reactive via onChange, and updated seekTo to drive the scene adapter on all scrubs.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create state.json + update core.ts with pre-seeded sequenced position | 2100369 | state.json, core.ts, tsconfig.app.json |
| 2 | Fix TheatreSync loop, Timeline Stop/Loop/time-display/playhead drag | 9f2ce00 | TheatreSync.tsx, Timeline.tsx |

## What Was Built

### Task 1: state.json + core.ts
- `state.json` — minimal Theatre.js project state with `Scroll Controls / position` as a `BasicKeyframedTrack` (empty keyframes array). This means on fresh browser session the position prop is already sequenced: `studio.transaction` will write keyframe dots, not static overrides.
- `core.ts` — `getProject('Scroll Hero Editor', { state: projectState })` loads the pre-seeded state; `studio.initialize()` called in `DEV` guard so the Theatre.js Studio overlay is available for recording.
- `tsconfig.app.json` — `resolveJsonModule: true` added so TypeScript resolves the JSON import.

### Task 2: Transport / playhead fixes
- **TheatreSync RAF loop** — end-of-sequence branch checks `isLoop`: if true, resets `sheet.sequence.position = 0`, calls `setSceneProgress(0)`, resets `lastTime`, and re-requests a frame (continuous loop). If false, stops at `SEQUENCE_DURATION` and calls `setIsPlaying(false)`. `isLoop` added to `useEffect` deps array.
- **Timeline Stop button** — removed `seekTo(0)` call; now only calls `setIsPlaying(false)`, halting playhead at current position.
- **Timeline Loop button** — `onClick={() => setIsLoop(!isLoop)}`; className switches to `text-editor-accent-purple` when `isLoop` is true.
- **Timeline TIME display** — `seqTime` state initialised from `sheet.sequence.position`; `useEffect` subscribes via `onChange(sheet.sequence.pointer.position, pos => setSeqTime(pos))` and returns the unsub. Display reads `seqTime` — fires every frame during playback and on all scrubs.
- **seekTo updated** — now calls `setSceneProgress(progress)` instead of `setScrollProgress(progress)`, so the active adapter (`OrbitAdapter.setProgress`) is driven on all scrub events (range slider, playhead drag, and click in lanes area).

## Deviations from Plan

None — plan executed exactly as written, with one minor noted decision: `progressFromClientX` retains its scroll-aware formula (`el.scrollLeft` term) for correct position when the timeline is zoomed and horizontally scrolled. The plan formula excerpt omitted `scrollLeft` but it is needed for zoomed layouts.

## Verification

- `state.json` contains "Scroll Controls" → "position" as `BasicKeyframedTrack`
- `core.ts` passes `{ state: projectState }` to `getProject` and calls `studio.initialize()` in DEV
- `TheatreSync` loop branch sets position to 0 + `setSceneProgress(0)` when `isLoop` is true
- `Timeline` Stop button calls only `setIsPlaying(false)` (no `seekTo(0)`)
- `Timeline` Loop button turns purple (`text-editor-accent-purple`) when active
- `Timeline` TIME display reads `seqTime` state updated by `onChange`
- `seekTo` calls `setSceneProgress` — drives both scrollProgress and activeAdapter
- `npx tsc --noEmit` exits 0

## Self-Check: PASSED

All created/modified files confirmed on disk. All commits confirmed in git log.
