---
phase: 02-playhead-transport-and-motion-recording
plan: 05
subsystem: ui
tags: [theatre-js, react, svg, pointer-events, drag, keyframes, timeline]

# Dependency graph
requires:
  - phase: 02-playhead-transport-and-motion-recording
    plan: 04
    provides: keyframe dots rendered in Scroll POS SVG lane with position/value from __experimental_getKeyframes
provides:
  - Draggable keyframe circles on Scroll POS lane using pointer capture and studio.scrub()
  - onPointerDown/Move/Up handlers that move Theatre.js keyframes to new time positions
  - Dots refresh via __experimental_getKeyframes after scrub.commit() on release
affects: [phase-03-curves, phase-05-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - studio.scrub() for drag operations — batches writes into undoable group, replaces preview each frame
    - setPointerCapture on SVGCircleElement — routes all pointer events to the dragging circle even when cursor leaves it
    - e.stopPropagation() on SVG circle pointerDown — prevents lane playhead drag from firing during keyframe drag

key-files:
  created: []
  modified:
    - scroll-hero-editor/src/editor/Timeline.tsx

key-decisions:
  - "studio.scrub() preferred over studio.transaction for drag: scrub.capture() replaces the preview each call so no accumulating duplicate keyframes during move"
  - "draggingKfRef stores original kf.value at drag start — keeps the keyframe's scroll value constant while only changing its time position"
  - "SVG overflow: visible added so dots near lane edges are not clipped by the container"
  - "Circle radius increased from 4 to 6, stroke from 1 to 1.5 — larger hit target for precise drag initiation"

patterns-established:
  - "Pointer capture pattern: setPointerCapture on pointerDown so onPointerMove fires even if pointer leaves the SVG element"
  - "SVG coordinate conversion: (e.clientX - rect.left) / rect.width * VB_W to map from client to viewBox space when preserveAspectRatio=none"

requirements-completed: [REC-05]

# Metrics
duration: 5min
completed: 2026-03-09
---

# Phase 2 Plan 05: Draggable Keyframe Dots Summary

**Pointer-capture drag on Scroll POS SVG circles lets creators reposition recorded Theatre.js keyframes left/right using studio.scrub() with live preview and undo support**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-09T23:12:44Z
- **Completed:** 2026-03-09T23:17:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `import studio from '@theatre/studio'` to Timeline.tsx
- Added `draggingKfRef` to track scrub handle, keyframe value, and SVG element during drag
- Implemented onPointerDown/Move/Up handlers with setPointerCapture on each keyframe circle
- Used `studio.scrub()` so each drag frame replaces (not accumulates) the preview keyframe, enabling clean undo
- Dots refresh from `__experimental_getKeyframes` on release so the circle appears at its new committed position
- SVG gets `overflow: visible` to prevent edge clipping; circle radius enlarged for easier grab

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pointer-capture drag handlers to Scroll POS keyframe dots** - `faa317c` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `scroll-hero-editor/src/editor/Timeline.tsx` - studio import, draggingKfRef, pointer event handlers on keyframe circles

## Decisions Made
- Used `studio.scrub()` over `studio.transaction` because scrub replaces the in-progress preview on each `capture()` call, preventing duplicate keyframes from accumulating during a drag
- Stored `kf.value` at drag start so the scroll progress value is pinned while only time position changes
- `e.stopPropagation()` on pointerDown prevents the lane's `handleLanesMouseDown` from interpreting the keyframe drag as a playhead seek

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- REC-05 satisfied: full motion-capture-to-edit workflow complete (record → bezier curve → draggable dots)
- Phase 2 recording pipeline is fully done — all 5 plans complete
- Phase 3 (Curves/Easing editor) and Phase 4 (Video) can now proceed

## Self-Check: PASSED

All files found. All commits verified.

---
*Phase: 02-playhead-transport-and-motion-recording*
*Completed: 2026-03-09*
