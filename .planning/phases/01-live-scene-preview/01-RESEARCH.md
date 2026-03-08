# Phase 1: Live Scene Preview - Research

**Researched:** 2026-03-08
**Domain:** React Three Fiber scene embedding, preset switcher state, viewport aspect ratio / fullscreen, particle-lab-package integration, TypeScript strict scaffold
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCAF-01 | `useKickDrumData` hook present at `src/packages/useKickDrumData.ts`, typed, exports correctly, marked deferred | Hook already exists at correct path with correct exports; only a comment annotation is needed |
| SCAF-02 | All missing deps installed: `@theatre/studio`, `@theatre/r3f`, `@react-three/fiber`, `@react-three/drei`, `three`, `gsap` | Inspection of `node_modules` confirms ALL six are already installed at their package.json versions; `npm install` has already been run |
| SCAF-03 | `particle-lab-package` source files copied into `src/presets/ParticleLab/` | Source files exist in `Presets/particle-lab-package/src/`; target directory does not exist yet; copy + import-path fixup required |
| PREV-01 | Orbit particle preset renders live in viewport on app load | `GithubTestParticleField` uses `<Canvas>` from R3F; must mount inside Viewport with a default imageUrl; sample images must be in `public/` |
| PREV-02 | Classic particle preset renders in viewport when selected | Classic uses an `<iframe src="/github-test-app/index.html">`; static bundle must be in `scroll-hero-editor/public/github-test-app/` |
| PREV-03 | Creator can click a preset card in left panel to switch active scene | Requires `activePreset` state in Zustand store; LeftPanel cards call `setActivePreset`; Viewport renders conditionally |
| PREV-04 | Creator can switch aspect ratio (16:9, 9:16, 1:1, free) with letterboxing | CSS-only: outer container fills available space; inner container has fixed aspect-ratio with `max-w`/`max-h` constraints and auto margin for letterbox |
| PREV-05 | Creator can toggle fullscreen to expand viewport, hiding editor chrome | Native `document.documentElement.requestFullscreen()` API; or CSS overlay with `position:fixed inset-0 z-[9999]`; Zustand flag `isFullscreen` |
</phase_requirements>

---

## Summary

Phase 1 is primarily a **wiring and file-copy phase**, not a new-library phase. The key dependency gap (SCAF-02) is already closed — all six packages are installed in `scroll-hero-editor/node_modules`. The particle source files from `Presets/particle-lab-package/src/` need to be copied into `src/presets/ParticleLab/` with import paths updated (SCAF-03). Three Zustand store keys need to be added (`activePreset`, `aspectRatio`, `isFullscreen`) and the Viewport component replaced from its current ScrollyVideo-only state to a conditional R3F `Canvas` (Orbit) / `iframe` (Classic) renderer.

The Orbit preset (`GithubTestParticleField`) is a self-contained R3F component that requires only `imageUrl` and `theme` props. The Classic preset is a static HTML bundle already present in the particle-lab-package `public/` directory that renders in an `<iframe>`. Both patterns are validated and working in `Presets/particle-lab-package/src/GithubTestView.tsx`.

**Primary recommendation:** Copy particle-lab source files, add three store keys, replace Viewport's centre canvas area with the conditional renderer, wire LeftPanel preset cards to the store, and add aspect-ratio + fullscreen controls. No new library installs required.

---

## Standard Stack

### Core (already installed — verified from node_modules)

| Library | Installed Version | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| `@react-three/fiber` | 9.5.0 | React renderer for Three.js; mounts `<Canvas>` | De-facto standard for R3F in React |
| `@react-three/drei` | 10.7.7 | R3F helper components (OrbitControls, etc.) | Companion library; avoids hand-rolled helpers |
| `three` | 0.183.2 | 3D engine underlying R3F | Required peer dep |
| `@theatre/core` | 0.7.2 | Animation keyframe runtime | Already wired in `src/theatre/core.ts` |
| `@theatre/studio` | 0.7.2 | Dev-only keyframe UI overlay | Already initialized in `main.tsx` (DEV-only dynamic import) |
| `@theatre/r3f` | 0.7.2 | Theatre.js ↔ R3F bridge | Needed for Phase 3 param lanes; import now is fine |
| `gsap` | 3.14.2 | Animation utility (used in export) | Already in package.json |
| `zustand` | 5.0.11 | Global state management | Already in use throughout codebase |
| `tailwindcss` | 4.2.1 (v4) | Utility CSS | Config in `src/index.css @theme {}` — no tailwind.config.js |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Fullscreen API | CSS fixed overlay | Native API is cleaner for true fullscreen; CSS overlay works without permissions and is simpler to implement/reverse |
| Zustand for preset state | React context | Zustand already in use throughout; consistent with existing pattern |
| CSS `aspect-ratio` property | Padding-top hack | CSS `aspect-ratio` is supported in all modern browsers; cleaner |

---

## Architecture Patterns

### Recommended Project Structure After Phase 1

```
scroll-hero-editor/src/
├── presets/
│   └── ParticleLab/
│       ├── GithubTestParticleField.tsx  (copied, import paths updated)
│       ├── TouchTexture.ts              (copied)
│       └── index.ts                     (re-exports for clean imports)
├── preview/
│   └── Viewport.tsx                     (replaced: conditional R3F Canvas / iframe)
├── editor/
│   └── LeftPanel.tsx                    (updated: Orbit/Classic preset cards wired)
├── store/
│   └── useStore.ts                      (extended: activePreset, aspectRatio, isFullscreen)
└── packages/
    └── useKickDrumData.ts               (existing; add // deferred comment)
```

```
scroll-hero-editor/public/
└── github-test-app/                     (copied from particle-lab-package/public/)
    ├── index.html
    ├── css/
    ├── scripts/
    └── images/
        ├── sample-01.png … sample-05.png
```

### Pattern 1: Conditional Scene Renderer in Viewport

**What:** Viewport renders either an R3F `<Canvas>` (Orbit) or an `<iframe>` (Classic) based on `activePreset` from the store. The existing ScrollyVideo rendering code is removed from the centre canvas area (it belongs in Phase 4).

**When to use:** Any time the active scene type changes the rendering approach fundamentally.

```typescript
// Viewport.tsx — centre area conditional render
const activePreset = useStore(state => state.activePreset);

// Orbit: R3F Canvas fills the letterbox container
{activePreset === 'orbit' && (
  <Canvas camera={{ position: [0, 0, 5], fov: 50 }} style={{ width: '100%', height: '100%', background: 'transparent' }}>
    <GithubTestParticleField
      imageUrl="/github-test-app/images/sample-01.png"
      theme="dark"
    />
  </Canvas>
)}

// Classic: iframe fills the letterbox container
{activePreset === 'classic' && (
  <iframe
    src="/github-test-app/index.html"
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Classic Particles"
  />
)}
```

### Pattern 2: CSS Letterbox Aspect Ratio

**What:** Outer container fills all available space (`flex-1 relative`). Inner "stage" container uses CSS `aspect-ratio` property + `max-w` / `max-h` constraints to stay within the outer bounds while maintaining the selected ratio. Auto margins centre it.

**When to use:** Viewport aspect ratio control (16:9, 9:16, 1:1, free).

```typescript
// Ratio map
const RATIO_MAP = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  'free': null,
} as const;
type AspectRatio = keyof typeof RATIO_MAP;

// CSS: outer div is flex-1 with overflow-hidden
// inner div uses style={{ aspectRatio: ratio ?? undefined, maxWidth: '100%', maxHeight: '100%' }}
// and margin: 'auto' to centre in both axes
```

The outer container should be `display: flex; align-items: center; justify-content: center`. The inner stage div uses `style={{ aspectRatio: ratioValue, maxWidth: '100%', maxHeight: '100%' }}`. When `free` is selected, the inner stage fills the full available space.

### Pattern 3: Fullscreen Toggle

**What:** Toggle between two strategies — (a) CSS full-window overlay (simpler, no permissions, hides editor chrome by unmounting/hiding panels) and (b) native `requestFullscreen`. CSS overlay approach preferred because it avoids browser API differences and no user permission prompt.

**When to use:** Creator clicks the Maximize button in the Viewport toolbar.

```typescript
// Store flag
isFullscreen: boolean;
setIsFullscreen: (v: boolean) => void;

// In Layout.tsx: conditionally render panels based on isFullscreen
// When true: render only Viewport; when false: render all five zones

// Viewport fullscreen toggle button (already present in current Viewport.tsx as Maximize2 icon)
const isFullscreen = useStore(state => state.isFullscreen);
const setIsFullscreen = useStore(state => state.setIsFullscreen);
```

Layout wrapper pattern:
```typescript
// Layout.tsx — when fullscreen, only the viewport fills the screen
if (isFullscreen) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#050508]">
      <Viewport />
    </div>
  );
}
// normal 5-zone layout...
```

### Pattern 4: Zustand Store Extensions

**What:** Three new keys added to the flat Zustand store. No async logic in store per project constraint.

```typescript
// New keys to add to EditorState in useStore.ts
activePreset: 'orbit' | 'classic';
setActivePreset: (preset: 'orbit' | 'classic') => void;

aspectRatio: '16:9' | '9:16' | '1:1' | 'free';
setAspectRatio: (ratio: '16:9' | '9:16' | '1:1' | 'free') => void;

isFullscreen: boolean;
setIsFullscreen: (v: boolean) => void;
```

Defaults: `activePreset: 'orbit'`, `aspectRatio: '16:9'`, `isFullscreen: false`.

### Anti-Patterns to Avoid

- **Using `GithubTestView.tsx` directly inside the editor:** That component has its own sidebar/control panel UI that conflicts with the editor layout. Extract only `GithubTestParticleField` and use it inside the editor's `Viewport`.
- **Importing `TouchTexture` from the particle-lab source location:** After copying, always import from `src/presets/ParticleLab/TouchTexture`.
- **Mounting `@theatre/studio` unconditionally:** It is already correctly guarded with `import.meta.env.DEV` in `main.tsx`; do not change this.
- **Putting the R3F `<Canvas>` outside the letterbox container:** The canvas must be a child of the constrained inner stage div so it respects the aspect-ratio boundary.
- **Using `enum` for preset/ratio types:** TypeScript strict config has `erasableSyntaxOnly: true` — use union string literals instead.
- **Referencing `useStore.getState()` inside store actions:** Existing code uses `useStore.getState()` in TheatreSync for the RAF loop. This pattern is acceptable in effects/timers but not inside Zustand setters.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3D canvas with mouse/touch interaction | Custom WebGL canvas + event handling | `@react-three/fiber` `<Canvas>` + `GithubTestParticleField` (already exists) | Touch events, resize, pixel ratio handling are all pre-solved in R3F |
| Particle shader with touch response | Custom shader system | `GithubTestParticleField.tsx` + `TouchTexture.ts` (copy as-is) | Complex GLSL with 80k instanced particles, working and tested |
| Classic preset as embedded component | Re-implementing the Bruno Imbrizi demo in React | `<iframe src="/github-test-app/index.html">` | The classic demo has its own complex vanilla JS; iframe isolation is the correct approach |
| Aspect ratio letterboxing math | Custom resize observer + calculation | CSS `aspect-ratio` + `max-width: 100%; max-height: 100%; margin: auto` | Pure CSS, no JavaScript needed |
| State management for preset switching | Local component state, context, prop drilling | Zustand store (already in use) | Consistent with existing codebase pattern |

---

## Common Pitfalls

### Pitfall 1: Sample Images Not in `scroll-hero-editor/public/`

**What goes wrong:** `GithubTestParticleField` loads its image via `imageUrl` as a URL path. If the sample images are not served by the Vite dev server, the particle field renders black (empty texture).

**Why it happens:** The particle-lab-package `public/github-test-app/images/` directory exists only in the package source. It must be copied to `scroll-hero-editor/public/github-test-app/images/` for Vite to serve them at `/github-test-app/images/sample-01.png`.

**How to avoid:** SCAF-03 must copy the entire `public/github-test-app/` directory (not just `src/`) into `scroll-hero-editor/public/`.

**Warning signs:** Particle canvas renders but is entirely dark; browser network tab shows 404 for `/github-test-app/images/sample-01.png`.

### Pitfall 2: Import Path Mismatch After File Copy

**What goes wrong:** `GithubTestParticleField.tsx` has `import { TouchTexture } from '../TouchTexture'`. After copying to `src/presets/ParticleLab/GithubTest/GithubTestParticleField.tsx`, the relative path must be `../TouchTexture` (pointing to `src/presets/ParticleLab/TouchTexture.ts`). If the file is placed at a different depth the import breaks.

**Why it happens:** The source uses relative imports; the copy destination affects the relative depth.

**How to avoid:** Place files exactly as specified in the structure above so the relative path `../TouchTexture` resolves correctly. Verify on first `vite dev` run.

**Warning signs:** TypeScript compile error "Cannot find module '../TouchTexture'".

### Pitfall 3: R3F Canvas Sizing Without Explicit Width/Height

**What goes wrong:** `<Canvas>` from R3F defaults to filling its parent. If the parent has `height: 0` or is not explicitly sized, the canvas renders invisibly.

**Why it happens:** Flexbox children may have zero height if not explicitly set. The Viewport inner stage div must have explicit dimensions — usually `width: 100%; height: 100%` or be a flex container with `flex: 1`.

**How to avoid:** Wrap the Canvas in a `div` with `width: 100%; height: 100%` as shown in `GithubTestView.tsx` (`flex: 1; position: relative; overflow: hidden`).

**Warning signs:** Canvas element exists in DOM (visible in devtools) but has `height: 0`.

### Pitfall 4: @theatre/r3f Version Mismatch with @theatre/core

**What goes wrong:** `@theatre/r3f` must be the same minor version as `@theatre/core`. A mismatch causes a runtime error about incompatible package versions.

**Why it happens:** Theatre.js bundles internal data structures that are not cross-version compatible.

**How to avoid:** Both are currently at `0.7.2` in `package.json` and installed. Do not upgrade one without the other. This phase does not use `@theatre/r3f` (that's Phase 3), but verifying both are at `0.7.2` now avoids surprises.

**Warning signs:** Browser console error "Theatre.js: Incompatible versions" on load.

### Pitfall 5: TypeScript `noUnusedLocals` / `verbatimModuleSyntax` Violations in Copied Files

**What goes wrong:** `GithubTestParticleField.tsx` and `GithubTestView.tsx` were written for a separate project with potentially looser TypeScript settings. When copied into `scroll-hero-editor/` with `strict: true`, `noUnusedLocals: true`, and `erasableSyntaxOnly: true`, some patterns may cause build errors.

**Why it happens:** `erasableSyntaxOnly` bans `enum` and some `namespace` patterns. `noUnusedLocals` flags any imported type/variable not used in the file. `verbatimModuleSyntax` requires `import type` for type-only imports.

**How to avoid:** After copying, run `npx tsc --noEmit` to find errors before testing in browser. The likely fixes are: convert any `enum` to union literals (none visible in current source), add `import type` to type-only imports, remove unused imports. `GithubTestView.tsx` is not copied into the editor (only `GithubTestParticleField.tsx` and `TouchTexture.ts` are needed).

**Warning signs:** `tsc` output with "is declared but its value is never read" or "Enum declarations..." errors.

### Pitfall 6: Fullscreen and Theatre.js Studio Overlay Conflict

**What goes wrong:** Theatre.js Studio renders its own overlay UI. When fullscreen mode hides the editor chrome, the Theatre.js Studio overlay (which has its own z-index) may obscure the scene or appear incorrectly positioned.

**Why it happens:** Theatre.js Studio mounts its UI into a separate DOM portal with fixed positioning.

**How to avoid:** The CSS fixed-position overlay approach for fullscreen (rather than native `requestFullscreen`) means Theatre.js Studio stays accessible. In fullscreen mode, only hide the five-zone editor chrome (header, left panel, inspector, timeline), not the Studio overlay. For Phase 1 this is not a concern since we're just toggling viewport expansion; Theatre.js Studio can remain visible.

---

## Code Examples

### Copying Particle Lab Files (Shell Commands)

```bash
# From scroll-hero-editor project root:

# Create target directory
mkdir -p src/presets/ParticleLab/GithubTest

# Copy R3F particle component
cp ../Presets/particle-lab-package/src/GithubTest/GithubTestParticleField.tsx \
   src/presets/ParticleLab/GithubTest/GithubTestParticleField.tsx

# Copy TouchTexture (imported by the particle component)
cp ../Presets/particle-lab-package/src/TouchTexture.ts \
   src/presets/ParticleLab/TouchTexture.ts

# Copy Classic preset static bundle (includes index.html + css + scripts + images)
cp -r ../Presets/particle-lab-package/public/github-test-app \
   public/github-test-app
```

After copying, the import in `GithubTestParticleField.tsx` already resolves correctly:
```typescript
import { TouchTexture } from '../TouchTexture';
// resolves to: src/presets/ParticleLab/TouchTexture.ts ✓
```

### Zustand Store Extensions

```typescript
// src/store/useStore.ts — additions only (merge with existing interface)

type PresetId = 'orbit' | 'classic';
type AspectRatio = '16:9' | '9:16' | '1:1' | 'free';

// Add to EditorState interface:
activePreset: PresetId;
setActivePreset: (preset: PresetId) => void;
aspectRatio: AspectRatio;
setAspectRatio: (ratio: AspectRatio) => void;
isFullscreen: boolean;
setIsFullscreen: (v: boolean) => void;

// Add to create() initializer:
activePreset: 'orbit',
setActivePreset: (preset) => set({ activePreset: preset }),
aspectRatio: '16:9',
setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
isFullscreen: false,
setIsFullscreen: (v) => set({ isFullscreen: v }),
```

### Aspect Ratio Letterbox Container

```typescript
// Inside Viewport.tsx preview area
const RATIO_VALUES: Record<AspectRatio, number | null> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  'free': null,
};

const ratio = RATIO_VALUES[aspectRatio];

// Outer: fills available space, centres inner
<div className="flex-1 flex items-center justify-center overflow-hidden bg-black/60 p-4">
  {/* Inner: the constrained stage */}
  <div
    className="relative overflow-hidden"
    style={{
      aspectRatio: ratio ?? undefined,
      width: ratio ? undefined : '100%',
      height: ratio ? undefined : '100%',
      maxWidth: '100%',
      maxHeight: '100%',
    }}
  >
    {/* Canvas or iframe renders here */}
  </div>
</div>
```

### Preset Card Click Handler in LeftPanel

```typescript
// src/editor/LeftPanel.tsx — Presets section update
const activePreset = useStore(state => state.activePreset);
const setActivePreset = useStore(state => state.setActivePreset);

// Replace static preset cards with wired versions:
{(['orbit', 'classic'] as const).map((preset) => (
  <button
    key={preset}
    onClick={() => setActivePreset(preset)}
    className={`aspect-video rounded border cursor-pointer flex flex-col items-center justify-center text-xxs transition-colors
      ${activePreset === preset
        ? 'border-editor-accent-purple/70 bg-editor-accent-purple/10'
        : 'bg-white/5 border-white/10 hover:border-editor-accent-purple/50'}`}
  >
    <span className="capitalize">{preset}</span>
  </button>
))}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Three.js raw WebGL in vanilla JS | R3F `<Canvas>` declarative renderer | R3F v8+ stable | React lifecycle and event system work natively |
| `tailwind.config.js` | `@theme {}` in CSS | Tailwind v4 (this project uses v4.2.1) | No `tailwind.config.js` — all custom tokens in `src/index.css` |
| `import Studio from '@theatre/studio'` static | Dynamic `import('@theatre/studio')` in DEV block | Best practice in Theatre.js docs | Studio bundle (~500KB) excluded from production build |
| Theatre.js `@theatre/r3f` for scene objects | Not yet used in Phase 1 | Phase 3 concern | Phase 1 uses bare R3F Canvas; Theatre.js integration comes in Phase 3 |

**Deprecated/outdated:**
- `tailwind.config.js`: Replaced by `@theme {}` block in CSS for Tailwind v4. This project already uses v4 correctly.
- `@types/three` separate install: Now bundled as `three/src/*` in Three.js 0.163+. Project uses `@types/three` 0.183.1 which is fine.

---

## Open Questions

1. **Default image for Orbit preset on load**
   - What we know: `GithubTestParticleField` requires a non-null `imageUrl` to show particles. Sample images are at `/github-test-app/images/sample-01.png` once the public dir is copied.
   - What's unclear: Should the Orbit preset default to `sample-01.png` hardcoded, or should the store track `activeImageUrl`?
   - Recommendation: For Phase 1, hardcode `imageUrl="/github-test-app/images/sample-01.png"` in Viewport. Phase 1 success criteria do not mention image switching — that is the particle-lab's own UI, not the editor's concern.

2. **Where `GithubTestView.tsx` fits**
   - What we know: The full `GithubTestView.tsx` from particle-lab is a standalone app component with its own sidebar. The editor has its own `LeftPanel`.
   - What's unclear: Should we copy `GithubTestView.tsx` at all?
   - Recommendation: Do not copy `GithubTestView.tsx`. Copy only `GithubTestParticleField.tsx` and `TouchTexture.ts`. The editor's LeftPanel and Viewport replace `GithubTestView`'s UI.

3. **Fullscreen escape key handling**
   - What we know: Users expect Escape to exit fullscreen.
   - What's unclear: Is a keydown listener on the document acceptable given `select-none` on body?
   - Recommendation: Add a `keydown` listener in the fullscreen effect that sets `isFullscreen: false` on Escape. The `select-none` class only affects text selection, not keyboard events.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `scroll-hero-editor/package.json` — confirmed all six deps present
- Direct file inspection: `scroll-hero-editor/node_modules/@react-three/fiber`, `@theatre/core`, `three` — version numbers confirmed
- Direct file inspection: `Presets/particle-lab-package/src/GithubTest/GithubTestParticleField.tsx` — component API and props confirmed
- Direct file inspection: `Presets/particle-lab-package/src/GithubTestView.tsx` — Orbit/Classic render pattern confirmed
- Direct file inspection: `scroll-hero-editor/src/store/useStore.ts` — existing store shape confirmed
- Direct file inspection: `scroll-hero-editor/src/preview/Viewport.tsx` — current viewport confirmed (ScrollyVideo only)
- Direct file inspection: `scroll-hero-editor/src/editor/LeftPanel.tsx` — preset cards are static, not wired
- Direct file inspection: `scroll-hero-editor/tsconfig.app.json` — TypeScript strict flags confirmed
- Direct file inspection: `scroll-hero-editor/src/index.css` — Tailwind v4 `@theme {}` pattern confirmed
- Direct file inspection: `scroll-hero-editor/src/main.tsx` — Theatre.js Studio DEV-only pattern confirmed

### Secondary (MEDIUM confidence)
- `Presets/particle-lab-package/README.md` — file copy instructions and import path guidance verified against actual source structure

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified by direct node_modules inspection
- Architecture: HIGH — patterns extracted directly from working particle-lab source code
- Pitfalls: HIGH — identified from direct code inspection (import paths, TypeScript flags, canvas sizing)
- Phase requirement coverage: HIGH — all 8 requirements mapped with concrete implementation notes

**Research date:** 2026-03-08
**Valid until:** 2026-06-08 (stable dependencies; R3F 9.x and Theatre.js 0.7.x are not in rapid flux)
