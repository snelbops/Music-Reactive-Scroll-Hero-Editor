import { useRef, useEffect } from 'react';
import ScrollyVideo from 'scrolly-video/dist/ScrollyVideo.esm.jsx';
import { useStore } from '../store/useStore';

export default function ScrollyVideoPlayer() {
    const scrollProgress = useStore((state) => state.scrollProgress);
    const videoPads = useStore((state) => state.videoPads);
    const activeVideoPadIdx = useStore((state) => state.activeVideoPadIdx);
    const playerRefs = useRef<Record<number, any>>({});

    // Use ref to manually set percentage so we can pass { jump: true }
    // which bypasses slow smooth playback and forces an instant frame scrub across all active video pads.
    useEffect(() => {
        videoPads.forEach((pad, idx) => {
            if (!pad.url) return;
            const player = playerRefs.current[idx];
            if (player && typeof player.setVideoPercentage === 'function') {
                try {
                    player.setVideoPercentage(scrollProgress, { jump: true });
                } catch (err) {}
            }
        });
    }, [scrollProgress, videoPads]);

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden [&_video]:!object-contain [&_video]:!w-full [&_video]:!h-full [&_div]:!w-full [&_div]:!h-full [&_div]:!max-w-full [&_div]:!max-h-full [&_div]:!position-static [&_div]:!transform-none">
            {videoPads.map((pad, idx) => {
                if (!pad.url) return null;
                const isActive = idx === activeVideoPadIdx;
                return (
                    <div
                        key={`${idx}-${pad.url}`}
                        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
                        style={{ display: isActive ? 'block' : 'none' }}
                    >
                        <ScrollyVideo
                            src={pad.url}
                            trackScroll={false}
                            cover={false}
                            full={false}
                            onReady={(scrollyInstance: any) => {
                                if (scrollyInstance) {
                                    playerRefs.current[idx] = scrollyInstance;
                                    try {
                                        scrollyInstance.setVideoPercentage(useStore.getState().scrollProgress, { jump: true });
                                    } catch (e) {}
                                }
                            }}
                            ref={(el: any) => {
                                if (el) playerRefs.current[idx] = el;
                            }}
                            transitionSpeed={10}
                        />
                    </div>
                );
            })}
        </div>
    );
}
