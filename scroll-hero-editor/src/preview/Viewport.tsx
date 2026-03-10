import { useCallback, useEffect, useRef } from 'react';
import { Maximize2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { GithubTestParticleField } from '../presets/ParticleLab';
import GhostTrailCanvas from './GhostTrailCanvas';
import RecordMode from './RecordMode';
import FrameSequenceScene from './FrameSequenceScene';
import { useStore } from '../store/useStore';
import { OrbitAdapter, ClassicAdapter, FrameSequenceAdapter } from './SceneAdapter';
import { sheet, SEQUENCE_DURATION } from '../theatre/core';

const RATIO_VALUES: Record<string, number | null> = {
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '1:1': 1,
    'free': null,
};

export default function Viewport() {
    const scrollProgress = useStore(state => state.scrollProgress);
    const isRecording = useStore(state => state.isRecording);
    const activePreset = useStore(state => state.activePreset);
    const aspectRatio = useStore(state => state.aspectRatio);
    const setAspectRatio = useStore(state => state.setAspectRatio);
    const isFullscreen = useStore(state => state.isFullscreen);
    const setIsFullscreen = useStore(state => state.setIsFullscreen);
    const setActiveAdapter = useStore(state => state.setActiveAdapter);
    const setSceneProgress = useStore(s => s.setSceneProgress);
    const rotationSpeed = useStore(s => s.rotationSpeed);
    const particleDepth = useStore(s => s.particleDepth);
    const particleSize = useStore(s => s.particleSize);
    const cssOpacity = useStore(s => s.cssOpacity);
    const extractedFrames = useStore(s => s.extractedFrames);

    // Ref for the classic iframe element
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Ref for the scrub handle track (vertical bar on the right)
    const trackRef = useRef<HTMLDivElement>(null);

    // Ref for the preview area — used for wheel scrub
    const previewRef = useRef<HTMLDivElement>(null);

    // Mouse wheel → scrub progress (passive:false required for preventDefault)
    useEffect(() => {
        const el = previewRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY / 800;
            const current = useStore.getState().scrollProgress;
            const next = Math.max(0, Math.min(1, current + delta));
            sheet.sequence.position = next * SEQUENCE_DURATION;
            useStore.getState().setSceneProgress(next);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // Pointer capture handlers for the scrub handle
    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!(e.buttons & 1)) return;
        const rect = trackRef.current!.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        sheet.sequence.position = p * SEQUENCE_DURATION;
        setSceneProgress(p);
    }, [setSceneProgress]);

    const onPointerUp = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
        // Position already snapped to Theatre.js during last onPointerMove — no action needed
    }, []);

    // Wire the appropriate adapter whenever activePreset changes
    useEffect(() => {
        if (activePreset === 'orbit' || activePreset === 'light') {
            // OrbitAdapter forwards progress to scrollProgress (already in Zustand,
            // GithubTestParticleField reads it via the progress prop below)
            setActiveAdapter(new OrbitAdapter((v) => {
                // setSceneProgress has already updated scrollProgress in Zustand;
                // this callback is intentionally a no-op since the progress prop
                // on GithubTestParticleField reads scrollProgress directly.
                void v;
            }));
        } else if (activePreset === 'classic-dark' || activePreset === 'classic-inverted') {
            setActiveAdapter(new ClassicAdapter(iframeRef));
        } else {
            setActiveAdapter(new FrameSequenceAdapter());
        }
        return () => {
            setActiveAdapter(null);
        };
    }, [activePreset, setActiveAdapter]);

    return (
        <main className="flex-1 flex flex-col relative bg-[#050508]">
            {/* Viewport Controls — hidden in fullscreen */}
            {!isFullscreen && <div className="h-10 border-b border-editor-border flex items-center justify-between px-4 z-10 bg-black/40">
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
                        {(['16:9', '9:16', '1:1', 'free'] as const).map((r) => (
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

            {/* Preview Area */}
            <div ref={previewRef} className="flex-1 flex items-center justify-center overflow-hidden bg-black/60 relative">
                {/* Letterbox Stage */}
                <div
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
                            />
                        </Canvas>
                    )}

                    {/* Light: R3F Canvas — white bg, dark particles */}
                    {activePreset === 'light' && (
                        <Canvas
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
                            />
                        </Canvas>
                    )}

                    {/* Frames: R3F Canvas with FrameSequenceScene */}
                    {activePreset === 'frames' && (
                        <Canvas
                            orthographic
                            camera={{ near: 0.1, far: 10, position: [0, 0, 1] }}
                            style={{ width: '100%', height: '100%', background: '#000', display: 'block' }}
                        >
                            <FrameSequenceScene frames={extractedFrames} progress={scrollProgress} />
                        </Canvas>
                    )}

                    {/* Classic Dark: original iframe, dark bg */}
                    {activePreset === 'classic-dark' && (
                        <iframe
                            ref={iframeRef}
                            src="/github-test-app/index.html"
                            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                            title="Classic Particles Dark"
                        />
                    )}

                    {/* Classic Inverted: CSS negative of the iframe */}
                    {activePreset === 'classic-inverted' && (
                        <iframe
                            ref={iframeRef}
                            src="/github-test-app/index.html"
                            style={{ width: '100%', height: '100%', border: 'none', display: 'block', filter: 'invert(1)' }}
                            title="Classic Particles Inverted"
                        />
                    )}

                    {/* Progress Overlay — replaces old DEBUG label */}
                    <div className="absolute top-4 left-4 z-50 bg-black/70 text-white font-mono text-sm px-3 py-1.5 rounded pointer-events-none">
                        <span className="text-editor-accent-purple">{scrollProgress.toFixed(3)}</span>
                        <span className="text-[9px] text-gray-500 ml-1">PROGRESS</span>
                    </div>

                    {/* Ghost Trail Canvas */}
                    <GhostTrailCanvas />

                    {/* Recording Mode Overlay */}
                    <RecordMode />
                </div>

                {/* Scroll Progress Bar — right side, outside the letterbox stage */}
                <div
                    ref={trackRef}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-64 w-1 bg-white/5 rounded-full z-30 cursor-ns-resize"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                >
                    <div
                        className="absolute top-0 w-full bg-editor-accent-purple shadow-[0_0_10px_rgba(168,85,247,0.5)] rounded-full"
                        style={{ height: `${scrollProgress * 100}%` }}
                    ></div>
                    <div
                        className="absolute -left-2 w-5 h-2 bg-white rounded-sm shadow-xl"
                        style={{ top: `calc(${scrollProgress * 100}% - 4px)` }}
                    ></div>
                </div>
            </div>
        </main>
    );
}
