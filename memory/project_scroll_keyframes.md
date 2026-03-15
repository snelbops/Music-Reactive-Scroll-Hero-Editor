---
name: Scroll Keyframe System — current state
description: Custom Zustand keyframe system replacing Theatre.js scroll automation, recording, UI resize, overdub
type: project
---

## Architecture (all committed to main)

Theatre.js scroll automation REPLACED with custom Zustand keyframe system:
- `scrollKeyframes: { time: number; value: number }[]` in useStore
- `addScrollKeyframe(time, value, rangeStart?)` — range-clear overdub when rangeStart provided; falls back to ±16ms dedup without it
- `clearScrollKeyframes()`, `setScrollKeyframes(kfs)`
- TheatreSync.tsx: RAF loop interpolates `scrollKeyframes` at current time → `setSceneProgress`
- No keyframes = linear default (t/SEQUENCE_DURATION)
- End-of-clip: `setIsPlaying(false)` + `setIsRecording(false)` called from RAF

## Recording mechanism

- Live recording: `Viewport.tsx` `onPointerMove` writes `addScrollKeyframe(t, p, lastRecordedTimeRef.current)` when `isRecording && isPlaying`
- `lastRecordedTimeRef` tracks previous sample time — passed as rangeStart for clean range-erase overdub
- `lastRecordedTimeRef` reset to null on `isRecording` → false
- Wheel scrub also records when armed+playing (same range-clear approach)
- `onPointerUp` intentionally NO-OP (pointer capture causes it to fire on Stop click)
- 3-2-1 countdown overlay before recording: `recordCountdown: number | null` in store
- Countdown fires `setIsPlaying(false)` then `setTimeout(() => setIsPlaying(true), 0)` to guarantee RAF restarts
- Stop button: single click halts play + disarms recording. Double-click removed (was clearing trail visually)
- Loop + overdub: works naturally — loop restart never clears keyframes; new samples overwrite old ones in their time range

## Scroll POS lane

- Draggable height (same as all other lanes) — expand toggle removed
- `scrollVbH = laneH('scrollPos', 48)` drives SVG viewBox height
- Audio waveform ghost shows when lane > 60px tall and audio loaded
- Clear button: ✕ shown when keyframes exist
- Ghost trail (raw scrollHistory): faint `rgba(168,85,247,0.2)` 1px line
- Automation curve (keyframe bezier): `rgba(255,255,255,0.85)` 2px prominent line
- Draggable dots: r=1.5 unselected, r=3 selected; drag updates scrollKeyframes

## UI resize (all committed)

- Layout.tsx: `timelineH`, `leftW`, `rightW` state + `startDrag` helper
- 1px drag handles between panels (purple on hover/active)
- Timeline, LeftPanel, Inspector accept `height`/`width` props with defaults
- All timeline lanes have `relative` + bottom drag handle (`makeLaneDrag` helper, min = default height)
- Scroll POS lane default 48px (h-12)

## Auto frame extraction

- `mp4Asset` defaults to `{ name: 'sample.mp4', url: '/sample.mp4' }` in store
- `public/sample.mp4` present in repo
- LeftPanel auto-extracts on mount if `extractionStatus === 'idle'` and no frames

## Known future work

- Beat detection → auto-generate automation patterns matched to audio peaks
- Automation pattern library (saved/built-in patterns)
- "Average overdub" mode toggle (vs current clean range-clear): call `addScrollKeyframe(t, v)` without rangeStart to use ±16ms dedup
