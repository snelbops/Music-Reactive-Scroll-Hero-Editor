# Architecture

**Analysis Date:** 2026-03-08

## Pattern Overview

**Overall:** Single-file React SPA with Theatre.js as the central animation engine. The editor is a **progress curve editor** — everything revolves around a single normalized `progress` value (0.0 → 1.0) that Theatre.js owns and animates. All preview and export behavior is downstream of this value.

**Key Characteristics:**
- Theatre.js `sheet.sequence.position` is the authoritative playhead. Zustand is a _reflector_ of Theatre state, not the source.
- The `scrollProgress` value in Zustand is the bridge between the Theatre.js engine and all React UI components.
- The prototype has two coexisting codebases: a static HTML prototype (`stitch-frontEnd-draft/code.html`) and the Vite/React application (`scroll-hero-editor/`). The React app is the active development target.

## Layers

**Theatre.js Engine Layer:**
- Purpose: Owns the timeline, playhead position, and all keyframe curves. The authoritative source for `progress`.
- Location: `scroll-hero-editor/src/theatre/`
- Contains: Project/sheet/object initialization, Theatre object definitions for Scroll Controls, Audio Pulse, Mouse Input
- Key file: `scroll-hero-editor/src/theatre/core.ts` — exports `project`, `sheet`, `scrollControlsObj`, `audioPulseObj`, `mouseInputObj`, and `SEQUENCE_DURATION`
- Depends on: `@theatre/core` (always), `@theatre/studio` (dev only, loaded dynamically in `main.tsx`)

**Sync/Bridge Layer:**
- Purpose: Wires Theatre.js values into Zustand store and runs the RAF playback loop.
- Location: `scroll-hero-editor/src/theatre/TheatreSync.tsx`
- Contains: A logic-only component (renders `null`) mounted at the app root that subscribes to `scrollControlsObj.onValuesChange` and runs a `requestAnimationFrame` loop during playback.
- Depends on: `theatre/core.ts`, `store/useStore.ts`
- Used by: `App.tsx` (mounted once at root level)

**State Layer:**
- Purpose: Global reactive state shared across all React components.
- Location: `scroll-hero-editor/src/store/useStore.ts`
- Contains: `isPlaying`, `videoUrl`, `audioUrl`, `isRecording`, `recordedEvents`, `scrollProgress`
- Pattern: Zustand flat store. No slices. All state in one `create<EditorState>()` call.
- Depends on: `zustand`
- Used by: All editor panel components, Timeline, preview components

**Editor Shell Layer:**
- Purpose: 5-zone layout composition — no business logic.
- Location: `scroll-hero-editor/src/editor/Layout.tsx`
- Contains: Header bar, `<LeftPanel>`, `<Viewport>`, `<Inspector>`, `<Timeline>` assembled in a `flex-col h-screen` wrapper
- Depends on: All four panel components

**Editor Panel Layer:**
- Purpose: Individual panels of the DAW-style UI.
- Location: `scroll-hero-editor/src/editor/`
- Key files:
  - `scroll-hero-editor/src/editor/LeftPanel.tsx` — Presets, Assets (video/audio file upload), Layers panel with collapsible sections. Writes to `videoUrl` and `audioUrl` in Zustand.
  - `scroll-hero-editor/src/editor/Timeline.tsx` — Transport controls (play/pause/stop/record), timeline lanes (Audio Wave, Mouse X/Y, Scroll POS, Scroll Speed/DIR, Clicks), zoom controls. Reads `scrollProgress`/`isPlaying`/`recordedEvents` from store. Calls `sheet.sequence.position` directly for seeking.
  - `scroll-hero-editor/src/editor/Inspector.tsx` — Right panel showing transform fields, easing curve visualizer, interpolation toggles. Currently static UI.

**Preview Layer:**
- Purpose: The center viewport area — renders the live hero preview and handles mouse recording capture.
- Location: `scroll-hero-editor/src/preview/`
- Key files:
  - `scroll-hero-editor/src/preview/Viewport.tsx` — Container with viewport controls, `ScrollyVideoPlayer`, `GhostTrailCanvas`, `RecordMode`, and a debug overlay showing `scrollProgress`.
  - `scroll-hero-editor/src/preview/ScrollyVideoPlayer.tsx` — Wraps the `scrolly-video` library. Imperatively calls `playerRef.current.setVideoPercentage(scrollProgress, { jump: true })` on every `scrollProgress` change.
  - `scroll-hero-editor/src/preview/RecordMode.tsx` — Invisible overlay div that captures `mousemove` and `click` events when `isRecording` is true. Normalizes coordinates and pushes `RecordedEvent` objects to Zustand.
  - `scroll-hero-editor/src/preview/GhostTrailCanvas.tsx` — Raw Canvas 2D ghost trail at 60fps via RAF. Bypasses React entirely. Receives points via custom DOM events (`ghost-point`) dispatched by `pushGhostPoint()`.

**Packages (Utilities) Layer:**
- Purpose: Reusable non-UI logic, intended for portability.
- Location: `scroll-hero-editor/src/packages/`
- Key files:
  - `scroll-hero-editor/src/packages/useKickDrumData.ts` — Hook that returns `beats`, `waveform`, and `isReady` from an audio URL. Currently returns mocked data (sine wave + static beat timestamps).
  - `scroll-hero-editor/src/packages/frameLoader.ts` — Utility for loading and preloading video frames. Currently mocked (stubs for future ffmpeg-WASM integration).

## Data Flow

**Playback Flow:**

1. User clicks Play in `Timeline.tsx` → `setIsPlaying(true)` written to Zustand
2. `TheatreSync.tsx` RAF loop reads `isPlaying` from Zustand, advances `sheet.sequence.position` each frame
3. `scrollControlsObj.onValuesChange` fires → `setScrollProgress(values.position)` writes new progress to Zustand
4. `ScrollyVideoPlayer.tsx` reads `scrollProgress` from Zustand → calls `playerRef.current.setVideoPercentage(scrollProgress, { jump: true })`
5. `Timeline.tsx` reads `scrollProgress` → updates playhead `left` CSS position and `Scroll POS` lane SVG path

**Seek Flow:**

1. User clicks or drags on the timeline lanes area in `Timeline.tsx`
2. `seekTo(progress)` is called: sets `sheet.sequence.position = progress * SEQUENCE_DURATION`, calls `setScrollProgress(progress)`, clears `scrollHistory`
3. `scrollControlsObj.onValuesChange` fires (if keyframes exist), or the direct `setScrollProgress` call takes effect
4. All downstream consumers (video player, playhead, debug overlay) update

**Recording Flow:**

1. User arms recording via the Record button in `Timeline.tsx` → `setIsRecording(true)`
2. `RecordMode.tsx` overlay becomes active (renders and attaches `mousemove`/`click` event listeners)
3. On mouse move/click, `pushRecordedEvent({ time: scrollProgress, x, y, click })` writes to Zustand array
4. Simultaneously, `pushGhostPoint(x, y, click)` dispatches a DOM `CustomEvent` to the canvas element
5. `GhostTrailCanvas.tsx` canvas receives the event and adds the point to its internal `trailRef` array for animated rendering
6. `Timeline.tsx` Mouse X, Mouse Y, and Clicks lanes read `recordedEvents` from Zustand and render SVG polylines/markers

**Audio Analysis Flow:**

1. User imports audio file in `LeftPanel.tsx` → `setAudioUrl(objectURL)` written to Zustand
2. `Timeline.tsx` calls `useKickDrumData(audioUrl)` hook
3. Hook returns `{ beats, waveform, isReady }` (currently mocked)
4. Audio Wave lane renders waveform bars and beat pulse markers from this data

**State Management:**
- Zustand flat store at `scroll-hero-editor/src/store/useStore.ts` holds all shared reactive state
- Theatre.js `sheet.sequence.position` is a non-React imperative value accessed directly via the imported `sheet` singleton from `theatre/core.ts`
- `GhostTrailCanvas` maintains its own internal imperative state via `useRef` — explicitly bypasses React rendering for performance

## Key Abstractions

**`progress` value (0.0 → 1.0):**
- Purpose: The canonical normalized position along the timeline. Maps scroll position (in export) to Theatre.js playhead (in editor).
- Stored in: `useStore.scrollProgress` (Zustand), `sheet.sequence.position / SEQUENCE_DURATION` (Theatre.js)
- Consumed by: `ScrollyVideoPlayer.tsx`, all Timeline lane renderers, `Viewport.tsx` debug overlay, `RecordMode.tsx` (as `time` stamp for recorded events)

**`RecordedEvent`:**
- Purpose: A timestamped mouse event captured during recording.
- Interface: `{ time: number; x: number; y: number; click: boolean }` — all values normalized 0–1
- Defined in: `scroll-hero-editor/src/store/useStore.ts`
- Produced by: `RecordMode.tsx`
- Consumed by: `Timeline.tsx` Mouse X/Y lanes (SVG polylines), Clicks lane (tick marks)

**Theatre.js objects (Scroll Controls, Audio Pulse, Mouse Input):**
- Purpose: Named Theatre.js automation objects that appear as lanes in `@theatre/studio` overlay
- Defined in: `scroll-hero-editor/src/theatre/core.ts`
- `scrollControlsObj` drives the primary `position`, `speed`, and `direction` parameters
- `audioPulseObj` and `mouseInputObj` are stubs for future keyframe baking

## Entry Points

**Application entry:**
- Location: `scroll-hero-editor/src/main.tsx`
- Triggers: Vite dev server or `vite build`
- Responsibilities: Mounts React root, conditionally initializes `@theatre/studio` in dev mode only

**App component:**
- Location: `scroll-hero-editor/src/App.tsx`
- Responsibilities: Mounts `TheatreSync` (logic-only) and `Layout` (all visual zones)

**Static prototype (legacy reference):**
- Location: `stitch-frontEnd-draft/code.html`
- Triggers: Direct browser open
- Responsibilities: Visual-only HTML/CSS reference — no functional JavaScript beyond a single `console.log`

## Error Handling

**Strategy:** Minimal — try/catch used only in specific known-buggy third-party integration points.

**Patterns:**
- `ScrollyVideoPlayer.tsx` wraps `setVideoPercentage` call in `try/catch` to suppress a known `scrolly-video` React wrapper bug where `this` is null during initial mount
- No global error boundaries
- No error state in Zustand store
- `@theatre/studio` initialization is done via dynamic `import()` with `.then()` — no error handling on failure

## Cross-Cutting Concerns

**Logging:** `console.log` only (in `frameLoader.ts` mock stubs). No logging framework.
**Validation:** None. All inputs (file URLs, progress values) are used directly with `Math.max/Math.min` clamping where needed.
**Authentication:** Not applicable — browser-only single-page application with no backend.

---

*Architecture analysis: 2026-03-08*
