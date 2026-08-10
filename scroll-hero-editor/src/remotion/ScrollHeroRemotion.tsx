import { useCurrentFrame, useVideoConfig, OffthreadVideo, Audio, Sequence } from 'remotion';
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

    // Compute target video time, matching ScrollyVideoPlayer.tsx logic exactly:
    //   fit:      targetTime = (scrollProgress * v.duration) * videoSpeedRatio
    //   loop:     targetTime = (currentTimelineTime % v.duration)
    //   realtime: targetTime = currentTimelineTime
    let targetVideoSeconds = 0;
    const currentTimelineTime = scrollProgress * sequenceDuration * videoSpeedRatio;

    if (videoSyncMode === 'fit') {
        targetVideoSeconds = (scrollProgress * videoDuration) * videoSpeedRatio;
    } else if (videoSyncMode === 'loop') {
        targetVideoSeconds = currentTimelineTime % videoDuration;
    } else {
        // realtime
        targetVideoSeconds = currentTimelineTime;
    }

    // Match the player's clamp: Math.max(0, Math.min(v.duration - 0.033, targetTime))
    targetVideoSeconds = Math.max(0, Math.min(videoDuration - 0.033, targetVideoSeconds));

    // Target frame in the video asset to display on THIS composition frame
    const targetVideoFrame = Math.max(0, Math.round(targetVideoSeconds * fps));
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div style={{ width, height, backgroundColor: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
            {videoUrl ? (
                /* Sequence from={frame} durationInFrames={1} resets local frame to 0,
                   allowing startFrom={targetVideoFrame} to accurately seek any frame non-linearly
                   without ever causing a negative startFrom error. */
                <Sequence from={frame} durationInFrames={1}>
                    <OffthreadVideo
                        src={videoUrl}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transform: mirrorVideo ? 'scaleX(-1)' : 'none',
                        }}
                        startFrom={targetVideoFrame}
                    />
                </Sequence>
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
