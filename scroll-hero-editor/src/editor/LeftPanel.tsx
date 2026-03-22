import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronRight, UploadCloud, Video, Film, Layers, SlidersHorizontal, ImageIcon, X } from 'lucide-react';

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
    const lightImages = useStore(s => s.lightImages);
    const addLightImage = useStore(s => s.addLightImage);
    const removeLightImage = useStore(s => s.removeLightImage);
    const activeLightImageIdx = useStore(s => s.activeLightImageIdx);
    const setActiveLightImageIdx = useStore(s => s.setActiveLightImageIdx);

    const lightImgInputRef = useRef<HTMLInputElement>(null);

    const handleLightImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach(file => {
            addLightImage({ name: file.name, url: URL.createObjectURL(file) });
        });
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

    const mp4InputRef = useRef<HTMLInputElement>(null);

    const handleMp4Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
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
        } catch (err) {
            console.error('ffmpeg extraction failed:', err);
            setExtractionStatus('error');
        }
    };

    // Auto-extract sample.mp4 on first load
    useEffect(() => {
        if (extractionStatus === 'idle' && extractedFrames.length === 0) {
            handleExtract('/sample.mp4');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <aside className="flex flex-col border-r border-editor-border bg-editor-panel text-editor-fg overflow-hidden" style={{ width }}>
            <div className="h-8 border-b border-editor-border flex items-center justify-between px-2 bg-editor-panel shrink-0 gap-2">
                <div className="flex items-center text-xxs font-medium uppercase text-editor-muted">
                    <span className="text-editor-fg">Master</span>
                </div>
                <div className="flex-1 flex justify-end">
                    <input className="bg-[#111] border border-editor-border rounded px-2 py-0.5 text-[10px] w-full max-w-[120px] focus:outline-none focus:border-editor-accent-blue text-editor-fg placeholder:text-editor-muted/50" placeholder="Search" type="text"/>
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
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) useStore.getState().setAudioUrl(URL.createObjectURL(f)); }} />

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
                            <div className="glass-panel rounded p-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-editor-accent-blue/20 rounded flex items-center justify-center text-editor-accent-blue shrink-0">
                                        <Video className="w-3 h-3" />
                                    </div>
                                    <span className="truncate text-xxs text-editor-muted flex-1">{mp4Asset.name}</span>
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
                    </div>
                )}
            </section>
            </div>
        </aside>
    );
}
