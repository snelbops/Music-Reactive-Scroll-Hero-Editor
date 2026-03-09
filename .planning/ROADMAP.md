# Roadmap: Music-Reactive Scroll Hero Editor

## Overview

Five phases take the project from a scaffold with component shells to a fully functional DAW-style scroll choreography editor. Phase 1 makes the particle scenes visible and switchable. Phase 2 adds the Theatre.js timeline so creators can play, scrub, and record scroll motions. Phase 3 extends the timeline with multi-lane parameter curves and the right inspector's easing tools. Phase 4 adds frame-sequence video as a second scene type via ffmpeg WASM extraction. Phase 5 closes the loop by exporting standalone HTML files that reproduce the choreographed scroll motion in any browser.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Live Scene Preview** - Particle presets render in viewport; preset switcher, aspect ratio, and fullscreen working
- [ ] **Phase 2: Playhead, Transport, and Motion Recording** - Theatre.js timeline live; creators can scrub, play, arm record, and capture scroll curves
- [ ] **Phase 3: Curve Editing and Inspector** - Multi-lane parameter automation; right inspector with easing picker wired to keyframes
- [ ] **Phase 4: Frame Sequence Video Hero** - MP4 upload, ffmpeg WASM extraction, FrameSequenceScene driving progress with no seek latency
- [ ] **Phase 5: Export Standalone Hero** - Export curves.json, particle hero HTML, and video hero HTML that reproduce choreography via real scroll

## Phase Details

### Phase 1: Live Scene Preview
**Goal**: Creators can see particle scenes rendering live and switch between them in the editor
**Depends on**: Nothing (first phase)
**Requirements**: SCAF-01, SCAF-02, SCAF-03, PREV-01, PREV-02, PREV-03, PREV-04, PREV-05
**Success Criteria** (what must be TRUE):
  1. Opening the app shows the Orbit particle preset (GithubTestParticleField R3F scene) rendering live in the viewport canvas without any manual action
  2. Creator can click a preset card in the left panel to switch between Orbit and Classic particle presets and see the viewport update immediately
  3. Creator can change the aspect ratio (16:9, 9:16, 1:1, free) and the scene is constrained with letterboxing matching the selection
  4. Creator can toggle fullscreen mode to expand the viewport to fill the browser window, hiding all editor chrome
  5. All missing dependencies are installed and particle-lab source files are in place so the above works without console errors
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Copy particle-lab files and verify scaffold (SCAF-01, SCAF-02, SCAF-03)
- [ ] 01-02-PLAN.md — Extend store, wire preset switcher, replace Viewport with conditional renderer (PREV-01, PREV-02, PREV-03)
- [ ] 01-03-PLAN.md — Aspect ratio letterboxing and fullscreen toggle (PREV-04, PREV-05)

### Phase 2: Playhead, Transport, and Motion Recording
**Goal**: Creators can play a Theatre.js sequence, scrub progress manually, and record live scroll curves onto the timeline
**Depends on**: Phase 1
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04, TL-01, TL-02, TL-03, TL-04, TL-05, TL-06, REC-01, REC-02, REC-03, REC-04, REC-05
**Success Criteria** (what must be TRUE):
  1. Creator can drag the red playhead across the timeline and see the Scroll Progress lane and progress overlay update in sync
  2. Creator can click Play and watch the Theatre.js sequence advance, driving `setProgress()` on the active scene continuously, then click Stop to halt at the current position
  3. Creator can drag the viewport scrub handle to set progress (0-1) manually and release it to snap the timeline playhead to that position
  4. Creator can click Arm Record, press Play, drag the scrub handle, stop, and see the captured motion appear as keyframe dots connected by a curve on the Scroll Progress lane
  5. Creator can drag a recorded keyframe dot left or right to shift its timing and see the curve update immediately
**Plans**: TBD

### Phase 3: Curve Editing and Inspector
**Goal**: Creators can animate scene parameters across multiple lanes and fine-tune keyframe easing from the right inspector
**Depends on**: Phase 2
**Requirements**: CURV-01, CURV-02, CURV-03, CURV-04, CURV-05, CURV-06, CURV-07
**Success Criteria** (what must be TRUE):
  1. Creator can see Rotation Speed, Particle Depth, Particle Size, and CSS Opacity lanes in the timeline and add keyframes to each independently
  2. During playback, keyframes on scene parameter lanes drive the corresponding R3F props (rotation speed, depth, size, opacity) visibly in the viewport
  3. Clicking a lane label opens the right inspector showing that lane's colour and default interpolation mode
  4. Clicking a keyframe dot opens the right inspector showing the exact numeric value and an easing picker with Ease In, Ease Out, Ease In-Out, Spring, Step, and Custom bezier presets
  5. Changing the easing on a selected keyframe updates the curve shape on the lane and takes effect in the next playback immediately
**Plans**: TBD

### Phase 4: Frame Sequence Video Hero
**Goal**: Creators can upload an MP4, extract frames via ffmpeg WASM in a Web Worker, and scrub through the resulting FrameSequenceScene with no seek latency
**Depends on**: Phase 2
**Requirements**: VID-01, VID-02, VID-03, VID-04, VID-05, VID-06
**Success Criteria** (what must be TRUE):
  1. Creator can upload an MP4 via the Assets panel and see the file name and thumbnail appear without the UI freezing
  2. Creator can click "Extract Frames" and see a live progress indicator (e.g. "Extracting... 47 / 120 frames") while the UI remains fully responsive
  3. After extraction completes, creator can click "Load as Scene" and the viewport switches to the FrameSequenceScene displaying the video frames
  4. Dragging the playhead or scrub handle on the frame sequence scene renders the correct frame instantly in both forward and reverse directions with no visible seek latency
  5. The full Arm Record and playback workflow works on the frame sequence scene identically to the particle scenes
**Plans**: TBD

### Phase 5: Export Standalone Hero
**Goal**: Creators can export a self-contained HTML file that reproduces their choreographed scroll motion using real page scroll, with no editor or server required
**Depends on**: Phase 3, Phase 4
**Requirements**: EXP-01, EXP-02, EXP-03, EXP-04, EXP-05
**Success Criteria** (what must be TRUE):
  1. Creator can click "Export JSON" and receive a `curves.json` file containing all Theatre.js sequence keyframes, values, and easing data
  2. Creator can click "Export Hero" with a particle scene active and receive a standalone `index.html` that opens in a browser without a server
  3. Scrolling the exported particle hero HTML maps real scroll position through the saved curve and drives the particle scene, reproducing all choreographed speed-ups, pauses, and reverses
  4. Creator can click "Export Hero" with a frame sequence scene active and receive a standalone `index.html` (ScrollyVideo.js + original MP4 + curves.json + GSAP ScrollTrigger)
  5. Scrolling the exported video hero HTML drives `ScrollyVideo.setVideoPercentage(curveProgress)` and reproduces the choreographed motion including reverse, with no frame drop or seek jank
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

Note: Phase 3 and Phase 4 both depend on Phase 2 and can be worked in either order, but Phase 5 requires both to be complete.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Live Scene Preview | 2/3 | In Progress|  |
| 2. Playhead, Transport, and Motion Recording | 0/? | Not started | - |
| 3. Curve Editing and Inspector | 0/? | Not started | - |
| 4. Frame Sequence Video Hero | 0/? | Not started | - |
| 5. Export Standalone Hero | 0/? | Not started | - |
