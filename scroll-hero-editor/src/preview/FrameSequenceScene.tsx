import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FrameCache } from '../packages/frameLoader';

interface FrameSequenceSceneProps {
    frames: Blob[];
    progress: number;
}

/**
 * FrameSequenceScene — R3F scene for proxy frame-sequence playback.
 *
 * Frames are decoded on demand around the playhead through FrameCache rather than
 * uploaded to the GPU all at once, so a proxy covering a whole clip costs a bounded
 * amount of video memory instead of growing with the clip's length.
 */
export default function FrameSequenceScene({ frames, progress }: FrameSequenceSceneProps) {
    const { viewport } = useThree();
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const cacheRef = useRef<FrameCache | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setReady(false);
        if (!frames.length) {
            cacheRef.current = null;
            return;
        }
        const cache = new FrameCache(frames);
        cacheRef.current = cache;
        cache.request(0);
        return () => {
            cacheRef.current = null;
            cache.dispose();
        };
    }, [frames]);

    useFrame(() => {
        const cache = cacheRef.current;
        if (!cache?.length) return;

        const idx = Math.min(Math.floor(progress * cache.length), cache.length - 1);
        cache.request(idx);

        // Falls back to the closest decoded frame, so a fast scrub lands on something
        // near the right place rather than holding the frame it started from.
        const texture = cache.nearest(idx);
        if (!texture) return;
        if (!ready) setReady(true);

        if (matRef.current && matRef.current.map !== texture) {
            matRef.current.map = texture;
            matRef.current.needsUpdate = true;
        }
    });

    if (!ready) return null;

    return (
        <mesh>
            <planeGeometry args={[viewport.width, viewport.height]} />
            <meshBasicMaterial ref={matRef} toneMapped={false} />
        </mesh>
    );
}
