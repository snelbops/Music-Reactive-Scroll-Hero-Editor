# Testing Patterns

**Analysis Date:** 2026-03-08

## Test Framework

**Runner:**
- None installed. No test runner is configured in `scroll-hero-editor/package.json` or `package.json`.
- The root `package.json` test script is: `"test": "echo \"Error: no test specified\" && exit 1"`
- No `jest.config.*`, `vitest.config.*`, or `playwright.config.*` files exist anywhere in the project.

**Assertion Library:**
- None

**Run Commands:**
```bash
# No test commands available. Running `npm test` from project root exits with error code 1.
```

## Test File Organization

**Location:**
- No test files exist. A search across the entire repository found zero `*.test.*` or `*.spec.*` files.

**Naming:**
- Not applicable — no tests.

## Test Structure

No test structure established. The codebase is in early prototype/development phase with no testing infrastructure set up.

## Mocking

**Framework:** None

**What to Mock (recommended for future tests):**
- `useStore` from `scroll-hero-editor/src/store/useStore.ts` — the central Zustand store; mock with `vi.mock` (Vitest) or `jest.mock` with a factory
- `scroll-hero-editor/src/theatre/core.ts` — Theatre.js project/sheet singletons are module-level side effects that should be mocked to prevent real Theatre.js initialization in tests
- `scroll-hero-editor/src/packages/useKickDrumData.ts` — already uses mock data internally (static sine wave + fixed beat timestamps), but the hook itself needs to be mockable for component tests
- `URL.createObjectURL` — used in file import handlers in `scroll-hero-editor/src/editor/LeftPanel.tsx`
- `requestAnimationFrame` / `cancelAnimationFrame` — used in `GhostTrailCanvas.tsx` and `TheatreSync.tsx`
- `ResizeObserver` — used in `Timeline.tsx` to measure lane widths

**What NOT to Mock:**
- Zustand store logic itself — prefer testing with the real store when testing store actions/state transitions

## Fixtures and Factories

**Test Data:**
- No fixtures exist. The codebase already contains mock data stubs that serve as a starting point:
  - `scroll-hero-editor/src/packages/useKickDrumData.ts` — hardcoded mock beats (`[1.2, 2.4, 3.6, 4.8, 6.0]`) and a 1024-sample sine wave `Float32Array`
  - `scroll-hero-editor/src/packages/frameLoader.ts` — stub implementations with `console.log` and no-op returns
  - Default video URL hardcoded in store: `'https://scrollyvideo.js.org/goldengate.mp4'`

**Location:**
- No `__fixtures__`, `__mocks__`, or `test/` directories exist.

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not configured. No coverage tooling installed.
```

## Test Types

**Unit Tests:**
- Not present. Candidates for unit testing:
  - `scroll-hero-editor/src/store/useStore.ts` — state mutations and selectors
  - `scroll-hero-editor/src/theatre/core.ts` — Theatre.js object configuration (with mocked `@theatre/core`)
  - `scroll-hero-editor/src/packages/useKickDrumData.ts` — hook state transitions on `audioUrl` change
  - `scroll-hero-editor/src/packages/frameLoader.ts` — async stubs

**Integration Tests:**
- Not present. Candidates:
  - `TheatreSync` ↔ Zustand store wiring
  - `Timeline.tsx` scrub interaction (mousedown → seekTo → scrollProgress update)
  - `RecordMode.tsx` → `pushRecordedEvent` → `GhostTrailCanvas` custom event dispatch

**E2E Tests:**
- Not used. No Playwright or Cypress configuration present.

## Recommended Testing Setup

When adding tests, the standard stack for this project (React 19 + TypeScript + Vite) is:

```bash
# Install Vitest + React Testing Library
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event
```

Add to `scroll-hero-editor/vite.config.ts`:
```typescript
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.ts',
}
```

Add to `scroll-hero-editor/tsconfig.app.json` types:
```json
"types": ["vite/client", "vitest/globals"]
```

## Common Patterns (Recommended)

**Async Testing (Vitest):**
```typescript
it('loads kick drum data after audioUrl is set', async () => {
  const { result } = renderHook(() => useKickDrumData('mock://audio.mp3'));
  expect(result.current.isReady).toBe(false);
  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(result.current.beats).toHaveLength(5);
});
```

**Store Testing:**
```typescript
it('updates scrollProgress via setScrollProgress', () => {
  const { setScrollProgress } = useStore.getState();
  setScrollProgress(0.75);
  expect(useStore.getState().scrollProgress).toBe(0.75);
});
```

---

*Testing analysis: 2026-03-08*
