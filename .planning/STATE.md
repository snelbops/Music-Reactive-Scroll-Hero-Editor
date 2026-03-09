# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Turning ephemeral scrubbing into editable, music-synced scroll hero code — capturing live scroll/jog motion as reusable Theatre.js automation keyframes
**Current focus:** Phase 2 - Playhead, Transport, and Motion Recording

## Current Position

Phase: 2 of 5 (Playhead, Transport, and Motion Recording)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-03-09 — Plan 02-01 (SceneAdapter contract + progress overlay) complete

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 14 min
- Total execution time: 56 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-live-scene-preview | 3 | 48 min | 16 min |
| 02-playhead-transport-and-motion-recording | 1 | 8 min | 8 min |

**Recent Trend:**
- Last 5 plans: 8 min, 10 min, 30 min, 8 min
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
- Letterbox (01-03): RATIO_VALUES const at module level outside component to avoid re-creation on each render
- Letterbox (01-03): Scroll Progress Bar stays in outer preview div, not inside letterbox stage — always anchors to viewport edge
- Fullscreen (01-03): Guard pattern — if (isFullscreen) early return fixed overlay before normal layout return
- SceneAdapter (02-01): OrbitAdapter setProgress is a no-op callback — scrollProgress in Zustand already drives GithubTestParticleField progress prop; adapter contract satisfied without redundant state write
- SceneAdapter (02-01): GithubTestParticleField progress prop optional + backward-compatible; absent = internal time-based intro animation
- SceneAdapter (02-01): isLoop imported in TheatreSync now so Plan 03 only needs a wire-up, not a new import

### Pending Todos

None yet.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-09
Stopped at: Completed 02-01-PLAN.md (SceneAdapter contract + progress overlay; PROG-01, PROG-02 done)
Resume file: None
