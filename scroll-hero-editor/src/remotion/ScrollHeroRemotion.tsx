import { useCurrentFrame, useVideoConfig, Video, Audio } from 'remotion';
import { useStore } from '../store/useStore';

export interface ScrollHeroRemotionProps {
    videoUrl?: string;
    audioUrl?: string;
    startFrame?: number;
    mirrorVideo?: boolean;
}

export const ScrollHeroRemotion: React.FC<ScrollHeroRemotionProps> = ({
    videoUrl: inputVideoUrl,
    audioUrl: inputAudioUrl,
    startFrame = 0,
    mirrorVideo = false,
}) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    const storeVideoUrl = useStore((s) => s.videoUrl);
    const storeAudioUrl = useStore((s) => s.audioUrl);
    const videoSpeedRatio = useStore((s) => s.videoSpeedRatio) || 1.0;

    const videoUrl = inputVideoUrl || storeVideoUrl;
    const audioUrl = inputAudioUrl || storeAudioUrl;

    const videoStartFrame = Math.round(startFrame * videoSpeedRatio);

    return (
        <div style={{ width, height, backgroundColor: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
            {/* Background Video Layer */}
            {videoUrl ? (
                <Video
                    src={videoUrl}
                    loop
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        transform: mirrorVideo ? 'scaleX(-1)' : 'none',
                    }}
                    startFrom={videoStartFrame}
                />
            ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <p style={{ fontSize: 24, fontFamily: 'sans-serif' }}>Scroll Hero Animation — Frame {frame}</p>
                </div>
            )}

            {/* Audio Track */}
            {audioUrl && <Audio src={audioUrl} startFrom={startFrame} />}
        </div>
    );
};
