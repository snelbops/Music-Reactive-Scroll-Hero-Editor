---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "docs/architecture.md"
  - "docs/ux-design.md"
---

# Music-Reactive Scroll Hero Editor - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Music-Reactive Scroll Hero Editor, decomposing the requirements from the PRD, Architecture, and UX Design into implementable stories.

## Requirements Inventory

### Functional Requirements

**Core: Progress-Driven Scene Architecture**
FR1: The system must expose a normalized `progress` value (0.0–1.0) that all scene types consume via a `setProgress(p: number)` interface
FR2: The Theatre.js playhead must drive the `progress` value during editor playback
FR3: The exported output must use GSAP ScrollTrigger to map real scroll position through the saved Theatre.js curve to produce the same `progress` value as in the editor

**Scene Types**
FR4: The system must support a Video scene type with two sub-modes: (a) editor preview uses PNG frames loaded as THREE.Texture[] for smooth random-access scrubbing; (b) export uses ScrollyVideo.js `setVideoPercentage(progress)` for compact output
FR5: The system must support an R3F scene type: a React Three Fiber scene whose uniforms/props are driven by `progress` and additional automation lanes
FR6: The particle-lab-package (Orbit preset: GithubTestParticleField + TouchTexture, Classic preset: iframe) must be the first built-in R3F preset

**MP4 → PNG Frame Extraction Pipeline (Editor)**
FR7: The system must convert an MP4 file to a PNG frame sequence using ffmpeg WASM running in a Web Worker (non-blocking) — PNG frames enable smooth, random-access scrubbing in the editor with no keyframe dependency
FR8: The extracted PNG frames must be loaded as THREE.Texture[] via the frameLoader package, with `progress` (0–1) mapping to frame index via `Math.floor(progress × frameCount)`

**ScrollyVideo.js (Export)**
FR8b: The exported hero must use ScrollyVideo.js (`setVideoPercentage(0–1)`) to drive the same MP4 during export playback — providing a compact (~10KB) runtime with perfect reverse support when following the pre-recorded curve

**Editor Viewport**
FR9: The viewport must render the active scene (R3F Canvas or Frame Sequence player) filling the available centre area
FR10: The viewport must display a non-interactive progress indicator overlay (0.00–1.00)
FR11: The viewport must provide a draggable scrub handle that manually sets `progress`, overriding the playhead during scrub
FR12: The viewport must support aspect ratio switching (16:9 / 9:16 / 1:1 / free) and a fullscreen toggle

**Timeline & Transport**
FR13: The system must provide a DAW-style timeline with a transport bar: Play, Stop, Arm Record, Loop, and a time/position display
FR14: The timeline must show a draggable playhead (red vertical line) spanning all lane rows
FR15: The system must provide a Scroll Progress automation lane (bezier curve, 0–1, accent purple)
FR16: The system must provide per-scene parameter lanes (Rotation Speed, Particle Depth, Particle Size) driven by Theatre.js, with teal/green accents
FR17: The system must provide a CSS Opacity automation lane (0–1, accent blue)

**Recording**
FR18: When Arm Record is active and Play is running, dragging the viewport scrub handle must record a live `progress` curve as Theatre.js keyframes on the Scroll Progress lane
FR19: After stopping record, the captured curve must be visible and editable on the timeline with bezier handles

**Left Panel**
FR20: The left panel must provide a Presets section showing built-in scene presets (Orbit Particles, Classic Particles, Frame Sequence); clicking a preset loads it into the viewport
FR21: The left panel must provide an Assets section where users can upload PNG images (for particle source) or a folder of PNG frames (for frame sequence)

**Right Inspector**
FR22: The right inspector must be context-sensitive: show lane defaults when a lane is selected, and show exact value input + easing curve picker when a keyframe is selected
FR23: The easing curve picker must support: ease-in, ease-out, ease-in-out, spring, step, custom bezier

**Export**
FR24: The system must export a standalone HTML file containing: the scene bundle, Theatre.js JSON curve data, and GSAP ScrollTrigger runtime — no server required to view the output
FR25: The system must export the Theatre.js JSON curve data separately for reuse

**Reuse from Existing Project**
FR26: The system must reuse the `frameLoader` package for loading PNG frame sequences
FR27: The `useKickDrumData` hook must be present in the codebase but is deferred to post-v1 audio features

### NonFunctional Requirements

NFR1: The application must run entirely in the browser — no SSR, no server-side execution
NFR2: ffmpeg WASM must run in a Web Worker to avoid blocking the main thread during frame extraction
NFR3: Theatre.js Studio runs in dev mode only; stripped to Theatre.js Core runtime for export
NFR4: v1 supports a single active scene at a time (no layer blending or compositing)
NFR5: v1 audio sync (useKickDrumData, beat markers, BPM display) is deferred — architecture must not preclude it
NFR6: The UI must implement deep dark mode (`#0a0a0f` background), glassmorphism panels, glowing gradient accents on active lanes and playhead, hover glow states
NFR7: Premium feel suitable for portfolio/agency demo (reference: Ableton for left panel, CapCut for viewport controls, Theatre.js Studio for curve handles)

### Additional Requirements

- **Tech stack (fixed):** Theatre.js + ScrollyVideo.js (export) + GSAP ScrollTrigger (CSS effects in export) + React Three Fiber + Three.js + React + Tailwind + ffmpeg WASM (editor frame extraction)
- **Do NOT use:** Remotion
- **PNG frames vs MP4 decision:** Editor preview uses PNG frame sequences (smooth random-access scrub); export uses ScrollyVideo.js (compact, smooth curve playback). GIF is not suitable (256 colour limit).
- **Reuse from existing project:** `frameLoader` package, `useKickDrumData` hook (deferred)
- **Preset to integrate:** `Presets/particle-lab-package` — copy into `src/presets/ParticleLab/`
- **Build sequence (stories must respect this order):** scaffold → viewport + R3F scene → progress interface → Theatre.js timeline + Scroll Progress lane → scene parameter lanes → frame sequence scene + ffmpeg pipeline → left panel presets + assets → right inspector → record mode → export → UI polish

### FR Coverage Map

```
FR1   → Epic 2 — progress (0–1) interface: the core value Theatre.js drives to scenes
FR2   → Epic 2 — Theatre.js playhead drives progress value
FR3   → Epic 6 — GSAP ScrollTrigger maps real scroll → progress curve in exported hero
FR4   → Epic 5 — Video scene type: PNG frames (editor) + ScrollyVideo.js (export)
FR5   → Epic 1 — R3F scene type, first working canvas
FR6   → Epic 1 — particle-lab-package as first built-in preset (Orbit + Classic)
FR7   → Epic 5 — MP4 → PNG extraction via ffmpeg WASM in Web Worker
FR8   → Epic 5 — PNG frames loaded as THREE.Texture[] via frameLoader; progress → frame index
FR8b  → Epic 6 — ScrollyVideo.js setVideoPercentage() in exported hero
FR9   → Epic 1 — viewport renders active scene
FR10  → Epic 2 — progress indicator overlay (0.00–1.00)
FR11  → Epic 2 — draggable viewport scrub handle overrides playhead
FR12  → Epic 1 — aspect ratio switching + fullscreen toggle
FR13  → Epic 2 — transport bar (Play/Stop/Arm/Loop/time display)
FR14  → Epic 2 — draggable red playhead spanning all lane rows
FR15  → Epic 2 — Scroll Progress automation lane (bezier, 0–1, purple)
FR16  → Epic 3 — scene parameter lanes (Rotation Speed, Depth, Size) teal/green
FR17  → Epic 3 — CSS Opacity lane (0–1, blue)
FR18  → Epic 2 — Arm Record + live scrub → Theatre.js keyframes on Scroll Progress lane
FR19  → Epic 2 — captured curve visible and editable with bezier handles post-record
FR20  → Epic 1 — left panel Presets section with built-in scene cards
FR21  → Epic 4 — left panel Assets section for PNG images / frame folders / MP4 upload
FR22  → Epic 3 — context-sensitive right inspector (lane defaults + keyframe value/easing)
FR23  → Epic 3 — easing curve picker (ease-in/out, spring, step, custom bezier)
FR24  → Epic 5 — export standalone HTML (scene + ScrollyVideo runtime + curves.json + GSAP)
FR25  → Epic 5 — export Theatre.js JSON curve data separately
FR26  → Epic 4 — reuse frameLoader package for PNG frame sequence loading
FR27  → Epic 5 — useKickDrumData present in codebase, deferred to post-v1
```

## Epic List

### Epic 1: Live Scene Preview
Creator can open the editor, load the built-in Orbit or Classic particle preset from the left panel, and see it running live in the viewport with aspect ratio and fullscreen controls.
**FRs covered:** FR5, FR6, FR9, FR12, FR20

### Epic 2: Playhead Control & Live Motion Recording
Creator can drive the scene's `progress` value with the timeline playhead and viewport scrub handle, arm record mode to capture live scrub motion as Theatre.js keyframes, and play it back as a reusable automation curve.
**FRs covered:** FR1, FR2, FR10, FR11, FR13, FR14, FR15, FR18, FR19

### Epic 3: Curve Editing & Multi-Lane Parameters
Creator can reshape recorded or hand-drawn automation curves with bezier handles, adjust easing per-keyframe in the right inspector, and animate scene-specific parameters (rotation speed, particle depth/size, CSS opacity) on independent lanes.
**FRs covered:** FR16, FR17, FR22, FR23

### Epic 4: Frame Sequence Video Hero
Creator can import an MP4, extract PNG frames via ffmpeg WASM (in-browser, Web Worker, non-blocking) for smooth editor scrubbing, and use the full timeline/recording workflow. Export uses ScrollyVideo.js for a compact deployable output.
**FRs covered:** FR4, FR7, FR8, FR21, FR26

### Epic 5: Export Standalone Scroll Hero
Creator can export the choreographed scene as a self-contained HTML file where real page scroll — mapped through their saved Theatre.js curves — drives ScrollyVideo.js for the video and GSAP for any CSS effects, reproducing the choreographed motion exactly.
**FRs covered:** FR3, FR8b, FR24, FR25, FR27

---

## Epic 1: Live Scene Preview

Creator can open the editor, load the built-in particle preset, and see it running live in the viewport with aspect ratio and fullscreen controls.
**FRs covered:** FR5, FR6, FR9, FR12, FR20

### Story 1.1: Editor Shell & Project Scaffold

As a creator,
I want to open the editor and see the correct 5-zone dark-mode layout (top nav, left panel, viewport, right inspector, bottom timeline),
So that I have the full workspace in which I'll choreograph animations.

**Acceptance Criteria:**

**Given** a fresh Vite + React + TypeScript project is created
**When** the project is set up
**Then** all dependencies are installed: `@react-three/fiber`, `three`, `@theatre/core`, `@theatre/studio`, `@theatre/r3f`, `gsap`, `lucide-react`, and Tailwind CSS
**And** Tailwind is configured with the `editor.*` custom theme (`bg: #0a0a0f`, `accentPurple: #a855f7`, `accentTeal: #14b8a6`, `accentOrange: #f97316`, `accentGreen: #22c55e`, `accentBlue: #3b82f6`)
**And** the `particle-lab-package` source files are copied into `src/presets/ParticleLab/`

**Given** I open the app in a browser
**When** the page loads
**Then** I see a 5-zone layout: top nav (`h-10`), left panel (`w-[220px]`), centre viewport (`flex-1`), right inspector (`w-[240px]`), bottom timeline (`h-[280px]`)
**And** the background is `#0a0a0f`, panels use glassmorphism (`.glass-panel`), borders use `rgba(255,255,255,0.1)`
**And** all zones are visually distinct and the layout fills the full browser window with no scrollbars

---

### Story 1.2: Orbit Particle Scene in Viewport

As a creator,
I want to see the Orbit particle scene (from the particle-lab-package) running live in the viewport canvas,
So that I immediately have a working, animated scene to choreograph.

**Acceptance Criteria:**

**Given** the editor shell is loaded
**When** the viewport mounts
**Then** the `GithubTestParticleField` R3F scene renders inside a `<Canvas>` filling the viewport area
**And** the particle field animates (rotation, assembly) without interaction
**And** mouse movement over the canvas triggers the touch texture displacement
**And** the scene uses the first sample image by default

---

### Story 1.3: Left Panel Preset Switcher

As a creator,
I want to see a Presets section in the left panel with cards for each built-in scene, and click one to load it into the viewport,
So that I can choose which scene to work with.

**Acceptance Criteria:**

**Given** the editor is open with the Orbit scene loaded
**When** I look at the left panel
**Then** I see a collapsible "Presets" section with cards for "Orbit Particles" and "Classic Particles"
**When** I click the "Classic Particles" card
**Then** the Classic preset (iframe) loads in the viewport, replacing the Orbit scene
**When** I click "Orbit Particles"
**Then** the Orbit R3F scene loads back
**And** the active preset card is visually highlighted

---

### Story 1.4: Viewport Aspect Ratio & Fullscreen

As a creator,
I want to switch the viewport's aspect ratio (16:9 / 9:16 / 1:1 / free) and enter fullscreen,
So that I can preview my hero in the exact target format before choreographing.

**Acceptance Criteria:**

**Given** a scene is running in the viewport
**When** I click an aspect ratio option (16:9, 9:16, 1:1, free)
**Then** the viewport canvas constrains to that ratio, centred in the available space, with letterboxing
**When** I click the fullscreen toggle
**Then** the viewport expands to fill the entire browser window (editor chrome hidden)
**And** pressing Escape or clicking the toggle again restores the editor layout
**And** the scene continues rendering without interruption during all transitions

---

## Epic 2: Playhead Control & Live Motion Recording

Creator can drive the scene's `progress` value with the timeline playhead and viewport scrub handle, arm record mode to capture live scrub motion as Theatre.js keyframes, and play it back as a reusable automation curve.
**FRs covered:** FR1, FR2, FR10, FR11, FR13, FR14, FR15, FR18, FR19

### Story 2.1: Scene `setProgress()` Interface

As a creator,
I want the active scene to visibly react when a `progress` value (0–1) is sent to it,
So that I can confirm the scene is wired up and ready to be driven by the timeline.

**Acceptance Criteria:**

**Given** the Orbit particle scene is loaded in the viewport
**When** a `setProgress(p)` call is made with values between 0 and 1
**Then** the scene's `uAssemble` uniform updates (0 = fully scattered, 1 = fully assembled)
**And** the rotation and depth visibly respond to the progress value
**And** the interface is defined as `SceneAdapter: { setProgress(p: number): void }` so all future scene types implement the same contract

---

### Story 2.2: Theatre.js Timeline & Scroll Progress Lane

As a creator,
I want to see a Scroll Progress lane in the bottom timeline with a draggable playhead,
So that I can position the playhead and watch the scene respond to it.

**Acceptance Criteria:**

**Given** the editor is open
**When** I look at the bottom timeline
**Then** I see a Scroll Progress lane row with a label column (`w-[120px]`) and a track area
**And** a red vertical playhead line spans the full height of all lane rows
**When** I drag the playhead left or right
**Then** the Theatre.js sequence position updates and `setProgress()` is called on the active scene with the corresponding 0–1 value
**And** the scene visibly updates in real time as I drag

---

### Story 2.3: Transport Bar (Play / Stop / Loop)

As a creator,
I want Play, Stop, and Loop controls in the transport bar that animate the playhead through the timeline,
So that I can watch the scene play through my progress curve hands-free.

**Acceptance Criteria:**

**Given** the timeline is visible with a Scroll Progress lane
**When** I click Play
**Then** the Theatre.js sequence plays and the playhead advances, driving `setProgress()` continuously
**And** the scene animates in real time as the playhead moves
**When** I click Stop
**Then** the playhead halts at its current position
**When** Loop is enabled and the playhead reaches the end
**Then** it jumps back to the start and continues playing
**And** the transport bar displays the current playhead time/position

---

### Story 2.4: Viewport Scrub Handle & Progress Overlay

As a creator,
I want to drag a scrub handle directly in the viewport and see a live progress readout,
So that I can organically feel out the scene's motion range before touching the timeline.

**Acceptance Criteria:**

**Given** a scene is running in the viewport
**When** I look at the viewport
**Then** a progress indicator overlay shows the current value (e.g. `0.47`) in a small pill, non-interactive
**And** a draggable scrub handle is visible at the bottom edge of the viewport
**When** I drag the scrub handle left or right
**Then** `setProgress()` is called live with the mapped 0–1 value, overriding the playhead position
**And** the progress overlay updates in sync
**When** I release the scrub handle
**Then** the playhead snaps to the matching position on the timeline
**And** hitting Play from that position continues from where I released

---

### Story 2.5: Arm Record & Live Keyframe Capture

As a creator,
I want to arm record mode and have my scrub handle movements captured as Theatre.js keyframes in real time,
So that my organic scroll performance is preserved exactly as I performed it.

**Acceptance Criteria:**

**Given** the transport bar is visible and the Scroll Progress lane exists
**When** I click the Arm Record (⏺) button
**Then** the button glows red and the Scroll Progress lane highlights to indicate armed state
**When** I click Play while armed and drag the viewport scrub handle
**Then** keyframes are written to the Scroll Progress lane in real time at the current playhead position
**And** the scene responds live to my scrub motion as keyframes are captured
**When** I click Stop
**Then** recording halts and the playhead returns to its pre-record position

---

### Story 2.6: Recorded Curve Playback & Basic Edit

As a creator,
I want to see my recorded motion as an editable curve on the Scroll Progress lane and play it back,
So that I can verify the capture was accurate and make rough adjustments.

**Acceptance Criteria:**

**Given** I have stopped a recording session with keyframes captured
**When** I look at the Scroll Progress lane
**Then** the recorded keyframes are visible as dots on the lane track, connected by a curve
**When** I click Play from the start
**Then** the playhead advances and `setProgress()` replays my exact recorded motion
**And** the scene reproduces the speed-ups, pauses, and reverses I performed
**When** I drag a keyframe dot left or right on the lane
**Then** the curve updates and playback reflects the adjustment

---

## Epic 3: Curve Editing & Multi-Lane Parameters

Creator can reshape recorded or hand-drawn automation curves with bezier handles, adjust easing per-keyframe in the right inspector, and animate scene-specific parameters on independent lanes.
**FRs covered:** FR16, FR17, FR22, FR23

### Story 3.1: Scene Parameter Lanes

As a creator,
I want to see Rotation Speed, Particle Depth, and Particle Size lanes in the timeline — each with their own curve — so that I can animate those scene properties independently of scroll progress.

**Acceptance Criteria:**

**Given** the Orbit particle scene is loaded and the timeline is visible
**When** I look at the timeline
**Then** I see three additional lane rows: Rotation Speed, Particle Depth, Particle Size — each with a teal or green accent colour and a label column
**When** I add keyframes to the Rotation Speed lane at different values
**Then** `GithubTestParticleField.rotationSpeed` updates live as the playhead passes through those keyframes
**And** the same applies to Particle Depth (`depth` prop) and Particle Size (`size` prop)
**And** all three lanes animate simultaneously with the Scroll Progress lane during playback

---

### Story 3.2: CSS Opacity Lane

As a creator,
I want a CSS Opacity lane (0–1) that fades the entire scene in and out,
So that I can choreograph fade-in and fade-out moments as part of my scroll hero.

**Acceptance Criteria:**

**Given** the timeline is visible with scene parameter lanes
**When** I look at the timeline
**Then** I see a CSS Opacity lane with a blue accent colour (`#3b82f6`)
**When** I set keyframes on the CSS Opacity lane (e.g. 0 at start, 1 at midpoint)
**Then** the viewport canvas opacity transitions smoothly between those values during playback
**And** the opacity responds live when scrubbing the playhead through those keyframes

---

### Story 3.3: Right Inspector & Easing Picker

As a creator,
I want the right inspector panel to show me contextual controls — lane defaults when I click a lane, and exact value input plus easing options when I click a keyframe — so that I can make precision edits without touching bezier handles.

**Acceptance Criteria:**

**Given** no lane or keyframe is selected
**When** I look at the right inspector
**Then** it shows generic project info / tips

**Given** I click on a lane row label
**When** the lane is selected
**Then** the inspector shows: lane colour picker and default interpolation mode (step / linear / smooth)

**Given** I click on a keyframe dot on any lane
**When** the keyframe is selected
**Then** the inspector shows: exact numeric value input, and an easing curve picker
**And** the easing picker offers presets: Ease In, Ease Out, Ease In-Out, Spring, Step
**And** a "Custom" option opens a bezier handle editor (4 control points: x1, y1, x2, y2)
**When** I change the easing on a selected keyframe
**Then** the curve shape between that keyframe and the next updates immediately on the lane
**And** playback reflects the new easing

---

## Epic 4: Frame Sequence Video Hero

Creator can import an MP4, extract PNG frames in-browser via ffmpeg WASM, load them as a smooth-scrubbing scene, and use the full timeline and recording workflow on it.
**FRs covered:** FR4, FR7, FR8, FR21, FR26

### Story 4.1: Assets Panel & MP4 Upload

As a creator,
I want an Assets section in the left panel where I can upload an MP4 file,
So that I have a place to manage video source files before converting them.

**Acceptance Criteria:**

**Given** the left panel is visible
**When** I look at the Assets section
**Then** I see an "Assets" collapsible section with an upload button and an empty file list
**When** I click the upload button and select an MP4 file
**Then** the file appears in the Assets list with its filename and a thumbnail frame
**And** the file is held in memory ready for frame extraction
**And** uploading a second MP4 replaces the previous asset in the list

---

### Story 4.2: MP4 → PNG Frame Extraction (ffmpeg WASM)

As a creator,
I want to click "Extract Frames" on an uploaded MP4 and have PNG frames generated in-browser without freezing the UI,
So that I can prepare a video for smooth scroll-scrubbing without leaving the editor.

**Acceptance Criteria:**

**Given** an MP4 is in the Assets list
**When** I click "Extract Frames"
**Then** ffmpeg WASM initialises in a Web Worker (UI remains responsive throughout)
**And** a progress indicator shows extraction progress (e.g. "Extracting… 47 / 120 frames")
**When** extraction completes
**Then** the asset entry updates to show the frame count and total size
**And** the extracted frames are held in memory as `Blob[]` ready for loading

---

### Story 4.3: Frame Sequence Scene in Viewport

As a creator,
I want to load my extracted PNG frames as the active scene and scrub through them with the playhead,
So that I can choreograph a video hero with the same timeline workflow I used for particle scenes.

**Acceptance Criteria:**

**Given** PNG frames have been extracted from an MP4
**When** I click "Load as Scene" on the asset
**Then** the frames load as `THREE.Texture[]` via the `frameLoader` package
**And** the viewport switches to a `FrameSequenceScene` displaying the first frame
**When** I drag the playhead or scrub handle
**Then** `setProgress(p)` maps to `Math.floor(p × frameCount)` and the correct frame renders instantly with no dropped frames or seek latency
**And** reverse scrubbing is as smooth as forward scrubbing
**And** the Arm Record and playback workflow from Epic 2 works identically on this scene

---

## Epic 5: Export Standalone Scroll Hero

Creator can export the choreographed scene as a self-contained HTML file where real page scroll — mapped through their saved Theatre.js curves — drives ScrollyVideo.js for the video and GSAP for any CSS effects, reproducing the choreographed motion exactly.
**FRs covered:** FR3, FR8b, FR24, FR25, FR27

### Story 5.1: Export Theatre.js Curve Data (JSON)

As a creator,
I want to export my Theatre.js automation curves as a standalone JSON file,
So that I can reuse or inspect my choreography data independently of any particular scene.

**Acceptance Criteria:**

**Given** I have a recorded or hand-drawn Scroll Progress curve on the timeline
**When** I click "Export JSON" in the top nav
**Then** a `curves.json` file downloads containing the full Theatre.js sequence data for all lanes
**And** the JSON is human-readable and includes all keyframes, values, and easing data
**And** re-importing the JSON (or using it in the export runtime) reproduces the exact same motion

---

### Story 5.2: Export Particle Scene Hero (Standalone HTML)

As a creator,
I want to export my choreographed particle scene as a standalone HTML file,
So that I can drop it into any webpage and have it play back exactly as I designed it using real scroll.

**Acceptance Criteria:**

**Given** an R3F particle scene is active with a recorded Scroll Progress curve
**When** I click "Export Hero"
**Then** a self-contained `index.html` file downloads bundling: the compiled R3F scene, `curves.json` baked in, and a thin scroll runtime shim
**When** I open the exported HTML in a browser and scroll down
**Then** real scroll position (0–1) is mapped through the saved Theatre.js curve
**And** `setProgress()` drives the particle scene — reproducing my choreographed speed-ups, pauses, and reverses
**And** the file requires no server, no build step, and no external dependencies to view

---

### Story 5.3: Export Frame Sequence Video Hero (ScrollyVideo.js)

As a creator,
I want to export my choreographed video frame sequence as a standalone HTML file using ScrollyVideo.js,
So that I get a compact, high-performance video scroll hero without needing the PNG frames in the export.

**Acceptance Criteria:**

**Given** a frame sequence scene is active with a recorded Scroll Progress curve
**When** I click "Export Hero"
**Then** a self-contained `index.html` downloads bundling: ScrollyVideo.js runtime (~10KB), the original MP4, `curves.json` baked in, and the scroll shim
**When** I open the exported HTML and scroll
**Then** `ScrollyVideo.setVideoPercentage(curveProgress)` drives the MP4 — reproducing the exact choreographed motion
**And** reverse scroll works correctly with no frame drop or seek jank
**And** GSAP ScrollTrigger is available in the bundle for any CSS effects layered around the video

---

### Story 5.4: `useKickDrumData` Hook Scaffolded (Deferred)

As a developer,
I want the `useKickDrumData` hook from the existing project present in the codebase but not wired into the UI,
So that audio sync features can be added in a future milestone without architectural changes.

**Acceptance Criteria:**

**Given** the project source exists
**When** I look at `src/packages/useKickDrumData.ts`
**Then** the hook is present, typed, and exports correctly
**And** it is not imported or called anywhere in the editor UI
**And** a comment in the file marks it as `// deferred: audio sync — v2`
