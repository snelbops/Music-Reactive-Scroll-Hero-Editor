# UX Design — Music-Reactive Scroll Hero Editor

## Design Philosophy

- **DAW-feel, not video-editor-feel** — the timeline is the star; the viewport is the output monitor
- Reference: Ableton Live (left panel proportions, lane rows), CapCut (viewport controls), Theatre.js Studio (curve handles)
- Premium dark-mode aesthetic: near-black backgrounds, glassmorphism panels, glowing accent on active elements

---

## Layout — Five Zones

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOP NAV  h-10  — Project name · Save status · Export button         │
├──────────────┬────────────────────────────────────┬──────────────────┤
│  LEFT PANEL  │         VIEWPORT (centre)           │  RIGHT INSPECTOR │
│  w-[220px]   │         flex-1                      │  w-[240px]       │
│              │                                     │                  │
│  Presets     │  Three.js Canvas / Frame player     │  Selected lane   │
│  Assets      │                                     │  or keyframe     │
│  Layers      │  Progress bar overlay (0–100%)      │  value input     │
│              │  Fullscreen / ratio toggle          │                  │
│              │                                     │  Easing picker   │
│              │                                     │  (bezier, step,  │
│              │                                     │   spring)        │
│              │                                     │                  │
│              │                                     │  Interpolation   │
│              │                                     │  mode toggle     │
├──────────────┴────────────────────────────────────┴──────────────────┤
│  TIMELINE  h-[280px]                                                  │
│  Transport bar · Automation lanes · Playhead                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Left Panel

**Three collapsible sections:**

### Presets
- Grid of preset cards (icon + name): "Orbit Particles", "Classic Particles", "Frame Sequence"
- Click to load into viewport; replaces active scene
- Preset card shows a small thumbnail or animated preview

### Assets
- File list for uploaded items: PNG frame sequences (folder), images (for particle source)
- Upload button: accepts image/* or a folder of PNGs
- Each asset row: thumbnail · filename · delete icon

### Layers *(v2)*
- Stack of active scene layers
- Toggle visibility (eye icon), lock (lock icon)
- Drag to reorder

---

## Viewport (Centre)

- Fills all available space between left panel, right inspector, and timeline
- **Active scene renders here** — R3F Canvas or frame-sequence player
- **Overlays (non-interactive, pointer-events: none):**
  - Progress indicator: small pill bottom-centre showing `0.00–1.00`
  - Scrub handle: thin horizontal line user can drag to manually set progress (overrides playhead during scrub)
- **Controls bar (bottom edge of viewport):**
  - Aspect ratio selector (16:9 / 9:16 / 1:1 / free)
  - Fullscreen toggle
  - Scene name badge

---

## Right Inspector

**Context-sensitive — updates when lane or keyframe is selected:**

| State | Shows |
|-------|-------|
| Nothing selected | Generic tips / project info |
| Automation lane selected | Lane colour picker, interpolation mode default |
| Keyframe selected | Exact value input, easing curve picker, in/out handle lengths |

**Easing curve picker:** Visual bezier handles (like CSS cubic-bezier.com) — ease-in, ease-out, ease-in-out, spring, step, custom.

---

## Timeline

### Transport Bar (top strip of timeline)

```
[ ◀◀ ] [ ▶ Play ] [ ■ Stop ] [ ⏺ Arm ] [ ↺ Loop ]   BPM: 120   00:00.000
```

- **Play/Stop**: animates the playhead, drives `progress` to all scenes
- **Arm Record**: when active + play, dragging the viewport scrub handle records a `progress` curve in real time
- **Loop**: loops playback between loop-in and loop-out markers

### Lane Rows

Each lane is `h-10` with:
- **Label column** `w-[120px]` sticky left: lane name + lock + eye icons
- **Track area** `flex-1`: curve or event markers, horizontally scrollable with playhead

**v1 Lane Set:**

| Lane | Type | Accent colour |
|------|------|---------------|
| Scroll Progress | Bezier curve 0–1 | Purple `#a855f7` |
| Rotation Speed | Bezier curve | Teal `#14b8a6` |
| Particle Depth | Bezier curve | Teal `#14b8a6` |
| Particle Size | Bezier curve | Green `#22c55e` |
| CSS Opacity | Bezier curve 0–1 | Blue `#3b82f6` |

**Future lanes (post-v1):**

| Lane | Type | Accent |
|------|------|--------|
| Audio Wave | Waveform display (read-only) | Orange `#f97316` |
| Mouse X / Mouse Y | Recorded curve | Teal |
| Click Events | Trigger dots | White |
| Camera X/Y/Z | Bezier curve | Purple |

### Playhead
Absolutely-positioned red vertical line spanning all lanes. Draggable left/right to scrub.

---

## Key Interactions

### Manual Scrub
Drag the viewport's scrub handle or the playhead → updates `progress` live → scene responds instantly. This is the primary "feel-it-out" interaction before recording.

### Recording a Progress Curve
1. Set up scene (load preset or frame sequence)
2. Arm record (⏺ button)
3. Hit play
4. Drag viewport scrub handle in real time — movement records keyframes on the Scroll Progress lane
5. Stop → curve appears, editable with bezier handles

### Editing a Curve
- Click a keyframe dot on the lane to select
- Drag bezier handles in the lane track
- Right Inspector shows exact value + easing picker for precision editing

### Loading a Frame Sequence
1. Click "Frame Sequence" preset in left panel
2. Drop a folder of PNGs into the Assets panel (or use MP4 → extract frames button)
3. Scene loads; Scroll Progress lane now maps 0→1 to first→last frame

---

## Visual Style Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `editor.bg` | `#0a0a0f` | Page background |
| `editor.panel` | `rgba(255,255,255,0.03)` | Panel fills |
| `editor.border` | `rgba(255,255,255,0.1)` | Panel borders |
| `editor.accentPurple` | `#a855f7` | Playhead, Scroll Progress lane, active state |
| `editor.accentTeal` | `#14b8a6` | Mouse / camera lanes |
| `editor.accentOrange` | `#f97316` | Audio waveform lane |
| `editor.accentGreen` | `#22c55e` | Particle lanes |
| `editor.accentBlue` | `#3b82f6` | CSS property lanes |

**Utility classes** (defined in `code.html`, to be ported to global CSS):
- `.glass-panel` — `backdrop-filter: blur(12px)` + subtle border
- `.thin-scrollbar` — 4px webkit scrollbar
- `.waveform-bg` — 8px orange grid lines (audio lane background)
