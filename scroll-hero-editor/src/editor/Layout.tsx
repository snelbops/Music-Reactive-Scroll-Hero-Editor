
import { useEffect, useState, useCallback, useRef } from 'react';
import { Minimize2, Plus } from 'lucide-react';
import studio from '@theatre/studio';
import LeftPanel from './LeftPanel';
import Inspector from './Inspector';
import Timeline from './Timeline';
import Viewport from '../preview/Viewport';
import HelpPanel from './HelpPanel';
import ProjectModal from './ProjectModal';
import { useStore } from '../store/useStore';
import { exportParticleHeroHtml, exportFrameSequenceHeroHtml, exportCurvesJson, exportLoopRegionJson } from '../export/exportHtml';
import { saveProject, loadProject, loadWorkingProject, autoSaveWorkingProject, startNewProject } from '../utils/project';

export default function Layout() {
    const isDarkMode = useStore(state => state.isDarkMode);
    const setIsDarkMode = useStore(state => state.setIsDarkMode);
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
    const [isLoadError, setIsLoadError] = useState(false);
    const [isExportingLoop, setIsExportingLoop] = useState(false);
    const [showExportLoopModal, setShowExportLoopModal] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
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
            <header className="h-8 border-b border-editor-border bg-editor-panel text-editor-muted flex items-center px-4 justify-between text-[11px] font-medium tracking-wide shrink-0 font-sans select-none">
                <span className="text-editor-fg font-semibold tracking-tight">Scroll Hero Editor</span>

                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => {
                            if (confirm('Start a new project? Any unsaved changes in current project will be cleared.')) {
                                startNewProject();
                            }
                        }}
                        className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded text-[11px] border border-white/20 transition-all flex items-center gap-1"
                        title="Clear timeline and start a fresh project"
                    >
                        <Plus className="w-3 h-3 text-cyan-400" /> New Project
                    </button>
                    <button
                        onClick={() => setShowProjectModal(true)}
                        className="px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold rounded text-[11px] border border-cyan-500/30 transition-all flex items-center gap-1"
                        title="Manage saved projects, load templates, or import/export files"
                    >
                        📁 Projects
                    </button>
                    <span className="cursor-pointer hover:text-editor-fg transition-colors" onClick={() => saveProject()} title="Quick export .shero file">Save File</span>
                    <span className="cursor-pointer hover:text-editor-fg transition-colors" onClick={() => loadInputRef.current?.click()} title="Quick load .shero file">
                        {isLoadError ? 'Load failed' : 'Load File'}
                    </span>
                    <span className="text-editor-border">|</span>
                    <span className="cursor-pointer hover:text-editor-fg transition-colors" onClick={handleExportJson}>Export JSON</span>
                    <span className="cursor-pointer hover:text-editor-fg transition-colors" onClick={exportCurvesJson}>Export Curves</span>
                    <span
                        className={`cursor-pointer transition-colors relative ${isLoop ? 'text-cyan-400 hover:text-cyan-300' : 'hover:text-editor-fg opacity-50 cursor-not-allowed'}`}
                        onClick={() => isLoop && setShowExportLoopModal(true)}
                        title={isLoop ? `Export loop region ${loopStart.toFixed(2)}s – ${loopEnd.toFixed(2)}s` : 'Enable loop first (L button in timeline)'}
                    >
                        {isExportingLoop ? 'Exporting Loop…' : 'Export Loop'}
                    </span>
                    <span className="cursor-pointer hover:text-editor-fg transition-colors" onClick={handleExportHtml}>
                        {isExportingHtml ? 'Exporting…' : 'Export HTML'}
                    </span>
                    <button
                        className="w-5 h-5 rounded-full border border-[#3a3a3c] text-gray-400 hover:text-white hover:border-cyan-400 hover:bg-cyan-400/10 text-[11px] font-bold transition-all flex items-center justify-center"
                        onClick={() => setShowHelp(true)}
                        title="Keyboard shortcuts & help"
                    >
                        ?
                    </button>
                    <div className="flex bg-editor-surface p-0.5 rounded gap-1 border border-editor-border">
                        <button onClick={() => setIsDarkMode(false)} className={`px-2 py-0.5 rounded text-xxs transition-colors ${!isDarkMode ? 'bg-editor-surface-hover text-editor-fg' : 'text-editor-muted hover:text-editor-fg'}`}>L</button>
                        <button onClick={() => setIsDarkMode(true)} className={`px-2 py-0.5 rounded text-xxs transition-colors ${isDarkMode ? 'bg-editor-surface-hover text-editor-fg' : 'text-editor-muted hover:text-editor-fg'}`}>D</button>
                    </div>
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
                    setIsLoadError(false);
                    try { await loadProject(file); }
                    catch { setIsLoadError(true); setTimeout(() => setIsLoadError(false), 3000); }
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

            {/* ── Project Manager Modal ──────────────────────────────────────── */}
            {showProjectModal && <ProjectModal onClose={() => setShowProjectModal(false)} />}

        </div>
    );
}
