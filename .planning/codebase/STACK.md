# Technology Stack

**Analysis Date:** 2026-03-08

## Languages

**Primary:**
- TypeScript 5.9.x - All source in `scroll-hero-editor/src/`
- HTML/CSS - Static prototype in `stitch-frontEnd-draft/code.html`

**Secondary:**
- JavaScript - Root `package.json` scripts (workflow helpers only, no app code)

## Runtime

**Environment:**
- Browser (no server-side runtime)
- ES2022 target (configured in `scroll-hero-editor/tsconfig.app.json`)

**Package Manager:**
- npm
- Lockfile: `scroll-hero-editor/package-lock.json` present

## Frameworks

**Core:**
- React 19.2.x - UI component framework (`scroll-hero-editor/src/`)
- Vite 7.3.x - Dev server and build bundler (`scroll-hero-editor/vite.config.ts`)

**Styling:**
- Tailwind CSS 4.2.x - Utility-first CSS via `@tailwindcss/vite` Vite plugin
  - Config via CSS `@theme` block in `scroll-hero-editor/src/index.css`
  - Custom utility classes in `scroll-hero-editor/src/index.css` (`@layer utilities`)
  - Static prototype uses Tailwind CDN at `https://cdn.tailwindcss.com?plugins=forms,container-queries`

**Testing:**
- Not configured — `package.json` test script is a placeholder echo

**Build/Dev:**
- TypeScript compiler (`tsc`) — type checking only, no emit
- `@vitejs/plugin-react` — React Fast Refresh + JSX transform

## Key Dependencies

**Critical:**
- `@theatre/core` 0.7.2 - Keyframe animation engine; drives `scrollControlsObj`, `audioPulseObj`, `mouseInputObj` via `scroll-hero-editor/src/theatre/core.ts`
- `@theatre/studio` 0.7.2 - Dev-only animation inspector overlay; loaded conditionally in `import.meta.env.DEV` block in `scroll-hero-editor/src/main.tsx`
- `@theatre/r3f` 0.7.2 - Theatre.js integration for React Three Fiber (imported as dependency, not yet used in source files)
- `scrolly-video` 0.0.24 - Frame-accurate video scrubbing component; wrapped in `scroll-hero-editor/src/preview/ScrollyVideoPlayer.tsx`; hand-typed declaration in `scroll-hero-editor/src/scrolly-video.d.ts`
- `zustand` 5.0.11 - Global app state store at `scroll-hero-editor/src/store/useStore.ts`
- `gsap` 3.14.2 - Animation library (imported as dependency, not yet used in source files)

**3D / Canvas:**
- `three` 0.183.2 - 3D library (dependency; not yet used in source)
- `@react-three/fiber` 9.5.0 - React renderer for Three.js (dependency; not yet used in source)
- `@react-three/drei` 10.7.7 - Three.js helpers (dependency; not yet used in source)

**UI Utilities:**
- `lucide-react` 0.577.0 - Icon set used in transport bar (`scroll-hero-editor/src/editor/Timeline.tsx`)
- `clsx` 2.1.1 - Conditional className utility (imported as dependency)
- `tailwind-merge` 3.5.0 - Tailwind class conflict resolver (imported as dependency)

## Configuration

**Environment:**
- No `.env` files present
- No environment variables required at build time
- `import.meta.env.DEV` used to gate Theatre.js studio initialization

**Build:**
- `scroll-hero-editor/vite.config.ts` — minimal config: `react()` + `tailwindcss()` plugins
- `scroll-hero-editor/tsconfig.app.json` — strict TypeScript, ES2022, bundler module resolution, `noEmit: true`
- `scroll-hero-editor/tsconfig.node.json` — separate config for Vite config file itself
- `scroll-hero-editor/eslint.config.js` — flat config with `typescript-eslint`, `react-hooks`, `react-refresh`

## Platform Requirements

**Development:**
- Node.js (version not pinned — no `.nvmrc` or `.node-version` file)
- Run from `scroll-hero-editor/` directory: `npm run dev`

**Production:**
- Static file output via `npm run build` (outputs to `scroll-hero-editor/dist/`)
- No server required — all browser-side

## Project Duality

This repo contains two distinct artifacts:

| Artifact | Path | Tech | Status |
|----------|------|------|--------|
| Static HTML prototype | `stitch-frontEnd-draft/code.html` | HTML + Tailwind CDN + minimal JS | Visual only, no build |
| React app (WIP) | `scroll-hero-editor/` | React + Vite + TypeScript + Theatre.js | Active development |

The static prototype uses an inline `tailwind.config` script block and CDN delivery. The React app uses Tailwind 4 via Vite plugin with CSS `@theme` configuration.

---

*Stack analysis: 2026-03-08*
