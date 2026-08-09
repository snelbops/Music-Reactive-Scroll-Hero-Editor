# Future Architecture & Roadmap: Ableton Live DAW Integration & Desktop Application

This document outlines the architectural blueprint and technical roadmap for connecting **Scroll Hero Editor** with **Ableton Live** and packaging the application as a standalone desktop DAW/video choreography suite.

---

## 🎹 Part 1: Ableton Live DAW Integration Architecture

The goal is to allow music producers and visual performance artists to control video playheads, scroll automation, and visual parameter curves directly from Ableton Live in real-time.

```
+------------------------------------+           +-----------------------------------------+
|            ABLETON LIVE            |           |           SCROLL HERO EDITOR            |
|                                    |           |                                         |
|  [MIDI Track] ---> [IAC Bus / MIDI]| --------> | [Web MIDI / Virtual MIDI Engine]        |
|                                    | (MIDI CC) |   ↳ Drives Scroll POS & Video Pads      |
|  [Max for Live] -> [WebSocket Server] --------> | [WebSocket Client / OSC Bridge]         |
|                     (JSON / OSC)   | (Realtime)|   ↳ Instant Beat Sync & Clip Triggers   |
|  [Ableton Link] -> [Link Protocol] | --------> | [Ableton Link Sync Engine]              |
|                     (UDP Multicast)| (BPM/Beat)|   ↳ Exact Bar Phase & Transport Sync    |
+------------------------------------+           +-----------------------------------------+
```

### 1. 🎛️ Virtual MIDI & IAC Driver Mapping (Phase 1)
- **Mechanism**: macOS **IAC Driver** (Inter-Application Communication) and Windows **loopMIDI**.
- **Workflow**:
  - In Ableton Live, route a MIDI track output to `IAC Driver Bus 1`.
  - Draw MIDI CC automation curves (e.g. CC1 = Scroll POS) or trigger MIDI notes (Notes 36-39 / Numpad keys = Video Pad launchers).
  - Scroll Hero Editor consumes these messages via the standard **Web MIDI API** without needing extra software installation.

### 2. 🎚️ Max for Live (M4L) Custom Device & WebSockets / OSC Bridge (Phase 2)
- **Mechanism**: A custom **Max for Live (M4L)** audio/MIDI plugin dropped onto Ableton tracks.
- **Features**:
  - **Bidirectional Automation Sync**: Dragging a curve in Ableton Live updates the timeline in Scroll Hero Editor instantly and vice-versa.
  - **Audio Transient / Envelope Follower**: Extracts kick, snare, and frequency bands directly inside Ableton and streams high-frequency modulation data via local WebSockets (`ws://localhost:8080`) or OSC (Open Sound Control).
  - **Multi-Clip Video Switcher**: Ableton MIDI Clips can automatically fire video pad changes in sync with song arrangements (Verse, Chorus, Drop).

### 3. ⏱️ Ableton Link Protocol Sync (Phase 3)
- **Mechanism**: Integrate C++ / Rust Ableton Link SDK into the application.
- **Workflow**:
  - Provides sample-accurate tempo (BPM) and bar/beat phase alignment over local Wi-Fi / Ethernet.
  - Ensures video playback loops stay locked to Ableton's master transport regardless of tempo changes.

---

## 🖥️ Part 2: Native Desktop Application Packaging (Tauri v2 / Electron)

To provide professional offline rendering, low-latency audio/video performance, and direct hardware access, Scroll Hero Editor will be packaged as a cross-platform desktop application.

### 1. 🛠️ Framework Choice: Tauri v2 (Recommended)
- **Why Tauri v2 over Electron**:
  - Ultra-lightweight binary size (~15MB vs ~150MB).
  - Extremely low RAM & GPU memory footprint (critical for multi-stream video decoding).
  - Native C/Rust hardware bindings for Web MIDI, Ableton Link, and FFmpeg video export.

### 2. ⚡ Native Desktop Capabilities
- **Direct FFmpeg Hardcoded Export**: Render final performance recordings to MP4/ProRes videos at 4K 60FPS using native GPU hardware acceleration (NVENC / Apple Silicon VideoToolbox).
- **Native File System Access**: Drag-and-drop video assets directly from Finder / File Explorer without browser memory restrictions.
- **Multi-Monitor Performance Window**: Output fullscreen video preview to an external projector / stage monitor while keeping the timeline editor on the main display.

---

## 🗓️ Implementation Phases Summary

| Phase | Feature | Target Tech |
|---|---|---|
| **Phase 1** | Virtual MIDI & IAC Bus Channel Mapping | Web MIDI API |
| **Phase 2** | Max for Live (M4L) Device & WebSocket Sync | Max/MSP + Node WebSockets |
| **Phase 3** | Ableton Link Transport Sync | Ableton Link C++ / Rust SDK |
| **Phase 4** | Native Desktop App & 4K FFmpeg Exporter | Tauri v2 + Rust |
