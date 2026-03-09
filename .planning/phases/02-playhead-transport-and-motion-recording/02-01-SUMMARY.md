---
phase: 02-playhead-transport-and-motion-recording
plan: 01
subsystem: ui
tags: [react, zustand, three.js, theatre.js, typescript, scene-adapter]

# Dependency graph
requires:
  - phase: 01-live-scene-preview
    provides: GithubTestParticleField, useStore, TheatreSync, Viewport with letterbox/fullscreen

provides:
  - SceneAdapter interface with OrbitAdapter and ClassicAdapter implementations
  - useStore extended with isLoop, recordStartPosition, activeAdapter, setSceneProgress
  - Unified setSceneProgress action (drives adapter + Zustand bridge in one call)
  - TheatreSync wired to call setSceneProgress from onValuesChange
  - Viewport with styled PROGRESS overlay (0.000 format) replacing DEBUG label
  - GithubTestParticleField progress prop driving uAssemble uniform externally

affects:
  - 02-02 (scrub handle — calls setSceneProgress)
  - 02-03 (transport loop — uses isLoop, setSceneProgress)
  - 02-04 (motion recording — uses recordStartPosition, setSceneProgress)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SceneAdapter pattern: preset-agnostic interface for driving visual progress from 0-1 scrub value"
    - "Unified setSceneProgress: single action drives both adapter and Zustand bridge, avoiding dual-call sites"
    - "progress prop on Three.js component: external control overrides internal timer-based uAssemble animation"

key-files:
  created:
    - scroll-hero-editor/src/preview/SceneAdapter.ts
  modified:
    - scroll-hero-editor/src/store/useStore.ts
    - scroll-hero-editor/src/theatre/TheatreSync.tsx
    - scroll-hero-editor/src/preview/Viewport.tsx
    - scroll-hero-editor/src/presets/ParticleLab/GithubTest/GithubTestParticleField.tsx

key-decisions:
  - "OrbitAdapter setProgress is a pass-through no-op callback in Viewport — scrollProgress in Zustand already drives the progress prop on GithubTestParticleField; the adapter contract is satisfied and downstream plans can call setSceneProgress without knowing the implementation"
  - "GithubTestParticleField progress prop: when provided, overrides internal time-based uAssemble animation; when absent, falls back to intro animation (backward-compatible)"
  - "isLoop added to TheatreSync read path now so Plan 03's diff is a single-line wire-up, not a new import"

patterns-established:
  - "SceneAdapter pattern: all transport/scrub plans call useStore.getState().setSceneProgress(p) — never touch adapters directly"
  - "Adapter mount/unmount in Viewport useEffect returning setActiveAdapter(null) — prevents stale adapter after preset switch"

requirements-completed: [PROG-01, PROG-02]

# Metrics
duration: 8min
completed: 2026-03-09
---

# Phase 2 Plan 01: SceneAdapter Contract and Progress Overlay Summary

**SceneAdapter interface with OrbitAdapter/ClassicAdapter, unified setSceneProgress action in Zustand, and styled numeric PROGRESS overlay replacing the DEBUG label in Viewport**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-09T03:37:02Z
- **Completed:** 2026-03-09T03:45:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `SceneAdapter.ts` with interface, `OrbitAdapter` (callback-based), and `ClassicAdapter` (iframe postMessage)
- Extended useStore with 4 new fields: `isLoop`, `recordStartPosition`, `activeAdapter`, `setSceneProgress` — all additive, no existing fields touched
- `setSceneProgress` is the single unified path: calls `activeAdapter?.setProgress(p)` then `set({ scrollProgress: p })`
- TheatreSync `onValuesChange` now calls `setSceneProgress` instead of `setScrollProgress` directly
- Viewport mounts correct adapter on `activePreset` change via `useEffect`, cleans up on unmount
- `GithubTestParticleField` accepts optional `progress` prop that drives `uAssemble` uniform when provided (overrides internal timer)
- DEBUG overlay replaced with styled PROGRESS readout: purple `0.000` numeral + grey `PROGRESS` label

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SceneAdapter contract and extend Zustand store** - `a8d7a82` (feat)
2. **Task 2: Wire SceneAdapter into TheatreSync and upgrade Viewport progress overlay** - `c6e6480` (feat)

## Files Created/Modified
- `scroll-hero-editor/src/preview/SceneAdapter.ts` — SceneAdapter interface, OrbitAdapter, ClassicAdapter
- `scroll-hero-editor/src/store/useStore.ts` — Added isLoop, recordStartPosition, activeAdapter, setSceneProgress; added `get` param to factory
- `scroll-hero-editor/src/theatre/TheatreSync.tsx` — onValuesChange now calls setSceneProgress; isLoop read for Plan 03
- `scroll-hero-editor/src/preview/Viewport.tsx` — Adapter wiring useEffect, iframe ref, styled PROGRESS overlay
- `scroll-hero-editor/src/presets/ParticleLab/GithubTest/GithubTestParticleField.tsx` — Added optional `progress` prop driving uAssemble

## Decisions Made
- OrbitAdapter's `setProgress` callback is intentionally a no-op in Viewport: scrollProgress is already updated by `setSceneProgress` inside Zustand, and `GithubTestParticleField` reads it directly via the `progress` prop. The adapter contract is satisfied without a redundant state write.
- `progress` prop on GithubTestParticleField is optional and backward-compatible: existing usages without the prop continue to use the internal time-based intro animation.
- `isLoop` imported in TheatreSync now so Plan 03 only needs a one-line wire-up, not a new import chain.

## Deviations from Plan

None - plan executed exactly as written. The note in Task 2 about simplifying OrbitAdapter (not reverse-engineering Three.js shader internals) was followed — the adapter contract is fulfilled and the progress overlay is the critical PROG-02 deliverable.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `setSceneProgress` is live and callable from any plan in Phase 2
- Plans 02-02 (scrub handle), 02-03 (transport loop), and 02-04 (recording) can all proceed — they all converge on `setSceneProgress`
- `isLoop` field is in the store and read in TheatreSync, ready for Plan 02-03 wiring
- No blockers

---
*Phase: 02-playhead-transport-and-motion-recording*
*Completed: 2026-03-09*

## Self-Check: PASSED

All files confirmed present on disk. All task commits confirmed in git history.
