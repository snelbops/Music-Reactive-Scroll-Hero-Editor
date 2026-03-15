import studio from '@theatre/studio';
import { useStore } from '../store/useStore';
import { sheet, scrollControlsObj, sceneParamsObj, cssOpacityObj, SEQUENCE_DURATION } from '../theatre/core';

// Lane configuration — maps laneId to display info and Theatre.js prop
const LANE_CONFIG = {
    scrollPos:     { name: 'Scroll POS',      color: '#a855f7', unit: '',  range: [0, 1]   as [number, number], getProp: () => scrollControlsObj.props.position },
    rotationSpeed: { name: 'Rotation Speed',  color: '#14b8a6', unit: 'x', range: [0, 2]   as [number, number], getProp: () => sceneParamsObj.props.rotationSpeed },
    depth:         { name: 'Particle Depth',  color: '#22c55e', unit: '',  range: [0, 10]  as [number, number], getProp: () => sceneParamsObj.props.depth },
    size:          { name: 'Particle Size',   color: '#22c55e', unit: '',  range: [0.1, 5] as [number, number], getProp: () => sceneParamsObj.props.size },
    cssOpacity:    { name: 'CSS Opacity',     color: '#3b82f6', unit: '',  range: [0, 1]   as [number, number], getProp: () => cssOpacityObj.props.opacity },
} as const;

type LaneId = keyof typeof LANE_CONFIG;

// Easing presets — SVG path drawn in a 40×40 viewBox (x=time, y=value inverted)
const EASING_PRESETS = [
    { id: 'linear',    label: 'Linear',   d: 'M 0 40 L 40 0' },
    { id: 'easeIn',    label: 'Ease In',  d: 'M 0 40 C 16.8 40 40 0 40 0' },
    { id: 'easeOut',   label: 'Ease Out', d: 'M 0 40 C 0 40 23.2 0 40 0' },
    { id: 'easeInOut', label: 'In-Out',   d: 'M 0 40 C 16.8 40 23.2 0 40 0' },
    { id: 'step',      label: 'Step',     d: 'M 0 40 H 40 V 0' },
] as const;

function applyEasingPreset(laneId: string, position: number, value: number, presetId: string) {
    const lane = LANE_CONFIG[laneId as LaneId];
    if (!lane) return;
    const prop = lane.getProp();
    const savedPos = sheet.sequence.position;

    if (presetId === 'step') {
        // Simulate step/hold: write two keyframes — one holding the value, one snapping forward
        studio.transaction(({ set }) => {
            sheet.sequence.position = Math.max(0, position - 0.001);
            set(prop, value);
            sheet.sequence.position = position;
            set(prop, value);
        });
    } else {
        // Re-write keyframe at same position/value — Theatre.js default handles are smooth bezier
        studio.transaction(({ set }) => {
            sheet.sequence.position = position;
            set(prop, value);
        });
    }
    sheet.sequence.position = savedPos;
}

// ── No Selection ─────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col gap-4 text-center py-4">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                <span className="text-lg">◇</span>
            </div>
            <p className="text-xxs text-gray-500">Click a <span className="text-white/40">lane label</span> or <span className="text-white/40">keyframe dot</span> to inspect</p>
            <div className="text-left mt-2 space-y-2">
                <p className="text-xxs font-bold text-gray-600 uppercase tracking-widest">Quick Hints</p>
                <div className="space-y-1.5 text-[10px] text-gray-500">
                    <div className="flex justify-between"><span>Arm record</span><kbd className="bg-white/5 px-1 rounded text-[9px]">⏺</kbd></div>
                    <div className="flex justify-between"><span>Play / Pause</span><kbd className="bg-white/5 px-1 rounded text-[9px]">▶ btn</kbd></div>
                    <div className="flex justify-between"><span>Scrub</span><kbd className="bg-white/5 px-1 rounded text-[9px]">drag lane</kbd></div>
                    <div className="flex justify-between"><span>Wheel scrub</span><kbd className="bg-white/5 px-1 rounded text-[9px]">scroll</kbd></div>
                    <div className="flex justify-between"><span>Zoom timeline</span><kbd className="bg-white/5 px-1 rounded text-[9px]">± btns</kbd></div>
                </div>
            </div>
        </div>
    );
}

// ── Lane Selected ─────────────────────────────────────────────────────────────
function LaneInspector({ laneId }: { laneId: string }) {
    const lane = LANE_CONFIG[laneId as LaneId];
    if (!lane) return null;

    // Read current value from store for this lane
    const store = useStore();
    const currentValue = (() => {
        if (laneId === 'scrollPos')     return store.scrollProgress;
        if (laneId === 'rotationSpeed') return store.rotationSpeed;
        if (laneId === 'depth')         return store.particleDepth;
        if (laneId === 'size')          return store.particleSize;
        if (laneId === 'cssOpacity')    return store.cssOpacity;
        return 0;
    })();

    const [min, max] = lane.range;
    const normalised = (currentValue - min) / (max - min);

    return (
        <div className="flex flex-col gap-4">
            {/* Lane header */}
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: lane.color, boxShadow: `0 0 8px ${lane.color}80` }} />
                <span className="text-xs font-bold text-white">{lane.name}</span>
            </div>

            {/* Current value */}
            <div className="glass-panel p-3 rounded space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xxs text-gray-500">Current Value</span>
                    <span className="font-mono text-xs" style={{ color: lane.color }}>{currentValue.toFixed(3)}{lane.unit}</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${normalised * 100}%`, background: lane.color }} />
                </div>
                <div className="flex justify-between text-[9px] text-gray-600">
                    <span>{min}</span><span>{max}</span>
                </div>
            </div>

            {/* Interpolation mode hint */}
            <div>
                <label className="text-xxs font-bold text-gray-500 uppercase tracking-widest block mb-2">Interpolation</label>
                <p className="text-[10px] text-gray-500 leading-relaxed">Click a keyframe dot on this lane to edit its easing.</p>
            </div>
        </div>
    );
}

// ── Keyframe Selected ─────────────────────────────────────────────────────────
function KeyframeInspector({ kf }: { kf: { laneId: string; position: number; value: number } }) {
    const lane = LANE_CONFIG[kf.laneId as LaneId];
    if (!lane) return null;

    const setSelectedKeyframe = useStore(s => s.setSelectedKeyframe);

    const timeLabel = new Date(kf.position * 1000).toISOString().slice(15, 22);

    return (
        <div className="flex flex-col gap-4">
            {/* Keyframe header */}
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: lane.color, boxShadow: `0 0 8px ${lane.color}80` }} />
                <div>
                    <span className="text-xs font-bold text-white">{lane.name}</span>
                    <p className="text-[9px] text-gray-500 font-mono">Keyframe @ {timeLabel}s</p>
                </div>
            </div>

            {/* Value display */}
            <div className="glass-panel p-3 rounded">
                <div className="flex justify-between items-center">
                    <span className="text-xxs text-gray-500">Value</span>
                    <span className="font-mono text-sm" style={{ color: lane.color }}>{kf.value.toFixed(4)}{lane.unit}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <span className="text-xxs text-gray-500">Position</span>
                    <span className="font-mono text-xs text-gray-400">{kf.position.toFixed(3)}s</span>
                </div>
            </div>

            {/* Easing presets */}
            <div>
                <label className="text-xxs font-bold text-gray-500 uppercase tracking-widest block mb-2">Easing to Next</label>
                <div className="grid grid-cols-3 gap-1.5">
                    {EASING_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => {
                                applyEasingPreset(kf.laneId, kf.position, kf.value, preset.id);
                                // Refresh selection state so keyframe dot re-reads position
                                setSelectedKeyframe({ ...kf });
                            }}
                            className="group flex flex-col items-center gap-1 p-2 glass-panel hover:bg-white/10 rounded transition-colors"
                            title={preset.label}
                        >
                            <svg viewBox="0 0 40 40" className="w-8 h-8" style={{ color: lane.color }}>
                                <path d={preset.d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                            <span className="text-[9px] text-gray-500 group-hover:text-white transition-colors">{preset.label}</span>
                        </button>
                    ))}
                    <button
                        className="flex flex-col items-center gap-1 p-2 glass-panel hover:bg-white/10 rounded transition-colors"
                        title="Open Theatre Studio for custom bezier editing"
                        onClick={() => {/* Theatre Studio overlay provides custom bezier handles */}}
                    >
                        <svg viewBox="0 0 40 40" className="w-8 h-8 text-gray-400">
                            <path d="M 0 40 C 8 40 14 0 20 20 S 32 0 40 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="8" cy="40" r="3" fill="currentColor" opacity="0.4" />
                            <circle cx="32" cy="0" r="3" fill="currentColor" opacity="0.4" />
                        </svg>
                        <span className="text-[9px] text-gray-500">Custom</span>
                    </button>
                </div>
                <p className="text-[9px] text-gray-600 mt-2 leading-relaxed">Custom bezier: drag ◆ handles in the Theatre Studio panel.</p>
            </div>
        </div>
    );
}

// ── Root Inspector ────────────────────────────────────────────────────────────
export default function Inspector({ width = 240 }: { width?: number }) {
    const selectedLane = useStore(s => s.selectedLane);
    const selectedKeyframe = useStore(s => s.selectedKeyframe);

    return (
        <aside className="border-l border-editor-border bg-black/20 flex flex-col overflow-y-auto thin-scrollbar" style={{ width }}>
            <div className="h-10 border-b border-editor-border flex items-center px-4 shrink-0">
                <span className="text-xxs font-bold text-gray-500 uppercase tracking-widest">Inspector</span>
            </div>
            <div className="p-4 flex-1">
                {selectedKeyframe ? (
                    <KeyframeInspector kf={selectedKeyframe} />
                ) : selectedLane ? (
                    <LaneInspector laneId={selectedLane} />
                ) : (
                    <EmptyState />
                )}
            </div>
        </aside>
    );
}
