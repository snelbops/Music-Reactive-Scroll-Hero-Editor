import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { sceneParamsObj, cssOpacityObj, sheet, SEQUENCE_DURATION } from './core';

/**
 * Linearly interpolate scrollKeyframes at time t (seconds).
 * With no keyframes: returns t/duration (linear default = Cavalry diagonal).
 */
function interpolateScrollAt(keyframes: { time: number; value: number }[], t: number): number {
    if (keyframes.length === 0) return t / SEQUENCE_DURATION;
    if (keyframes.length === 1) return keyframes[0].value;
    if (t <= keyframes[0].time) return keyframes[0].value;
    if (t >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;
    for (let i = 0; i < keyframes.length - 1; i++) {
        const a = keyframes[i];
        const b = keyframes[i + 1];
        if (t >= a.time && t <= b.time) {
            const alpha = (t - a.time) / (b.time - a.time);
            return a.value + alpha * (b.value - a.value);
        }
    }
    return t / SEQUENCE_DURATION;
}

/**
 * TheatreSync — logic-only component mounted at the app root.
 *
 * - RAF loop advances sheet.sequence.position (the clock) during playback
 * - Interpolates scrollKeyframes at current time → setSceneProgress (custom system)
 * - sceneParamsObj / cssOpacityObj still wired through Theatre.js
 * - Loop support: when isLoop is true, restarts sequence from 0 at end
 */
export default function TheatreSync() {
    const isPlaying = useStore((state) => state.isPlaying);
    const isLoop = useStore((s) => s.isLoop);

    // Scene parameter lanes → Zustand (drives GithubTestParticleField props)
    useEffect(() => {
        return sceneParamsObj.onValuesChange((values) => {
            useStore.getState().setRotationSpeed(values.rotationSpeed);
            useStore.getState().setParticleDepth(values.depth);
            useStore.getState().setParticleSize(values.size);
        });
    }, []);

    // CSS Opacity lane → Zustand
    useEffect(() => {
        return cssOpacityObj.onValuesChange((values) => {
            useStore.getState().setCssOpacity(values.opacity);
        });
    }, []);

    // RAF play loop — advances sequence position and drives scroll via custom keyframes
    useEffect(() => {
        if (!isPlaying) return;
        // If we're at the end, restart from beginning
        if (sheet.sequence.position >= SEQUENCE_DURATION) {
            sheet.sequence.position = 0;
        }
        let lastTime: number | null = null;
        let rafId: number;
        const tick = (now: number) => {
            if (lastTime !== null) {
                const delta = now - lastTime;
                const nextPos = sheet.sequence.position + delta / 1000;
                if (nextPos >= SEQUENCE_DURATION) {
                    if (isLoop) {
                        sheet.sequence.position = 0;
                        const kfs = useStore.getState().scrollKeyframes;
                        useStore.getState().setSceneProgress(interpolateScrollAt(kfs, 0));
                        lastTime = now;
                        rafId = requestAnimationFrame(tick);
                    } else {
                        sheet.sequence.position = SEQUENCE_DURATION;
                        const kfs = useStore.getState().scrollKeyframes;
                        useStore.getState().setSceneProgress(interpolateScrollAt(kfs, SEQUENCE_DURATION));
                        useStore.getState().setIsPlaying(false);
                        useStore.getState().setIsRecording(false);
                    }
                    return;
                }
                sheet.sequence.position = nextPos;
                const kfs = useStore.getState().scrollKeyframes;
                useStore.getState().setSceneProgress(interpolateScrollAt(kfs, nextPos));
            }
            lastTime = now;
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isPlaying, isLoop]);

    return null;
}
