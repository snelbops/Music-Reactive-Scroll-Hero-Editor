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

        const effectiveEnd = isLoop ? (loopEnd || sequenceDuration) : sequenceDuration;
        const effectiveStart = isLoop ? loopStart : 0;

        // If we're at or beyond end, restart from beginning / loopStart
        if (sheet.sequence.position >= effectiveEnd) {
            sheet.sequence.position = effectiveStart;
        }

        let lastTime: number | null = null;
        let rafId: number;

        const tick = (now: number) => {
            if (lastTime !== null) {
                const delta = now - lastTime;
                const nextPos = sheet.sequence.position + delta / 1000;
                const currentDuration = useStore.getState().sequenceDuration;
                const recordingActive = useStore.getState().isRecording;

                // Dynamic duration extension during recording
                if (recordingActive && nextPos >= currentDuration - 1) {
                    useStore.getState().setSequenceDuration(Math.ceil(nextPos + 5));
                }

                const maxPos = isLoop ? (useStore.getState().loopEnd || currentDuration) : currentDuration;

                if (nextPos >= maxPos && !recordingActive) {
                    if (isLoop) {
                        const restartPos = useStore.getState().loopStart || 0;
                        sheet.sequence.position = restartPos;
                        const kfs = useStore.getState().scrollKeyframes;
                        useStore.getState().setSceneProgress(interpolateScrollAt(kfs, restartPos, currentDuration));
                        
                        const pkfs0 = useStore.getState().paramKeyframes;
                        const rSpeed0 = interpolateParamAt((pkfs0['rotationSpeed'] ?? []) as ParamKf[], restartPos);
                        if (rSpeed0 !== null) useStore.getState().setRotationSpeed(rSpeed0);
                        const depth0 = interpolateParamAt((pkfs0['depth'] ?? []) as ParamKf[], restartPos);
                        if (depth0 !== null) useStore.getState().setParticleDepth(depth0);
                        const size0 = interpolateParamAt((pkfs0['size'] ?? []) as ParamKf[], restartPos);
                        if (size0 !== null) useStore.getState().setParticleSize(size0);
                        const opacity0 = interpolateParamAt((pkfs0['cssOpacity'] ?? []) as ParamKf[], restartPos);
                        if (opacity0 !== null) useStore.getState().setCssOpacity(opacity0);
                        lastTime = now;
                        rafId = requestAnimationFrame(tick);
                    } else {
                        sheet.sequence.position = currentDuration;
                        const kfs = useStore.getState().scrollKeyframes;
                        useStore.getState().setSceneProgress(interpolateScrollAt(kfs, currentDuration, currentDuration));
                        useStore.getState().setIsPlaying(false);
                        useStore.getState().setIsRecording(false);
                    }
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
