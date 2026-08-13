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
- The selection and the loop are **separate**, and converted between explicitly. See FR-3.

**Fixed along the way:** the ✕ clear button never worked. The header bar captured the pointer
on `pointerdown`, which retargets the click away from the button.

Covered by `tests/e2e/selection.spec.mjs`.

---

## FR-2 — Playback performance with high-resolution video · Proxy path done

720p scrubbed smoothly; higher resolutions stuttered and couldn't keep up.

Direction agreed: stay standalone and fix the proxy rather than move to a host application.
Curve export for other tools is deferred.

**Shipped**

*Extraction* (`packages/ffmpegExtractor.ts`) was a stub: a fixed `fps=10, -frames:v 120` at
full resolution as PNG, so it covered only the first 12 seconds of any clip and produced
frames far too large to hold. It now:
- reads the clip's real duration and height out of ffmpeg's own output, which works for
  formats the browser itself cannot decode — the point of a proxy
- picks a sampling rate that fits the whole clip inside a frame budget, lowering the rate
  rather than truncating, so a ten-minute clip is covered end to end
- downscales to 540p (never upscales) and writes JPEG instead of PNG
- frees each frame from the wasm filesystem as it reads it, and terminates the core
  afterwards instead of leaving its heap alive for the session
- gives up with a readable message instead of spinning forever when the decoder stops
  answering, which it does on clips too large for the wasm heap

*Playback* (`preview/FrameSequenceScene.tsx`) uploaded every frame to the GPU before showing
anything, so a proxy covering a whole clip was unusable by construction. Frames are now
decoded on demand around the playhead through a capped cache (`packages/frameLoader.ts`),
and video memory no longer grows with the clip's length.

*Direct video scrubbing* (`preview/ScrollyVideoPlayer.tsx`) issued a seek on every scroll
tick. A seek arriving while another is running is dropped by the browser, and on a
high-resolution long-GOP file they arrive faster than they complete, so the picture fell
behind a backlog of stale positions. It now holds only the newest target and applies it when
the running seek lands.

Covered by `tests/e2e/proxy.spec.mjs`.

**Still open**

The proxy is only reachable through "Extract Frames" on the single master asset. The video
pads scrub their clips directly, so they do not benefit from it yet — wiring per-pad proxies
(extraction queue, storage in IndexedDB, automatic fallback) is the natural next step.

The Video Frames lane says 'Click "Load as Scene" to preview', but no such button exists —
the only thing that switches the viewport to the frame sequence is the Extract button.

---

## FR-3 — Selection and loop · Done

Drawing a region used to overwrite the loop range and switch looping on, so the two always
showed the same span in two colours and you could not scope an edit without moving where
playback repeated.

They are different jobs — the loop is a transport setting, the selection is edit scope — and
keeping them separate is what lets you loop an eight-bar section while smoothing one beat
inside it. So the automatic overwrite is gone, and converting between them is explicit:

- **⟳ on the region header** loops the selected region
- **Double-click the loop bar** selects the loop's range for editing

Fixed alongside: clicking the loop bar let the click bubble to the track behind it, whose
handler re-centres the loop on the pointer — so releasing a drag of the bar moved it a
second time.

---

## Known issues carried over from the audit

Not feature requests, but open and worth keeping visible.

- ~~**10-second playback cap.**~~ Fixed. Theatre clamps its sequence position to a length
  fixed when the project is created; `sequence.length` looks assignable but is not a setter,
  and a length seeded through `getProject({ state })` is ignored once Studio has persisted a
  state for that project — so seeding could never have helped an existing install. The clock
  now lives in `theatre/playhead.ts` and the position is mirrored into Theatre only to keep
  the Studio UI in step. Covered by `tests/e2e/transport.spec.mjs`.
- **MIDI recording timing** was fixed but never tested against real hardware.
- **Temporary build banner** in `Layout.tsx` to be removed when no longer useful.
