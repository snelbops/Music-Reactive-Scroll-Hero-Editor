import { useCallback, useEffect, useRef } from 'react';
import { Maximize2, ImageIcon } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { GithubTestParticleField } from '../presets/ParticleLab';
import GhostTrailCanvas from './GhostTrailCanvas';
import RecordMode from './RecordMode';
import FrameSequenceScene from './FrameSequenceScene';
import ScrollyVideoPlayer from './ScrollyVideoPlayer';
import { useStore } from '../store/useStore';
import { OrbitAdapter, ClassicAdapter, FrameSequenceAdapter } from './SceneAdapter';
import { sheet, SEQUENCE_DURATION } from '../theatre/core';

const RATIO_VALUES: Record<string, number | null> = {
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '1:1': 1,
    'native': null,
    'free': null,
};

export default function Viewport() {
    const scrollProgress = useStore(state => state.scrollProgress);
    const isRecording = useStore(state => state.isRecording);
    const recordCountdown = useStore(s => s.recordCountdown);
    const activePreset = useStore(state => state.activePreset);
    const aspectRatio = useStore(state => state.aspectRatio);
    const setAspectRatio = useStore(state => state.setAspectRatio);
    const isFullscreen = useStore(state => state.isFullscreen);
    const setIsFullscreen = useStore(state => state.setIsFullscreen);
    const setActiveAdapter = useStore(state => state.setActiveAdapter);
    const setSceneProgress = useStore(s => s.setSceneProgress);
    const addScrollKeyframe = useStore(s => s.addScrollKeyframe);
    const rotationSpeed = useStore(s => s.rotationSpeed);
    const particleDepth = useStore(s => s.particleDepth);
    const particleSize = useStore(s => s.particleSize);
    const cssOpacity = useStore(s => s.cssOpacity);
    const extractedFrames = useStore(s => s.extractedFrames);
    const classicDarkControls = useStore(s => s.classicDarkControls);
    const orbitControls = useStore(s => s.orbitControls);
    const lightImages = useStore(s => s.lightImages);
    const activeLightImageIdx = useStore(s => s.activeLightImageIdx);

    // Ref for the scrub handle track (vertical bar on the right)
    const trackRef = useRef<HTMLDivElement>(null);

    // Ref for the preview area — used for wheel scrub
    const previewRef = useRef<HTMLDivElement>(null);

    // Ref for the classic dark iframe
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const lastRecordedTimeRef = useRef<number | null>(null);

    // Mouse wheel → scrub progress (passive:false required for preventDefault)
    useEffect(() => {
        const el = previewRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.shiftKey) {
                // Shift+scroll → scrub playhead only, don't touch scroll progress
                const delta = (e.deltaY / 800) * SEQUENCE_DURATION;
                const next = Math.max(0, Math.min(SEQUENCE_DURATION, sheet.sequence.position + delta));
                sheet.sequence.position = next;
            } else {
                // Normal scroll → move scroll handle / scene progress only
                const delta = e.deltaY / 800;
                const current = useStore.getState().scrollProgress;
                const next = Math.max(0, Math.min(1, current + delta));
                useStore.getState().setSceneProgress(next);
                const { isRecording, isPlaying } = useStore.getState();
                if (isRecording && isPlaying) {
                    const t = sheet.sequence.position;
                    useStore.getState().addScrollKeyframe(t, next, lastRecordedTimeRef.current ?? t);
                    lastRecordedTimeRef.current = t;
                }
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // Pointer capture handlers for the scrub handle
    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        useStore.getState().setIsScrubbing(true);
        lastRecordedTimeRef.current = null;
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!(e.buttons & 1)) return;
        const rect = trackRef.current!.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        setSceneProgress(p);
        const { isRecording, isPlaying } = useStore.getState();
        if (isRecording && isPlaying) {
            const t = sheet.sequence.position;
            addScrollKeyframe(t, p, lastRecordedTimeRef.current ?? t);
            lastRecordedTimeRef.current = t;
        }
    }, [setSceneProgress, addScrollKeyframe]);

    const onPointerUp = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
        useStore.getState().setIsScrubbing(false);
        lastRecordedTimeRef.current = null;
    }, []);

    // Wire the appropriate adapter whenever activePreset changes
    useEffect(() => {
        if (activePreset === 'orbit' || activePreset === 'light') {
            setActiveAdapter(new OrbitAdapter((v) => { void v; }));
        } else if (activePreset === 'classic-dark' || activePreset === 'classic-dark-copy') {
            setActiveAdapter(new ClassicAdapter(iframeRef));
        } else if (activePreset === 'classic-light' || activePreset === 'classic-inverted' || activePreset === 'light-images') {
            setActiveAdapter(new OrbitAdapter((v) => { void v; }));
        } else if (activePreset === 'frames') {
            setActiveAdapter(new FrameSequenceAdapter());
        }
        return () => setActiveAdapter(null);
    }, [activePreset, setActiveAdapter]);

    // Forward timeline parameters to the classic iframe when active
    useEffect(() => {
        if (activePreset !== 'classic-dark' && activePreset !== 'classic-dark-copy') return;
        iframeRef.current?.contentWindow?.postMessage({
            type: 'CONTROLS_UPDATE',
            payload: {
                random: classicDarkControls.random,
                depth: particleDepth,
                size: particleSize,
                touchRadius: classicDarkControls.touchRadius
            }
        }, '*');
    }, [activePreset, particleDepth, particleSize, classicDarkControls]);


    return (
        <main className="flex-1 flex flex-col relative bg-editor-bg">
            {/* Viewport Controls — hidden in fullscreen */}
            {!isFullscreen && <div className="h-10 border-b border-editor-border flex items-center justify-between px-4 z-10 bg-editor-panel">
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">Zoom</span>
                        <select className="bg-transparent border-none p-0 text-xs focus:ring-0 outline-none">
                            <option>85% (Fit)</option>
                            <option>100%</option>
                        </select>
                    </div>
                    <div className="h-4 w-[1px] bg-editor-border"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">Ratio</span>
                        {(['16:9', '9:16', '1:1', 'native', 'free'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setAspectRatio(r)}
                                className={`px-2 py-0.5 text-xxs border rounded transition-colors
                                    ${aspectRatio === r
                                        ? 'bg-editor-accent-purple/20 border-editor-accent-purple/50 text-editor-accent-purple'
                                        : 'glass-panel border-transparent hover:bg-white/10'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={() => setIsFullscreen(true)} className="p-1.5 glass-panel hover:bg-white/10">
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>}

            {/* Preview Area — Flex layout with video stage and external performance scroll track */}
            <div ref={previewRef} className="flex-1 flex items-center justify-center gap-4 px-6 overflow-hidden bg-editor-surface relative">
                {/* Letterbox Stage */}
                <div
                    data-purpose="viewport-container"
                    className={`relative overflow-hidden ${isRecording ? 'ring-2 ring-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : ''}`}
                    style={{
                        aspectRatio: RATIO_VALUES[aspectRatio] ?? undefined,
                        width: RATIO_VALUES[aspectRatio] ? 'auto' : '100%',
                        height: '100%',
                        maxWidth: '100%',
                        opacity: cssOpacity,
                    }}
                >
                    {/* Orbit: R3F Canvas — dark particles */}
                    {activePreset === 'orbit' && (
                        <Canvas
                            gl={{ preserveDrawingBuffer: true }}
                            camera={{ position: [0, 0, 5], fov: 50 }}
                            style={{ width: '100%', height: '100%', background: 'transparent', display: 'block' }}
                        >
                            <GithubTestParticleField
                                imageUrl="/github-test-app/images/sample-01.png"
                                theme="dark"
                                progress={scrollProgress}
                                rotationSpeed={rotationSpeed}
                                depth={particleDepth}
                                size={particleSize}
                                assemblyDuration={orbitControls.assemblyDuration}
                                assemblyEase={orbitControls.assemblyEase}
                                staticAfterAssembly={orbitControls.pauseAfterAssembly}
                            />
                        </Canvas>
                    )}

                    {/* Light: R3F Canvas — white bg, dark particles */}
                    {activePreset === 'light' && (
                        <Canvas
                            gl={{ preserveDrawingBuffer: true }}
                            camera={{ position: [0, 0, 5], fov: 50 }}
                            style={{ width: '100%', height: '100%', background: 'white', display: 'block' }}
                        >
                            <GithubTestParticleField
                                imageUrl="/github-test-app/images/sample-01.png"
                                theme="light"
                                progress={scrollProgress}
                                rotationSpeed={rotationSpeed}
                                depth={particleDepth}
                                size={particleSize}
                                assemblyDuration={orbitControls.assemblyDuration}
                                assemblyEase={orbitControls.assemblyEase}
                                staticAfterAssembly={orbitControls.pauseAfterAssembly}
                            />
                        </Canvas>
                    )}

                    {/* Frames: R3F Canvas with FrameSequenceScene */}
                    {activePreset === 'frames' && (
                        <Canvas
                            gl={{ preserveDrawingBuffer: true }}
                            orthographic
                            camera={{ near: 0.1, far: 10, position: [0, 0, 1] }}
                            style={{ width: '100%', height: '100%', background: '#000', display: 'block' }}
                        >
                            <FrameSequenceScene frames={extractedFrames} progress={scrollProgress} />
                        </Canvas>
                    )}

                    {/* Video: ScrollyVideo component seeking directly in video */}
                    {activePreset === 'video' && <ScrollyVideoPlayer />}

                    {/* Classic Dark: original iframe — exactly as it was in the package copy */}
                    {activePreset === 'classic-dark' && (
                        <iframe
                            ref={iframeRef}
                            src="/github-test-app/index.html"
                            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                            title="Classic Particles Dark"
                        />
                    )}

                    {/* Classic Light: Three.js version — white bg, dark particles */}
                    {activePreset === 'classic-light' && (
                        <Canvas
                            gl={{ preserveDrawingBuffer: true }}
                            camera={{ position: [0, 0, 5], fov: 50 }}
                            style={{ width: '100%', height: '100%', background: 'white', display: 'block' }}
                        >
                            <GithubTestParticleField
                                imageUrl="/github-test-app/images/sample-01.png"
                                theme="light"
                                progress={scrollProgress}
                                rotationSpeed={0}
                                depth={classicDarkControls.depth}
                                size={classicDarkControls.size}
                                touchRadius={classicDarkControls.touchRadius}
                                randomScatter={classicDarkControls.random}
                            />
                        </Canvas>
                    )}

                    {/* Light Images: Three.js, white bg, uses uploaded light-optimised images */}
                    {activePreset === 'light-images' && (
                        lightImages.length > 0 ? (
                            <Canvas
                                camera={{ position: [0, 0, 5], fov: 50 }}
                                style={{ width: '100%', height: '100%', background: 'white', display: 'block' }}
                            >
                                <GithubTestParticleField
                                    imageUrl={lightImages[activeLightImageIdx]?.url ?? lightImages[0].url}
                                    theme="light"
                                    progress={scrollProgress}
                                    rotationSpeed={0}
                                    staticAfterAssembly
                                    depth={classicDarkControls.depth}
                                    size={classicDarkControls.size}
                                    touchRadius={classicDarkControls.touchRadius}
                                    randomScatter={classicDarkControls.random}
                                />
                            </Canvas>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-white text-gray-400">
                                <ImageIcon className="w-10 h-10 text-gray-300" />
                                <p className="text-sm">No images in this folder</p>
                                <p className="text-xs text-gray-400">Upload images from the left panel</p>
                            </div>
                        )
                    )}

                    {/* Classic Dark Copy: just in case it's still in the store, making it dark */}
                    {activePreset === 'classic-dark-copy' && (
                        <Canvas
                            camera={{ position: [0, 0, 5], fov: 50 }}
                            style={{ width: '100%', height: '100%', background: '#0a0a0a', display: 'block' }}
                        >
                            <GithubTestParticleField
                                imageUrl="/github-test-app/images/sample-01.png"
                                theme="dark"
                                progress={scrollProgress}
                                rotationSpeed={0}
                                depth={classicDarkControls.depth}
                                size={classicDarkControls.size}
                                touchRadius={classicDarkControls.touchRadius}
                                randomScatter={classicDarkControls.random}
                            />
                        </Canvas>
                    )}

                    {/* Classic Inverted: R3F Canvas — white bg, dark particles, no rotation */}
                    {activePreset === 'classic-inverted' && (
                        <Canvas
                            camera={{ position: [0, 0, 5], fov: 50 }}
                            style={{ width: '100%', height: '100%', background: 'white', display: 'block' }}
                        >
                            <GithubTestParticleField
                                imageUrl="/github-test-app/images/sample-01.png"
                                theme="light"
                                progress={scrollProgress}
                                rotationSpeed={0}
                                depth={particleDepth}
                                size={particleSize}
                                touchRadius={classicDarkControls.touchRadius}
                                randomScatter={classicDarkControls.random}
                            />
                        </Canvas>
                    )}



                    {/* Ghost Trail Canvas */}
                    <GhostTrailCanvas />

                    {/* Recording Mode Overlay */}
                    <RecordMode />

                    {/* Countdown Overlay */}
                    {recordCountdown !== null && (
                        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
                            <div className="flex flex-col items-center gap-3">
                                <span
                                    key={recordCountdown}
                                    className="text-[120px] font-black text-white leading-none tabular-nums"
                                    style={{
                                        textShadow: '0 0 60px rgba(220,38,38,0.8), 0 0 20px rgba(220,38,38,0.6)',
                                        animation: 'countdown-pop 0.9s ease-out forwards',
                                    }}
                                >
                                    {recordCountdown}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest text-red-400 opacity-80">Get ready...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* External Scroll Performance Track — strictly outside the video stage for clean screencasting */}
                <div
                    ref={trackRef}
                    className="h-64 w-4 bg-editor-panel border border-editor-border rounded-full z-30 cursor-ns-resize relative select-none shrink-0 flex flex-col items-center justify-start group/track shadow-md"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    title="External Performance Scroll Track (Drag to scroll live without UI overlay)"
                >
                    <div
                        className="w-full bg-editor-accent-purple/60 group-hover/track:bg-editor-accent-purple rounded-full transition-colors"
                        style={{ height: `${scrollProgress * 100}%` }}
                    ></div>
                    <div
                        className="absolute w-6 h-3 bg-white rounded shadow-lg border border-gray-300 pointer-events-none transition-transform group-hover/track:scale-110 flex items-center justify-center"
                        style={{ top: `calc(${scrollProgress * 100}% - 6px)` }}
                    >
                        <div className="w-2 h-[2px] bg-black/40 rounded-full" />
                    </div>
                </div>
            </div>
        </main>
    );
}
