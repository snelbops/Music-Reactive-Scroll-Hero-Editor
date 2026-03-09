# Phase 2: Playhead, Transport, and Motion Recording - Research

**Researched:** 2026-03-09
**Domain:** Theatre.js sequence control, React drag interactions, SceneAdapter pattern, SVG keyframe rendering
**Confidence:** HIGH (core Theatre.js APIs verified against official docs; architecture derived from existing codebase)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROG-01 | Active scene exposes `setProgress(p: number)` via a `SceneAdapter` contract | SceneAdapter pattern section; Orbit scene currently ignores scrollProgress — needs wiring |
| PROG-02 | Viewport displays a non-interactive progress indicator overlay showing current value | Already partially present as debug overlay; needs styled progress overlay component |
| PROG-03 | Creator can drag the viewport scrub handle (0–1) to set progress | Scrub handle is currently non-interactive; pointer event drag pattern documented |
| PROG-04 | Releasing scrub handle snaps timeline playhead to matching position | Requires shared seekTo callback or Zustand `scrubProgress` action |
| TL-01 | Scroll Progress lane (bezier curve, 0–1, purple) visible in timeline | Lane SVG exists in Timeline.tsx; needs to render stored keyframes not just live history |
| TL-02 | Creator can drag red playhead across all lane rows | handleLanesMouseDown already implemented; needs SEQUENCE_DURATION-aware pixel math |
| TL-03 | Click Play advances Theatre.js sequence, driving `setProgress()` on active scene | TheatreSync RAF loop present; needs SceneAdapter wiring |
| TL-04 | Click Stop halts playhead at current position (not reset to 0) | Current Stop resets to 0 — fix: `setIsPlaying(false)` without calling `seekTo(0)` |
| TL-05 | Loop toggle: playhead jumps to start at sequence end | TheatreSync RAF loop needs `isLoop` Zustand state check before auto-stop |
| TL-06 | Transport bar displays current playhead time numerically | `sheet.sequence.position` display already in Timeline.tsx; needs `onChange` reactivity |
| REC-01 | Arm Record button shows red glow; Scroll Progress lane highlights | UI already coded in Timeline.tsx; needs lane highlight CSS |
| REC-02 | While armed + playing, dragging scrub handle writes keyframes at current position | Critical path: `studio.transaction({set}) => set(scrollControlsObj.props.position, p)` when prop is sequenced |
| REC-03 | Stop ends recording and returns playhead to pre-record position | Store `recordStartPosition` on arm; restore on stop |
| REC-04 | Captured keyframes visible as dots on Scroll Progress lane | `sequence.__experimental_getKeyframes()` → render SVG circles |
| REC-05 | Creator can drag a keyframe dot left/right to shift timing | `studio.transaction` with new position; update keyframe via set at new time |
</phase_requirements>

---

## Summary

Phase 2 wires the Theatre.js sequence machinery that was scaffolded in Phase 1 into a fully functional playhead-and-recording workflow. The scaffolding is in excellent shape: `TheatreSync.tsx` already runs the RAF play loop and syncs `scrollControlsObj.onValuesChange → Zustand`; `Timeline.tsx` already has the drag-to-scrub playhead, transport buttons, and recording UI; `RecordMode.tsx` already captures viewport mouse events. What is missing is the glue between these pieces and four specific Theatre.js API calls.

The single most important architectural discovery is that **Theatre.js has no public keyframe-writing API in `@theatre/core`**. Keyframe writing requires `@theatre/studio`, specifically `studio.transaction(({set}) => set(obj.props.propName, value))`. When a prop is "sequenced" (connected to the sequence editor), this call writes a keyframe at the current `sheet.sequence.position`. Since this project uses `@theatre/studio` in dev (it is already installed and declared in `package.json`), this is the correct approach — but the `scrollControlsObj.position` prop must be sequenced first, which requires a pre-seeded state JSON or a one-time Studio UI action before the recording workflow will function.

The second major discovery is the `SceneAdapter` contract for PROG-01. The Orbit scene (`GithubTestParticleField`) currently ignores `scrollProgress` entirely; the Classic preset is an iframe. Phase 2 must define a `SceneAdapter` interface (exposed as a Zustand callback `setProgress`) that each scene type implements, so Transport and Record can drive all scenes uniformly.

**Primary recommendation:** Implement in four waves — (1) SceneAdapter contract + progress overlay, (2) interactive viewport scrub handle, (3) Timeline playhead drag + transport fixes (stop/loop), (4) keyframe record/render/drag. Do not attempt all at once; the keyframe writing path depends on Theatre.js state being correctly initialized.

---

## Standard Stack

### Core (all already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@theatre/core` | `^0.7.2` | Sequence position, play/pause, `onChange`, `val`, `__experimental_getKeyframes` | Official runtime; already in use |
| `@theatre/studio` | `^0.7.2` | `studio.transaction({set})` for keyframe writing, `studio.initialize()` | Only way to write keyframes programmatically in dev |
| `zustand` | `^5.0.11` | App state: `isPlaying`, `isRecording`, `scrollProgress`, `recordedKeyframes[]` | Already wired throughout; single source of truth |
| `react` | `^19.2.0` | Component model; pointer events for scrub handle | Already installed |

### No New Dependencies

All needed libraries are already in `scroll-hero-editor/package.json`. Phase 2 requires zero `npm install` commands.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `studio.transaction` for keyframe write | Custom keyframe state in Zustand only | Simpler but disconnected from Theatre.js — export (Phase 5) would not work |
| `onChange(sequence.pointer.position, cb)` for position tracking | Zustand `scrollProgress` as source of truth | `onChange` is the Theatre-native reactive path; Zustand acts as the bridge to React |
| SVG `<circle>` for keyframe dots | Canvas 2D | SVG is simpler for draggable interactive dots; Canvas is better for large datasets (not the case here) |

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Phase 2 works within existing structure:

```
src/
├── theatre/
│   ├── core.ts          # Already exists — add initialState JSON import
│   └── TheatreSync.tsx  # Already exists — add loop, stop-at-position, position onChange
├── store/
│   └── useStore.ts      # Add: isLoop, recordStartPosition, storedKeyframes[]
├── preview/
│   ├── Viewport.tsx     # Add: draggable scrub handle, progress overlay (PROG-02/03/04)
│   └── RecordMode.tsx   # Change: capture scrollProgress → write Theatre keyframe via studio.transaction
└── editor/
    └── Timeline.tsx     # Fix: Stop button, Loop toggle, keyframe dot render + drag (TL-04/05, REC-04/05)
```

### Pattern 1: Theatre.js Sequence Position Observation

**What:** React to sequence position changes via `onChange` from `@theatre/core` so the transport bar updates reactively without polling.
**When to use:** Anywhere the UI needs to display or react to the current playhead position.

```typescript
// Source: https://www.theatrejs.com/docs/latest/api/core
import { onChange, val } from '@theatre/core';
import { sheet } from './core';

useEffect(() => {
  const unsub = onChange(sheet.sequence.pointer.position, (position) => {
    setScrollProgress(position / SEQUENCE_DURATION);
  });
  return unsub;
}, []);

// Read synchronously when needed:
const currentPos = val(sheet.sequence.pointer.position);
const isPlaying = val(sheet.sequence.pointer.playing);
```

### Pattern 2: Programmatic Keyframe Writing (CRITICAL for REC-02)

**What:** Write a keyframe to the Scroll Progress lane at the current sequence position during recording.
**When to use:** Each time the scrub handle moves while `isRecording && isPlaying`.

```typescript
// Source: https://www.theatrejs.com/docs/latest/api/studio
import studio from '@theatre/studio';
import { scrollControlsObj } from '../theatre/core';

// Called on every scrub event during recording:
function writeKeyframe(progressValue: number) {
  studio.transaction(({ set }) => {
    set(scrollControlsObj.props.position, progressValue);
  });
}
```

**PREREQUISITE:** `scrollControlsObj.props.position` must be sequenced (connected to the sequence editor). Two approaches:
1. **Pre-seeded state JSON** — export a Theatre.js state JSON with `position` already sequenced, import via `getProject('Scroll Hero Editor', { state: stateJson })` in `core.ts`. This is the recommended approach.
2. **One-time Studio UI action** — user right-clicks `position` in the Studio Details Panel and selects "Sequence" before first recording. Acceptable for dev-only workflow.

### Pattern 3: SceneAdapter Contract (PROG-01)

**What:** A unified `setProgress(p: number)` interface that all scene types implement, called by TheatreSync during playback and by the scrub handle during drag.
**When to use:** Any time the editor drives the scene (play, scrub, record playback).

```typescript
// New: src/store/useStore.ts — add to EditorState
setSceneProgress: (p: number) => void; // Zustand action
// Internally routes to the active adapter's setProgress

// New: src/preview/SceneAdapter.ts
export interface SceneAdapter {
  setProgress(p: number): void;
}

// Orbit adapter: drives scrollProgress → GithubTestParticleField via prop
// (GithubTestParticleField needs a `progress` prop wired to uAssemble/rotation)

// Classic adapter: postMessage to iframe with { type: 'setProgress', value: p }
// (iframe can ignore if it doesn't support it — graceful no-op)
```

### Pattern 4: Draggable Viewport Scrub Handle (PROG-03/04)

**What:** The right-side scrub handle (already rendered in `Viewport.tsx`) becomes interactive via pointer events.
**When to use:** Implementation of the scrub handle drag.

```typescript
// Pattern: pointer capture for reliable cross-element drag
const handlePointerDown = (e: React.PointerEvent) => {
  e.currentTarget.setPointerCapture(e.pointerId);
};

const handlePointerMove = (e: React.PointerEvent) => {
  if (e.buttons === 0) return; // not dragging
  const rect = trackRef.current!.getBoundingClientRect();
  const p = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  seekTo(p); // shared canonical seekTo from TheatreSync or Timeline
};

const handlePointerUp = () => {
  // PROG-04: snap timeline playhead — seekTo already does this via
  // sheet.sequence.position = p * SEQUENCE_DURATION
};
```

### Pattern 5: Reading Keyframes for Display (REC-04)

**What:** After recording, retrieve stored keyframes and render them as SVG circles on the Scroll Progress lane.
**When to use:** Rendering the Scroll Progress lane in Timeline.tsx.

```typescript
// Source: https://www.theatrejs.com/docs/latest/api/core
// __experimental_getKeyframes is available in @theatre/core 0.6.1+
const keyframes = sheet.sequence.__experimental_getKeyframes(
  scrollControlsObj.props.position
);
// Returns: Array<{ id: string, position: number, value: number, ... }>
// position is in seconds; value is the prop value (0–1 for progress)
```

### Anti-Patterns to Avoid

- **Using `sheet.sequence.play()` instead of the RAF loop in TheatreSync:** `sheet.sequence.play()` is a Theatre.js built-in that conflicts with the custom RAF loop already in `TheatreSync.tsx`. Stick with the manual RAF pattern — it gives more control over loop behavior and stop-at-position.
- **Storing keyframes only in Zustand:** If keyframes live only in Zustand (not Theatre.js), Phase 5 export breaks. Always write via `studio.transaction`.
- **Calling `seekTo(0)` on Stop:** The current Timeline.tsx Stop button calls `seekTo(0)`. TL-04 requires halting at the current position. Fix: remove `seekTo(0)` from the Stop handler.
- **Polling `sheet.sequence.position` in a `setInterval`:** Use `onChange(sheet.sequence.pointer.position, cb)` instead. The interval approach (already present in Timeline.tsx for scroll history) should be replaced.
- **Writing keyframes without sequencing the prop first:** `studio.transaction({set})` silently sets the static value (not a keyframe) if the prop is not sequenced. The recording will appear to work but no keyframes will be written. Verify by checking `__experimental_getKeyframes` returns non-empty after recording.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyframe storage & interpolation | Custom keyframe array + lerp | Theatre.js sequence + `studio.transaction` | Interpolation, easing, export are all handled by Theatre.js; Phase 5 depends on this data being in Theatre.js state |
| Sequence position reactivity | `setInterval` polling | `onChange(sheet.sequence.pointer.position, cb)` | Polling wastes CPU; Theatre.js reactive system fires only on change |
| Current playback position read | Zustand `scrollProgress` | `val(sheet.sequence.pointer.position)` | `val()` reads Theatre.js truth synchronously; Zustand is the React bridge, not the source |
| Drag interactions (scrub handle) | Mouse event listeners on document | React pointer events + `setPointerCapture` | Pointer capture handles cross-element drags, multi-touch, and pointer release outside element reliably |
| Bezier curve rendering for Scroll Progress lane | Custom bezier math | SVG `<path>` with cubic bezier control points from keyframes | SVG handles the math; `__experimental_getKeyframes` provides control point data |

**Key insight:** Theatre.js is the canonical keyframe store. Zustand is only the React bridge. If data needs to survive to Phase 5 export, it must live in Theatre.js state, not Zustand.

---

## Common Pitfalls

### Pitfall 1: Prop Not Sequenced — Silent Failure in Recording

**What goes wrong:** `studio.transaction({set}) => set(scrollControlsObj.props.position, 0.5)` runs without error, but no keyframe is created. `__experimental_getKeyframes` returns empty. Recording "works" but the lane stays empty.
**Why it happens:** When a prop is static (not sequenced), `set()` updates the static override, not a keyframe. There is no error or warning.
**How to avoid:** Pre-seed the Theatre.js project state JSON with `position` already sequenced. Verify with `__experimental_getKeyframes` in a console log during development.
**Warning signs:** Scroll Progress lane shows no dots after recording; `__experimental_getKeyframes` returns `[]`; Transport bar value doesn't change during playback with no keyframes.

### Pitfall 2: Stop Button Resets to Position 0

**What goes wrong:** TL-04 says "halt at current position" but the existing Timeline.tsx Stop button calls `seekTo(0)`.
**Why it happens:** The button's `onClick` calls `setIsPlaying(false); seekTo(0)` — a pattern copied from a "stop and rewind" paradigm.
**How to avoid:** Change Stop to only call `setIsPlaying(false)`. Add a separate Rewind button (or double-click Stop behavior) for position reset.
**Warning signs:** Playhead jumps to left edge on Stop; progress overlay shows 0.000 immediately after stopping.

### Pitfall 3: TheatreSync RAF Loop vs `sheet.sequence.play()`

**What goes wrong:** If someone calls `sheet.sequence.play()` (the Theatre.js built-in) in addition to the existing RAF loop in `TheatreSync.tsx`, two timers advance the position simultaneously. Position advances at 2x speed.
**Why it happens:** TheatreSync uses a manual `requestAnimationFrame` loop; calling `sheet.sequence.play()` starts a second internal timer inside Theatre.js.
**How to avoid:** Never call `sheet.sequence.play()`. Use `setIsPlaying(true)` on the Zustand store, which the TheatreSync RAF loop responds to.
**Warning signs:** Sequence reaches the end in half the expected time; position jumps.

### Pitfall 4: `onChange` in Zustand `useStore.getState()` During RAF

**What goes wrong:** The existing TheatreSync RAF loop calls `useStore.getState().setIsPlaying(false)` directly. This is fine. But calling `useStore.getState()` inside the `onChange` Theatre.js callback may cause stale closure issues.
**Why it happens:** `onChange` callbacks fire outside React's rendering cycle.
**How to avoid:** Continue using `useStore.getState()` (non-hook form) in RAF and `onChange` contexts. Reserve `useStore(selector)` hooks for React component render cycles.
**Warning signs:** State reads return stale values in callbacks.

### Pitfall 5: Scrub Handle Pointer Events Blocked by Canvas

**What goes wrong:** The R3F `<Canvas>` in `Viewport.tsx` receives pointer events and stops them from reaching the scrub handle overlay elements.
**Why it happens:** Canvas elements are full-viewport and capture all pointer events.
**How to avoid:** The scrub handle lives outside the `<Canvas>` (in the surrounding `<div>`). Ensure the scrub handle's `z-index` is higher than the Canvas. Use `pointer-events-none` on overlays that should not intercept. The current `RecordMode.tsx` already uses `z-50 cursor-crosshair` for its overlay.
**Warning signs:** Scrub handle drag does nothing; clicking progress bar area in the viewport has no effect.

### Pitfall 6: Recording Uses Wrong Time Reference

**What goes wrong:** `RecordMode.tsx` records `time: scrollProgress` (current 0–1 scroll position) instead of the playhead's sequence time. This makes the keyframe position wrong.
**Why it happens:** `scrollProgress` is the value being recorded (output), not the time axis (input). The time axis should be `sheet.sequence.position / SEQUENCE_DURATION`.
**How to avoid:** For REC-02, the keyframe is written at the current `sheet.sequence.position` — Theatre.js handles this automatically when `studio.transaction` is called. The `time` field in `RecordedEvent` (used for Mouse X/Y lanes) is a different concept from Theatre.js keyframe position. Keep these separate.
**Warning signs:** Keyframe dots cluster at wrong positions; playback drives wrong values at wrong times.

---

## Code Examples

Verified patterns from official sources:

### Theatre.js Sequence Position and Playing State — Reactive

```typescript
// Source: https://www.theatrejs.com/docs/latest/api/core
import { onChange, val } from '@theatre/core';
import { sheet, SEQUENCE_DURATION } from './core';

// In TheatreSync.tsx useEffect:
const unsubPosition = onChange(sheet.sequence.pointer.position, (pos) => {
  useStore.getState().setScrollProgress(pos / SEQUENCE_DURATION);
});
const unsubPlaying = onChange(sheet.sequence.pointer.playing, (playing) => {
  // Sync back if Theatre.js stops internally
  if (!playing) useStore.getState().setIsPlaying(false);
});
return () => { unsubPosition(); unsubPlaying(); };
```

### Write a Keyframe at Current Sequence Position

```typescript
// Source: https://www.theatrejs.com/docs/latest/api/studio
import studio from '@theatre/studio';
import { scrollControlsObj } from '../theatre/core';

// During recording, called when scrub handle moves:
studio.transaction(({ set }) => {
  set(scrollControlsObj.props.position, progressValue); // 0–1
});
// Theatre.js writes a keyframe at the current sheet.sequence.position (in seconds)
// because scrollControlsObj.props.position is sequenced.
```

### Read Keyframes for Lane Rendering

```typescript
// Source: https://www.theatrejs.com/docs/latest/api/core (0.6.1+)
import { sheet } from './core';
import { scrollControlsObj } from './core';

const keyframes = sheet.sequence.__experimental_getKeyframes(
  scrollControlsObj.props.position
);
// Returns an array. Each entry has at minimum: { position: number, value: number }
// position is in seconds; convert to lane pixel: (kf.position / SEQUENCE_DURATION) * trackW
```

### Pre-Seeding Project State for Sequenced Props

```typescript
// Source: https://www.theatrejs.com/docs/latest/manual/projects
// In core.ts — use only if state JSON is available:
import projectState from './state.json'; // exported from Studio UI
export const project = getProject('Scroll Hero Editor', { state: projectState });
```

### Loop Implementation in TheatreSync RAF

```typescript
// In TheatreSync.tsx RAF tick:
if (nextPos >= SEQUENCE_DURATION) {
  const isLoop = useStore.getState().isLoop; // new Zustand field
  if (isLoop) {
    sheet.sequence.position = 0;
    useStore.getState().setScrollProgress(0);
    lastTime = now;
    rafId = requestAnimationFrame(tick);
  } else {
    sheet.sequence.position = SEQUENCE_DURATION;
    useStore.getState().setScrollProgress(1);
    useStore.getState().setIsPlaying(false);
  }
  return;
}
```

### Pointer Capture for Viewport Scrub Handle

```typescript
// In Viewport.tsx — scrub handle div:
const trackRef = useRef<HTMLDivElement>(null);
const setScrollProgress = useStore(s => s.setScrollProgress);

const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
  e.currentTarget.setPointerCapture(e.pointerId);
};
const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
  if (!(e.buttons & 1)) return;
  const rect = trackRef.current!.getBoundingClientRect();
  const p = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  // Update Theatre.js position + Zustand (canonical seekTo):
  sheet.sequence.position = p * SEQUENCE_DURATION;
  setScrollProgress(p);
};
const onPointerUp = () => {
  // PROG-04: playhead already snapped because seekTo set sheet.sequence.position
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `sequence.props.position` for `onChange` | `sequence.pointer.position` | Theatre.js 0.4.7 | Old API removed; `pointer` is the correct path |
| `sheet.sequence.play()` for programmatic playback | Manual RAF loop with `setIsPlaying` | Design decision in this project (TheatreSync.tsx) | Avoids Theatre.js internal timer conflict; gives full control |
| Theatre.js v0.4/v0.5 docs | v0.7 current (as used in this project) | 2023 | API surface stabilized; `__experimental_getKeyframes` added in 0.6.1 |

**Deprecated/outdated:**
- `sequence.props` (old API before 0.4.7): replaced by `sequence.pointer`
- Calling `studio.initialize()` without `studio.extend()` is fine for this project (no custom extensions needed)

---

## Open Questions

1. **Is `scrollControlsObj.props.position` sequenced in the current localStorage state?**
   - What we know: `core.ts` defines `scrollControlsObj` with `position: types.number(0, { range: [0, 1] })`. Theatre.js stores state in `localStorage` by default.
   - What's unclear: If any developer has opened the app and sequenced the prop via Studio UI, it is sequenced in localStorage. On a fresh browser, it is not.
   - Recommendation: Create and commit a `src/theatre/state.json` with the position prop already sequenced. Import it in `core.ts` via `getProject('Scroll Hero Editor', { state: projectState })`. This makes recording work on any fresh install without Studio UI interaction.

2. **Can `GithubTestParticleField` meaningfully consume `setProgress(0–1)`?**
   - What we know: The component uses `uAssemble` (0→1 intro animation over 2s) and `rotationSpeed`. Neither maps directly to a "scroll progress" metaphor.
   - What's unclear: What the scroll progress should do to the orbit scene visually — drive `uAssemble`, rotation position, or something else.
   - Recommendation: For PROG-01/03, wire `progress` to control `uAssemble` value directly (0=scattered, 1=assembled). This gives visible feedback and satisfies the contract. More nuanced mapping is Phase 3 territory.

3. **Does `studio.transaction` require `studio.initialize()` to have been called?**
   - What we know: `@theatre/studio` docs say `studio.initialize()` activates the editor UI. The `transaction` API is on the studio module itself.
   - What's unclear: Whether `studio.transaction` works without `studio.initialize()`.
   - Recommendation: Call `studio.initialize()` in the dev entry point (can be guarded by `import.meta.env.DEV`). This is safe because `@theatre/studio` is already in `package.json` as a regular dependency (not devDependency — that's the project's existing choice).

---

## Key Architecture Decisions for Planner

These are pre-decided by the existing codebase and must be honored in plans:

1. **TheatreSync.tsx is the play engine.** It runs the RAF loop. Transport buttons set Zustand `isPlaying`; TheatreSync reacts. Do not call `sheet.sequence.play()`.

2. **`scrollProgress` in Zustand is derived, not source.** The source of truth for position is `sheet.sequence.position`. Zustand `scrollProgress` is the React bridge. `seekTo` should always set both.

3. **`studio.transaction` is the only keyframe write path.** No custom keyframe arrays in Zustand for the Scroll Progress lane. This is what makes Phase 5 export work.

4. **`RecordedEvent[]` in Zustand is for Mouse X/Y/Click lanes only** (v2 features). Scroll Progress keyframes live in Theatre.js state, not Zustand.

5. **Stop = halt, not rewind.** TL-04 is clear: stop at current position. Separate "return to start" from stop.

---

## Sources

### Primary (HIGH confidence)
- [Theatre.js @theatre/core API](https://www.theatrejs.com/docs/latest/api/core) — `onChange`, `val`, `sequence.pointer`, `__experimental_getKeyframes`, sequence interface
- [Theatre.js @theatre/studio API](https://www.theatrejs.com/docs/latest/api/studio) — `studio.transaction`, `studio.scrub`, `set(pointer, value)` keyframe writing
- [Theatre.js Sequences Manual](https://www.theatrejs.com/docs/latest/manual/sequences) — sequence.position, play/pause, attachAudio
- [Theatre.js Projects Manual](https://www.theatrejs.com/docs/latest/manual/projects) — `getProject` with `state` param for pre-seeded JSON
- Existing codebase (`core.ts`, `TheatreSync.tsx`, `Timeline.tsx`, `useStore.ts`, `Viewport.tsx`) — direct inspection

### Secondary (MEDIUM confidence)
- [GitHub Issue #20 - Expose playback state changes](https://github.com/AriaMinaei/theatre/issues/20) — confirms `sequence.pointer` API, `onChange` pattern, resolved in 0.4.7
- [Theatre.js Releases](https://www.theatrejs.com/docs/latest/releases) — version history context

### Tertiary (LOW confidence)
- Training data knowledge of React pointer events and pointer capture API (standard Web API, not library-specific — HIGH confidence despite training source)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; versions confirmed in package.json
- Theatre.js keyframe write API: HIGH — `studio.transaction` confirmed in official docs
- `__experimental_getKeyframes` availability: MEDIUM — confirmed in API docs but marked experimental; may change in future Theatre.js versions
- SceneAdapter pattern: MEDIUM — architectural recommendation, not an existing library pattern; derived from requirements
- Pitfall: prop-not-sequenced silent failure: HIGH — directly follows from documented `set()` behavior

**Research date:** 2026-03-09
**Valid until:** 2026-06-09 (Theatre.js 0.7.x is stable; experimental APIs may shift)
