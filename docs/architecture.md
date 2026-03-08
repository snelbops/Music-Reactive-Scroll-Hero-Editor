# Architecture — Music-Reactive Scroll Hero Editor

## Core Abstraction: The `progress` Value

Everything in this editor revolves around a single normalized `progress` value (0.0 → 1.0).

- In the **editor**, Theatre.js owns and animates this value via a timeline playhead
- In the **exported output**, real scroll position is mapped through the saved Theatre.js curve — ScrollyVideo.js handles the video scrub, GSAP handles CSS effects around it
- Every scene type consumes `progress` in its own way — the editor doesn't care how

This separation means the editor is really a **progress curve editor**. The user draws, records, or shapes how `progress` moves over time, and the scene reacts.

---

## Scene / Asset Types

The editor supports two scene types, both driven by the same `progress` interface:

### 1. Video Scene — PNG Frames in Editor, ScrollyVideo.js in Export

**The key insight:** scrubbing and playback are different problems.

| Context | Tool | Why |
|---|---|---|
| **Editor preview** (live scrub / recording) | PNG frame sequence → `THREE.Texture[]` | True random access — each frame independently decodable, instant swap, zero keyframe dependency |
| **Exported hero** (playing a pre-recorded curve) | ScrollyVideo.js | Smaller output file; smooth enough when following a smooth curve rather than random-seeking |

> **GIF is not suitable** — 256 colour limit degrades real video footage.

**Editor pipeline (smooth scrubbing):**
```
MP4 source
  → ffmpeg WASM (Web Worker, non-blocking)
  → PNG frame sequence: frame-0001.png … frame-N.png
  → loaded as THREE.Texture[] via frameLoader
  → progress (0–1) × frameCount → instant texture swap on mesh
```

**Export pipeline:**
```
Same MP4 source
  → <ScrollyVideo src="hero.mp4" trackScroll={false} ref={playerRef} />
  → thin runtime shim reads curves.json at scroll position
  → playerRef.current.setVideoPercentage(curveProgress)
```

**Interface (same for both):**
```ts
interface VideoScene {
  setProgress(p: number): void;
  // Editor: swaps THREE.Texture at index Math.floor(p * frameCount)
  // Export: calls ScrollyVideo.setVideoPercentage(p)
}
```

### 2. R3F Scene (Three.js / React Three Fiber)

For programmatic 3D scenes like the particle-lab-package.

**Current preset:** `GithubTestParticleField` (Orbit) and Classic (iframe)

**The `progress` value maps to scene-specific uniforms/props**, e.g.:
- `uAssemble` (0→1): particle assembly animation
- `uTime`: time-based rotation driven by accumulated progress delta
- Custom mappings defined per preset

**Interface consumed by scene:**
```ts
interface R3FScene {
  setProgress(p: number): void; // scene interprets as it likes
}
```

Both scene types expose the same `setProgress(p: number)` interface to Theatre.js.

---

## Tech Stack

| Role | Tool | Notes |
|------|------|-------|
| Timeline / keyframe automation | Theatre.js | Owns the playhead and `progress` curves |
| Video → PNG frames (editor) | ffmpeg WASM (`@ffmpeg/ffmpeg`) | Runs in Web Worker; PNG frames = smooth scrubbing |
| Video frame rendering (editor) | Three.js `Texture[]` + `frameLoader` | Instant random-access frame swap |
| Video scrub (export) | ScrollyVideo.js | `setVideoPercentage(0–1)`; smooth curve playback, ~10KB |
| 3D scenes | React Three Fiber + Three.js | R3F scenes as presets |
| CSS effects in export | GSAP ScrollTrigger | Parallax, text reveals — NOT the video scrub driver |
| UI | React + Tailwind | Editor shell |
| Existing reusable code | `frameLoader`, `useKickDrumData` | `frameLoader` central to video scene; `useKickDrumData` deferred |

---

## Editor Data Flow

```
User draws/records progress curve on timeline
         ↓
Theatre.js playhead position → current `progress` value (0–1)
         ↓
Active scene adapter: setProgress(progress)
         ↓
  ┌────────────────────────┬──────────────────────────────┐
  │ MP4 Video Scene        │ R3F Scene                    │
  │ ScrollyVideo.js:       │ uniforms.uAssemble.value =   │
  │ setVideoPercentage(p)  │ p, rotation = p * 2π, etc.   │
  └────────────────────────┴──────────────────────────────┘
         ↓
Rendered in Viewport
```

---

## Theatre.js Automation Lanes

The primary automation lane is **Scroll Progress** — a bezier/step curve from 0 to 1 that the playhead reads. Additional lanes drive scene-specific parameters independently:

| Lane | Value | Target |
|------|-------|--------|
| Scroll Progress | 0–1 | Scene's `setProgress()` |
| Rotation Speed | 0–0.5 | `GithubTestParticleField.rotationSpeed` |
| Particle Depth | 0.5–10 | `GithubTestParticleField.depth` |
| Particle Size | 0.1–3 | `GithubTestParticleField.size` |
| CSS Opacity | 0–1 | Overlay / blend layer |
| (future) Mouse X/Y | 0–1 normalized | Touch texture injection |
| (future) Camera X/Y/Z | world units | R3F camera |

---

## Playhead Automation — Key Behaviors

This is the core creative value of the editor. The `progress` curve can be shaped to produce:

| Curve shape | Effect |
|-------------|--------|
| Linear ramp 0→1 | Normal forward scroll at constant speed |
| Steep ramp | Fast scroll / scrub |
| Flat section | Pause / hold at a frame |
| Negative slope | Reverse scroll (ScrollyVideo.js handles this perfectly) |
| Ease-in/out | Smooth acceleration / deceleration |
| Oscillation | Back-and-forth scroll loop |

Users draw this curve on the timeline, or record it by physically dragging a scrubber in real time.

---

## Export Architecture

The exported output is a self-contained HTML file. The roles are split:

```
export/
├── index.html        ← entry point
├── scrolly-video.js  ← ScrollyVideo.js runtime (video scrub)
├── gsap.js           ← GSAP + ScrollTrigger (CSS effects / parallax)
└── curves.json       ← Theatre.js sequence data (baked progress curve)
```

**In the exported output:**
- Real scroll position (0–1) is read by a thin runtime shim
- The shim looks up `progress` from `curves.json` at the current scroll position
- `ScrollyVideo.setVideoPercentage(progress)` drives the video
- GSAP ScrollTrigger drives any CSS effects (text reveals, overlays, parallax) layered around the video

**Why both in export:**
- ScrollyVideo = the video scrub (purpose-built, perfect reverse)
- GSAP = CSS polish around it (text reveals, overlay transitions, parallax layers)

---

## Project Source Structure (planned)

```
src/
├── editor/
│   ├── App.tsx                    # Root layout (5-zone shell)
│   ├── LeftPanel.tsx              # Presets, assets, layers
│   ├── Viewport.tsx               # Canvas area + progress overlay
│   ├── Inspector.tsx              # Right panel (keyframe value, easing)
│   ├── Timeline.tsx               # Theatre.js studio + transport bar
│   └── AutomationLane.tsx         # Reusable lane row component
├── scenes/
│   ├── SceneAdapter.ts            # setProgress() interface
│   ├── VideoScene.tsx             # ScrollyVideo.js wrapper
│   └── R3FScene.tsx               # Generic R3F scene wrapper
├── presets/
│   ├── ParticleLab/               # From particle-lab-package
│   │   ├── GithubTestParticleField.tsx
│   │   └── TouchTexture.ts
│   └── index.ts                   # Preset registry
├── packages/
│   ├── frameLoader.ts             # PNG frame sequence fallback
│   └── useKickDrumData.ts         # Audio onset detection (future)
└── export/
    └── generateHero.ts            # Bundles scene + curves → standalone HTML
```

---

## Key Constraints

- Browser-only — no Node.js/SSR at runtime
- Theatre.js Studio (dev UI) only active in development; stripped for export
- v1: single scene active at a time (no layer blending)
- v1: no audio sync (useKickDrumData deferred)
- ScrollyVideo.js requires WebCodecs API (supported in all modern browsers: Chrome 94+, Safari 16.4+, Firefox 130+)
