# Light/Dark Theming & Track Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix timeline track backgrounds so they show correctly in light mode, and add a persistent pill-style Light/Dark toggle to the header.

**Architecture:** The app uses CSS custom properties (`--theme-*`) bridged into Tailwind via `@theme` in `index.css`. Dark mode is the `.dark` class on `<html>`. The root cause of black tracks is a hardcoded `bg-black` on the `<footer>` wrapper in `Timeline.tsx`. The toggle lives in `Layout.tsx` and manipulates `document.documentElement.classList`.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, CSS custom properties

---

## File Map

| File | Change |
|------|--------|
| `scroll-hero-editor/src/index.css` | Fix `--theme-surface`, `glass-panel`, `thin-scrollbar` |
| `scroll-hero-editor/src/editor/Timeline.tsx` | Remove `bg-black`, fix hardcoded-white stroke, active tool button |
| `scroll-hero-editor/src/editor/Layout.tsx` | Add theme toggle state, localStorage persistence, pill UI |

---

## Task 1: Fix CSS utilities in `index.css`

**Files:**
- Modify: `scroll-hero-editor/src/index.css`

**Context:** Three things are hardcoded for dark mode only:
1. `--theme-surface` is `#f3f4f6` — update to `#f0f0f0` for the warmer Option A label bg
2. `glass-panel` uses `rgba(255,255,255,0.03)` bg and `rgba(255,255,255,0.1)` border — both invisible/broken in light mode
3. `.thin-scrollbar` thumb uses `rgba(255,255,255,0.2)` — white on white in light mode

- [ ] **Step 1: Update `--theme-surface` to `#f0f0f0` in `:root`**

In `index.css` `:root` block, change:
```css
--theme-surface: #f3f4f6;
```
to:
```css
--theme-surface: #f0f0f0;
```

- [ ] **Step 2: Fix `glass-panel` to use CSS variables**

Replace the `glass-panel` rule:
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}
```
with:
```css
.glass-panel {
  background: var(--theme-panel);
  backdrop-filter: blur(12px);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
}
```

- [ ] **Step 3: Fix thin-scrollbar thumb colour**

Replace the thumb rule:
```css
.thin-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}
```
with:
```css
.thin-scrollbar::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 10px;
}
.dark .thin-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
```

- [ ] **Step 4: Commit**

```bash
git add scroll-hero-editor/src/index.css
git commit -m "fix: make glass-panel and scrollbar thumb theme-aware"
```

---

## Task 2: Fix timeline track backgrounds in `Timeline.tsx`

**Files:**
- Modify: `scroll-hero-editor/src/editor/Timeline.tsx`

**Context:** Three hardcoded issues:
1. Line 304: `<footer ... bg-black ...>` — root cause of black track areas in light mode → change to `bg-editor-bg`
2. Line 354: Active tool button uses `bg-white/15` (invisible in light mode) → change to `bg-editor-surface`
3. Line 752: Param lane curve stroke `rgba(255,255,255,0.7)` (white) is invisible on white bg → change to `var(--color-editor-fill)` which is `#000000` in light, `#ffffff` in dark

- [ ] **Step 1: Check for other hardcoded backgrounds (30 seconds)**

Run this search to confirm no individual lane divs have hardcoded backgrounds that would override the footer fix:
```bash
grep -n "bg-black\|bg-gray\|bg-zinc\|bg-slate\|bg-neutral" scroll-hero-editor/src/editor/Timeline.tsx
```
Expected: only line 304 (footer) and line 415 (beat tooltip `bg-black/50` — that's fine, it's a hover tooltip overlay). If any other lane divs appear, add `bg-editor-bg` to their track area div explicitly.

- [ ] **Step 2: Fix footer background**

Find (line 304):
```tsx
<footer className="border-t border-editor-border bg-black flex flex-col z-20" style={{ height }}>
```
Change `bg-black` to `bg-editor-bg`:
```tsx
<footer className="border-t border-editor-border bg-editor-bg flex flex-col z-20" style={{ height }}>
```

- [ ] **Step 2: Fix active tool button background**

Find (line 354):
```tsx
className={`p-1 rounded transition-colors ${activeTool === id ? 'text-editor-fg bg-white/15' : 'text-editor-muted hover:text-editor-fg'}`}
```
Change `bg-white/15` to `bg-editor-surface`:
```tsx
className={`p-1 rounded transition-colors ${activeTool === id ? 'text-editor-fg bg-editor-surface' : 'text-editor-muted hover:text-editor-fg'}`}
```

- [ ] **Step 3: Fix param curve stroke colour**

Find (line 752):
```tsx
<path d={curvePath} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
```
Change to use the theme fill variable:
```tsx
<path d={curvePath} fill="none" stroke="var(--color-editor-fill)" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round"/>
```

- [ ] **Step 4: Commit**

```bash
git add scroll-hero-editor/src/editor/Timeline.tsx
git commit -m "fix: remove hardcoded bg-black from timeline footer, fix light mode track colours"
```

---

## Task 3: Add Light/Dark toggle to header in `Layout.tsx`

**Files:**
- Modify: `scroll-hero-editor/src/editor/Layout.tsx`

**Context:** Add local `theme` state, persist to `localStorage`, apply `.dark` class on `<html>`, render a pill toggle in the header between the export buttons and the avatar circle.

- [ ] **Step 1: Add theme state and localStorage logic**

After the existing `useState` declarations (around line 19), add:
```tsx
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light';
});

useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
}, [theme]);
```

- [ ] **Step 2: Add the pill toggle to the header**

In the header's right-side button group (around line 109), insert the pill toggle between the `EXPORT HTML` button and the avatar `<div>`. Use `bg-editor-surface` for the active state from the start (works in both modes — `#f0f0f0` in light, `rgba(255,255,255,0.05)` in dark):

```tsx
{/* Light/Dark toggle */}
<div className="flex bg-editor-surface border border-editor-border rounded-full p-0.5 gap-0.5">
    <button
        onClick={() => setTheme('light')}
        className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${theme === 'light' ? 'bg-editor-panel text-editor-fg shadow-sm' : 'text-editor-muted hover:text-editor-fg'}`}
    >
        Light
    </button>
    <button
        onClick={() => setTheme('dark')}
        className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${theme === 'dark' ? 'bg-editor-panel text-editor-fg shadow-sm' : 'text-editor-muted hover:text-editor-fg'}`}
    >
        Dark
    </button>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add scroll-hero-editor/src/editor/Layout.tsx
git commit -m "feat: add persistent light/dark pill toggle to header"
```

---

## Task 4: Manual smoke test

Run the dev server and verify both modes look correct.

- [ ] **Step 1: Start dev server**

```bash
cd scroll-hero-editor && npm run dev
```

- [ ] **Step 2: Verify light mode**
  - Timeline track areas should be near-white (`#f9fafb`), not black
  - Lane label column should be warm grey (`#f0f0f0`)
  - Transport bar should be `#f0f0f0` (already uses `bg-editor-surface`)
  - Param lane automation curves should be dark-coloured (not white-on-white)
  - Scrollbar thumb should be visible (grey border colour)
  - Pill toggle shows "Light" as active

- [ ] **Step 3: Toggle to dark mode**
  - Toggle pill to "Dark"
  - Timeline reverts to original dark look (`#0a0a0f` bg)
  - Param curves are white again
  - Scrollbar thumb is white/light

- [ ] **Step 4: Verify persistence**
  - Reload the page while in dark mode — should reopen in dark
  - Reload in light mode — should reopen in light
