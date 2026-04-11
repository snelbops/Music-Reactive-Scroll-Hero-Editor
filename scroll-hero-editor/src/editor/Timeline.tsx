import { useRef, useEffect, useCallback, useState } from 'react';
import type React from 'react';
import { Play, Pause, Square, Music, Circle, ZoomIn, ZoomOut, Video, MousePointer2, Repeat, Eraser, Pen, Mouse, SlidersHorizontal, UploadCloud } from 'lucide-react';
import { onChange } from '@theatre/core';
import { useStore } from '../store/useStore';
import { useKickDrumData } from '../packages/useKickDrumData';
import { sheet, SEQUENCE_DURATION } from '../theatre/core';
import { interpolateParamAt, type ParamKf } from '../utils/interpolate';

const LABEL_W = 120;
const ZOOM_LEVELS = [1, 2, 4, 8];
const VB_W = 1000;
const VB_H = 40;

const PARAM_LANES = [
    { id: 'rotationSpeed', label: 'Rotation Speed', color: '#14b8a6', selBg: 'bg-teal-500/10',  min: 0,   max: 2   },
    { id: 'depth',         label: 'Particle Depth', color: '#22c55e', selBg: 'bg-green-500/10', min: 0,   max: 10  },
    { id: 'size',          label: 'Particle Size',  color: '#22c55e', selBg: 'bg-green-500/10', min: 0.1, max: 5   },
    { id: 'cssOpacity',    label: 'CSS Opacity',    color: '#3b82f6', selBg: 'bg-blue-500/10',  min: 0,   max: 1   },
] as const;

function buildParamPath(kfs: ParamKf[], min: number, max: number): string | null {
    if (kfs.length < 2) return null;
    const scaleX = VB_W / SEQUENCE_DURATION;
    const valueRange = max - min;
    const pts = kfs.map(kf => ({
        x: kf.time * scaleX,
        y: (1 - (kf.value - min) / valueRange) * VB_H,
    }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], curr = pts[i];
        const kfPrev = kfs[i - 1], kfCurr = kfs[i];
        if (kfPrev.easing === 'step') { d += ` H ${curr.x} V ${curr.y}`; continue; }
        // Bezier handles override easing
        if (kfPrev.handleOut || kfCurr.handleIn) {
            const dt = kfCurr.time - kfPrev.time;
            const outDt = kfPrev.handleOut?.dt ?? dt / 3;
            const outDv = kfPrev.handleOut?.dv ?? 0;
            const inDt  = kfCurr.handleIn?.dt  ?? -dt / 3;
            const inDv  = kfCurr.handleIn?.dv  ?? 0;
            const hox = prev.x + outDt * scaleX;
            const hoy = prev.y - (outDv / valueRange) * VB_H;
            const hix = curr.x + inDt * scaleX;
            const hiy = curr.y - (inDv / valueRange) * VB_H;
            d += ` C ${hox} ${hoy}, ${hix} ${hiy}, ${curr.x} ${curr.y}`;
            continue;
        }
        // Easing-specific control points — match the inspector thumbnail shapes exactly
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        switch (kfPrev.easing) {
            case 'linear':    d += ` L ${curr.x} ${curr.y}`; break;
            case 'easeIn':    d += ` C ${prev.x + dx*0.42} ${prev.y}, ${curr.x} ${curr.y}, ${curr.x} ${curr.y}`; break;
            case 'easeOut':   d += ` C ${prev.x} ${prev.y}, ${curr.x - dx*0.42} ${curr.y}, ${curr.x} ${curr.y}`; break;
            case 'spring':    d += ` C ${prev.x + dx*0.3} ${curr.y - dy*0.3}, ${prev.x + dx*0.6} ${curr.y + dy*0.15}, ${curr.x} ${curr.y}`; break;
            default:          d += ` C ${prev.x + dx*0.42} ${prev.y}, ${curr.x - dx*0.42} ${curr.y}, ${curr.x} ${curr.y}`; // easeInOut
        }
    }
    return d;
}

function buildParamFillPath(kfs: ParamKf[], min: number, max: number): string | null {
    const open = buildParamPath(kfs, min, max);
    if (!open) return null;
    const firstX = (kfs[0].time / SEQUENCE_DURATION) * VB_W;
    const lastX = (kfs[kfs.length - 1].time / SEQUENCE_DURATION) * VB_W;
    return `${open} L ${lastX} ${VB_H} L ${firstX} ${VB_H} Z`;
}

export default function Timeline({ height = 280 }: { height?: number }) {
    const isPlaying = useStore(state => state.isPlaying);
    const setIsPlaying = useStore(state => state.setIsPlaying);
    const scrollProgress = useStore(state => state.scrollProgress);
    const audioUrl = useStore(state => state.audioUrl);
    const isRecording = useStore(state => state.isRecording);
    const setIsRecording = useStore(state => state.setIsRecording);
    const recordedEvents = useStore(state => state.recordedEvents);
    const clearRecordedEvents = useStore(state => state.clearRecordedEvents);
    const isLoop = useStore(state => state.isLoop);
    const setIsLoop = useStore(state => state.setIsLoop);
    const setSceneProgress = useStore(state => state.setSceneProgress);
    const recordCountdown = useStore(state => state.recordCountdown);
    const setRecordCountdown = useStore(state => state.setRecordCountdown);
    const setRecordStartPosition = useStore(state => state.setRecordStartPosition);
    const activePreset = useStore(state => state.activePreset);
    
    const extractedFrames = useStore(s => s.extractedFrames);
    const rotationSpeed = useStore(s => s.rotationSpeed);
    const particleDepth = useStore(s => s.particleDepth);
    const particleSize = useStore(s => s.particleSize);
    const cssOpacity = useStore(s => s.cssOpacity);
    
    const setSelectedLane = useStore(s => s.setSelectedLane);
    const setSelectedKeyframe = useStore(s => s.setSelectedKeyframe);
    const setSelectedKeyframes = useStore(s => s.setSelectedKeyframes);
    const toggleSelectedKeyframe = useStore(s => s.toggleSelectedKeyframe);
    const selectedLane = useStore(s => s.selectedLane);
    const selectedKeyframes = useStore(s => s.selectedKeyframes);
    
    const scrollKeyframes = useStore(s => s.scrollKeyframes);
    const setScrollKeyframes = useStore(s => s.setScrollKeyframes);
    const clearScrollKeyframes = useStore(s => s.clearScrollKeyframes);
    const updateScrollKeyframeHandle = useStore(s => s.updateScrollKeyframeHandle);
    
    const paramKeyframes = useStore(s => s.paramKeyframes);
    const addParamKeyframe = useStore(s => s.addParamKeyframe);
    const setParamKeyframes = useStore(s => s.setParamKeyframes);
    const updateParamKeyframeHandle = useStore(s => s.updateParamKeyframeHandle);

    const [timelineZoom, setTimelineZoom] = useState(1);
    const [verticalZoom, setVerticalZoom] = useState(1);
    const [lanesWidth, setLanesWidth] = useState(0);
    const [activeTool, setActiveTool] = useState<'select' | 'pen' | 'eraser'>('select');
    const draggingHandleRef = useRef<{ kfTime: number; side: 'in' | 'out' } | null>(null);
    const draggingParamHandleRef = useRef<{ laneId: string; kfTime: number; side: 'in' | 'out' } | null>(null);
    // Reactive time display — updated by onChange so it refreshes each frame during playback
    const [seqTime, setSeqTime] = useState(() => sheet.sequence.position);
    const [laneHeights, setLaneHeights] = useState<Record<string, number>>({});
    const laneH = (id: string, def = 40) => laneHeights[id] ?? Math.round(def * verticalZoom);
    const makeLaneDrag = (id: string, def = 40) => (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const startY = e.clientY;
        const startH = laneH(id, def);
        const onMove = (ev: PointerEvent) => setLaneHeights(prev => ({ ...prev, [id]: Math.max(def, startH + (ev.clientY - startY)) }));
        const onUp = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    };
    const lanesRef = useRef<HTMLDivElement>(null);
    const scrollHistory = useRef<{ pos: number; val: number }[]>([]);
    // Tracks an in-progress keyframe drag: origTime of the dragged keyframe
    const draggingKfRef = useRef<{ origTime: number; value: number } | null>(null);
    const draggingParamKfRef = useRef<{ laneId: string; startTime: number; origTime: number; value: number } | null>(null);

    const { beats, waveform, isReady } = useKickDrumData(useStore(s => s.audioUrl));

    // Measure lanes width for playhead math
    useEffect(() => {
        const el = lanesRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => setLanesWidth(el.clientWidth));
        observer.observe(el);
        setLanesWidth(el.clientWidth);
        return () => observer.disconnect();
    }, []);

    // Ctrl+scroll = horizontal zoom, Alt+scroll = vertical zoom (non-passive so preventDefault works)
    useEffect(() => {
        const el = lanesRef.current;
        if (!el) return;
        let accumH = 0;
        let accumV = 0;
        const onWheel = (e: WheelEvent) => {
            if (e.altKey) {
                e.preventDefault();
                accumH += e.deltaY;
                const thresh = e.shiftKey ? 10 : 60;
                if (Math.abs(accumH) >= thresh) {
                    const steps = Math.trunc(accumH / thresh);
                    accumH -= steps * thresh;
                    setTimelineZoom(prev => {
                        const i = ZOOM_LEVELS.indexOf(prev);
                        // negative step means deltaY is positive (scroll down). 
                        // scroll up (deltaY < 0) -> positive step -> zoom in!
                        return ZOOM_LEVELS[Math.max(0, Math.min(ZOOM_LEVELS.length - 1, i - steps))];
                    });
                }
            } else if (e.metaKey || e.ctrlKey) {
                e.preventDefault();
                accumV += e.deltaY;
                const thresh = e.shiftKey ? 5 : 40;
                if (Math.abs(accumV) >= thresh) {
                    const steps = Math.trunc(accumV / thresh);
                    accumV -= steps * thresh;
                    setVerticalZoom(prev => Math.max(0.4, Math.min(4, +(prev - steps * 0.1).toFixed(2))));
                }
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // Reactive TIME display — onChange fires whenever Theatre.js position changes (play, scrub, loop)
    useEffect(() => {
        const unsub = onChange(sheet.sequence.pointer.position, (pos) => {
            setSeqTime(pos);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            if (e.key === 'v' || e.key === 'V') { setActiveTool('select'); return; }
            if (e.key === 'p' || e.key === 'P') { setActiveTool('pen'); return; }
            if (e.key === 'e' || e.key === 'E') { setActiveTool('eraser'); return; }
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            const kfs = useStore.getState().selectedKeyframes;
            if (kfs.length === 0) return;
            kfs.forEach(({ laneId, position }) => {
                if (laneId === 'scrollPos') {
                    useStore.getState().setScrollKeyframes(
                        useStore.getState().scrollKeyframes.filter(k => Math.abs(k.time - position) > 0.005)
                    );
                } else {
                    useStore.getState().removeParamKeyframe(laneId, position);
                }
            });
            useStore.getState().setSelectedKeyframes([]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (!isPlaying) return;
        const id = setInterval(() => {
            const pos = sheet.sequence.position / SEQUENCE_DURATION;
            const val = useStore.getState().scrollProgress;
            scrollHistory.current.push({ pos, val });
        }, 50);
        return () => clearInterval(id);
    }, [isPlaying]);

    const progressFromClientX = useCallback((clientX: number) => {
        const el = lanesRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const x = clientX - rect.left + el.scrollLeft - LABEL_W;
        const trackW = lanesWidth * timelineZoom - LABEL_W;
        return Math.max(0, Math.min(1, x / trackW));
    }, [lanesWidth, timelineZoom]);

    const seekTo = useCallback((progress: number) => {
        sheet.sequence.position = progress * SEQUENCE_DURATION;
        setSceneProgress(progress);
        scrollHistory.current = [];
        useStore.getState().applyParamKeyframesAt(progress * SEQUENCE_DURATION);
    }, [setSceneProgress]);

    const handleLanesMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const el = lanesRef.current;
        if (!el) return;
        if (e.clientX - el.getBoundingClientRect().left < LABEL_W) return;
        setIsPlaying(false);
        const p = progressFromClientX(e.clientX);
        if (p !== null) seekTo(p);
        const onMove = (ev: MouseEvent) => { const p = progressFromClientX(ev.clientX); if (p !== null) seekTo(p); };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [progressFromClientX, setIsPlaying, seekTo]);

    useEffect(() => {
        if (recordCountdown === null) return;
        if (recordCountdown === 0) {
            setRecordCountdown(null);
            setRecordStartPosition(sheet.sequence.position / SEQUENCE_DURATION);
            clearRecordedEvents();
            setIsRecording(true);
            setIsPlaying(false);
            setTimeout(() => setIsPlaying(true), 0);
            return;
        }
        const t = setTimeout(() => setRecordCountdown(recordCountdown - 1), 1000);
        return () => clearTimeout(t);
    }, [recordCountdown, setRecordCountdown, setRecordStartPosition, clearRecordedEvents, setIsRecording, setIsPlaying]);

    const toggleRecording = () => {
        if (isRecording) {
            setIsRecording(false);
        } else if (recordCountdown !== null) {
            setRecordCountdown(null);
        } else {
            setRecordCountdown(3);
        }
    };

    const paramCurrentValues: Record<string, number> = {
        rotationSpeed,
        depth: particleDepth,
        size: particleSize,
        cssOpacity,
    };

    const trackW = lanesWidth ? lanesWidth * timelineZoom - LABEL_W : 0;
    const seqPos = sheet.sequence.position / SEQUENCE_DURATION;
    const playheadLeft = lanesWidth ? LABEL_W + seqPos * trackW : LABEL_W;
    const scrollVbH = laneH('scrollPos', 48);
    const scrollPolyline = scrollHistory.current.length > 1
        ? scrollHistory.current.map(p => `${p.pos * VB_W},${(1 - p.val) * scrollVbH}`).join(' ')
        : '';

    const waveformBgPath = (() => {
        if (!isReady || waveform.length === 0) return null;
        const samples = 300;
        const step = waveform.length / samples;
        const cy = scrollVbH / 2;
        const maxAmp = cy * 0.8;
        const upper: string[] = [];
        const lower: string[] = [];
        for (let i = 0; i < samples; i++) {
            const x = (i / (samples - 1)) * VB_W;
            const val = (waveform[Math.floor(i * step)] as number) ?? 0;
            upper.push(`${x.toFixed(1)},${(cy - val * maxAmp).toFixed(1)}`);
            lower.push(`${x.toFixed(1)},${(cy + val * maxAmp).toFixed(1)}`);
        }
        return `M ${upper.join(' L ')} L ${[...lower].reverse().join(' L ')} Z`;
    })();

    return (
        <footer className="border-t border-editor-border bg-editor-bg flex flex-col z-20" style={{ height }}>
            <div className="h-9 border-b border-editor-border flex items-center px-4 justify-between bg-editor-panel shrink-0 select-none">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-[#808080]">
                        <span className="border-r border-[#333] pr-2 mr-1">
                            {([
                                { id: 'select' as const, Icon: MousePointer2, title: 'Select (V)' },
                                { id: 'pen'    as const, Icon: Pen,           title: 'Pen (P)'    },
                                { id: 'eraser' as const, Icon: Eraser,        title: 'Eraser (E)' },
                            ]).map(({ id, Icon, title }) => (
                                <button
                                    key={id}
                                    title={title}
                                    onClick={() => setActiveTool(id)}
                                    className={`p-1 rounded transition-colors ${activeTool === id ? 'text-[#d9d9d9]' : 'hover:text-[#d9d9d9]'}`}
                                >
                                    <Icon className="w-3.5 h-3.5 inline-block mx-0.5" />
                                </button>
                            ))}
                        </span>
                        <button className="p-1 hover:text-[#d9d9d9] text-[#d9d9d9]"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg></button>
                        <span className="border-l border-[#333] pl-2 ml-1 flex items-center gap-2">
                            <div className="flex items-center text-[#808080]">
                                <button className="p-1 hover:text-[#d9d9d9] disabled:opacity-30" title="Zoom out" onClick={() => { const i = ZOOM_LEVELS.indexOf(timelineZoom); if (i > 0) setTimelineZoom(ZOOM_LEVELS[i-1]); }} disabled={timelineZoom === ZOOM_LEVELS[0]}><ZoomOut className="w-3 h-3" /></button>
                                <div className="w-12 h-[2px] bg-[#333] relative cursor-ew-resize mx-1"
                                    onPointerDown={(e) => {
                                        e.currentTarget.setPointerCapture(e.pointerId);
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const startX = e.clientX;
                                        const startIndex = ZOOM_LEVELS.indexOf(timelineZoom);
                                        const onMove = (ev: PointerEvent) => {
                                            const delta = (ev.clientX - startX) / rect.width;
                                            const newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, Math.round(startIndex + delta * (ZOOM_LEVELS.length - 1))));
                                            setTimelineZoom(ZOOM_LEVELS[newIndex]);
                                        };
                                        const onUp = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
                                        document.addEventListener('pointermove', onMove);
                                        document.addEventListener('pointerup', onUp);
                                    }}
                                >
                                    <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-[#808080] rounded-sm pointer-events-none" style={{ left: `${(ZOOM_LEVELS.indexOf(timelineZoom) / (ZOOM_LEVELS.length - 1)) * 100}%`, transform: `translate(-50%, -50%)` }}></div>
                                </div>
                                <button className="p-1 hover:text-[#d9d9d9] disabled:opacity-30" title="Zoom in" onClick={() => { const i = ZOOM_LEVELS.indexOf(timelineZoom); if (i < ZOOM_LEVELS.length-1) setTimelineZoom(ZOOM_LEVELS[i+1]); }} disabled={timelineZoom === ZOOM_LEVELS[ZOOM_LEVELS.length-1]}><ZoomIn className="w-3 h-3" /></button>
                            </div>
                            <div className="flex items-center text-[#808080] ml-2">
                                <span className="text-[9px] font-mono mr-0.5">V</span>
                                <div className="w-12 h-[2px] bg-[#333] relative cursor-ew-resize mx-1"
                                    onPointerDown={e => {
                                        e.currentTarget.setPointerCapture(e.pointerId);
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const startX = e.clientX;
                                        const startV = verticalZoom;
                                        const onMove = (ev: PointerEvent) => {
                                            const delta = (ev.clientX - startX) / rect.width;
                                            setVerticalZoom(Math.max(0.4, Math.min(4, +(startV + delta * 3.6).toFixed(2))));
                                        };
                                        const onUp = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
                                        document.addEventListener('pointermove', onMove);
                                        document.addEventListener('pointerup', onUp);
                                    }}
                                >
                                    <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-[#808080] rounded-sm" style={{ left: `${((verticalZoom - 0.4) / 3.6) * 100}%`, transform: `translate(-50%, -50%)` }}></div>
                                </div>
                            </div>
                        </span>
                    </div>
                </div>
                <div className="absolute left-[70%] -translate-x-1/2 flex items-center space-x-10">
                    <div className="flex items-center space-x-4 text-[#808080]">
                        <button className="p-1 hover:text-[#d9d9d9] transition-colors"><svg className="w-3.5 h-3.5 rotate-180" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
                        <button
                            className="p-1 hover:text-[#d9d9d9] transition-colors"
                            onClick={() => { setIsPlaying(false); if (isRecording) setIsRecording(false); }}
                        >
                            <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button className="p-1 hover:text-[#d9d9d9] transition-colors text-[#d9d9d9]" onClick={() => setIsPlaying(!isPlaying)}>
                            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        </button>
                        <button
                            className={`p-1 rounded transition-colors ${isLoop ? 'text-[#d9d9d9]' : 'text-[#808080] hover:text-[#d9d9d9]'}`}
                            onClick={() => setIsLoop(!isLoop)}
                            title="Loop"
                        >
                            <Repeat className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className={`p-1 rounded transition-colors ml-4 border ${isRecording ? 'text-red-500 fill-red-500 border-red-500/40 bg-red-500/10' : 'hover:text-[#d9d9d9] border-transparent'}`}
                            onClick={toggleRecording}
                            title={isRecording ? 'Stop Recording' : 'Arm Recording'}
                        >
                            <Circle className="w-3 h-3 fill-current inline-block" /> <span className="text-[9px] ml-1">{isRecording ? 'REC' : 'ARM'}</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center text-[#d9d9d9] font-mono text-[11px] font-medium tracking-widest pl-4 pr-2">
                    {new Date(seqTime * 1000).toISOString().slice(11, 23).replace('.', ':')}
                </div>
            </div>
            <div ref={lanesRef} className="flex-1 overflow-y-auto overflow-x-auto thin-scrollbar relative select-none cursor-col-resize" onMouseDown={handleLanesMouseDown}>
                <div className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]" style={{ left: `${playheadLeft}px` }}>
                    <div className="w-3 h-3 bg-red-500 absolute -top-1 -left-[5.5px] rotate-45" />
                </div>
                <div style={{ width: timelineZoom > 1 ? `${timelineZoom * 100}%` : '100%', minHeight: '100%' }}>
                <div className="flex border-b border-editor-border group relative" style={{ height: laneH('audio') }}>
                    <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-editor-border bg-editor-panel text-editor-fg gap-2 sticky left-0 z-30 overflow-hidden">
                        <Music className="w-2.5 h-2.5 text-editor-accent-blue" />
                        <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">Audio Wave</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center">
                        <input type="file" accept="audio/*" className="hidden" id="timeline-audio-upload"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) useStore.getState().setAudioUrl(URL.createObjectURL(f)); }} />
                        {!audioUrl ? (
                            <button
                                className="flex items-center gap-1.5 px-2 text-[10px] text-editor-muted hover:text-editor-accent-orange transition-colors italic"
                                onClick={(e) => { e.stopPropagation(); document.getElementById('timeline-audio-upload')?.click(); }}
                            >
                                <UploadCloud className="w-3 h-3 shrink-0" /> Import audio...
                            </button>
                        ) : !isReady ? (
                            <span className="text-[10px] text-editor-accent-orange animate-pulse px-2">Analyzing audio...</span>
                        ) : (
                            <>
                                <div className="absolute inset-0 flex items-center gap-[1px] opacity-40 px-2 overflow-hidden">
                                    {Array.from(waveform).slice(0, 300).map((val: any, i: number) => (
                                        <div key={i} className="w-[2px] bg-editor-accent-orange min-w-[2px]" style={{ height: `${val * 80}%` }}></div>
                                    ))}
                                </div>
                                {beats.map((beatTime: number, i: number) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 w-[2px] bg-white z-10 group/beat hover:bg-editor-accent-orange cursor-pointer transition-colors"
                                        style={{ left: `${(beatTime / 10) * 100}%` }}
                                    >
                                        <div className="opacity-0 group-hover/beat:opacity-100 text-[8px] absolute top-1 left-2 font-mono text-editor-fg whitespace-nowrap bg-black/50 px-1 rounded">BEAT {beatTime.toFixed(1)}s</div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-editor-accent-blue/40 z-40" onPointerDown={makeLaneDrag('audio')} />
                </div>
                {extractedFrames.length > 0 && (
                <div className="flex border-b border-editor-border group relative" style={{ height: laneH('videoFrames') }}>
                    <div className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-editor-border sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors overflow-hidden ${activePreset === 'frames' ? 'bg-[#2a2a2a] ring-1 ring-inset ring-[#444]' : 'bg-editor-panel text-editor-fg hover:bg-editor-surface'}`}>
                        <div className="flex items-center gap-1 w-full">
                            <Video className="w-2.5 h-2.5 shrink-0 text-editor-accent-blue" />
                            <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">Video Frames</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#808080] truncate pl-[14px]">{extractedFrames.length} frames</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center bg-editor-accent-blue/[0.03]">
                        <div className="absolute inset-y-2 left-0 bg-editor-accent-blue/20 rounded-r" style={{ width: '100%' }} />
                        <div className="absolute inset-y-0 left-0 right-0 flex items-center px-3">
                            <span className="text-[9px] text-editor-accent-blue/60 font-mono z-10">
                                {activePreset === 'frames' ? '▶ Active in viewport' : 'Click "Load as Scene" to preview'}
                            </span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-editor-accent-blue/40 z-40" onPointerDown={makeLaneDrag('videoFrames')} />
                </div>
                )}
                <div className="flex border-b border-editor-border group relative" style={{ height: laneH('mouseX') }}>
                    <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-editor-border bg-editor-panel text-editor-fg gap-2 sticky left-0 z-30 overflow-hidden">
                        <MousePointer2 className="w-2.5 h-2.5 text-editor-accent-blue shrink-0" />
                        <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">Mouse X</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        {recordedEvents.length === 0 ? (
                            <span className="text-[10px] text-editor-muted italic px-2 leading-[40px]">Arm REC to capture...</span>
                        ) : (
                            <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} 100`} preserveAspectRatio="none">
                                <polyline
                                    fill="none"
                                    stroke="rgb(244,114,182)"
                                    strokeWidth="1.5"
                                    points={recordedEvents.map((ev) => `${ev.time * VB_W},${(1 - ev.x) * 100}`).join(' ')}
                                />
                            </svg>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-editor-accent-blue/40 z-40" onPointerDown={makeLaneDrag('mouseX')} />
                </div>
                <div className="flex border-b border-editor-border group relative" style={{ height: laneH('mouseY') }}>
                    <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-editor-border bg-editor-panel text-editor-fg gap-2 sticky left-0 z-30 overflow-hidden">
                        <MousePointer2 className="w-2.5 h-2.5 text-editor-accent-blue shrink-0" />
                        <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">Mouse Y</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        {recordedEvents.length === 0 ? (
                            <span className="text-[10px] text-editor-muted italic px-2 leading-[40px]">Arm REC to capture...</span>
                        ) : (
                            <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} 100`} preserveAspectRatio="none">
                                <polyline
                                    fill="none"
                                    stroke="rgb(251,191,36)"
                                    strokeWidth="1.5"
                                    points={recordedEvents.map((ev) => `${ev.time * VB_W},${(1 - ev.y) * 100}`).join(' ')}
                                />
                            </svg>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-editor-accent-blue/40 z-40" onPointerDown={makeLaneDrag('mouseY')} />
                </div>
                <div className="flex border-b border-editor-border group relative" style={{ height: scrollVbH }}>
                    <div
                        className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-editor-border sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors overflow-hidden ${isRecording ? 'ring-1 ring-inset ring-red-500/60 bg-red-500/10' : selectedLane === 'scrollPos' ? 'bg-[#2a2a2a]' : 'bg-editor-panel text-editor-fg hover:bg-editor-surface'}`}
                        onClick={() => setSelectedLane('scrollPos')}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1 overflow-hidden">
                                <Mouse className="w-2.5 h-2.5 shrink-0 text-[#3b82f6]" />
                                <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">Scroll POS</span>
                            </div>
                            {scrollKeyframes.length > 0 && (
                                <button
                                    className="text-[9px] text-[#808080] hover:text-[#d9d9d9] transition-colors shrink-0 ml-1"
                                    title="Clear scroll automation"
                                    onClick={(e) => { e.stopPropagation(); clearScrollKeyframes(); }}
                                >✕</button>
                            )}
                        </div>
                        <span className="text-[9px] font-mono text-[#808080] truncate pl-[14px]">{(scrollProgress * 100).toFixed(1)}%</span>
                    </div>
                    <div
                        className="flex-1 relative overflow-hidden bg-[#3b82f6]/[0.03]"
                        style={{ cursor: activeTool === 'pen' ? 'crosshair' : activeTool === 'eraser' ? 'cell' : undefined }}
                        onMouseDown={(e) => {
                            if (activeTool !== 'pen') return;
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const time = Math.max(0, Math.min(SEQUENCE_DURATION, ((e.clientX - rect.left) / rect.width) * SEQUENCE_DURATION));
                            const value = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                            useStore.getState().addScrollKeyframe(time, value);
                        }}
                    >
                        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} ${scrollVbH}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                            <defs>
                                <filter id="pglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                                <linearGradient id="scrollFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35"/>
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.04"/>
                                </linearGradient>
                            </defs>
                            <line x1="0" y1={scrollVbH} x2={VB_W} y2="0" stroke="rgba(59,130,246,0.12)" strokeWidth="1" strokeDasharray="4 4"/>
                            {waveformBgPath && (
                                <path
                                    d={waveformBgPath}
                                    fill="rgba(249,115,22,0.07)"
                                    stroke="rgba(249,115,22,0.15)"
                                    strokeWidth="0.5"
                                />
                            )}
                            {scrollPolyline && (
                                <polyline points={scrollPolyline} fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                            )}
                            {scrollKeyframes.length >= 2 && (() => {
                                const scaleX = VB_W / SEQUENCE_DURATION;
                                const pts = scrollKeyframes.map(kf => ({
                                    x: kf.time * scaleX,
                                    y: (1 - kf.value) * scrollVbH,
                                }));
                                let d = `M ${pts[0].x} ${pts[0].y}`;
                                for (let i = 1; i < pts.length; i++) {
                                    const prev = pts[i - 1], curr = pts[i];
                                    const dt = scrollKeyframes[i].time - scrollKeyframes[i - 1].time;
                                    const outDt = scrollKeyframes[i - 1].handleOut?.dt ?? dt / 3;
                                    const outDv = scrollKeyframes[i - 1].handleOut?.dv ?? 0;
                                    const inDt  = scrollKeyframes[i].handleIn?.dt  ?? -dt / 3;
                                    const inDv  = scrollKeyframes[i].handleIn?.dv  ?? 0;
                                    const hox = prev.x + outDt * scaleX;
                                    const hoy = prev.y - outDv * scrollVbH;
                                    const hix = curr.x + inDt * scaleX;
                                    const hiy = curr.y - inDv * scrollVbH;
                                    d += ` C ${hox} ${hoy}, ${hix} ${hiy}, ${curr.x} ${curr.y}`;
                                }
                                const fillD = `${d} L ${pts[pts.length - 1].x} ${scrollVbH} L ${pts[0].x} ${scrollVbH} Z`;
                                return (
                                    <>
                                        <path d={fillD} fill="url(#scrollFill)" stroke="none"/>
                                        <path d={d} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
                                    </>
                                );
                            })()}
                            {activeTool === 'select' && (() => {
                                const scaleX = VB_W / SEQUENCE_DURATION;
                                return scrollKeyframes.map((kf, idx) => {
                                    const isKfSelected = selectedKeyframes.some(s => s.laneId === 'scrollPos' && Math.abs(s.position - kf.time) < 0.005);
                                    if (!isKfSelected) return null;
                                    const kx = kf.time * scaleX;
                                    const ky = (1 - kf.value) * scrollVbH;
                                    const hasNext = idx < scrollKeyframes.length - 1;
                                    const hasPrev = idx > 0;
                                    const handleCircle = (hx: number, hy: number, side: 'in' | 'out', kfTime: number) => (
                                        <circle
                                            cx={hx} cy={hy} r="3"
                                            fill="#3b82f6" stroke="var(--color-editor-bg)" strokeWidth="1.5"
                                            className="cursor-move" style={{ pointerEvents: 'all' }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => {
                                                e.stopPropagation();
                                                (e.target as SVGCircleElement).setPointerCapture(e.pointerId);
                                                draggingHandleRef.current = { kfTime, side };
                                            }}
                                            onPointerMove={(e) => {
                                                if (!draggingHandleRef.current || !(e.buttons & 1)) return;
                                                const { kfTime: t, side: s } = draggingHandleRef.current;
                                                const ref = scrollKeyframes.find(k => Math.abs(k.time - t) < 0.005);
                                                if (!ref) return;
                                                const svgEl = (e.target as SVGCircleElement).ownerSVGElement!;
                                                const rect = svgEl.getBoundingClientRect();
                                                const svgX = ((e.clientX - rect.left) / rect.width) * VB_W;
                                                const svgY = ((e.clientY - rect.top) / rect.height) * scrollVbH;
                                                const newDt = (svgX - ref.time * scaleX) / scaleX;
                                                const newDv = -((svgY - (1 - ref.value) * scrollVbH) / scrollVbH);
                                                updateScrollKeyframeHandle(t, s, {
                                                    dt: s === 'out' ? Math.max(0, newDt) : Math.min(0, newDt),
                                                    dv: newDv,
                                                });
                                            }}
                                            onPointerUp={() => { draggingHandleRef.current = null; }}
                                        />
                                    );
                                    const outDt = hasNext ? (kf.handleOut?.dt ?? (scrollKeyframes[idx + 1].time - kf.time) / 3) : 0;
                                    const outDv = hasNext ? (kf.handleOut?.dv ?? 0) : 0;
                                    const inDt  = hasPrev ? (kf.handleIn?.dt  ?? -(kf.time - scrollKeyframes[idx - 1].time) / 3) : 0;
                                    const inDv  = hasPrev ? (kf.handleIn?.dv  ?? 0) : 0;
                                    const hox = kx + outDt * scaleX, hoy = ky - outDv * scrollVbH;
                                    const hix = kx + inDt  * scaleX, hiy = ky - inDv  * scrollVbH;
                                    return (
                                        <g key={idx}>
                                            {hasNext && <><line x1={kx} y1={ky} x2={hox} y2={hoy} stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke"/>{handleCircle(hox, hoy, 'out', kf.time)}</>}
                                            {hasPrev && <><line x1={kx} y1={ky} x2={hix} y2={hiy} stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke"/>{handleCircle(hix, hiy, 'in', kf.time)}</>}
                                        </g>
                                    );
                                });
                            })()}
                        </svg>
                        <div className="absolute inset-0 pointer-events-none">
                            {scrollKeyframes.map((kf, i) => {
                                const isSelected = selectedKeyframes.some(s => s.laneId === 'scrollPos' && Math.abs(s.position - kf.time) < 0.005);
                                const size = isSelected ? 8 : 6;
                                return (
                                    <div
                                        key={i}
                                        className={`absolute rounded-full border-[1.5px] ${activeTool === 'eraser' ? 'cursor-cell' : 'cursor-move'} pointer-events-auto`}
                                        style={{
                                            width: size, height: size,
                                            left: `calc(${(kf.time / SEQUENCE_DURATION) * 100}% - ${size/2}px)`,
                                            top: `calc(${(1 - kf.value) * 100}% - ${size/2}px)`,
                                            borderColor: isSelected ? '#3b82f6' : '#60a5fa',
                                            backgroundColor: isSelected ? '#60a5fa' : 'var(--color-editor-bg)',
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (activeTool === 'eraser') {
                                                useStore.getState().setScrollKeyframes(scrollKeyframes.filter(k => Math.abs(k.time - kf.time) > 0.005));
                                                return;
                                            }
                                            if (e.shiftKey) toggleSelectedKeyframe({ laneId: 'scrollPos', position: kf.time, value: kf.value });
                                            else setSelectedKeyframe({ laneId: 'scrollPos', position: kf.time, value: kf.value });
                                        }}
                                        onPointerDown={(e) => {
                                            if (activeTool === 'eraser') return;
                                            e.stopPropagation();
                                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                            draggingKfRef.current = { origTime: kf.time, value: kf.value };
                                        }}
                                        onPointerMove={(e) => {
                                            if (!draggingKfRef.current || !(e.buttons & 1)) return;
                                            const { origTime } = draggingKfRef.current;
                                            const container = (e.target as HTMLElement).parentElement!;
                                            const rect = container.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const y = e.clientY - rect.top;
                                            const newTime = Math.max(0, Math.min(SEQUENCE_DURATION, (x / rect.width) * SEQUENCE_DURATION));
                                            const newValue = Math.max(0, Math.min(1, 1 - y / rect.height));
                                            setScrollKeyframes(
                                                scrollKeyframes
                                                    .filter(k => Math.abs(k.time - origTime) > 0.005)
                                                    .concat({ time: newTime, value: newValue })
                                                    .sort((a, b) => a.time - b.time)
                                            );
                                            draggingKfRef.current = { origTime: newTime, value: newValue };
                                        }}
                                        onPointerUp={() => { draggingKfRef.current = null; }}
                                    />
                                );
                            })}
                            <div
                                className="absolute rounded-full border-[1.5px] border-[#3b82f6] shadow-[0_0_6px_rgba(59,130,246,0.8)] pointer-events-none"
                                style={{
                                    width: 6, height: 6,
                                    left: `calc(${seqPos * 100}% - 3px)`,
                                    top: `calc(${(1 - scrollProgress) * 100}% - 3px)`,
                                    backgroundColor: 'var(--color-editor-bg)'
                                }}
                            />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-[#3b82f6]/40 z-40" onPointerDown={makeLaneDrag('scrollPos', 48)} />
                </div>
                {PARAM_LANES.map(lane => {
                    const kfs = (paramKeyframes[lane.id] ?? []) as ParamKf[];
                    const currentVal = paramCurrentValues[lane.id];
                    const normalY = (v: number) => (1 - (v - lane.min) / (lane.max - lane.min)) * VB_H;
                    const curvePath = buildParamPath(kfs, lane.min, lane.max);
                    const fillPath = buildParamFillPath(kfs, lane.min, lane.max);
                    const isSelected = selectedLane === lane.id;
                    return (
                        <div key={lane.id} className="flex border-b border-editor-border group relative" style={{ height: laneH(lane.id) }}>
                            <div
                                className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-editor-border sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors overflow-hidden ${isSelected ? 'bg-[#2a2a2a]' : 'bg-editor-panel text-editor-fg hover:bg-editor-surface'}`}
                                onClick={() => setSelectedLane(lane.id)}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        <SlidersHorizontal className="w-2.5 h-2.5 shrink-0" style={{ color: lane.color }} />
                                        <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">{lane.label}</span>
                                    </div>
                                    {kfs.length > 0 && (
                                        <button
                                            className="text-[9px] text-[#808080] hover:text-[#d9d9d9] transition-colors shrink-0 ml-1"
                                            title="Clear keyframes"
                                            onClick={(e) => { e.stopPropagation(); useStore.getState().clearParamKeyframes(lane.id); }}
                                        >✕</button>
                                    )}
                                </div>
                                <span className="text-[9px] font-mono text-[#808080] truncate pl-[14px]">{currentVal.toFixed(lane.id === 'rotationSpeed' ? 3 : 2)}</span>
                            </div>
                            <div
                                className="flex-1 relative overflow-hidden"
                                style={{ cursor: activeTool === 'pen' ? 'crosshair' : activeTool === 'eraser' ? 'cell' : undefined }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    const el = lanesRef.current;
                                    if (!el) return;
                                    const rect = el.getBoundingClientRect();
                                    const x = e.clientX - rect.left + el.scrollLeft - LABEL_W;
                                    const laneTrackW = lanesWidth * timelineZoom - LABEL_W;
                                    const t = Math.max(0, Math.min(1, x / laneTrackW)) * SEQUENCE_DURATION;
                                    const existing = interpolateParamAt(kfs, t);
                                    addParamKeyframe(lane.id, t, existing ?? currentVal);
                                }}
                                onMouseDown={(e) => {
                                    if (activeTool !== 'pen') return;
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const time = Math.max(0, Math.min(SEQUENCE_DURATION, ((e.clientX - rect.left) / rect.width) * SEQUENCE_DURATION));
                                    const value = Math.max(lane.min, Math.min(lane.max, lane.min + (1 - (e.clientY - rect.top) / rect.height) * (lane.max - lane.min)));
                                    addParamKeyframe(lane.id, time, value);
                                }}
                            >
                                <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                    <defs>
                                        <linearGradient id={`fill-${lane.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={lane.color} stopOpacity="0.3"/>
                                            <stop offset="100%" stopColor={lane.color} stopOpacity="0.04"/>
                                        </linearGradient>
                                    </defs>
                                    {kfs.length === 0 && (
                                        <line x1="0" y1={normalY(currentVal)} x2={VB_W} y2={normalY(currentVal)} stroke={lane.color + '33'} strokeWidth="1" strokeDasharray="4 4"/>
                                    )}
                                    {fillPath && (
                                        <path d={fillPath} fill={`url(#fill-${lane.id})`} stroke="none"/>
                                    )}
                                    {curvePath && (
                                        <path d={curvePath} fill="none" stroke="var(--color-editor-fill)" strokeOpacity="0.7" strokeWidth="1" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
                                    )}
                                    {activeTool === 'select' && kfs.map((kf, idx) => {
                                        const isKfSelected = selectedKeyframes.some(s => s.laneId === lane.id && Math.abs(s.position - kf.time) < 0.005);
                                        if (!isKfSelected) return null;
                                        const scaleX = VB_W / SEQUENCE_DURATION;
                                        const valueRange = lane.max - lane.min;
                                        const kx = kf.time * scaleX;
                                        const ky = normalY(kf.value);
                                        const hasNext = idx < kfs.length - 1;
                                        const hasPrev = idx > 0;
                                        const outDt = hasNext ? (kf.handleOut?.dt ?? (kfs[idx+1].time - kf.time) / 3) : 0;
                                        const outDv = hasNext ? (kf.handleOut?.dv ?? 0) : 0;
                                        const inDt  = hasPrev ? (kf.handleIn?.dt  ?? -(kf.time - kfs[idx-1].time) / 3) : 0;
                                        const inDv  = hasPrev ? (kf.handleIn?.dv  ?? 0) : 0;
                                        const hox = kx + outDt * scaleX, hoy = ky - (outDv / valueRange) * VB_H;
                                        const hix = kx + inDt  * scaleX, hiy = ky - (inDv  / valueRange) * VB_H;
                                        const handleCircle = (hx: number, hy: number, side: 'in' | 'out') => (
                                            <circle
                                                cx={hx} cy={hy} r="3"
                                                fill={lane.color} stroke="var(--color-editor-bg)" strokeWidth="1.5"
                                                className="cursor-move" style={{ pointerEvents: 'all' }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    (e.target as SVGCircleElement).setPointerCapture(e.pointerId);
                                                    draggingParamHandleRef.current = { laneId: lane.id, kfTime: kf.time, side };
                                                }}
                                                onPointerMove={(e) => {
                                                    if (!draggingParamHandleRef.current || !(e.buttons & 1)) return;
                                                    const { laneId, kfTime, side: s } = draggingParamHandleRef.current;
                                                    const refKf = (paramKeyframes[laneId] ?? []).find(k => Math.abs(k.time - kfTime) < 0.005);
                                                    if (!refKf) return;
                                                    const svgEl = (e.target as SVGCircleElement).ownerSVGElement!;
                                                    const rect = svgEl.getBoundingClientRect();
                                                    const svgX = ((e.clientX - rect.left) / rect.width) * VB_W;
                                                    const svgY = ((e.clientY - rect.top) / rect.height) * VB_H;
                                                    const laneScaleX = VB_W / SEQUENCE_DURATION;
                                                    const newDt = (svgX - refKf.time * laneScaleX) / laneScaleX;
                                                    const newDv = -((svgY - normalY(refKf.value)) / VB_H) * valueRange;
                                                    updateParamKeyframeHandle(laneId, kfTime, s, {
                                                        dt: s === 'out' ? Math.max(0, newDt) : Math.min(0, newDt),
                                                        dv: newDv,
                                                    });
                                                }}
                                                onPointerUp={() => { draggingParamHandleRef.current = null; }}
                                            />
                                        );
                                        return (
                                            <g key={`h-${idx}`}>
                                                {hasNext && <><line x1={kx} y1={ky} x2={hox} y2={hoy} stroke={lane.color} strokeWidth="1" vectorEffect="non-scaling-stroke"/>{handleCircle(hox, hoy, 'out')}</>}
                                                {hasPrev && <><line x1={kx} y1={ky} x2={hix} y2={hiy} stroke={lane.color} strokeWidth="1" vectorEffect="non-scaling-stroke"/>{handleCircle(hix, hiy, 'in')}</>}
                                            </g>
                                        );
                                    })}
                        </svg>
                        <div className="absolute inset-0 pointer-events-none">
                            {kfs.map((kf, i) => {
                                const kfSelected = selectedKeyframes.some(s => s.laneId === lane.id && Math.abs(s.position - kf.time) < 0.005);
                                const size = kfSelected ? 8 : 6;
                                return (
                                    <div
                                        key={i}
                                        className={`absolute rounded-full border-[1.5px] ${activeTool === 'eraser' ? 'cursor-cell' : 'cursor-move'} pointer-events-auto`}
                                        style={{
                                            width: size, height: size,
                                            left: `calc(${(kf.time / SEQUENCE_DURATION) * 100}% - ${size/2}px)`,
                                            top: `calc(${normalY(kf.value) / VB_H * 100}% - ${size/2}px)`,
                                            borderColor: lane.color,
                                            backgroundColor: kfSelected ? lane.color : 'var(--color-editor-bg)',
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (activeTool === 'eraser') {
                                                useStore.getState().removeParamKeyframe(lane.id, kf.time);
                                                setSelectedKeyframe(null);
                                                return;
                                            }
                                            const updated = { laneId: lane.id, position: kf.time, value: kf.value };
                                            if (e.shiftKey) toggleSelectedKeyframe(updated);
                                            else setSelectedKeyframe(updated);
                                        }}
                                        onPointerDown={(e) => {
                                            e.stopPropagation();
                                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                            draggingParamKfRef.current = { laneId: lane.id, startTime: kf.time, origTime: kf.time, value: kf.value };
                                        }}
                                        onPointerMove={(e) => {
                                            if (!draggingParamKfRef.current || !(e.buttons & 1)) return;
                                            const { laneId, startTime: st, origTime } = draggingParamKfRef.current;
                                            const container = (e.target as HTMLElement).parentElement!;
                                            const rect = container.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const y = e.clientY - rect.top;
                                            const newTime = Math.max(0, Math.min(SEQUENCE_DURATION, (x / rect.width) * SEQUENCE_DURATION));
                                            const newValue = Math.max(lane.min, Math.min(lane.max, lane.min + (1 - y / rect.height) * (lane.max - lane.min)));
                                            const existingKf = (paramKeyframes[laneId] ?? []).find(k => Math.abs(k.time - origTime) < 0.005);
                                            const { easing: existingEasing = 'linear', handleOut, handleIn } = existingKf ?? {};
                                            setParamKeyframes(laneId, (paramKeyframes[laneId] ?? [])
                                                .filter(k => Math.abs(k.time - origTime) > 0.005)
                                                .concat({ time: newTime, value: newValue, easing: existingEasing, ...(handleOut ? { handleOut } : {}), ...(handleIn ? { handleIn } : {}) })
                                                .sort((a, b) => a.time - b.time) as ParamKf[]);
                                            draggingParamKfRef.current = { laneId, startTime: st, origTime: newTime, value: newValue };
                                        }}
                                        onPointerUp={() => {
                                            if (draggingParamKfRef.current) {
                                                const { laneId, startTime, origTime, value } = draggingParamKfRef.current;
                                                const updated = { laneId, position: origTime, value };
                                                const prev = useStore.getState().selectedKeyframes;
                                                const hadIt = prev.some(s => s.laneId === laneId && Math.abs(s.position - startTime) < 0.001);
                                                if (hadIt) {
                                                    setSelectedKeyframes(prev
                                                        .filter(s => !(s.laneId === laneId && Math.abs(s.position - startTime) < 0.001))
                                                        .concat(updated));
                                                } else {
                                                    setSelectedKeyframe(updated);
                                                }
                                            }
                                            draggingParamKfRef.current = null;
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            useStore.getState().removeParamKeyframe(lane.id, kf.time);
                                            setSelectedKeyframe(null);
                                        }}
                                    />
                                );
                            })}
                            {/* Live playhead dot */}
                            <div
                                className="absolute rounded-full border-[1.5px] pointer-events-none"
                                style={{
                                    width: 6, height: 6,
                                    left: `calc(${(sheet.sequence.position / SEQUENCE_DURATION) * 100}% - 3px)`,
                                    top: `calc(${normalY(currentVal) / VB_H * 100}% - 3px)`,
                                    borderColor: lane.color,
                                    backgroundColor: 'var(--color-editor-bg)',
                                    opacity: 0.8
                                }}
                            />
                        </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-editor-accent-purple/40 z-40" onPointerDown={makeLaneDrag(lane.id)} />
                        </div>
                    );
                })}

                {/* Lane: Click Events */}
                <div className="flex h-10 border-b border-editor-border group">
                    <div className="w-[120px] shrink-0 flex items-center gap-1 px-3 border-r border-editor-border bg-editor-panel z-30 overflow-hidden">
                        <MousePointer2 className="w-2.5 h-2.5 text-[#3b82f6] shrink-0" />
                        <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">Clicks</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center">
                        {recordedEvents.filter(e => e.click).length === 0 ? (
                            <span className="text-[10px] text-[#666] italic px-2">No clicks</span>
                        ) : (
                            recordedEvents.filter(e => e.click).map((ev, i) => (
                                <div
                                    key={i}
                                    className="absolute top-1 bottom-1 w-[2px] bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.6)] z-10"
                                    style={{ left: `${ev.time * 100}%` }}
                                    title={`Click @ ${(ev.time * 100).toFixed(1)}%`}
                                ></div>
                            ))
                        )}
                    </div>
                </div>
                </div>
            </div>
        </footer>
    );
}
