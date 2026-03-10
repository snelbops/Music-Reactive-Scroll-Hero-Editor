import type { RefObject } from 'react';

/**
 * SceneAdapter — contract for driving a visual scene from a normalised progress value (0–1).
 *
 * Every preset exposes this interface so that TheatreSync, the scrub handle, and the
 * recording transport all have a single, uniform path to advance the active scene.
 */
export interface SceneAdapter {
    setProgress(p: number): void;
}

/**
 * OrbitAdapter — drives the GithubTestParticleField (R3F / Three.js) preset.
 *
 * Receives a `setUAssemble` callback that forwards the progress value into the
 * component's state/uniform pipeline. Wired in Viewport.tsx via useRef/useState.
 */
export class OrbitAdapter implements SceneAdapter {
    private readonly setUAssemble: (v: number) => void;

    constructor(setUAssemble: (v: number) => void) {
        this.setUAssemble = setUAssemble;
    }

    setProgress(p: number): void {
        this.setUAssemble(p);
    }
}

/**
 * ClassicAdapter — drives the classic iframe-based particle preset.
 *
 * Posts a { type: 'setProgress', value: p } message to the iframe's content window.
 * Gracefully no-ops when the iframe is not yet mounted.
 */
export class ClassicAdapter implements SceneAdapter {
    private readonly iframeRef: RefObject<HTMLIFrameElement | null>;

    constructor(iframeRef: RefObject<HTMLIFrameElement | null>) {
        this.iframeRef = iframeRef;
    }

    setProgress(p: number): void {
        this.iframeRef.current?.contentWindow?.postMessage({ type: 'setProgress', value: p }, '*');
    }
}

/**
 * FrameSequenceAdapter — drives the FrameSequenceScene preset.
 * Progress is already in Zustand via setSceneProgress; FrameSequenceScene
 * reads scrollProgress from the store directly, so setProgress is a no-op here.
 */
export class FrameSequenceAdapter implements SceneAdapter {
    setProgress(_p: number): void {
        // no-op — FrameSequenceScene reads scrollProgress from Zustand
    }
}
