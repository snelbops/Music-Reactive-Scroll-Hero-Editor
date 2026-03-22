
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
    const isDarkMode = useStore(state => state.isDarkMode);
    const setIsDarkMode = useStore(state => state.setIsDarkMode);
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
        // Apply dark class to root element
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

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
            <header className="h-8 border-b border-[#222] bg-[#1a1a1a] text-[#808080] flex items-center px-4 justify-between text-[11px] font-medium tracking-wide shrink-0 font-sans select-none">
                <div className="flex items-center space-x-6">
                    <span className="cursor-pointer hover:text-[#d9d9d9]">Media Pool</span>
                    <span className="cursor-pointer hover:text-[#d9d9d9]">Sync Bin</span>
                    <span className="cursor-pointer hover:text-[#d9d9d9]">Transitions</span>
                    <span className="cursor-pointer hover:text-[#d9d9d9]">Titles</span>
                    <span className="cursor-pointer hover:text-[#d9d9d9]">Effects</span>
                    <span className="cursor-pointer hover:text-[#d9d9d9]">Keyframes</span>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 text-[#d9d9d9]">
                    Untitled Project 2 <span className="text-[#808080] ml-1 font-normal">| Edited</span>
                </div>

                <div className="flex items-center space-x-6">
                    <span className="cursor-pointer hover:text-[#d9d9d9]" onClick={handleExportJson}>Export JSON</span>
                    <span className="cursor-pointer hover:text-[#d9d9d9]" onClick={exportCurvesJson}>Export Curves</span>
                    <span className="cursor-pointer hover:text-[#d9d9d9]" onClick={handleExportHtml}>Export HTML</span>
                    <span className="cursor-pointer hover:text-[#d9d9d9]">Inspector</span>
                    {/* Exposing editor features natively as hidden buttons or inline toggles */}
                    <div className="flex bg-[#222] p-0.5 rounded gap-1 ml-4 border border-[#333]">
                        <button onClick={() => setIsDarkMode(false)} className={`px-2 py-0.5 rounded text-xxs transition-colors ${!isDarkMode ? 'bg-[#333] text-[#d9d9d9]' : 'text-[#808080] hover:text-[#d9d9d9]'}`}>L</button>
                        <button onClick={() => setIsDarkMode(true)} className={`px-2 py-0.5 rounded text-xxs transition-colors ${isDarkMode ? 'bg-[#333] text-[#d9d9d9]' : 'text-[#808080] hover:text-[#d9d9d9]'}`}>D</button>
                    </div>
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

            <footer className="h-10 bg-[#141414] border-t border-[#1a1a1a] flex items-center px-4 shrink-0 text-[11px] font-medium tracking-wide font-sans select-none">
                <div className="w-48 text-[#d9d9d9] font-semibold flex items-center gap-2">
                    {/* Simulate Davinci Logo */}
                    <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#d9d9d9] opacity-80 flex items-center justify-center">
                        <div className="w-1 h-1 bg-[#d9d9d9] rounded-full"></div>
                    </div>
                    <span>DaVinci Resolve 20</span>
                </div>
                
                <div className="flex-1 flex justify-center space-x-12 h-full text-[#808080]">
                    <div className="h-full flex items-center hover:text-[#d9d9d9] cursor-pointer pt-0.5">Media</div>
                    <div className="h-full flex items-center hover:text-[#d9d9d9] cursor-pointer pt-0.5">Cut</div>
                    {/* Active tab */}
                    <div className="h-full flex items-center text-[#d9d9d9] border-b-[3px] border-red-500 cursor-pointer">Edit</div>
                    <div className="h-full flex items-center hover:text-[#d9d9d9] cursor-pointer pt-0.5">Fusion</div>
                    <div className="h-full flex items-center hover:text-[#d9d9d9] cursor-pointer pt-0.5">Color</div>
                    <div className="h-full flex items-center hover:text-[#d9d9d9] cursor-pointer pt-0.5">Fairlight</div>
                    <div className="h-full flex items-center hover:text-[#d9d9d9] cursor-pointer pt-0.5">Deliver</div>
                </div>

                <div className="w-48 flex justify-end items-center space-x-6 text-[#808080]">
                    <span className="cursor-pointer hover:text-[#d9d9d9]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    </span>
                    <span className="cursor-pointer hover:text-[#d9d9d9]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </span>
                </div>
            </footer>
        </div>
    );
}
