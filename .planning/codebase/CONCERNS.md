# Codebase Concerns

**Analysis Date:** 2026-03-08

## Tech Debt

**Entire application is a static HTML prototype with no real logic:**
- Issue: `stitch-frontEnd-draft/code.html` is a 347-line visual-only mockup. Every interactive element (buttons, inputs, toggles, transport controls, lane items) is static HTML with zero event listeners. The single script block contains only `console.log('Scroll Hero Editor initialized')`.
- Files: `stitch-frontEnd-draft/code.html` lines 343–346
- Impact: Nothing in the UI functions. Play/Stop/Record/Loop buttons do not respond. Inspector inputs do not bind to any state. Export JSON does nothing. Easing preset buttons do not change state. Layer/preset clicking does not affect the viewport.
- Fix approach: Implement the full React + Theatre.js + GSAP stack per the PRD before any feature work. The prototype serves only as a visual reference — it is not a foundation to iterate on.

**Hardcoded static data throughout the UI:**
- Issue: Project name ("Neon_Horizon_01"), save status ("Draft Saved 2m ago"), BPM ("120"), time code ("00:14:02"), transform values (Position X: 120, Y: 45) are all hardcoded strings in markup. There is no data model or state.
- Files: `stitch-frontEnd-draft/code.html` lines 65–67, 180–184, 239–244
- Impact: Any implementation must build a state layer from scratch — nothing can be wired up to the existing markup.
- Fix approach: Discard the HTML file as reference-only. Build React component tree driven by Theatre.js state from the start.

**Playhead is a CSS-positioned decoration, not a functional element:**
- Issue: The red playhead line (`left-[120px]`) is an absolutely positioned `<div>` with no draggable behavior, no time-binding, and no relationship to transport controls.
- Files: `stitch-frontEnd-draft/code.html` lines 261–263
- Impact: Any real playhead implementation is a full rebuild, not an enhancement.
- Fix approach: Implement via Theatre.js `ISheet` position binding from the start.

**Lane SVG paths are hardcoded static decorations:**
- Issue: All six timeline lane SVG `<path>` elements (Audio Wave, Mouse X/Y, Scroll POS, CSS OPACITY) have fixed `d` attribute strings representing fake data shapes. They have no connection to any data source.
- Files: `stitch-frontEnd-draft/code.html` lines 279–281, 290–292, 312–314, 332–334
- Impact: Real lane rendering requires a complete Theatre.js curve-to-SVG rendering pipeline.
- Fix approach: Use Theatre.js `ISheetObject` values to generate keyframe curves rendered via a proper curve editor component.

**No build system — CDN-only Tailwind:**
- Issue: Tailwind is loaded via `https://cdn.tailwindcss.com?plugins=forms,container-queries` with an inline `tailwind.config` block. This approach is suitable only for prototypes; CDN Tailwind is significantly slower, does not tree-shake, and is not appropriate for production.
- Files: `stitch-frontEnd-draft/code.html` lines 7–31
- Impact: All CSS is re-generated in the browser on every page load. No PostCSS pipeline, no purging, no optimization.
- Fix approach: Move to Vite + `@tailwindcss/vite` with a proper `tailwind.config.ts` when the React app is scaffolded.

**Toggle and color swatch UI elements have no state:**
- Issue: The "Snap to Beat" toggle (`bg-editor-accentPurple rounded-full`) is a purely visual div — there is no checkbox, no `aria-checked`, no click handler. Lane color swatches are similarly inert.
- Files: `stitch-frontEnd-draft/code.html` lines 209–211, 216–219
- Impact: Toggle state must be built from scratch; no incremental migration possible.
- Fix approach: Replace with controlled React components bound to Theatre.js sheet object properties.

**Easing button "active" state is baked into markup:**
- Issue: The "Linear" easing button has `bg-editor-accentTeal/20 border-editor-accentTeal/40` classes hardcoded, making it appear permanently selected. This is not dynamic state.
- Files: `stitch-frontEnd-draft/code.html` line 199
- Impact: Gives a misleading impression of functionality.
- Fix approach: Implement as a controlled button group component tied to the selected keyframe's easing value.

## Known Bugs

**Viewport SVG uses incorrect attribute casing (`viewbox` vs `viewBox`):**
- Symptoms: SVG `viewbox` attribute (lowercase) is used throughout the file. The correct SVG attribute is `viewBox` (camelCase). Browsers may silently accept the lowercase form, but it is non-conformant and can cause rendering inconsistencies across SVG implementations.
- Files: `stitch-frontEnd-draft/code.html` lines 151, 192, 231, 232, 253, 279, 290, 312, 332
- Trigger: Any SVG rendering context that applies strict case sensitivity
- Workaround: Browsers currently tolerate this, but it should be corrected in any production implementation.

**Scroll indicator is a static visual fragment:**
- Symptoms: The scroll progress bar on the right side of the viewport shows a 1/3-height purple segment and a white scrub handle at a fixed position — these are not bound to any scroll or playhead value.
- Files: `stitch-frontEnd-draft/code.html` lines 165–168
- Trigger: Any attempt to use scroll position to drive the indicator fails because there is no binding.
- Workaround: None — this is a prototype decoration only.

**Mouse trail effect is a static blur circle:**
- Symptoms: The "ghost mouse trail overlay" described in the PRD is implemented as a static `w-32 h-32` blurred circle centered in the viewport with no mouse tracking.
- Files: `stitch-frontEnd-draft/code.html` line 162
- Trigger: Visible on page load as a permanent decorative element, not tied to mouse position.
- Workaround: None — real implementation requires `mousemove` event listener writing to CSS custom properties or React state.

## Security Considerations

**CDN dependency with no subresource integrity (SRI):**
- Risk: Tailwind CSS is loaded from `cdn.tailwindcss.com` with no `integrity` attribute. A compromised CDN could inject arbitrary code.
- Files: `stitch-frontEnd-draft/code.html` line 7
- Current mitigation: None.
- Recommendations: When moving to production build tooling, remove the CDN dependency entirely. If any CDN resources are retained, add SRI hashes via `integrity` and `crossorigin` attributes.

**No Content Security Policy (CSP):**
- Risk: No `<meta http-equiv="Content-Security-Policy">` or server-delivered CSP header is in place. This is low severity for a static prototype but will become relevant when the app makes real network requests (Web Audio API, ffmpeg WASM, Theatre.js, external video sources).
- Files: `stitch-frontEnd-draft/code.html`
- Current mitigation: None.
- Recommendations: Define a strict CSP at the Vite/server level when production infrastructure is set up, especially given planned use of WASM workers for ffmpeg frame extraction.

## Performance Bottlenecks

**ffmpeg WASM frame extraction (planned, not yet implemented):**
- Problem: The PRD specifies MP4-to-PNG frame extraction via `ffmpeg.wasm` running in a Web Worker. For a typical 30fps, 10-second clip this produces ~300 PNG images that must be loaded as `THREE.Texture[]`.
- Files: Not yet implemented — described in `_bmad-output/planning-artifacts/prd.md` (FR7, FR8)
- Cause: PNG frame sequences at high frame rates can consume hundreds of megabytes of GPU texture memory. Loading all frames upfront blocks progress and risks OOM on low-end devices.
- Improvement path: Implement lazy/chunked texture loading with an LRU cache; stream frames progressively from the Web Worker rather than waiting for full extraction.

**No lazy loading or code splitting planned at prototype stage:**
- Problem: The planned stack (React, Theatre.js, GSAP, Three.js/R3F, ScrollyVideo.js, ffmpeg WASM) will produce a large initial bundle if not split.
- Files: Not yet implemented
- Cause: All dependencies are production-grade libraries with significant bundle weight (Three.js alone ~600KB gzipped).
- Improvement path: Use Vite's dynamic `import()` for scene types; load ffmpeg WASM only when an MP4 is uploaded; code-split the editor from the export runtime.

## Fragile Areas

**Single-file prototype as design reference:**
- Files: `stitch-frontEnd-draft/code.html`
- Why fragile: The entire visual design reference lives in one un-versioned HTML file. Any accidental edit loses the reference. The file has no component boundaries, making it difficult to map sections to future React components.
- Safe modification: Treat this file as read-only reference. Do not use it as a starting point for the React implementation — scaffold fresh.
- Test coverage: None.

**Inline Tailwind theme as source of truth for design tokens:**
- Files: `stitch-frontEnd-draft/code.html` lines 9–31
- Why fragile: Color tokens (`editor.accentPurple`, `editor.accentTeal`, etc.) are defined inline in the prototype script block. When the React app is built, these must be manually extracted to a standalone `tailwind.config.ts`. Drift between the prototype tokens and the production config is likely without a formal extraction step.
- Safe modification: Extract the full `editor.*` color/font namespace into `tailwind.config.ts` as the first step of the production scaffold. Verify against `stitch-frontEnd-draft/screen.png` visually.
- Test coverage: None.

**`data-purpose` attribute scheme defined only in prototype:**
- Files: `stitch-frontEnd-draft/code.html` (lines 78, 94, 110, 175, 189, 204, 343)
- Why fragile: The `data-purpose` targeting scheme is described in CLAUDE.md as a programmatic targeting convention, but there is no corresponding test, selector registry, or component mapping. If sections are renamed during React implementation, any tooling relying on these selectors will silently break.
- Safe modification: When implementing React components, add `data-purpose` as explicit props and document the expected values in a constants file.
- Test coverage: None.

## Scaling Limits

**Static single-file architecture does not scale beyond prototype:**
- Current capacity: One developer editing one HTML file.
- Limit: Any concurrent editing, component reuse, or dependency management is impossible in the current structure.
- Scaling path: Full migration to Vite + React as specified in the PRD. The prototype must be replaced, not extended.

**No persistent storage layer:**
- Current capacity: Zero — no project save/load, no IndexedDB, no backend.
- Limit: Users cannot save work between sessions.
- Scaling path: Implement Theatre.js project JSON export/import (FR24 in epics) as the primary persistence mechanism; add IndexedDB or file system API for autosave.

## Missing Critical Features

**Zero interactivity — the entire application is a visual mockup:**
- Problem: No JavaScript beyond the initialization log exists. Transport controls, inspector bindings, lane interactions, playhead dragging, record arming, asset upload, preset loading — none are implemented.
- Blocks: All PRD functional requirements (FR1–FR24+) are blocked.

**No Theatre.js integration:**
- Problem: The core automation engine (Theatre.js) is not present. Keyframe editing, bezier curve manipulation, multi-lane parameter recording, and playhead-driven progress values all depend on it.
- Blocks: FR1, FR2, FR13–FR19 from `_bmad-output/planning-artifacts/prd.md`

**No React component tree:**
- Problem: The UI exists only as flat HTML. There are no reusable components, no props, no state management.
- Blocks: All feature implementation.

**No audio pipeline:**
- Problem: The Web Audio API integration for BPM detection, beat markers, and audio waveform display is completely absent.
- Blocks: FR (Audio Wave lane, snap-to-beat, BPM display) from `_bmad-output/planning-artifacts/prd.md`

## Test Coverage Gaps

**No tests exist of any kind:**
- What's not tested: Everything. Unit tests, integration tests, e2e tests, visual regression tests — none present.
- Files: Entire codebase (`stitch-frontEnd-draft/code.html`)
- Risk: Any implementation work proceeds without a safety net. Regressions in timeline behavior, keyframe math, audio sync, or frame extraction will be caught only manually.
- Priority: High — establish a Vitest unit test suite and Playwright e2e suite before implementing core Theatre.js integrations, since keyframe curve math is easy to regress silently.

---

*Concerns audit: 2026-03-08*
