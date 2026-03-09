import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { scrollControlsObj, sheet, SEQUENCE_DURATION } from './core';

/**
 * TheatreSync — logic-only component mounted at the app root.
 *
 * - Wires scrollControlsObj.onValuesChange → setSceneProgress (unified keyframe path)
 * - RAF loop advances sheet.sequence.position during playback; linear fallback
 *   is overwritten by onValuesChange when Theatre.js keyframes exist
 * - Loop support: when isLoop is true, restarts sequence from 0 at end instead of stopping
 */
export default function TheatreSync() {
    const isPlaying = useStore((state) => state.isPlaying);
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
                    if (isLoop) {
                        sheet.sequence.position = 0;
                        useStore.getState().setSceneProgress(0);
                        lastTime = now; // reset delta to avoid position jump
                        rafId = requestAnimationFrame(tick);
                    } else {
                        sheet.sequence.position = SEQUENCE_DURATION;
                        useStore.getState().setSceneProgress(1);
                        useStore.getState().setIsPlaying(false);
                    }
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
    }, [isPlaying, isLoop]);

    return null;
}
