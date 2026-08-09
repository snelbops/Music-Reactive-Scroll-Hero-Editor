import { Composition } from 'remotion';
import { ScrollHeroRemotion } from './ScrollHeroRemotion';

export const RemotionRoot = () => {
    return (
        <>
            <Composition
                id="ScrollHero"
                component={ScrollHeroRemotion}
                durationInFrames={600}
                fps={60}
                width={1920}
                height={1080}
                defaultProps={{
                    videoUrl: '',
                    audioUrl: '',
                }}
            />
        </>
    );
};
