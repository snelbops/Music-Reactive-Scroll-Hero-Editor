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
