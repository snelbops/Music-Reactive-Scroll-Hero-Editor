---
phase: 01-live-scene-preview
plan: 02
subsystem: ui
tags: [react-three-fiber, zustand, typescript, preset-switching, r3f, canvas, iframe]

# Dependency graph
requires:
  - phase: 01-01
    provides: GithubTestParticleField.tsx + TouchTexture.ts in src/presets/ParticleLab/, Classic preset bundle at public/github-test-app/
provides:
  - activePreset (default 'orbit'), setActivePreset, aspectRatio, setAspectRatio, isFullscreen, setIsFullscreen in useStore
  - LeftPanel preset cards wired to setActivePreset (Orbit/Classic buttons)
  - Viewport conditional renderer: R3F Canvas (Orbit) / iframe (Classic) driven by activePreset
affects: [01-live-scene-preview, 02-recording-playback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand union string literals for PresetId and AspectRatio (no enum, erasableSyntaxOnly compliant)"
    - "Conditional R3F Canvas vs iframe render pattern driven by Zustand activePreset"
    - "Preset card active/inactive styling: accent-purple highlight vs white/10 border"

key-files:
  created: []
  modified:
    - scroll-hero-editor/src/store/useStore.ts
    - scroll-hero-editor/src/editor/LeftPanel.tsx
    - scroll-hero-editor/src/preview/Viewport.tsx

key-decisions:
  - "Remove ScrollyVideoPlayer from Viewport centre — it belongs in Phase 4; R3F Canvas takes its place for Orbit preset"
  - "Remove CHOREOGRAPHED MOMENTS placeholder overlay — replaced by live R3F particle canvas"
  - "isRecording ring moved from inner glass-panel to the stage div for correct overlay behaviour"
  - "debug overlay gets pointer-events-none to avoid blocking mouse events in RecordMode"

patterns-established:
  - "Preset selection pattern: map over ('orbit' | 'classic') tuple with as const for type-safe button rendering"
  - "Store extension pattern: additive edits only — never replace existing keys, only append"

requirements-completed: [PREV-01, PREV-02, PREV-03]

# Metrics
duration: 10min
completed: 2026-03-09
---

# Phase 1 Plan 02: Wire Preset Switcher Summary

**Zustand store extended with activePreset/aspectRatio/isFullscreen; LeftPanel Orbit/Classic buttons wired to setActivePreset; Viewport renders R3F Canvas (GithubTestParticleField) for Orbit and iframe for Classic, driven by store state**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-09T11:02:57Z
- **Completed:** 2026-03-09T12:12:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- useStore extended with PresetId/AspectRatio union types (no enum, erasableSyntaxOnly safe) and six new keys: activePreset (default 'orbit'), setActivePreset, aspectRatio (default '16:9'), setAspectRatio, isFullscreen, setIsFullscreen
- LeftPanel static Parallax/Sticky cards replaced with interactive Orbit/Classic button array; active card gets accent-purple highlight, inactive gets standard hover treatment
- Viewport preview area replaced: R3F Canvas with GithubTestParticleField renders on load (Orbit), iframe to /github-test-app/index.html renders when Classic selected; CHOREOGRAPHED MOMENTS placeholder removed; ScrollyVideoPlayer removed (deferred to Phase 4)
- npx tsc --noEmit exits 0 after all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Zustand store with preset, aspect ratio, and fullscreen state** - `7df4e2b` (feat)
2. **Task 2: Wire LeftPanel preset cards and replace Viewport centre with conditional renderer** - `d60fcd8` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `scroll-hero-editor/src/store/useStore.ts` - Added PresetId/AspectRatio types, six new store keys with defaults
- `scroll-hero-editor/src/editor/LeftPanel.tsx` - Replaced static preset cards with interactive Orbit/Classic buttons calling setActivePreset
- `scroll-hero-editor/src/preview/Viewport.tsx` - Replaced ScrollyVideoPlayer + placeholder overlay with conditional Canvas/iframe renderer driven by activePreset

## Decisions Made

- ScrollyVideoPlayer removed from Viewport (not deferred with annotation) because it is wholly replaced by the R3F Canvas in the centre area; Phase 4 will reintroduce it in a different context
- CHOREOGRAPHED MOMENTS overlay removed — it was placeholder content that would obscure the live particle canvas
- isRecording ring moved from the inner glass-panel div to the new stage div so it correctly overlays the Canvas/iframe content

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PREV-01 (Orbit renders on load), PREV-02 (Classic renders on click), PREV-03 (preset cards switch scene) all implemented
- Store keys activePreset/aspectRatio/isFullscreen available for Plan 03 (aspect ratio letterbox constraints)
- TypeScript clean (npx tsc --noEmit exits 0)
- npm run dev should show particle canvas immediately on load

---
*Phase: 01-live-scene-preview*
*Completed: 2026-03-09*
