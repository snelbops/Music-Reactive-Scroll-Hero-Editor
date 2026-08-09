import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronRight, UploadCloud, Video, Film, Layers, SlidersHorizontal, ImageIcon, X } from 'lucide-react';
import { saveMediaFile } from '../utils/mediaStore';

const ControlSlider = ({ label, value, min, max, step = 0.01, onChange }: {
    label: string; value: number; min: number; max: number; step?: number;
    onChange: (v: number) => void;
}) => (
    <div className="space-y-1">
        <div className="flex justify-between text-[9px] text-editor-muted">
            <span className="uppercase tracking-wider">{label}</span>
            <span className="font-mono tabular-nums">{value.toFixed(2)}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="w-full h-1 accent-editor-accent-purple cursor-pointer" />
    </div>
);
import { extractFrames } from '../packages/ffmpegExtractor';

const PARTICLE_LAB_PRESETS = [
    { id: 'orbit' as const,            label: 'Orbit',             description: 'Dark bg · white particles' },
    { id: 'light' as const,            label: 'Orbit Light',       description: 'White bg · dark particles' },
    { id: 'classic-dark' as const,      label: 'Classic Dark',      description: 'Dark bg · classic particles' },
    { id: 'classic-dark-copy' as const, label: 'Classic Light',     description: 'Dark bg · classic particles' },
    { id: 'classic-light' as const,    label: 'X',                 description: 'Experimental' },
    { id: 'light-images' as const,     label: 'Light Images',      description: 'White bg · your images' },
    { id: 'classic-inverted' as const, label: 'Rain Light',        description: 'White bg · dark particles' },
] as const;

export default function LeftPanel({ width = 220 }: { width?: number }) {
    const [isComponentsOpen, setIsComponentsOpen] = useState(true);
    const [isParticleLabOpen, setIsParticleLabOpen] = useState(true);
    const [isAssetsOpen, setIsAssetsOpen] = useState(true);

    const activePreset = useStore(state => state.activePreset);
    const setActivePreset = useStore(state => state.setActivePreset);
    const classicDarkControls = useStore(s => s.classicDarkControls);
    const setClassicDarkControls = useStore(s => s.setClassicDarkControls);
    const orbitControls = useStore(s => s.orbitControls);
    const setOrbitControls = useStore(s => s.setOrbitControls);
    const rotationSpeed = useStore(s => s.rotationSpeed);
    const setRotationSpeed = useStore(s => s.setRotationSpeed);
    const lightImages = useStore(s => s.lightImages);
    const addLightImage = useStore(s => s.addLightImage);
    const removeLightImage = useStore(s => s.removeLightImage);
    const activeLightImageIdx = useStore(s => s.activeLightImageIdx);
    const setActiveLightImageIdx = useStore(s => s.setActiveLightImageIdx);

    const lightImgInputRef = useRef<HTMLInputElement>(null);

    const handleLightImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        for (const file of Array.from(files)) {
            const url = await saveMediaFile(`light-img-${file.name}`, file);
            addLightImage({ name: file.name, url });
        }
        e.target.value = '';
    };
    const mp4Asset = useStore(s => s.mp4Asset);
    const setMp4Asset = useStore(s => s.setMp4Asset);
    const extractedFrames = useStore(s => s.extractedFrames);
    const setExtractedFrames = useStore(s => s.setExtractedFrames);
    const extractionProgress = useStore(s => s.extractionProgress);
    const setExtractionProgress = useStore(s => s.setExtractionProgress);
    const extractionStatus = useStore(s => s.extractionStatus);
    const setExtractionStatus = useStore(s => s.setExtractionStatus);
    const videoSyncMode = useStore(s => s.videoSyncMode);
    const setVideoSyncMode = useStore(s => s.setVideoSyncMode);
    const videoSpeedRatio = useStore(s => s.videoSpeedRatio);
    const setVideoSpeedRatio = useStore(s => s.setVideoSpeedRatio);

    const mp4InputRef = useRef<HTMLInputElement>(null);

    const handleMp4Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = await saveMediaFile('active-video', file);
        setMp4Asset({ name: file.name, url });
        setExtractedFrames([]);
        setExtractionStatus('idle');
        setExtractionProgress(0);
    };

    const handleExtract = async (sourceOverride?: File | string) => {
        const source = sourceOverride ?? mp4InputRef.current?.files?.[0];
        if (!source) return;
        setExtractionStatus('extracting');
        setExtractionProgress(0);
        try {
            const frames = await extractFrames(source, (p) => setExtractionProgress(p));
            setExtractedFrames(frames);
            setExtractionStatus('done');
            setActivePreset('frames');
        } catch (err) {
            console.error('ffmpeg extraction failed:', err);
            setExtractionStatus('error');
        }
    };

    // Auto-extract sample.mp4 on first load and setup numpad drumpad key shortcuts (7, 8, 4, 5)
    useEffect(() => {
        if (extractionStatus === 'idle' && extractedFrames.length === 0) {
            handleExtract('/sample.mp4');
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            const code = e.code;
            const key = e.key;

            if (code === 'Numpad7' || code === 'Digit7' || key === '7') {
                useStore.getState().setActiveVideoPadIdx(0);
            } else if (code === 'Numpad8' || code === 'Digit8' || key === '8') {
                useStore.getState().setActiveVideoPadIdx(1);
            } else if (code === 'Numpad4' || code === 'Digit4' || key === '4') {
                useStore.getState().setActiveVideoPadIdx(2);
            } else if (code === 'Numpad5' || code === 'Digit5' || key === '5') {
                useStore.getState().setActiveVideoPadIdx(3);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <aside className="flex flex-col border-r border-editor-border bg-editor-panel text-editor-fg overflow-hidden" style={{ width }}>
            <div className="h-8 border-b border-editor-border flex items-center justify-between px-2 bg-editor-panel shrink-0 gap-2">
                <div className="flex items-center text-xxs font-medium uppercase text-editor-muted">
                    <span className="text-editor-fg">Master</span>
                </div>
                <div className="flex-1 flex justify-end">
                    <input className="bg-editor-surface border border-editor-border rounded px-2 py-0.5 text-[10px] w-full max-w-[120px] focus:outline-none focus:border-editor-accent-blue text-editor-fg placeholder:text-editor-muted/50" placeholder="Search" type="text"/>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto thin-scrollbar p-2 flex flex-col gap-2">
            {/* Components */}
            <section>
                <button
                    onClick={() => setIsComponentsOpen(!isComponentsOpen)}
                    className="w-full flex justify-between items-center py-1 px-2 text-xxs font-bold text-editor-muted uppercase tracking-tighter mb-1 hover:text-editor-fg"
                >
                    Components {isComponentsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {isComponentsOpen && (
                    <div className="space-y-1 mb-2">
                        {/* Particle Lab */}
                        <div className="rounded border border-editor-border bg-editor-surface overflow-hidden">
                            <button
                                onClick={() => setIsParticleLabOpen(!isParticleLabOpen)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xxs text-editor-muted hover:bg-editor-surface transition-colors"
                            >
                                <Layers className="w-3 h-3 text-editor-accent-purple shrink-0" />
                                <span className="flex-1 text-left font-medium">Particle Lab</span>
                                {isParticleLabOpen ? <ChevronDown className="w-3 h-3 text-editor-muted" /> : <ChevronRight className="w-3 h-3 text-editor-muted" />}
                            </button>
                            {isParticleLabOpen && (
                                <div className="px-2 pb-2 space-y-1">
                                    {PARTICLE_LAB_PRESETS.map(({ id, label, description }) => (
                                        <button
                                            key={id}
                                            onClick={() => setActivePreset(id)}
                                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                                                activePreset === id
                                                    ? 'bg-editor-accent-purple/15 border border-editor-accent-purple/50 text-editor-fg'
                                                    : 'bg-editor-surface border border-editor-border text-editor-muted hover:bg-editor-surface-hover hover:text-[11px] text-editor-fg'
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                id === 'light' ? 'bg-gray-200 border border-gray-400' : 'bg-editor-accent-purple'
                                            }`} />
                                            <div className="min-w-0">
                                                <div className="text-xxs font-medium leading-tight">{label}</div>
                                                <div className="text-[9px] text-editor-muted leading-tight truncate">{description}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* Light Images panel */}
            {activePreset === 'light-images' && (
                <section>
                    <div className="w-full flex justify-between items-center py-1 px-2 text-xxs font-bold text-editor-muted uppercase tracking-tighter mb-1">
                        <span>Light Images</span>
                        <ImageIcon className="w-3 h-3" />
                    </div>
                    <input type="file" accept="image/*" multiple ref={lightImgInputRef} className="hidden" onChange={handleLightImageUpload} />
                    {lightImages.length === 0 ? (
                        <div className="rounded border border-editor-border bg-editor-surface px-3 py-5 flex flex-col items-center gap-2 text-center">
                            <ImageIcon className="w-6 h-6 text-editor-muted" />
                            <p className="text-[9px] text-editor-muted leading-tight">No images in this folder</p>
                            <button
                                onClick={() => lightImgInputRef.current?.click()}
                                className="mt-1 flex items-center gap-1 px-2 py-1 text-[9px] bg-editor-surface border border-editor-border text-editor-muted rounded hover:bg-editor-surface-hover transition-colors"
                            >
                                <UploadCloud className="w-3 h-3" /> Upload Images
                            </button>
                        </div>
                    ) : (
                        <div className="rounded border border-editor-border bg-editor-surface px-2 py-2 space-y-1">
                            {lightImages.map((img, i) => (
                                <div
                                    key={img.name}
                                    onClick={() => setActiveLightImageIdx(i)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                                        activeLightImageIdx === i
                                            ? 'bg-editor-accent-purple/15 border border-editor-accent-purple/40'
                                            : 'hover:bg-editor-surface border border-transparent'
                                    }`}
                                >
                                    <img src={img.url} alt={img.name} className="w-7 h-7 object-cover rounded shrink-0 bg-white/10" />
                                    <span className="flex-1 text-[9px] text-editor-muted truncate">{img.name}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeLightImage(img.name); if (activeLightImageIdx >= lightImages.length - 1) setActiveLightImageIdx(Math.max(0, lightImages.length - 2)); }}
                                        className="text-editor-muted hover:text-red-400 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => lightImgInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-1 py-1 text-[9px] text-editor-muted hover:text-editor-muted transition-colors"
                            >
                                <UploadCloud className="w-3 h-3" /> Add more
                            </button>
                        </div>
                    )}
                </section>
            )}

            {/* Classic Controls — shown for classic-dark and classic-light */}
            {(activePreset === 'classic-dark' || activePreset === 'classic-dark-copy' || activePreset === 'classic-light' || activePreset === 'classic-inverted') && (
                <section>
                    <div className="w-full flex justify-between items-center py-1 px-2 text-xxs font-bold text-editor-muted uppercase tracking-tighter mb-1">
                        <span>Controls</span>
                        <SlidersHorizontal className="w-3 h-3" />
                    </div>
                    <div className="rounded border border-editor-border bg-editor-surface px-3 py-3 space-y-4">
                        <div className="text-[9px] text-editor-muted uppercase tracking-widest mb-1">Particles</div>
                        <ControlSlider label="Random Scatter" value={classicDarkControls.random} min={1} max={10}
                            onChange={v => setClassicDarkControls({ ...classicDarkControls, random: v })} />
                        <ControlSlider label="Depth" value={classicDarkControls.depth} min={1} max={10}
                            onChange={v => setClassicDarkControls({ ...classicDarkControls, depth: v })} />
                        <ControlSlider label="Size" value={classicDarkControls.size} min={0} max={3}
                            onChange={v => setClassicDarkControls({ ...classicDarkControls, size: v })} />
                        <div className="text-[9px] text-editor-muted uppercase tracking-widest mt-2">Touch</div>
                        <ControlSlider label="Touch Radius" value={classicDarkControls.touchRadius} min={0} max={0.5}
                            onChange={v => setClassicDarkControls({ ...classicDarkControls, touchRadius: v })} />
                    </div>
                </section>
            )}

            {/* Orbit Controls — shown for orbit and light presets */}
            {(activePreset === 'orbit' || activePreset === 'light') && (
                <section>
                    <div className="w-full flex justify-between items-center py-1 px-2 text-xxs font-bold text-editor-muted uppercase tracking-tighter mb-1">
                        <span>Controls</span>
                        <SlidersHorizontal className="w-3 h-3" />
                    </div>
                    <div className="rounded border border-editor-border bg-editor-surface px-3 py-3 space-y-4">
                        <ControlSlider label="Rotation Speed" value={rotationSpeed} min={0} max={0.5} step={0.005}
                            onChange={v => setRotationSpeed(v)} />
                        <ControlSlider label="Intro Duration (s)" value={orbitControls.assemblyDuration} min={0.5} max={8} step={0.1}
                            onChange={v => setOrbitControls({ assemblyDuration: v })} />
                        {/* Assembly ease picker */}
                        <div className="space-y-1">
                            <div className="text-[9px] text-editor-muted uppercase tracking-widest">Intro Ease</div>
                            <div className="grid grid-cols-2 gap-1">
                                {(['linear', 'easeIn', 'easeOut', 'easeInOut'] as const).map(ease => (
                                    <button
                                        key={ease}
                                        onClick={() => setOrbitControls({ assemblyEase: ease })}
                                        className={`py-1 text-[9px] rounded border transition-colors ${
                                            orbitControls.assemblyEase === ease
                                                ? 'bg-editor-accent-purple/20 border-editor-accent-purple/50 text-editor-accent-purple'
                                                : 'bg-editor-surface border-editor-border text-editor-muted hover:bg-editor-surface-hover'
                                        }`}
                                    >
                                        {ease === 'easeInOut' ? 'ease in+out' : ease === 'easeIn' ? 'ease in' : ease === 'easeOut' ? 'ease out' : 'linear'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Pause after assembly toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-editor-muted uppercase tracking-widest">Pause After Intro</span>
                            <button
                                onClick={() => setOrbitControls({ pauseAfterAssembly: !orbitControls.pauseAfterAssembly })}
                                className={`relative w-7 h-4 rounded-full transition-colors ${orbitControls.pauseAfterAssembly ? 'bg-editor-accent-purple' : 'bg-editor-border'}`}
                            >
                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${orbitControls.pauseAfterAssembly ? 'left-3.5' : 'left-0.5'}`} />
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* Assets */}
            <section>
                <button
                    onClick={() => setIsAssetsOpen(!isAssetsOpen)}
                    className="w-full flex justify-between items-center py-1 px-2 text-xxs font-bold text-editor-muted uppercase tracking-tighter mb-1 hover:text-editor-fg"
                >
                    Assets {isAssetsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {isAssetsOpen && (
                    <div className="space-y-2">
                        {/* Hidden inputs */}
                        <input type="file" accept="video/mp4" className="hidden" ref={mp4InputRef} onChange={handleMp4Upload} />
                        <input type="file" accept="audio/*" className="hidden" id="audio-upload"
                            onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    const url = await saveMediaFile('active-audio', f);
                                    useStore.getState().setAudioUrl(url);
                                }
                                e.target.value = '';
                            }}
                        />

                        {/* Upload buttons */}
                        <div className="flex gap-2">
                            <button onClick={() => mp4InputRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-1 p-1 glass-panel text-xxs text-editor-muted hover:bg-editor-surface-hover border border-dashed border-editor-border">
                                <UploadCloud className="w-3 h-3" /> MP4
                            </button>
                            <button onClick={() => document.getElementById('audio-upload')?.click()}
                                className="flex-1 flex items-center justify-center gap-1 p-1 glass-panel text-xxs text-editor-muted hover:bg-editor-surface-hover border border-dashed border-editor-border">
                                <UploadCloud className="w-3 h-3" /> Audio
                            </button>
                        </div>

                        {/* MP4 asset card */}
                        {mp4Asset && (
                            <div className="glass-panel rounded p-2 space-y-2 relative">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-editor-accent-blue/20 rounded flex items-center justify-center text-editor-accent-blue shrink-0">
                                        <Video className="w-3 h-3" />
                                    </div>
                                    <span className="truncate text-xxs text-editor-muted flex-1">{mp4Asset.name}</span>
                                    <button
                                        onClick={() => useStore.getState().removeMp4Asset()}
                                        title="Delete Asset"
                                        className="text-editor-muted hover:text-red-400 p-0.5 rounded transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Extraction progress */}
                                {extractionStatus === 'extracting' && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-editor-muted">
                                            <span className="animate-pulse">Extracting frames…</span>
                                            <span>{Math.round(extractionProgress * 100)}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-editor-surface rounded-full overflow-hidden">
                                            <div className="h-full bg-editor-accent-orange rounded-full transition-all" style={{ width: `${extractionProgress * 100}%` }} />
                                        </div>
                                    </div>
                                )}

                                {extractionStatus === 'error' && (
                                    <p className="text-[9px] text-red-400">Extraction failed. Try again.</p>
                                )}

                                {extractionStatus === 'done' && (
                                    <p className="text-[9px] text-editor-accent-green">{extractedFrames.length} frames extracted</p>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-1.5">
                                    {extractionStatus !== 'done' && extractionStatus !== 'extracting' && (
                                        <button onClick={() => handleExtract()}
                                            className="flex-1 flex items-center justify-center gap-1 py-1 text-[9px] bg-editor-accent-orange/20 border border-editor-accent-orange/40 text-editor-accent-orange rounded hover:bg-editor-accent-orange/30 transition-colors">
                                            <Film className="w-2.5 h-2.5" /> Extract Frames
                                        </button>
                                    )}
                                    {extractionStatus === 'done' && (
                                        <button
                                            onClick={() => setActivePreset('frames')}
                                            className={`flex-1 py-1 text-[9px] rounded border transition-colors ${
                                                activePreset === 'frames'
                                                    ? 'bg-editor-accent-purple/20 border-editor-accent-purple/50 text-editor-accent-purple'
                                                    : 'bg-editor-surface border-editor-border text-editor-muted hover:bg-editor-surface-hover'
                                            }`}>
                                            {activePreset === 'frames' ? '✓ Loaded' : 'Load as Scene'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Video Duration & Time Sync Ratio Controls */}
                        <div className="mt-3 space-y-2 glass-panel p-2 rounded border border-editor-border">
                            <div className="flex justify-between items-center text-[9px] text-editor-muted uppercase tracking-widest">
                                <span>Video Sync & Ratio</span>
                                <span className="text-editor-accent-blue font-mono font-bold">{videoSyncMode.toUpperCase()}</span>
                            </div>

                            {/* Sync Mode Selector */}
                            <div className="grid grid-cols-3 gap-1">
                                {(['fit', 'realtime', 'loop'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setVideoSyncMode(mode)}
                                        className={`py-1 text-[9px] font-bold rounded border transition-colors ${
                                            videoSyncMode === mode
                                                ? 'bg-editor-accent-blue/20 border-editor-accent-blue text-editor-accent-blue'
                                                : 'bg-editor-surface border-editor-border text-editor-muted hover:bg-editor-surface-hover'
                                        }`}
                                        title={mode === 'fit' ? 'Stretches 0-100% of video over sequence duration' : mode === 'realtime' ? '1s timeline = 1s video playback' : 'Loops video over sequence duration'}
                                    >
                                        {mode === 'fit' ? '↔ Fit 100%' : mode === 'realtime' ? '⏱ Realtime' : '🔁 Loop'}
                                    </button>
                                ))}
                            </div>

                            {/* Speed Ratio Slider */}
                            <div className="space-y-1 pt-1">
                                <div className="flex justify-between text-[9px] text-editor-muted">
                                    <span>SPEED MULTIPLIER:</span>
                                    <span className="font-mono text-cyan-400 font-bold">{videoSpeedRatio.toFixed(2)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.25"
                                    max="3.0"
                                    step="0.05"
                                    value={videoSpeedRatio}
                                    onChange={(e) => setVideoSpeedRatio(parseFloat(e.target.value))}
                                    className="w-full h-1 accent-cyan-400 cursor-pointer"
                                />
                                <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                                    <span>0.25x</span>
                                    <span className="cursor-pointer hover:text-white" onClick={() => setVideoSpeedRatio(1.0)}>1.0x (Reset)</span>
                                    <span>3.00x</span>
                                </div>
                            </div>

                            {/* Quick Keyframe Stretch Ratio Helper */}
                            <div className="border-t border-editor-border pt-1.5 flex gap-1">
                                <button
                                    onClick={() => {
                                        const ratioStr = prompt('Enter keyframe scale ratio (e.g. 0.8 to shrink keyframes by 20%, 1.25 to stretch by 25%):', '0.8');
                                        if (ratioStr) {
                                            const r = parseFloat(ratioStr);
                                            if (!isNaN(r) && r > 0) useStore.getState().remapKeyframesToRatio(r);
                                        }
                                    }}
                                    className="w-full py-1 text-[9px] bg-editor-accent-purple/20 hover:bg-editor-accent-purple border border-editor-accent-purple/40 text-editor-accent-purple hover:text-white rounded font-mono font-bold transition-all flex items-center justify-center gap-1"
                                    title="Stretch or shrink automation keyframes to fit a different video length ratio"
                                >
                                    ⚡ Remap Keyframe Time Ratio
                                </button>
                            </div>
                        </div>

                        {/* Video Drumpad Launcher */}
                        <div className="mt-3 space-y-1">
                            <div className="flex justify-between items-center text-[9px] text-editor-muted uppercase tracking-widest px-1">
                                <span>Video Drumpad</span>
                                <span className="text-editor-accent-purple font-mono">Pads [7,8,4,5]</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {useStore(s => s.videoPads).map((pad, idx) => {
                                    const activeVideoPadIdx = useStore(s => s.activeVideoPadIdx);
                                    const setActiveVideoPadIdx = useStore(s => s.setActiveVideoPadIdx);
                                    const setVideoPad = useStore(s => s.setVideoPad);
                                    const isActive = activeVideoPadIdx === idx;
                                    const fileInputId = `pad-upload-${idx}`;

                                    const handlePadFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const url = await saveMediaFile(`video-pad-${idx}`, file);
                                        setVideoPad(idx, { name: file.name, url });
                                        setMp4Asset({ name: file.name, url });
                                        setActiveVideoPadIdx(idx);
                                    };

                                    const handlePadDrop = async (e: React.DragEvent) => {
                                        e.preventDefault();
                                        const file = e.dataTransfer.files?.[0];
                                        if (file && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm'))) {
                                            const url = await saveMediaFile(`video-pad-${idx}`, file);
                                            setVideoPad(idx, { name: file.name, url });
                                            setMp4Asset({ name: file.name, url });
                                            setActiveVideoPadIdx(idx);
                                        }
                                    };

                                    return (
                                        <div
                                            key={pad.id}
                                            onClick={() => setActiveVideoPadIdx(idx)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={handlePadDrop}
                                            className={`p-2 rounded border flex flex-col justify-between text-left cursor-pointer transition-all relative group/pad ${
                                                isActive
                                                    ? 'bg-editor-accent-purple/20 border-editor-accent-purple shadow-[0_0_10px_rgba(168,85,247,0.3)] text-editor-fg'
                                                    : 'bg-editor-surface border-editor-border text-editor-muted hover:bg-editor-surface-hover'
                                            }`}
                                        >
                                            <input
                                                type="file"
                                                id={fileInputId}
                                                accept="video/*"
                                                className="hidden"
                                                onChange={handlePadFileUpload}
                                            />
                                            <div className="flex justify-between items-center w-full mb-1">
                                                <span className="text-[9px] font-bold font-mono px-1 rounded bg-black/40 text-editor-accent-purple">PAD {pad.id}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        document.getElementById(fileInputId)?.click();
                                                    }}
                                                    title="Assign Video File"
                                                    className="text-[10px] text-editor-muted hover:text-white bg-black/40 hover:bg-editor-accent-purple/40 px-1 rounded transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div className="text-[9px] font-medium truncate w-full flex items-center gap-1">
                                                <Video className="w-2.5 h-2.5 shrink-0 opacity-60" />
                                                <span className="truncate">{pad.name || 'Drop Video / +'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </section>
            </div>
        </aside>
    );
}
