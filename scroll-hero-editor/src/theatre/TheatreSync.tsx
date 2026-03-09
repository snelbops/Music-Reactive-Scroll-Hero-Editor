import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { scrollControlsObj, sheet, SEQUENCE_DURATION } from './core';

/**
 * TheatreSync — logic-only component mounted at the app root.
 *
 * - Wires scrollControlsObj.onValuesChange → setSceneProgress (unified keyframe path)
 * - RAF loop advances sheet.sequence.position during playback; linear fallback
 *   is overwritten by onValuesChange when Theatre.js keyframes exist
 * - Exposes seekTo on the window-level sheet singleton (Timeline uses it too)
 */
export default function TheatreSync() {
    const isPlaying = useStore((state) => state.isPlaying);
    // isLoop read here so it's available for Plan 03's diff without a re-import
    const isLoop = useStore((s) => s.isLoop);

    // Keyframe path: Theatre.js interpolated values → setSceneProgress (drives adapter + Zustand)
    useEffect(() => {
        return scrollControlsObj.onValuesChange((values) => {
            useStore.getState().setSceneProgress(values.position);
        });
    }, []);

    // RAF play loop — advances sequence position; linear fallback when no keyframes
    useEffect(() => {
        if (!isPlaying) return;
        let lastTime: number | null = null;
        let rafId: number;
        const tick = (now: number) => {
            if (lastTime !== null) {
                const delta = now - lastTime;
                const nextPos = sheet.sequence.position + delta / 1000;
                if (nextPos >= SEQUENCE_DURATION) {
                    sheet.sequence.position = SEQUENCE_DURATION;
                    useStore.getState().setScrollProgress(1);
                    useStore.getState().setIsPlaying(false);
                    return;
                }
                sheet.sequence.position = nextPos;
                // Linear fallback (overwritten by onValuesChange if keyframes exist)
                useStore.getState().setScrollProgress(nextPos / SEQUENCE_DURATION);
            }
            lastTime = now;
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isPlaying]);

    // Suppress unused variable lint warning — isLoop is read for Plan 03 wiring
    void isLoop;

    return null;
}
