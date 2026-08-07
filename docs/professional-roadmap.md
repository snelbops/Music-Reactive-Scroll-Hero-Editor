# Scroll Hero Editor — Professional Roadmap

> Reference: Premiere Pro, After Effects, CapCut, DaVinci Resolve, Rive, Jitter

This document maps the current state of the editor against professional-grade tools and outlines the work needed to close the gap. Items are grouped by theme and ordered by impact within each group.

---

## Current State Summary

The editor is a **scroll-specific animation timeline** — it does one thing well: authoring scroll-driven animation curves and mapping them to a particle/video scene. The core loop (scrub → record → keyframe → export) works. What it lacks is the infrastructure that makes professional tools feel fast, trustworthy, and deep.

---

## P1 — Foundation (must-have before serious use)

### 1. Undo / Redo
**Why it matters:** Every pro tool has it. Without it, any misclick on the timeline destroys work permanently.

- Command pattern: wrap every store mutation in an undoable action
- Track history stack in Zustand (max ~100 entries)
- Keyboard: `Cmd+Z` / `Cmd+Shift+Z`
- Scope: keyframe add/move/delete, easing changes, lane value edits, scroll pattern application

### 2. Project Save / Load
**Why it matters:** Currently all state lives in localStorage and Theatre.js auto-save. Closing the tab or switching presets can wipe animation work.

- Export full project as `.shero` JSON file (all keyframes, params, orbit controls, active preset)
- Import project from file on load (drag-drop or file picker)
- Auto-save to localStorage with a named slot system ("recent projects")
- Should include: scrollKeyframes, paramKeyframes, orbitControls, classicDarkControls, activePreset, aspectRatio, audioUrl reference

### 3. Snap to Beat / Grid
**Why it matters:** Beat detection already works. CapCut's killer feature is one-click snap-to-beat. Without snapping, precise keyframe placement is guesswork.

- Grid snap: constrain keyframe time to nearest subdivision when dragging (hold `Shift` to free-snap, default snapped)
- Snap-to-beat: add a "Snap to Beat" toggle in transport bar; when on, pen tool clicks quantize to nearest detected beat
- Visual: draw subtle beat tick marks on the timeline ruler

### 4. Keyframe Copy / Paste
**Why it matters:** Repeating animations requires it. Currently there's no way to duplicate work.

- `Cmd+C` / `Cmd+V` on selected keyframes
- Paste at playhead position, offset by original time delta
- Works across lanes (paste rotation speed keyframes onto opacity lane)

---

## P2 — Timeline Quality

### 5. Improved Curve Editor (After Effects Graph Editor style)
**Why it matters:** The current bezier handles are functional but limited. Pro tools give you a full graph editor with velocity curves as a separate editing mode.

- **Value graph mode**: show keyframe values as Y-axis, time as X-axis, edit bezier handles freely
- **Speed graph mode**: show rate-of-change — helps tune easing feel
- Toggle between "normal" timeline view and graph editor mode (keyboard `G`)
- Both handles visible simultaneously for adjacent keyframes
- Handle constraints shown visually (dragging past the vertical gives a visual snap)

### 6. Range Selection / Box Select
**Why it matters:** Selecting a region of keyframes is fundamental. Current multi-select requires individual Shift+clicks.

- Drag empty lane area to draw a selection rectangle (Marque select)
- All keyframes within bounds become selected
- `Escape` to deselect
- Works across multiple lanes simultaneously

### 7. Batch Keyframe Operations
**Why it matters:** Scaling and shifting a block of animation is how you iterate timing.

- With multiple keyframes selected: `Alt+drag` to scale their time positions around a pivot
- `Shift+drag` to offset the whole selection in time
- Scale value range: hold modifier + drag vertically to compress/expand values
- Right-click context menu: "Reverse keyframes", "Distribute evenly", "Scale time to fit"

### 8. Custom Parameter Lanes
**Why it matters:** Currently hardcoded to 4 lanes (rotationSpeed, depth, size, opacity). This limits what can be animated.

- "Add Lane" button in timeline
- Pick from: numeric float, boolean, color, enum
- Name the lane, set min/max
- Wire to exported curves JSON with the lane name as key
- Remove lanes (with confirmation if keyframes exist)

### 9. Lane Solo / Mute / Lock
**Why it matters:** Standard in every DAW and video editor. Essential when tweaking one lane without affecting others.

- Eye icon (visibility — hides the curve visualisation but still plays)
- Lock icon (already exists in the static prototype — make it functional: prevents editing)
- Solo (S key when hovering lane): mute all other lanes during playback

### 10. Eraser Tool
**Why it matters:** The button exists in the UI but does nothing on most lanes.

- Click on a keyframe dot with eraser active → deletes it
- Drag across the lane → deletes all keyframes in the dragged range

---

## P3 — Viewport & Preview Quality

### 11. Functional Zoom (Fit / 50% / 100%)
**Why it matters:** The zoom dropdown says "85% (Fit)" but does nothing. Every editor needs actual zoom.

- Implement zoom levels: Fit (auto), 25%, 50%, 75%, 100%, 150%, 200%
- Keyboard: `Cmd+=` zoom in, `Cmd+-` zoom out, `Cmd+0` fit to frame
- Store zoom as a number; apply as CSS scale/transform to the letterbox stage

### 12. Safe Zone / Grid Overlay
**Why it matters:** CapCut, Premiere all show composition guides. Helps framing.

- Toggle grid overlay: `G` key or button in viewport controls
- Show: center crosshair, rule-of-thirds grid, title-safe/action-safe borders
- Subtle, non-distracting lines — white 10% opacity in dark mode, black 8% in light

### 13. Preview Recording Playback
**Why it matters:** Currently the editor captures mouse/scroll events (recordedEvents in store) but never replays them. The capture is wasted.

- During non-recording playback, replay captured mouse events to drive `mouseX`/`mouseY` values
- Drive the touch texture in GithubTestParticleField from the replayed mouse data
- Show a ghost cursor during replay

### 14. Multi-scene / Preset Switching Animation
**Why it matters:** The transition between presets is an instant swap. Pro tools have smooth transitions.

- Fade transition (opacity crossfade, ~300ms) when switching presets
- Could later support animation into/out of a preset during the timeline (a layer approach)

---

## P4 — Recording & Input

### 15. Audio Scrub
**Why it matters:** Scrubbing a timeline silently is disorienting. Every DAW plays audio while scrubbing.

- On timeline scrub (mouse drag), play a short ~80ms snippet of audio at the corresponding position
- Uses Web Audio API with an `AudioBufferSourceNode` on each scrub event
- Pitch-correct or pitched (pitched sounds more natural for scrub)

### 16. Frame-Accurate Playback
**Why it matters:** The RAF loop drifts slightly with tab focus and system load. Frame-accurate playback is essential for sync with audio.

- Use `AudioContext.currentTime` as the authoritative clock when audio is loaded
- Sync `sheet.sequence.position` to audio time on every RAF tick
- Visible drift compensation: if clock is ahead/behind by >1 frame, snap (don't lerp)

### 17. Punch In / Out
**Why it matters:** CapCut and DaVinci let you record into a specific time range without touching the rest.

- Set in/out markers on the timeline (drag from ruler or keyboard `I` / `O`)
- Recording only replaces keyframes within the marked range
- Outside the range, existing keyframes are preserved

### 18. MIDI / Keyboard Input Recording
**Why it matters:** Allows expressive real-time input beyond mouse wheel and pointer.

- Map MIDI CC knobs / faders to parameter lanes during recording
- Web MIDI API (`navigator.requestMIDIAccess`)
- Configurable mapping: which CC → which lane
- Keyboard velocity (keyboard keys → lane value, like a piano roll)

---

## P5 — Asset Management

### 19. Drag-and-Drop Import
**Why it matters:** Every pro tool accepts drag-drop. The current upload flow requires clicking a button and navigating a file picker.

- Drag MP4 / image / audio files directly onto the viewport or timeline
- Auto-detect type and route to the appropriate handler
- Show a drop target highlight

### 20. Asset Library Panel
**Why it matters:** When working with multiple presets or images, you need to see everything at once.

- Dedicated "Assets" panel (expand the existing section in LeftPanel)
- Thumbnail grid for images (for Light Images preset)
- Audio waveform preview strip for imported audio
- Double-click to load into active scene

### 21. Cancellable Frame Extraction
**Why it matters:** ffmpeg extraction can take 10-20s for long videos. There's no cancel button.

- Show a cancel button during extraction
- Abort ffmpeg via `ffmpeg.terminate()` and clean up state
- Let users re-extract at a different frame rate (currently hardcoded)

### 22. Frame Rate Selection for Extraction
- Expose FPS slider (12 / 24 / 30 / 60) before extracting
- Higher FPS = more frames = smoother playback but larger memory footprint
- Show estimated frame count before starting

---

## P6 — Export

### 23. Direct CSS Export
**Why it matters:** Many web developers want a `@keyframes` CSS block they can drop in.

- Export scroll curve as a CSS `@keyframes` + `animation-timeline: scroll()` declaration (CSS Scroll-Driven Animations spec)
- Fallback: GSAP ScrollTrigger snippet (existing)
- Option for `steps()` vs `linear()` timing functions

### 24. GSAP / Lottie / Framer Motion Export
- **GSAP**: emit a `gsap.timeline()` config with `scrollTrigger` using baked keyframes
- **Framer Motion**: emit a `useScroll` + `useTransform` snippet with keyframe arrays
- **Lottie**: convert param keyframes to a minimal bodymovin JSON (for simple numeric properties)

### 25. Compressed / Production HTML
**Why it matters:** The current HTML export is readable but unminified. Production output should be lightweight.

- Minify inline JS in exported HTML
- Strip debug comments
- Tree-shake unused easing functions (only include what the curve actually uses)
- Show file size estimate before downloading

### 26. Partial Export / Embed Snippet
- Instead of full HTML, export just the JS init snippet (`<script>` tag) to paste into an existing page
- Include CDN links for dependencies (GSAP, ScrollyVideo)

---

## P7 — UI / UX Polish

### 27. Keyboard Shortcut Overlay
**Why it matters:** CapCut and Premiere both have a shortcut sheet. The Inspector has a "Quick Hints" section but it's incomplete.

- `?` key opens a modal shortcut reference
- Grouped by category: Playback, Timeline, Tools, Viewport
- Searchable

### 28. Context Menus
**Why it matters:** Right-click menus are expected in every editor.

- Right-click on keyframe: "Delete", "Set Easing", "Copy", "Jump to Time"
- Right-click on lane label: "Solo", "Mute", "Lock", "Clear All Keyframes", "Rename"
- Right-click on timeline ruler: "Set In Point", "Set Out Point", "Go to Time"

### 29. Keyframe Tooltips
**Why it matters:** Hovering a keyframe dot should tell you its value and time without selecting it.

- On keyframe hover: show small tooltip `t=1.24s  v=0.73` above the dot
- On beat marker hover: show `Beat 3  t=1.12s`

### 30. Collapsible / Resizable Inspector Sections
**Why it matters:** The inspector has fixed sections. Pro tools let you collapse sections you don't need.

- Accordion-style sections in Inspector (Easing, Value, Bezier Editor, Quick Hints)
- Persisted collapse state in localStorage

### 31. Timeline Ruler Time Format Toggle
- Toggle between: seconds (`1.24s`), timecode (`00:00:01:06`), frames (`@30fps: frame 37`)
- Click on the time display in transport bar to cycle

### 32. Dark / Light / Custom Theme
**Why it matters:** Professional tools support themes. The L/D toggle exists but colours are not fully customisable.

- Expand theme system: add a "Midnight Blue" dark theme and "Studio Gray" light theme
- Expose --theme-* CSS variables in a Settings panel
- Export theme as a shareable JSON preset

---

## P8 — Architecture (technical debt)

### 33. Replace Theatre.js Clock with Zustand `currentTime`
- `sheet.sequence.position` is used as a bare numeric clock in ~15 places
- Replace with `currentTime: number` in Zustand, RAF loop writes to it
- Removes the last real dependency on Theatre.js at runtime
- Decouples the project from Theatre.js version constraints

### 34. Interpolation Worker
**Why it matters:** The RAF loop interpolates all lanes on the main thread. At 60fps with many keyframes and complex bezier solves, this can cause jank.

- Move `interpolateScrollAt` / `interpolateParamAt` calls to a Web Worker
- Post `{ time, scrollKeyframes, paramKeyframes }` each frame
- Receive `{ scrollProgress, rotationSpeed, depth, size, opacity }` back

### 35. Persistent Project State (IndexedDB)
- Replace localStorage Theatre.js persistence with IndexedDB
- Store: project state, audio blob, extracted frames (avoid re-extraction on reload)
- `idb-keyval` or native IndexedDB

---

## Reference: Feature Parity Table

| Feature | Current | Premiere Pro | After Effects | CapCut | Target |
|---|---|---|---|---|---|
| Undo/Redo | ❌ | ✅ | ✅ | ✅ | P1 |
| Project Save/Load | ⚠️ localStorage | ✅ | ✅ | ✅ | P1 |
| Snap to Beat | ❌ | ✅ | — | ✅ | P1 |
| Copy/Paste keyframes | ❌ | ✅ | ✅ | ✅ | P1 |
| Graph editor | ⚠️ basic | ✅ | ✅ | ⚠️ | P2 |
| Range/box select | ❌ | ✅ | ✅ | ✅ | P2 |
| Custom param lanes | ❌ | ✅ | ✅ | ⚠️ | P2 |
| Lane mute/solo/lock | ⚠️ UI only | ✅ | ✅ | ⚠️ | P2 |
| Viewport zoom | ❌ (UI only) | ✅ | ✅ | ✅ | P3 |
| Composition guides | ❌ | ✅ | ✅ | ✅ | P3 |
| Audio scrub | ❌ | ✅ | ✅ | ✅ | P4 |
| Punch in/out | ❌ | ✅ | ✅ | ⚠️ | P4 |
| Drag-drop import | ❌ | ✅ | ✅ | ✅ | P5 |
| CSS export | ❌ | — | — | — | P6 |
| Context menus | ❌ | ✅ | ✅ | ✅ | P7 |
| Keyframe tooltips | ❌ | ✅ | ✅ | ✅ | P7 |
| Keyboard shortcut sheet | ⚠️ partial | ✅ | ✅ | ✅ | P7 |

---

## Suggested Milestone Order

1. **Milestone A** — Trust & Safety: Undo/redo + project save/load + copy/paste  
2. **Milestone B** — Timeline Power: Snap to beat + range select + batch ops + eraser  
3. **Milestone C** — Viewport Depth: Zoom + guides + audio scrub + frame-accurate clock  
4. **Milestone D** — Expressiveness: Custom lanes + graph editor + context menus  
5. **Milestone E** — Export Pro: CSS export, GSAP/Framer snippets, compressed output  
6. **Milestone F** — Architecture: Theatre.js removal, interpolation worker, IndexedDB  
