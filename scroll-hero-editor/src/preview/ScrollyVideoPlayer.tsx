import { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { padProxyKey } from '../utils/padProxy';
import ProxyFramePlayer from './ProxyFramePlayer';

export default function ScrollyVideoPlayer() {
    const scrollProgress = useStore((state) => state.scrollProgress);
    const sequenceDuration = useStore((state) => state.sequenceDuration);
    const videoPads = useStore((state) => state.videoPads);
    const activeVideoPadIdx = useStore((state) => state.activeVideoPadIdx);
    const videoUrl = useStore((state) => state.videoUrl);
    const videoSyncMode = useStore((state) => state.videoSyncMode);
    const videoSpeedRatio = useStore((state) => state.videoSpeedRatio);
    const videoRef = useRef<HTMLVideoElement>(null);
    // Newest requested time while a seek is already in flight. See seekTo below.
    const pendingSeekRef = useRef<number | null>(null);

    const setVideoNaturalDimensions = useStore((state) => state.setVideoNaturalDimensions);
    const padProxies = useStore((state) => state.padProxies);
    const activePad = videoPads[activeVideoPadIdx];
    const currentUrl = activePad?.url || videoUrl || '/sample.mp4';

    // A pad with a built proxy is shown from its frames instead of by seeking the clip.
    const proxyKey = padProxyKey(activePad);
    const proxy = proxyKey ? padProxies[proxyKey] : undefined;
    const useProxy = proxy?.status === 'ready' && proxy.frames.length > 0;

    /**
     * A seek issued while another is still running is dropped by the browser, and on a
     * high-resolution long-GOP file each one takes long enough that scrolling produces
     * them faster than they complete. Holding only the newest target and applying it when
     * the current seek lands keeps the picture tracking the scroll instead of falling
     * behind a backlog of stale positions.
     */
    const seekTo = (v: HTMLVideoElement, time: number) => {
        const clamped = Math.max(0, Math.min(v.duration - 0.01, time));
        if (v.seeking) {
            pendingSeekRef.current = clamped;
            return;
        }
        pendingSeekRef.current = null;
        if (Math.abs(v.currentTime - clamped) < 0.001) return;
        v.currentTime = clamped;
    };

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

            seekTo(v, targetTime);
        }
    }, [scrollProgress, sequenceDuration, videoSyncMode, videoSpeedRatio]);

    if (useProxy) {
        // 'fit' maps the whole clip across the sequence, which is exactly what an index into
        // the proxy expresses. The other sync modes still need real time, so they keep the
        // video element and its seeking.
        if (videoSyncMode === 'fit') {
            return <ProxyFramePlayer frames={proxy.frames} progress={scrollProgress * videoSpeedRatio} />;
        }
    }

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
                    // Catch up to wherever the scroll got to while this seek was running.
                    const v = videoRef.current;
                    const pending = pendingSeekRef.current;
                    pendingSeekRef.current = null;
                    if (v && pending !== null && Math.abs(v.currentTime - pending) > 0.001) {
                        v.currentTime = pending;
                    }
                }}
            />
        </div>
    );
}
