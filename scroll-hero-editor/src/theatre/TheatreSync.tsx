import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { sceneParamsObj, cssOpacityObj } from './core';
import { playhead } from './playhead';
import { interpolateScrollAt, interpolateParamAt, type ParamKf } from '../utils/interpolate';

/**
 * TheatreSync — logic-only component mounted at the app root.
 *
 * - RAF loop advances playhead.position (the clock) during playback
 * - Synchronizes live audio playback with timeline position
 * - Interpolates scrollKeyframes at current time → setSceneProgress
 * - Scene params / CSS opacity wired through Theatre.js
 * - Loop support: when isLoop is true, restarts sequence from loopStart
 */
export default function TheatreSync() {
    const isPlaying = useStore((state) => state.isPlaying);
    const isLoop = useStore((s) => s.isLoop);
    const isRecording = useStore((s) => s.isRecording);
    const sequenceDuration = useStore((s) => s.sequenceDuration);
    const loopStart = useStore((s) => s.loopStart);
    const loopEnd = useStore((s) => s.loopEnd);
    const audioUrl = useStore((s) => s.audioUrl);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Maintain HTML5 Audio element instance
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
        const audio = audioRef.current;
        if (audioUrl) {
            audio.src = audioUrl;
            audio.load();
        } else {
            audio.pause();
            audio.removeAttribute('src');
        }
    }, [audioUrl]);

    // Handle Play / Pause / Seek sync
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioUrl) return;

        if (isPlaying) {
            audio.currentTime = playhead.position;
            audio.play().catch((err) => console.warn('Audio playback error:', err));
        } else {
            audio.pause();
            audio.currentTime = playhead.position;
        }
    }, [isPlaying, audioUrl]);

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

    // RAF play loop — advances sequence position, drives scroll & syncs audio
    useEffect(() => {
        if (!isPlaying) return;

        const recordingActive = useStore.getState().isRecording;
        const loopActive = useStore.getState().isLoop;
        const lStart = useStore.getState().loopStart || 0;
        const lEnd = useStore.getState().loopEnd || sequenceDuration;

        // If starting playback outside loop range, snap to loopStart
        if (loopActive && !recordingActive && (playhead.position >= lEnd || playhead.position < lStart)) {
            playhead.position = lStart;
            if (audioRef.current && audioUrl) {
                audioRef.current.currentTime = lStart;
            }
        }

        let lastTime: number | null = null;
        let rafId: number;

        const tick = (now: number) => {
            if (lastTime !== null) {
                const delta = now - lastTime;
                const nextPos = playhead.position + delta / 1000;
                const currentDuration = useStore.getState().sequenceDuration;
                const isRec = useStore.getState().isRecording;
                const isLp = useStore.getState().isLoop;
                const startL = useStore.getState().loopStart || 0;
                const endL = useStore.getState().loopEnd || currentDuration;

                // Sync audio drift if greater than 0.06s
                if (audioRef.current && audioUrl && !audioRef.current.paused) {
                    if (Math.abs(audioRef.current.currentTime - nextPos) > 0.06) {
                        audioRef.current.currentTime = nextPos;
                    }
                }

                // Dynamic duration extension during recording
                if (isRec && nextPos >= currentDuration - 1) {
                    useStore.getState().setSequenceDuration(Math.ceil(nextPos + 5));
                }

                if (isLp && !isRec && (nextPos >= endL || nextPos < startL)) {
                    playhead.position = startL;
                    if (audioRef.current && audioUrl) {
                        audioRef.current.currentTime = startL;
                    }
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
                    playhead.position = currentDuration;
                    if (audioRef.current && audioUrl) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = currentDuration;
                    }
                    const kfs = useStore.getState().scrollKeyframes;
                    useStore.getState().setSceneProgress(interpolateScrollAt(kfs, currentDuration, currentDuration));
                    useStore.getState().setIsPlaying(false);
                    useStore.getState().setIsRecording(false);
                    return;
                }

                playhead.position = nextPos;
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
    }, [isPlaying, isLoop, isRecording, sequenceDuration, loopStart, loopEnd, audioUrl]);

    return null;
}
