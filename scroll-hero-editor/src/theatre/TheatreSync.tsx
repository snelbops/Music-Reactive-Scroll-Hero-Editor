import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { sceneParamsObj, cssOpacityObj, sheet, SEQUENCE_DURATION } from './core';
import { interpolateScrollAt, interpolateParamAt, type ParamKf } from '../utils/interpolate';

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
                        useStore.getState().setSceneProgress(interpolateScrollAt(kfs, 0, SEQUENCE_DURATION));
                        // Param lane interpolation at loop restart
                        const pkfs0 = useStore.getState().paramKeyframes;
                        const rSpeed0 = interpolateParamAt((pkfs0['rotationSpeed'] ?? []) as ParamKf[], 0);
                        if (rSpeed0 !== null) useStore.getState().setRotationSpeed(rSpeed0);
                        const depth0 = interpolateParamAt((pkfs0['depth'] ?? []) as ParamKf[], 0);
                        if (depth0 !== null) useStore.getState().setParticleDepth(depth0);
                        const size0 = interpolateParamAt((pkfs0['size'] ?? []) as ParamKf[], 0);
                        if (size0 !== null) useStore.getState().setParticleSize(size0);
                        const opacity0 = interpolateParamAt((pkfs0['cssOpacity'] ?? []) as ParamKf[], 0);
                        if (opacity0 !== null) useStore.getState().setCssOpacity(opacity0);
                        lastTime = now;
                        rafId = requestAnimationFrame(tick);
                    } else {
                        sheet.sequence.position = SEQUENCE_DURATION;
                        const kfs = useStore.getState().scrollKeyframes;
                        useStore.getState().setSceneProgress(interpolateScrollAt(kfs, SEQUENCE_DURATION, SEQUENCE_DURATION));
                        useStore.getState().setIsPlaying(false);
                        useStore.getState().setIsRecording(false);
                    }
                    return;
                }
                sheet.sequence.position = nextPos;
                // Don't override scroll while user is actively dragging the scrub handle
                if (!useStore.getState().isScrubbing) {
                    const kfs = useStore.getState().scrollKeyframes;
                    useStore.getState().setSceneProgress(interpolateScrollAt(kfs, nextPos, SEQUENCE_DURATION));
                }
                // Param lane interpolation
                const pkfs = useStore.getState().paramKeyframes;
                const rSpeed = interpolateParamAt((pkfs['rotationSpeed'] ?? []) as ParamKf[], nextPos);
                if (rSpeed !== null) useStore.getState().setRotationSpeed(rSpeed);
                const depth = interpolateParamAt((pkfs['depth'] ?? []) as ParamKf[], nextPos);
                if (depth !== null) useStore.getState().setParticleDepth(depth);
                const size = interpolateParamAt((pkfs['size'] ?? []) as ParamKf[], nextPos);
                if (size !== null) useStore.getState().setParticleSize(size);
                const opacity = interpolateParamAt((pkfs['cssOpacity'] ?? []) as ParamKf[], nextPos);
                if (opacity !== null) useStore.getState().setCssOpacity(opacity);
            }
            lastTime = now;
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isPlaying, isLoop]);

    return null;
}
