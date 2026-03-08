# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A **static UI prototype** for "Scroll Hero Editor" — a DAW/video-editor-style tool for choreographing scroll-based web animations synchronized with music/audio. The editor maps audio waveforms, scroll position, mouse events, and click events to visual layer properties via a timeline interface.

## Source File

The entire application lives in one file: `stitch-frontEnd-draft/code.html`

- No build system, no framework, no server — open directly in a browser
- `stitch-frontEnd-draft/screen.png` is the reference design screenshot
- `_bmad/` contains BMAD project-planning workflow tooling (not app code)

## Current Interactivity State

The prototype is **visual-only**. The only JavaScript is:
```js
// data-purpose="timeline-interaction"
console.log('Scroll Hero Editor initialized');
```
All controls (buttons, inputs, toggles, lane items) are static HTML with no event listeners.

## Layout Structure

Fixed 5-zone layout (`flex-col h-screen overflow-hidden`):

| Zone | Selector / Size | Role |
|------|----------------|------|
| Top nav | `<header class="h-10">` | Project name, Export JSON |
| Left sidebar | `<aside class="w-[220px]">` | Presets, Assets, Layers |
| Centre viewport | `<main class="flex-1">` | Hero preview + scroll indicator |
| Right inspector | `<aside class="w-[240px]">` | Transform, Easing, Interpolation |
| Bottom timeline | `<footer class="h-[280px]">` | Transport bar + lane rows |

## Timeline Lane Structure

Each lane is `<div class="flex h-10 border-b">` with two children:
- **Label column**: `w-[120px] shrink-0 sticky left-0 z-30` — lane name + lock/eye icons
- **Track area**: `flex-1 relative overflow-hidden` — SVG path or div-based content

The playhead is an absolutely-positioned `left-[120px]` red line that overlays all lanes.

Lane accent colors:
| Lane | Color token |
|------|-------------|
| Audio Wave | `editor.accentOrange` |
| Mouse X/Y | `editor.accentTeal` |
| Click Evts | white |
| Scroll POS | `editor.accentPurple` |
| Particles | `editor.accentGreen` |
| CSS OPACITY | `editor.accentBlue` |

## Styling Conventions

- **Tailwind CDN** with `?plugins=forms,container-queries`
- **Custom theme** under `editor.*` namespace — defined inline in the `<head>` `tailwind.config`
- **Custom CSS** in `<style data-purpose="custom-glassmorphism">` tag (not Tailwind utilities)
- **Utility classes**: `.glass-panel` (glassmorphism card), `.thin-scrollbar` (4px webkit scrollbar), `.waveform-bg` (orange 8px grid lines)
- **Base palette**: background `#0a0a0f`, panels `rgba(255,255,255,0.03)`, borders `rgba(255,255,255,0.1)`
- **Accent hex values**: purple `#a855f7`, teal `#14b8a6`, orange `#f97316`, green `#22c55e`, blue `#3b82f6`
- Font size scale adds `xxs: 10px` and keeps `xs: 12px`, `sm: 13px`
- `<body>` has `select-none` — text selection is globally disabled

## `data-purpose` Attributes

Used to programmatically target key sections:
- Left sidebar: `presets-section`, `assets-section`, `layers-section`
- Right inspector: `inspector-transform`, `inspector-easing`, `inspector-settings`
- Script tag: `timeline-interaction`
