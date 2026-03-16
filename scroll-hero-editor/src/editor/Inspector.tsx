import { useStore } from '../store/useStore';
import { SEQUENCE_DURATION } from '../theatre/core';

// Lane configuration — maps laneId to display info
const LANE_CONFIG = {
    scrollPos:     { name: 'Scroll POS',      color: '#a855f7', unit: '',  range: [0, 1]   as [number, number] },
    rotationSpeed: { name: 'Rotation Speed',  color: '#14b8a6', unit: 'x', range: [0, 2]   as [number, number] },
    depth:         { name: 'Particle Depth',  color: '#22c55e', unit: '',  range: [0, 10]  as [number, number] },
    size:          { name: 'Particle Size',   color: '#22c55e', unit: '',  range: [0.1, 5] as [number, number] },
    cssOpacity:    { name: 'CSS Opacity',     color: '#3b82f6', unit: '',  range: [0, 1]   as [number, number] },
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

function applyEasingPreset(laneId: string, position: number, presetId: string) {
    if (laneId === 'scrollPos') {
        useStore.getState().updateScrollKeyframeEasing(position, presetId);
    } else {
        useStore.getState().updateParamKeyframeEasing(laneId, position, presetId);
    }
}

// Scroll POS pattern presets — generate keyframes for the scroll lane
// ViewBox for thumbnails: 60×30, bottom-left=(0,30)=value 0, top-right=(60,0)=value 1
const SCROLL_PATTERNS = [
    {
        id: 'linear',
        label: 'Linear',
        thumb: 'M 0 30 L 60 0',
        generate: (d: number) => [
            { time: 0, value: 0, easing: 'linear' },
            { time: d, value: 1, easing: 'linear' },
        ],
    },
    {
        id: 'easeIn',
        label: 'Ease In',
        thumb: 'M 0 30 C 50 30 60 0 60 0',
        generate: (d: number) => [
            { time: 0, value: 0, easing: 'easeIn' },
            { time: d, value: 1, easing: 'linear' },
        ],
    },
    {
        id: 'easeOut',
        label: 'Ease Out',
        thumb: 'M 0 30 C 0 30 10 0 60 0',
        generate: (d: number) => [
            { time: 0, value: 0, easing: 'easeOut' },
            { time: d, value: 1, easing: 'linear' },
        ],
    },
    {
        id: 'sCurve',
        label: 'S-Curve',
        thumb: 'M 0 30 C 15 30 45 0 60 0',
        generate: (d: number) => [
            { time: 0, value: 0, easing: 'easeInOut' },
            { time: d, value: 1, easing: 'linear' },
        ],
    },
    {
        id: 'twoPhase',
        label: 'Two Phase',
        thumb: 'M 0 30 C 8 30 16 15 22 15 H 38 C 44 15 52 0 60 0',
        generate: (d: number) => [
            { time: 0,      value: 0,   easing: 'easeInOut' },
            { time: d * .4, value: 0.5, easing: 'linear'    },
            { time: d * .6, value: 0.5, easing: 'easeInOut' },
            { time: d,      value: 1,   easing: 'linear'    },
        ],
    },
    {
        id: 'staircase',
        label: 'Staircase',
        thumb: 'M 0 30 H 15 V 22.5 H 30 V 15 H 45 V 7.5 H 60 V 0',
        generate: (d: number) => [
            { time: 0,        value: 0,    easing: 'step' },
            { time: d * 0.25, value: 0.25, easing: 'step' },
            { time: d * 0.5,  value: 0.5,  easing: 'step' },
            { time: d * 0.75, value: 0.75, easing: 'step' },
            { time: d,        value: 1,    easing: 'linear' },
        ],
    },
    {
        id: 'yoyo',
        label: 'Yo-yo',
        thumb: 'M 0 30 C 10 30 20 0 30 0 C 40 0 50 30 60 30',
        generate: (d: number) => [
            { time: 0,      value: 0, easing: 'easeInOut' },
            { time: d * .5, value: 1, easing: 'easeInOut' },
            { time: d,      value: 0, easing: 'linear'    },
        ],
    },
    {
        id: 'bounce',
        label: 'Bounce',
        thumb: 'M 0 30 C 5 30 40 0 42 0 C 44 0 44 5 46 5 C 50 5 58 0 60 0',
        generate: (d: number) => [
            { time: 0,       value: 0,    easing: 'easeOut'   },
            { time: d * 0.7, value: 1,    easing: 'easeInOut' },
            { time: d * 0.85,value: 0.88, easing: 'easeInOut' },
            { time: d,       value: 1,    easing: 'linear'    },
        ],
    },
] as const;

function applyEasingToAllSelected(presetId: string) {
    useStore.getState().selectedKeyframes.forEach(({ laneId, position }) => {
        applyEasingPreset(laneId, position, presetId);
    });
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

            {/* Scroll pattern presets */}
            {laneId === 'scrollPos' && (
                <div>
                    <label className="text-xxs font-bold text-gray-500 uppercase tracking-widest block mb-2">Pattern Presets</label>
                    <p className="text-[9px] text-gray-600 mb-2 leading-relaxed">Replaces current scroll automation.</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {SCROLL_PATTERNS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => useStore.getState().setScrollKeyframes(preset.generate(SEQUENCE_DURATION))}
                                className="group flex flex-col items-center gap-1 p-2 glass-panel hover:bg-white/10 rounded transition-colors"
                            >
                                <svg viewBox="0 0 60 30" className="w-full h-7" preserveAspectRatio="none">
                                    <path d={preset.thumb} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" className="group-hover:opacity-100 transition-opacity" />
                                </svg>
                                <span className="text-[9px] text-gray-500 group-hover:text-white transition-colors">{preset.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Interpolation mode hint */}
            {laneId !== 'scrollPos' && (
                <div>
                    <label className="text-xxs font-bold text-gray-500 uppercase tracking-widest block mb-2">Interpolation</label>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Click a keyframe dot on this lane to edit its easing.</p>
                </div>
            )}
        </div>
    );
}

// ── Keyframe Selected ─────────────────────────────────────────────────────────
function KeyframeInspector({ kf }: { kf: { laneId: string; position: number; value: number } }) {
    const lane = LANE_CONFIG[kf.laneId as LaneId];
    if (!lane) return null;

    const setSelectedKeyframe = useStore(s => s.setSelectedKeyframe);
    const selectedCount = useStore(s => s.selectedKeyframes.length);
    const isMulti = selectedCount > 1;

    const timeLabel = new Date(kf.position * 1000).toISOString().slice(15, 22);

    return (
        <div className="flex flex-col gap-4">
            {/* Keyframe header */}
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: lane.color, boxShadow: `0 0 8px ${lane.color}80` }} />
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{lane.name}</span>
                        {isMulti && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: lane.color + '30', color: lane.color }}>
                                {selectedCount} selected
                            </span>
                        )}
                    </div>
                    <p className="text-[9px] text-gray-500 font-mono">{isMulti ? 'Shift+click to toggle' : `Keyframe @ ${timeLabel}s`}</p>
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
                {kf.laneId !== 'scrollPos' && !isMulti && (
                    <div className="mt-2">
                        <label className="text-xxs text-gray-500 block mb-1">Edit Value</label>
                        <input
                            key={`${kf.laneId}-${kf.position}`}
                            type="number"
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                            defaultValue={kf.value.toFixed(4)}
                            step={(lane.range[1] - lane.range[0]) / 100}
                            min={lane.range[0]}
                            max={lane.range[1]}
                            onBlur={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) {
                                    const clamped = Math.max(lane.range[0], Math.min(lane.range[1], v));
                                    useStore.getState().updateParamKeyframeValue(kf.laneId, kf.position, clamped);
                                    useStore.getState().setSelectedKeyframe({ laneId: kf.laneId, position: kf.position, value: clamped });
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Easing presets */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xxs font-bold text-gray-500 uppercase tracking-widest">
                        Easing to Next{isMulti ? ` (${selectedCount})` : ''}
                    </label>
                    <span className="text-[9px] text-gray-600">right-click / Delete to remove</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {EASING_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => {
                                applyEasingToAllSelected(preset.id);
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
                </div>
            </div>
        </div>
    );
}

// ── Root Inspector ────────────────────────────────────────────────────────────
export default function Inspector({ width = 240 }: { width?: number }) {
    const selectedLane = useStore(s => s.selectedLane);
    const selectedKeyframes = useStore(s => s.selectedKeyframes);
    const primaryKeyframe = selectedKeyframes.at(-1) ?? null;

    return (
        <aside className="border-l border-editor-border bg-black/20 flex flex-col overflow-y-auto thin-scrollbar" style={{ width }}>
            <div className="h-10 border-b border-editor-border flex items-center px-4 shrink-0">
                <span className="text-xxs font-bold text-gray-500 uppercase tracking-widest">Inspector</span>
            </div>
            <div className="p-4 flex-1">
                {primaryKeyframe ? (
                    <KeyframeInspector kf={primaryKeyframe} />
                ) : selectedLane ? (
                    <LaneInspector laneId={selectedLane} />
                ) : (
                    <EmptyState />
                )}
            </div>
        </aside>
    );
}
