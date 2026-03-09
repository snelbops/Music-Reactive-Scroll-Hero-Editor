---
phase: 01-live-scene-preview
plan: 03
subsystem: ui
tags: [react, zustand, typescript, aspect-ratio, letterbox, fullscreen, viewport]

# Dependency graph
requires:
  - phase: 01-02
    provides: aspectRatio/setAspectRatio/isFullscreen/setIsFullscreen in useStore; Viewport with conditional Canvas/iframe renderer

provides:
  - Four interactive ratio buttons (16:9, 9:16, 1:1, free) in Viewport toolbar wired to setAspectRatio
  - CSS aspect-ratio letterbox stage div constraining Canvas/iframe to selected ratio
  - Maximize button in Viewport wired to setIsFullscreen(true)
  - Fullscreen guard in Layout rendering fixed inset-0 overlay with Viewport only
  - Escape key handler in Layout exiting fullscreen
  - Minimize2 exit button in fullscreen corner

affects: [01-live-scene-preview, 02-recording-playback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS aspect-ratio property for letterboxing: outer div is flex centre, inner div uses aspectRatio style + maxWidth/maxHeight to constrain within available space"
    - "Fullscreen guard pattern: early return with fixed inset-0 overlay before normal JSX return"
    - "Escape key handler via useEffect with document.addEventListener/removeEventListener cleanup"

key-files:
  created: []
  modified:
    - scroll-hero-editor/src/preview/Viewport.tsx
    - scroll-hero-editor/src/editor/Layout.tsx

key-decisions:
  - "RATIO_VALUES map defined at module level (outside component) as a const to avoid re-creation on each render"
  - "Scroll Progress Bar kept in outer preview div, not inside letterbox stage, so it always stays anchored to viewport edge regardless of ratio"
  - "isRecording ring moved to the letterbox inner div (the stage) rather than the outer area for correct visual containment"

patterns-established:
  - "Letterbox pattern: outer flex-center div + inner div with CSS aspect-ratio + maxWidth/maxHeight 100%"
  - "Fullscreen guard: if (isFullscreen) return fixed overlay before normal layout return"

requirements-completed: [PREV-04, PREV-05]

# Metrics
duration: 30min
completed: 2026-03-09
---

# Phase 1 Plan 03: Aspect Ratio Letterbox and Fullscreen Toggle Summary

**CSS aspect-ratio letterbox with four ratio buttons (16:9, 9:16, 1:1, free) in Viewport toolbar, plus a fullscreen overlay guard in Layout with Escape and Minimize2 exit**

## Performance

- **Duration:** 30 min
- **Started:** 2026-03-09T12:50:21Z
- **Completed:** 2026-03-09T13:19:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Viewport toolbar Ratio section replaced from one static button to four interactive ratio buttons; active button gets accent-purple highlight, inactive gets hover treatment; clicking immediately updates Zustand aspectRatio state
- Letterbox stage container added in Viewport preview area using CSS `aspect-ratio` property derived from RATIO_VALUES map; free mode fills all space, other ratios constrain to correct proportions with auto letterbox bars
- Maximize button wired to setIsFullscreen(true)
- Layout.tsx extended with useEffect Escape key handler and an isFullscreen guard that renders a fixed inset-0 overlay containing only the Viewport plus a Minimize2 exit button
- TypeScript exits 0 after all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add aspect ratio letterbox container to Viewport (PREV-04)** - `3883437` (feat)
2. **Task 2: Add fullscreen overlay guard and Escape key handler to Layout (PREV-05)** - `88a0ed7` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `scroll-hero-editor/src/preview/Viewport.tsx` - Added RATIO_VALUES map, four ratio buttons wired to setAspectRatio, letterbox stage div with dynamic aspect-ratio style, Maximize button wired to setIsFullscreen
- `scroll-hero-editor/src/editor/Layout.tsx` - Added isFullscreen guard (fixed overlay with Viewport + Minimize2 button), Escape key handler via useEffect

## Decisions Made

- RATIO_VALUES const placed at module level outside the component to avoid object re-creation on every render
- Scroll Progress Bar stays in the outer preview div rather than inside the letterbox stage, so it is always anchored to the right edge of the full viewport regardless of the selected ratio
- isRecording ring moved to the letterbox inner div so the red highlight wraps exactly the constrained stage area

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PREV-04 (aspect ratio letterbox) and PREV-05 (fullscreen toggle) both implemented
- Particle canvas (Orbit) and Classic iframe continue rendering correctly inside the letterbox at all ratios
- Human verification needed: click ratio buttons in browser to confirm letterboxing, click Maximize and press Escape to confirm fullscreen behavior
- TypeScript clean (npx tsc --noEmit exits 0)

## Self-Check: PASSED

- FOUND: scroll-hero-editor/src/preview/Viewport.tsx
- FOUND: scroll-hero-editor/src/editor/Layout.tsx
- FOUND commit: 3883437 (Task 1)
- FOUND commit: 88a0ed7 (Task 2)

---
*Phase: 01-live-scene-preview*
*Completed: 2026-03-09*
