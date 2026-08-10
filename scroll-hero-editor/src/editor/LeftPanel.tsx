import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronRight, UploadCloud, Video, Film, Layers, SlidersHorizontal, ImageIcon, X, Sparkles, Grid } from 'lucide-react';
import { saveMediaFile, getMediaDataUrl, dataUrlToBlob } from '../utils/mediaStore';
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

    // Auto-extract sample.mp4 on first load and setup numpad drumpad key shortcuts (7, 8, 9, 4, 5, 6, 1, 2, 3, 0)
    useEffect(() => {
        if (extractionStatus === 'idle' && extractedFrames.length === 0) {
            handleExtract('/sample.mp4');
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            const code = e.code;
            const key = e.key;

            const padMap: Record<string, number> = {
                '7': 0, 'Numpad7': 0, 'Digit7': 0,
                '8': 1, 'Numpad8': 1, 'Digit8': 1,
                '9': 2, 'Numpad9': 2, 'Digit9': 2,
                '4': 3, 'Numpad4': 3, 'Digit4': 3,
                '5': 4, 'Numpad5': 4, 'Digit5': 4,
                '6': 5, 'Numpad6': 5, 'Digit6': 5,
                '1': 6, 'Numpad1': 6, 'Digit1': 6,
                '2': 7, 'Numpad2': 7, 'Digit2': 7,
                '3': 8, 'Numpad3': 8, 'Digit3': 8,
                '0': 9, 'Numpad0': 9, 'Digit0': 9,
            };

            const targetIdx = padMap[code] ?? padMap[key];
            if (targetIdx !== undefined) {
                useStore.getState().setActiveVideoPadIdx(targetIdx);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <aside className="flex flex-col border-r border-editor-border bg-editor-panel text-editor-fg overflow-hidden" style={{ width }}>
            {/* Top 2-Tab Navigation Bar */}
            <div className="h-9 border-b border-editor-border flex items-center bg-black/40 shrink-0 p-1 gap-1">
                <button
                    onClick={() => setActiveLeftTab('settings')}
                    className={`flex-1 h-7 rounded text-xxs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        activeLeftTab === 'settings'
                            ? 'bg-editor-accent-purple/20 text-editor-accent-purple border border-editor-accent-purple/40 shadow-sm'
                            : 'text-editor-muted hover:text-editor-fg hover:bg-editor-surface'
                    }`}
                >
                    <SlidersHorizontal className="w-3 h-3" /> Settings & Media
                </button>
                <button
                    onClick={() => setActiveLeftTab('scene3d')}
                    className={`flex-1 h-7 rounded text-xxs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        activeLeftTab === 'scene3d'
                            ? 'bg-editor-accent-purple/20 text-editor-accent-purple border border-editor-accent-purple/40 shadow-sm'
                            : 'text-editor-muted hover:text-editor-fg hover:bg-editor-surface'
                    }`}
                >
                    <Sparkles className="w-3 h-3" /> 3D Components
                </button>
            </div>

            <div className="flex-1 overflow-y-auto thin-scrollbar p-2 flex flex-col gap-2">

            {/* TAB 1: SETTINGS & MEDIA ASSETS */}
            {activeLeftTab === 'settings' && (
                <>
                    {/* Video Drumpad Launcher (10 Numpad Slots: 7,8,9 / 4,5,6 / 1,2,3 / 0) */}
                    <section className="rounded border border-editor-border bg-editor-surface overflow-hidden">
                        <button
                            onClick={() => setIsVideoPadsOpen(!isVideoPadsOpen)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xxs font-bold text-editor-muted uppercase tracking-wider hover:text-editor-fg transition-colors"
                        >
                            <div className="flex items-center gap-1.5">
                                <Grid className="w-3.5 h-3.5 text-editor-accent-purple" />
                                <span>Video Drumpads</span>
                            </div>
                            <span className="text-[9px] font-mono text-editor-accent-purple bg-black/40 px-1.5 py-0.5 rounded">Numpad [7..0]</span>
                        </button>

                        {isVideoPadsOpen && (
                            <div className="p-2 space-y-2 border-t border-editor-border">
                                <div className="grid grid-cols-3 gap-1.5">
                                    {videoPads.map((pad, idx) => {
                                        const isActive = activeVideoPadIdx === idx;
                                        const fileInputId = `pad-upload-${idx}`;

                                        const handlePadFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            cacheActiveVideo(file, file.name);
                                            setActiveVideoBlob(file);
                                            const url = await saveMediaFile(`video-pad-${idx}`, file);
                                            setVideoPad(idx, { name: file.name, url });
                                            setMp4Asset({ name: file.name, url });
                                            setActiveVideoPadIdx(idx);
                                        };

                                        const handlePadDrop = async (e: React.DragEvent) => {
                                            e.preventDefault();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm'))) {
                                                cacheActiveVideo(file, file.name);
                                                setActiveVideoBlob(file);
                                                const url = await saveMediaFile(`video-pad-${idx}`, file);
                                                setVideoPad(idx, { name: file.name, url });
                                                setMp4Asset({ name: file.name, url });
                                                setActiveVideoPadIdx(idx);
                                            }
                                        };

                                        const isWideZeroPad = pad.id === 0;

                                        return (
                                            <div
                                                key={pad.id}
                                                onClick={async () => {
                                                    setActiveVideoPadIdx(idx);
                                                    if (pad.url) useStore.getState().setVideoUrl(pad.url);
                                                    const padData = await getMediaDataUrl(`video-pad-${idx}`);
                                                    if (padData) {
                                                        const blob = dataUrlToBlob(padData);
                                                        await saveMediaFile('active-video', blob);
                                                        cacheActiveVideo(blob, pad.name || `pad-${idx}`);
                                                        setActiveVideoBlob(blob);
                                                    }
                                                }}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={handlePadDrop}
                                                className={`p-1.5 rounded border flex flex-col justify-between text-left cursor-pointer transition-all relative group/pad ${
                                                    isWideZeroPad ? 'col-span-3' : ''
                                                } ${
                                                    isActive
                                                        ? 'bg-editor-accent-purple/25 border-editor-accent-purple shadow-[0_0_10px_rgba(168,85,247,0.35)] text-editor-fg font-bold'
                                                        : 'bg-black/30 border-editor-border text-editor-muted hover:bg-editor-surface-hover hover:text-white'
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
                                                    <span className="text-[9px] font-bold font-mono px-1 rounded bg-black/60 text-editor-accent-purple">PAD {pad.id}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            document.getElementById(fileInputId)?.click();
                                                        }}
                                                        title="Assign Video File"
                                                        className="text-[9px] text-editor-muted hover:text-white bg-black/60 hover:bg-editor-accent-purple/50 px-1 rounded transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-[9px] font-medium truncate w-full flex items-center gap-1">
                                                    <Video className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                                    <span className="truncate">{pad.name || 'Drop Video'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Video Sync & Playback Controls */}
                    <section className="rounded border border-editor-border bg-editor-surface overflow-hidden">
                        <button
                            onClick={() => setIsVideoControlsOpen(!isVideoControlsOpen)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xxs font-bold text-editor-muted uppercase tracking-wider hover:text-editor-fg transition-colors"
                        >
                            <div className="flex items-center gap-1.5">
                                <Film className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Video Sync & Controls</span>
                            </div>
                            {isVideoControlsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>

                        {isVideoControlsOpen && (
                            <div className="p-2.5 space-y-2.5 border-t border-editor-border text-xxs">
                                {/* Sync Mode Selection */}
                                <div className="space-y-1">
                                    <span className="text-[9px] text-editor-muted uppercase tracking-wider font-bold">Video Sync Mode</span>
                                    <div className="grid grid-cols-3 gap-1">
                                        {(['fit', 'realtime', 'loop'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setVideoSyncMode(mode)}
                                                className={`py-1 rounded text-[9px] font-bold uppercase transition-all ${
                                                    videoSyncMode === mode
                                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                                        : 'bg-black/30 border border-editor-border text-editor-muted hover:text-white'
                                                }`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[8px] text-editor-muted leading-tight mt-1">
                                        {videoSyncMode === 'fit' && '• Fit: Stretches 0-100% of video over sequence duration'}
                                        {videoSyncMode === 'realtime' && '• Realtime: 1 sec timeline = 1 sec video playback'}
                                        {videoSyncMode === 'loop' && '• Loop: Plays at 1x speed, looping automatically'}
                                    </p>
                                </div>

                                {/* Speed Ratio Multiplier */}
                                <div className="space-y-1 pt-1 border-t border-editor-border">
                                    <div className="flex justify-between text-[9px]">
                                        <span className="text-editor-muted uppercase tracking-wider font-bold">Speed Ratio</span>
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
                                    <div className="flex justify-between text-[8px] text-editor-muted font-mono">
                                        <span>0.25x</span>
                                        <span className="cursor-pointer hover:text-white text-cyan-400 underline" onClick={() => setVideoSpeedRatio(1.0)}>Reset (1.0x)</span>
                                        <span>3.00x</span>
                                    </div>
                                </div>

                                {/* Remap Keyframe Ratio */}
                                <button
                                    onClick={() => {
                                        const ratioStr = prompt('Enter keyframe scale ratio (e.g. 0.8 to shrink keyframes by 20%, 1.25 to stretch by 25%):', '0.8');
                                        if (ratioStr) {
                                            const r = parseFloat(ratioStr);
                                            if (!isNaN(r) && r > 0) useStore.getState().remapKeyframesToRatio(r);
                                        }
                                    }}
                                    className="w-full py-1 text-[9px] bg-editor-accent-purple/20 hover:bg-editor-accent-purple border border-editor-accent-purple/40 text-editor-accent-purple hover:text-white rounded font-mono font-bold transition-all flex items-center justify-center gap-1"
                                >
                                    ⚡ Remap Keyframe Time Ratio
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Single Video Asset Upload & Frame Extractor */}
                    <section className="rounded border border-editor-border bg-editor-surface overflow-hidden">
                        <button
                            onClick={() => setIsFrameExtractorOpen(!isFrameExtractorOpen)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xxs font-bold text-editor-muted uppercase tracking-wider hover:text-editor-fg transition-colors"
                        >
                            <div className="flex items-center gap-1.5">
                                <Film className="w-3.5 h-3.5 text-editor-accent-teal" />
                                <span>Single Asset & Extractor</span>
                            </div>
                            {isFrameExtractorOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>

                        {isFrameExtractorOpen && (
                            <div className="p-2.5 space-y-2 border-t border-editor-border">
                                <input type="file" accept="video/*" ref={mp4InputRef} className="hidden" onChange={handleMp4Upload} />
                                <div className="flex items-center gap-2 bg-black/30 p-2 rounded border border-editor-border">
                                    <Film className="w-4 h-4 text-editor-accent-teal shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold truncate text-editor-fg">{mp4Asset?.name || 'No video selected'}</div>
                                        <div className="text-[9px] text-editor-muted">Active Master Asset</div>
                                    </div>
                                    <button
                                        onClick={() => mp4InputRef.current?.click()}
                                        className="px-2 py-1 bg-editor-surface border border-editor-border hover:bg-editor-surface-hover rounded text-[9px] text-editor-fg transition-colors"
                                    >
                                        Change
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleExtract()}
                                    disabled={extractionStatus === 'extracting'}
                                    className="w-full py-1.5 bg-editor-accent-teal/20 border border-editor-accent-teal/40 hover:bg-editor-accent-teal/40 text-editor-accent-teal rounded text-xxs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    <Film className="w-3 h-3" />
                                    {extractionStatus === 'extracting' ? `Extracting (${Math.round(extractionProgress * 100)}%)` : 'Extract Frames (FFmpeg)'}
                                </button>
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* TAB 2: 3D SCENE COMPONENTS & PRESETS */}
            {activeLeftTab === 'scene3d' && (
                <>
                    <section className="rounded border border-editor-border bg-editor-surface overflow-hidden">
                        <button
                            onClick={() => setIsParticleLabOpen(!isParticleLabOpen)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xxs font-bold text-editor-muted uppercase tracking-wider hover:text-editor-fg transition-colors"
                        >
                            <div className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-editor-accent-purple" />
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
                                                ? 'bg-editor-accent-purple/20 border border-editor-accent-purple/60 text-editor-fg font-bold'
                                                : 'bg-black/30 border border-editor-border text-editor-muted hover:bg-editor-surface-hover hover:text-white'
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
                    </section>

                    {/* Light Images Preset Assets */}
                    {activePreset === 'light-images' && (
                        <section className="rounded border border-editor-border bg-editor-surface p-2.5 space-y-2">
                            <div className="flex justify-between items-center text-xxs font-bold text-editor-muted uppercase tracking-wider">
                                <span>Light Images</span>
                                <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                            <input type="file" accept="image/*" multiple ref={lightImgInputRef} className="hidden" onChange={handleLightImageUpload} />
                            {lightImages.length === 0 ? (
                                <div className="rounded border border-editor-border bg-black/30 px-3 py-4 flex flex-col items-center gap-2 text-center">
                                    <ImageIcon className="w-6 h-6 text-editor-muted" />
                                    <p className="text-[9px] text-editor-muted leading-tight">No images uploaded</p>
                                    <button
                                        onClick={() => lightImgInputRef.current?.click()}
                                        className="mt-1 flex items-center gap-1 px-2.5 py-1 text-[9px] bg-editor-surface border border-editor-border text-editor-fg rounded hover:bg-editor-surface-hover transition-colors"
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
                                                    ? 'bg-editor-accent-purple/20 border-editor-accent-purple text-editor-fg font-bold'
                                                    : 'bg-black/30 border-editor-border text-editor-muted hover:bg-editor-surface-hover'
                                            }`}
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeLightImage(img.name); }}
                                                className="absolute top-1 right-1 p-0.5 rounded bg-black/60 hover:bg-red-500/80 text-white transition-colors"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>                                            <img src={img.url} alt={img.name} className="w-full h-12 object-cover rounded mb-1 bg-black/40" />
                                            <span className="text-[8px] truncate w-full text-center">{img.name}</span>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => lightImgInputRef.current?.click()}
                                        className="p-1.5 rounded border border-dashed border-editor-border bg-black/20 hover:bg-black/40 flex flex-col items-center justify-center gap-1 text-editor-muted hover:text-white transition-colors h-20"
                                    >
                                        <UploadCloud className="w-4 h-4" />
                                        <span className="text-[8px]">Add Image</span>
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
