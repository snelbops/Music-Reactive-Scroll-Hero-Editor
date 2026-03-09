# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Turning ephemeral scrubbing into editable, music-synced scroll hero code — capturing live scroll/jog motion as reusable Theatre.js automation keyframes
**Current focus:** Phase 1 - Live Scene Preview

## Current Position

Phase: 1 of 5 (Live Scene Preview)
Plan: 2 of ? in current phase
Status: In progress
Last activity: 2026-03-09 — Plan 01-02 (preset switcher wiring) complete

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 9 min
- Total execution time: 18 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-live-scene-preview | 2 | 18 min | 9 min |

**Recent Trend:**
- Last 5 plans: 8 min, 10 min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Architecture: PNG frames for editor preview (smooth random-access scrub); ScrollyVideo.js for export runtime (~10KB, handles reverse)
- Architecture: ffmpeg WASM in Web Worker so frame extraction is non-blocking
- Architecture: Theatre.js Studio is dev-only; strips to @theatre/core in export bundle
- Constraint: Phase 4 (Video) and Phase 3 (Curves) both unblock from Phase 2 — can be ordered either way; Phase 5 needs both
- Scaffold (01-01): Do not copy GithubTestView.tsx — only GithubTestParticleField.tsx and TouchTexture.ts are needed
- Scaffold (01-01): Deferred hook pattern — annotate audio hooks with '// deferred: audio sync — v2' before wiring in v2
- Preset wiring (01-02): ScrollyVideoPlayer removed from Viewport centre — it will reappear in Phase 4 context, not the same location
- Preset wiring (01-02): CHOREOGRAPHED MOMENTS overlay removed — placeholder that blocked live particle canvas view
- Preset wiring (01-02): Union string literals for PresetId/AspectRatio (no TypeScript enum — erasableSyntaxOnly: true)

### Pending Todos

None yet.

### Blockers/Concerns

None — SCAF-02 (all 6 deps confirmed) and SCAF-03 (ParticleLab files copied) resolved in plan 01-01.

## Session Continuity

Last session: 2026-03-09
Stopped at: Completed 01-02-PLAN.md (preset switcher wiring; PREV-01, PREV-02, PREV-03 done)
Resume file: None
