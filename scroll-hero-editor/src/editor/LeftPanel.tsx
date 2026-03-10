import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronRight, UploadCloud, Video, Film } from 'lucide-react';
import { extractFrames } from '../packages/ffmpegExtractor';

export default function LeftPanel() {
    const [isPresetsOpen, setIsPresetsOpen] = useState(true);
    const [isAssetsOpen, setIsAssetsOpen] = useState(true);

    const activePreset = useStore(state => state.activePreset);
    const setActivePreset = useStore(state => state.setActivePreset);
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

    const handleExtract = async () => {
        const file = mp4InputRef.current?.files?.[0];
        if (!file) return;
        setExtractionStatus('extracting');
        setExtractionProgress(0);
        try {
            const frames = await extractFrames(file, (p) => setExtractionProgress(p));
            setExtractedFrames(frames);
            setExtractionStatus('done');
        } catch (err) {
            console.error('ffmpeg extraction failed:', err);
            setExtractionStatus('error');
        }
    };

    return (
        <aside className="w-[220px] flex flex-col border-r border-editor-border bg-black/20 p-2 gap-2 overflow-y-auto thin-scrollbar">
            {/* Presets */}
            <section>
                <button
                    onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                    className="w-full flex justify-between items-center py-1 px-2 text-xxs font-bold text-gray-400 uppercase tracking-tighter mb-1 hover:text-white"
                >
                    Presets {isPresetsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {isPresetsOpen && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {(['orbit', 'classic'] as const).map((preset) => (
                            <button
                                key={preset}
                                onClick={() => setActivePreset(preset)}
                                className={`aspect-video rounded border cursor-pointer flex flex-col items-center justify-center text-xxs transition-colors ${
                                    activePreset === preset
                                        ? 'bg-editor-accent-purple/10 border-editor-accent-purple/70'
                                        : 'bg-white/5 border-white/10 hover:border-editor-accent-purple/50'
                                }`}
                            >
                                <span className="capitalize">{preset}</span>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {/* Assets */}
            <section>
                <button
                    onClick={() => setIsAssetsOpen(!isAssetsOpen)}
                    className="w-full flex justify-between items-center py-1 px-2 text-xxs font-bold text-gray-400 uppercase tracking-tighter mb-1 hover:text-white"
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
                                className="flex-1 flex items-center justify-center gap-1 p-1 glass-panel text-xxs text-gray-300 hover:bg-white/10 border border-dashed border-white/20">
                                <UploadCloud className="w-3 h-3" /> MP4
                            </button>
                            <button onClick={() => document.getElementById('audio-upload')?.click()}
                                className="flex-1 flex items-center justify-center gap-1 p-1 glass-panel text-xxs text-gray-300 hover:bg-white/10 border border-dashed border-white/20">
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
                                    <span className="truncate text-xxs text-gray-300 flex-1">{mp4Asset.name}</span>
                                </div>

                                {/* Extraction progress */}
                                {extractionStatus === 'extracting' && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-gray-500">
                                            <span className="animate-pulse">Extracting frames…</span>
                                            <span>{Math.round(extractionProgress * 100)}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
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
                                        <button onClick={handleExtract}
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
                                                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
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
        </aside>
    );
}
