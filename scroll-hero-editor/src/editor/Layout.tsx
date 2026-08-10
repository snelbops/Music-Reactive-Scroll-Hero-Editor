
import { useEffect, useState, useCallback, useRef } from 'react';
import { Minimize2, Film } from 'lucide-react';
import studio from '@theatre/studio';
import LeftPanel from './LeftPanel';
import Inspector from './Inspector';
import Timeline from './Timeline';
import Viewport from '../preview/Viewport';
import HelpPanel from './HelpPanel';
import ProjectModal from './ProjectModal';
import VideoExportModal from './VideoExportModal';
import { useStore } from '../store/useStore';
import { exportParticleHeroHtml, exportFrameSequenceHeroHtml, exportCurvesJson, exportLoopRegionJson } from '../export/exportHtml';
import { saveProject, loadProject, loadWorkingProject, autoSaveWorkingProject, startNewProject } from '../utils/project';

export default function Layout() {
    const isDarkMode = useStore(state => state.isDarkMode);
    const isFullscreen = useStore(state => state.isFullscreen);
    const setIsFullscreen = useStore(state => state.setIsFullscreen);
    const activePreset = useStore(state => state.activePreset);
    const mp4Asset = useStore(state => state.mp4Asset);
    const extractionStatus = useStore(state => state.extractionStatus);
    const loopStart = useStore(state => state.loopStart);
    const loopEnd = useStore(state => state.loopEnd);
    const isLoop = useStore(state => state.isLoop);
    const audioUrl = useStore(state => state.audioUrl);

    const [isExportingHtml, setIsExportingHtml] = useState(false);
    const [isExportingLoop, setIsExportingLoop] = useState(false);
    const [showExportLoopModal, setShowExportLoopModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showVideoExportModal, setShowVideoExportModal] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const loadInputRef = useRef<HTMLInputElement>(null);
    const [timelineH, setTimelineH] = useState(280);
    const [leftW, setLeftW] = useState(220);
    const [rightW, setRightW] = useState(240);

    const startDrag = useCallback((
        e: React.PointerEvent<HTMLDivElement>,
        setter: (v: number) => void,
        current: number,
        min: number,
        max: number,
        axis: 'x' | 'y',
        sign: 1 | -1,
    ) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const start = axis === 'x' ? e.clientX : e.clientY;
        const onMove = (ev: PointerEvent) => {
            const delta = (axis === 'x' ? ev.clientX : ev.clientY) - start;
            setter(Math.max(min, Math.min(max, current + sign * delta)));
        };
        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }, []);

    const handleExportLoop = async (withAudio: boolean) => {
        if (isExportingLoop) return;
        setShowExportLoopModal(false);
        setIsExportingLoop(true);
        try {
            await exportLoopRegionJson(withAudio);
        } finally {
            setIsExportingLoop(false);
        }
    };

    const handleExportJson = () => {
        const state = studio.createContentOfSaveFile('Scroll Hero Editor');
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'curves.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportHtml = async () => {
        if (isExportingHtml) return;
        setIsExportingHtml(true);
        try {
            if (activePreset === 'frames' && mp4Asset && extractionStatus === 'done') {
                await exportFrameSequenceHeroHtml(mp4Asset.url, mp4Asset.name);
            } else {
                exportParticleHeroHtml();
            }
        } finally {
            setIsExportingHtml(false);
        }
    };

    useEffect(() => {
        // Restore last working project session from localStorage on initial load
        loadWorkingProject();
        // Auto-save session to localStorage on store mutations
        const unsub = useStore.subscribe(() => {
            autoSaveWorkingProject();
        });
        // Explicitly auto-save right before page reload/close
        const handleBeforeUnload = () => {
            autoSaveWorkingProject();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            unsub();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    useEffect(() => {
        // Apply dark class to root element
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            const mod = isMac ? e.metaKey : e.ctrlKey;

            if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);

            if (e.key === ' ' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
                useStore.getState().setIsPlaying(!useStore.getState().isPlaying);
            }

            // Undo: Cmd+Z / Ctrl+Z
            if (mod && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                useStore.getState().undo();
            }

            // Redo: Cmd+Shift+Z / Ctrl+Shift+Z  (also Ctrl+Y on Windows)
            if ((mod && e.key === 'z' && e.shiftKey) || (mod && e.key === 'y' && !isMac)) {
                e.preventDefault();
                useStore.getState().redo();
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isFullscreen, setIsFullscreen]);


    const [showExportMenu, setShowExportMenu] = useState(false);

    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-[9999] bg-editor-bg flex">
                <Viewport />
                <button
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-3 right-3 z-[10000] p-1.5 glass-panel hover:bg-editor-surface-hover opacity-50 hover:opacity-100 transition-opacity"
                    title="Exit fullscreen (Esc)"
                >
                    <Minimize2 className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full bg-editor-bg text-editor-fg overflow-hidden font-sans select-none text-sm">
            <header className="h-9 border-b border-[#23272c] bg-[#121417] text-[#9aa1a8] flex items-center px-3 justify-between text-[11px] font-medium shrink-0 font-sans select-none gap-3 z-40">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-xs text-[#e2e5e8] tracking-tight">Scroll Hero</span>
                    <span className="w-[1px] h-4 bg-[#23272c]" />
                    <div className="flex items-center gap-2 px-2 py-0.5 border border-[#23272c] rounded bg-[#171a1e] text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6e9c73]" />
                        <span className="font-medium text-[#c3c8cd]">{mp4Asset?.name ?? 'anteddai_Young_Max'}</span>
                        <span className="font-mono text-[10px] text-[#6b7278]">saved</span>
                    </div>
                </div>

                {/* Mode Switcher */}
                <div className="flex gap-0.5 p-0.5 bg-[#171a1e] border border-[#23272c] rounded">
                    <button className="px-2.5 py-0.5 rounded bg-[#23272c] font-medium text-[11px] text-[#e2e5e8]">Design</button>
                    <button className="px-2.5 py-0.5 rounded font-medium text-[11px] text-[#7d848c] hover:text-[#e2e5e8]">Deliver</button>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-3 relative">
                    <button onClick={() => saveProject()} className="hover:text-[#e2e5e8] transition-colors" title="Quick export .shero file">File</button>
                    <button onClick={() => setShowProjectModal(true)} className="hover:text-[#e2e5e8] transition-colors">Projects</button>

                    {/* Primary Export Button + Dropdown */}
                    <div className="relative flex items-stretch border border-[#a4713c] rounded overflow-hidden shadow-sm">
                        <button
                            onClick={() => setShowVideoExportModal(true)}
                            className="px-2.5 py-1 bg-[#c98a4d] hover:bg-[#d49658] font-semibold text-[11px] text-[#17120c] transition-colors flex items-center gap-1.5"
                            title="Render video animation to WebM or MP4"
                        >
                            <Film className="w-3 h-3 text-[#17120c]" /> Export video
                        </button>
                        <button
                            onClick={() => setShowExportMenu(v => !v)}
                            className="px-1.5 py-1 bg-[#b57c43] hover:bg-[#c4874c] font-mono text-[9px] text-[#17120c] border-l border-[#a4713c] transition-colors"
                        >
                            ▾
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#15181b] border border-[#23272c] rounded-md shadow-2xl py-1 z-50 text-[11px] font-sans">
                                <button onClick={() => { setShowExportMenu(false); handleExportJson(); }} className="w-full text-left px-3 py-1.5 hover:bg-[#23272c] text-[#dfe3e7]">Export JSON</button>
                                <button onClick={() => { setShowExportMenu(false); exportCurvesJson(); }} className="w-full text-left px-3 py-1.5 hover:bg-[#23272c] text-[#dfe3e7]">Export Curves</button>
                                <button onClick={() => { setShowExportMenu(false); isLoop && setShowExportLoopModal(true); }} className={`w-full text-left px-3 py-1.5 hover:bg-[#23272c] ${isLoop ? 'text-[#dfe3e7]' : 'text-gray-500 cursor-not-allowed'}`}>Export Loop Region</button>
                                <button onClick={() => { setShowExportMenu(false); handleExportHtml(); }} className="w-full text-left px-3 py-1.5 hover:bg-[#23272c] text-[#dfe3e7]">Export Standalone HTML</button>
                                <div className="my-1 border-t border-[#23272c]" />
                                <button onClick={() => { setShowExportMenu(false); if (confirm('Start a new project? Any unsaved changes in current project will be cleared.')) startNewProject(); }} className="w-full text-left px-3 py-1.5 hover:bg-[#23272c] text-[#dfe3e7]">New Project</button>
                                <button onClick={() => { setShowExportMenu(false); loadInputRef.current?.click(); }} className="w-full text-left px-3 py-1.5 hover:bg-[#23272c] text-[#dfe3e7]">Load File (.shero)</button>
                            </div>
                        )}
                    </div>

                    <span className="w-[1px] h-4 bg-[#23272c]" />
                    <button
                        onClick={() => setShowHelp(true)}
                        className="font-mono text-[#6b7278] hover:text-[#e2e5e8] text-[11px]"
                        title="Keyboard shortcuts & help"
                    >
                        ?
                    </button>
                </div>
            </header>
            <input
                ref={loadInputRef}
                type="file"
                accept=".shero,application/json"
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try { await loadProject(file); }
                    catch (err) { alert('Failed to load project file.'); }
                    e.target.value = '';
                }}
            />

            <div className="flex flex-1 overflow-hidden">
                <LeftPanel width={leftW} />
                <div
                    className="w-1 shrink-0 cursor-col-resize bg-editor-border hover:bg-editor-accent-purple/60 active:bg-editor-accent-purple transition-colors"
                    onPointerDown={(e) => startDrag(e, setLeftW, leftW, 120, 420, 'x', 1)}
                />
                <Viewport />
                <div
                    className="w-1 shrink-0 cursor-col-resize bg-editor-border hover:bg-editor-accent-purple/60 active:bg-editor-accent-purple transition-colors"
                    onPointerDown={(e) => startDrag(e, setRightW, rightW, 120, 420, 'x', -1)}
                />
                <Inspector width={rightW} />
            </div>

            <div
                className="h-1 shrink-0 cursor-row-resize bg-editor-border hover:bg-editor-accent-purple/60 active:bg-editor-accent-purple transition-colors"
                onPointerDown={(e) => startDrag(e, setTimelineH, timelineH, 80, 600, 'y', -1)}
            />
            <Timeline height={timelineH} />

            {/* ── Export Loop Modal ─────────────────────────────────────────── */}
            {showExportLoopModal && (
                <div
                    className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setShowExportLoopModal(false)}
                >
                    <div
                        className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl shadow-2xl p-6 w-[340px] space-y-4 text-editor-fg font-sans"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h2 className="text-sm font-bold text-white">Export Loop Region</h2>
                                <p className="text-[11px] text-gray-400 font-mono">
                                    {loopStart.toFixed(2)}s – {loopEnd.toFixed(2)}s &nbsp;·&nbsp; {(loopEnd - loopStart).toFixed(2)}s duration
                                </p>
                            </div>
                            <button
                                className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
                                onClick={() => setShowExportLoopModal(false)}
                            >✕</button>
                        </div>

                        {/* Info box */}
                        <div className="bg-[#252527] border border-[#3a3a3c] rounded-lg p-3 text-[11px] text-gray-300 space-y-1">
                            <p>Exports all automation curves (Scroll, Rotation, Opacity, Depth, etc.) clipped to your loop region. Times are re-normalised so the loop start becomes <span className="font-mono text-cyan-400">t=0</span>.</p>
                            {!audioUrl && (
                                <p className="text-yellow-400 text-[10px] mt-1">⚠ No audio loaded — audio export will be skipped.</p>
                            )}
                        </div>

                        {/* Export options */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#3a3a3c] bg-[#252527] hover:border-cyan-500 hover:bg-cyan-500/10 transition-all group"
                                onClick={() => handleExportLoop(false)}
                            >
                                <span className="text-2xl">📊</span>
                                <div className="text-center">
                                    <div className="text-[12px] font-bold text-white group-hover:text-cyan-300">Curves Only</div>
                                    <div className="text-[9px] text-gray-400 mt-0.5">JSON — no audio<br/>Smaller file size</div>
                                </div>
                            </button>

                            <button
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all group ${audioUrl ? 'border-[#3a3a3c] bg-[#252527] hover:border-orange-500 hover:bg-orange-500/10' : 'border-[#2a2a2c] bg-[#1a1a1c] opacity-50 cursor-not-allowed'}`}
                                onClick={() => audioUrl && handleExportLoop(true)}
                                disabled={!audioUrl}
                            >
                                <span className="text-2xl">🎵</span>
                                <div className="text-center">
                                    <div className={`text-[12px] font-bold ${audioUrl ? 'text-white group-hover:text-orange-300' : 'text-gray-500'}`}>With Audio</div>
                                    <div className="text-[9px] text-gray-400 mt-0.5">JSON + base64 audio<br/>Self-contained</div>
                                </div>
                            </button>
                        </div>

                        <p className="text-[9px] text-gray-500 text-center">
                            File: <span className="font-mono text-gray-400">loop_{loopStart.toFixed(2)}-{loopEnd.toFixed(2)}s[_audio].json</span>
                        </p>
                    </div>
                </div>
            )}

            {/* ── Help Panel ────────────────────────────────────────────────── */}
            {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
            {showProjectModal && <ProjectModal onClose={() => setShowProjectModal(false)} />}
            {showVideoExportModal && <VideoExportModal onClose={() => setShowVideoExportModal(false)} />}

        </div>
    );
}
