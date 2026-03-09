import { Maximize2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { GithubTestParticleField } from '../presets/ParticleLab';
import GhostTrailCanvas from './GhostTrailCanvas';
import RecordMode from './RecordMode';
import { useStore } from '../store/useStore';

export default function Viewport() {
    const scrollProgress = useStore(state => state.scrollProgress);
    const isRecording = useStore(state => state.isRecording);
    const activePreset = useStore(state => state.activePreset);

    return (
        <main className="flex-1 flex flex-col relative bg-[#050508]">
            {/* Viewport Controls */}
            <div className="h-10 border-b border-editor-border flex items-center justify-between px-4 z-10 bg-black/40">
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">Zoom</span>
                        <select className="bg-transparent border-none p-0 text-xs focus:ring-0 outline-none">
                            <option>85% (Fit)</option>
                            <option>100%</option>
                        </select>
                    </div>
                    <div className="h-4 w-[1px] bg-editor-border"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">Ratio</span>
                        <button className="px-2 py-0.5 glass-panel text-xxs">16:9</button>
                    </div>
                </div>
                <button className="p-1.5 glass-panel hover:bg-white/10">
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/60">
                {/* Stage — fills available space (aspect ratio constrained in Plan 03) */}
                <div
                    className={`relative overflow-hidden w-full h-full ${isRecording ? 'ring-2 ring-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : ''}`}
                    style={{ position: 'relative' }}
                >
                    {/* Orbit: R3F Canvas */}
                    {activePreset === 'orbit' && (
                        <Canvas
                            camera={{ position: [0, 0, 5], fov: 50 }}
                            style={{ width: '100%', height: '100%', background: 'transparent', display: 'block' }}
                        >
                            <GithubTestParticleField
                                imageUrl="/github-test-app/images/sample-01.png"
                                theme="dark"
                            />
                        </Canvas>
                    )}

                    {/* Classic: iframe */}
                    {activePreset === 'classic' && (
                        <iframe
                            src="/github-test-app/index.html"
                            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                            title="Classic Particles"
                        />
                    )}

                    {/* Debug Overlay */}
                    <div className="absolute top-4 left-4 z-50 bg-black/80 text-green-400 font-mono text-xs px-2 py-1 rounded border border-green-400/30 shadow-[0_0_10px_rgba(34,197,94,0.2)] pointer-events-none">
                        DEBUG: Scroll Progress = {scrollProgress.toFixed(3)}
                    </div>

                    {/* Ghost Trail Canvas */}
                    <GhostTrailCanvas />

                    {/* Recording Mode Overlay */}
                    <RecordMode />
                </div>

                {/* Scroll Progress Bar — right side */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 h-64 w-1 bg-white/5 rounded-full z-20">
                    <div
                        className="absolute top-0 w-full bg-editor-accent-purple shadow-[0_0_10px_rgba(168,85,247,0.5)] rounded-full transition-all"
                        style={{ height: `${scrollProgress * 100}%` }}
                    ></div>
                    <div
                        className="absolute -left-2 w-5 h-2 bg-white rounded-sm shadow-xl"
                        style={{ top: `calc(${scrollProgress * 100}% - 4px)` }}
                    ></div>
                </div>
            </div>
        </main>
    );
}

