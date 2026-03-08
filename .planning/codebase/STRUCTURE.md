# Codebase Structure

**Analysis Date:** 2026-03-08

## Directory Layout

```
Music-Reactive Scroll Hero Editor/   # repo root
├── scroll-hero-editor/              # Active Vite/React application (primary target)
│   ├── src/
│   │   ├── main.tsx                 # React root mount + Theatre.js studio init
│   │   ├── App.tsx                  # Root component (TheatreSync + Layout)
│   │   ├── index.css                # Tailwind v4 @theme tokens + utility classes
│   │   ├── App.css                  # (empty — placeholder)
│   │   ├── scrolly-video.d.ts       # Type shim for scrolly-video ESM import
│   │   ├── editor/                  # DAW shell UI panels
│   │   │   ├── Layout.tsx           # 5-zone flex layout shell
│   │   │   ├── LeftPanel.tsx        # Presets, Assets, Layers sidebar
│   │   │   ├── Inspector.tsx        # Right panel: Transform, Easing, Interpolation
│   │   │   └── Timeline.tsx         # Transport bar + all timeline lanes
│   │   ├── preview/                 # Center viewport content
│   │   │   ├── Viewport.tsx         # Preview container + viewport controls
│   │   │   ├── ScrollyVideoPlayer.tsx  # ScrollyVideo wrapper (video scrub)
│   │   │   ├── GhostTrailCanvas.tsx    # Canvas 2D mouse trail (bypasses React)
│   │   │   └── RecordMode.tsx          # Invisible recording overlay
│   │   ├── theatre/                 # Theatre.js integration
│   │   │   ├── core.ts              # Project/sheet/object definitions + SEQUENCE_DURATION
│   │   │   └── TheatreSync.tsx      # RAF loop + onValuesChange bridge to Zustand
│   │   ├── store/
│   │   │   └── useStore.ts          # Zustand flat store (all app state)
│   │   ├── packages/                # Reusable utilities
│   │   │   ├── useKickDrumData.ts   # Audio analysis hook (currently mocked)
│   │   │   └── frameLoader.ts       # Video frame loader (currently mocked)
│   │   └── assets/
│   │       └── react.svg            # Default Vite asset (unused)
│   ├── public/                      # Static assets served at /
│   ├── dist/                        # Vite build output (generated, not committed)
│   ├── node_modules/                # Dependencies (generated)
│   ├── package.json                 # Dependencies and scripts
│   ├── vite.config.ts               # Vite + React + Tailwind plugin config
│   └── tsconfig.json                # TypeScript config
├── stitch-frontEnd-draft/           # Static HTML prototype (reference only)
│   ├── code.html                    # Entire static UI in one file
│   └── screen.png                   # Reference design screenshot
├── Presets/                         # External preset packages
│   └── particle-lab-package/        # R3F particle field preset (future integration)
│       ├── src/GithubTest/          # Particle field source components
│       └── public/github-test-app/  # Built output for the preset
├── docs/                            # Design and architecture documentation
│   ├── architecture.md              # Planned architecture (progress curve model)
│   └── ux-design.md                 # UX design spec
├── _bmad-output/                    # BMAD workflow generated artifacts
│   ├── planning-artifacts/          # PRD, epics, stories
│   └── implementation-artifacts/    # Implementation notes
├── _bmad/                           # BMAD planning workflow tooling
├── .bmad-core/                      # BMAD core agent definitions
├── .claude/                         # Claude Code command configuration
│   └── commands/                    # Custom /gsd: slash commands
├── .planning/                       # GSD planning documents
│   └── codebase/                    # Codebase analysis docs (this directory)
├── tasks/                           # Task management
│   ├── inbox/                       # Incoming tasks
│   ├── next/                        # Queued tasks
│   └── projects/                    # Project-level task groupings
├── memory/                          # AI agent memory files
├── CLAUDE.md                        # Claude Code project instructions
├── MUSIC_SCROLL_HERO_PRD.md         # Product Requirements Document
├── project-structure.md             # Planned source tree (may differ from actual)
└── package.json                     # Root-level (no scripts — placeholder only)
```

## Directory Purposes

**`scroll-hero-editor/src/editor/`:**
- Purpose: All DAW shell UI panel components. No business logic — only layout and user interaction.
- Contains: `Layout.tsx` (shell), `LeftPanel.tsx` (sidebar), `Inspector.tsx` (right panel), `Timeline.tsx` (bottom transport + lanes)
- Key files: `scroll-hero-editor/src/editor/Timeline.tsx` (most complex component — 287 lines, handles seeking, zoom, recording, all lane rendering)

**`scroll-hero-editor/src/preview/`:**
- Purpose: Everything inside the center viewport. Video playback, mouse capture, canvas rendering.
- Contains: Viewport container, ScrollyVideo wrapper, recording overlay, ghost trail canvas
- Key files: `scroll-hero-editor/src/preview/GhostTrailCanvas.tsx` (imperative Canvas 2D, bypasses React for performance)

**`scroll-hero-editor/src/theatre/`:**
- Purpose: Theatre.js initialization and React↔Theatre bridge. The animation engine core.
- Contains: Object definitions and the sync component
- Key files: `scroll-hero-editor/src/theatre/core.ts` (singleton — import `sheet` or `scrollControlsObj` anywhere that needs direct Theatre access)

**`scroll-hero-editor/src/store/`:**
- Purpose: Single Zustand store file. All shared app state.
- Contains: `useStore.ts` only
- Key files: `scroll-hero-editor/src/store/useStore.ts` — the only state management file

**`scroll-hero-editor/src/packages/`:**
- Purpose: Utility hooks and functions intended to be portable/reusable. No React component exports.
- Contains: Audio analysis hook, video frame loader utility
- Both files are currently mocked — real implementations (Web Audio API / ffmpeg-WASM) are planned but not yet written.

**`stitch-frontEnd-draft/`:**
- Purpose: Visual reference prototype. Read-only reference for UI design decisions.
- Contains: `code.html` (complete standalone UI), `screen.png` (design screenshot)
- Do not add new code here — this is a snapshot only.

**`Presets/particle-lab-package/`:**
- Purpose: Source code for the R3F particle field preset planned for integration into the editor.
- Contains: React Three Fiber components (`GithubTestParticleField`, `TouchTexture`) in `src/GithubTest/`
- Status: Not yet integrated into `scroll-hero-editor/src/` — exists as a standalone package

**`docs/`:**
- Purpose: Authoritative design documentation for the project.
- Key files: `docs/architecture.md` (progress curve model, export architecture, planned scene types), `docs/ux-design.md` (UX spec)
- Read these before making architectural decisions.

## Key File Locations

**Entry Points:**
- `scroll-hero-editor/src/main.tsx`: Vite app mount point + Theatre.js Studio conditional init
- `scroll-hero-editor/src/App.tsx`: React root — mounts `TheatreSync` and `Layout`
- `stitch-frontEnd-draft/code.html`: Static prototype (reference, not for editing)

**Configuration:**
- `scroll-hero-editor/package.json`: All npm dependencies and dev/build scripts
- `scroll-hero-editor/src/index.css`: Tailwind v4 `@theme` token definitions and custom utility classes (`.glass-panel`, `.thin-scrollbar`, `.waveform-bg`)
- `scroll-hero-editor/vite.config.ts`: Vite build configuration

**Core Logic:**
- `scroll-hero-editor/src/theatre/core.ts`: Theatre.js singletons — import `sheet` and Theatre objects from here everywhere
- `scroll-hero-editor/src/store/useStore.ts`: Zustand store — import `useStore` from here everywhere
- `scroll-hero-editor/src/theatre/TheatreSync.tsx`: RAF playback loop + `onValuesChange` bridge

**Testing:**
- Not applicable — no test files or test framework present.

## Naming Conventions

**Files:**
- React components: PascalCase `.tsx` (e.g., `Timeline.tsx`, `LeftPanel.tsx`, `GhostTrailCanvas.tsx`)
- Non-component TypeScript: camelCase `.ts` (e.g., `useStore.ts`, `core.ts`, `frameLoader.ts`)
- Hooks: `use` prefix + PascalCase (e.g., `useKickDrumData.ts`, `useStore.ts`)

**Directories:**
- Lowercase, descriptive (e.g., `editor/`, `preview/`, `theatre/`, `store/`, `packages/`)

**Components:**
- Default export per file, named matching the filename (e.g., `export default function Timeline()` in `Timeline.tsx`)

**CSS tokens:**
- Editor-specific design tokens use `editor-` prefix (e.g., `editor-bg`, `editor-border`, `editor-accent-purple`) defined in `index.css` and usable as Tailwind classes (e.g., `bg-editor-bg`, `text-editor-accent-purple`)

## Where to Add New Code

**New editor panel or sub-panel:**
- Implementation: `scroll-hero-editor/src/editor/[ComponentName].tsx`
- Import into `scroll-hero-editor/src/editor/Layout.tsx`

**New preview overlay or canvas effect:**
- Implementation: `scroll-hero-editor/src/preview/[ComponentName].tsx`
- Import into `scroll-hero-editor/src/preview/Viewport.tsx`

**New Theatre.js automation object (new lane):**
- Define the object in `scroll-hero-editor/src/theatre/core.ts` using `sheet.object('Name', { ... })`
- Add subscription in `scroll-hero-editor/src/theatre/TheatreSync.tsx` if it needs to drive Zustand state
- Add lane UI row in `scroll-hero-editor/src/editor/Timeline.tsx`

**New shared state (new field in the store):**
- Add the interface field and setter to `scroll-hero-editor/src/store/useStore.ts`

**New reusable utility hook or function:**
- Implementation: `scroll-hero-editor/src/packages/[name].ts`

**New scene type or preset:**
- Per `docs/architecture.md`, planned locations are `scroll-hero-editor/src/scenes/` and `scroll-hero-editor/src/presets/` — these directories do not exist yet and must be created
- Reference: `Presets/particle-lab-package/src/GithubTest/` for particle field preset source

**New Tailwind utility class:**
- Add to the `@layer utilities` block in `scroll-hero-editor/src/index.css`

**New design token (color, size):**
- Add to the `@theme` block in `scroll-hero-editor/src/index.css` using the `--color-editor-*` naming convention

## Special Directories

**`scroll-hero-editor/dist/`:**
- Purpose: Vite production build output
- Generated: Yes
- Committed: No (in `.gitignore`)

**`scroll-hero-editor/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**`_bmad/` and `.bmad-core/`:**
- Purpose: BMAD AI planning workflow tooling — not application code
- Generated: No (checked in)
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents (this directory)
- Generated: Yes (by `/gsd:map-codebase`)
- Committed: Yes

**`memory/`:**
- Purpose: AI agent persistent memory files
- Committed: Yes

---

*Structure analysis: 2026-03-08*
