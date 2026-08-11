import React, { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { Play, Pause, Square, Music, Circle, ZoomIn, ZoomOut, Video, MousePointer2, Repeat, Eraser, Pen, Mouse, SlidersHorizontal, UploadCloud, Magnet, Undo2, Redo2, Grid } from 'lucide-react';
import { onChange } from '@theatre/core';
import { useStore } from '../store/useStore';
import { saveMediaFile } from '../utils/mediaStore';
import { useKickDrumData } from '../packages/useKickDrumData';
import { sheet, SEQUENCE_DURATION } from '../theatre/core';
import { interpolateParamAt, type ParamKf } from '../utils/interpolate';

const LABEL_W = 120;
const VB_W = 1000;
const VB_H = 40;

const PARAM_LANES = [
    { id: 'rotationSpeed', label: 'Rotation Speed', color: '#14b8a6', selBg: 'bg-teal-500/10',  min: 0,   max: 2   },
    { id: 'cssOpacity',    label: 'CSS Opacity',    color: '#3b82f6', selBg: 'bg-blue-500/10',  min: 0,   max: 1   },
    { id: 'depth',         label: 'Particle Depth (Add-on)', color: '#22c55e', selBg: 'bg-green-500/10', min: 0,   max: 10  },
    { id: 'size',          label: 'Particle Size (Add-on)',  color: '#22c55e', selBg: 'bg-green-500/10', min: 0.1, max: 5   },
] as const;

function buildParamPath(kfs: ParamKf[], min: number, max: number, seqDur = 10): string | null {
    if (kfs.length < 2) return null;
    const valueRange = max - min;
    const pts = kfs.map(kf => ({
        x: (kf.time / seqDur) * VB_W,
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
            const hox = prev.x + (outDt / seqDur) * VB_W;
            const hoy = prev.y - (outDv / valueRange) * VB_H;
            const hix = curr.x + (inDt / seqDur) * VB_W;
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

function buildParamFillPath(kfs: ParamKf[], min: number, max: number, seqDur = 10): string | null {
    const open = buildParamPath(kfs, min, max, seqDur);
    if (!open) return null;
    const firstX = (kfs[0].time / seqDur) * VB_W;
    const lastX = (kfs[kfs.length - 1].time / seqDur) * VB_W;
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
    const sequenceDuration = useStore(s => s.sequenceDuration);
    const loopStart = useStore(s => s.loopStart);
    const loopEnd = useStore(s => s.loopEnd);
    const timeSelection = useStore(s => s.timeSelection);
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
    
    const padSwitchEvents = useStore(s => s.padSwitchEvents);
    const clearPadSwitchEvents = useStore(s => s.clearPadSwitchEvents);
    const removePadSwitchEvent = useStore(s => s.removePadSwitchEvent);
    const videoPads = useStore(s => s.videoPads);
    const activeVideoPadIdx = useStore(s => s.activeVideoPadIdx);

    const paramKeyframes = useStore(s => s.paramKeyframes);
    const addParamKeyframe = useStore(s => s.addParamKeyframe);
    const setParamKeyframes = useStore(s => s.setParamKeyframes);
    const updateParamKeyframeHandle = useStore(s => s.updateParamKeyframeHandle);

    const timelineZoom = useStore(s => s.timelineZoom);
    const setTimelineZoom = useStore(s => s.setTimelineZoom);
    const verticalZoom = useStore(s => s.verticalZoom);
    const setVerticalZoom = useStore(s => s.setVerticalZoom);
    const [lanesWidth, setLanesWidth] = useState(0);
    const [activeTool, setActiveTool] = useState<'select' | 'pen' | 'eraser'>('select');
    const [snapToBeat, setSnapToBeat] = useState(false);
    const [isolatedLane, setIsolatedLane] = useState<'all' | 'scrollPos' | 'rotationSpeed' | 'cssOpacity' | 'depth' | 'size'>('all');
    const [showRhythmModal, setShowRhythmModal] = useState(false);
    const loopTrackRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const audioUploadInputRef = useRef<HTMLInputElement>(null);
    const canUndo = useStore(s => s._past.length > 0);
    const canRedo = useStore(s => s._future.length > 0);
    const timelineRootRef = useRef<HTMLElement>(null);
    const hasMovedKfRef = useRef<boolean>(false);
    const draggingHandleRef = useRef<{ kfTime: number; side: 'in' | 'out' } | null>(null);
    const draggingParamHandleRef = useRef<{ laneId: string; kfTime: number; side: 'in' | 'out' } | null>(null);
    const draggingParamKfRef = useRef<any>(null);
    const [marqueeBox, setMarqueeBox] = useState<{ laneId: string; startX: number; startY: number; currentX: number; currentY: number } | null>(null);
    // Reactive time display — updated by onChange so it refreshes each frame during playback
    const [seqTime, setSeqTime] = useState(() => sheet.sequence.position);
    const [laneHeights, setLaneHeights] = useState<Record<string, number>>({});
    const laneH = (id: string, def = 40) => laneHeights[id] ?? Math.round(def * verticalZoom);

    const [audioMenu, setAudioMenu] = useState<{ visible: boolean; x: number; y: number; clickTime: number } | null>(null);
    const [audioTargetLane, setAudioTargetLane] = useState<string>('scrollPos');
    const [shapeIterations, setShapeIterations] = useState<number>(4);
    const [audioGain, setAudioGain] = useState<number>(75);
    const [contextMenuTab, setContextMenuTab] = useState<'rhythm' | 'shapes' | 'presets'>('rhythm');
    const [presetNameInput, setPresetNameInput] = useState<string>('');
    const [customPresets, setCustomPresets] = useState<Array<{ id: string; name: string; mode: string; audioGain: number; shapeIterations: number }>>(() => {
        try {
            const raw = localStorage.getItem('scroll-hero-custom-rhythm-presets');
            return raw ? JSON.parse(raw) : [
                { id: 'p1', name: 'Subtle RMS (45%)', mode: 'envelope', audioGain: 45, shapeIterations: 4 },
                { id: 'p2', name: 'Punchy Kick (120%)', mode: 'bounce', audioGain: 120, shapeIterations: 4 },
                { id: 'p3', name: 'Stutter Cut (4-Cycle)', mode: 'stutter', audioGain: 75, shapeIterations: 4 },
            ];
        } catch (e) {
            return [];
        }
    });

    const saveCustomPreset = (mode: string) => {
        const name = presetNameInput.trim() || `${mode.toUpperCase()} (${audioGain}%)`;
        const newP = { id: `preset-${Date.now()}`, name, mode, audioGain, shapeIterations };
        const updated = [newP, ...customPresets];
        setCustomPresets(updated);
        try { localStorage.setItem('scroll-hero-custom-rhythm-presets', JSON.stringify(updated)); } catch (e) {}
        setPresetNameInput('');
    };

    const deleteCustomPreset = (id: string) => {
        const updated = customPresets.filter(p => p.id !== id);
        setCustomPresets(updated);
        try { localStorage.setItem('scroll-hero-custom-rhythm-presets', JSON.stringify(updated)); } catch (e) {}
    };

    const generateRhythmCurveForLane = (
        targetLane: string,
        mode: 'envelope' | 'bounce' | 'stutter' | 'wave' | 'ramp' | 'jumps' | 'ducking' | 'flutter',
        onlyLoopRegion: boolean = true
    ) => {
        useStore.getState().pushHistory();
        const seqDur = useStore.getState().sequenceDuration;
        const timeSel = useStore.getState().timeSelection;
        const isLoopActive = useStore.getState().isLoop;

        let lStart = 0;
        let lEnd = seqDur;

        if (timeSel) {
            lStart = timeSel.start;
            lEnd = timeSel.end;
        } else if (onlyLoopRegion && isLoopActive) {
            lStart = useStore.getState().loopStart || 0;
            lEnd = useStore.getState().loopEnd || seqDur;
        }

        const laneConfigs: Record<string, { min: number; max: number }> = {
            scrollPos: { min: 0, max: 1 },
            rotationSpeed: { min: 0, max: 0.05 },
            depth: { min: 5, max: 60 },
            size: { min: 0.1, max: 3 },
            cssOpacity: { min: 0, max: 1 },
        };
        const cfg = laneConfigs[targetLane] ?? { min: 0, max: 1 };
        const range = cfg.max - cfg.min;
        const gainMult = audioGain / 100;

        const rawBeats = beats.filter(bt => bt >= lStart && bt <= lEnd);
        const rangeBeats = rawBeats.length >= 2
            ? rawBeats
            : Array.from(
                { length: Math.max(2, Math.floor((lEnd - lStart) / 0.25)) },
                (_, i) => +(lStart + i * 0.25).toFixed(2)
            );

        const newSectionKfs: { time: number; value: number; easing?: string }[] = [];

        // Boundary anchor at start of selection
        newSectionKfs.push({ time: +lStart.toFixed(2), value: cfg.min });

        if (mode === 'envelope' && waveform.length > 0) {
            const step = seqDur / waveform.length;
            waveform.forEach((val: number, idx: number) => {
                const t = idx * step;
                if (t >= lStart && t <= lEnd) {
                    const normVal = cfg.min + val * range * gainMult;
                    newSectionKfs.push({ time: +t.toFixed(2), value: +Math.min(cfg.max, Math.max(cfg.min, normVal)).toFixed(3) });
                }
            });
        } else if (mode === 'bounce') {
            rangeBeats.forEach((bt) => {
                if (bt - 0.08 >= lStart) newSectionKfs.push({ time: +(bt - 0.08).toFixed(2), value: cfg.min });
                const peakVal = cfg.min + range * gainMult;
                newSectionKfs.push({ time: +bt.toFixed(2), value: +Math.min(cfg.max, Math.max(cfg.min, peakVal)).toFixed(3) });
                if (bt + 0.08 <= lEnd) newSectionKfs.push({ time: +(bt + 0.08).toFixed(2), value: cfg.min });
            });
        } else if (mode === 'stutter') {
            rangeBeats.forEach((bt, idx) => {
                const val = cfg.min + (idx / Math.max(1, rangeBeats.length - 1)) * range * gainMult;
                newSectionKfs.push({ time: +bt.toFixed(2), value: +Math.min(cfg.max, Math.max(cfg.min, val)).toFixed(3), easing: 'step' });
            });
        } else if (mode === 'wave') {
            rangeBeats.forEach((bt, idx) => {
                const normVal = cfg.min + ((Math.sin((idx * Math.PI) / 2) + 1) / 2) * range * gainMult;
                newSectionKfs.push({ time: +bt.toFixed(2), value: +Math.min(cfg.max, Math.max(cfg.min, normVal)).toFixed(3) });
            });
        } else if (mode === 'ramp') {
            const barSize = 4;
            rangeBeats.forEach((bt, idx) => {
                const barProgress = (idx % barSize) / (barSize - 1);
                const val = cfg.min + barProgress * range * gainMult;
                newSectionKfs.push({ time: +bt.toFixed(2), value: +Math.min(cfg.max, Math.max(cfg.min, val)).toFixed(3) });
            });
        } else if (mode === 'ducking') {
            // Ducking: peak is full, dip scales with gainMult (deeper dip = more intense)
            rangeBeats.forEach((bt) => {
                const topVal = cfg.min + range * gainMult;
                if (bt - 0.08 >= lStart) newSectionKfs.push({ time: +(bt - 0.08).toFixed(2), value: +Math.min(cfg.max, topVal).toFixed(3) });
                newSectionKfs.push({ time: +bt.toFixed(2), value: cfg.min });
                if (bt + 0.08 <= lEnd) newSectionKfs.push({ time: +(bt + 0.08).toFixed(2), value: +Math.min(cfg.max, topVal).toFixed(3) });
            });
        } else if (mode === 'flutter') {
            rangeBeats.forEach((bt) => {
                for (let sub = 0; sub < 4; sub++) {
                    const t = bt + sub * 0.12;
                    if (t <= lEnd) {
                        const val = sub % 2 === 0 ? cfg.min + range * gainMult : cfg.min;
                        newSectionKfs.push({ time: +t.toFixed(2), value: +Math.min(cfg.max, Math.max(cfg.min, val)).toFixed(3) });
                    }
                }
            });
        } else if (mode === 'jumps') {
            rangeBeats.forEach((bt) => {
                const val = cfg.min + (0.1 + Math.random() * 0.8) * range * gainMult;
                newSectionKfs.push({ time: +bt.toFixed(2), value: +Math.min(cfg.max, Math.max(cfg.min, val)).toFixed(3), easing: 'step' });
            });
        }

        // Boundary anchor at end of selection
        newSectionKfs.push({ time: +lEnd.toFixed(2), value: cfg.min });

        if (targetLane === 'scrollPos') {
            const existing = useStore.getState().scrollKeyframes;
            const outside = existing.filter(k => k.time < lStart || k.time > lEnd);
            const merged = [...outside, ...newSectionKfs].sort((a, b) => a.time - b.time);
            useStore.getState().setScrollKeyframes(merged);
        } else {
            const existing = (useStore.getState().paramKeyframes[targetLane] ?? []) as ParamKf[];
            const outside = existing.filter(k => k.time < lStart || k.time > lEnd);
            const paramKfs: ParamKf[] = newSectionKfs.map(k => ({
                time: k.time,
                value: k.value,
                easing: k.easing || 'linear'
            }));
            const merged = [...outside, ...paramKfs].sort((a, b) => a.time - b.time);
            useStore.getState().setParamKeyframes(targetLane, merged);
        }

        setAudioMenu(null);
        setShowRhythmModal(false);
    };

    const generateShapeCurveForSelection = (
        targetLane: string,
        shapeType: 'sine' | 'triangle' | 'rampUp' | 'rampDown' | 'square' | 'easeIn' | 'easeOut' | 'sCurve',
        iterations: number = 4
    ) => {
        useStore.getState().pushHistory();
        const seqDur = useStore.getState().sequenceDuration;
        const timeSel = useStore.getState().timeSelection;
        const isLoopActive = useStore.getState().isLoop;

        let lStart = 0;
        let lEnd = seqDur;

        if (timeSel) {
            lStart = timeSel.start;
            lEnd = timeSel.end;
        } else if (isLoopActive) {
            lStart = useStore.getState().loopStart || 0;
            lEnd = useStore.getState().loopEnd || seqDur;
        }

        const dur = Math.max(0.1, lEnd - lStart);
        const laneConfigs: Record<string, { min: number; max: number }> = {
            scrollPos: { min: 0, max: 1 },
            rotationSpeed: { min: 0, max: 0.05 },
            depth: { min: 5, max: 60 },
            size: { min: 0.1, max: 3 },
            cssOpacity: { min: 0, max: 1 },
        };
        const cfg = laneConfigs[targetLane] ?? { min: 0, max: 1 };
        const range = cfg.max - cfg.min;
        const gainMult = audioGain / 100;

        const numSteps = Math.max(16, iterations * 16);
        const newSectionKfs: { time: number; value: number; easing?: string }[] = [];

        for (let i = 0; i <= numSteps; i++) {
            const progress = i / numSteps;
            const t = lStart + progress * dur;
            const cycleProgress = (progress * iterations) % 1;

            let normVal = 0;

            switch (shapeType) {
                case 'sine':
                    normVal = (Math.sin(cycleProgress * 2 * Math.PI - Math.PI / 2) + 1) / 2;
                    break;
                case 'triangle':
                    normVal = 1 - Math.abs((cycleProgress - 0.5) * 2);
                    break;
                case 'rampUp':
                    normVal = cycleProgress;
                    break;
                case 'rampDown':
                    normVal = 1 - cycleProgress;
                    break;
                case 'square':
                    normVal = cycleProgress < 0.5 ? 1 : 0;
                    break;
                case 'easeIn':
                    normVal = Math.pow(cycleProgress, 3);
                    break;
                case 'easeOut':
                    normVal = 1 - Math.pow(1 - cycleProgress, 3);
                    break;
                case 'sCurve':
                    normVal = cycleProgress < 0.5
                        ? 4 * Math.pow(cycleProgress, 3)
                        : 1 - Math.pow(-2 * cycleProgress + 2, 3) / 2;
                    break;
                default:
                    normVal = cycleProgress;
            }

            const val = cfg.min + normVal * range * gainMult;
            const easingStr = shapeType === 'square' ? 'step' : 'linear';
            newSectionKfs.push({ time: +t.toFixed(3), value: +Math.min(cfg.max, Math.max(cfg.min, val)).toFixed(3), easing: easingStr });
        }

        if (targetLane === 'scrollPos') {
            const existing = useStore.getState().scrollKeyframes;
            const outside = existing.filter(k => k.time < lStart || k.time > lEnd);
            const merged = [...outside, ...newSectionKfs].sort((a, b) => a.time - b.time);
            useStore.getState().setScrollKeyframes(merged);
        } else {
            const existing = (useStore.getState().paramKeyframes[targetLane] ?? []) as ParamKf[];
            const outside = existing.filter(k => k.time < lStart || k.time > lEnd);
            const paramKfs: ParamKf[] = newSectionKfs.map(k => ({
                time: k.time,
                value: k.value,
                easing: k.easing || 'linear'
            }));
            const merged = [...outside, ...paramKfs].sort((a, b) => a.time - b.time);
            useStore.getState().setParamKeyframes(targetLane, merged);
        }

        setAudioMenu(null);
    };

    /** Scale amplitude of all keyframes in selection across all lanes. Scales away from cfg.min. */
    const scaleSelectionKeyframes = (targetLane: string, scaleRatio: number) => {
        const timeSel = useStore.getState().timeSelection;
        const isLoopActive = useStore.getState().isLoop;
        const lStart = timeSel ? timeSel.start : (isLoopActive ? useStore.getState().loopStart || 0 : 0);
        const lEnd = timeSel ? timeSel.end : (isLoopActive ? useStore.getState().loopEnd || 10 : 10);
        useStore.getState().pushHistory();

        const laneConfigs: Record<string, { min: number; max: number }> = {
            scrollPos: { min: 0, max: 1 },
            rotationSpeed: { min: 0, max: 0.05 },
            depth: { min: 5, max: 60 },
            size: { min: 0.1, max: 3 },
            cssOpacity: { min: 0, max: 1 },
        };

        const applyToLane = (lane: string) => {
            const cfg = laneConfigs[lane] ?? { min: 0, max: 1 };
            if (lane === 'scrollPos') {
                const kfs = useStore.getState().scrollKeyframes;
                const updated = kfs.map(k => {
                    if (k.time >= lStart && k.time <= lEnd) {
                        const scaled = cfg.min + (k.value - cfg.min) * scaleRatio;
                        return { ...k, value: Math.max(cfg.min, Math.min(cfg.max, +scaled.toFixed(4))) };
                    }
                    return k;
                });
                useStore.getState().setScrollKeyframes(updated);
            } else {
                const kfs = (useStore.getState().paramKeyframes[lane] ?? []) as ParamKf[];
                if (!kfs.length) return;
                const updated = kfs.map(k => {
                    if (k.time >= lStart && k.time <= lEnd) {
                        const scaled = cfg.min + (k.value - cfg.min) * scaleRatio;
                        return { ...k, value: Math.max(cfg.min, Math.min(cfg.max, +scaled.toFixed(4))) };
                    }
                    return k;
                });
                useStore.getState().setParamKeyframes(lane, updated);
            }
        };

        if (targetLane === '__all__') {
            ['scrollPos', 'rotationSpeed', 'depth', 'size', 'cssOpacity'].forEach(applyToLane);
        } else {
            applyToLane(targetLane);
        }
    };

    /** Shift (translate) keyframe values up/down by delta in normalised 0–1 space, applied to all lanes in selection. */
    const shiftSelectionKeyframes = (targetLane: string, normDelta: number) => {
        const timeSel = useStore.getState().timeSelection;
        const isLoopActive = useStore.getState().isLoop;
        const lStart = timeSel ? timeSel.start : (isLoopActive ? useStore.getState().loopStart || 0 : 0);
        const lEnd = timeSel ? timeSel.end : (isLoopActive ? useStore.getState().loopEnd || 10 : 10);

        const laneConfigs: Record<string, { min: number; max: number }> = {
            scrollPos: { min: 0, max: 1 },
            rotationSpeed: { min: 0, max: 0.05 },
            depth: { min: 5, max: 60 },
            size: { min: 0.1, max: 3 },
            cssOpacity: { min: 0, max: 1 },
        };

        const applyToLane = (lane: string) => {
            const cfg = laneConfigs[lane] ?? { min: 0, max: 1 };
            const delta = normDelta * (cfg.max - cfg.min);
            if (lane === 'scrollPos') {
                const kfs = useStore.getState().scrollKeyframes;
                const updated = kfs.map(k => {
                    if (k.time >= lStart && k.time <= lEnd) {
                        return { ...k, value: Math.max(cfg.min, Math.min(cfg.max, +(k.value + delta).toFixed(4))) };
                    }
                    return k;
                });
                useStore.getState().setScrollKeyframes(updated);
            } else {
                const kfs = (useStore.getState().paramKeyframes[lane] ?? []) as ParamKf[];
                if (!kfs.length) return;
                const updated = kfs.map(k => {
                    if (k.time >= lStart && k.time <= lEnd) {
                        return { ...k, value: Math.max(cfg.min, Math.min(cfg.max, +(k.value + delta).toFixed(4))) };
                    }
                    return k;
                });
                useStore.getState().setParamKeyframes(lane, updated);
            }
        };

        if (targetLane === '__all__') {
            ['scrollPos', 'rotationSpeed', 'depth', 'size', 'cssOpacity'].forEach(applyToLane);
        } else {
            applyToLane(targetLane);
        }
    };

    /**
     * Pointer-drag on the selection overlay.
     * Alt + drag ↑↓  →  scale amplitude (away from min)
     * Shift + drag ↑↓ → translate values up/down
    /** Select all keyframes across all lanes that fall within [start, end] time range. */
    const selectKeyframesInRange = (start: number, end: number) => {
        const kfs: Array<{ laneId: string; position: number; value: number }> = [];
        const scrollKfs = useStore.getState().scrollKeyframes;
        scrollKfs.forEach(k => {
            if (k.time >= start - 0.01 && k.time <= end + 0.01) {
                kfs.push({ laneId: 'scrollPos', position: k.time, value: k.value });
            }
        });
        const paramKfsMap = useStore.getState().paramKeyframes;
        Object.entries(paramKfsMap).forEach(([lId, list]) => {
            (list as ParamKf[]).forEach(k => {
                if (k.time >= start - 0.01 && k.time <= end + 0.01) {
                    kfs.push({ laneId: lId, position: k.time, value: k.value });
                }
            });
        });
        useStore.getState().setSelectedKeyframes(kfs);
    };

    /**
     * Pointer-drag on the selection overlay area.
     * Dragging up/down shifts intensity for all selected keyframes.
     * Alt + drag up/down scales intensity away from minimum.
     */
    const handleSelectionDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);

        useStore.getState().pushHistory();
        const startY = e.clientY;
        const isAlt = e.altKey;
        let lastNormDelta = 0;

        const onMove = (ev: PointerEvent) => {
            const deltaPixels = startY - ev.clientY; // up = positive
            const normDelta = deltaPixels * 0.005; // normalised units per pixel
            const stepDelta = normDelta - lastNormDelta;
            lastNormDelta = normDelta;

            if (isAlt) {
                const ratio = 1 + stepDelta * 2;
                if (ratio > 0) scaleSelectionKeyframes('__all__', ratio);
            } else {
                shiftSelectionKeyframes('__all__', stepDelta);
            }
        };

        const onUp = () => {
            target.removeEventListener('pointermove', onMove as any);
            target.removeEventListener('pointerup', onUp as any);
        };
        target.addEventListener('pointermove', onMove as any);
        target.addEventListener('pointerup', onUp as any);
    };

    const generateRhythmCurve = (mode: 'bounce' | 'stutter' | 'wave' | 'ramp' | 'jumps') => {
        generateRhythmCurveForLane('scrollPos', mode, true);
    };

    const smoothCurrentScrollCurve = () => {
        const kfs = useStore.getState().scrollKeyframes;
        if (kfs.length < 3) return;
        useStore.getState().pushHistory();

        const smoothed = kfs.map((kf, i) => {
            if (i === 0 || i === kfs.length - 1) return kf;
            const prev = kfs[i - 1].value;
            const curr = kf.value;
            const next = kfs[i + 1].value;
            const val = +(prev * 0.25 + curr * 0.5 + next * 0.25).toFixed(3);
            return { ...kf, value: val };
        });

        const thinned: typeof kfs = [];
        smoothed.forEach((kf) => {
            const last = thinned[thinned.length - 1];
            if (!last || Math.abs(kf.time - last.time) >= 0.06 || Math.abs(kf.value - last.value) >= 0.04) {
                thinned.push(kf);
            }
        });

        if (thinned[thinned.length - 1]?.time !== kfs[kfs.length - 1].time) {
            thinned.push(kfs[kfs.length - 1]);
        }

        useStore.getState().setScrollKeyframes(thinned.sort((a, b) => a.time - b.time));
    };

    const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const seqDurTrack = useStore.getState().sequenceDuration;
        const startTime = Math.max(0, Math.min(seqDurTrack, ((e.clientX - rect.left) / rect.width) * seqDurTrack));

        if (!e.shiftKey && activeTool !== 'select') {
            useStore.getState().setTimeSelection(null);
            useStore.getState().setSelectedKeyframes([]);
            return;
        }

        e.stopPropagation();
        target.setPointerCapture(e.pointerId);

        const onMove = (ev: PointerEvent) => {
            if (ev.buttons & 1) {
                const r = target.getBoundingClientRect();
                const currTime = Math.max(0, Math.min(seqDurTrack, ((ev.clientX - r.left) / r.width) * seqDurTrack));
                const start = +Math.min(startTime, currTime).toFixed(2);
                const end = +Math.max(startTime, currTime).toFixed(2);
                if (end - start > 0.05) {
                    useStore.getState().setTimeSelection({ start, end });
                    useStore.getState().setLoopRange(start, end);
                    useStore.getState().setIsLoop(true);
                    selectKeyframesInRange(start, end);
                }
            }
        };

        const onUp = () => {
            target.removeEventListener('pointermove', onMove as any);
            target.removeEventListener('pointerup', onUp as any);
        };

        target.addEventListener('pointermove', onMove as any);
        target.addEventListener('pointerup', onUp as any);
    };

    const handleSegmentDrag = (
        laneId: string,
        kf1Time: number,
        kf2Time: number,
        val1: number,
        val2: number,
        min: number,
        max: number,
        e: React.PointerEvent
    ) => {
        e.stopPropagation();
        e.preventDefault();
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        useStore.getState().pushHistory();

        const startY = e.clientY;
        const range = max - min;

        const onMove = (ev: PointerEvent) => {
            const deltaPixels = ev.clientY - startY;
            const deltaVal = -(deltaPixels / 120) * range;

            if (laneId === 'scrollPos') {
                const kfs = useStore.getState().scrollKeyframes;
                const updated = kfs.map((k) => {
                    if (Math.abs(k.time - kf1Time) < 0.005) {
                        return { ...k, value: Math.max(0, Math.min(1, +(val1 + deltaVal).toFixed(3))) };
                    }
                    if (Math.abs(k.time - kf2Time) < 0.005) {
                        return { ...k, value: Math.max(0, Math.min(1, +(val2 + deltaVal).toFixed(3))) };
                    }
                    return k;
                });
                useStore.getState().setScrollKeyframes(updated);
            } else {
                const kfs = (useStore.getState().paramKeyframes[laneId] ?? []) as ParamKf[];
                const updated = kfs.map((k) => {
                    if (Math.abs(k.time - kf1Time) < 0.005) {
                        return { ...k, value: Math.max(min, Math.min(max, +(val1 + deltaVal).toFixed(3))) };
                    }
                    if (Math.abs(k.time - kf2Time) < 0.005) {
                        return { ...k, value: Math.max(min, Math.min(max, +(val2 + deltaVal).toFixed(3))) };
                    }
                    return k;
                });
                useStore.getState().setParamKeyframes(laneId, updated);
            }
        };

        const onUp = () => {
            target.removeEventListener('pointermove', onMove as any);
            target.removeEventListener('pointerup', onUp as any);
        };

        target.addEventListener('pointermove', onMove as any);
        target.addEventListener('pointerup', onUp as any);
    };

    const handleLoopDrag = (type: 'start' | 'end' | 'bar', e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);

        const trackRect = loopTrackRef.current?.getBoundingClientRect();
        if (!trackRect) return;

        const seqDur = useStore.getState().sequenceDuration;
        const startL = useStore.getState().loopStart;
        const endL = useStore.getState().loopEnd || seqDur;
        const clickX = e.clientX;

        const onPointerMove = (moveEv: PointerEvent) => {
            const deltaX = moveEv.clientX - clickX;
            const deltaTime = (deltaX / trackRect.width) * seqDur;
            const currentPos = Math.max(0, Math.min(seqDur, ((moveEv.clientX - trackRect.left) / trackRect.width) * seqDur));

            if (type === 'start') {
                const newStart = Math.max(0, Math.min(endL - 0.5, currentPos));
                useStore.getState().setLoopRange(newStart, endL);
            } else if (type === 'end') {
                const newEnd = Math.max(startL + 0.5, Math.min(seqDur, currentPos));
                useStore.getState().setLoopRange(startL, newEnd);
            } else if (type === 'bar') {
                const dur = endL - startL;
                const newStart = Math.max(0, Math.min(seqDur - dur, startL + deltaTime));
                useStore.getState().setLoopRange(newStart, newStart + dur);
            }
        };

        const onPointerUp = () => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    };

    const handleLoopTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const trackRect = loopTrackRef.current?.getBoundingClientRect();
        if (!trackRect) return;
        const seqDur = useStore.getState().sequenceDuration;
        const clickTime = Math.max(0, Math.min(seqDur, ((e.clientX - trackRect.left) / trackRect.width) * seqDur));
        const currentDur = (useStore.getState().loopEnd || seqDur) - useStore.getState().loopStart;
        const halfDur = currentDur > 0 ? currentDur / 2 : 2.5;
        const newStart = Math.max(0, Math.min(seqDur - (halfDur * 2), clickTime - halfDur));
        useStore.getState().setLoopRange(newStart, newStart + (halfDur * 2));
    };
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

    const { beats, waveform, isReady } = useKickDrumData(audioUrl);

    // Measure lanes width for playhead math
    useEffect(() => {
        const el = lanesRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => setLanesWidth(el.clientWidth));
        observer.observe(el);
        setLanesWidth(el.clientWidth);
        return () => observer.disconnect();
    }, []);

    // Mouse-anchored timeline zoom
    const zoomAnchorRef = useRef<{ mouseXInContainer: number; ratio: number } | null>(null);

    useLayoutEffect(() => {
        if (!zoomAnchorRef.current || !lanesRef.current) return;
        const { mouseXInContainer, ratio } = zoomAnchorRef.current;
        const el = lanesRef.current;
        const currentTrackWidth = el.scrollWidth - LABEL_W;
        if (currentTrackWidth <= 0) return;
        const newContentX = LABEL_W + ratio * currentTrackWidth;
        const newScrollLeft = newContentX - mouseXInContainer;
        el.scrollLeft = Math.max(0, newScrollLeft);
        zoomAnchorRef.current = null;
    }, [timelineZoom]);

    // Cmd+scroll / Meta+scroll / Ctrl+scroll = Horizontal Zoom, Alt+scroll / Option+scroll = Vertical Zoom
    useEffect(() => {
        const el = timelineRootRef.current || lanesRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (e.metaKey || e.ctrlKey) {
                e.preventDefault();
                const lanesEl = lanesRef.current;
                if (lanesEl) {
                    const rect = lanesEl.getBoundingClientRect();
                    const mouseXInContainer = e.clientX - rect.left;
                    const contentX = lanesEl.scrollLeft + mouseXInContainer;
                    const currentTrackWidth = lanesEl.scrollWidth - LABEL_W;
                    if (currentTrackWidth > 0 && mouseXInContainer >= 0 && mouseXInContainer <= rect.width) {
                        const ratio = Math.max(0, Math.min(1, (contentX - LABEL_W) / currentTrackWidth));
                        zoomAnchorRef.current = { mouseXInContainer, ratio };
                    }
                }

                const curZoom = useStore.getState().timelineZoom;
                const delta = -e.deltaY;
                const factor = Math.pow(1.0025, delta);
                const nextZoom = Math.max(0.25, Math.min(20.0, +(curZoom * factor).toFixed(3)));
                useStore.getState().setTimelineZoom(nextZoom);
            } else if (e.altKey) {
                e.preventDefault();
                const curVZoom = useStore.getState().verticalZoom;
                const delta = -e.deltaY;
                const factor = Math.pow(1.0025, delta);
                const nextVZoom = Math.max(0.4, Math.min(4.0, +(curVZoom * factor).toFixed(3)));
                useStore.getState().setVerticalZoom(nextVZoom);
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // Reactive TIME display — onChange fires whenever Theatre.js position changes (play, scrub, loop)
    useEffect(() => {
        const unsub = onChange(sheet.sequence.pointer.position, (pos) => {
            setSeqTime(pos);
            useStore.getState().setPlayheadPosition(pos);
        });
        return unsub;
    }, []);

    // Sync HTML5 Audio element to playback position & seamless loop wrap
    useEffect(() => {
        const a = audioRef.current;
        if (!a || !audioUrl) return;

        if (isPlaying) {
            const seqPos = sheet.sequence.position;
            const diff = Math.abs(a.currentTime - seqPos);
            if (diff > 0.15) {
                a.currentTime = Math.max(0, Math.min(a.duration || 300, seqPos));
            }
            if (a.paused) {
                a.play().catch(() => {});
            }
        } else {
            if (!a.paused) {
                a.pause();
            }
        }
    }, [isPlaying, seqTime, audioUrl]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            const meta = e.metaKey || e.ctrlKey;
            // Undo / Redo
            if (meta && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); useStore.getState().undo(); return; }
            if (meta && e.shiftKey  && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); useStore.getState().redo(); return; }
            if (meta && (e.key === 'y' || e.key === 'Y'))                 { e.preventDefault(); useStore.getState().redo(); return; }
            // Copy / Paste
            if (meta && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); useStore.getState().copySelectedKeyframes(); return; }
            if (meta && (e.key === 'v' || e.key === 'V')) { e.preventDefault(); useStore.getState().pasteKeyframes(sheet.sequence.position); return; }
            // Tools (no meta key)
            if (!meta && (e.key === 'v' || e.key === 'V')) { setActiveTool('select'); return; }
            if (!meta && (e.key === 'p' || e.key === 'P')) { setActiveTool('pen'); return; }
            if (!meta && (e.key === 'e' || e.key === 'E')) { setActiveTool('eraser'); return; }
            // Delete selected keyframes
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            const kfs = useStore.getState().selectedKeyframes;
            if (kfs.length === 0) return;
            useStore.getState().pushHistory();
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



    const progressFromClientX = useCallback((clientX: number) => {
        const el = lanesRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const x = clientX - rect.left + el.scrollLeft - LABEL_W;
        const trackW = lanesWidth * timelineZoom - LABEL_W;
        return Math.max(0, Math.min(1, x / trackW));
    }, [lanesWidth, timelineZoom]);

    const snapTimeToBeat = useCallback((t: number): number => {
        if (!snapToBeat || beats.length === 0) return t;
        return beats.reduce((closest, beat) => Math.abs(beat - t) < Math.abs(closest - t) ? beat : closest);
    }, [snapToBeat, beats]);

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

        // If clicking on top ruler header area (clientY near top of lanes container), ALWAYS allow scrubbing playhead!
        const relativeY = e.clientY - el.getBoundingClientRect().top + el.scrollTop;
        const isRulerArea = relativeY <= 24;

        if (!isRulerArea) {
            // Do NOT seek playhead if using select tool, holding Shift, or clicking interactive keyframes/overlays!
            if (e.shiftKey || activeTool === 'select' || (e.target as HTMLElement).closest('.pointer-events-auto')) {
                return;
            }
        }

        setIsPlaying(false);
        const p = progressFromClientX(e.clientX);
        if (p !== null) seekTo(p);
        const onMove = (ev: MouseEvent) => { const p = progressFromClientX(ev.clientX); if (p !== null) seekTo(p); };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [progressFromClientX, setIsPlaying, seekTo, activeTool]);

    useEffect(() => {
        if (recordCountdown === null) return;
        if (recordCountdown === 0) {
            setRecordCountdown(null);
            setRecordStartPosition(sheet.sequence.position / sequenceDuration);
            clearRecordedEvents();
            setIsRecording(true);
            setIsPlaying(true);
            sheet.sequence.play({ iterationCount: isLoop ? Infinity : 1 });
            return;
        }
        const t = setTimeout(() => setRecordCountdown(recordCountdown - 1), 1000);
        return () => clearTimeout(t);
    }, [recordCountdown, setRecordCountdown, setRecordStartPosition, clearRecordedEvents, setIsRecording, setIsPlaying, sequenceDuration, isLoop]);

    const toggleRecording = () => {
        if (isRecording) {
            setIsRecording(false);
        } else if (recordCountdown !== null) {
            setRecordCountdown(null);
        } else {
            if (isPlaying) {
                setIsRecording(true);
            } else {
                setRecordCountdown(3);
            }
        }
    };

    const paramCurrentValues: Record<string, number> = {
        rotationSpeed,
        depth: particleDepth,
        size: particleSize,
        cssOpacity,
    };

    const scrollVbH = laneH('scrollPos', 48);
    const scrollPolyline = scrollHistory.current.length > 1
        ? scrollHistory.current.map(p => `${p.pos * VB_W},${(1 - p.val) * scrollVbH}`).join(' ')
        : '';

    const buildWaveformSvgPath = useCallback((vbHeight: number, samples = 500) => {
        if (!isReady || !waveform || waveform.length === 0) return null;
        const step = waveform.length / samples;
        const cy = vbHeight / 2;
        const maxAmp = cy * 0.85;
        const upper: string[] = [];
        const lower: string[] = [];
        for (let i = 0; i < samples; i++) {
            const x = (i / (samples - 1)) * VB_W;
            const val = (waveform[Math.floor(i * step)] as number) ?? 0;
            upper.push(`${x.toFixed(1)},${(cy - val * maxAmp).toFixed(1)}`);
            lower.push(`${x.toFixed(1)},${(cy + val * maxAmp).toFixed(1)}`);
        }
        return `M ${upper.join(' L ')} L ${[...lower].reverse().join(' L ')} Z`;
    }, [isReady, waveform]);

    const audioTrackWaveformPath = buildWaveformSvgPath(100, 500);
    const waveformBgPath = buildWaveformSvgPath(scrollVbH, 500);

    return (
        <footer ref={timelineRootRef} className="border-t border-editor-border bg-editor-bg flex flex-col z-20" style={{ height }}>
            <div className="h-9 border-b border-editor-border flex items-center px-2 bg-editor-panel shrink-0 select-none gap-1 min-w-0">
                {/* LEFT: tools, rhythm, zoom */}
                <div className="flex items-center gap-1 shrink-0">
                    <span className="border-r border-[#333] pr-1.5 mr-0.5 flex items-center gap-0.5 text-[#808080]">
                        <button
                            title="Undo (Cmd+Z)"
                            onClick={() => useStore.getState().undo()}
                            disabled={!canUndo}
                            className="p-1 rounded transition-colors hover:text-[#d9d9d9] disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                            <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            title="Redo (Cmd+Shift+Z)"
                            onClick={() => useStore.getState().redo()}
                            disabled={!canRedo}
                            className="p-1 rounded transition-colors hover:text-[#d9d9d9] disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                            <Redo2 className="w-3.5 h-3.5" />
                        </button>
                    </span>
                    <span className="border-r border-[#333] pr-1.5 mr-0.5 flex items-center text-[#808080]">
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
                    <button
                        title={snapToBeat ? 'Snap to Beat: ON' : 'Snap to Beat: OFF'}
                        onClick={() => setSnapToBeat(v => !v)}
                        className={`p-1 rounded transition-colors text-[#808080] ${snapToBeat ? 'text-editor-accent-purple' : 'hover:text-[#d9d9d9]'}`}
                    >
                        <Magnet className="w-3.5 h-3.5" />
                    </button>
                    <button
                        title="Auto-Generate Rhythm Curve from Audio Beats"
                        onClick={() => setShowRhythmModal(true)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-editor-accent-purple/20 hover:bg-editor-accent-purple text-editor-accent-purple hover:text-white font-mono text-[9px] font-bold transition-all border border-editor-accent-purple/30 shrink-0"
                    >
                        <span>⚡ RHYTHM</span>
                    </button>
                    <button
                        title="Smooth out bumps & jitter in current curve"
                        onClick={() => smoothCurrentScrollCurve()}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-editor-accent-blue/20 hover:bg-editor-accent-blue text-editor-accent-blue hover:text-white font-mono text-[9px] font-bold transition-all border border-editor-accent-blue/30 shrink-0"
                    >
                        <span>✨ SMOOTH</span>
                    </button>
                    {/* H-zoom slider */}
                    <span className="border-l border-[#333] pl-1.5 ml-0.5 flex items-center gap-1 text-[#808080]">
                        <button
                            className="p-1 hover:text-[#d9d9d9] disabled:opacity-30"
                            title="Zoom Out (Cmd + Scroll Down)"
                            onClick={() => setTimelineZoom(Math.max(0.25, +(timelineZoom / 1.25).toFixed(2)))}
                            disabled={timelineZoom <= 0.25}
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        {/* Horizontal zoom track */}
                        <div
                            className="w-14 relative cursor-ew-resize flex items-center"
                            style={{ height: 16 }}
                            title={`Horizontal Zoom: ${timelineZoom.toFixed(2)}x (Cmd + Scroll)`}
                            onPointerDown={(e) => {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                const rect = e.currentTarget.getBoundingClientRect();
                                const startX = e.clientX;
                                const startZoom = timelineZoom;
                                const onMove = (ev: PointerEvent) => {
                                    const delta = (ev.clientX - startX) / rect.width;
                                    const logMin = Math.log(0.25);
                                    const logMax = Math.log(20.0);
                                    const curLog = Math.log(startZoom);
                                    const nextLog = Math.max(logMin, Math.min(logMax, curLog + delta * (logMax - logMin)));
                                    setTimelineZoom(+Math.exp(nextLog).toFixed(2));
                                };
                                const onUp = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
                                document.addEventListener('pointermove', onMove);
                                document.addEventListener('pointerup', onUp);
                            }}
                        >
                            {/* Track line */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#3a3a3a] rounded-full pointer-events-none" />
                            {/* Thumb */}
                            <div
                                className="absolute w-3 h-3 bg-white rounded-full shadow pointer-events-none"
                                style={{
                                    left: `${((Math.log(Math.max(0.25, Math.min(20.0, timelineZoom))) - Math.log(0.25)) / (Math.log(20.0) - Math.log(0.25))) * 100}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                }}
                            />
                        </div>
                        <button
                            className="p-1 hover:text-[#d9d9d9] disabled:opacity-30"
                            title="Zoom In (Cmd + Scroll Up)"
                            onClick={() => setTimelineZoom(Math.min(20.0, +(timelineZoom * 1.25).toFixed(2)))}
                            disabled={timelineZoom >= 20.0}
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                    </span>
                    {/* V-zoom slider */}
                    <div className="flex items-center text-[#808080] gap-1">
                        <span className="text-[9px] font-mono">V</span>
                        <div
                            className="w-12 relative cursor-ew-resize flex items-center"
                            style={{ height: 16 }}
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
                            {/* Track line */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#3a3a3a] rounded-full pointer-events-none" />
                            {/* Thumb */}
                            <div
                                className="absolute w-3 h-3 bg-white rounded-full shadow pointer-events-none"
                                style={{
                                    left: `${((verticalZoom - 0.4) / 3.6) * 100}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* CENTER: transport + solo — grows/shrinks to fill available space, centered */}
                <div className="flex-1 flex items-center justify-center gap-4 min-w-0 overflow-hidden">
                    <div className="flex items-center space-x-2 text-[#808080] shrink-0">
                        <button
                            className="p-1 hover:text-[#d9d9d9] transition-colors"
                            onClick={() => seekTo(0)}
                            title="Rewind to 0:00 (Click)"
                        >
                            <svg className="w-3.5 h-3.5 rotate-180" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <button
                            className="p-1 hover:text-[#d9d9d9] transition-colors"
                            onClick={() => { setIsPlaying(false); if (isRecording) setIsRecording(false); }}
                            onDoubleClick={() => { setIsPlaying(false); if (isRecording) setIsRecording(false); seekTo(0); }}
                            title="Stop (Double-click to rewind to 0:00)"
                        >
                            <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button className="p-1 hover:text-[#d9d9d9] transition-colors text-[#d9d9d9]" onClick={() => setIsPlaying(!isPlaying)}>
                            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        </button>
                        <button
                            className={`p-1 rounded transition-colors ${isLoop ? 'text-[#d9d9d9]' : 'text-[#808080] hover:text-[#d9d9d9]'}`}
                            onClick={() => setIsLoop(!isLoop)}
                            title="Toggle Loop Region"
                        >
                            <Repeat className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className={`p-1 rounded transition-colors ml-2 border ${isRecording ? 'text-red-500 fill-red-500 border-red-500/40 bg-red-500/10' : 'hover:text-[#d9d9d9] border-transparent'}`}
                            onClick={toggleRecording}
                            title={isRecording ? 'Stop Recording' : 'Arm Recording'}
                        >
                            <Circle className="w-3 h-3 fill-current inline-block" /> <span className="text-[9px] ml-1">{isRecording ? 'REC' : 'ARM'}</span>
                        </button>
                    </div>

                    {/* Parameter Isolation Solo Selector */}
                    <div className="flex items-center gap-1 bg-editor-surface border border-editor-border rounded px-1.5 py-0.5 text-[9px] font-mono shrink-0">
                        <SlidersHorizontal className="w-3 h-3 text-editor-accent-purple shrink-0" />
                        <span className="text-editor-muted text-[8px] uppercase font-bold mr-1">Solo:</span>
                        <button
                            className={`px-1.5 py-0.5 rounded transition-colors ${isolatedLane === 'all' ? 'bg-editor-accent-purple text-white font-bold' : 'text-editor-muted hover:text-editor-fg'}`}
                            onClick={() => setIsolatedLane('all')}
                        >
                            ALL
                        </button>
                        <button
                            className={`px-1.5 py-0.5 rounded transition-colors ${isolatedLane === 'scrollPos' ? 'bg-editor-accent-purple text-white font-bold' : 'text-editor-muted hover:text-editor-fg'}`}
                            onClick={() => setIsolatedLane('scrollPos')}
                        >
                            SCROLL
                        </button>
                        <button
                            className={`px-1.5 py-0.5 rounded transition-colors ${isolatedLane === 'rotationSpeed' ? 'bg-teal-500 text-white font-bold' : 'text-editor-muted hover:text-editor-fg'}`}
                            onClick={() => setIsolatedLane('rotationSpeed')}
                        >
                            ROTATION
                        </button>
                        <button
                            className={`px-1.5 py-0.5 rounded transition-colors ${isolatedLane === 'cssOpacity' ? 'bg-blue-500 text-white font-bold' : 'text-editor-muted hover:text-editor-fg'}`}
                            onClick={() => setIsolatedLane('cssOpacity')}
                        >
                            OPACITY
                        </button>
                        <button
                            className={`px-1.5 py-0.5 rounded transition-colors ${isolatedLane === 'depth' || isolatedLane === 'size' ? 'bg-green-500 text-white font-bold' : 'text-editor-muted hover:text-editor-fg'}`}
                            onClick={() => setIsolatedLane('depth')}
                        >
                            PARTICLES
                        </button>
                    </div>
                </div>

                {/* RIGHT: LEN + timecode */}
                <div className="flex items-center gap-3 pl-2 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-editor-muted">
                        <span>LEN:</span>
                        <input
                            type="number"
                            min="1"
                            max="300"
                            value={sequenceDuration}
                            onChange={(e) => useStore.getState().setSequenceDuration(parseFloat(e.target.value) || 10)}
                            className="w-10 bg-editor-surface border border-editor-border rounded px-1 text-center font-mono text-[10px] text-editor-accent-purple focus:outline-none focus:border-editor-accent-purple"
                        />
                        <span>s</span>
                    </div>
                    <div className="flex items-center text-editor-fg font-mono text-[11px] font-medium tracking-widest">
                        {new Date(seqTime * 1000).toISOString().slice(11, 23).replace('.', ':')}
                    </div>
                </div>

            </div>
            <div ref={lanesRef} className="flex-1 overflow-y-auto overflow-x-auto thin-scrollbar relative select-none cursor-col-resize" onMouseDown={handleLanesMouseDown}>
                <div className="relative" style={{ width: timelineZoom !== 1 ? `${timelineZoom * 100}%` : '100%', minHeight: '100%' }}>
                    {/* Red Playhead Line & Interactive Cap */}
                    <div
                        className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 z-[60] pointer-events-auto cursor-ew-resize shadow-[0_0_8px_rgba(239,68,68,0.8)] group/playhead"
                        style={{ left: `calc(120px + (100% - 120px) * ${seqTime / sequenceDuration})` }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            const targetEl = e.currentTarget as HTMLElement;
                            targetEl.setPointerCapture(e.pointerId);
                            setIsPlaying(false);
                            const p = progressFromClientX(e.clientX);
                            if (p !== null) seekTo(p);

                            const onMove = (ev: PointerEvent) => {
                                if (!(ev.buttons & 1)) return;
                                const p = progressFromClientX(ev.clientX);
                                if (p !== null) seekTo(p);
                            };
                            const onUp = (ev: PointerEvent) => {
                                try { targetEl.releasePointerCapture(ev.pointerId); } catch (_) {}
                                window.removeEventListener('pointermove', onMove);
                                window.removeEventListener('pointerup', onUp);
                            };
                            window.addEventListener('pointermove', onMove);
                            window.addEventListener('pointerup', onUp);
                        }}
                    >
                        <div className="w-3.5 h-3.5 bg-red-500 hover:bg-red-400 absolute -top-1 -left-[6px] rotate-45 cursor-ew-resize shadow-md transition-transform hover:scale-125 z-[61]" />
                    </div>
                
                {/* Resizable & Draggable Ableton-Style Loop Region Header */}
                <div className="h-5 border-b border-editor-border bg-editor-surface flex items-center relative text-[9px] font-mono select-none">
                    <div className="w-[120px] shrink-0 px-2 flex items-center gap-1 border-r border-editor-border bg-editor-panel text-editor-muted">
                        <Repeat className="w-2.5 h-2.5 text-editor-accent-purple" />
                        <span className="uppercase text-[8px] tracking-wider">Loop Region</span>
                    </div>
                    <div className="flex-1 relative h-full bg-editor-surface cursor-pointer" ref={loopTrackRef} onClick={handleLoopTrackClick}>
                        {(() => {
                            const lStart = loopStart;
                            const lEnd = loopEnd || sequenceDuration;
                            const leftPct = (lStart / sequenceDuration) * 100;
                            const widthPct = Math.max(2, ((lEnd - lStart) / sequenceDuration) * 100);

                            return (
                                <div
                                    className={`absolute top-0.5 bottom-0.5 rounded border transition-colors flex items-center justify-between group/loopbar ${
                                        isLoop
                                            ? 'bg-editor-accent-purple/30 border-editor-accent-purple text-editor-accent-purple'
                                            : 'bg-white/10 border-white/20 text-gray-400'
                                    }`}
                                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                    onPointerDown={(e) => handleLoopDrag('bar', e)}
                                >
                                    <div
                                        className="w-2.5 h-full bg-editor-accent-purple hover:bg-white rounded-l flex items-center justify-center text-[7px] text-black font-bold select-none cursor-ew-resize shrink-0 z-10"
                                        onPointerDown={(e) => handleLoopDrag('start', e)}
                                        title="Drag to resize Loop Start"
                                    >
                                        L
                                    </div>
                                    <div className="px-1 text-[8px] truncate pointer-events-none font-bold text-center flex-1">
                                        {lStart.toFixed(1)}s - {lEnd.toFixed(1)}s
                                    </div>
                                    <div
                                        className="w-2.5 h-full bg-editor-accent-purple hover:bg-white rounded-r flex items-center justify-center text-[7px] text-black font-bold select-none cursor-ew-resize shrink-0 z-10"
                                        onPointerDown={(e) => handleLoopDrag('end', e)}
                                        title="Drag to resize Loop End"
                                    >
                                        R
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
                {/* Visual Time Selection Box Overlay (Clean & Unobtrusive) */}
                {timeSelection && (
                    <div className="absolute top-5 bottom-0 left-[120px] right-0 pointer-events-none z-40">
                        <div
                            className="absolute top-0 bottom-0 bg-cyan-500/10 border-x border-cyan-400/60 pointer-events-none shadow-[0_0_15px_rgba(6,182,212,0.15)] group/sel"
                            style={{
                                left: `${(timeSelection.start / sequenceDuration) * 100}%`,
                                width: `${((timeSelection.end - timeSelection.start) / sequenceDuration) * 100}%`
                            }}
                        >
                            {/* Interactive Top Region Bar: Drag up/down to shift intensity of region keyframes, click ✕ to clear */}
                            <div
                                className="absolute top-0 left-0 right-0 h-4 bg-cyan-500/30 hover:bg-cyan-500/50 border-b border-cyan-400/60 cursor-ns-resize pointer-events-auto flex items-center justify-between px-1.5 transition-colors"
                                onPointerDown={handleSelectionDrag}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const parentContainer = e.currentTarget.parentElement!.parentElement!;
                                    const rect = parentContainer.getBoundingClientRect();
                                    const clickTime = Math.max(0, Math.min(sequenceDuration, ((e.clientX - rect.left) / rect.width) * sequenceDuration));
                                    setAudioMenu({ visible: true, x: e.clientX, y: e.clientY, clickTime });
                                }}
                                title="Drag top bar up/down: adjust intensity of keyframes in region  |  Right-click: menu"
                            >
                                <span className="text-[8px] font-mono text-cyan-200 font-bold select-none pointer-events-none">
                                    REGION ({timeSelection.start.toFixed(1)}s - {timeSelection.end.toFixed(1)}s)
                                </span>
                                <button
                                    className="w-3.5 h-3.5 bg-black/60 hover:bg-black text-cyan-300 hover:text-white rounded flex items-center justify-center text-[9px] font-bold pointer-events-auto transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        useStore.getState().setTimeSelection(null);
                                        useStore.getState().setSelectedKeyframes([]);
                                    }}
                                    title="Clear selection region"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {(isolatedLane === 'all') && (
                <div className="flex border-b border-editor-border group relative" style={{ height: laneH('audio') }}>
                    <div className="w-[120px] shrink-0 flex items-center justify-between px-3 border-r border-editor-border bg-editor-panel text-editor-fg sticky left-0 z-30 overflow-hidden">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <Music className="w-2.5 h-2.5 text-editor-accent-blue shrink-0" />
                            <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">Audio Wave</span>
                        </div>
                        {audioUrl && (
                            <button
                                className="text-[9px] text-[#808080] hover:text-red-400 transition-colors shrink-0 font-bold ml-1"
                                title="Remove audio track"
                                onClick={(e) => { e.stopPropagation(); useStore.getState().setAudioUrl(null); }}
                            >✕</button>
                        )}
                    </div>
                    <div
                        className="flex-1 relative overflow-hidden flex items-center cursor-context-menu"
                        onPointerDown={(e) => handleTrackPointerDown(e)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickTime = ((e.clientX - rect.left) / rect.width) * sequenceDuration;
                            setAudioMenu({ visible: true, x: e.clientX, y: e.clientY, clickTime });
                        }}
                    >
                        <audio ref={audioRef} src={audioUrl || undefined} preload="auto" />
                        <input
                            ref={audioUploadInputRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    const url = await saveMediaFile('active-audio', f);
                                    const tempAudio = new Audio(url);
                                    tempAudio.onloadedmetadata = () => {
                                        if (tempAudio.duration && isFinite(tempAudio.duration) && tempAudio.duration > 0) {
                                            useStore.getState().setSequenceDuration(Math.ceil(tempAudio.duration));
                                        }
                                    };
                                    useStore.getState().setAudioUrl(url);
                                }
                                e.target.value = '';
                            }}
                        />
                        {!audioUrl ? (
                            <button
                                className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-editor-muted hover:text-editor-accent-orange transition-colors italic z-20 pointer-events-auto cursor-pointer"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (audioUploadInputRef.current) {
                                        audioUploadInputRef.current.value = '';
                                        audioUploadInputRef.current.click();
                                    }
                                }}
                            >
                                <UploadCloud className="w-3 h-3 shrink-0" /> Import audio...
                            </button>
                        ) : !isReady ? (
                            <span className="text-[10px] text-editor-accent-orange animate-pulse px-2">Analyzing audio...</span>
                        ) : (
                            <>
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${VB_W} 100`} preserveAspectRatio="none">
                                    {audioTrackWaveformPath && (
                                        <path
                                            d={audioTrackWaveformPath}
                                            fill="rgba(249, 115, 22, 0.35)"
                                            stroke="rgba(249, 115, 22, 0.85)"
                                            strokeWidth="0.3"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    )}
                                </svg>
                                {beats.map((beatTime: number, i: number) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 w-[1px] bg-white/15 z-10 group/beat hover:bg-editor-accent-orange cursor-pointer transition-colors"
                                        style={{ left: `${(beatTime / sequenceDuration) * 100}%` }}
                                    >
                                        <div className="opacity-0 group-hover/beat:opacity-100 text-[8px] absolute top-1 left-2 font-mono text-editor-fg whitespace-nowrap bg-black/70 px-1 rounded border border-white/10">BEAT {beatTime.toFixed(1)}s</div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-editor-accent-blue/40 z-40" onPointerDown={makeLaneDrag('audio')} />
                </div>
                )}
                {(isolatedLane === 'all') && (
                <div className="flex border-b border-editor-border group relative" style={{ height: 40 }}>
                    <div className="w-[120px] shrink-0 flex items-center justify-between px-3 border-r border-editor-border bg-editor-panel text-editor-fg sticky left-0 z-30 overflow-hidden">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <Grid className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-[10px] uppercase font-bold text-amber-400 truncate">Drum Pads</span>
                        </div>
                        {padSwitchEvents.length > 0 && (
                            <button
                                className="text-[9px] text-[#808080] hover:text-red-400 transition-colors shrink-0 font-bold ml-1"
                                title="Clear recorded Drum Pad switch events"
                                onClick={(e) => { e.stopPropagation(); clearPadSwitchEvents(); }}
                            >✕</button>
                        )}
                    </div>
                    <div className="flex-1 relative overflow-hidden bg-editor-surface/40 flex items-center">
                        {padSwitchEvents.length === 0 ? (
                            <span className="text-[10px] text-editor-muted italic px-3">Press Numpad [7..0] during recording to log video pad switches...</span>
                        ) : (
                            <div className="absolute inset-0 w-full h-full pointer-events-auto flex">
                                {(() => {
                                    const sorted = [...padSwitchEvents].sort((a, b) => a.time - b.time);
                                    const segments: Array<{ startTime: number; endTime: number; padIdx: number; eventTime: number | null }> = [];
                                    if (sorted[0].time > 0) {
                                        segments.push({ startTime: 0, endTime: sorted[0].time, padIdx: activeVideoPadIdx, eventTime: null });
                                    }
                                    sorted.forEach((ev, i) => {
                                        const end = i < sorted.length - 1 ? sorted[i + 1].time : sequenceDuration;
                                        segments.push({ startTime: ev.time, endTime: end, padIdx: ev.padIdx, eventTime: ev.time });
                                    });

                                    return segments.map((seg, idx) => {
                                        const leftPct = (seg.startTime / sequenceDuration) * 100;
                                        const widthPct = Math.max(0.2, ((seg.endTime - seg.startTime) / sequenceDuration) * 100);
                                        const padInfo = videoPads[seg.padIdx];
                                        const defaultColors: Record<number, string> = { 7: '#5f7f9e', 8: '#6e9c73', 9: '#a86a5c', 4: '#7a6fa8', 5: '#c98a4d', 6: '#5f9e96', 1: '#9e7a5f', 2: '#7d848c', 3: '#8a9e6e', 0: '#6e7a9e' };
                                        const padColor = padInfo?.color || (padInfo ? defaultColors[padInfo.id] : undefined) || '#c98a4d';
                                        const padLabel = padInfo ? `#${padInfo.id} · ${padInfo.name}` : `PAD ${seg.padIdx}`;
                                        const durSec = seg.endTime - seg.startTime;

                                        return (
                                            <div
                                                key={`pad-clip-${idx}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    useStore.getState().setPlayheadPosition(seg.startTime);
                                                    useStore.getState().setActiveVideoPadIdx(seg.padIdx);
                                                }}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (seg.eventTime !== null) removePadSwitchEvent(seg.eventTime);
                                                }}
                                                onPointerDown={(e) => {
                                                    if (seg.eventTime === null) return;
                                                    e.stopPropagation();
                                                    const targetEl = e.currentTarget as HTMLElement;
                                                    targetEl.setPointerCapture(e.pointerId);
                                                    const trackEl = targetEl.parentElement?.parentElement as HTMLElement;
                                                    const trackRect = trackEl?.getBoundingClientRect() ?? targetEl.getBoundingClientRect();
                                                    const startX = e.clientX;
                                                    const origTime = seg.eventTime;

                                                    const onMove = (ev: PointerEvent) => {
                                                        if (!(ev.buttons & 1)) return;
                                                        const dx = ev.clientX - startX;
                                                        const dt = (dx / trackRect.width) * sequenceDuration;
                                                        const newTime = Math.max(0, Math.min(sequenceDuration - 0.1, +(origTime + dt).toFixed(2)));
                                                        useStore.getState().removePadSwitchEvent(origTime);
                                                        useStore.getState().addPadSwitchEvent(newTime, seg.padIdx);
                                                    };
                                                    const onUp = () => {
                                                        targetEl.removeEventListener('pointermove', onMove as any);
                                                        targetEl.removeEventListener('pointerup', onUp as any);
                                                    };
                                                    targetEl.addEventListener('pointermove', onMove as any);
                                                    targetEl.addEventListener('pointerup', onUp as any);
                                                }}
                                                title={`Pad Clip: ${padLabel} (${durSec.toFixed(2)}s) | Drag to move clip | Right-click to delete`}
                                                className="absolute top-0.5 bottom-0.5 rounded border border-editor-border hover:border-white/60 cursor-pointer shadow-xs transition-all z-20 flex items-center justify-between px-2 overflow-hidden group/clip"
                                                style={{
                                                    left: `${leftPct}%`,
                                                    width: `${widthPct}%`,
                                                    backgroundColor: `${padColor}35`,
                                                    borderLeft: `3px solid ${padColor}`,
                                                }}
                                            >
                                                <div className="flex items-center gap-1 min-w-0 truncate">
                                                    <span className="text-[9px] font-mono font-bold px-1 rounded shrink-0" style={{ backgroundColor: `${padColor}40`, color: '#fff' }}>
                                                        #{padInfo?.id ?? seg.padIdx}
                                                    </span>
                                                    <span className="text-[9px] font-mono font-semibold text-editor-fg truncate">{padInfo?.name || `Pad ${seg.padIdx}`}</span>
                                                </div>
                                                <span className="text-[8.5px] font-mono text-editor-muted shrink-0 ml-1 opacity-70 group-hover/clip:opacity-100">{durSec.toFixed(1)}s</span>

                                                {/* Resize Edge Handle on left edge if not time 0 */}
                                                {seg.eventTime !== null && (
                                                    <div
                                                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/40 z-30"
                                                        onPointerDown={(e) => {
                                                            e.stopPropagation();
                                                            const handleEl = e.currentTarget as HTMLElement;
                                                            handleEl.setPointerCapture(e.pointerId);
                                                            const trackEl = handleEl.closest('.flex-1') as HTMLElement;
                                                            const trackRect = trackEl?.getBoundingClientRect() ?? handleEl.getBoundingClientRect();
                                                            const startX = e.clientX;
                                                            const origTime = seg.eventTime!;

                                                            const onMove = (ev: PointerEvent) => {
                                                                if (!(ev.buttons & 1)) return;
                                                                const dx = ev.clientX - startX;
                                                                const dt = (dx / trackRect.width) * sequenceDuration;
                                                                const newTime = Math.max(0, Math.min(sequenceDuration - 0.1, +(origTime + dt).toFixed(2)));
                                                                useStore.getState().removePadSwitchEvent(origTime);
                                                                useStore.getState().addPadSwitchEvent(newTime, seg.padIdx);
                                                            };
                                                            const onUp = () => {
                                                                handleEl.removeEventListener('pointermove', onMove as any);
                                                                handleEl.removeEventListener('pointerup', onUp as any);
                                                            };
                                                            handleEl.addEventListener('pointermove', onMove as any);
                                                            handleEl.addEventListener('pointerup', onUp as any);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>
                </div>
                )}
                {extractedFrames.length > 0 && (isolatedLane === 'all') && (
                <div className="flex border-b border-editor-border group relative" style={{ height: laneH('videoFrames') }}>
                    <div className={`w-[120px] shrink-0 flex items-center justify-between px-3 border-r border-editor-border sticky left-0 z-30 cursor-pointer transition-colors overflow-hidden ${activePreset === 'frames' ? 'bg-editor-surface-hover border-l-2 border-editor-accent-purple font-semibold' : 'bg-editor-panel text-editor-fg hover:bg-editor-surface'}`}>
                        <div className="flex flex-col justify-center gap-0.5 overflow-hidden">
                            <div className="flex items-center gap-1 w-full">
                                <Video className="w-2.5 h-2.5 shrink-0 text-editor-accent-blue" />
                                <span className="text-[10px] uppercase font-medium text-editor-fg truncate">Video Frames</span>
                            </div>
                            <span className="text-[9px] font-mono text-editor-muted truncate pl-[14px]">{extractedFrames.length} frames</span>
                        </div>
                        <button
                            className="text-[9px] text-[#808080] hover:text-red-400 transition-colors shrink-0 font-bold ml-1"
                            title="Clear extracted video frames"
                            onClick={(e) => { e.stopPropagation(); useStore.getState().setExtractedFrames([]); }}
                        >✕</button>
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
                {(isolatedLane === 'all') && (
                <div className="flex border-b border-editor-border group relative" style={{ height: laneH('mouseX') }}>
                    <div className="w-[120px] shrink-0 flex items-center justify-between px-3 border-r border-editor-border bg-editor-panel text-editor-fg sticky left-0 z-30 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <MousePointer2 className="w-2.5 h-2.5 text-editor-accent-blue shrink-0" />
                            <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">Mouse X</span>
                        </div>
                        {recordedEvents.length > 0 && (
                            <button
                                className="text-[9px] text-[#808080] hover:text-red-400 transition-colors shrink-0 font-bold ml-1"
                                title="Clear recorded Mouse X automation"
                                onClick={(e) => { e.stopPropagation(); useStore.getState().clearRecordedEvents(); }}
                            >✕</button>
                        )}
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
                )}
                {(isolatedLane === 'all') && (
                <div className="flex border-b border-editor-border group relative" style={{ height: laneH('mouseY') }}>
                    <div className="w-[120px] shrink-0 flex items-center justify-between px-3 border-r border-editor-border bg-editor-panel text-editor-fg sticky left-0 z-30 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <MousePointer2 className="w-2.5 h-2.5 text-editor-accent-blue shrink-0" />
                            <span className="text-[10px] uppercase font-normal text-[#d9d9d9] truncate">Mouse Y</span>
                        </div>
                        {recordedEvents.length > 0 && (
                            <button
                                className="text-[9px] text-[#808080] hover:text-red-400 transition-colors shrink-0 font-bold ml-1"
                                title="Clear recorded Mouse Y automation"
                                onClick={(e) => { e.stopPropagation(); useStore.getState().clearRecordedEvents(); }}
                            >✕</button>
                        )}
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
                )}
                {(isolatedLane === 'all' || isolatedLane === 'scrollPos') && (
                <div className="flex border-b border-editor-border group relative" style={{ height: laneH('scrollPos', isolatedLane === 'scrollPos' ? 220 : 100) }}>
                    <div
                        className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-editor-border sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors overflow-hidden ${isRecording ? 'ring-1 ring-inset ring-red-500/60 bg-red-500/10' : selectedLane === 'scrollPos' ? 'bg-editor-surface-hover border-l-2 border-editor-accent-purple text-editor-fg font-semibold' : 'bg-editor-panel text-editor-fg hover:bg-editor-surface'}`}
                        onClick={() => setSelectedLane('scrollPos')}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1 overflow-hidden">
                                <Mouse className="w-2.5 h-2.5 shrink-0 text-[#3b82f6]" />
                                <span className="text-[10px] uppercase font-medium text-editor-fg truncate">Scroll POS</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {scrollKeyframes.length > 2 && (
                                    <button
                                        className="text-[8px] bg-editor-accent-blue/20 hover:bg-editor-accent-blue text-editor-accent-blue hover:text-white px-1 py-0.5 rounded transition-colors font-mono font-bold"
                                        title="Smooth out bumps & jitter in current curve"
                                        onClick={(e) => { e.stopPropagation(); smoothCurrentScrollCurve(); }}
                                    >✨SMOOTH</button>
                                )}
                                <button
                                    className="text-[8px] bg-editor-accent-purple/20 hover:bg-editor-accent-purple text-editor-accent-purple hover:text-white px-1 py-0.5 rounded transition-colors font-mono font-bold"
                                    title="Auto-Generate Rhythm Curve from Audio Beats"
                                    onClick={(e) => { e.stopPropagation(); setShowRhythmModal(true); }}
                                >⚡RHYTHM</button>
                                {scrollKeyframes.length > 0 && (
                                    <button
                                        className="text-[9px] text-[#808080] hover:text-[#d9d9d9] transition-colors"
                                        title="Clear scroll automation"
                                        onClick={(e) => { e.stopPropagation(); clearScrollKeyframes(); }}
                                    >✕</button>
                                )}
                            </div>
                        </div>
                        <span className="text-[9px] font-mono text-[#808080] truncate pl-[14px]">{(scrollProgress * 100).toFixed(1)}%</span>
                    </div>
                    <div
                        className="flex-1 relative overflow-hidden bg-[#3b82f6]/[0.03]"
                        style={{ cursor: activeTool === 'pen' ? 'crosshair' : activeTool === 'eraser' ? 'cell' : undefined }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedLane('scrollPos');
                            setAudioTargetLane('scrollPos');
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickTime = ((e.clientX - rect.left) / rect.width) * sequenceDuration;
                            setAudioMenu({ visible: true, x: e.clientX, y: e.clientY, clickTime });
                        }}
                        onPointerDown={(e) => {
                            if (activeTool === 'select') {
                                // Fix 6: stop propagation so handleLanesMouseDown doesn't also seek playhead
                                e.stopPropagation();
                                setSelectedLane('scrollPos');
                                const targetEl = e.currentTarget as HTMLElement;
                                const rect = targetEl.getBoundingClientRect();
                                const startX = e.clientX - rect.left;
                                const startY = e.clientY - rect.top;
                                const initialSelected = e.shiftKey ? useStore.getState().selectedKeyframes : [];
                                setMarqueeBox({ laneId: 'scrollPos', startX, startY, currentX: startX, currentY: startY });
                                try { targetEl.setPointerCapture(e.pointerId); } catch (_) {}

                                const onMove = (ev: PointerEvent) => {
                                    const r = targetEl.getBoundingClientRect();
                                    const curX = Math.max(0, Math.min(r.width, ev.clientX - r.left));
                                    const curY = Math.max(0, Math.min(r.height, ev.clientY - r.top));
                                    setMarqueeBox({ laneId: 'scrollPos', startX, startY, currentX: curX, currentY: curY });

                                    const minX = Math.min(startX, curX);
                                    const maxX = Math.max(startX, curX);
                                    const minY = Math.min(startY, curY);
                                    const maxY = Math.max(startY, curY);

                                    const seqDur = useStore.getState().sequenceDuration;
                                    const currentKfs = useStore.getState().scrollKeyframes;
                                    const laneH = r.height;
                                    const boxed = currentKfs.filter(kf => {
                                        const kfX = (kf.time / seqDur) * r.width;
                                        const kfY = (1 - kf.value) * laneH;
                                        return kfX >= minX && kfX <= maxX && kfY >= minY && kfY <= maxY;
                                    }).map(kf => ({ laneId: 'scrollPos', position: kf.time, value: kf.value }));

                                    const combined = [...initialSelected];
                                    boxed.forEach(item => {
                                        if (!combined.some(c => c.laneId === item.laneId && Math.abs(c.position - item.position) < 0.001)) {
                                            combined.push(item);
                                        }
                                    });

                                    setSelectedKeyframes(combined);
                                };

                                const onUp = (ev: PointerEvent) => {
                                    try { targetEl.releasePointerCapture(ev.pointerId); } catch (_) {}
                                    setMarqueeBox(null);
                                    window.removeEventListener('pointermove', onMove as any);
                                    window.removeEventListener('pointerup', onUp as any);
                                };

                                window.addEventListener('pointermove', onMove as any);
                                window.addEventListener('pointerup', onUp as any);
                                return;
                            }

                            if (e.shiftKey) {
                                setSelectedLane('scrollPos');
                                handleTrackPointerDown(e);
                                return;
                            }
                            if (activeTool !== 'pen' && activeTool !== 'eraser') return;
                            e.stopPropagation();
                            const target = e.currentTarget;
                            target.setPointerCapture(e.pointerId);

                            if (activeTool === 'eraser') {
                                const eraseAt = (clientX: number, clientY: number) => {
                                    const rect = target.getBoundingClientRect();
                                    const seqDur = useStore.getState().sequenceDuration;
                                    const clickTime = Math.max(0, Math.min(seqDur, ((clientX - rect.left) / rect.width) * seqDur));
                                    const clickVal = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));

                                    const kfs = useStore.getState().scrollKeyframes;
                                    const filtered = kfs.filter(k => !(Math.abs(k.time - clickTime) < 0.40 && Math.abs(k.value - clickVal) < 0.30));
                                    if (filtered.length !== kfs.length) {
                                        useStore.getState().setScrollKeyframes(filtered);
                                    }
                                };
                                useStore.getState().pushHistory();
                                eraseAt(e.clientX, e.clientY);

                                const onMove = (ev: PointerEvent) => { if (ev.buttons & 1) eraseAt(ev.clientX, ev.clientY); };
                                const onUp = () => { target.removeEventListener('pointermove', onMove as any); target.removeEventListener('pointerup', onUp as any); };
                                target.addEventListener('pointermove', onMove as any);
                                target.addEventListener('pointerup', onUp as any);
                                return;
                            }

                            useStore.getState().pushHistory();

                            let lastTime: number | null = null;
                            let lastValue: number | null = null;
                            let strokePoints: { time: number; value: number }[] = [];

                            const addPoint = (clientX: number, clientY: number) => {
                                const rect = target.getBoundingClientRect();
                                const seqDur = useStore.getState().sequenceDuration;
                                const rawTime = Math.max(0, Math.min(seqDur, ((clientX - rect.left) / rect.width) * seqDur));
                                const time = snapTimeToBeat(rawTime);
                                const rawVal = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));

                                // Exponential Moving Average (EMA) Low-Pass Filter: 70% previous + 30% current (filters out hand jitter micro-spikes)
                                const value = lastValue === null ? rawVal : +(lastValue * 0.70 + rawVal * 0.30).toFixed(3);

                                if (lastTime === null || Math.abs(time - lastTime) >= 0.04 || Math.abs(value - (lastValue ?? 0)) >= 0.02) {
                                    lastTime = time;
                                    lastValue = value;
                                    strokePoints.push({ time, value });
                                    useStore.getState().addScrollKeyframe(time, value);
                                }
                            };

                            addPoint(e.clientX, e.clientY);

                            const onMove = (ev: PointerEvent) => {
                                if (ev.buttons & 1) addPoint(ev.clientX, ev.clientY);
                            };

                            const onUp = () => {
                                target.removeEventListener('pointermove', onMove as any);
                                target.removeEventListener('pointerup', onUp as any);

                                // Post-stroke smoothing pass over strokePoints
                                if (strokePoints.length > 4) {
                                    const allKfs = useStore.getState().scrollKeyframes;
                                    const strokeTimes = new Set(strokePoints.map(p => p.time));

                                    const smoothedStroke = strokePoints.map((pt, i) => {
                                        if (i === 0 || i === strokePoints.length - 1) return pt;
                                        const prev = strokePoints[i - 1].value;
                                        const curr = pt.value;
                                        const next = strokePoints[i + 1].value;
                                        return { time: pt.time, value: +(prev * 0.25 + curr * 0.5 + next * 0.25).toFixed(3) };
                                    });

                                    const merged = allKfs
                                        .filter(kf => !strokeTimes.has(kf.time))
                                        .concat(smoothedStroke)
                                        .sort((a, b) => a.time - b.time);

                                    useStore.getState().setScrollKeyframes(merged);
                                }
                            };

                            target.addEventListener('pointermove', onMove as any);
                            target.addEventListener('pointerup', onUp as any);
                        }}
                    >
                        {/* Marquee Selection Box Overlay */}
                        {marqueeBox && marqueeBox.laneId === 'scrollPos' && (
                            <div
                                className="absolute border border-editor-accent-purple bg-editor-accent-purple/20 pointer-events-none z-30"
                                style={{
                                    left: Math.min(marqueeBox.startX, marqueeBox.currentX),
                                    top: Math.min(marqueeBox.startY, marqueeBox.currentY),
                                    width: Math.abs(marqueeBox.currentX - marqueeBox.startX),
                                    height: Math.abs(marqueeBox.currentY - marqueeBox.startY),
                                }}
                            />
                        )}

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
                            {snapToBeat && beats.map((bt, i) => (
                                <line
                                    key={i}
                                    x1={(bt / sequenceDuration) * VB_W} y1={0}
                                    x2={(bt / sequenceDuration) * VB_W} y2={scrollVbH}
                                    stroke="rgba(168,85,247,0.25)" strokeWidth="0.8"
                                />
                            ))}
                            {scrollPolyline && (
                                <polyline points={scrollPolyline} fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                            )}
                            {scrollKeyframes.length >= 2 && (() => {
                                const scaleX = VB_W / sequenceDuration;
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
                                        {scrollKeyframes.slice(0, -1).map((kf1, i) => {
                                            const kf2 = scrollKeyframes[i + 1];
                                            const x1 = (kf1.time / sequenceDuration) * VB_W;
                                            const y1 = (1 - kf1.value) * scrollVbH;
                                            const x2 = (kf2.time / sequenceDuration) * VB_W;
                                            const y2 = (1 - kf2.value) * scrollVbH;
                                            return (
                                                <line
                                                    key={`seg-${i}`}
                                                    x1={x1} y1={y1} x2={x2} y2={y2}
                                                    stroke="transparent"
                                                    strokeWidth="10"
                                                    className="cursor-ns-resize pointer-events-auto"
                                                    onPointerDown={(e) => handleSegmentDrag('scrollPos', kf1.time, kf2.time, kf1.value, kf2.value, 0, 1, e)}
                                                />
                                            );
                                        })}
                                    </>
                                );
                            })()}
                            {(() => {
                                 const scaleX = VB_W / sequenceDuration;
                                 const isSingleSel = selectedKeyframes.length === 1;
                                 return scrollKeyframes.map((kf, idx) => {
                                     const isKfSelected = selectedKeyframes.some(s => s.laneId === 'scrollPos' && Math.abs(s.position - kf.time) < 0.02);
                                     if (!isKfSelected) return null;
                                     const hasCustomHandle = !!(kf.handleOut || kf.handleIn);
                                     if (!isSingleSel && !hasCustomHandle) return null;
                                     const kx = kf.time * scaleX;
                                     const ky = (1 - kf.value) * scrollVbH;
                                     const hasNext = idx < scrollKeyframes.length - 1;
                                     const hasPrev = idx > 0;
                                     const outDt = hasNext ? (kf.handleOut?.dt ?? (scrollKeyframes[idx + 1].time - kf.time) / 3) : 0;
                                     const outDv = hasNext ? (kf.handleOut?.dv ?? 0) : 0;
                                     const inDt  = hasPrev ? (kf.handleIn?.dt  ?? -(kf.time - scrollKeyframes[idx - 1].time) / 3) : 0;
                                     const inDv  = hasPrev ? (kf.handleIn?.dv  ?? 0) : 0;
                                     const hox = kx + outDt * scaleX, hoy = ky - outDv * scrollVbH;
                                     const hix = kx + inDt  * scaleX, hiy = ky - inDv  * scrollVbH;
                                     return (
                                         <g key={idx}>
                                             {hasNext && <line x1={kx} y1={ky} x2={hox} y2={hoy} stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke"/>}
                                             {hasPrev && <line x1={kx} y1={ky} x2={hix} y2={hiy} stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke"/>}
                                         </g>
                                     );
                                 });
                             })()}
                         </svg>
                         <div className="absolute inset-0 pointer-events-none">
                             {/* Bezier Handle Knobs in HTML for scrollPos */}
                             {scrollKeyframes.map((kf, idx) => {
                                 const isKfSelected = selectedKeyframes.some(s => s.laneId === 'scrollPos' && Math.abs(s.position - kf.time) < 0.02);
                                 if (!isKfSelected) return null;
                                 const hasCustomHandle = !!(kf.handleOut || kf.handleIn);
                                 if (selectedKeyframes.length > 1 && !hasCustomHandle) return null;
                                 const scaleX = VB_W / sequenceDuration;
                                 const kx = kf.time * scaleX;
                                 const ky = (1 - kf.value) * scrollVbH;
                                 const hasNext = idx < scrollKeyframes.length - 1;
                                 const hasPrev = idx > 0;
                                 const outDt = hasNext ? (kf.handleOut?.dt ?? (scrollKeyframes[idx + 1].time - kf.time) / 3) : 0;
                                 const outDv = hasNext ? (kf.handleOut?.dv ?? 0) : 0;
                                 const inDt  = hasPrev ? (kf.handleIn?.dt  ?? -(kf.time - scrollKeyframes[idx - 1].time) / 3) : 0;
                                 const inDv  = hasPrev ? (kf.handleIn?.dv  ?? 0) : 0;
                                 const hox = kx + outDt * scaleX, hoy = ky - outDv * scrollVbH;
                                 const hix = kx + inDt  * scaleX, hiy = ky - inDv  * scrollVbH;

                                 const renderHandleDiv = (hx: number, hy: number, side: 'in' | 'out') => (
                                     <div
                                         key={side}
                                         className="absolute w-2 h-2 rounded-full bg-[#3b82f6] border border-white -translate-x-1/2 -translate-y-1/2 cursor-move pointer-events-auto z-40"
                                         style={{
                                             left: `${(hx / VB_W) * 100}%`,
                                             top: `${(hy / scrollVbH) * 100}%`,
                                         }}
                                         onMouseDown={(e) => e.stopPropagation()}
                                         onPointerDown={(e) => {
                                             e.stopPropagation();
                                             (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                             draggingHandleRef.current = { kfTime: kf.time, side };
                                         }}
                                         onPointerMove={(e) => {
                                             if (!draggingHandleRef.current || !(e.buttons & 1)) return;
                                             const { kfTime: t, side: s } = draggingHandleRef.current;
                                             const ref = scrollKeyframes.find(k => Math.abs(k.time - t) < 0.02);
                                             if (!ref) return;
                                             const container = (e.target as HTMLElement).parentElement!;
                                             const rect = container.getBoundingClientRect();
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

                                 return (
                                     <React.Fragment key={`scroll-handle-knobs-${idx}`}>
                                         {hasNext && renderHandleDiv(hox, hoy, 'out')}
                                         {hasPrev && renderHandleDiv(hix, hiy, 'in')}
                                     </React.Fragment>
                                 );
                             })}
                             {/* Keyframe Dots for scrollPos (fixed 6px size, gold highlight on selection) */}
                             {scrollKeyframes.map((kf, i) => {
                                 const isSelected = selectedKeyframes.some(s => s.laneId === 'scrollPos' && Math.abs(s.position - kf.time) < 0.05);
                                 return (
                                     <div
                                         key={i}
                                         className={`absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 ${activeTool === 'eraser' ? 'cursor-cell' : 'cursor-move'} pointer-events-auto z-30`}
                                         style={{
                                             width: 18, height: 18,
                                             left: `${(kf.time / sequenceDuration) * 100}%`,
                                             top: `${(1 - kf.value) * 100}%`,
                                         }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (hasMovedKfRef.current) {
                                                hasMovedKfRef.current = false;
                                                return;
                                            }
                                            if (activeTool === 'eraser') {
                                                useStore.getState().pushHistory();
                                                useStore.getState().setScrollKeyframes(scrollKeyframes.filter(k => Math.abs(k.time - kf.time) > 0.005));
                                                return;
                                            }
                                            const updated = { laneId: 'scrollPos', position: kf.time, value: kf.value };
                                            const currentSel = useStore.getState().selectedKeyframes;
                                            const isAlreadySelected = currentSel.some(s => s.laneId === 'scrollPos' && Math.abs(s.position - kf.time) < 0.02);
                                            if (e.shiftKey) toggleSelectedKeyframe(updated);
                                            else if (!isAlreadySelected) setSelectedKeyframe(updated);
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedKeyframe({ laneId: 'scrollPos', position: kf.time, value: kf.value });
                                            setAudioMenu({ visible: true, x: e.clientX, y: e.clientY, clickTime: kf.time });
                                        }}
                                        onPointerDown={(e) => {
                                            if (activeTool === 'eraser') return;
                                            e.stopPropagation();
                                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                            useStore.getState().pushHistory();
                                            hasMovedKfRef.current = false;

                                            const currentSelected = useStore.getState().selectedKeyframes;
                                            const isCurrentSelected = currentSelected.some(s => s.laneId === 'scrollPos' && Math.abs(s.position - kf.time) < 0.02);
                                            const activeSelection = isCurrentSelected && currentSelected.length > 0
                                                ? currentSelected
                                                : [{ laneId: 'scrollPos', position: kf.time, value: kf.value }];

                                            if (!isCurrentSelected) {
                                                setSelectedKeyframes(activeSelection);
                                            }

                                            const trackEl = (e.currentTarget as HTMLElement).closest('[data-lane-track]') as HTMLElement | null
                                                ?? (e.currentTarget as HTMLElement).parentElement?.parentElement as HTMLElement;
                                            const trackRect = trackEl?.getBoundingClientRect() ?? (e.currentTarget as HTMLElement).getBoundingClientRect();

                                            draggingKfRef.current = {
                                                startClientX: e.clientX,
                                                startClientY: e.clientY,
                                                trackRect,
                                                origKfs: activeSelection,
                                                initialScrollKfs: useStore.getState().scrollKeyframes,
                                                initialParamKfs: useStore.getState().paramKeyframes,
                                            } as any;
                                        }}
                                        onPointerMove={(e) => {
                                            if (!draggingKfRef.current || !(e.buttons & 1)) return;
                                            const { startClientX, startClientY, trackRect, origKfs, initialScrollKfs, initialParamKfs } = draggingKfRef.current as any;
                                            const rect = trackRect as DOMRect;

                                            const dx = e.clientX - startClientX;
                                            const dy = e.clientY - startClientY;

                                            if (Math.hypot(dx, dy) > 2) {
                                                hasMovedKfRef.current = true;
                                            }

                                            const deltaTime = (dx / rect.width) * sequenceDuration;
                                            const normDeltaValue = -(dy / rect.height);
                                            const isShift = e.shiftKey;

                                            const updatedSelection = origKfs.map((orig: any) => {
                                                const isScroll = orig.laneId === 'scrollPos';
                                                const laneCfg = isScroll ? { min: 0, max: 1 } : (PARAM_LANES.find(l => l.id === orig.laneId) ?? { min: 0, max: 1 });
                                                const range = laneCfg.max - laneCfg.min;
                                                const deltaV = normDeltaValue * range;

                                                const applyTimeDelta = isShift ? (Math.abs(dx) >= Math.abs(dy) ? deltaTime : 0) : deltaTime;
                                                const applyValueDelta = isShift ? (Math.abs(dy) > Math.abs(dx) ? deltaV : 0) : deltaV;

                                                const newTime = Math.abs(applyTimeDelta) < 0.0001
                                                    ? orig.position
                                                    : Math.max(0, Math.min(sequenceDuration, +(orig.position + applyTimeDelta).toFixed(4)));
                                                const newValue = Math.max(laneCfg.min, Math.min(laneCfg.max, +(orig.value + applyValueDelta).toFixed(3)));
                                                return { laneId: orig.laneId, position: newTime, value: newValue };
                                            });

                                            // Apply to scrollPos
                                            const scrollOrigs = origKfs.filter((s: any) => s.laneId === 'scrollPos');
                                            if (scrollOrigs.length > 0) {
                                                const initialKfs = initialScrollKfs || [];
                                                const remainingScroll = initialKfs.filter((k: any) =>
                                                    !scrollOrigs.some((orig: any) => Math.abs(k.time - orig.position) < 0.001)
                                                );
                                                const updatedScroll = updatedSelection.filter((s: any) => s.laneId === 'scrollPos');
                                                const mergedScroll = remainingScroll
                                                    .concat(updatedScroll.map((s: any, idx: number) => {
                                                        const origPos = scrollOrigs[idx]?.position ?? s.position;
                                                        const origKf = initialKfs.find((k: any) => Math.abs(k.time - origPos) < 0.001);
                                                        return {
                                                            time: s.position,
                                                            value: s.value,
                                                            easing: origKf?.easing ?? 'linear',
                                                            handleIn: origKf?.handleIn,
                                                            handleOut: origKf?.handleOut,
                                                        };
                                                    }))
                                                    .sort((a: any, b: any) => a.time - b.time);
                                                setScrollKeyframes(mergedScroll);
                                            }

                                            // Apply to affected parameter lanes — Fix 5: preserve easing/handles
                                            const affectedParamLanes = new Set<string>(origKfs.filter((s: any) => s.laneId !== 'scrollPos').map((s: any) => s.laneId));
                                            affectedParamLanes.forEach((lId: string) => {
                                                const laneOrigs = origKfs.filter((s: any) => s.laneId === lId);
                                                const initialLaneKfs = ((initialParamKfs || {})[lId] ?? []) as ParamKf[];
                                                const remainingParam = initialLaneKfs.filter((k: ParamKf) =>
                                                    !laneOrigs.some((orig: any) => Math.abs(k.time - orig.position) < 0.001)
                                                );
                                                const updatedParam = updatedSelection.filter((s: any) => s.laneId === lId);
                                                const mergedParam = remainingParam
                                                    .concat(updatedParam.map((s: any, idx: number) => {
                                                        const origPos = laneOrigs[idx]?.position ?? s.position;
                                                        const origKf = initialLaneKfs.find((k: ParamKf) => Math.abs(k.time - origPos) < 0.001);
                                                        return {
                                                            time: s.position,
                                                            value: s.value,
                                                            easing: origKf?.easing ?? 'linear',
                                                            handleIn: origKf?.handleIn,
                                                            handleOut: origKf?.handleOut,
                                                        };
                                                    }))
                                                    .sort((a: ParamKf, b: ParamKf) => a.time - b.time);
                                                setParamKeyframes(lId, mergedParam as ParamKf[]);
                                            });

                                            setSelectedKeyframes(updatedSelection);
                                        }}
                                        onPointerUp={() => { draggingKfRef.current = null; }}
                                    >
                                        <div
                                            className="rounded-full border transition-colors shadow-sm pointer-events-none"
                                            style={{
                                                width: isSelected ? 8 : 6,
                                                height: isSelected ? 8 : 6,
                                                borderColor: isSelected ? '#ffffff' : '#3b82f6',
                                                backgroundColor: isSelected ? '#fbbf24' : '#3b82f6',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                            <div
                                className="absolute rounded-full border-[1.5px] border-[#3b82f6] shadow-[0_0_6px_rgba(59,130,246,0.8)] pointer-events-none"
                                style={{
                                    width: 6, height: 6,
                                    left: `calc(${(seqTime / sequenceDuration) * 100}% - 3px)`,
                                    top: `calc(${(1 - scrollProgress) * 100}% - 3px)`,
                                    backgroundColor: 'var(--color-editor-bg)'
                                }}
                            />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-[#3b82f6]/40 z-40" onPointerDown={makeLaneDrag('scrollPos', 48)} />
                </div>
                )}
                {PARAM_LANES.filter(lane => isolatedLane === 'all' || isolatedLane === lane.id || (isolatedLane === 'depth' && (lane.id === 'depth' || lane.id === 'size'))).map(lane => {
                    const kfs = (paramKeyframes[lane.id] ?? []) as ParamKf[];
                    const currentVal = paramCurrentValues[lane.id];
                    const normalY = (v: number) => (1 - (v - lane.min) / (lane.max - lane.min)) * VB_H;
                    const curvePath = buildParamPath(kfs, lane.min, lane.max, sequenceDuration);
                    const fillPath = buildParamFillPath(kfs, lane.min, lane.max, sequenceDuration);
                    const isSelected = selectedLane === lane.id;
                    const currentLaneHeight = isolatedLane === lane.id ? 220 : laneH(lane.id);
                    return (
                        <div key={lane.id} className="flex border-b border-editor-border group relative" style={{ height: currentLaneHeight }}>
                            <div
                                className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-editor-border sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors overflow-hidden ${isSelected ? 'bg-editor-surface-hover border-l-2 border-editor-accent-purple text-editor-fg font-semibold' : 'bg-editor-panel text-editor-fg hover:bg-editor-surface'}`}
                                onClick={() => setSelectedLane(lane.id)}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        <SlidersHorizontal className="w-2.5 h-2.5 shrink-0" style={{ color: lane.color }} />
                                        <span className="text-[10px] uppercase font-medium text-editor-fg truncate">{lane.label}</span>
                                    </div>
                                    {kfs.length > 0 && (
                                        <button
                                            className="text-[9px] text-editor-muted hover:text-editor-fg transition-colors shrink-0 ml-1"
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
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedLane(lane.id);
                                    setAudioTargetLane(lane.id);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickTime = ((e.clientX - rect.left) / rect.width) * sequenceDuration;
                                    setAudioMenu({ visible: true, x: e.clientX, y: e.clientY, clickTime });
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    // Fix 4: use lane track element's own rect, not the outer scrollable container
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const t = Math.max(0, Math.min(sequenceDuration, ((e.clientX - rect.left) / rect.width) * sequenceDuration));
                                    const existing = interpolateParamAt(kfs, t);
                                    addParamKeyframe(lane.id, t, existing ?? currentVal);
                                }}
                                onPointerDown={(e) => {
                                    if (activeTool === 'select') {
                                        e.stopPropagation();
                                        setSelectedLane(lane.id);
                                        const targetEl = e.currentTarget as HTMLElement;
                                        const rect = targetEl.getBoundingClientRect();
                                        const startX = e.clientX - rect.left;
                                        const startY = e.clientY - rect.top;
                                        const initialSelected = e.shiftKey ? useStore.getState().selectedKeyframes : [];
                                        setMarqueeBox({ laneId: lane.id, startX, startY, currentX: startX, currentY: startY });
                                        try { targetEl.setPointerCapture(e.pointerId); } catch (_) {}

                                        const onMove = (ev: PointerEvent) => {
                                            const r = targetEl.getBoundingClientRect();
                                            const curX = Math.max(0, Math.min(r.width, ev.clientX - r.left));
                                            const curY = Math.max(0, Math.min(r.height, ev.clientY - r.top));
                                            setMarqueeBox({ laneId: lane.id, startX, startY, currentX: curX, currentY: curY });

                                            const minX = Math.min(startX, curX);
                                            const maxX = Math.max(startX, curX);
                                            const minY = Math.min(startY, curY);
                                            const maxY = Math.max(startY, curY);

                                            const currentKfs = (useStore.getState().paramKeyframes[lane.id] ?? []) as ParamKf[];
                                            const boxed = currentKfs.filter(kf => {
                                                const kfX = (kf.time / sequenceDuration) * r.width;
                                                const normYRatio = (1 - (kf.value - lane.min) / (lane.max - lane.min));
                                                const kfY = normYRatio * r.height;
                                                return kfX >= minX && kfX <= maxX && kfY >= minY && kfY <= maxY;
                                            }).map(kf => ({ laneId: lane.id, position: kf.time, value: kf.value }));

                                            const combined = [...initialSelected];
                                            boxed.forEach(item => {
                                                if (!combined.some(c => c.laneId === item.laneId && Math.abs(c.position - item.position) < 0.001)) {
                                                    combined.push(item);
                                                }
                                            });

                                            setSelectedKeyframes(combined);
                                        };

                                        const onUp = (ev: PointerEvent) => {
                                            try { targetEl.releasePointerCapture(ev.pointerId); } catch (_) {}
                                            setMarqueeBox(null);
                                            window.removeEventListener('pointermove', onMove as any);
                                            window.removeEventListener('pointerup', onUp as any);
                                        };

                                        window.addEventListener('pointermove', onMove as any);
                                        window.addEventListener('pointerup', onUp as any);
                                        return;
                                    }

                                    if (e.shiftKey) {
                                        setSelectedLane(lane.id);
                                        handleTrackPointerDown(e);
                                        return;
                                    }
                                    if (activeTool !== 'pen' && activeTool !== 'eraser') return;
                                    e.stopPropagation();
                                    const target = e.currentTarget as HTMLElement;
                                    target.setPointerCapture(e.pointerId);

                                    if (activeTool === 'eraser') {
                                        const eraseAt = (clientX: number, clientY: number) => {
                                            const rect = target.getBoundingClientRect();
                                            // Fix 3: use sequenceDuration (dynamic) not SEQUENCE_DURATION (hardcoded 10)
                                            const seqDur = useStore.getState().sequenceDuration;
                                            const clickTime = Math.max(0, Math.min(seqDur, ((clientX - rect.left) / rect.width) * seqDur));
                                            const clickVal = Math.max(lane.min, Math.min(lane.max, lane.min + (1 - (clientY - rect.top) / rect.height) * (lane.max - lane.min)));

                                            const currentKfs = (useStore.getState().paramKeyframes[lane.id] ?? []) as ParamKf[];
                                            const range = lane.max - lane.min;
                                            const filtered = currentKfs.filter(k => !(Math.abs(k.time - clickTime) < 0.40 && Math.abs(k.value - clickVal) < range * 0.30));
                                            if (filtered.length !== currentKfs.length) {
                                                useStore.getState().setParamKeyframes(lane.id, filtered);
                                            }
                                        };
                                        useStore.getState().pushHistory();
                                        eraseAt(e.clientX, e.clientY);

                                        const onMove = (ev: PointerEvent) => { if (ev.buttons & 1) eraseAt(ev.clientX, ev.clientY); };
                                        const onUp = () => { target.removeEventListener('pointermove', onMove as any); target.removeEventListener('pointerup', onUp as any); };
                                        target.addEventListener('pointermove', onMove as any);
                                        target.addEventListener('pointerup', onUp as any);
                                        return;
                                    }

                                    useStore.getState().pushHistory();
                                    const rect = target.getBoundingClientRect();
                                    const seqDurPen = useStore.getState().sequenceDuration;
                                    // Fix 3: use sequenceDuration not SEQUENCE_DURATION
                                    const rawTime = Math.max(0, Math.min(seqDurPen, ((e.clientX - rect.left) / rect.width) * seqDurPen));
                                    const time = snapTimeToBeat(rawTime);
                                    const value = Math.max(lane.min, Math.min(lane.max, lane.min + (1 - (e.clientY - rect.top) / rect.height) * (lane.max - lane.min)));
                                    addParamKeyframe(lane.id, time, value);

                                    const onMove = (ev: PointerEvent) => {
                                        if (ev.buttons & 1) {
                                            const r = target.getBoundingClientRect();
                                            const seqDurMove = useStore.getState().sequenceDuration;
                                            const rt = Math.max(0, Math.min(seqDurMove, ((ev.clientX - r.left) / r.width) * seqDurMove));
                                            const t = snapTimeToBeat(rt);
                                            const v = Math.max(lane.min, Math.min(lane.max, lane.min + (1 - (ev.clientY - r.top) / r.height) * (lane.max - lane.min)));
                                            addParamKeyframe(lane.id, t, v);
                                        }
                                    };
                                    const onUp = () => { target.removeEventListener('pointermove', onMove as any); target.removeEventListener('pointerup', onUp as any); };
                                    target.addEventListener('pointermove', onMove as any);
                                    target.addEventListener('pointerup', onUp as any);
                                }}
                            >
                                {/* Marquee Selection Box Overlay */}
                                {marqueeBox && marqueeBox.laneId === lane.id && (
                                    <div
                                        className="absolute border border-editor-accent-purple bg-editor-accent-purple/20 pointer-events-none z-30"
                                        style={{
                                            left: Math.min(marqueeBox.startX, marqueeBox.currentX),
                                            top: Math.min(marqueeBox.startY, marqueeBox.currentY),
                                            width: Math.abs(marqueeBox.currentX - marqueeBox.startX),
                                            height: Math.abs(marqueeBox.currentY - marqueeBox.startY),
                                        }}
                                    />
                                )}

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
                                    {kfs.slice(0, -1).map((kf1, i) => {
                                        const kf2 = kfs[i + 1];
                                        const x1 = (kf1.time / sequenceDuration) * VB_W;
                                        const y1 = normalY(kf1.value);
                                        const x2 = (kf2.time / sequenceDuration) * VB_W;
                                        const y2 = normalY(kf2.value);
                                        return (
                                            <line
                                                key={`seg-${i}`}
                                                x1={x1} y1={y1} x2={x2} y2={y2}
                                                stroke="transparent"
                                                strokeWidth="10"
                                                className="cursor-ns-resize pointer-events-auto"
                                                onPointerDown={(e) => handleSegmentDrag(lane.id, kf1.time, kf2.time, kf1.value, kf2.value, lane.min, lane.max, e)}
                                            />
                                    );
                                })}
                                {activeTool === 'select' && (() => {
                                    const isSingleSel = selectedKeyframes.length === 1;
                                    return kfs.map((kf, idx) => {
                                        const isKfSelected = selectedKeyframes.some(s => s.laneId === lane.id && Math.abs(s.position - kf.time) < 0.02);
                                        if (!isKfSelected) return null;
                                        const hasCustomHandle = !!(kf.handleOut || kf.handleIn);
                                        if (!isSingleSel && !hasCustomHandle) return null;
                                        const scaleX = VB_W / sequenceDuration;
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
                                        return (
                                            <g key={`h-${idx}`}>
                                                {hasNext && <line x1={kx} y1={ky} x2={hox} y2={hoy} stroke={lane.color} strokeWidth="1" vectorEffect="non-scaling-stroke"/>}
                                                {hasPrev && <line x1={kx} y1={ky} x2={hix} y2={hiy} stroke={lane.color} strokeWidth="1" vectorEffect="non-scaling-stroke"/>}
                                            </g>
                                        );
                                    });
                                })()}
                        </svg>
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Bezier Handle Knobs in HTML for param lane */}
                            {activeTool === 'select' && kfs.map((kf, idx) => {
                                const isKfSelected = selectedKeyframes.some(s => s.laneId === lane.id && Math.abs(s.position - kf.time) < 0.02);
                                if (!isKfSelected) return null;
                                const hasCustomHandle = !!(kf.handleOut || kf.handleIn);
                                if (selectedKeyframes.length > 1 && !hasCustomHandle) return null;
                                const scaleX = VB_W / sequenceDuration;
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

                                const renderParamHandleDiv = (hx: number, hy: number, side: 'in' | 'out') => (
                                    <div
                                        key={side}
                                        className="absolute w-2 h-2 rounded-full border border-white -translate-x-1/2 -translate-y-1/2 cursor-move pointer-events-auto z-40"
                                        style={{
                                            backgroundColor: lane.color,
                                            left: `${(hx / VB_W) * 100}%`,
                                            top: `${(hy / VB_H) * 100}%`,
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => {
                                            e.stopPropagation();
                                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                            draggingParamHandleRef.current = { laneId: lane.id, kfTime: kf.time, side };
                                        }}
                                        onPointerMove={(e) => {
                                            if (!draggingParamHandleRef.current || !(e.buttons & 1)) return;
                                            const { laneId, kfTime, side: s } = draggingParamHandleRef.current;
                                            const refKf = (paramKeyframes[laneId] ?? []).find(k => Math.abs(k.time - kfTime) < 0.02);
                                            if (!refKf) return;
                                            const container = (e.target as HTMLElement).parentElement!;
                                            const rect = container.getBoundingClientRect();
                                            const normX = (e.clientX - rect.left) / rect.width;
                                            const normY = (e.clientY - rect.top) / rect.height;
                                            const svgX = normX * VB_W;
                                            const svgY = normY * VB_H;
                                            const laneScaleX = VB_W / sequenceDuration;
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
                                    <React.Fragment key={`param-handle-knobs-${idx}`}>
                                        {hasNext && renderParamHandleDiv(hox, hoy, 'out')}
                                        {hasPrev && renderParamHandleDiv(hix, hiy, 'in')}
                                    </React.Fragment>
                                );
                            })}
                            {/* Keyframe Dots for param lane (18px hit target, gold highlight on selection) */}
                            {kfs.map((kf, i) => {
                                const kfSelected = selectedKeyframes.some(s => s.laneId === lane.id && Math.abs(s.position - kf.time) < 0.05);
                                return (
                                    <div
                                        key={i}
                                        className={`absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 ${activeTool === 'eraser' ? 'cursor-cell' : 'cursor-move'} pointer-events-auto z-30`}
                                        style={{
                                            width: 18, height: 18,
                                            left: `${(kf.time / sequenceDuration) * 100}%`,
                                            top: `${(normalY(kf.value) / VB_H) * 100}%`,
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (hasMovedKfRef.current) {
                                                hasMovedKfRef.current = false;
                                                return;
                                            }
                                            if (activeTool === 'eraser') {
                                                useStore.getState().pushHistory();
                                                useStore.getState().removeParamKeyframe(lane.id, kf.time);
                                                setSelectedKeyframe(null);
                                                return;
                                            }
                                            const updated = { laneId: lane.id, position: kf.time, value: kf.value };
                                            const currentSel = useStore.getState().selectedKeyframes;
                                            const isAlreadySelected = currentSel.some(s => s.laneId === lane.id && Math.abs(s.position - kf.time) < 0.02);
                                            if (e.shiftKey) toggleSelectedKeyframe(updated);
                                            else if (!isAlreadySelected) setSelectedKeyframe(updated);
                                        }}
                                        onPointerDown={(e) => {
                                            if (activeTool === 'eraser') return;
                                            e.stopPropagation();
                                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                            useStore.getState().pushHistory();
                                            hasMovedKfRef.current = false;

                                            const currentSelected = useStore.getState().selectedKeyframes;
                                            const isCurrentSelected = currentSelected.some(s => s.laneId === lane.id && Math.abs(s.position - kf.time) < 0.02);
                                            const activeSelection = isCurrentSelected && currentSelected.length > 0
                                                ? currentSelected
                                                : [{ laneId: lane.id, position: kf.time, value: kf.value }];

                                            if (!isCurrentSelected) {
                                                setSelectedKeyframes(activeSelection);
                                            }

                                            const dotEl = e.currentTarget as HTMLElement;
                                            const trackEl = dotEl.parentElement?.parentElement as HTMLElement | null;
                                            const trackRect = trackEl?.getBoundingClientRect() ?? dotEl.getBoundingClientRect();

                                            draggingParamKfRef.current = {
                                                laneId: lane.id,
                                                startClientX: e.clientX,
                                                startClientY: e.clientY,
                                                trackRect,
                                                origKfs: activeSelection,
                                                initialScrollKfs: useStore.getState().scrollKeyframes,
                                                initialParamKfs: useStore.getState().paramKeyframes,
                                            } as any;
                                        }}
                                        onPointerMove={(e) => {
                                            if (!draggingParamKfRef.current || !(e.buttons & 1)) return;
                                            const { startClientX, startClientY, trackRect, origKfs, initialScrollKfs, initialParamKfs } = draggingParamKfRef.current as any;
                                            const rect = trackRect as DOMRect;

                                            const dx = e.clientX - startClientX;
                                            const dy = e.clientY - startClientY;

                                            if (Math.hypot(dx, dy) > 2) {
                                                hasMovedKfRef.current = true;
                                            }

                                            const deltaTime = (dx / rect.width) * sequenceDuration;
                                            const normDeltaValue = -(dy / rect.height);
                                            const isShift = e.shiftKey;

                                            const updatedSelection = origKfs.map((orig: any) => {
                                                const isScroll = orig.laneId === 'scrollPos';
                                                const laneCfg = isScroll ? { min: 0, max: 1 } : (PARAM_LANES.find(l => l.id === orig.laneId) ?? { min: 0, max: 1 });
                                                const range = laneCfg.max - laneCfg.min;
                                                const deltaV = normDeltaValue * range;

                                                const applyTimeDelta = isShift ? (Math.abs(dx) >= Math.abs(dy) ? deltaTime : 0) : deltaTime;
                                                const applyValueDelta = isShift ? (Math.abs(dy) > Math.abs(dx) ? deltaV : 0) : deltaV;

                                                const newTime = Math.abs(applyTimeDelta) < 0.0001
                                                    ? orig.position
                                                    : Math.max(0, Math.min(sequenceDuration, +(orig.position + applyTimeDelta).toFixed(4)));
                                                const newValue = Math.max(laneCfg.min, Math.min(laneCfg.max, +(orig.value + applyValueDelta).toFixed(3)));
                                                return { laneId: orig.laneId, position: newTime, value: newValue };
                                            });

                                            // Apply to scrollPos
                                            const scrollOrigs = origKfs.filter((s: any) => s.laneId === 'scrollPos');
                                            if (scrollOrigs.length > 0) {
                                                const initialKfs = initialScrollKfs || [];
                                                const remainingScroll = initialKfs.filter((k: any) =>
                                                    !scrollOrigs.some((orig: any) => Math.abs(k.time - orig.position) < 0.001)
                                                );
                                                const updatedScroll = updatedSelection.filter((s: any) => s.laneId === 'scrollPos');
                                                const mergedScroll = remainingScroll
                                                    .concat(updatedScroll.map((s: any, idx: number) => {
                                                        const origPos = scrollOrigs[idx]?.position ?? s.position;
                                                        const origKf = initialKfs.find((k: any) => Math.abs(k.time - origPos) < 0.001);
                                                        return {
                                                            time: s.position,
                                                            value: s.value,
                                                            easing: origKf?.easing ?? 'linear',
                                                            handleIn: origKf?.handleIn,
                                                            handleOut: origKf?.handleOut,
                                                        };
                                                    }))
                                                    .sort((a: any, b: any) => a.time - b.time);
                                                setScrollKeyframes(mergedScroll);
                                            }

                                            // Apply to affected parameter lanes — Fix 5: preserve easing/handles
                                            const affectedParamLanes = new Set<string>(origKfs.filter((s: any) => s.laneId !== 'scrollPos').map((s: any) => s.laneId));
                                            affectedParamLanes.forEach((lId: string) => {
                                                const laneOrigs = origKfs.filter((s: any) => s.laneId === lId);
                                                const initialLaneKfs = ((initialParamKfs || {})[lId] ?? []) as ParamKf[];
                                                const remainingParam = initialLaneKfs.filter((k: ParamKf) =>
                                                    !laneOrigs.some((orig: any) => Math.abs(k.time - orig.position) < 0.001)
                                                );
                                                const updatedParam = updatedSelection.filter((s: any) => s.laneId === lId);
                                                const mergedParam = remainingParam
                                                    .concat(updatedParam.map((s: any, idx: number) => {
                                                        const origPos = laneOrigs[idx]?.position ?? s.position;
                                                        const origKf = initialLaneKfs.find((k: ParamKf) => Math.abs(k.time - origPos) < 0.001);
                                                        return {
                                                            time: s.position,
                                                            value: s.value,
                                                            easing: origKf?.easing ?? 'linear',
                                                            handleIn: origKf?.handleIn,
                                                            handleOut: origKf?.handleOut,
                                                        };
                                                    }))
                                                    .sort((a: ParamKf, b: ParamKf) => a.time - b.time);
                                                setParamKeyframes(lId, mergedParam as ParamKf[]);
                                            });

                                            setSelectedKeyframes(updatedSelection);
                                        }}
                                        onPointerUp={() => {
                                            draggingParamKfRef.current = null;
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedKeyframe({ laneId: lane.id, position: kf.time, value: kf.value });
                                            setAudioMenu({ visible: true, x: e.clientX, y: e.clientY, clickTime: kf.time });
                                        }}
                                    >
                                        <div
                                            className="rounded-full border transition-colors shadow-sm pointer-events-none"
                                            style={{
                                                width: kfSelected ? 8 : 6,
                                                height: kfSelected ? 8 : 6,
                                                borderColor: kfSelected ? '#ffffff' : lane.color,
                                                backgroundColor: kfSelected ? '#fbbf24' : lane.color,
                                            }}
                                        />
                                    </div>
                                );
                            })}
                            {/* Live playhead dot */}
                            <div
                                className="absolute rounded-full border-[1.5px] pointer-events-none"
                                style={{
                                    width: 6, height: 6,
                                    left: `calc(${(seqTime / sequenceDuration) * 100}% - 3px)`,
                                    top: `calc(${normalY(currentVal) / VB_H * 100}% - 3px)`,
                                    borderColor: lane.color,
                                    backgroundColor: 'var(--color-editor-bg)',
                                    opacity: 0.8
                                }}
                            />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize opacity-0 group-hover:opacity-100 bg-editor-accent-purple/40 z-40" onPointerDown={makeLaneDrag(lane.id)} />
                    </div>
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

            {/* Auto-Rhythm Beat Curve Generator Modal */}
            {showRhythmModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#181818] border border-[#333] rounded-xl p-5 w-[420px] shadow-2xl space-y-4 font-sans text-editor-fg">
                        <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-3">
                            <div className="flex items-center gap-2 text-editor-accent-purple font-bold">
                                <SlidersHorizontal className="w-5 h-5" />
                                <span>Auto-Rhythm Beat Curve Generator</span>
                            </div>
                            <button className="text-gray-400 hover:text-white text-lg font-mono" onClick={() => setShowRhythmModal(false)}>✕</button>
                        </div>
                        <p className="text-[11px] text-gray-400">
                            Extract beat transients from audio and automatically generate rhythmic video scroll curves:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <button
                                className="flex flex-col items-start p-3 rounded-lg border border-[#333] hover:border-editor-accent-purple bg-[#222] hover:bg-[#2a2a2a] transition-all group text-left"
                                onClick={() => generateRhythmCurve('bounce')}
                            >
                                <span className="font-bold text-white group-hover:text-editor-accent-purple">🥁 Kick Bounce</span>
                                <span className="text-[10px] text-gray-400 mt-0.5">Pulses video scroll up on every kick beat</span>
                            </button>
                            <button
                                className="flex flex-col items-start p-3 rounded-lg border border-[#333] hover:border-teal-500 bg-[#222] hover:bg-[#2a2a2a] transition-all group text-left"
                                onClick={() => generateRhythmCurve('stutter')}
                            >
                                <span className="font-bold text-white group-hover:text-teal-400">⚡ Stutter Cuts</span>
                                <span className="text-[10px] text-gray-400 mt-0.5">Step-cut video progress on each transient</span>
                            </button>
                            <button
                                className="flex flex-col items-start p-3 rounded-lg border border-[#333] hover:border-blue-500 bg-[#222] hover:bg-[#2a2a2a] transition-all group text-left"
                                onClick={() => generateRhythmCurve('wave')}
                            >
                                <span className="font-bold text-white group-hover:text-blue-400">🌊 Rhythmic Wave</span>
                                <span className="text-[10px] text-gray-400 mt-0.5">Smooth sine wave oscillation locked to BPM</span>
                            </button>
                            <button
                                className="flex flex-col items-start p-3 rounded-lg border border-[#333] hover:border-green-500 bg-[#222] hover:bg-[#2a2a2a] transition-all group text-left"
                                onClick={() => generateRhythmCurve('ramp')}
                            >
                                <span className="font-bold text-white group-hover:text-green-400">📈 Bar Ramp</span>
                                <span className="text-[10px] text-gray-400 mt-0.5">Linear ramps up over 4-beat bars</span>
                            </button>
                            <button
                                className="col-span-2 flex flex-col items-start p-3 rounded-lg border border-[#333] hover:border-orange-500 bg-[#222] hover:bg-[#2a2a2a] transition-all group text-left"
                                onClick={() => generateRhythmCurve('jumps')}
                            >
                                <span className="font-bold text-white group-hover:text-orange-400">🔀 Random Beat Jumps</span>
                                <span className="text-[10px] text-gray-400 mt-0.5">Jumps to random video keyframes on each beat</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Right-Click Non-Clipping Tabbed Context Menu with Save/Load Presets */}
            {audioMenu && (
                <div
                    className="fixed inset-0 z-[150]"
                    onClick={() => setAudioMenu(null)}
                    onContextMenu={(e) => { e.preventDefault(); setAudioMenu(null); }}
                >
                    <div
                        className="absolute bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl shadow-2xl p-3 w-[330px] max-h-[85vh] overflow-y-auto thin-scrollbar font-sans text-editor-fg space-y-2 text-[11px]"
                        style={{
                            left: Math.max(10, Math.min(window.innerWidth - 345, audioMenu.x)),
                            top: audioMenu.y + 380 > window.innerHeight
                                ? Math.max(10, audioMenu.y - 380)
                                : Math.max(10, audioMenu.y)
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2c2c2e] pb-2 font-bold text-editor-accent-orange sticky top-0 bg-[#1c1c1e] z-10">
                            <div className="flex items-center gap-1.5">
                                <Music className="w-3.5 h-3.5" />
                                <span>Automation & Rhythm Generator</span>
                            </div>
                            <button className="text-gray-400 hover:text-white" onClick={() => setAudioMenu(null)}>✕</button>
                        </div>

                        {/* Target Parameter Selector */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] uppercase font-bold text-gray-400">Target Parameter:</span>
                                <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase">{audioTargetLane}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                                {[
                                    { id: 'scrollPos', label: 'Scroll POS', color: '#3b82f6' },
                                    { id: 'rotationSpeed', label: 'Rotation', color: '#a855f7' },
                                    { id: 'depth', label: 'Particle Depth', color: '#22c55e' },
                                    { id: 'size', label: 'Particle Size', color: '#14b8a6' },
                                    { id: 'cssOpacity', label: 'Opacity', color: '#f97316' },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        className={`px-2 py-1 rounded text-left truncate transition-colors border ${
                                            audioTargetLane === item.id ? 'bg-[#2c2c2e] border-white/40 font-bold text-white' : 'border-transparent text-gray-300 hover:bg-[#252527]'
                                        }`}
                                        onClick={() => setAudioTargetLane(item.id)}
                                    >
                                        <span className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ backgroundColor: item.color }} />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Top Category Tabs */}
                        <div className="flex border-b border-[#2c2c2e] pt-1">
                            <button
                                onClick={() => setContextMenuTab('rhythm')}
                                className={`flex-1 py-1.5 text-[10px] font-bold border-b-2 transition-colors ${
                                    contextMenuTab === 'rhythm' ? 'border-editor-accent-orange text-editor-accent-orange' : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                            >
                                ⚡ Rhythm
                            </button>
                            <button
                                onClick={() => setContextMenuTab('shapes')}
                                className={`flex-1 py-1.5 text-[10px] font-bold border-b-2 transition-colors ${
                                    contextMenuTab === 'shapes' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                            >
                                📐 Shapes
                            </button>
                            <button
                                onClick={() => setContextMenuTab('presets')}
                                className={`flex-1 py-1.5 text-[10px] font-bold border-b-2 transition-colors ${
                                    contextMenuTab === 'presets' ? 'border-editor-accent-purple text-editor-accent-purple' : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                            >
                                💾 Presets & Gain
                            </button>
                        </div>

                        {/* TAB 1: RHYTHM PRESETS */}
                        {contextMenuTab === 'rhythm' && (
                            <div className="space-y-2 pt-1">
                                <div className="space-y-1">
                                    <button
                                        className="w-full text-left p-2 rounded bg-[#252527] hover:bg-[#2c2c2e] border border-[#3a3a3c] transition-colors flex flex-col group"
                                        onClick={() => {
                                            generateRhythmCurveForLane(audioTargetLane, 'envelope', true);
                                            setAudioMenu(null);
                                        }}
                                    >
                                        <span className="font-bold text-editor-accent-orange group-hover:text-white">🔊 Audio Volume Envelope (RMS)</span>
                                        <span className="text-[9px] text-gray-400">Continuous volume contour (Gain: {audioGain}%).</span>
                                    </button>
                                    <button
                                        className="w-full text-left p-2 rounded bg-[#252527] hover:bg-[#2c2c2e] border border-[#3a3a3c] transition-colors flex flex-col group"
                                        onClick={() => {
                                            generateRhythmCurveForLane(audioTargetLane, 'bounce', true);
                                            setAudioMenu(null);
                                        }}
                                    >
                                        <span className="font-bold text-editor-accent-purple group-hover:text-white">🥁 Kick Transient Spikes</span>
                                        <span className="text-[9px] text-gray-400">Pulses up on kick drum transients.</span>
                                    </button>
                                    <button
                                        className="w-full text-left p-2 rounded bg-[#252527] hover:bg-[#2c2c2e] border border-[#3a3a3c] transition-colors flex flex-col group"
                                        onClick={() => {
                                            generateRhythmCurveForLane(audioTargetLane, 'stutter', true);
                                            setAudioMenu(null);
                                        }}
                                    >
                                        <span className="font-bold text-teal-400 group-hover:text-white">⚡ Quantized Step-Cuts</span>
                                        <span className="text-[9px] text-gray-400">Rhythmic stutter cuts on beat subdivisions.</span>
                                    </button>
                                    <button
                                        className="w-full text-left p-2 rounded bg-[#252527] hover:bg-[#2c2c2e] border border-[#3a3a3c] transition-colors flex flex-col group"
                                        onClick={() => {
                                            generateRhythmCurveForLane(audioTargetLane, 'ducking', true);
                                            setAudioMenu(null);
                                        }}
                                    >
                                        <span className="font-bold text-blue-400 group-hover:text-white">📉 Inverted Ducking Envelope</span>
                                        <span className="text-[9px] text-gray-400">Ducks down on beat, returns to max in quiet parts.</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SHAPE INSERTS */}
                        {contextMenuTab === 'shapes' && (
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[9px] uppercase font-bold text-cyan-400">Cycle Count:</span>
                                    <div className="flex items-center gap-1 font-mono text-[9px]">
                                        {[1, 2, 4, 8, 16].map((num) => (
                                            <button
                                                key={num}
                                                className={`px-1.5 py-0.5 rounded border transition-colors ${
                                                    shapeIterations === num
                                                        ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                                                        : 'bg-[#252527] border-[#3a3a3c] text-gray-300 hover:bg-[#2e2e31]'
                                                }`}
                                                onClick={() => setShapeIterations(num)}
                                            >
                                                {num}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                                    {[
                                        { id: 'sine', label: 'Sine', icon: '🌊' },
                                        { id: 'triangle', label: 'Triangle', icon: '📐' },
                                        { id: 'rampUp', label: 'Saw Up', icon: '📈' },
                                        { id: 'rampDown', label: 'Saw Down', icon: '📉' },
                                        { id: 'square', label: 'Square', icon: '⏹️' },
                                        { id: 'easeIn', label: 'Ease In', icon: '🪝' },
                                        { id: 'easeOut', label: 'Ease Out', icon: '📉' },
                                        { id: 'sCurve', label: 'S-Curve', icon: '🔀' },
                                    ].map((shape) => (
                                        <button
                                            key={shape.id}
                                            className="flex flex-col items-center justify-center p-2 rounded bg-[#252527] hover:bg-cyan-950 hover:border-cyan-400 border border-[#3a3a3c] transition-all group"
                                            onClick={() => {
                                                generateShapeCurveForSelection(audioTargetLane, shape.id as any, shapeIterations);
                                                setAudioMenu(null);
                                            }}
                                            title={`Insert ${shape.label} (${shapeIterations}x)`}
                                        >
                                            <span className="text-sm group-hover:scale-110 transition-transform">{shape.icon}</span>
                                            <span className="text-[8px] text-gray-300 group-hover:text-cyan-300 font-sans mt-0.5 truncate w-full text-center">{shape.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: CUSTOM PRESETS & PEAK INTENSITY */}
                        {contextMenuTab === 'presets' && (
                            <div className="space-y-3 pt-1">
                                {/* Audio Peak Intensity / Gain Control */}
                                <div className="space-y-1 bg-[#252527] p-2.5 rounded-lg border border-[#3a3a3c]">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold text-gray-300">Peak Intensity:</span>
                                        <span className="font-mono text-editor-accent-orange font-bold">{audioGain}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="20"
                                        max="150"
                                        step="5"
                                        value={audioGain}
                                        onChange={(e) => setAudioGain(parseInt(e.target.value))}
                                        className="w-full h-1 bg-[#3a3a3c] accent-editor-accent-orange rounded cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[8px] text-gray-400 font-mono">
                                        <span>20% (Subtle)</span>
                                        <span>75% (Default)</span>
                                        <span>150% (Wild)</span>
                                    </div>
                                </div>

                                {/* Clear Automation Actions */}
                                <div className="space-y-1 bg-[#252527] p-2.5 rounded-lg border border-red-500/30">
                                    <span className="text-[9px] uppercase font-bold text-red-400 block">Clear Automation:</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                useStore.getState().pushHistory();
                                                if (audioTargetLane === 'scrollPos') useStore.getState().setScrollKeyframes([]);
                                                else useStore.getState().setParamKeyframes(audioTargetLane, []);
                                                setAudioMenu(null);
                                            }}
                                            className="flex-1 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold rounded text-[9.5px] transition-colors border border-red-500/40 truncate"
                                        >
                                            Clear {audioTargetLane} Lane
                                        </button>
                                        <button
                                            onClick={() => {
                                                useStore.getState().pushHistory();
                                                useStore.getState().setScrollKeyframes([]);
                                                PARAM_LANES.forEach(l => useStore.getState().setParamKeyframes(l.id, []));
                                                setAudioMenu(null);
                                            }}
                                            className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[9.5px] transition-colors shrink-0"
                                            title="Clear all keyframe curves across all lanes"
                                        >
                                            Clear ALL
                                        </button>
                                    </div>
                                </div>

                                {/* Save Current Settings as New Preset */}
                                <div className="space-y-1 bg-[#252527] p-2.5 rounded-lg border border-[#3a3a3c]">
                                    <span className="text-[9px] uppercase font-bold text-editor-accent-purple block">Save Current Setup as Preset:</span>
                                    <div className="flex gap-1">
                                        <input
                                            type="text"
                                            placeholder="e.g. RMS 45% Subtle..."
                                            value={presetNameInput}
                                            onChange={(e) => setPresetNameInput(e.target.value)}
                                            className="flex-1 bg-black/40 border border-[#3a3a3c] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-editor-accent-purple"
                                        />
                                        <button
                                            onClick={() => saveCustomPreset('envelope')}
                                            className="px-2 py-1 bg-editor-accent-purple hover:bg-purple-600 text-white font-bold rounded text-[10px] transition-colors shrink-0"
                                        >
                                            💾 Save
                                        </button>
                                    </div>
                                </div>

                                {/* Saved User Presets List */}
                                <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-gray-400 px-1">Saved User Presets:</span>
                                    <div className="space-y-1 max-h-[140px] overflow-y-auto thin-scrollbar">
                                        {customPresets.map((preset) => (
                                            <div
                                                key={preset.id}
                                                className="flex items-center justify-between p-2 rounded bg-[#252527] hover:bg-[#2c2c2e] border border-[#3a3a3c] text-[10px]"
                                            >
                                                <div className="flex flex-col truncate flex-1 mr-2">
                                                    <span className="font-bold text-white truncate">{preset.name}</span>
                                                    <span className="text-[8px] font-mono text-gray-400">Gain: {preset.audioGain}% · Mode: {preset.mode}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            setAudioGain(preset.audioGain);
                                                            setShapeIterations(preset.shapeIterations);
                                                            generateRhythmCurveForLane(audioTargetLane, preset.mode as any, true);
                                                            setAudioMenu(null);
                                                        }}
                                                        className="px-2 py-0.5 bg-editor-accent-orange/20 hover:bg-editor-accent-orange text-editor-accent-orange hover:text-white font-bold rounded text-[9px] transition-colors"
                                                    >
                                                        ⚡ Apply
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCustomPreset(preset.id)}
                                                        className="text-gray-500 hover:text-red-400 px-1 text-[9px]"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </footer>
    );
}
