---
name: Handoff — desktop app spike, export bug, scroll blend modes
description: Where the 17 Aug cloud session left off; three open items with diagnosis and design already done
type: handoff
---

## Branch

All work is on `claude/review-desktop-app-plan-k2v1nc`, pushed. Not merged to main, no PR
opened. Four commits: the plan review, the Tauri scaffold, a Rust floor fix, and this note.

## What got done

**The desktop app works.** `scroll-hero-editor/src-tauri/` holds a Tauri 2 shell — the stock
scaffold with three changes: a real bundle identifier (`com.snelbops.scroll-hero-editor`;
the default `com.tauri.dev` refuses to bundle), a 1600×1000 window instead of 800×600, and
`"version": "../package.json"` so there is one version number rather than two. `npm run
tauri dev` opens the editor in a native macOS window and hot-reload works. This is the spike
from `docs/desktop-app-plan.md` §7, deliberately throwaway — `docs/desktop-app-first-run.md`
covers the Mac-side steps and how to delete it.

**`docs/desktop-app-plan.md` carries a full review**, revalidated at `a92acce`. Headline: the
auto-update pipeline as originally written would build and publish but never update anything.

Two environment traps worth remembering:

- `npm install` **fails** in this project. `@theatre/r3f@0.7.2` peer-depends on
  `@react-three/fiber@^8.13.6` against the project's 9.5.0, so npm stops with `ERESOLVE`.
  Always `npm install --legacy-peer-deps`.
- The committed `src-tauri/Cargo.lock` needs **Rust ≥ 1.85** (a transitive dep uses the 2024
  edition). Rust here came from Homebrew, not rustup, so it updates with `brew upgrade rust`.

---

## Open item 1 — export leaves the app in a broken state

**Symptom:** after running an export, the video in the first pad does not play back properly.

**Cause:** `startExport()` in `src/export/exportVideo.ts` mutates shared state throughout its
render loop and never restores any of it. Over the loop it drives:

- `videoEl.currentTime` — left parked at whatever the final frame seeked to
- `activeVideoPadIdx` — replayed from `padSwitchEvents`, left on whichever pad fired last
- `playhead.position`, `scrollProgress`, `rotationSpeed`, `particleDepth`, `particleSize`,
  `cssOpacity` — all overwritten from keyframes at the last rendered frame

`mediaRecorder.onstop` pauses the audio and closes the AudioContext, and stops there. There
is no restore and no `finally`, so cancelled and failed exports leave the same mess.

**Second, likelier cause of the specific symptom:** line ~106 calls `videoEl.captureStream()`
to lift the audio track off the element. That flags the element as captured permanently — it
is not undone by pausing or seeking, and it can change how the element decodes afterwards.

**Fix shape:** snapshot everything the loop touches before it starts, restore in a `finally`
covering the success, cancel and error paths alike. For the captureStream half, prefer
routing audio from a source that is not the live preview element.

**Test note:** per `CLAUDE.md`, the assertion must be confirmed to fail against the current
code before the fix lands. Export, then check the pad still scrubs.

---

## Open item 2 — scroll blend modes (agreed in principle, not started)

**The problem.** An audio-derived envelope (RMS) sits mostly in the bottom of the lane. It
carries rhythm but no progression, so on its own it never walks the video from start to
finish the way the dotted diagonal does.

**Multiply is the wrong operation** and was ruled out. Ramp × envelope at the halfway point
with an envelope of 0.2 gives 0.1 — 10% through the video at the midpoint. It only climbs
near the end where both are high, and it lurches backwards on every quiet bar.

Two modes to add alongside the existing behaviour:

**A — wobble.** Add the envelope as deviation around the diagonal, centred on its own mean so
it does not drag everything down:

```
scroll(t) = t + depth × (envelope(t) − averageEnvelope)
```

Simple, but a deep dip can still push scroll backwards, and it needs clamping at 0 and 1.

**B — accumulate (preferred).** Treat the envelope as *speed* rather than position, then
integrate:

```
scroll(t) = runningTotal(envelope, 0→t) / runningTotal(envelope, 0→end)
```

Loud passages scroll fast, quiet passages nearly stall. Always moves forward, and lands
exactly on 1.0 by construction — no clamping, no drift. The diagonal is not added on; it
emerges from the accumulation.

Then one blend slider:

```
scroll(t) = normalise( (1−mix)·t + mix·accumulated(t) )
```

`mix = 0` is the plain diagonal, `mix = 1` fully beat-driven, and every value between starts
at 0 and ends at 1 — safe to drag live during playback.

**Why this is additive, not a rewrite.** Every scroll value funnels through
`interpolateScrollAt` in `src/utils/interpolate.ts` — six call sites across live playback
(`theatre/TheatreSync.tsx`), the exporter (`export/exportVideo.ts`) and the Remotion render
(`remotion/ScrollHeroRemotion.tsx`). Putting the mode switch inside that one function gives
all three paths consistent behaviour for free, so the exported video cannot disagree with the
preview.

Shape: a store field `scrollBlendMode: 'curve' | 'wobble' | 'accumulate'` defaulting to
`'curve'`, a switch inside `interpolateScrollAt` where `'curve'` returns exactly what it
returns today, and a dropdown on the Scroll POS lane. Existing saved projects load unchanged.

Open question: project-wide or per-lane. Project-wide is simpler and probably right to start.

RMS likely wants smoothing and a gamma curve before it feels good, but get the accumulation
working first.

---

## Open item 3 — scratch files are tracked in git

`scroll-hero-editor/public/temp-export-audio.mp3` and `temp-export-video.mp4` are written by
the Remotion export middleware on every render and are committed to the repository. Every
export dirties the working tree with large binaries, and they show as modified on every
branch switch. They should be gitignored and removed from tracking.

---

## Not started, deliberately

The desktop **port** proper. The spike answered "does it run" (yes). The remaining questions
are Web MIDI under WKWebView — expected to be missing, currently unblocking because number-pad
input covers it — and the render backend, which does not exist in a production build at all.
See `docs/desktop-app-plan.md` §1 and §7.
