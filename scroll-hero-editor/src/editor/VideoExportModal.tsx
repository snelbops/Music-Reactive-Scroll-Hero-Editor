import { useState } from 'react';
import { X, Film, Download, StopCircle, Smartphone, Monitor, Square, Sparkles, Terminal, Play, CheckCircle, Repeat, Clock, FlipHorizontal } from 'lucide-react';
import { videoExporter } from '../export/exportVideo';
import { useStore } from '../store/useStore';
import { getMediaDataUrl, blobToDataUrl } from '../utils/mediaStore';
import { getCachedActiveVideo } from '../utils/videoCache';

interface VideoExportModalProps {
    onClose: () => void;
}

export default function VideoExportModal({ onClose }: VideoExportModalProps) {
    const activeRatio = useStore(s => s.aspectRatio);
    const activePreset = useStore(s => s.activePreset);
    const sequenceDuration = useStore(s => s.sequenceDuration);
    const loopStart = useStore(s => s.loopStart);
    const loopEnd = useStore(s => s.loopEnd);
    const isLoopActive = useStore(s => s.isLoop);
    const activeVideoPadIdx = useStore(s => s.activeVideoPadIdx);

    const [exportRange, setExportRange] = useState<'full' | 'loop'>(isLoopActive ? 'loop' : 'full');
    const [exportRatio, setExportRatio] = useState<string>(activeRatio || '16:9');
    const [includeParticles, setIncludeParticles] = useState<boolean>(activePreset !== 'video');
    const [mirrorVideo, setMirrorVideo] = useState<boolean>(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isRemotionExporting, setIsRemotionExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'browser' | 'remotion'>('remotion');

    const audioUrl = useStore(s => s.audioUrl);
    const videoUrl = useStore(s => s.videoUrl);
    const activeVideoBlob = useStore(s => s.activeVideoBlob);

    const targetStart = exportRange === 'loop' ? loopStart : 0;
    const targetEnd = exportRange === 'loop' ? (loopEnd || sequenceDuration) : sequenceDuration;
    const targetDuration = targetEnd - targetStart;

    const handleStartBrowserExport = () => {
        setIsExporting(true);
        setProgress(0);
        setStatusMessage(`Starting render for ${exportRange === 'loop' ? 'Selected Loop Range' : 'Full Sequence'} (${targetStart.toFixed(1)}s — ${targetEnd.toFixed(1)}s)…`);

        videoExporter.startExport({
            fps: 60,
            format: 'mp4',
            mode: 'realtime',
            aspectRatio: exportRatio,
            includeParticles,
            onProgress: (p) => {
                setProgress(p);
            },
            onComplete: () => {
                setIsExporting(false);
                setStatusMessage('Export complete! Full video file downloaded to your Downloads folder.');
            },
            onError: (err) => {
                setIsExporting(false);
                setStatusMessage(`Export error: ${err.message}`);
            },
        });
    };

    const handleStartRemotionExport = async () => {
        setIsRemotionExporting(true);
        setStatusMessage(`Preparing active video & rendering 60 FPS MP4 via Remotion (${exportRange === 'loop' ? 'Loop Range' : 'Full Sequence'} ${targetStart.toFixed(1)}s — ${targetEnd.toFixed(1)}s)…`);

        try {
            let width = 1920;
            let height = 1080;
            if (exportRatio === '9:16') { width = 1080; height = 1920; }
            else if (exportRatio === '1:1') { width = 1080; height = 1080; }

            const fps = 60;
            const startFrame = Math.round(targetStart * fps);
            const durationInFrames = Math.round(targetDuration * fps);

            // Priority 5-Step Video Finder (Always favors CURRENT active video)
            let videoBase64: string | null = null;

            // Priority 0 (MOST RELIABLE): Zustand activeVideoBlob — set directly from File object on upload/pad-switch
            // This is the exact File the user last uploaded or selected, never a revoked blob URL.
            const storeBlob = activeVideoBlob;
            if (storeBlob) {
                videoBase64 = await blobToDataUrl(storeBlob);
            }

            // Priority 1 (fallback): in-memory module-level cache
            if (!videoBase64) {
                const cachedBlob = getCachedActiveVideo();
                if (cachedBlob) {
                    videoBase64 = await blobToDataUrl(cachedBlob);
                }
            }
            if (!videoBase64 && activeVideoPadIdx !== undefined && activeVideoPadIdx !== null) {
                videoBase64 = await getMediaDataUrl(`video-pad-${activeVideoPadIdx}`);
            }

            // Priority 2: Current active video element playing in live Viewport DOM
            if (!videoBase64) {
                const container = document.querySelector('div[data-purpose="viewport-container"]') as HTMLElement | null;
                const activeVideoEl = container?.querySelector('video') as HTMLVideoElement | null;
                if (activeVideoEl && activeVideoEl.src) {
                    try {
                        const r = await fetch(activeVideoEl.src);
                        if (r.ok) {
                            const b = await r.blob();
                            videoBase64 = await blobToDataUrl(b);
                        }
                    } catch (e) {}
                }
            }

            // Priority 3: Current active videoUrl from Zustand store
            if (!videoBase64 && videoUrl) {
                try {
                    const r = await fetch(videoUrl);
                    if (r.ok) {
                        const b = await r.blob();
                        videoBase64 = await blobToDataUrl(b);
                    }
                } catch (e) {}
            }

            // Priority 4: IndexedDB active-video single key
            if (!videoBase64) {
                videoBase64 = await getMediaDataUrl('active-video');
            }

            // Priority 5: Fallback search across video pad slots 0 to 5
            if (!videoBase64) {
                for (let i = 0; i <= 5; i++) {
                    const padData = await getMediaDataUrl(`video-pad-${i}`);
                    if (padData) {
                        videoBase64 = padData;
                        break;
                    }
                }
            }

            // Priority 2-Step Audio Finder
            let audioBase64: string | null = null;

            // Priority 1: audioUrl from Zustand store
            if (audioUrl) {
                try {
                    const r = await fetch(audioUrl);
                    if (r.ok) {
                        const b = await r.blob();
                        audioBase64 = await blobToDataUrl(b);
                    }
                } catch (e) {}
            }

            // Priority 2: IndexedDB active-audio key
            if (!audioBase64) {
                audioBase64 = await getMediaDataUrl('active-audio');
            }

            const res = await fetch('/api/export-remotion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fps,
                    width,
                    height,
                    startFrame,
                    durationInFrames,
                    videoBase64,
                    audioBase64,
                    inputProps: {
                        videoUrl: videoUrl && !videoUrl.startsWith('blob:') ? videoUrl : undefined,
                        audioUrl: audioUrl && !audioUrl.startsWith('blob:') ? audioUrl : undefined,
                        startFrame,
                        mirrorVideo,
                    },
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Remotion server export failed');
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scroll-hero-${exportRange === 'loop' ? 'loop' : 'full'}-60fps-${Date.now()}.mp4`;
            a.click();
            URL.revokeObjectURL(url);

            setIsRemotionExporting(false);
            setStatusMessage('Remotion MP4 video export complete! File downloaded to Downloads folder.');
        } catch (err: any) {
            setIsRemotionExporting(false);
            setStatusMessage(`Remotion Export Error: ${err.message}`);
        }
    };

    const handleCancelExport = () => {
        videoExporter.cancelExport();
        setIsExporting(false);
        setIsRemotionExporting(false);
        setStatusMessage('Export cancelled.');
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-editor-fg font-sans">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2c2c2e] bg-[#252527]">
                    <div className="flex items-center gap-2">
                        <Film className="w-5 h-5 text-editor-accent-purple" />
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-wide">Export Animation to Video</h3>
                            <p className="text-[11px] text-gray-400">Export Full Sequence or Selected Loop Region</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (isExporting || isRemotionExporting) handleCancelExport();
                            onClose();
                        }}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Export Mode Tabs */}
                <div className="flex border-b border-[#2c2c2e] bg-[#1e1e20]">
                    <button
                        onClick={() => setActiveTab('remotion')}
                        className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                            activeTab === 'remotion' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Terminal className="w-3.5 h-3.5" /> 🎬 Remotion 60 FPS Export
                    </button>
                    <button
                        onClick={() => setActiveTab('browser')}
                        className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                            activeTab === 'browser' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Play className="w-3.5 h-3.5" /> Direct Canvas Recorder
                    </button>
                </div>

                {/* Body Options */}
                <div className="p-5 space-y-4 text-xs">
                    {/* Time Range Selector: Selected Loop vs Full Video */}
                    <div className="space-y-1.5">
                        <label className="text-gray-300 font-semibold block flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" /> Export Time Range:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setExportRange('loop')}
                                disabled={isExporting || isRemotionExporting}
                                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                                    exportRange === 'loop'
                                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                        : 'bg-[#252527] border-[#3a3a3c] text-gray-400 hover:bg-[#2c2c2e]'
                                }`}
                            >
                                <div className="flex items-center gap-1 text-xs">
                                    <Repeat className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Selected Loop Range</span>
                                </div>
                                <span className="text-[10px] font-mono text-cyan-200">
                                    {loopStart.toFixed(1)}s — {(loopEnd || sequenceDuration).toFixed(1)}s ({targetDuration.toFixed(1)}s clip)
                                </span>
                            </button>

                            <button
                                onClick={() => setExportRange('full')}
                                disabled={isExporting || isRemotionExporting}
                                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                                    exportRange === 'full'
                                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                        : 'bg-[#252527] border-[#3a3a3c] text-gray-400 hover:bg-[#2c2c2e]'
                                }`}
                            >
                                <div className="flex items-center gap-1 text-xs">
                                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Full Video Sequence</span>
                                </div>
                                <span className="text-[10px] font-mono text-purple-200">
                                    0.0s — {sequenceDuration.toFixed(1)}s (Full {sequenceDuration.toFixed(1)}s)
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Aspect Ratio Selector */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-gray-300 font-semibold block">Export Resolution & Device Format:</label>
                            <span className="text-[10px] text-cyan-400 font-mono font-bold">
                                Active: {activeRatio}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                onClick={() => setExportRatio('9:16')}
                                disabled={isExporting || isRemotionExporting}
                                className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-colors ${
                                    exportRatio === '9:16'
                                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                                        : 'bg-[#252527] border-[#3a3a3c] text-gray-400 hover:bg-[#2c2c2e]'
                                }`}
                            >
                                <Smartphone className="w-4 h-4 text-cyan-400" />
                                <span className="text-[10px]">9:16 Reel</span>
                                <span className="text-[8px] font-mono text-gray-400">1080x1920</span>
                            </button>
                            <button
                                onClick={() => setExportRatio('1:1')}
                                disabled={isExporting || isRemotionExporting}
                                className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-colors ${
                                    exportRatio === '1:1'
                                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                                        : 'bg-[#252527] border-[#3a3a3c] text-gray-400 hover:bg-[#2c2c2e]'
                                }`}
                            >
                                <Square className="w-4 h-4 text-purple-400" />
                                <span className="text-[10px]">1:1 Square</span>
                                <span className="text-[8px] font-mono text-gray-400">1080x1080</span>
                            </button>
                            <button
                                onClick={() => setExportRatio('16:9')}
                                disabled={isExporting || isRemotionExporting}
                                className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-colors ${
                                    exportRatio === '16:9'
                                        ? 'bg-blue-500/20 border-blue-400 text-blue-300 font-bold'
                                        : 'bg-[#252527] border-[#3a3a3c] text-gray-400 hover:bg-[#2c2c2e]'
                                }`}
                            >
                                <Monitor className="w-4 h-4 text-blue-400" />
                                <span className="text-[10px]">16:9 Widescreen</span>
                                <span className="text-[8px] font-mono text-gray-400">1920x1080</span>
                            </button>
                        </div>
                    </div>

                    {/* Mirror & Particle Toggles */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-lg bg-[#252527] border border-[#3a3a3c] flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-gray-300 font-semibold text-[11px]">Mirror Video:</span>
                            </div>
                            <button
                                onClick={() => setMirrorVideo(!mirrorVideo)}
                                disabled={isExporting || isRemotionExporting}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                                    mirrorVideo
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {mirrorVideo ? '🪞 Flipped' : 'Normal'}
                            </button>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#252527] border border-[#3a3a3c] flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-gray-300 font-semibold text-[11px]">Particles:</span>
                            </div>
                            <button
                                onClick={() => setIncludeParticles(!includeParticles)}
                                disabled={isExporting || isRemotionExporting}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                                    includeParticles
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {includeParticles ? '✨ ON' : '🚫 Clean'}
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar & Status */}
                    {(isExporting || isRemotionExporting) && (
                        <div className="space-y-2 p-3 rounded-lg bg-black/40 border border-cyan-500/30 font-mono text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-cyan-400 font-bold">⚡ Rendering {exportRange === 'loop' ? 'Selected Loop' : 'Full Video'}…</span>
                                <span className="text-white font-bold">{targetDuration.toFixed(1)}s sequence</span>
                            </div>
                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-75" style={{ width: `${progress * 100}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {statusMessage && (
                    <div className="px-5 pb-3">
                        <div className="p-2.5 rounded-lg bg-editor-accent-purple/10 border border-editor-accent-purple/30 text-editor-accent-purple text-[11px] flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 shrink-0 text-cyan-400" />
                            <span>{statusMessage}</span>
                        </div>
                    </div>
                )}

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#2c2c2e] bg-[#252527]">
                    <button
                        onClick={onClose}
                        disabled={isExporting || isRemotionExporting}
                        className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        Close
                    </button>

                    {activeTab === 'browser' ? (
                        !isExporting ? (
                            <button
                                onClick={handleStartBrowserExport}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-lg transition-all flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" /> Start Direct Render
                            </button>
                        ) : (
                            <button
                                onClick={handleCancelExport}
                                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow-lg transition-all flex items-center gap-1.5"
                            >
                                <StopCircle className="w-3.5 h-3.5" /> Cancel Render
                            </button>
                        )
                    ) : (
                        !isRemotionExporting ? (
                            <button
                                onClick={handleStartRemotionExport}
                                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-lg transition-all flex items-center gap-1.5"
                            >
                                <Film className="w-3.5 h-3.5" /> 🎬 Render Remotion MP4
                            </button>
                        ) : (
                            <button
                                onClick={handleCancelExport}
                                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow-lg transition-all flex items-center gap-1.5"
                            >
                                <StopCircle className="w-3.5 h-3.5" /> Cancel Render
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
