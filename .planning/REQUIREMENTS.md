# Requirements: Music-Reactive Scroll Hero Editor

**Defined:** 2026-03-08
**Core Value:** Turning ephemeral scrubbing into editable, music-synced scroll hero code — capturing live scroll/jog motion as reusable Theatre.js automation keyframes

## v1 Requirements

### Scene Preview (PREV)

- [x] **PREV-01**: Creator can see the Orbit particle preset (GithubTestParticleField R3F scene) rendering live in the viewport canvas on app load
- [x] **PREV-02**: Creator can see the Classic particle preset (iframe) rendering in the viewport when selected
- [x] **PREV-03**: Creator can click a preset card in the left panel Presets section to switch the active scene in the viewport
- [x] **PREV-04**: Creator can switch the viewport aspect ratio (16:9 / 9:16 / 1:1 / free) and see the scene constrained with letterboxing
- [x] **PREV-05**: Creator can toggle fullscreen mode to expand the viewport to fill the browser window, hiding editor chrome

### Progress Interface (PROG)

- [ ] **PROG-01**: The active scene exposes a `setProgress(p: number)` interface (0–1) that all scene types implement as a `SceneAdapter` contract
- [ ] **PROG-02**: The viewport displays a non-interactive progress indicator overlay showing the current value (e.g. `0.47`)
- [ ] **PROG-03**: Creator can drag a scrub handle in the viewport to manually set `progress` (0–1), overriding the playhead position
- [ ] **PROG-04**: Releasing the viewport scrub handle snaps the timeline playhead to the matching position

### Timeline & Transport (TL)

- [ ] **TL-01**: Creator can see a Scroll Progress automation lane (bezier curve, 0–1, purple accent) in the bottom timeline
- [ ] **TL-02**: Creator can drag a red playhead spanning all lane rows to set the current time position
- [ ] **TL-03**: Creator can click Play to advance the Theatre.js sequence, driving `setProgress()` continuously on the active scene
- [ ] **TL-04**: Creator can click Stop to halt playhead at its current position
- [ ] **TL-05**: Creator can enable Loop so the playhead jumps back to start when it reaches the sequence end
- [ ] **TL-06**: The transport bar displays the current playhead time/position numerically

### Recording (REC)

- [ ] **REC-01**: Creator can click Arm Record (⏺) to arm the Scroll Progress lane, indicated by a red glow on the button and lane highlight
- [ ] **REC-02**: While armed and Play is running, dragging the viewport scrub handle writes keyframes to the Scroll Progress lane in real time at the current playhead position
- [ ] **REC-03**: Clicking Stop ends recording and returns the playhead to its pre-record position
- [ ] **REC-04**: After recording, the captured keyframes are visible as dots connected by a curve on the Scroll Progress lane
- [ ] **REC-05**: Creator can drag a recorded keyframe dot left/right on the lane to adjust timing, with the curve and playback updating accordingly

### Curve Editing & Parameters (CURV)

- [ ] **CURV-01**: Creator can see Rotation Speed, Particle Depth, and Particle Size lanes (teal/green accents) in the timeline, each independently animatable
- [ ] **CURV-02**: Keyframes on scene parameter lanes drive the corresponding R3F scene props live during playback
- [ ] **CURV-03**: Creator can see a CSS Opacity lane (0–1, blue accent) that fades the entire scene canvas in/out
- [ ] **CURV-04**: When a lane row label is clicked, the right inspector shows lane colour picker and default interpolation mode
- [ ] **CURV-05**: When a keyframe dot is clicked, the right inspector shows exact numeric value input and an easing curve picker
- [ ] **CURV-06**: The easing picker offers presets: Ease In, Ease Out, Ease In-Out, Spring, Step, and a Custom bezier option (x1, y1, x2, y2 inputs)
- [ ] **CURV-07**: Changing easing on a selected keyframe updates the curve shape on the lane and in playback immediately

### Frame Sequence Video (VID)

- [ ] **VID-01**: Creator can upload an MP4 file via the Assets section in the left panel; the file appears with filename and thumbnail
- [ ] **VID-02**: Creator can click "Extract Frames" on an uploaded MP4 to trigger ffmpeg WASM frame extraction in a Web Worker (UI remains responsive throughout)
- [ ] **VID-03**: A progress indicator shows extraction status (e.g. "Extracting… 47 / 120 frames")
- [ ] **VID-04**: Creator can click "Load as Scene" after extraction to switch the viewport to a FrameSequenceScene displaying PNG frames via frameLoader
- [ ] **VID-05**: Dragging the playhead or scrub handle on a frame sequence scene maps `progress` to `Math.floor(p × frameCount)` and renders the correct frame instantly with no seek latency (forward and reverse)
- [ ] **VID-06**: The full Arm Record and playback workflow from the Timeline requirements works identically on the frame sequence scene

### Export (EXP)

- [ ] **EXP-01**: Creator can click "Export JSON" in the top nav to download `curves.json` containing all Theatre.js sequence keyframes, values, and easing data
- [ ] **EXP-02**: Creator can click "Export Hero" with an R3F particle scene active to download a standalone `index.html` (compiled scene + curves.json baked in + scroll runtime shim) that works without a server
- [ ] **EXP-03**: Opening the exported particle hero HTML and scrolling maps real scroll position (0–1) through the saved Theatre.js curve and drives `setProgress()`, reproducing all choreographed speed-ups, pauses, and reverses
- [ ] **EXP-04**: Creator can click "Export Hero" with a frame sequence scene active to download a standalone `index.html` (ScrollyVideo.js runtime ~10KB + original MP4 + curves.json + GSAP ScrollTrigger)
- [ ] **EXP-05**: Opening the exported video hero HTML and scrolling drives `ScrollyVideo.setVideoPercentage(curveProgress)`, reproducing the choreographed motion including reverse, with no frame drop or seek jank

### Codebase Scaffold (SCAF)

- [x] **SCAF-01**: `useKickDrumData` hook is present at `src/packages/useKickDrumData.ts`, typed, exports correctly, and is not wired into any UI (marked `// deferred: audio sync — v2`)
- [x] **SCAF-02**: All missing dependencies installed: `@theatre/studio`, `@theatre/r3f`, `@react-three/fiber`, `@react-three/drei`, `three`, `gsap`
- [x] **SCAF-03**: `particle-lab-package` source files copied into `src/presets/ParticleLab/`

## v2 Requirements

### Audio Sync

- **AUDIO-01**: Audio lane shows waveform display with beat markers auto-placed on all lanes
- **AUDIO-02**: Creator can load an audio file and see BPM detected in the transport bar
- **AUDIO-03**: Beat markers are draggable for fine alignment with keyframes
- **AUDIO-04**: useKickDrumData hook wired into the audio lane (AnalyserNode → onset/peak detection)

### Mouse Recording

- **MOUSE-01**: Creator can arm Mouse X, Mouse Y, and Click lanes and record cursor interactions with the viewport
- **MOUSE-02**: A ghost trail overlay shows the last 2 seconds of recorded mouse position during recording
- **MOUSE-03**: Click keyframes can be dragged to align with audio beat markers

### Advanced Export

- **AEXP-01**: MP4 bake — render scroll animation to video file

## Out of Scope

| Feature | Reason |
|---------|--------|
| Remotion | Output is scroll-driven HTML, not MP4; incompatible primary axis — explicitly rejected |
| SSR / server-side | Browser-only hard constraint; Theatre.js Studio is dev-only |
| Multi-layer compositing | v1 supports single active scene only (NFR4) |
| n8n integration | Not applicable to this tool |
| OAuth / user accounts | Local editor, no account concept |
| GIF as video format | 256 colour limit, unsuitable for video heroes |
| GSAP ScrollTrigger inside the editor | Only used in exported HTML bundle |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCAF-01 | Phase 1 | Complete |
| SCAF-02 | Phase 1 | Complete |
| SCAF-03 | Phase 1 | Complete |
| PREV-01 | Phase 1 | Complete |
| PREV-02 | Phase 1 | Complete |
| PREV-03 | Phase 1 | Complete |
| PREV-04 | Phase 1 | Complete |
| PREV-05 | Phase 1 | Complete |
| PROG-01 | Phase 2 | Pending |
| PROG-02 | Phase 2 | Pending |
| PROG-03 | Phase 2 | Pending |
| PROG-04 | Phase 2 | Pending |
| TL-01 | Phase 2 | Pending |
| TL-02 | Phase 2 | Pending |
| TL-03 | Phase 2 | Pending |
| TL-04 | Phase 2 | Pending |
| TL-05 | Phase 2 | Pending |
| TL-06 | Phase 2 | Pending |
| REC-01 | Phase 2 | Pending |
| REC-02 | Phase 2 | Pending |
| REC-03 | Phase 2 | Pending |
| REC-04 | Phase 2 | Pending |
| REC-05 | Phase 2 | Pending |
| CURV-01 | Phase 3 | Pending |
| CURV-02 | Phase 3 | Pending |
| CURV-03 | Phase 3 | Pending |
| CURV-04 | Phase 3 | Pending |
| CURV-05 | Phase 3 | Pending |
| CURV-06 | Phase 3 | Pending |
| CURV-07 | Phase 3 | Pending |
| VID-01 | Phase 4 | Pending |
| VID-02 | Phase 4 | Pending |
| VID-03 | Phase 4 | Pending |
| VID-04 | Phase 4 | Pending |
| VID-05 | Phase 4 | Pending |
| VID-06 | Phase 4 | Pending |
| EXP-01 | Phase 5 | Pending |
| EXP-02 | Phase 5 | Pending |
| EXP-03 | Phase 5 | Pending |
| EXP-04 | Phase 5 | Pending |
| EXP-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after initial definition*
