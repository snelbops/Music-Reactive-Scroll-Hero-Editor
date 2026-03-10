import { useRef, useEffect } from 'react';
import ScrollyVideo from 'scrolly-video/dist/ScrollyVideo.esm.jsx';
import { useStore } from '../store/useStore';

export default function ScrollyVideoPlayer() {
    const scrollProgress = useStore((state) => state.scrollProgress);
    const videoUrl = useStore((state) => state.videoUrl);
    const playerRef = useRef<any>(null);

    // Use ref to manually set percentage so we can pass { jump: true }
    // which bypasses slow smooth playback and forces an instant frame scrub.
    useEffect(() => {
        if (!playerRef.current) return;
        try {
            if (typeof playerRef.current.setVideoPercentage === 'function') {
                playerRef.current.setVideoPercentage(scrollProgress, { jump: true });
            }
        } catch (err) {
            // ScrollyVideo's React wrapper has a bug where `this` is null during initial 
            // mount bindings. We cleanly catch it here. Subsequent scrubs will succeed.
        }
    }, [scrollProgress]);

    if (!videoUrl) return null;

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none">
            <ScrollyVideo
                key={videoUrl}
                src={videoUrl}
                trackScroll={false}
                ref={playerRef}
                transitionSpeed={10} // base smoothing when not jumping
            />
        </div>
    );
}
