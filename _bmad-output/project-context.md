---
project_name: 'Music-Reactive Scroll Hero Editor'
user_name: 'John'
date: '2026-03-08'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 42
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- React 19.2.0
- TypeScript ~5.9.3 (strict mode — see rules below)
- Vite 7.3 + @vitejs/plugin-react
- Tailwind CSS 4.2 via @tailwindcss/vite (NOT PostCSS plugin — v4 architecture)
- Zustand 5.0.5
- scrolly-video 0.0.24
- lucide-react 0.511

**To install (per PRD, not yet in package.json):**
- @theatre/core, @theatre/studio, @theatre/r3f
- gsap (ScrollTrigger)
- @react-three/fiber, @react-three/drei, three

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- `strict: true` — all strict checks enabled; no `any` without explicit cast
- `noUnusedLocals` + `noUnusedParameters` — remove unused vars/params before committing; agents must not leave stub parameters
- `erasableSyntaxOnly: true` — use `import type { Foo }` for type-only imports
- `verbatimModuleSyntax: true` — type-only imports MUST use `import type`
- `noUncheckedSideEffectImports: true` — side-effect imports must be intentional
- `moduleResolution: bundler` — no `.js` extensions needed on imports
- `target: ES2022`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`
- No barrel `index.ts` files — import directly from the source file
- All files are `.ts` or `.tsx` — no `.js` in `src/`

### Framework-Specific Rules

**React**
- React 19 — use `import { use, useCallback, useRef, useState, useEffect }` from 'react'; do NOT use legacy patterns (class components, forwardRef wrapper, etc.)
- Default exports for all components; named exports for hooks and utilities
- No prop-drilling — all cross-component state goes through Zustand store

**Zustand**
- Single flat store at `src/store/useStore.ts`
- Access with individual selectors per field — NEVER destructure the whole state:
  ✅ `const isPlaying = useStore(state => state.isPlaying);`
  ❌ `const { isPlaying, isRecording } = useStore();`
- State shape uses flat key+setter pairs (e.g. `isPlaying` / `setIsPlaying`)
- `RecordedPoint` type (`{ t: number; x: number; y: number }`) is exported from the store

**Tailwind CSS v4**
- Config is in `src/index.css` under `@theme {}` — NO `tailwind.config.js`
- Custom colors: `editor-bg`, `editor-panel`, `editor-border`, `editor-accent-purple`, `editor-accent-teal`, `editor-accent-orange`, `editor-accent-green`, `editor-accent-blue`
- Custom text size: `text-xxs` = 10px (defined in `@theme`)
- Utility classes defined in `@layer utilities`: `glass-panel`, `thin-scrollbar`, `waveform-bg` — use these classes, do NOT recreate their styles inline
- Import is `@import "tailwindcss"` — single line, no directives like `@tailwind base`

### Testing Rules

- No test framework is currently configured (no vitest, jest, or similar)
- When adding tests, use **Vitest** (consistent with Vite ecosystem)
- Test files should live alongside source: `src/editor/Timeline.test.tsx`
- Do NOT add a test runner without confirming with the user first

### Code Quality & Style Rules

**File & Folder Structure**
- `src/editor/` — layout shell components (Layout, LeftPanel, Inspector, Timeline)
- `src/preview/` — viewport and player components (Viewport, ScrollyVideoPlayer, GhostTrailCanvas)
- `src/store/` — Zustand store only (`useStore.ts`)
- `src/packages/` — reusable hooks and utilities (`useKickDrumData.ts`, `frameLoader.ts`)
- Future: `src/three/` for Three.js/R3F scenes, `src/export/` for export logic

**Naming Conventions**
- Components: PascalCase files with default export (`Timeline.tsx`, `LeftPanel.tsx`)
- Hooks: camelCase prefixed with `use` (`useKickDrumData`, `useStore`)
- Utilities: camelCase object exports (`frameLoader`)
- Constants: SCREAMING_SNAKE_CASE (`LABEL_W`, `ZOOM_LEVELS`)

**ESLint**
- `typescript-eslint` recommended + `react-hooks` + `react-refresh` rules enforced
- No unused variables or parameters (enforced by both ESLint and tsc)
- Hooks rules strictly enforced — no conditional hook calls

**Formatting**
- No Prettier config found — do not add one without user instruction
- Indentation: 4 spaces (observed throughout codebase)
- Single quotes for strings in TypeScript

**Comments**
- Inline comments only where logic is non-obvious
- No JSDoc/TSDoc on components — types are self-documenting via TypeScript

### Development Workflow Rules

**Dev Server**
- Run with `npm run dev` (Vite) — no build step needed for development
- Project root for dev is `scroll-hero-broken/` — all commands run from there
- `npm run build` runs `tsc -b && vite build` — TypeScript must pass before bundling

**No git config observed** — branch naming and commit conventions not yet established

**Key constraint:** Must run entirely in browser — no SSR, no Node.js runtime in output
- Theatre.js Studio is dev-only; `@theatre/core` runtime is used in production export
- ScrollyVideo.js must not be server-rendered

**Asset handling**
- Static assets go in `public/` (e.g. `public/hero.mp4`)
- Imported assets in `src/assets/` are processed by Vite

### Critical Don't-Miss Rules

**Tailwind v4 Anti-Patterns**
- ❌ Do NOT create `tailwind.config.js` — config lives in `src/index.css` `@theme {}`
- ❌ Do NOT use `@tailwind base/components/utilities` directives — use `@import "tailwindcss"`
- ❌ Do NOT add new global utilities anywhere except `src/index.css` `@layer utilities`
- ❌ Do NOT hardcode colors that match theme tokens (e.g. `#a855f7` → use `editor-accent-purple`)

**Zustand Anti-Patterns**
- ❌ Do NOT call `useStore()` with no selector — always pass a selector function
- ❌ Do NOT add async logic inside the store — keep side effects in components/hooks
- ❌ Do NOT create multiple stores — extend the single `useStore` in `src/store/useStore.ts`

**TypeScript Anti-Patterns**
- ❌ Do NOT use `as any` — find the correct type or use a proper type guard
- ❌ Do NOT leave unused imports or variables — tsc will fail the build
- ❌ Do NOT use `enum` — use `const` objects or union types (`erasableSyntaxOnly`)

**Theatre.js / ScrollyVideo**
- ❌ Do NOT import `@theatre/studio` in production code paths — dev-only, tree-shake it
- ❌ Do NOT call `ScrollyVideo` with `trackScroll={true}` in the editor — Theatre.js drives scrub
- ❌ Do NOT use GSAP ScrollTrigger inside the editor preview — only in the exported HTML bundle
- Theatre.js singleton lives in `src/theatre/project.ts` — import `sheet`, `scrollHeroObj`, `SEQUENCE_DURATION` from there
- `SEQUENCE_DURATION = 10` (seconds) — scrollProgress 0→1 maps across this duration
- `TheatreInit` (rendered in `main.tsx`) owns the `onValuesChange` subscription; do NOT add more `onValuesChange` listeners elsewhere
- Play loop lives in `Timeline.tsx` RAF — it advances `sheet.sequence.position` and calls `setScrollProgress` as a fallback; `onValuesChange` overwrites this when keyframes exist
- `seekTo(progress)` in Timeline is the canonical scrub function — always use it instead of calling `setScrollProgress` directly, so sequence position stays in sync

**Component Anti-Patterns**
- ❌ Do NOT pass state down as props between major panels — use the Zustand store
- ❌ Do NOT create new CSS utility classes inline with `style={{}}` for things `glass-panel` covers
- ❌ Do NOT use `text-[10px]` — use `text-xxs` (the custom token)

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review when major dependencies are added (Theatre.js, R3F, GSAP)
- Remove rules that become obvious over time

_Last Updated: 2026-03-08_
