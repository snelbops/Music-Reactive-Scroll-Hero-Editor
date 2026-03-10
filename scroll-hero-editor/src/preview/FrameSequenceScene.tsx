import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { frameLoader } from '../packages/frameLoader';

interface FrameSequenceSceneProps {
    frames: Blob[];
    progress: number;
}

/**
 * FrameSequenceScene — R3F scene for frame-sequence video playback.
 * Loads PNG Blob[] as THREE.Texture[] via frameLoader, then swaps textures
 * on each frame based on progress (0–1 → frame index).
 */
export default function FrameSequenceScene({ frames, progress }: FrameSequenceSceneProps) {
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const [textures, setTextures] = useState<THREE.Texture[]>([]);

    useEffect(() => {
        if (!frames.length) return;
        let cancelled = false;
        frameLoader.loadTextures(frames).then(loaded => {
            if (!cancelled) setTextures(loaded);
        });
        return () => {
            cancelled = true;
            setTextures(prev => { frameLoader.disposeTextures(prev); return []; });
        };
    }, [frames]);

    useFrame(() => {
        if (!textures.length || !matRef.current) return;
        const idx = Math.min(Math.floor(progress * textures.length), textures.length - 1);
        if (matRef.current.map !== textures[idx]) {
            matRef.current.map = textures[idx];
            matRef.current.needsUpdate = true;
        }
    });

    if (!textures.length) return null;

    return (
        <mesh>
            <planeGeometry args={[2, 1.125]} />
            <meshBasicMaterial ref={matRef} map={textures[0]} toneMapped={false} />
        </mesh>
    );
}
