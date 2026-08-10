import { useCurrentFrame, useVideoConfig, OffthreadVideo, Audio } from 'remotion';
import { interpolateScrollAt, type ScrollKf } from '../utils/interpolate';

export interface ScrollHeroRemotionProps {
    videoUrl?: string;
    audioUrl?: string;
    /** Absolute timeline start frame (for audio sync). */
    startFrame?: number;
    mirrorVideo?: boolean;
    /** Copy of store.scrollKeyframes – must be passed via inputProps, NOT read from Zustand */
    scrollKeyframes?: ScrollKf[];
    /** Copy of store.sequenceDuration */
    sequenceDuration?: number;
    /** Copy of store.videoSyncMode */
    videoSyncMode?: 'fit' | 'realtime' | 'loop';
    /** Copy of store.videoSpeedRatio */
    videoSpeedRatio?: number;
    /** Duration of the actual video asset in seconds (measured from DOM before export) */
    videoDuration?: number;
}

export const ScrollHeroRemotion: React.FC<ScrollHeroRemotionProps> = ({
    videoUrl,
    audioUrl,
    startFrame = 0,
    mirrorVideo = false,
    scrollKeyframes = [],
    sequenceDuration = 10,
    videoSyncMode = 'fit',
    videoSpeedRatio = 1.0,
    videoDuration = 10,
}) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // ── Per-frame scroll-driven video seeking ────────────────────────────────
    // Absolute time in the overall sequence timeline (loop offset + current frame)
    const compositionTime = (startFrame + frame) / fps;

    // Reproduce the exact same scrollProgress the editor would show at this moment
    const scrollProgress = interpolateScrollAt(scrollKeyframes, compositionTime, sequenceDuration);

    // Compute target video time, mirroring ScrollyVideoPlayer.tsx logic
    let targetVideoSeconds = 0;
    if (videoSyncMode === 'fit') {
        // scrollProgress (0–1) maps to video start–end
        targetVideoSeconds = scrollProgress * videoDuration * videoSpeedRatio;
    } else if (videoSyncMode === 'loop') {
        // real-time looping
        targetVideoSeconds = (compositionTime * videoSpeedRatio) % videoDuration;
    } else {
        // realtime
        targetVideoSeconds = compositionTime * videoSpeedRatio;
    }

    // Clamp within valid video range
    targetVideoSeconds = Math.max(0, Math.min(videoDuration - 0.033, targetVideoSeconds));

    // OffthreadVideo renders each Remotion frame independently.
    // At composition frame N, the video position is: startFrom + N
    // So to land at targetFrame at composition frame N: startFrom = targetFrame - N
    const targetVideoFrame = Math.round(targetVideoSeconds * fps);
    const videoStartFrom = targetVideoFrame - frame;
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div style={{ width, height, backgroundColor: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
            {videoUrl ? (
                <OffthreadVideo
                    src={videoUrl}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        transform: mirrorVideo ? 'scaleX(-1)' : 'none',
                    }}
                    startFrom={videoStartFrom}
                />
            ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <p style={{ fontSize: 24, fontFamily: 'sans-serif' }}>Scroll Hero Animation — Frame {frame}</p>
                </div>
            )}

            {/* Audio Track – starts from absolute timeline position */}
            {audioUrl && <Audio src={audioUrl} startFrom={startFrame} />}
        </div>
    );
};
