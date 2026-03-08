# External Integrations

**Analysis Date:** 2026-03-08

## APIs & External Services

**Animation Engine:**
- Theatre.js (`@theatre/core`, `@theatre/studio`, `@theatre/r3f`) - Keyframe timeline and animation sequencing
  - SDK: `@theatre/core` for runtime, `@theatre/studio` for dev-only inspector overlay
  - Auth: None — local, client-side only
  - Integration point: `scroll-hero-editor/src/theatre/core.ts`, `scroll-hero-editor/src/theatre/TheatreSync.tsx`
  - Studio overlay is mounted at app root only in `import.meta.env.DEV` mode (`scroll-hero-editor/src/main.tsx`)

**Video Scrolling:**
- ScrollyVideo.js (`scrolly-video` 0.0.24) - Frame-accurate video scrubbing driven by scroll/playhead position
  - SDK: `scrolly-video/dist/ScrollyVideo.esm.jsx`
  - Auth: None
  - Integration point: `scroll-hero-editor/src/preview/ScrollyVideoPlayer.tsx`
  - Default test video: `https://scrollyvideo.js.org/goldengate.mp4` (hardcoded in `scroll-hero-editor/src/store/useStore.ts`)

**Tailwind CDN (prototype only):**
- `https://cdn.tailwindcss.com?plugins=forms,container-queries`
  - Used only in `stitch-frontEnd-draft/code.html`
  - Not used in the React app (which uses the Vite plugin instead)

## Data Storage

**Databases:**
- None — no backend, no database

**File Storage:**
- Local filesystem only — user-supplied video files loaded via `videoUrl` string in Zustand store
- Public asset: `scroll-hero-editor/public/hero.mp4` (AI video input for development)
- Theatre.js persists keyframe state to `localStorage` by default (standard Theatre.js behavior via `getProject`)

**Caching:**
- None beyond browser-native caching

## Authentication & Identity

**Auth Provider:**
- None — fully client-side tool with no user accounts or auth

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- `console.log` only
- `frameLoader.ts` uses mock `console.log` stubs for frame loading
- ScrollyVideoPlayer has a silent `catch` block for a known ScrollyVideo mount bug (`scroll-hero-editor/src/preview/ScrollyVideoPlayer.tsx` line 19-21)

## CI/CD & Deployment

**Hosting:**
- Not configured — no deployment config detected

**CI Pipeline:**
- None detected — no `.github/workflows/`, no CI config files

## Environment Configuration

**Required env vars:**
- None — no environment variables required

**Secrets location:**
- None — no secrets, no `.env` files

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Audio Analysis

**Current state:**
- Audio analysis is mocked in `scroll-hero-editor/src/packages/useKickDrumData.ts`
- Returns hardcoded beat timestamps `[1.2, 2.4, 3.6, 4.8, 6.0]` and a synthetic sine-wave `Float32Array`
- The Web Audio API (`AudioContext`, `AnalyserNode`) is the intended real integration target per PRD, but not yet implemented
- `audioUrl` state is `null` by default; user imports audio via the left panel UI

## Planned But Not Yet Integrated

These are referenced in project planning docs and dependency list but not used in current source:

- **GSAP** (`gsap` 3.14.2) - Intended for CSS animation output in exported hero bundles; dependency installed, not imported anywhere in `src/`
- **React Three Fiber** (`@react-three/fiber`, `@react-three/drei`, `three`) - Intended for 3D particle effects viewport layer; dependencies installed, not used in current `src/`
- **Web Audio API** - Browser-native API for real beat detection; `useKickDrumData.ts` is the stub that will wrap it

---

*Integration audit: 2026-03-08*
