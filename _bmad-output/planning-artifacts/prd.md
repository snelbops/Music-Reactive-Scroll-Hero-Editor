# Music-Reactive Scroll Hero Editor — PRD

## Unique Value

> This app captures what DaVinci Resolve cannot — live scroll/jog motion recorded as reusable automation keyframes. Fullscreen viewport for organic input capture (mouse wheel, trackpad, jog wheel emulation), with DAW-style timeline editing (bezier curves, snap-to-beat, multi-lane parameters) to choreograph scroll speed, direction, and reverse exactly as performed. The innovation is turning ephemeral scrubbing into editable, music-synced scroll hero code.

---

## Decision: Fresh Start (Not Remotion)

**Stack: Theatre.js + GSAP ScrollTrigger + ScrollyVideo.js + React + Tailwind + Web Audio API**

### Why Not Remotion
- Output is scroll-driven HTML/JS, not MP4 — Remotion renders video, not webpages
- Scroll position ≠ Remotion frames — incompatible primary axes
- No curve editor UI — would be a full custom build regardless
- Live mouse/input recording — outside Remotion's model entirely

### Reuse From Existing Project
- `frameLoader` package (Story 1.3)
- `useKickDrumData` hook (audio onset/RMS detection)

### Do NOT Port
- Remotion compositions or rendering pipeline
- @remotion/three integration

---

## Project Overview

A DAW-style web editor that lets creators take AI-generated video clips (Seedance, Kling,
Veo3, etc.) and choreograph them as scroll-driven webpage heroes. Scroll behaviour is
controlled via a timeline — manually, recorded from live input, or drawn as automation
curves — and optionally synced to an audio track.

Inspired by the "AI Video + Claude Code = Scrollable Web Hero" technique (scroll position
mapped to pre-extracted PNG frames of an AI video), extended into a full interactive editor
with Theatre.js automation lanes, audio sync, and live input recording.

---

## Core Concept

The app treats a scrollable webpage viewport (not a standard video player) as the output
canvas. A playhead on a DAW-style timeline drives the scroll position of that viewport.
The user controls when and how the page scrolls — speed, direction, reverse, easing — not
just what plays.

Mouse interactions (clicks, drags, x/y position) are recorded to the timeline as keyframes
and can be repositioned to align with audio beats, making interactions appear music-triggered.

---

## App Layout

### Three-Column + Bottom Panel

```
┌──────────┬──────────────────────────────┬────────────┐
│  LEFT    │      VIEWPORT (centre)        │  INSPECTOR │
│  PANEL   │                              │            │
│          │  Scrollable hero preview      │  Keyframe  │
│ Presets  │  MP4 / Three.js / CSS scene   │  value     │
│ Assets   │                              │  input     │
│ Layers   │  Scroll progress indicator   │            │
│ Effects  │  Expand / fullscreen / ratio  │  Easing    │
│ History  │  Ghost mouse trail overlay    │  curve     │
│          │  (during record mode)         │  picker    │
└──────────┴──────────────────────────────┴────────────┘
┌─────────────────────────────────────────────────────────┐
│  TIMELINE / AUTOMATION LANES                            │
│                                                         │
│  ▶ Transport: Play / Stop / Arm Record / Loop / BPM     │
│                                                         │
│  AUDIO      │▓▓▓▓░░▓▓▓░░░▓▓▓▓░░▓▓░░░░░▓▓░░▓▓▓▓░░░│     │
│             │ Beat markers auto-snap to lanes    │     │
│                                                         │
│  Mouse X    │ ~~~keyframe curve~~~                │     │
│  Mouse Y    │ ~~~keyframe curve~~~                │     │
│  Click      │  -         -     -         -       │     │
│                                                         │
│  Scroll Pos │ ~~~bezier curve~~~                  │     │
│  Scroll Spd │ ~~~bezier curve~~~                  │     │
│  Scroll Dir │ step: +1 / -1 / 0                   │     │
│  Scroll Vel │ ~~~damping/momentum curve~~~         │     │
│                                                         │
│  Particle Size   │ curve │                             │
│  Particle Count  │ curve │                             │
│  Particle Speed  │ curve │                             │
│  Particle Spread │ curve │                             │
│                                                         │
│  Camera X / Y / Z │ curve │                            │
│                                                         │
│  CSS Opacity  │ curve │                                │
│  CSS Blur     │ curve │                                │
│  CSS Scale    │ curve │                                │
│  CSS Colour   │ colour keyframes │                     │
│                                                         │
│  Trigger Lane │ -  one-shot events (burst, text reveal) │
│  Blend/XFade  │ cross-fade between scenes / videos     │
└─────────────────────────────────────────────────────────┘
```

---

## Left Panel

- **Presets** — Three.js particle presets (image-to-particle, galaxy, fluid), CSS scroll
  presets, saved scroll curves
- **Assets** — import MP4, images (for particle source), audio files
- **Layers** — stack multiple Three.js scenes or video layers
- **Effects** — post-processing FX (bloom, chromatic aberration, vignette) draggable onto
  layers
- **History** — visible undo/redo stack

---

## Right Inspector Panel

Contextual panel updates when a lane, keyframe, or layer is selected:

- Exact value input (e.g. X: 423px, Y: 211px)
- Easing curve picker (ease-in, ease-out, spring, custom bezier)
- Interpolation mode (step / linear / smooth)
- Snap-to-beat toggle
- Lane colour picker

---

## Video / Scene Input Pipeline

1. User imports MP4 (Seedance / Kling / Veo3) via Assets panel
2. In editor preview: ScrollyVideo.js handles MP4 → scroll scrub natively
3. Alternatively: load Three.js preset from left panel (image-to-particle, etc.)
4. On export: GSAP ScrollTrigger + ScrollyVideo.js runtime bundled in output HTML

```tsx
import ScrollyVideo from 'scrolly-video/dist/ScrollyVideo.jsx';

<ScrollyVideo
  src="seedance-hero.mp4"
  trackScroll={false}
  ref={playerRef}
/>

// Theatre.js drives scrub position:
playerRef.current.setVideoPercentage(scrollProgress); // 0–1
```

---

## Mouse Recording Flow

1. Load Three.js image-to-particle preset in left panel
2. Arm Mouse X, Mouse Y, and Click lanes
3. Hit record → interact with viewport (click, drag particles)
4. Lanes fill with captured keyframes in real time
5. Stop record → keyframes appear on timeline
6. Drag click keyframe to align with audio spike
7. Playback — viewport replays interactions at exact beat positions

### Ghost Playback Overlay
During recording, a faint trail of mouse position from the last 2 seconds is overlaid
on the viewport — helps confirm what has been captured without stopping.

---

## Three.js Interactivity (Theatre.js + R3F)

Previous issue: Three.js mouse events were lost inside Remotion's preview layer.
Fix: @theatre/r3f binds directly to gl.domElement — mouse events work inside viewport
and Theatre.js records them simultaneously.

```tsx
import {getProject, types} from '@theatre/core';
import studio from '@theatre/studio';
import {editable as e, SheetProvider} from '@theatre/r3f';

const project = getProject('Scroll Hero Editor');
const sheet = project.sheet('Scene');

const AnimatedMesh = e('mesh', {
  position: types.compound({
    x: types.number(0),
    y: types.number(0),
  })
});
```

---

## Audio Sync

- Reuse `useKickDrumData` hook from existing project
- Load audio: `<input type="file" accept="audio/*" />`
- `AnalyserNode` → `getFloatFrequencyData()` → onset/peak detection
- Peaks auto-place keyframe markers on all lanes
- Markers are draggable for fine alignment
- BPM display in transport bar

---

## Export Options

1. **Scroll Hero HTML/JS** — standalone scroll-driven webpage
   (ScrollyVideo.js runtime + GSAP ScrollTrigger + Theatre.js JSON curves)
2. **JSON curve data** — exportable Theatre.js sequence for reuse across projects
3. *(v2)* MP4 bake — render scroll animation to video

---

## UI Style

- Deep dark mode (near-black backgrounds)
- Glassmorphism panels (frosted glass, blur backdrop, subtle borders)
- Glowing gradient accents on active lanes and playhead
- Hover states with subtle glow
- Premium feel — suitable for portfolio / agency demo
- Reference: Ableton (left panel proportions), CapCut (centre viewport controls)

---

## Tech Stack Summary

| Role | Tool |
|------|------|
| Timeline + curve editor + record | Theatre.js |
| Scroll scrub in preview | ScrollyVideo.js |
| Scroll runtime in export | GSAP ScrollTrigger |
| Three.js + record integration | @theatre/r3f + React Three Fiber |
| Audio analysis | Web Audio API + useKickDrumData |
| UI | React + Tailwind |
| UI design | Stitch (concepts) → v0.dev (React/Tailwind) → Claude Code |

---

## Project Structure

```
scroll-hero-editor/
├── src/
│   ├── editor/
│   │   ├── LeftPanel.tsx           # Presets, assets, layers, effects, history
│   │   ├── Viewport.tsx            # Centre preview, scroll indicator, ghost trail
│   │   ├── Inspector.tsx           # Right panel, contextual keyframe controls
│   │   ├── Timeline.tsx            # Theatre.js studio + transport bar
│   │   ├── AudioLane.tsx           # Waveform + beat markers
│   │   ├── AutomationLane.tsx      # Reusable curve lane component
│   │   └── RecordMode.tsx          # Arm + capture to Theatre.js keyframes
│   ├── preview/
│   │   ├── ScrollViewport.tsx      # Tall scrollable hero pane
│   │   └── ScrollyVideoPlayer.tsx  # ScrollyVideo.js wrapper
│   ├── three/
│   │   └── ParticlePreset.tsx      # Image-to-particle Three.js scene
│   ├── packages/
│   │   ├── frameLoader.ts          # Reused from existing project
│   │   └── useKickDrumData.ts      # Reused from existing project
│   └── export/
│       └── generateHero.ts         # Outputs standalone HTML/JS/CSS bundle
├── public/
│   └── hero.mp4
├── MUSIC_SCROLL_HERO_PRD.md
└── package.json
```

---

## Build Priority (Claude Code Sessions)

1. Scaffold project, install deps (Theatre.js, ScrollyVideo.js, GSAP, R3F)
2. Centre viewport + ScrollyVideoPlayer wired to basic playhead
3. Theatre.js timeline panel with Scroll Position lane
4. Add Speed, Direction, Velocity lanes
5. Left panel shell (presets, assets, layers)
6. Audio lane (useKickDrumData + waveform display)
7. Mouse X / Y / Click recording lanes + ghost trail overlay
8. Three.js particle preset via @theatre/r3f
9. Right inspector panel
10. Export → generateHero.ts
11. UI polish (glassmorphism, glow, dark mode)

---

## Key Constraints

- No n8n integration
- Single audio track for v1
- MP4 input only (Seedance / Kling / Veo3 exports)
- Must run in browser (no SSR)
- Theatre.js Studio only in dev mode; strips to runtime for export
