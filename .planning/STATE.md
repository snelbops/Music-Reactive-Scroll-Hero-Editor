---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-09T23:10:00.000Z"
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 9
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Turning ephemeral scrubbing into editable, music-synced scroll hero code — capturing live scroll/jog motion as reusable Theatre.js automation keyframes
**Current focus:** Phase 2 - Playhead, Transport, and Motion Recording

## Current Position

Phase: 2 of 5 (Playhead, Transport, and Motion Recording)
Plan: 5+6 of 6 — Phase 2 BLOCKED on recording architecture
Status: In Progress — recording broken at architectural level, fix designed
Last activity: 2026-03-15 — Extensive debugging of recording; root cause found

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 12 min
- Total execution time: 58 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-live-scene-preview | 3 | 48 min | 16 min |
| 02-playhead-transport-and-motion-recording | 4 | 12 min | 3 min |

**Recent Trend:**
- Last 5 plans: 10 min, 30 min, 8 min, 3 min, 2 min
- Trend: accelerating

*Updated after each plan completion*
| Phase 02 P02 | 2 | 1 tasks | 1 files |
| Phase 02 P03 | 3 | 2 tasks | 5 files |
| Phase 02 P04 | 2 | 2 tasks | 2 files |
| Phase 02 P05 | 5 | 1 tasks | 1 files |

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
- [Phase 02]: onPointerUp is a no-op: Theatre.js position already snapped during last onPointerMove, no extra work on release
- [Phase 02]: transition-all removed from scrub fill bar: smooth CSS transition conflicts with real-time 60fps scrub responsiveness
- [Phase 02]: resolveJsonModule: true added to tsconfig for JSON import type-checking
- [Phase 02]: seekTo calls setSceneProgress (not setScrollProgress) so adapter is driven on all scrubs
- [02-04]: Keyframe write guard: isRecording && isPlaying in RecordMode mousemove — avoids writes during scrub-only arming
- [02-04]: __experimental_getKeyframes cast as any[] to handle missing TypeScript typings for experimental Theatre.js API
- [02-04]: Bezier curve uses dx/3 horizontal control point pull — simple smooth approximation without full Catmull-Rom tangent computation
- [02-05]: studio.scrub() preferred over studio.transaction for drag — scrub.capture() replaces the preview each frame, preventing duplicate keyframe accumulation during move
- [02-05]: draggingKfRef stores kf.value at drag start — keeps scroll value constant while only time position shifts
- [02-05]: setPointerCapture on SVGCircleElement routes pointer events to the dragging circle even when cursor leaves it

### Pending Todos

1. **BLOCKER — Custom scroll keyframe system** (replaces Theatre.js automation for scroll):
   - `studio.scrub()` / `studio.transaction` both write to `staticOverrides`, NOT sequence keyframes
   - `stateByProjectId` is empty — Theatre.js has no state.json, so programmatic keyframe writing is broken
   - Fix: replace Theatre.js scroll automation with custom Zustand keyframe store
   - Add `scrollKeyframes: { time: number; value: number }[]` to Zustand
   - TheatreSync RAF interpolates from `scrollKeyframes` → drives `setSceneProgress`
   - Default: no keyframes = linear (time/duration) — matches Cavalry "forward play = diagonal line"
   - Scrub handle writes to `scrollKeyframes` on pointerUp (static) / pointerMove (live)
   - Timeline Scroll POS lane reads from `scrollKeyframes` directly

2. **Video upload working** ✅ — ffmpeg WASM loads via `toBlobURL`, COOP/COEP headers added
3. **Video frame preset working** ✅ — `viewport.width/height` plane geometry fix
4. **Video Frames timeline lane** ✅ — appears when frames extracted
5. **Playhead decoupled from scrub handle** ✅ — `playheadLeft` now uses `seqPos` (time)
6. **Double-click stop → go to start** ✅

### Blockers/Concerns

Theatre.js `studio.scrub()` does not write sequence keyframes when `stateByProjectId` is empty.
All programmatic mutations go to `staticOverrides` instead. Scroll automation must be custom-built.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-15
Stopped at: Discovered Theatre.js cannot write sequence keyframes programmatically — scroll automation must be rebuilt as custom Zustand keyframe system. All other Phase 2 features (video upload, frame extraction, playhead decoupling, transport controls) confirmed working.
Resume file: None
Next action: Implement custom `scrollKeyframes` store + TheatreSync interpolation (see Pending Todos #1 above)
