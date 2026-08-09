import { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

export default function ScrollyVideoPlayer() {
    const scrollProgress = useStore((state) => state.scrollProgress);
    const videoPads = useStore((state) => state.videoPads);
    const activeVideoPadIdx = useStore((state) => state.activeVideoPadIdx);
    const videoUrl = useStore((state) => state.videoUrl);
    const videoRef = useRef<HTMLVideoElement>(null);

    const activePad = videoPads[activeVideoPadIdx];
    const currentUrl = activePad?.url || videoUrl || '/sample.mp4';

    // Direct synchronous HTML5 video currentTime seeking — zero WebGL memory overhead, no Context Lost crashes
    useEffect(() => {
        const v = videoRef.current;
        if (v && v.duration && !isNaN(v.duration) && v.duration > 0) {
            v.currentTime = Math.max(0, Math.min(v.duration - 0.01, scrollProgress * v.duration));
        }
    }, [scrollProgress]);

    if (!currentUrl) return null;

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden flex items-center justify-center bg-black">
            <video
                ref={videoRef}
                key={currentUrl}
                src={currentUrl}
                preload="auto"
                muted
                playsInline
                className="w-full h-full object-contain pointer-events-none"
                onLoadedMetadata={() => {
                    const v = videoRef.current;
                    if (v && v.duration) {
                        v.currentTime = Math.max(0, Math.min(v.duration - 0.01, useStore.getState().scrollProgress * v.duration));
                    }
                }}
                onSeeked={() => {
                    // Ensures frame is cleanly rendered without lag
                }}
            />
        </div>
    );
}
