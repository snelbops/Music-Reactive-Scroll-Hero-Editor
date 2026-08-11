import { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

export default function ScrollyVideoPlayer() {
    const scrollProgress = useStore((state) => state.scrollProgress);
    const sequenceDuration = useStore((state) => state.sequenceDuration);
    const videoPads = useStore((state) => state.videoPads);
    const activeVideoPadIdx = useStore((state) => state.activeVideoPadIdx);
    const videoUrl = useStore((state) => state.videoUrl);
    const videoSyncMode = useStore((state) => state.videoSyncMode);
    const videoSpeedRatio = useStore((state) => state.videoSpeedRatio);
    const videoRef = useRef<HTMLVideoElement>(null);

    const setVideoNaturalDimensions = useStore((state) => state.setVideoNaturalDimensions);
    const activePad = videoPads[activeVideoPadIdx];
    const currentUrl = activePad?.url || videoUrl || '/sample.mp4';

    // Direct synchronous HTML5 video currentTime seeking — supporting fit, realtime, and loop modes + speed ratio
    useEffect(() => {
        const v = videoRef.current;
        if (v && v.duration && !isNaN(v.duration) && v.duration > 0) {
            const currentTimelineTime = scrollProgress * sequenceDuration * videoSpeedRatio;
            let targetTime = 0;

            if (videoSyncMode === 'fit') {
                // Fit mode: 0-100% of video fits 0-100% of sequence
                targetTime = (scrollProgress * v.duration) * videoSpeedRatio;
            } else if (videoSyncMode === 'loop') {
                // Loop mode: video loops seamlessly over the timeline duration
                targetTime = (currentTimelineTime % v.duration);
            } else {
                // Realtime mode: 1 second timeline = 1 second video
                targetTime = currentTimelineTime;
            }

            v.currentTime = Math.max(0, Math.min(v.duration - 0.01, targetTime));
        }
    }, [scrollProgress, sequenceDuration, videoSyncMode, videoSpeedRatio]);

    if (!currentUrl) return null;

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden flex items-center justify-center bg-transparent">
            <video
                ref={videoRef}
                key={currentUrl}
                src={currentUrl}
                preload="auto"
                muted
                playsInline
                data-purpose="active-video-element"
                className="w-full h-full object-cover pointer-events-none"
                onLoadedMetadata={() => {
                    const v = videoRef.current;
                    if (v) {
                        if (v.videoWidth && v.videoHeight) {
                            setVideoNaturalDimensions({ width: v.videoWidth, height: v.videoHeight });
                        }
                        if (v.duration) {
                            v.currentTime = Math.max(0, Math.min(v.duration - 0.01, useStore.getState().scrollProgress * v.duration));
                        }
                    }
                }}
                onSeeked={() => {
                    // Ensures frame is cleanly rendered without lag
                }}
            />
        </div>
    );
}
