# Feature requests

Running list from testing. Nothing here is implemented — items move out when you say the word.

Status: **Open** = noted, not started · **Agreed** = approved to build · **Done** = shipped

---

## FR-1 — Resizable audio selection · Done

The blue time-selection region on the Audio Wave lane could be created but not adjusted.
It now behaves like the loop region above it.

**Shipped**
- Cyan grips on both edges, drag to change start/end, same shape and `ew-resize` cursor as
  the loop region's L/R handles
- Drag the header bar sideways to slide the whole region without resizing it
- The header bar's existing up/down intensity drag (and Alt for scaling) is unchanged — the
  first few pixels of the drag pick the axis, so one bar does both without a modifier

**Decisions made**
- Resizing never edits keyframes. It only changes which keyframes are selected, exactly as
  dragging out a new region does, so the intensity drag afterwards acts on the right ones.
  Nothing is re-generated.
- The loop range still follows the selection while the two match, since they are set together
  when a region is first dragged out. A loop deliberately moved elsewhere is left alone.

**Fixed along the way:** the ✕ clear button never worked. The header bar captured the pointer
on `pointerdown`, which retargets the click away from the button.

Covered by `tests/e2e/selection.spec.mjs`.

---

## FR-2 — Playback performance with high-resolution video · Open, needs a decision

720p scrubs smoothly; higher resolutions stutter and can't keep up.

This is not primarily a browser limitation or a machine limitation — see
"Why high-resolution video stutters" below for the mechanism and the options. The short
version is that the app seeks to an arbitrary time on every scroll tick, which is the
expensive way to read a long-GOP codec, and the proxy path that would avoid it exists but
is currently a stub.

Decision needed on direction before any work starts.

---

## Known issues carried over from the audit

Not feature requests, but open and worth keeping visible.

- **10-second playback cap.** Theatre's sequence length is fixed at its default, so playback
  and scrubbing stop at 10s regardless of the project length. Needs an architectural choice:
  seed the length at project creation, or drive the playhead from our own clock and use
  Theatre only for interpolation. See `docs/Scroll-Hero-Editor-Audit.md`.
- **MIDI recording timing** was fixed but never tested against real hardware.
- **Temporary build banner** in `Layout.tsx` to be removed when no longer useful.
