# Feature requests

Running list from testing. Nothing here is implemented — items move out when you say the word.

Status: **Open** = noted, not started · **Agreed** = approved to build · **Done** = shipped

---

## FR-1 — Resizable audio selection · Open

The blue time-selection region on the Audio Wave lane can be created but not adjusted. The
loop region above it has draggable edges; the selection should behave the same way.

**Wanted**
- Drag either edge to change start/end
- Drag the middle to move the whole region without resizing
- Ideally the same grab affordance and cursor as the loop region, so it reads as the same idea

**Notes for implementation**
The loop region already does this in `Timeline.tsx` via `handleLoopDrag('start' | 'end' | 'bar')`,
so the interaction pattern exists and can be reused rather than reinvented. The selection is
`timeSelection` in the store, set through `setTimeSelection`. The region header already renders
its own bar with a clear (✕) button, which is the natural place to hang the edge handles.

Worth deciding at the same time: whether resizing the selection should also re-run whatever
generated automation from it, or leave existing keyframes alone.

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
