# Coding Conventions

**Analysis Date:** 2026-03-08

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` (e.g., `Layout.tsx`, `Timeline.tsx`, `GhostTrailCanvas.tsx`)
- Custom hooks: camelCase prefixed with `use` (e.g., `useKickDrumData.ts`, `useStore.ts`)
- Non-hook modules: camelCase `.ts` (e.g., `frameLoader.ts`, `core.ts`)
- Directories: camelCase (e.g., `scroll-hero-editor/src/editor/`, `scroll-hero-editor/src/preview/`, `scroll-hero-editor/src/packages/`)

**Functions / Components:**
- React components: PascalCase default exports (e.g., `export default function Layout()`, `export default function TheatreSync()`)
- Event handlers: prefixed with `handle` (e.g., `handleImportVideo`, `handleLanesMouseDown`, `handleMouseMove`, `handleClick`)
- Boolean state setters: prefixed with `set` (e.g., `setIsPlaying`, `setScrollProgress`, `setIsRecording`)
- Toggle functions: prefixed with `toggle` (e.g., `toggleRecording`)

**Variables:**
- camelCase throughout (e.g., `scrollProgress`, `lanesWidth`, `timelineZoom`, `recordedEvents`)
- Constants: SCREAMING_SNAKE_CASE for module-level constants (e.g., `LABEL_W`, `ZOOM_LEVELS`, `VB_W`, `VB_H`, `SEQUENCE_DURATION`, `TRAIL_MAX_AGE`)
- Boolean state variables: prefixed with `is` (e.g., `isPlaying`, `isRecording`, `isReady`, `isPresetsOpen`)

**Types / Interfaces:**
- PascalCase (e.g., `RecordedEvent`, `KickDrumData`, `EditorState`)
- Interfaces for data shapes: named descriptively without `I` prefix (e.g., `RecordedEvent`, not `IRecordedEvent`)

## Code Style

**Formatting:**
- No Prettier config detected — formatting is inconsistent in a few places (see `Timeline.tsx` lines 74–75 with long single-line handlers)
- 4-space indentation in `.tsx`/`.ts` source files
- Single quotes for imports (e.g., `import { create } from 'zustand'`)

**Linting:**
- ESLint 9 flat config at `scroll-hero-editor/eslint.config.js`
- Rules: `@eslint/js` recommended + `typescript-eslint` recommended + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
- Applies to `**/*.{ts,tsx}` only; `dist/` is ignored
- ecmaVersion: 2020, globals: browser

**TypeScript:**
- Strict mode enabled (`"strict": true`) at `scroll-hero-editor/tsconfig.app.json`
- `noUnusedLocals` and `noUnusedParameters` enforced
- `noFallthroughCasesInSwitch` enforced
- `verbatimModuleSyntax` enabled — type-only imports must use `import type`
- Target: ES2022, module: ESNext, bundler resolution

## Import Organization

**Order observed:**
1. React and third-party packages (e.g., `import { useRef, useEffect } from 'react'`)
2. External library imports (e.g., `import { create } from 'zustand'`, `import { Play, Pause } from 'lucide-react'`)
3. Local store/shared modules (e.g., `import { useStore } from '../store/useStore'`)
4. Local sibling/feature imports (e.g., `import { pushGhostPoint } from './GhostTrailCanvas'`)

**Path Aliases:**
- None configured. All imports use relative paths (e.g., `../store/useStore`, `../theatre/core`, `./GhostTrailCanvas`).

## Error Handling

**Patterns:**
- Silent catch for known third-party bugs: `try { ... } catch (err) { // comment explaining the bug }` — used in `scroll-hero-editor/src/preview/ScrollyVideoPlayer.tsx` for ScrollyVideo's React wrapper binding bug
- Guard clauses with early return: `if (!audioUrl) return;`, `if (!el) return;`, `if (!file) return;`
- Optional chaining for potentially null refs: `overlayRef.current?.getBoundingClientRect()`, `e.target.files?.[0]`
- No global error boundaries or try/catch for async work (no async patterns outside the Theatre.js RAF loop)

## Logging

**Framework:** `console.log` only

**Patterns:**
- Mock/stub logging for unimplemented features: `console.log('Mock loading frame ...')` in `scroll-hero-editor/src/packages/frameLoader.ts`
- No structured logging or log levels
- No production log suppression

## Comments

**When to Comment:**
- Block comments above components that have non-obvious side-effect architecture (e.g., `GhostTrailCanvas`, `RecordMode`, `TheatreSync` each have JSDoc-style block comments explaining the design rationale)
- Inline comments for magic numbers or non-obvious values (e.g., `// normalised 0–1 along sequence`, `// 60fps throttle`, `// Mock simplistic mapping out of 10 seconds total width`)
- Section dividers using `{/* Lane 1: Audio */}` JSX comments inside render

**JSDoc/TSDoc:**
- Partial usage: some components have a leading block comment (not formal JSDoc tags), others have none
- Interface properties are commented inline (e.g., `RecordedEvent` in `scroll-hero-editor/src/store/useStore.ts`)

## Function Design

**Size:** Components are medium-length; `Timeline.tsx` is the largest at ~285 lines — acceptable for a DAW-style component with many inline lane renders

**Parameters:** Prefer destructuring from Zustand store via selector functions rather than prop drilling (e.g., `const isPlaying = useStore(state => state.isPlaying)`)

**Return Values:**
- Components return JSX or `null` (e.g., `TheatreSync` returns `null`, `RecordMode` conditionally returns `null` when not recording)
- Hooks return typed objects (e.g., `useKickDrumData` returns `KickDrumData`)
- Utility functions return plain values or `void`

## Module Design

**Exports:**
- React components: default export only (no named exports from component files)
- Shared utilities/constants: named exports (e.g., `export const sheet`, `export const SEQUENCE_DURATION`, `export function pushGhostPoint`)
- Store: named export `useStore` + named export for `RecordedEvent` interface from `scroll-hero-editor/src/store/useStore.ts`

**Barrel Files:**
- Not used. Each module is imported directly by relative path.

## State Management Pattern

- Global state via Zustand flat store at `scroll-hero-editor/src/store/useStore.ts`
- State is accessed via granular selector functions (`useStore(state => state.isPlaying)`) — not whole-store subscriptions
- Mutations are performed via actions co-located in the store definition (setter functions in the `create()` call)
- For performance-critical paths (RAF loop in `TheatreSync`), state is read imperatively via `useStore.getState()` to avoid stale closures

## Tailwind Usage

- Tailwind v4 via `@tailwindcss/vite` plugin
- Theme tokens defined in `scroll-hero-editor/src/index.css` under `@theme` (e.g., `--color-editor-accent-purple`, `--color-editor-border`)
- CSS utilities defined in `@layer utilities` for `.glass-panel`, `.thin-scrollbar`, `.waveform-bg`
- Tailwind classes used inline on JSX elements; no `cn()` / `clsx()` utility wrappers used in component files (packages are present but not yet applied)
- Arbitrary values are common (e.g., `w-[220px]`, `h-[280px]`, `text-[10px]`, `bg-black/40`)

---

*Convention analysis: 2026-03-08*
