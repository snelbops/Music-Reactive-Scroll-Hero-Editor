
import { useEffect } from 'react';
import { Minimize2 } from 'lucide-react';
import LeftPanel from './LeftPanel';
import Inspector from './Inspector';
import Timeline from './Timeline';
import Viewport from '../preview/Viewport';
import { useStore } from '../store/useStore';

export default function Layout() {
    const isFullscreen = useStore(state => state.isFullscreen);
    const setIsFullscreen = useStore(state => state.setIsFullscreen);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isFullscreen, setIsFullscreen]);

    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#050508]">
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
                    <button className="bg-editor-accent-purple/20 hover:bg-editor-accent-purple/40 text-editor-accent-purple px-3 py-1 rounded text-xs transition-colors border border-editor-accent-purple/30">EXPORT JSON</button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 border border-white/20"></div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <LeftPanel />
                <Viewport />
                <Inspector />
            </div>

            <Timeline />
        </div>
    );
}
