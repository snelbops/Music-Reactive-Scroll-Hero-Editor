import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronRight, UploadCloud, Video, Film, Layers, SlidersHorizontal, ImageIcon, X, Sparkles, Grid, Plus } from 'lucide-react';
import { saveMediaFile, getMediaBlob, newPadMediaKey } from '../utils/mediaStore';
import { cacheActiveVideo } from '../utils/videoCache';
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
    const [activeLeftTab, setActiveLeftTab] = useState<'settings' | 'scene3d'>('settings');

    const [isParticleLabOpen, setIsParticleLabOpen] = useState(true);
    const [isVideoPadsOpen, setIsVideoPadsOpen] = useState(true);
    const [isVideoControlsOpen, setIsVideoControlsOpen] = useState(true);
    const [isFrameExtractorOpen, setIsFrameExtractorOpen] = useState(false);
    const [draggedPadIdx, setDraggedPadIdx] = useState<number | null>(null);

    const activePreset = useStore(state => state.activePreset);
    const setActivePreset = useStore(state => state.setActivePreset);
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
    const setActiveVideoBlob = useStore(s => s.setActiveVideoBlob);

    const videoPads = useStore(s => s.videoPads);
    const activeVideoPadIdx = useStore(s => s.activeVideoPadIdx);
    const setActiveVideoPadIdx = useStore(s => s.setActiveVideoPadIdx);
    const setVideoPad = useStore(s => s.setVideoPad);
    const swapVideoPads = useStore(s => s.swapVideoPads);

    const mp4InputRef = useRef<HTMLInputElement>(null);

    const handleMp4Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        cacheActiveVideo(file, file.name);
        setActiveVideoBlob(file);
        const url = await saveMediaFile('active-video', file);
        setMp4Asset({ name: file.name, url });
        setExtractedFrames([]);
        setExtractionStatus('idle');
        setExtractionProgress(0);
    };

    // `userInitiated` distinguishes the button from the automatic startup extraction of
    // sample.mp4. Only an explicit click should switch the renderer — the background run
    // used to force 'frames' on every load, overriding the preset a project was saved with.
    const handleExtract = async (sourceOverride?: File | string, userInitiated = true) => {
        const source = sourceOverride ?? mp4InputRef.current?.files?.[0];
        if (!source) return;
        setExtractionStatus('extracting');
        setExtractionProgress(0);
        try {
            const frames = await extractFrames(source, (p) => setExtractionProgress(p));
            setExtractedFrames(frames);
            setExtractionStatus('done');
            if (userInitiated) setActivePreset('frames');
        } catch (err) {
            console.error('ffmpeg extraction failed:', err);
            setExtractionStatus('error');
        }
    };

    // Auto-extract sample.mp4 on first load and setup numpad drumpad key shortcuts (7, 8, 9, 4, 5, 6, 1, 2, 3, 0)
    useEffect(() => {
        if (extractionStatus === 'idle' && extractedFrames.length === 0) {
            handleExtract('/sample.mp4', false);
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
            const code = e.code;

            // Strict Numpad mapping (only physical Numpad keys trigger drumpad switches)
            const numpadMap: Record<string, number> = {
                'Numpad7': 0,
                'Numpad8': 1,
                'Numpad9': 2,
                'Numpad4': 3,
                'Numpad5': 4,
                'Numpad6': 5,
                'Numpad1': 6,
                'Numpad2': 7,
                'Numpad3': 8,
                'Numpad0': 9,
            };

            const targetIdx = numpadMap[code];
            if (targetIdx !== undefined) {
                e.preventDefault();
                useStore.getState().setActiveVideoPadIdx(targetIdx);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <aside className="flex flex-col border-r border-editor-border bg-editor-panel text-editor-fg overflow-hidden min-w-[200px]" style={{ width }}>
            {/* Top 2-Tab Navigation Bar */}
            <div className="h-9 border-b border-editor-border flex items-center bg-editor-surface shrink-0 p-1 gap-1">
                <button
                    onClick={() => setActiveLeftTab('settings')}
                    className={`flex-1 h-7 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-all min-w-0 px-1 ${
                        activeLeftTab === 'settings'
                            ? 'bg-editor-surface-hover text-editor-fg border border-editor-border shadow-xs'
                            : 'text-editor-muted hover:text-editor-fg hover:bg-editor-surface-hover'
                    }`}
                    title="Media & Pad Controls"
                >
                    <SlidersHorizontal className="w-3 h-3 shrink-0" />
                    <span className="truncate">Media & Sync</span>
                </button>
                <button
                    onClick={() => setActiveLeftTab('scene3d')}
                    className={`flex-1 h-7 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-all min-w-0 px-1 ${
                        activeLeftTab === 'scene3d'
                            ? 'bg-[#23272c] text-[#e2e5e8] border border-[#3a4249] shadow-xs'
                            : 'text-[#7d848c] hover:text-[#e2e5e8] hover:bg-[#15181b]'
                    }`}
                    title="3D Scene Components"
                >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span className="truncate">3D Scene</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto thin-scrollbar p-2 flex flex-col gap-2">
            {activeLeftTab === 'settings' && (
                <>
                    <section className="rounded-md border border-editor-border bg-editor-panel overflow-hidden">
                        <button
                            onClick={() => setIsVideoPadsOpen(!isVideoPadsOpen)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold text-editor-muted uppercase tracking-wider hover:text-editor-fg transition-colors gap-1 min-w-0"
                        >
                            <div className="flex items-center gap-1.5 truncate min-w-0">
                                <Grid className="w-3.5 h-3.5 text-[#c98a4d] shrink-0" />
                                <span className="truncate">Video Drumpads</span>
                            </div>
                            <span className="text-[9.5px] font-mono text-editor-muted border border-editor-border bg-editor-surface px-1.5 py-0.5 rounded shrink-0">Numpad [7..0]</span>
                        </button>

                        {isVideoPadsOpen && (
                            <div className="p-1.5 space-y-1.5 border-t border-editor-border">
                                <div className="grid grid-cols-3 gap-1.5 min-w-0">
                                    {videoPads.map((pad, idx) => {
                                        const isActive = activeVideoPadIdx === idx;
                                        const fileInputId = `pad-upload-${idx}`;
                                        const colorInputId = `pad-color-${idx}`;
                                        const padColor = pad.color || '#5f7f9e';

                                        const handlePadFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            cacheActiveVideo(file, file.name);
                                            setActiveVideoBlob(file);
                                            const mediaKey = newPadMediaKey();
                                            const url = await saveMediaFile(mediaKey, file);
                                            setVideoPad(idx, { ...pad, name: file.name, url, mediaKey });
                                            setMp4Asset({ name: file.name, url });
                                            setActiveVideoPadIdx(idx);
                                        };

                                        const handlePadDrop = async (e: React.DragEvent) => {
                                            e.preventDefault();
                                            if (draggedPadIdx !== null && draggedPadIdx !== idx) {
                                                swapVideoPads(draggedPadIdx, idx);
                                                setDraggedPadIdx(null);
                                                return;
                                            }
                                            const file = e.dataTransfer.files?.[0];
                                            if (file && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm'))) {
                                                cacheActiveVideo(file, file.name);
                                                setActiveVideoBlob(file);
                                                const mediaKey = newPadMediaKey();
                                                const url = await saveMediaFile(mediaKey, file);
                                                setVideoPad(idx, { ...pad, name: file.name, url, mediaKey });
                                                setMp4Asset({ name: file.name, url });
                                                setActiveVideoPadIdx(idx);
                                            }
                                        };

                                        const isWideZeroPad = pad.id === 0;

                                        return (
                                            <div
                                                key={`pad-slot-${idx}`}
                                                draggable
                                                onDragStart={() => setDraggedPadIdx(idx)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDragEnd={() => setDraggedPadIdx(null)}
                                                onDrop={handlePadDrop}
                                                onClick={async () => {
                                                    setActiveVideoPadIdx(idx);
                                                    if (pad.url) useStore.getState().setVideoUrl(pad.url);
                                                    const key = pad.mediaKey ?? `video-pad-${idx}`;
                                                    const blob = await getMediaBlob(key);
                                                    if (blob) {
                                                        await saveMediaFile('active-video', blob);
                                                        cacheActiveVideo(blob, pad.name || `pad-${idx}`);
                                                        setActiveVideoBlob(blob);
                                                    }
                                                }}
                                                className={`rounded-md border flex flex-col justify-between text-left cursor-pointer transition-all relative group/pad min-w-0 overflow-hidden ${
                                                    isWideZeroPad ? 'col-span-3 h-11' : 'h-14'
                                                } ${
                                                    isActive
                                                        ? 'bg-editor-surface-hover text-editor-fg font-bold shadow-xs'
                                                        : 'bg-editor-surface border-editor-border text-editor-muted hover:bg-editor-surface-hover hover:text-editor-fg'
                                                }`}
                                                style={{ borderColor: isActive ? padColor : undefined }}
                                            >
                                                <div
                                                    className="h-1.5 w-full shrink-0 relative cursor-pointer group/bar flex items-center justify-end px-1"
                                                    style={{ backgroundColor: padColor, opacity: isActive ? 1 : 0.6 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        document.getElementById(colorInputId)?.click();
                                                    }}
                                                >
                                                    <span className="text-[7px] text-white opacity-0 group-hover/bar:opacity-100 font-mono">🎨</span>
                                                </div>
                                                <input
                                                    id={colorInputId}
                                                    type="color"
                                                    value={padColor}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        setVideoPad(idx, { ...pad, color: e.target.value });
                                                    }}
                                                    className="hidden"
                                                />
                                                <div className="p-1 flex flex-col justify-between flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-0.5">
                                                        <span className="font-mono text-[9px] font-bold text-editor-muted">#{pad.id}</span>
                                                        <div className="flex items-center gap-0.5">
                                                            {pad.url && (
                                                                <button
                                                                    title="Clear Pad Video"
                                                                    className="opacity-0 group-hover/pad:opacity-100 text-[8px] text-editor-muted hover:text-red-400 p-0.5 rounded transition-all"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // Drop mediaKey too, or the cleared pad would be
                                                                        // re-hydrated from its old stored clip on next load.
                                                                        setVideoPad(idx, { ...pad, name: '', url: '', mediaKey: undefined });
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                            <button
                                                                title="Upload video for this pad"
                                                                className="opacity-0 group-hover/pad:opacity-100 text-[8px] text-editor-muted hover:text-editor-fg p-0.5 rounded transition-all"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    document.getElementById(fileInputId)?.click();
                                                                }}
                                                            >
                                                                <Plus className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 min-w-0">
                                                        <Video className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                                        <span className="text-[9px] truncate font-medium">{pad.name || `Pad ${pad.id}`}</span>
                                                    </div>
                                                </div>
                                                <input id={fileInputId} type="file" accept="video/*" className="hidden" onChange={handlePadFileUpload} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="rounded-md border border-editor-border bg-editor-panel overflow-hidden">
                        <button
                            onClick={() => setIsVideoControlsOpen(!isVideoControlsOpen)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold text-editor-muted uppercase tracking-wider hover:text-editor-fg transition-colors"
                        >
                            <div className="flex items-center gap-1.5 truncate">
                                <Film className="w-3.5 h-3.5 text-[#5f7f9e]" />
                                <span>Video Sync & Controls</span>
                            </div>
                            {isVideoControlsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                        {isVideoControlsOpen && (
                            <div className="p-2.5 space-y-2.5 border-t border-editor-border text-xxs">
                                <div className="space-y-1">
                                    <span className="text-[9.5px] text-editor-muted uppercase tracking-wider font-semibold">Video Sync Mode</span>
                                    <div className="grid grid-cols-3 gap-1 min-w-0">
                                        {(['fit', 'realtime', 'loop'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setVideoSyncMode(mode)}
                                                className={`py-1 px-1 rounded text-[9.5px] font-semibold uppercase transition-all truncate ${
                                                    videoSyncMode === mode
                                                        ? 'bg-editor-surface-hover text-editor-accent-blue border border-editor-accent-blue font-bold'
                                                        : 'bg-editor-surface border border-editor-border text-editor-muted hover:text-editor-fg hover:bg-editor-surface-hover'
                                                }`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[8.5px] text-editor-muted leading-tight mt-1">
                                        {videoSyncMode === 'fit' && '• Fit: Stretches 0-100% of video over sequence duration'}
                                        {videoSyncMode === 'realtime' && '• Realtime: 1 sec timeline = 1 sec video playback'}
                                        {videoSyncMode === 'loop' && '• Loop: Plays at 1x speed, looping automatically'}
                                    </p>
                                </div>
                                <div className="space-y-1 pt-1 border-t border-editor-border">
                                    <div className="flex justify-between text-[9.5px]">
                                        <span className="text-editor-muted uppercase tracking-wider font-semibold">Speed Ratio</span>
                                        <span className="font-mono text-editor-accent-blue font-semibold">{videoSpeedRatio.toFixed(2)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.25"
                                        max="3.0"
                                        step="0.05"
                                        value={videoSpeedRatio}
                                        onChange={(e) => setVideoSpeedRatio(parseFloat(e.target.value))}
                                        className="w-full h-1 accent-[#5f7f9e] cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[8.5px] text-editor-muted font-mono">
                                        <span>0.25x</span>
                                        <span className="cursor-pointer hover:text-editor-fg text-editor-accent-blue underline" onClick={() => setVideoSpeedRatio(1.0)}>Reset (1.0x)</span>
                                        <span>3.00x</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const ratioStr = prompt('Enter keyframe scale ratio (e.g. 0.8 to shrink keyframes by 20%, 1.25 to stretch by 25%):', '0.8');
                                        if (ratioStr) {
                                            const r = parseFloat(ratioStr);
                                            if (!isNaN(r) && r > 0) useStore.getState().remapKeyframesToRatio(r);
                                        }
                                    }}
                                    className="w-full py-1 text-[9.5px] bg-editor-surface hover:bg-editor-surface-hover border border-editor-border text-editor-accent-blue hover:text-editor-fg rounded font-mono font-semibold transition-all flex items-center justify-center gap-1"
                                >
                                    ⚡ Remap Keyframe Time Ratio
                                </button>
                            </div>
                        )}
                    </section>

                    <section className="rounded-md border border-editor-border bg-editor-panel overflow-hidden">
                        <button
                            onClick={() => setIsFrameExtractorOpen(!isFrameExtractorOpen)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold text-editor-muted uppercase tracking-wider hover:text-editor-fg transition-colors"
                        >
                            <div className="flex items-center gap-1.5 truncate">
                                <Film className="w-3.5 h-3.5 text-[#6e9c73]" />
                                <span>Single Asset & Extractor</span>
                            </div>
                            {isFrameExtractorOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                        {isFrameExtractorOpen && (
                            <div className="p-2.5 space-y-2 border-t border-editor-border">
                                <input type="file" accept="video/*" ref={mp4InputRef} className="hidden" onChange={handleMp4Upload} />
                                <div className="flex items-center gap-2 bg-editor-surface p-2 rounded border border-editor-border">
                                    <Film className="w-4 h-4 text-[#6e9c73] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-semibold truncate text-editor-fg">{mp4Asset?.name || 'No video selected'}</div>
                                        <div className="text-[9px] text-editor-muted">Active Master Asset</div>
                                    </div>
                                    <button
                                        onClick={() => mp4InputRef.current?.click()}
                                        className="px-2 py-1 bg-editor-surface-hover border border-editor-border rounded text-[9.5px] text-editor-fg transition-colors"
                                    >
                                        Change
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleExtract()}
                                    disabled={extractionStatus === 'extracting'}
                                    className="w-full py-1.5 bg-editor-surface border border-[#6e9c73]/40 hover:bg-editor-surface-hover text-[#6e9c73] rounded text-[10px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    <Film className="w-3 h-3" />
                                    {extractionStatus === 'extracting' ? `Extracting (${Math.round(extractionProgress * 100)}%)` : 'Extract Frames (FFmpeg)'}
                                </button>
                            </div>
                        )}
                    </section>
                </>
            )}

            {activeLeftTab === 'scene3d' && (
                <>
                    <section className="rounded-md border border-editor-border bg-editor-panel overflow-hidden">
                        <button
                            onClick={() => setIsParticleLabOpen(!isParticleLabOpen)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold text-editor-muted uppercase tracking-wider hover:text-editor-fg transition-colors"
                        >
                            <div className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-[#a86a5c]" />
                                <span>Particle Lab Presets</span>
                            </div>
                            {isParticleLabOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                        {isParticleLabOpen && (
                            <div className="p-2 space-y-1 border-t border-editor-border">
                                {PARTICLE_LAB_PRESETS.map(({ id, label, description }) => (
                                    <button
                                        key={id}
                                        onClick={() => setActivePreset(id)}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                                            activePreset === id
                                                ? 'bg-editor-surface-hover border border-editor-accent-blue text-editor-fg font-bold'
                                                : 'bg-editor-surface border border-editor-border text-editor-muted hover:bg-editor-surface-hover hover:text-editor-fg'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                            id === 'light' ? 'bg-gray-200 border border-gray-400' : 'bg-[#a86a5c]'
                                        }`} />
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-medium leading-tight">{label}</div>
                                            <div className="text-[9px] text-editor-muted leading-tight truncate">{description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                    {activePreset === 'light-images' && (
                        <section className="rounded-md border border-editor-border bg-editor-panel p-2.5 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-semibold text-editor-muted uppercase tracking-wider">
                                <span>Light Images</span>
                                <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                            <input type="file" accept="image/*" multiple ref={lightImgInputRef} className="hidden" onChange={handleLightImageUpload} />
                            {lightImages.length === 0 ? (
                                <div className="rounded border border-editor-border bg-editor-surface px-3 py-4 flex flex-col items-center gap-2 text-center">
                                    <ImageIcon className="w-6 h-6 text-editor-muted" />
                                    <p className="text-[9.5px] text-editor-muted leading-tight">No images uploaded</p>
                                    <button
                                        onClick={() => lightImgInputRef.current?.click()}
                                        className="mt-1 flex items-center gap-1 px-2.5 py-1 text-[9.5px] bg-editor-surface-hover border border-editor-border text-editor-fg rounded transition-colors"
                                    >
                                        <UploadCloud className="w-3 h-3" /> Upload Images
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {lightImages.map((img, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setActiveLightImageIdx(idx)}
                                            className={`p-1.5 rounded border flex flex-col items-center justify-between cursor-pointer transition-all relative ${
                                                activeLightImageIdx === idx
                                                    ? 'bg-editor-surface-hover border-editor-accent-blue text-editor-fg font-bold'
                                                    : 'bg-editor-surface border-editor-border text-editor-muted hover:bg-editor-surface-hover'
                                            }`}
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeLightImage(img.name); }}
                                                className="absolute top-1 right-1 p-0.5 rounded bg-black/60 hover:bg-red-500/80 text-white transition-colors"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                            <img src={img.url} alt={img.name} className="w-full h-12 object-cover rounded mb-1 bg-editor-surface" />
                                            <span className="text-[8px] truncate w-full text-center">{img.name}</span>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => lightImgInputRef.current?.click()}
                                        className="p-1.5 rounded border border-dashed border-editor-border bg-editor-surface hover:bg-editor-surface-hover flex flex-col items-center justify-center gap-1 text-editor-muted hover:text-editor-fg transition-colors h-20"
                                    >
                                        <UploadCloud className="w-4 h-4" />
                                        <span className="text-[8.5px]">Add Image</span>
                                    </button>
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}
            </div>
        </aside>
    );
}
