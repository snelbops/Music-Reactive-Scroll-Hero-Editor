import { useState } from 'react';
import { X, Film, Download, StopCircle, Smartphone, Monitor, Square, Sparkles, Terminal, Play } from 'lucide-react';
import { videoExporter } from '../export/exportVideo';
import { useStore } from '../store/useStore';

interface VideoExportModalProps {
    onClose: () => void;
}

export default function VideoExportModal({ onClose }: VideoExportModalProps) {
    const activeRatio = useStore(s => s.aspectRatio);
    const activePreset = useStore(s => s.activePreset);

    const [exportRatio, setExportRatio] = useState<string>(activeRatio || '16:9');
    const [includeParticles, setIncludeParticles] = useState<boolean>(activePreset !== 'video');
    const [fps] = useState<30 | 60>(60);
    const [format] = useState<'webm' | 'mp4'>('mp4');
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'browser' | 'remotion'>('browser');

    const sequenceDuration = useStore(s => s.sequenceDuration);

    const handleStartExport = () => {
        setIsExporting(true);
        setProgress(0);
        setCurrentTime(0);
        setStatusMessage('Starting synchronized video render…');

        videoExporter.startExport({
            fps,
            format,
            mode: 'realtime',
            aspectRatio: exportRatio,
            includeParticles,
            onProgress: (p, time) => {
                setProgress(p);
                setCurrentTime(time);
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

    const handleCancelExport = () => {
        videoExporter.cancelExport();
        setIsExporting(false);
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
                            <p className="text-[11px] text-gray-400">Browser MediaRecorder & Remotion / FFmpeg Video Exporters</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (isExporting) handleCancelExport();
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
                        onClick={() => setActiveTab('browser')}
                        className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                            activeTab === 'browser' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Play className="w-3.5 h-3.5" /> In-Browser Recorder
                    </button>
                    <button
                        onClick={() => setActiveTab('remotion')}
                        className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                            activeTab === 'remotion' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Terminal className="w-3.5 h-3.5" /> Remotion + FFmpeg
                    </button>
                </div>

                {/* Body Options */}
                {activeTab === 'browser' ? (
                    <div className="p-5 space-y-4 text-xs">
                        {/* Resolution / Device Format Selector */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-gray-300 font-semibold block">Export Resolution & Format:</label>
                                <span className="text-[10px] text-cyan-400 font-mono font-bold">
                                    Active: {activeRatio}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                <button
                                    onClick={() => setExportRatio('9:16')}
                                    disabled={isExporting}
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
                                    disabled={isExporting}
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
                                    disabled={isExporting}
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

                        {/* Particle Layer Toggle */}
                        <div className="p-2.5 rounded-lg bg-[#252527] border border-[#3a3a3c] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span className="text-gray-300 font-semibold">Include 3D Particle Overlay:</span>
                            </div>
                            <button
                                onClick={() => setIncludeParticles(!includeParticles)}
                                disabled={isExporting}
                                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                    includeParticles
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {includeParticles ? '✨ Particles ON' : '🚫 Clean Video'}
                            </button>
                        </div>

                        {/* Progress Bar & Status */}
                        {isExporting && (
                            <div className="space-y-2 p-3 rounded-lg bg-black/40 border border-cyan-500/30">
                                <div className="flex justify-between text-[11px] font-mono">
                                    <span className="text-cyan-400 font-bold">⚡ Rendering Video Sequence…</span>
                                    <span className="text-white font-bold">{currentTime.toFixed(1)}s / {sequenceDuration.toFixed(1)}s ({Math.round(progress * 100)}%)</span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-75" style={{ width: `${progress * 100}%` }} />
                                </div>
                            </div>
                        )}

                        {statusMessage && !isExporting && (
                            <div className="p-2.5 rounded-lg bg-editor-accent-purple/10 border border-editor-accent-purple/30 text-editor-accent-purple text-[11px]">
                                {statusMessage}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-5 space-y-3 text-xs">
                        <div className="p-3 rounded-lg bg-[#252527] border border-cyan-500/30 space-y-2">
                            <div className="flex items-center gap-2 text-cyan-300 font-bold">
                                <Terminal className="w-4 h-4" />
                                <span>Remotion + FFmpeg Headless Renderer</span>
                            </div>
                            <p className="text-[11px] text-gray-300 leading-relaxed">
                                Remotion uses Headless Chrome + FFmpeg to render your animation into a 100% butter-smooth 60 FPS MP4 video file with zero frame drops.
                            </p>
                        </div>

                        <div className="space-y-1 bg-black/50 p-3 rounded-lg border border-[#3a3a3c] font-mono text-[11px]">
                            <span className="text-gray-400 block text-[9px] uppercase font-bold">1. Render MP4 Video via CLI:</span>
                            <code className="text-cyan-300 select-all block bg-[#1c1c1e] p-1.5 rounded border border-white/10">
                                npm run render-video
                            </code>
                        </div>

                        <div className="space-y-1 bg-black/50 p-3 rounded-lg border border-[#3a3a3c] font-mono text-[11px]">
                            <span className="text-gray-400 block text-[9px] uppercase font-bold">2. Open Remotion Studio GUI Preview:</span>
                            <code className="text-purple-300 select-all block bg-[#1c1c1e] p-1.5 rounded border border-white/10">
                                npm run preview-remotion
                            </code>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-400">
                            💡 Remotion renders your React composition frame-by-frame on headless Chrome, producing pixel-perfect MP4 videos.
                        </div>
                    </div>
                )}

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#2c2c2e] bg-[#252527]">
                    <button
                        onClick={onClose}
                        disabled={isExporting}
                        className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                    {activeTab === 'browser' && (!isExporting ? (
                        <button
                            onClick={handleStartExport}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-lg transition-all flex items-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" /> Start Video Render
                        </button>
                    ) : (
                        <button
                            onClick={handleCancelExport}
                            className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow-lg transition-all flex items-center gap-1.5"
                        >
                            <StopCircle className="w-3.5 h-3.5" /> Cancel Render
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
