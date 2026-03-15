import { useEffect } from 'react';
import studio from '@theatre/studio';
import { useStore } from '../store/useStore';
import { scrollControlsObj, sceneParamsObj, cssOpacityObj, sheet, SEQUENCE_DURATION } from './core';

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

    // Write default keyframes on mount: t=0→p=0, t=end→p=1 (straight diagonal = linear forward play)
    // This makes the "default curve" a real Theatre.js curve so onValuesChange drives everything
    useEffect(() => {
        // Only write defaults if no keyframes exist yet
        const existing = (sheet.sequence as any).__experimental_getKeyframes(
            scrollControlsObj.props.position
        );
        if (!existing || existing.length === 0) {
            const s = studio.scrub();
            s.capture(({ set }) => {
                sheet.sequence.position = 0;
                set(scrollControlsObj.props.position, 0);
            });
            s.commit();
            const s2 = studio.scrub();
            s2.capture(({ set }) => {
                sheet.sequence.position = SEQUENCE_DURATION;
                set(scrollControlsObj.props.position, 1);
            });
            s2.commit();
            sheet.sequence.position = 0;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keyframe path: Theatre.js interpolated values → setSceneProgress (drives adapter + Zustand)
    useEffect(() => {
        return scrollControlsObj.onValuesChange((values) => {
            useStore.getState().setSceneProgress(values.position);
        });
    }, []);

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
                // onValuesChange drives scroll progress — no linear fallback needed
            }
            lastTime = now;
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isPlaying, isLoop]);

    return null;
}
