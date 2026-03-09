import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronRight, UploadCloud, Video, Image } from 'lucide-react';

export default function LeftPanel() {
    const [isPresetsOpen, setIsPresetsOpen] = useState(true);
    const [isAssetsOpen, setIsAssetsOpen] = useState(true);
    const [isLayersOpen, setIsLayersOpen] = useState(true);

    const setVideoUrl = useStore(state => state.setVideoUrl);
    const activePreset = useStore(state => state.activePreset);
    const setActivePreset = useStore(state => state.setActivePreset);
    const [importedVideoName, setImportedVideoName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        setImportedVideoName(file.name);
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
                    <div className="space-y-1">
                        <input
                            type="file"
                            accept="video/mp4,video/webm"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImportVideo}
                        />
                        <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            id="audio-upload"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                useStore.getState().setAudioUrl(URL.createObjectURL(file));
                            }}
                        />
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-1 p-1 glass-panel text-xxs text-gray-300 hover:bg-white/10 hover:text-white transition-colors border border-dashed border-white/20"
                            >
                                <UploadCloud className="w-3 h-3" /> MP4
                            </button>
                            <button
                                onClick={() => document.getElementById('audio-upload')?.click()}
                                className="flex-1 flex items-center justify-center gap-1 p-1 glass-panel text-xxs text-gray-300 hover:bg-white/10 hover:text-white transition-colors border border-dashed border-white/20"
                            >
                                <UploadCloud className="w-3 h-3" /> Audio
                            </button>
                        </div>

                        <div className="flex items-center gap-2 p-1.5 glass-panel text-xxs hover:bg-white/5 cursor-grab">
                            <div className="w-6 h-6 bg-editor-accent-blue/20 rounded flex items-center justify-center text-editor-accent-blue">
                                <Video className="w-3 h-3" />
                            </div>
                            <span className="truncate">{importedVideoName || "goldengate.mp4"}</span>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 glass-panel text-xxs hover:bg-white/5 cursor-grab opacity-50">
                            <div className="w-6 h-6 bg-editor-accent-teal/20 rounded flex items-center justify-center text-editor-accent-teal">
                                <Image className="w-3 h-3" />
                            </div>
                            <span className="truncate">hero_title_mask.png</span>
                        </div>
                    </div>
                )}
            </section>

            {/* Layers */}
            <section className="flex-1 mt-2">
                <button
                    onClick={() => setIsLayersOpen(!isLayersOpen)}
                    className="w-full flex justify-between items-center py-1 px-2 text-xxs font-bold text-gray-400 uppercase tracking-tighter mb-1 hover:text-white"
                >
                    Layers {isLayersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {isLayersOpen && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 p-2 rounded bg-editor-accent-purple/10 border border-editor-accent-purple/30 text-xs">
                            <span className="w-2 h-2 rounded-full bg-editor-accent-purple"></span>
                            <span>Hero Text Mesh</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded hover:bg-white/5 text-xs text-gray-500">
                            <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                            <span>Particles Group</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded hover:bg-white/5 text-xs text-gray-500">
                            <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                            <span>Camera Path</span>
                        </div>
                    </div>
                )}
            </section>
        </aside>
    );
}
