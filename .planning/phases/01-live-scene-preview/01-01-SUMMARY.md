---
phase: 01-live-scene-preview
plan: 01
subsystem: infra
tags: [react-three-fiber, drei, theatre, three, gsap, particles, typescript]

# Dependency graph
requires: []
provides:
  - useKickDrumData.ts annotated as deferred (SCAF-01)
  - All 6 required npm packages confirmed present in node_modules (SCAF-02)
  - GithubTestParticleField.tsx and TouchTexture.ts in src/presets/ParticleLab/ (SCAF-03)
  - Barrel index.ts re-exporting GithubTestParticleField
  - Classic preset static bundle at public/github-test-app/ with 5 sample PNGs
affects: [01-live-scene-preview]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Barrel exports: src/presets/ParticleLab/index.ts re-exports from subdirectory"
    - "Deferred hook annotation: // deferred: audio sync — v2 marks hooks not yet wired"

key-files:
  created:
    - scroll-hero-editor/src/presets/ParticleLab/GithubTest/GithubTestParticleField.tsx
    - scroll-hero-editor/src/presets/ParticleLab/TouchTexture.ts
    - scroll-hero-editor/src/presets/ParticleLab/index.ts
    - scroll-hero-editor/public/github-test-app/index.html
    - scroll-hero-editor/public/github-test-app/images/ (5 sample PNGs)
  modified:
    - scroll-hero-editor/src/packages/useKickDrumData.ts

key-decisions:
  - "Do not copy GithubTestView.tsx — standalone app component not needed, only GithubTestParticleField.tsx and TouchTexture.ts"
  - "Relative import '../TouchTexture' in GithubTestParticleField.tsx required no path change after copy"

patterns-established:
  - "Deferred hook pattern: annotate with '// deferred: audio sync — v2' before wiring audio in v2"
  - "Barrel index pattern: presets expose clean public API via index.ts"

requirements-completed: [SCAF-01, SCAF-02, SCAF-03]

# Metrics
duration: 8min
completed: 2026-03-09
---

# Phase 1 Plan 01: Scaffold Particle Preset Source Files Summary

**Particle-lab preset scaffolded: GithubTestParticleField + TouchTexture copied, Classic preset static bundle served at public/github-test-app/, audio hook deferred with annotation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-09T07:23:49Z
- **Completed:** 2026-03-09T07:31:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- useKickDrumData.ts annotated with `// deferred: audio sync — v2` on line 1 (SCAF-01)
- Confirmed all 6 required packages present: @theatre/studio, @theatre/r3f, @react-three/fiber, @react-three/drei, three, gsap (SCAF-02)
- Copied GithubTestParticleField.tsx and TouchTexture.ts into src/presets/ParticleLab/ with correct relative import intact (SCAF-03)
- Created barrel index.ts exporting GithubTestParticleField
- Copied Classic preset static bundle (index.html, css, scripts, 5 sample PNGs) to public/github-test-app/
- npx tsc --noEmit exits 0 after all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Annotate useKickDrumData as deferred and verify deps** - `bd9205f` (chore)
2. **Task 2: Copy particle-lab source files and Classic preset bundle** - `eb436aa` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `scroll-hero-editor/src/packages/useKickDrumData.ts` - Added deferred comment on line 1
- `scroll-hero-editor/src/presets/ParticleLab/GithubTest/GithubTestParticleField.tsx` - R3F orbit particle component copied from Presets/
- `scroll-hero-editor/src/presets/ParticleLab/TouchTexture.ts` - Touch interaction texture copied from Presets/
- `scroll-hero-editor/src/presets/ParticleLab/index.ts` - Barrel re-export for GithubTestParticleField
- `scroll-hero-editor/public/github-test-app/index.html` - Classic preset bundle entry point
- `scroll-hero-editor/public/github-test-app/images/` - 5 sample PNG files (sample-01 through sample-05)
- `scroll-hero-editor/public/github-test-app/css/` - base.css, demo1.css
- `scroll-hero-editor/public/github-test-app/scripts/` - bundled JS

## Decisions Made

- GithubTestView.tsx was explicitly not copied — it is the standalone app with its own sidebar; only the reusable GithubTestParticleField component was needed
- The relative import `from '../TouchTexture'` in GithubTestParticleField.tsx resolves correctly after copy without any path changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All prerequisite files for Phase 1 rendering tasks are in place
- src/presets/ParticleLab/ is ready for import by subsequent plans
- public/github-test-app/ is ready to be served by the Vite dev server
- TypeScript clean (npx tsc --noEmit exits 0)

---
*Phase: 01-live-scene-preview*
*Completed: 2026-03-09*
