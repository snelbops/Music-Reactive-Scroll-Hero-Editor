import { useCurrentFrame, useVideoConfig, Video, Audio } from 'remotion';
import { useStore } from '../store/useStore';
import { interpolateScrollAt } from '../utils/interpolate';

export interface ScrollHeroRemotionProps {
    videoUrl?: string;
    audioUrl?: string;
}

export const ScrollHeroRemotion: React.FC<ScrollHeroRemotionProps> = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const currentTime = frame / fps;
    const sequenceDuration = useStore((s) => s.sequenceDuration) || 10;
    const scrollKeyframes = useStore((s) => s.scrollKeyframes);
    const videoUrl = useStore((s) => s.videoUrl);
    const audioUrl = useStore((s) => s.audioUrl);

    // Calculate scroll progress curve at current frame timestamp
    const scrollProgress = interpolateScrollAt(scrollKeyframes, currentTime, sequenceDuration);

    return (
        <div style={{ width, height, backgroundColor: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
            {/* Background Video Layer */}
            {videoUrl ? (
                <Video
                    src={videoUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    startFrom={Math.round(scrollProgress * 300)}
                />
            ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <p style={{ fontSize: 24, fontFamily: 'sans-serif' }}>Scroll Hero Animation — Frame {frame}</p>
                </div>
            )}

            {/* Audio Track */}
            {audioUrl && <Audio src={audioUrl} />}
        </div>
    );
};
