---
phase: 02-playhead-transport-and-motion-recording
plan: "04"
subsystem: ui
tags: [theatre-js, recording, keyframes, bezier, react, zustand, typescript]

# Dependency graph
requires:
  - phase: 02-01
    provides: recordStartPosition store field, isRecording/setIsRecording, setSceneProgress
  - phase: 02-02
    provides: scrub handle drag that triggers mousemove in RecordMode
  - phase: 02-03
    provides: scrollControlsObj.props.position sequenced in state.json, seekTo function, SEQUENCE_DURATION

provides:
  - "studio.transaction keyframe write on scrub mousemove when isRecording && isPlaying (REC-02)"
  - "Pre-record position saved on arm, restored via seekTo on stop (REC-03)"
  - "Scroll POS lane label shows purple ring highlight when isRecording (REC-01 visual)"
  - "Stop button ends recording and restores pre-record position (REC-03)"
  - "keyframeDots state refreshed from __experimental_getKeyframes after recording/playback ends (REC-04)"
  - "Purple cubic bezier SVG path connecting recorded keyframe dots on Scroll POS lane (TL-01)"
  - "SVG circle dot elements for each recorded keyframe on the Scroll POS lane"
affects: [03-curves, export-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "studio.transaction({ set }) pattern for writing Theatre.js keyframes at current sequence position"
    - "__experimental_getKeyframes(prop) for reading committed keyframes back from sequence"
    - "Catmull-Rom approximation via cubic bezier C commands for smooth SVG curve between keyframe dots"
    - "Refresh keyframe display on isPlaying/isRecording transition (not live poll)"

key-files:
  created: []
  modified:
    - scroll-hero-editor/src/preview/RecordMode.tsx
    - scroll-hero-editor/src/editor/Timeline.tsx

key-decisions:
  - "Keyframe write guard: only call studio.transaction when BOTH isRecording AND isPlaying are true — avoids spurious writes on arm/drag without transport running"
  - "Keyframe dot refresh triggered by isPlaying + isRecording transition (useEffect deps), not a live poll — Theatre.js commits keyframes before the effect fires"
  - "__experimental_getKeyframes cast as any[] to handle missing TypeScript typings for experimental API"
  - "Bezier curve uses horizontal control point pull (dx/3) approximation — visually smooth without full Catmull-Rom tangent computation"

patterns-established:
  - "Pattern: isRecording && isPlaying guard inside mousemove handler prevents keyframe spam during scrub-only mode"
  - "Pattern: bezier curve rendered before dots so dots appear on top in SVG paint order"

requirements-completed: [REC-01, REC-02, REC-03, REC-04, TL-01]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 2 Plan 04: Recording Pipeline — Keyframe Write + Bezier Curve Rendering Summary

**Theatre.js studio.transaction keyframe recording wired to scrub mousemove, with pre-record position restore on Stop and purple bezier curve + dot rendering on the Scroll POS timeline lane**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T23:07:50Z
- **Completed:** 2026-03-09T23:09:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- RecordMode now calls `studio.transaction({ set })` on each mousemove frame when both `isRecording` and `isPlaying` are true, writing a Theatre.js keyframe at the current sequence position (REC-02)
- `toggleRecording` saves `sheet.sequence.position / SEQUENCE_DURATION` into `recordStartPosition` on arm, and calls `seekTo(recordStartPosition)` on disarm — Stop button also restores this position (REC-03)
- Scroll POS lane label shows `ring-1 ring-inset ring-editor-accent-purple/60 bg-editor-accent-purple/10` highlight when `isRecording` (REC-01)
- `keyframeDots` state refreshed from `sheet.sequence.__experimental_getKeyframes(scrollControlsObj.props.position)` whenever `isPlaying` or `isRecording` changes (REC-04)
- Purple cubic bezier SVG `<path>` drawn across sorted keyframe dots using `C dx/3` control point approximation (TL-01)
- SVG `<circle>` elements with purple fill and white stroke rendered for each keyframe dot on top of the curve

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Arm Record with pre-record position save and Stop restore** - `17718dc` (feat)
2. **Task 2: Write Theatre.js keyframes in RecordMode, render bezier curve and dots on Scroll POS lane** - `b6ee843` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `scroll-hero-editor/src/preview/RecordMode.tsx` - Added studio + scrollControlsObj imports, isPlaying selector, keyframe write guard in handleMouseMove
- `scroll-hero-editor/src/editor/Timeline.tsx` - Added scrollControlsObj import, recordStartPosition/setRecordStartPosition selectors, updated toggleRecording, updated Stop button, Scroll POS lane label purple ring, keyframeDots state + useEffect, bezier curve path + dot circle rendering

## Decisions Made
- Keyframe write guard uses `isRecording && isPlaying` — scrubbing while paused arms but does not pollute the sequence
- `__experimental_getKeyframes` result cast as `any[]` — the API lacks complete TypeScript typings and casting was the documented approach in plan interfaces
- Bezier control points computed as `prev.x + dx/3` and `curr.x - dx/3` — simple and visually smooth horizontal tension approximation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript passed with zero errors on first compile after each task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full recording pipeline is complete: arm → play → drag scrub → keyframe writes → stop → restore position → curve + dots visible on lane
- Phase 3 (Curves) can now read and refine the keyframe data written by this pipeline
- Export pipeline (Phase 5) will read the same Theatre.js sequence state populated here

---
*Phase: 02-playhead-transport-and-motion-recording*
*Completed: 2026-03-09*
