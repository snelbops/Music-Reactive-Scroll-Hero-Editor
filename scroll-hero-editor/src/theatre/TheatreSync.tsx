import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { sceneParamsObj, cssOpacityObj, sheet } from './core';
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
    const isRecording = useStore((s) => s.isRecording);
    const sequenceDuration = useStore((s) => s.sequenceDuration);
    const loopStart = useStore((s) => s.loopStart);
    const loopEnd = useStore((s) => s.loopEnd);

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

        const recordingActive = useStore.getState().isRecording;
        const loopActive = useStore.getState().isLoop;
        const lStart = useStore.getState().loopStart || 0;
        const lEnd = useStore.getState().loopEnd || sequenceDuration;

        // If starting playback outside loop range, snap to loopStart
        if (loopActive && !recordingActive && (sheet.sequence.position >= lEnd || sheet.sequence.position < lStart)) {
            sheet.sequence.position = lStart;
        }

        let lastTime: number | null = null;
        let rafId: number;

        const tick = (now: number) => {
            if (lastTime !== null) {
                const delta = now - lastTime;
                const nextPos = sheet.sequence.position + delta / 1000;
                const currentDuration = useStore.getState().sequenceDuration;
                const isRec = useStore.getState().isRecording;
                const isLp = useStore.getState().isLoop;
                const startL = useStore.getState().loopStart || 0;
                const endL = useStore.getState().loopEnd || currentDuration;

                // Dynamic duration extension during recording
                if (isRec && nextPos >= currentDuration - 1) {
                    useStore.getState().setSequenceDuration(Math.ceil(nextPos + 5));
                }

                if (isLp && !isRec && (nextPos >= endL || nextPos < startL)) {
                    sheet.sequence.position = startL;
                    const kfs = useStore.getState().scrollKeyframes;
                    useStore.getState().setSceneProgress(interpolateScrollAt(kfs, startL, currentDuration));

                    const pkfs0 = useStore.getState().paramKeyframes;
                    const rSpeed0 = interpolateParamAt((pkfs0['rotationSpeed'] ?? []) as ParamKf[], startL);
                    if (rSpeed0 !== null) useStore.getState().setRotationSpeed(rSpeed0);
                    const depth0 = interpolateParamAt((pkfs0['depth'] ?? []) as ParamKf[], startL);
                    if (depth0 !== null) useStore.getState().setParticleDepth(depth0);
                    const size0 = interpolateParamAt((pkfs0['size'] ?? []) as ParamKf[], startL);
                    if (size0 !== null) useStore.getState().setParticleSize(size0);
                    const opacity0 = interpolateParamAt((pkfs0['cssOpacity'] ?? []) as ParamKf[], startL);
                    if (opacity0 !== null) useStore.getState().setCssOpacity(opacity0);

                    lastTime = now;
                    rafId = requestAnimationFrame(tick);
                    return;
                }

                if (!isLp && nextPos >= currentDuration && !isRec) {
                    sheet.sequence.position = currentDuration;
                    const kfs = useStore.getState().scrollKeyframes;
                    useStore.getState().setSceneProgress(interpolateScrollAt(kfs, currentDuration, currentDuration));
                    useStore.getState().setIsPlaying(false);
                    useStore.getState().setIsRecording(false);
                    return;
                }

                sheet.sequence.position = nextPos;
                // Auto-switch video pads during playback if multi-clip pad events were recorded
                const padEvents = useStore.getState().padSwitchEvents;
                if (padEvents.length > 0) {
                    const activeEv = padEvents.filter(e => e.time <= nextPos).pop();
                    if (activeEv && activeEv.padIdx !== useStore.getState().activeVideoPadIdx) {
                        useStore.getState().setActiveVideoPadIdx(activeEv.padIdx);
                    }
                }
                // Don't override scroll while user is actively dragging the scrub handle
                if (!useStore.getState().isScrubbing) {
                    const kfs = useStore.getState().scrollKeyframes;
                    useStore.getState().setSceneProgress(interpolateScrollAt(kfs, nextPos, currentDuration));
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
    }, [isPlaying, isLoop, isRecording, sequenceDuration, loopStart, loopEnd]);

    return null;
}
