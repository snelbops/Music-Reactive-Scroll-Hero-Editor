# Scroll Hero Editor — Code Audit

**Date:** 2026-08-12 · **Scope:** `scroll-hero-editor/src` (9,737 lines) · **Branch:** `claude/playhead-controller-param-glitches-hhdlzv`

A scan for bugs, robustness gaps, and feature opportunities. Nothing here is implemented yet — this is for review first.

**How to read the evidence column:** ✅ *Verified* means reproduced in the running app with Playwright. 📖 *Code* means read from source and traced, but not executed. I've kept the two separate deliberately — during the last round two of my "obvious" findings turned out to be test artifacts, so unverified means unverified.

---

## 1. Bugs

Ordered by user impact.

### B1 — One Ctrl/Cmd+Z undoes two steps ✅ Verified

`Timeline.tsx:992` and `Layout.tsx:149` **both** register a global keydown listener for undo/redo. One on `window`, one on `document`. Both fire for the same keypress, so every undo steps back twice. Redo (`Cmd+Shift+Z`, `Ctrl+Y`) is duplicated the same way.

> Reproduced: placed 4 keyframes, pressed `Ctrl+Z` once, **2** disappeared.

**Fix:** delete the duplicated block from one file. `Layout.tsx` also owns fullscreen and play/pause, so keeping the handler there and removing it from `Timeline.tsx` is the smaller change.

**Severity: High** — silent data loss, and it makes undo untrustworthy.

---

### B2 — Pad videos break after a page reload 📖 Code

This hits the core workflow (switching videos with the pads).

Uploading to a pad stores the file in IndexedDB under `video-pad-${idx}` (`LeftPanel.tsx:192`) and puts the resulting `blob:` URL in `videoPads[idx].url`. That URL is persisted to `localStorage` by the autosave.

`blob:` URLs die with the page. On reload, `loadWorkingProject()` restores **only** `active-audio` and `active-video` (`project.ts:263-273`) — there is no `video-pad-*` restore anywhere in the codebase. So every pad still shows its name, but `pad.url` points at a revoked blob and `setVideoUrl(pad.url)` (`LeftPanel.tsx:228`) loads nothing.

Same gap for `light-img-${name}` — saved, never restored.

**Fix:** on load, iterate the pads and re-hydrate each `url` from IndexedDB via `loadMediaFile('video-pad-' + idx)`. Do the same for light images.

**Severity: High** — the pad grid appears populated but is dead until you re-upload.

---

### B3 — Swapping pads desyncs them from their stored video 📖 Code

`swapVideoPads` (`useStore.ts:234`) swaps the two entries in the array, but the IndexedDB keys stay `video-pad-${idx}` — tied to position, not to the pad. Clicking a pad reads `getMediaDataUrl('video-pad-' + idx)` (`LeftPanel.tsx:229`) using the **new** index, so after a drag-to-reorder the pad plays the other pad's file.

**Fix:** key stored media by a stable pad id rather than array index, and swap the stored blobs alongside the array. Depends on B2 being fixed first (they touch the same code).

**Severity: High** (once B2 is fixed; currently masked by it)

---

### B4 — HTML export is always 10 seconds 📖 Code

`SEQUENCE_DURATION` in `theatre/core.ts` is a hardcoded `10`, but the store's `sequenceDuration` is dynamic — the LEN field sets it, and importing audio sets it to the track length (`Timeline.tsx:1412`).

`exportHtml.ts` embeds the constant into the generated page (lines 137, 282) and into `exportCurvesJson` (line 322). Export a 45-second project and you get a 10-second page with the animation truncated.

Worth being precise about the blast radius — most exports are fine:

| Export path | Duration source | Status |
|---|---|---|
| `exportParticleHeroHtml` / `exportFrameSequenceHeroHtml` | `SEQUENCE_DURATION` constant | ❌ always 10s |
| `exportCurvesJson` | `SEQUENCE_DURATION` constant | ❌ always 10s |
| `exportLoopRegionJson` (line 356) | store `sequenceDuration` | ✅ correct |
| `exportVideo.ts` / `VideoExportModal` / Remotion | store `sequenceDuration` | ✅ correct |

**Fix:** thread `useStore.getState().sequenceDuration` into the export instead of importing the constant.

**Severity: High** — produces silently wrong output.

---

### B5 — The same hardcoded 10s leaks into four interactions 📖 Code

Same root cause as B4, smaller blast radius:

| Location | Effect on a project longer than 10s |
|---|---|
| `Viewport.tsx:71-72` | Wheel-scrubbing the preview clamps at 10s — can't reach the rest |
| `Inspector.tsx:398` | Scroll shape presets (Linear, S-Curve, …) only span the first 10s |
| `Timeline.tsx:1046,1049` | Scroll-driven playhead maps progress onto 10s |
| `useStore.ts:468` | `pasteKeyframes` clamps pasted times to 10s |

**Fix:** replace the constant with the store value at each site. Worth doing as one pass with B4.

**Severity: Medium**

---

### B6 — MIDI recording writes keyframes at the wrong time 📖 Code

`webMidi.ts:52`:

```js
const time = store.scrollProgress;          // 0..1 progress, not seconds
store.addScrollKeyframe(time, normalizedValue);
```

`time` should be the playhead position in seconds. Worse, `scrollProgress` was just overwritten with `normalizedValue` four lines earlier, so the keyframe lands at `time === value`. Every MIDI-recorded keyframe is written into the first second, at a time equal to its own value.

**Fix:** use `store.playheadPosition` (or `sheet.sequence.position`).

**Severity: Medium** — the feature is unusable, but likely few people have tried it.

---

### B7 — Loading a project forces the preset to "video" 📖 Code

`applyProjectDataToStore` restores `activePreset` at `project.ts:204`, then calls `setActiveVideoPadIdx` at line 228 — which unconditionally sets `activePreset: 'video'` (`useStore.ts:213`). Any project saved with `orbit`, `light`, `frames`, etc. reopens in video mode.

**Fix:** restore `activePreset` last, or add a flag to `setActiveVideoPadIdx` that skips the preset switch during load.

**Severity: Medium**

---

### B8 — "New Project" keeps the previous session's recordings 📖 Code

`startNewProject()` applies the blank template, but the template object has no `recordedEvents` or `padSwitchEvents` keys — and `applyProjectDataToStore` guards each restore with `if (data.recordedEvents)`. Falsy, so they're skipped and the old data survives into the "new" project. `videoPads`, `mp4Asset`, `audioUrl` and `videoUrl` are also untouched.

Keeping the media loaded may well be intentional; keeping a stale mouse recording is not.

**Fix:** have `startNewProject` explicitly clear the event arrays.

**Severity: Medium**

---

### B9 — Uploading to a pad and clicking a pad select different presets 📖 Code

`setVideoPad` sets `activePreset: 'frames'` (`useStore.ts:224`); `setActiveVideoPadIdx` sets `activePreset: 'video'` (line 213). So dropping a file on a pad puts you in frame-sequence mode, and clicking that same pad a moment later switches you to video mode — different renderers, different look, no explanation.

**Fix:** pick one and use it in both. `'video'` looks correct given the pad workflow.

**Severity: Medium**

---

### B10 — A keyframe sitting under the playhead can't be clicked ✅ Verified

The playhead's drag strip is `w-[1.5px] … z-[60] pointer-events-auto`; keyframe dots are `z-30`. Where they overlap the playhead wins, so the dot is unselectable until you move the playhead.

> Hit this while writing tests — `document.elementFromPoint` on the dot returned the playhead div.

**Fix:** give the dots a higher z-index than the playhead strip, or make the strip `pointer-events-none` except on its grab handle.

**Severity: Low** — narrow target, but confusing when it happens.

---

### B11 — Tool shortcuts fire while typing in a textarea 📖 Code

`Timeline.tsx:994` guards only `INPUT`:

```js
if ((e.target as HTMLElement).tagName === 'INPUT') return;
```

`TEXTAREA`, `SELECT` and `contentEditable` fall through, so typing "developed" in a textarea switches tool four times. `LeftPanel.tsx:104` already does this correctly — it checks all three.

**Severity: Low** (no textareas today, but it's a trap for the next one added)

---

### B12 — Autosave can fail silently 📖 Code

`autoSaveWorkingProject` writes the whole project — including every recorded mouse event and all keyframes — to `localStorage` inside `try { … } catch (e) {}`. `localStorage` caps around 5 MB. A long recording at 60 Hz plus a dense RMS envelope will exceed it, and the `QuotaExceededError` is swallowed. Work stops being saved with no indication.

**Fix:** at minimum surface the failure. Better: move the payload to IndexedDB, which is already wired up and has no practical size cap.

**Severity: Medium** — low likelihood, total data loss when it hits.

---

## 2. Code health

Not bugs, but they're what make bugs likely.

| Issue | Measured | Note |
|---|---|---|
| **No tests** | 0 files | `npm test` is `echo "Error: no test specified" && exit 1`. Every fix so far has been verified by driving a browser — repeatable, but not something CI can run. |
| **`Timeline.tsx` is 3,534 lines** | 36% of the codebase | One component holding the transport, all lane renderers, all five tools, the rhythm generator and the context menu. The keyframe-dot handler is nested ~10 levels deep. This is the single biggest obstacle to changing anything safely. |
| **119 ESLint errors** | all `no-explicit-any` | Down from 125 after last round's hooks fixes. 75 `as any` casts, concentrated in the drag handlers where they hide the real shapes. |
| **20 empty catch blocks** | `catch (e) {}` | Every storage and media failure is silent. |
| **Object URLs never revoked** | `mediaStore.ts:39,54` | Every `saveMediaFile`/`loadMediaFile` mints a URL that is never released. Switching pads repeatedly leaks the whole video each time. |
| **IndexedDB never closed** | `mediaStore.ts:7` | `openDB()` opens a fresh connection per operation, none closed. |
| **5 npm vulnerabilities** | 1 low, 4 high | `npm audit fix` clears them; PostCSS advisory is the notable one. |
| **1 `aria-label` in the app** | — | Icon-only buttons throughout; `<body>` is globally `select-none`. Unusable with a screen reader and largely unusable by keyboard. |

---

## 3. Performance

**Bundle is 2.22 MB (652 KB gzipped) in a single chunk.**

The clearest win: **`@theatre/studio` ships to production but only runs in dev.** `core.ts` guards the call —

```js
if (typeof window !== 'undefined' && import.meta.env.DEV) { studio.initialize(); }
```

— but the `import studio from '@theatre/studio'` is static and side-effectful, so Vite can't drop it. I confirmed the studio code is present in `dist/`. A dynamic `await import()` inside the dev guard removes it from the production bundle entirely.

Others, roughly in value order:

- **`three` / `@react-three/fiber` / `drei`** load eagerly even for the video presets that never touch WebGL. Lazy-loading the particle scenes would cut first paint substantially.
- **Audio sync effect re-runs every frame** — `Timeline.tsx:972` depends on `seqTime`, which ticks ~60×/s during playback. The body is cheap but it re-runs the whole effect each frame.
- **No code splitting at all** — Vite already warns about the 500 KB chunk limit.
- **`LaneInspector` used to subscribe to the entire store** — fixed last round, but worth checking for the same pattern elsewhere.

---

## 4. Feature opportunities

Ideas, roughly by value-to-effort. Nothing here is needed to fix a defect.

### Strong fit for what the tool already does

1. **Restore + manage pad media properly.** Once B2/B3 are fixed, the pad grid becomes a real clip library: name, thumbnail, duration, clear-pad, reorder without breakage. This is the app's signature interaction and currently the most fragile part.
2. **Frame-accurate playhead stepping.** Arrow keys to step one frame, `Shift`+arrow for a second, `Home`/`End` to jump. There's no keyboard transport at all today.
3. **Numeric time entry for a keyframe.** The Inspector shows Position read-only; letting it be edited (as Value now is) closes an obvious gap.
4. **Curve presets library.** Save the current lane's shape as a named preset and reapply it elsewhere. The Rhythm generator already has save/load for its settings, so the pattern exists.
5. **Marquee select across lanes.** Region select works on time; a rubber-band box over keyframes would make batch editing usable now that multi-select works.
6. **Copy/paste a whole lane** or a time range across lanes.

### Bigger bets

7. **Undo history panel.** With the double-undo bug fixed, showing the stack (and letting you jump to a point) is a natural follow-on — the snapshots already exist in `_past`/`_future`.
8. **Export presets for social.** 9:16 / 1:1 / 16:9 at set durations and bitrates. The aspect ratio switcher is already there; this is mostly plumbing into the export modal.
9. **Beat-grid overlay + quantise.** `snapToBeat` and beat detection exist; drawing the grid on every lane and offering "quantise selection to beat" would make the music-reactive angle much stronger.
10. **Spectrogram or multi-band audio lanes.** Currently one RMS envelope. Splitting low/mid/high would let different parameters react to different parts of the mix — a genuinely differentiating feature for a music-reactive tool.
11. **MIDI learn.** Fix B6 first, then let the user map any CC to any lane instead of the hardcoded list.

### Foundational

12. **A test suite.** Even a thin one. The Playwright scripts I've been using to verify fixes could become the seed of a regression suite — they already cover the timeline resize, tool cursors, draw overwrite, bezier monotonicity, curve cleanup, and the inspector edits.
13. **Split `Timeline.tsx`.** Lane renderers, tool handlers and the rhythm generator are three separable concerns. Worth doing before the next large feature, not as its own project.

---

## 5. Suggested order

| Phase | Items | Why |
|---|---|---|
| **1 — Quick wins** | B1, B10, B11 | Small, isolated, immediately felt. B1 especially. |
| **2 — Correctness** | B4, B5, B6, B7, B8, B9 | Mostly one theme (duration constant) plus load/reset correctness. Wrong output is worse than a crash. |
| **3 — Pad media** | B2, B3, B12 | One coherent piece of work on persistence; fixes the signature workflow. |
| **4 — Hardening** | Lazy-load Theatre studio, `npm audit fix`, revoke object URLs, seed the test suite | Cheap, and phase 4 makes everything after it safer. |
| **5 — Features** | Pick from §4 | Once the foundation holds. |

Phases 1 and 2 are about half a day of work together and I'd suggest doing them as one PR. Phase 3 is its own change — it touches the storage schema.

---

## Notes on confidence

Two items (B1, B10) I reproduced in a running browser. The rest I traced through the source but did not execute — each names the file and line so they're quick to confirm or dismiss. If any look wrong, say so and I'll verify before touching them.

I'd particularly want to confirm B2/B3 in the app before rewriting the storage schema, since they're the largest change and I've only read the code path.
