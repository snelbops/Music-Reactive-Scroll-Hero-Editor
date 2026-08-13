import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

// Must match the bound used by the timeline and the interpolator: a bezier handle may reach
// at most 45% of the way to its neighbour before the curve doubles back on itself.
const BEZIER_DT_LIMIT = 0.45;

// Lane configuration — maps laneId to display info
const LANE_CONFIG = {
    scrollPos:     { name: 'Scroll POS',      color: '#a855f7', unit: '',  range: [0, 1]   as [number, number] },
    rotationSpeed: { name: 'Rotation Speed',  color: '#14b8a6', unit: 'x', range: [0, 2]   as [number, number] },
    depth:         { name: 'Particle Depth',  color: '#22c55e', unit: '',  range: [0, 10]  as [number, number] },
    size:          { name: 'Particle Size',   color: '#22c55e', unit: '',  range: [0.1, 5] as [number, number] },
    cssOpacity:    { name: 'CSS Opacity',     color: '#3b82f6', unit: '',  range: [0, 1]   as [number, number] },
} as const;

type LaneId = keyof typeof LANE_CONFIG;

// Lanes that carry no keyframes of their own. They still deserve a panel — before this
// the inspector rendered nothing at all when one was selected.
const INFO_LANES: Record<string, { name: string; color: string; hint: string }> = {
    audio: {
        name: 'Audio Wave',
        color: '#f97316',
        hint: 'Drag across the waveform to select a region, then right-click to generate or tidy automation for a parameter across it.',
    },
};

// Easing presets — SVG path drawn in a 40×40 viewBox (x=time, y=value inverted)
const EASING_PRESETS = [
    { id: 'linear',    label: 'Linear',   d: 'M 0 40 L 40 0' },
    { id: 'easeIn',    label: 'Ease In',  d: 'M 0 40 C 16.8 40 40 0 40 0' },
    { id: 'easeOut',   label: 'Ease Out', d: 'M 0 40 C 0 40 23.2 0 40 0' },
    { id: 'easeInOut', label: 'In-Out',   d: 'M 0 40 C 16.8 40 23.2 0 40 0' },
    { id: 'spring',    label: 'Spring',   d: 'M 0 40 C 12 40 24 -6 30 -2 S 38 0 40 0' },
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

// ── Custom Bezier Editor ─────────────────────────────────────────────────────
function CustomBezierEditor({ laneId, position, laneColor }: { laneId: string; position: number; laneColor: string }) {
    // Control points in normalized [0,1] space
    const scrollKfs = useStore(s => s.scrollKeyframes);
    const paramKfs = useStore(s => s.paramKeyframes);

    const laneKfs = laneId === 'scrollPos' ? scrollKfs : (paramKfs[laneId] ?? []);
    const kfIdx = laneKfs.findIndex(k => Math.abs(k.time - position) < 0.001);
    const kf = kfIdx >= 0 ? laneKfs[kfIdx] : undefined;

    // A handle may only reach 45% of the way to its neighbour before the curve would double
    // back on itself. Scaling by the real gap (rather than a flat 10% of the sequence) makes
    // this editor agree with the timeline curve and the interpolator.
    const nextGap = kf && kfIdx < laneKfs.length - 1 ? laneKfs[kfIdx + 1].time - kf.time : 0;
    const prevGap = kf && kfIdx > 0 ? kf.time - laneKfs[kfIdx - 1].time : 0;
    const outReach = Math.max(0.001, nextGap) * BEZIER_DT_LIMIT;
    const inReach = Math.max(0.001, prevGap) * BEZIER_DT_LIMIT;

    // Default cp positions: ease-in-out style
    const [cp1, setCp1] = useState({ x: 0.42, y: 0 });
    const [cp2, setCp2] = useState({ x: 0.58, y: 1 });
    const [dragging, setDragging] = useState<'cp1' | 'cp2' | null>(null);

    // Re-sync when a different keyframe is inspected. This component keeps its place in the
    // tree between selections, so without this it would keep showing the previous curve.
    // Deliberately keyed on identity only — including the handle values would fight the drag.
    useEffect(() => {
        const ho = kf?.handleOut;
        const hi = kf?.handleIn;
        setCp1(ho ? { x: Math.max(0, Math.min(1, ho.dt / outReach)), y: ho.dv } : { x: 0.42, y: 0 });
        setCp2(hi ? { x: Math.max(0, Math.min(1, 1 + hi.dt / inReach)), y: 1 + hi.dv } : { x: 0.58, y: 1 });
        setDragging(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [laneId, position]);

    const SIZE = 120;
    const PAD = 12;
    const inner = SIZE - PAD * 2;

    const toSvg = (nx: number, ny: number) => ({
        x: PAD + nx * inner,
        y: PAD + (1 - ny) * inner,
    });

    const fromSvg = (sx: number, sy: number) => ({
        x: Math.max(0, Math.min(1, (sx - PAD) / inner)),
        y: Math.max(-0.5, Math.min(1.5, 1 - (sy - PAD) / inner)),
    });

    const p0 = toSvg(0, 0);
    const p3 = toSvg(1, 1);
    const c1 = toSvg(cp1.x, cp1.y);
    const c2 = toSvg(cp2.x, cp2.y);

    const curvePath = `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`;

    const writeHandles = (newCp1: typeof cp1, newCp2: typeof cp2) => {
        // Normalised cp -> handle deltas (dt in seconds, dv in value units). x is scaled by the
        // reach to each neighbour, so a full-width drag lands exactly on the monotonic limit
        // and can never describe a curve that holds two values at one instant.
        const out = { dt: newCp1.x * outReach, dv: newCp1.y };
        const inn = { dt: (newCp2.x - 1) * inReach, dv: newCp2.y - 1 };
        if (laneId === 'scrollPos') {
            useStore.getState().updateScrollKeyframeHandle(position, 'out', out);
            useStore.getState().updateScrollKeyframeHandle(position, 'in', inn);
        } else {
            useStore.getState().updateParamKeyframeHandle(laneId, position, 'out', out);
            useStore.getState().updateParamKeyframeHandle(laneId, position, 'in', inn);
        }
    };

    const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        if (!dragging) return;
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const sx = ((e.clientX - rect.left) / rect.width) * SIZE;
        const sy = ((e.clientY - rect.top) / rect.height) * SIZE;
        const np = fromSvg(sx, sy);
        if (dragging === 'cp1') {
            setCp1(np);
            writeHandles(np, cp2);
        } else {
            setCp2(np);
            writeHandles(cp1, np);
        }
    }, [dragging, cp1, cp2]);

    return (
        <div>
            <label className="text-xxs font-bold text-editor-muted uppercase tracking-widest block mb-2">Custom Bezier</label>
            <div className="glass-panel rounded p-2 flex flex-col items-center gap-2">
                <svg
                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                    className="w-full aspect-square"
                    style={{ maxWidth: SIZE }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={() => setDragging(null)}
                    onPointerLeave={() => setDragging(null)}
                >
                    {/* Grid */}
                    <rect x={PAD} y={PAD} width={inner} height={inner} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <line x1={PAD} y1={PAD + inner / 2} x2={PAD + inner} y2={PAD + inner / 2} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1={PAD + inner / 2} y1={PAD} x2={PAD + inner / 2} y2={PAD + inner} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    {/* Linear reference */}
                    <line x1={p0.x} y1={p0.y} x2={p3.x} y2={p3.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
                    {/* Handle lines */}
                    <line x1={p0.x} y1={p0.y} x2={c1.x} y2={c1.y} stroke={laneColor} strokeWidth="2" />
                    <line x1={p3.x} y1={p3.y} x2={c2.x} y2={c2.y} stroke={laneColor} strokeWidth="2" />
                    {/* Curve */}
                    <path d={curvePath} fill="none" stroke={laneColor} strokeWidth="2" strokeLinecap="round" />
                    {/* CP1 */}
                    <circle
                        cx={c1.x} cy={c1.y} r="4"
                        fill={laneColor}
                        stroke="var(--color-editor-bg)" strokeWidth="2"
                        className="cursor-move"
                        onPointerDown={(e) => { e.stopPropagation(); setDragging('cp1'); }}
                    />
                    {/* CP2 */}
                    <circle
                        cx={c2.x} cy={c2.y} r="4"
                        fill={laneColor}
                        stroke="var(--color-editor-bg)" strokeWidth="2"
                        className="cursor-move"
                        onPointerDown={(e) => { e.stopPropagation(); setDragging('cp2'); }}
                    />
                    {/* Endpoints */}
                    <path d="M 0 -4 L 4 0 L 0 4 L -4 0 Z" transform={`translate(${p0.x}, ${p0.y})`} fill="var(--color-editor-fill)" opacity="0.5" />
                    <path d="M 0 -4 L 4 0 L 0 4 L -4 0 Z" transform={`translate(${p3.x}, ${p3.y})`} fill="var(--color-editor-fill)" opacity="0.5" />
                </svg>
                <div className="flex justify-between w-full text-[9px] text-editor-muted font-mono px-1">
                    <span>CP1: ({cp1.x.toFixed(2)}, {cp1.y.toFixed(2)})</span>
                    <span>CP2: ({cp2.x.toFixed(2)}, {cp2.y.toFixed(2)})</span>
                </div>
            </div>
        </div>
    );
}

// ── No Selection ─────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col gap-4 text-center py-4">
            <div className="w-10 h-10 rounded-full bg-editor-surface flex items-center justify-center mx-auto">
                <span className="text-lg">◇</span>
            </div>
            <p className="text-xxs text-editor-muted">Click a <span className="text-editor-fg/40">lane label</span> or <span className="text-editor-fg/40">keyframe dot</span> to inspect</p>
            <div className="text-left mt-2 space-y-2">
                <p className="text-xxs font-bold text-editor-muted uppercase tracking-widest">Quick Hints</p>
                <div className="space-y-1.5 text-[10px] text-editor-muted">
                    <div className="flex justify-between"><span>Arm record</span><kbd className="bg-editor-surface px-1 rounded text-[9px]">⏺</kbd></div>
                    <div className="flex justify-between"><span>Play / Pause</span><kbd className="bg-editor-surface px-1 rounded text-[9px]">▶ btn</kbd></div>
                    <div className="flex justify-between"><span>Scrub</span><kbd className="bg-editor-surface px-1 rounded text-[9px]">drag lane</kbd></div>
                    <div className="flex justify-between"><span>Wheel scrub</span><kbd className="bg-editor-surface px-1 rounded text-[9px]">scroll</kbd></div>
                    <div className="flex justify-between"><span>Zoom timeline</span><kbd className="bg-editor-surface px-1 rounded text-[9px]">± btns</kbd></div>
                </div>
            </div>
        </div>
    );
}

// ── Info Lane Selected (no keyframes of its own, e.g. Audio Wave) ─────────────
function InfoLaneInspector({ laneId, timeSelection }: {
    laneId: string;
    timeSelection: { start: number; end: number } | null;
}) {
    const info = INFO_LANES[laneId];
    if (!info) return <EmptyState />;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2 border-b border-editor-border">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: info.color }} />
                <span className="font-semibold text-xs text-editor-fg">{info.name}</span>
            </div>

            <div className="p-3 border border-editor-border rounded-md bg-editor-panel flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                    <span className="text-[10.5px] text-editor-muted">Selected region</span>
                    <span className="font-mono font-medium text-xs text-editor-fg">
                        {timeSelection
                            ? `${timeSelection.start.toFixed(2)}s – ${timeSelection.end.toFixed(2)}s`
                            : 'none'}
                    </span>
                </div>
                {timeSelection && (
                    <div className="flex justify-between items-baseline">
                        <span className="text-[10.5px] text-editor-muted">Length</span>
                        <span className="font-mono text-xs text-editor-muted">
                            {(timeSelection.end - timeSelection.start).toFixed(2)}s
                        </span>
                    </div>
                )}
            </div>

            <p className="text-[10px] text-editor-muted leading-relaxed">{info.hint}</p>
        </div>
    );
}

// ── Lane Selected ─────────────────────────────────────────────────────────────
function LaneInspector({ laneId }: { laneId: string }) {
    // Every hook runs before any early return — switching between a configured lane and an
    // info lane must not change the hook count.
    const scrollProgress = useStore(s => s.scrollProgress);
    const rotationSpeed  = useStore(s => s.rotationSpeed);
    const particleDepth  = useStore(s => s.particleDepth);
    const particleSize   = useStore(s => s.particleSize);
    const cssOpacity     = useStore(s => s.cssOpacity);
    const timeSelection  = useStore(s => s.timeSelection);

    const lane = LANE_CONFIG[laneId as LaneId];
    if (!lane) return <InfoLaneInspector laneId={laneId} timeSelection={timeSelection} />;

    const currentValue = (() => {
        if (laneId === 'scrollPos')     return scrollProgress;
        if (laneId === 'rotationSpeed') return rotationSpeed;
        if (laneId === 'depth')         return particleDepth;
        if (laneId === 'size')          return particleSize;
        if (laneId === 'cssOpacity')    return cssOpacity;
        return 0;
    })();

    const [min, max] = lane.range;
    const normalised = Math.max(0, Math.min(1, (currentValue - min) / (max - min)));

    return (
        <div className="flex flex-col gap-4">
            {/* Lane header */}
            <div className="flex items-center gap-2 pb-2 border-b border-editor-border">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: lane.color }} />
                <span className="font-semibold text-xs text-editor-fg">{lane.name}</span>
            </div>

            {/* Current value readout */}
            <div className="p-3 border border-editor-border rounded-md bg-editor-panel flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                    <span className="text-[10.5px] text-editor-muted">Value at playhead</span>
                    <span className="font-mono font-medium text-xs text-editor-fg">{currentValue.toFixed(3)}{lane.unit}</span>
                </div>
                <div className="w-full h-1 bg-editor-surface rounded-full overflow-hidden relative">
                    <div className="h-full rounded-full transition-all" style={{ width: `${normalised * 100}%`, background: lane.color }} />
                </div>
                <div className="flex justify-between text-[9.5px] font-mono text-editor-muted">
                    <span>{min}</span><span>{max}</span>
                </div>
            </div>

            {/* Scroll pattern presets */}
            {laneId === 'scrollPos' && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                        <span className="text-[10px] font-semibold tracking-wider text-editor-muted uppercase">SHAPE</span>
                        <span className="text-[9.5px] text-editor-muted">replaces automation</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {SCROLL_PATTERNS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => useStore.getState().setScrollKeyframes(preset.generate(useStore.getState().sequenceDuration))}
                                className="group flex flex-col gap-1 p-1.5 border border-editor-border bg-editor-panel hover:bg-editor-surface-hover hover:border-editor-accent-blue rounded transition-colors text-left"
                            >
                                <svg viewBox="0 0 64 26" className="w-full h-6" preserveAspectRatio="none">
                                    <path d={preset.thumb} fill="none" stroke="var(--color-editor-fill)" strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-editor-accent-orange transition-colors" />
                                </svg>
                                <span className="text-[9.5px] text-editor-muted group-hover:text-editor-fg transition-colors">{preset.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Interpolation mode hint */}
            {laneId !== 'scrollPos' && (
                <div>
                    <span className="text-[10px] font-semibold tracking-wider text-editor-muted uppercase block mb-1">Interpolation</span>
                    <p className="text-[10px] text-editor-muted leading-relaxed">Click a keyframe dot on this lane to edit its curve easing.</p>
                </div>
            )}
        </div>
    );
}

// ── Keyframe Selected ─────────────────────────────────────────────────────────
function KeyframeInspector({ kf }: { kf: { laneId: string; position: number; value: number } }) {
    // Hooks first — the early return below must not change the hook count.
    const selectedKeyframes = useStore(s => s.selectedKeyframes);
    const scrollKfs = useStore(s => s.scrollKeyframes);
    const paramKfs = useStore(s => s.paramKeyframes);

    const lane = LANE_CONFIG[kf.laneId as LaneId];
    if (!lane) return null;

    const selectedCount = selectedKeyframes.length;
    const isMulti = selectedCount > 1;

    // Clamp against the keyframe's OWN lane. A selection can span lanes, and using the
    // primary lane's range for all of them squashed e.g. Particle Depth (0–10) into 0–1.
    const clampForLane = (laneId: string, v: number): number => {
        const cfg = LANE_CONFIG[laneId as LaneId];
        if (!cfg) return v;
        return Math.max(cfg.range[0], Math.min(cfg.range[1], v));
    };

    const commitValueInput = (input: HTMLInputElement) => {
        const v = parseFloat(input.value);
        if (isNaN(v)) return;
        const clamped = clampForLane(kf.laneId, v);
        useStore.getState().updateParamKeyframeValue(kf.laneId, kf.position, clamped);
        useStore.getState().setSelectedKeyframe({ laneId: kf.laneId, position: kf.position, value: clamped });
        input.value = clamped.toFixed(4);
    };

    // Re-read the store after a batch edit so the readout reflects what actually landed.
    const syncSelectionFromStore = () => {
        const state = useStore.getState();
        state.setSelectedKeyframes(
            state.selectedKeyframes.map(item => {
                const source = item.laneId === 'scrollPos'
                    ? state.scrollKeyframes
                    : state.paramKeyframes[item.laneId] ?? [];
                const match = source.find(k => Math.abs(k.time - item.position) < 0.001);
                return match ? { ...item, value: match.value } : item;
            }),
        );
    };

    const getEasing = (laneId: string, position: number): string => {
        if (laneId === 'scrollPos') return scrollKfs.find(k => Math.abs(k.time - position) < 0.001)?.easing ?? 'linear';
        return (paramKfs[laneId] ?? []).find(k => Math.abs(k.time - position) < 0.001)?.easing ?? 'linear';
    };
    const allEasings = (isMulti ? selectedKeyframes : [kf]).map(s => getEasing(s.laneId, s.position));
    const activeEasing = allEasings.every(e => e === allEasings[0]) ? allEasings[0] : null;

    const timeLabel = new Date(kf.position * 1000).toISOString().slice(15, 22);

    return (
        <div className="flex flex-col gap-4">
            {/* Keyframe header */}
            <div className="flex items-center gap-2 pb-2 border-b border-editor-border">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: lane.color }} />
                <div className="flex-1 min-width-0">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-editor-fg truncate">{lane.name}</span>
                        {isMulti && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-editor-surface text-editor-fg border border-editor-border font-bold">
                                {selectedCount} sel
                            </span>
                        )}
                    </div>
                    <p className="text-[9.5px] text-editor-muted font-mono">{isMulti ? 'Shift+click to toggle' : `@ ${timeLabel}s`}</p>
                </div>
            </div>

            {/* Value readout */}
            <div className="p-3 border border-editor-border rounded-md bg-editor-panel flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10.5px] text-editor-muted">Value</span>
                    <span className="font-mono text-xs font-medium" style={{ color: lane.color }}>{kf.value.toFixed(4)}{lane.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10.5px] text-editor-muted">Position</span>
                    <span className="font-mono text-xs text-editor-muted">{kf.position.toFixed(3)}s</span>
                </div>
                {kf.laneId !== 'scrollPos' && !isMulti && (
                    <div className="mt-1 pt-2 border-t border-editor-border">
                        <label className="text-[9.5px] text-editor-muted block mb-1 uppercase font-semibold">Edit Value</label>
                        <input
                            key={`${kf.laneId}-${kf.position}`}
                            type="number"
                            className="w-full bg-editor-surface border border-editor-border rounded px-2 py-1 text-xs font-mono text-editor-fg focus:outline-none focus:border-editor-accent-blue"
                            defaultValue={kf.value.toFixed(4)}
                            step={(lane.range[1] - lane.range[0]) / 100}
                            min={lane.range[0]}
                            max={lane.range[1]}
                            onBlur={(e) => commitValueInput(e.currentTarget)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitValueInput(e.currentTarget);
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    e.currentTarget.value = kf.value.toFixed(4);
                                    e.currentTarget.blur();
                                }
                            }}
                        />
                    </div>
                )}

                {isMulti && (
                    <div className="mt-1 pt-2 border-t border-editor-border flex flex-col gap-2">
                        <label className="text-[9.5px] text-editor-muted block uppercase font-semibold">Batch Edit ({selectedCount} points)</label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-editor-muted shrink-0">Set All:</span>
                            <input
                                type="number"
                                placeholder="Value..."
                                className="w-full bg-editor-surface border border-editor-border rounded px-2 py-1 text-xs font-mono text-editor-fg focus:outline-none focus:border-editor-accent-blue"
                                step={(lane.range[1] - lane.range[0]) / 100}
                                min={lane.range[0]}
                                max={lane.range[1]}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const v = parseFloat((e.currentTarget as HTMLInputElement).value);
                                        if (!isNaN(v)) {
                                            useStore.getState().selectedKeyframes.forEach(item => {
                                                if (item.laneId !== 'scrollPos') {
                                                    useStore.getState().updateParamKeyframeValue(
                                                        item.laneId, item.position, clampForLane(item.laneId, v),
                                                    );
                                                }
                                            });
                                            syncSelectionFromStore();
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="text-editor-muted">Nudge:</span>
                            <div className="flex items-center gap-1">
                                {[-0.1, +0.1, -0.5, +0.5].map((offset) => (
                                    <button
                                        key={offset}
                                        className="px-1.5 py-0.5 rounded bg-editor-surface border border-editor-border text-[9.5px] font-mono text-editor-fg hover:bg-editor-surface-hover hover:border-editor-accent-blue transition-colors"
                                        onClick={() => {
                                            useStore.getState().selectedKeyframes.forEach(item => {
                                                if (item.laneId === 'scrollPos') return;
                                                const cfg = LANE_CONFIG[item.laneId as LaneId];
                                                if (!cfg) return;
                                                // Scale the nudge to the lane it lands on, not the primary one.
                                                const range = cfg.range[1] - cfg.range[0];
                                                const scaledOffset = offset * (range <= 1 ? 1 : range <= 5 ? 0.5 : 1);
                                                const curKfs = (useStore.getState().paramKeyframes[item.laneId] ?? []);
                                                const matchKf = curKfs.find(k => Math.abs(k.time - item.position) < 0.001);
                                                if (matchKf) {
                                                    useStore.getState().updateParamKeyframeValue(
                                                        item.laneId, item.position,
                                                        clampForLane(item.laneId, matchKf.value + scaledOffset),
                                                    );
                                                }
                                            });
                                            syncSelectionFromStore();
                                        }}
                                    >
                                        {offset > 0 ? `+${offset}` : offset}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Easing presets */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-semibold tracking-wider text-editor-muted uppercase">EASING</span>
                    <span className="text-[9px] text-editor-muted">Delete to remove</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                    {EASING_PRESETS.map((preset) => {
                        const isActive = preset.id === activeEasing;
                        return (
                            <button
                                key={preset.id}
                                // Applying a preset used to collapse the selection to the
                                // primary keyframe, so the first click acted on everything
                                // selected and the second one only on the last of them. The
                                // panel already re-renders from the keyframe subscriptions,
                                // so no reset is needed to refresh the highlight.
                                onClick={() => applyEasingToAllSelected(preset.id)}
                                className={`group flex flex-col gap-1 p-1.5 border rounded transition-colors text-left ${
                                    isActive
                                        ? 'bg-editor-surface-hover border-editor-accent-blue font-semibold'
                                        : 'bg-editor-panel border-editor-border hover:bg-editor-surface-hover'
                                }`}
                                title={preset.label}
                            >
                                <svg viewBox="0 0 40 40" className="w-full h-6">
                                    <path d={preset.d} fill="none" stroke="var(--color-editor-fill)" strokeOpacity={isActive ? '0.9' : '0.4'} strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                                <span className={`text-[9.5px] transition-colors ${isActive ? 'text-editor-fg font-semibold' : 'text-editor-muted group-hover:text-editor-fg'}`}>{preset.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom bezier editor */}
            {!isMulti && (
                <CustomBezierEditor
                    key={`${kf.laneId}-${kf.position}`}
                    laneId={kf.laneId}
                    position={kf.position}
                    laneColor={lane.color}
                />
            )}
        </div>
    );
}

// ── Root Inspector ────────────────────────────────────────────────────────────
export default function Inspector({ width = 240 }: { width?: number }) {
    const selectedLane = useStore(s => s.selectedLane);
    const selectedKeyframes = useStore(s => s.selectedKeyframes);
    const primaryKeyframe = selectedKeyframes.at(-1) ?? null;

    return (
        <aside className="border-l border-editor-border bg-editor-panel text-editor-fg flex flex-col overflow-y-auto thin-scrollbar" style={{ width }}>
            <div className="h-7 border-b border-editor-border flex items-center justify-between px-3 shrink-0">
                <span className="text-[10px] font-semibold text-editor-muted tracking-widest uppercase font-sans">INSPECTOR</span>
                <span className="font-mono text-[10px] text-editor-muted">lane</span>
            </div>
            <div className="p-3 flex-1">
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
