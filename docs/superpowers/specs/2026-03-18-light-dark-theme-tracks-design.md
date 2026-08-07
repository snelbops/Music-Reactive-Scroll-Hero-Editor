# Design: Light/Dark Theming & Track Backgrounds

**Date:** 2026-03-18
**Status:** Approved

## Overview

The editor has been updated to use a light colour scheme by default. However, timeline track areas currently appear black in light mode because they lack explicit background colours. This design covers:

1. Fixing track backgrounds for light mode (Option A — warm grey/near-white)
2. Fixing hardcoded dark-only CSS utilities
3. Adding a pill-style Light/Dark toggle to the header

## Scope

Files affected: `scroll-hero-editor/src/index.css`, `scroll-hero-editor/src/editor/Layout.tsx`, `scroll-hero-editor/src/editor/Timeline.tsx`

## 1. CSS Fixes (`index.css`)

### Theme variables (`:root` already light — no change needed)
- `--theme-surface: #f0f0f0` — used for the lane label column bg (slightly deeper grey)
- `--theme-bg: #f9fafb` — used for track area bg (near-white)
- `--theme-border: #e5e7eb` — used for dividers

### Fix `glass-panel`
Replace hardcoded dark rgba with theme-aware values:
```css
.glass-panel {
  background: var(--theme-panel);
  backdrop-filter: blur(12px);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
}
```

### Fix `.thin-scrollbar`
Replace hardcoded `rgba(255,255,255,0.2)` thumb with `var(--theme-border)`.

### Dark mode scrollbar
Add `.dark .thin-scrollbar` override: thumb `rgba(255,255,255,0.2)` (existing dark feel).

## 2. Track Background Classes (`Timeline.tsx`)

Each lane consists of two divs: a label column and a track area.

**Label column** — add `bg-editor-surface` (maps to `--theme-surface` = `#f0f0f0` in light, existing dark value in dark).

**Track area** — add `bg-editor-bg` (maps to `--theme-bg` = `#f9fafb` in light, `#0a0a0f` in dark). This replaces the implicit inheritance that causes the black appearance.

Per-lane accent tints (`bg-editor-accent-purple/[0.03]` etc.) remain as they are — they sit on top of `bg-editor-bg`.

**Transport bar** — add `bg-editor-surface` explicitly.

## 3. Light/Dark Toggle (`Layout.tsx`)

### Behaviour
- Reads initial theme from `localStorage` key `"theme"` on mount (defaults to `"light"`)
- Applies/removes `.dark` class on `document.documentElement`
- Persists selection to `localStorage` on toggle

### UI
A pill toggle placed between the export buttons and the avatar circle in the header:

```
[ ☀ Light ]  [ 🌙 Dark ]
```

- Active state: white pill with slight shadow, dark text
- Inactive state: transparent, muted text
- Outer pill: `bg-editor-surface` with `border-editor-border`

### State
Local `useState<'light' | 'dark'>` in `Layout.tsx` — no Zustand needed (UI-only).

## Trade-offs

- **No system theme detection** (`prefers-color-scheme`) — user preference via the toggle is explicit and persists, which is simpler and sufficient for a tool editor.
- **`document.documentElement` class toggle** — works with the existing Tailwind `.dark` variant already defined in `index.css`.

## Out of Scope

- Updating `Inspector.tsx` or `LeftPanel.tsx` background colours (already use `bg-editor-panel`/`bg-editor-surface` which are theme-aware via CSS vars)
- Changing dark mode colour values
