
import { useEffect, useState, useCallback } from 'react';
import { Minimize2 } from 'lucide-react';
import studio from '@theatre/studio';
import LeftPanel from './LeftPanel';
import Inspector from './Inspector';
import Timeline from './Timeline';
import Viewport from '../preview/Viewport';
import { useStore } from '../store/useStore';
import { exportParticleHeroHtml, exportFrameSequenceHeroHtml, exportCurvesJson } from '../export/exportHtml';

export default function Layout() {
    const isFullscreen = useStore(state => state.isFullscreen);
    const setIsFullscreen = useStore(state => state.setIsFullscreen);
    const activePreset = useStore(state => state.activePreset);
    const mp4Asset = useStore(state => state.mp4Asset);
    const extractionStatus = useStore(state => state.extractionStatus);

    const [isExportingHtml, setIsExportingHtml] = useState(false);
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
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
            if (e.key === ' ' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
                useStore.getState().setIsPlaying(!useStore.getState().isPlaying);
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isFullscreen, setIsFullscreen]);

    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#050508] flex">
                <Viewport />
                <button
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-3 right-3 z-[10000] p-1.5 glass-panel hover:bg-white/10 opacity-50 hover:opacity-100 transition-opacity"
                    title="Exit fullscreen (Esc)"
                >
                    <Minimize2 className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full bg-editor-bg text-gray-300 overflow-hidden font-sans select-none text-sm">
            <header className="h-10 border-b border-editor-border flex items-center px-4 justify-between bg-black/40">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-white tracking-tighter text-base">SCROLL HERO EDITOR</span>
                    <div className="flex gap-4 text-xxs uppercase tracking-widest text-gray-500">
                        <span className="text-editor-accent-purple">Project: Neon_Horizon_01</span>
                        <span>Draft Saved just now</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExportJson} className="bg-editor-accent-purple/20 hover:bg-editor-accent-purple/40 text-editor-accent-purple px-3 py-1 rounded text-xs transition-colors border border-editor-accent-purple/30">EXPORT JSON</button>
                    <button onClick={exportCurvesJson} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-3 py-1 rounded text-xs transition-colors border border-white/10" title="Export scroll keyframes as curves.json">CURVES JSON</button>
                    <button
                        onClick={handleExportHtml}
                        disabled={isExportingHtml}
                        title={activePreset === 'frames' && mp4Asset && extractionStatus === 'done' ? 'Export frame sequence hero' : 'Export particle hero'}
                        className="bg-editor-accent-teal/20 hover:bg-editor-accent-teal/40 text-editor-accent-teal px-3 py-1 rounded text-xs transition-colors border border-editor-accent-teal/30 disabled:opacity-40 disabled:cursor-wait"
                    >
                        {isExportingHtml ? 'EXPORTING…' : 'EXPORT HTML'}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 border border-white/20"></div>
                </div>
            </header>

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
        </div>
    );
}
