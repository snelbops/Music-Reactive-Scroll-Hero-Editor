---
phase: 02-playhead-transport-and-motion-recording
plan: 02
subsystem: ui
tags: [react, theatre-js, pointer-capture, zustand, scrub-handle]

# Dependency graph
requires:
  - phase: 02-01
    provides: setSceneProgress in Zustand + SceneAdapter contract
provides:
  - Interactive viewport scrub handle with pointer capture drag (PROG-03, PROG-04)
  - Theatre.js sequence.position updated during drag (immediate playhead snap)
affects: [02-03, 02-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pointer capture pattern: setPointerCapture on pointerdown for drag-outside-bounds safety"
    - "Dual update on drag: sheet.sequence.position (Theatre.js) + setSceneProgress (Zustand) in single handler"

key-files:
  created: []
  modified:
    - scroll-hero-editor/src/preview/Viewport.tsx

key-decisions:
  - "onPointerUp is a no-op: Theatre.js position already snapped during last onPointerMove, no extra work on release"
  - "transition-all removed from fill bar: smooth CSS transition conflicts with real-time 60fps scrub responsiveness"
  - "z-index raised from z-20 to z-30: receives events above letterbox but below RecordMode overlay (z-50)"
  - "cursor-ns-resize applied to entire track div (1px wide + extended hit area via thumb), not just thumb"

patterns-established:
  - "Pointer capture: onPointerDown calls setPointerCapture(pointerId), onPointerMove guards with (e.buttons & 1)"
  - "Progress clamping: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))"

requirements-completed: [PROG-03, PROG-04]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 2 Plan 02: Viewport Scrub Handle Summary

**Interactive right-side scrub bar with pointer capture — drag to set Theatre.js sequence position and Zustand progress simultaneously**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T23:01:50Z
- **Completed:** 2026-03-09T23:02:49Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Scrub handle track div wired with `onPointerDown/Move/Up` using React pointer events
- `setPointerCapture` ensures drag remains captured even when the pointer leaves the 1px-wide bar
- `onPointerMove` clamps progress [0,1] from vertical position, updates `sheet.sequence.position` for Theatre.js playhead snap and calls `setSceneProgress` for Zustand state
- `transition-all` removed from fill bar so progress overlay updates in real time without animation lag
- z-index raised to z-30; `cursor-ns-resize` provides clear vertical-drag affordance

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire pointer capture drag on viewport scrub handle** - `6929089` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `scroll-hero-editor/src/preview/Viewport.tsx` - Added trackRef, setSceneProgress selector, three pointer event handlers (onPointerDown/Move/Up), applied to scrub track div with z-30 and cursor-ns-resize; removed transition-all from fill bar

## Decisions Made
- `onPointerUp` is a no-op: Theatre.js `sheet.sequence.position` is already updated during `onPointerMove` for every pointer position, so release requires no additional synchronization
- `transition-all` removed from fill bar to eliminate CSS interpolation delay during real-time scrubbing
- z-index raised from z-20 to z-30 so the track receives pointer events above the letterbox stage content but remains below the RecordMode overlay at z-50

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript passed on first attempt with zero errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PROG-03 (drag to set progress) and PROG-04 (Theatre.js playhead snap on drag) are complete
- Plan 02-03 (transport controls) and 02-04 (motion recording) can proceed
- Scrub handle is fully functional — the progress overlay readout at top-left updates live while dragging

---
*Phase: 02-playhead-transport-and-motion-recording*
*Completed: 2026-03-09*

## Self-Check: PASSED

- FOUND: scroll-hero-editor/src/preview/Viewport.tsx
- FOUND: .planning/phases/02-playhead-transport-and-motion-recording/02-02-SUMMARY.md
- FOUND: commit 6929089
