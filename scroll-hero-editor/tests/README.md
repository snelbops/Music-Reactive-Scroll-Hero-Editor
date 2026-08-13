# End-to-end checks

These drive the real editor in a browser. The project has no unit tests, and most of its bugs
have lived in pointer handling, z-order and persistence — none of which a type check catches.

Every assertion here was written against a bug that was reproduced first, and each was confirmed
to **fail** before its fix landed. That matters: a test that passes both before and after proves
nothing, and two of these caught exactly that during development.

## Running them

```bash
npm run dev            # in one terminal — the suite needs a live server
npm run test:e2e       # in another
```

Run a subset by name:

```bash
npm run test:e2e -- pads
```

Point at a different server with `SCROLL_HERO_URL=http://localhost:4173/`.

Screenshots land in `tests/e2e/.artifacts/` (git-ignored) — useful when something fails.

## Browser

Playwright is a devDependency but browsers are downloaded separately:

```bash
npx playwright install chromium
```

In a container with browsers pre-installed, set `CHROMIUM_PATH` (or rely on the default
`/opt/pw-browsers/chromium`).

## What each spec covers

| Spec | Covers |
|---|---|
| `timeline` | Panel resize and preview shrink · per-tool cursors · audio region select with a drawing tool · freehand draw overwriting its span · bezier curves staying single-valued · keyframes under the playhead being clickable |
| `inspector` | Panel for lanes without keyframes · hook stability when switching lane types · Enter committing a value · multi-select · per-lane clamping on batch edits · nudge refreshing the readout · the bezier editor following the selection |
| `project` | Undo/redo stepping once · typing guard · curve smooth/reduce · export duration · shape presets spanning the project · renderer consistency · preset restore · New Project resetting recordings |
| `pads` | Each pad serving its own clip · reordering moving the clip and not the slot label · media surviving a reload · legacy index-keyed projects migrating |
| `selection` | The blue time selection: resizing from either edge · a near miss on the edge still resizing · edges not crossing · sliding the region · the intensity drag surviving the axis split · selection and loop staying independent and converting both ways · the clear button |
| `easing` | The Line tool's click–preview–click gesture and Esc · easing presets reaching keyframes that carry bezier handles · a second preset click acting on the same selection |
| `transport` | Scrubbing and playback running past the old 10-second ceiling · the playhead line tracking it · the lane labels covering a playhead scrolled behind them |
| `padproxy` | Building a proxy from a pad's own button · the viewport drawing it instead of seeking the clip · the proxy being keyed by clip rather than slot · surviving a reload |
| `transport-audio` | One audio player rather than two · the loop still wrapping while recording, without stretching the sequence |
| `punchin` | The timeline opening on the Scroll POS lane · punch-in ending on a pause, a loop wrap or a reset, but not on a held-still control · a second recording pass leaving the stretch it never touched alone |
| `midi` | Note-on pad switching and note-off being ignored · the knob sweep recording across the timeline rather than bunching at zero · the connection indicator. Driven by a fake MIDIAccess injected before boot, so no hardware is needed. |
| `proxy` | How a clip is sampled for the frame proxy · reading its shape out of ffmpeg's log · real extraction end to end · giving up rather than hanging · the cap on decoded frames held on the GPU |

## Writing more

`harness.mjs` has the shared pieces: `freshPage`, `seededPage`, `laneBox`, `laneDots`,
`pickTool`, `setTimelineTop`, `project`, and a small reporter.

Two traps worth knowing, both of which produced false passes here:

- **The app autosaves on `beforeunload`.** Writing `localStorage` and reloading is always
  clobbered by the outgoing page. Use `seededPage`, which seeds in an init script.
- **The playhead's grab strip can sit over a keyframe dot.** Park it elsewhere before clicking
  a dot, or the click lands on the playhead.

Also note React ignores a directly assigned `input.value`; use the native setter when
simulating input.

`proxy.spec.mjs` works differently from the rest: it serves a blank document on the app's
origin and imports the app's own modules from the dev server, so it exercises the real code
without booting the editor next to it. Two things to know if you extend it:

- **The wasm decoder has a ceiling in a container.** Headless Chromium here cannot grow the
  heap past roughly 170k output pixels per frame; above that the ffmpeg core stops answering
  rather than failing. This is the container's limit, not the app's — the previous
  full-resolution command stalls here too. The app's 480p default sits under it for the test
  clips, so `padproxy` builds through the real UI path; `proxy` asks for a smaller one still.
- **The store cannot be reached from `page.evaluate`.** A dynamic `import()` of the store
  module gets its own instance, not the app's, so writes to it are invisible to the running
  app. Drive the UI instead, or read the autosaved project out of localStorage.
- **Two `exec` calls on one core are fine, but the first must produce an output.** Running
  `-i input` with no output prints the clip's details and exits non-zero, which leaves the
  core wedged for everything after it. Decoding one frame to `-f null -` gets the same
  information and exits cleanly.
