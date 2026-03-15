import { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause, Square, Repeat, Circle, ZoomIn, ZoomOut } from 'lucide-react';
import { onChange } from '@theatre/core';
import { useStore } from '../store/useStore';
import { useKickDrumData } from '../packages/useKickDrumData';
import { sheet, SEQUENCE_DURATION } from '../theatre/core';

const LABEL_W = 120;
const ZOOM_LEVELS = [1, 2, 4, 8];
const VB_W = 1000;
const VB_H = 40;

export default function Timeline() {
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
    const recordStartPosition = useStore(state => state.recordStartPosition);
    const setRecordStartPosition = useStore(state => state.setRecordStartPosition);
    const activePreset = useStore(s => s.activePreset);
    const extractedFrames = useStore(s => s.extractedFrames);
    const rotationSpeed = useStore(s => s.rotationSpeed);
    const particleDepth = useStore(s => s.particleDepth);
    const particleSize = useStore(s => s.particleSize);
    const cssOpacity = useStore(s => s.cssOpacity);
    const setSelectedLane = useStore(s => s.setSelectedLane);
    const setSelectedKeyframe = useStore(s => s.setSelectedKeyframe);
    const selectedLane = useStore(s => s.selectedLane);
    const selectedKeyframe = useStore(s => s.selectedKeyframe);
    const scrollKeyframes = useStore(s => s.scrollKeyframes);
    const setScrollKeyframes = useStore(s => s.setScrollKeyframes);
    const clearScrollKeyframes = useStore(s => s.clearScrollKeyframes);

    const [timelineZoom, setTimelineZoom] = useState(1);
    const [lanesWidth, setLanesWidth] = useState(0);
    // Reactive time display — updated by onChange so it refreshes each frame during playback
    const [seqTime, setSeqTime] = useState(() => sheet.sequence.position);
    const [scrollLaneExpanded, setScrollLaneExpanded] = useState(false);
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

    // Reactive TIME display — onChange fires whenever Theatre.js position changes (play, scrub, loop)
    useEffect(() => {
        const unsub = onChange(sheet.sequence.pointer.position, (pos) => {
            setSeqTime(pos);
        });
        return unsub;
    }, []);

    // Record scroll history during playback for the live Scroll POS lane
    useEffect(() => {
        if (!isPlaying) return;
        const id = setInterval(() => {
            const pos = sheet.sequence.position / SEQUENCE_DURATION;
            const val = useStore.getState().scrollProgress;
            scrollHistory.current.push({ pos, val });
        }, 50);
        return () => clearInterval(id);
    }, [isPlaying]);

    // seekTo — canonical scrub: syncs Theatre.js + scene adapter + Zustand + clears history
    const seekTo = useCallback((progress: number) => {
        sheet.sequence.position = progress * SEQUENCE_DURATION;
        setSceneProgress(progress);
        scrollHistory.current = [];
    }, [setSceneProgress]);

    const progressFromClientX = useCallback((clientX: number) => {
        const el = lanesRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const x = clientX - rect.left + el.scrollLeft - LABEL_W;
        const trackW = lanesWidth * timelineZoom - LABEL_W;
        return Math.max(0, Math.min(1, x / trackW));
    }, [lanesWidth, timelineZoom]);

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

    const toggleRecording = () => {
        if (isRecording) {
            setIsRecording(false);
        } else {
            setRecordStartPosition(sheet.sequence.position / SEQUENCE_DURATION);
            clearRecordedEvents();
            setIsRecording(true);
        }
    };

    const trackW = lanesWidth ? lanesWidth * timelineZoom - LABEL_W : 0;
    const seqPos = sheet.sequence.position / SEQUENCE_DURATION;
    const playheadLeft = lanesWidth ? LABEL_W + seqPos * trackW : LABEL_W;
    const scrollVbH = scrollLaneExpanded ? 120 : 40;
    const scrollPolyline = scrollHistory.current.length > 1
        ? scrollHistory.current.map(p => `${p.pos * VB_W},${(1 - p.val) * scrollVbH}`).join(' ')
        : '';

    // Waveform ghost — downsampled to 300 pts, symmetric fill around center for amplitude guide
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
        <footer className="h-[280px] border-t border-editor-border bg-black flex flex-col z-20">
            {/* Transport Bar */}
            <div className="h-10 border-b border-editor-border flex items-center px-4 justify-between bg-white/5 shrink-0">
                <div className="flex items-center gap-1">
                    <button className="p-1 hover:text-white" onClick={() => setIsPlaying(!isPlaying)}>
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    {/* Stop: halt playback; double-click returns to start */}
                    <button
                        className="p-1 hover:text-white"
                        onClick={() => { setIsPlaying(false); if (isRecording) setIsRecording(false); }}
                        onDoubleClick={() => { setIsPlaying(false); if (isRecording) setIsRecording(false); seekTo(0); }}
                    >
                        <Square className="w-4 h-4" />
                    </button>
                    <button
                        className={`p-1 mx-1 rounded-full transition-all ${isRecording ? 'bg-red-600/30 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'hover:bg-white/10'}`}
                        onClick={toggleRecording}
                        title={isRecording ? 'Stop Recording' : 'Arm Recording'}
                    >
                        <Circle className={`w-4 h-4 ${isRecording ? 'text-red-500 fill-red-500 animate-pulse' : 'text-red-600'}`} />
                    </button>
                    <div className="h-4 w-[1px] bg-editor-border mx-2" />
                    {/* Loop button — active state shown in purple when loop is on */}
                    <button
                        className={`text-xs flex items-center gap-1 ${isLoop ? 'text-editor-accent-purple' : 'text-gray-500 hover:text-white'}`}
                        onClick={() => setIsLoop(!isLoop)}
                    >
                        <Repeat className="w-3 h-3" /> LOOP
                    </button>
                    {isRecording && <span className="text-[9px] text-red-400 font-mono ml-2 animate-pulse">● REC — {recordedEvents.length} pts</span>}
                    <div className="h-4 w-[1px] bg-editor-border mx-2" />
                    <button className="p-1 text-gray-500 hover:text-white disabled:opacity-30" onClick={() => { const i = ZOOM_LEVELS.indexOf(timelineZoom); if (i > 0) setTimelineZoom(ZOOM_LEVELS[i-1]); }} disabled={timelineZoom === ZOOM_LEVELS[0]}><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xxs text-gray-500 w-6 text-center font-mono">{timelineZoom}x</span>
                    <button className="p-1 text-gray-500 hover:text-white disabled:opacity-30" onClick={() => { const i = ZOOM_LEVELS.indexOf(timelineZoom); if (i < ZOOM_LEVELS.length-1) setTimelineZoom(ZOOM_LEVELS[i+1]); }} disabled={timelineZoom === ZOOM_LEVELS[ZOOM_LEVELS.length-1]}><ZoomIn className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-6 font-mono text-xs">
                    <div className="flex flex-col items-center">
                        {/* TIME display driven by seqTime state — reactive via onChange */}
                        <span className="text-editor-accent-teal">{new Date(seqTime * 1000).toISOString().slice(14, 22)}</span>
                        <span className="text-[9px] text-gray-600">TIME</span>
                    </div>
                    <div className="flex flex-col items-center"><span className="text-white">120 BPM</span><span className="text-[9px] text-gray-600">TEMPO</span></div>
                    <div className="flex flex-col items-center"><span className="text-white">4/4</span><span className="text-[9px] text-gray-600">SIGNATURE</span></div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xxs text-gray-500 font-mono">{scrollProgress.toFixed(3)}</span>
                    <input className="w-48 cursor-pointer accent-editor-accent-purple" type="range" min="0" max="1" step="0.001" value={scrollProgress} onChange={(e) => seekTo(parseFloat(e.target.value))} />
                </div>
            </div>

            {/* Lanes Container */}
            <div ref={lanesRef} className="flex-1 overflow-y-auto overflow-x-auto thin-scrollbar relative select-none cursor-col-resize" onMouseDown={handleLanesMouseDown}>
                {/* Playhead */}
                <div className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]" style={{ left: `${playheadLeft}px` }}>
                    <div className="w-3 h-3 bg-red-500 absolute -top-1 -left-[5.5px] rotate-45" />
                </div>
                <div style={{ width: timelineZoom > 1 ? `${timelineZoom * 100}%` : '100%', minHeight: '100%' }}>

                {/* Lane 1: Audio */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-white/10 bg-black/40 gap-2 sticky left-0 z-30">
                        <span className="text-[10px] uppercase font-bold text-editor-accent-orange truncate">Audio Wave</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center">
                        {!audioUrl ? (
                            <span className="text-[10px] text-gray-500 italic px-2">Import Audio to parse wave...</span>
                        ) : !isReady ? (
                            <span className="text-[10px] text-editor-accent-orange animate-pulse px-2">Analyzing audio...</span>
                        ) : (
                            <>
                                <div className="absolute inset-0 flex items-center gap-[1px] opacity-40 px-2 overflow-hidden">
                                    {/* Render a highly simplified waveform representation using the Float32Array data */}
                                    {Array.from(waveform).slice(0, 300).map((val: any, i: number) => (
                                        <div key={i} className="w-[2px] bg-editor-accent-orange min-w-[2px]" style={{ height: `${val * 80}%` }}></div>
                                    ))}
                                </div>
                                {/* Render the extracted Beat pulse markers */}
                                {beats.map((beatTime: number, i: number) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 w-[2px] bg-white z-10 group/beat hover:bg-editor-accent-orange cursor-pointer transition-colors"
                                        style={{ left: `${(beatTime / 10) * 100}%` }} // Mock simplistic mapping out of 10 seconds total width
                                    >
                                        <div className="opacity-0 group-hover/beat:opacity-100 text-[8px] absolute top-1 left-2 font-mono text-white whitespace-nowrap bg-black/50 px-1 rounded">BEAT {beatTime.toFixed(1)}s</div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Lane 2: Video Frames — only shown when frames are extracted */}
                {extractedFrames.length > 0 && (
                <div className="flex h-10 border-b border-white/5 group">
                    <div className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-white/10 sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors ${activePreset === 'frames' ? 'bg-editor-accent-blue/15 ring-1 ring-inset ring-editor-accent-blue/40' : 'bg-black/40 hover:bg-white/5'}`}>
                        <span className="text-xxs uppercase font-bold text-editor-accent-blue">Video Frames</span>
                        <span className="text-[9px] font-mono text-editor-accent-blue/60">{extractedFrames.length} frames</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center bg-editor-accent-blue/[0.03]">
                        {/* Frame count bar fills proportionally */}
                        <div className="absolute inset-y-2 left-0 bg-editor-accent-blue/20 rounded-r" style={{ width: '100%' }} />
                        <div className="absolute inset-y-0 left-0 right-0 flex items-center px-3">
                            <span className="text-[9px] text-editor-accent-blue/60 font-mono z-10">
                                {activePreset === 'frames' ? '▶ Active in viewport' : 'Click "Load as Scene" to preview'}
                            </span>
                        </div>
                    </div>
                </div>
                )}

                {/* Lane 3: Mouse X */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-white/10 bg-black/40 gap-2 sticky left-0 z-30">
                        <span className="text-[10px] uppercase font-bold text-pink-400 truncate">Mouse X</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        {recordedEvents.length === 0 ? (
                            <span className="text-[10px] text-gray-500 italic px-2 leading-[40px]">Arm REC to capture...</span>
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
                </div>

                {/* Lane 3: Mouse Y */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-white/10 bg-black/40 gap-2 sticky left-0 z-30">
                        <span className="text-[10px] uppercase font-bold text-amber-400 truncate">Mouse Y</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        {recordedEvents.length === 0 ? (
                            <span className="text-[10px] text-gray-500 italic px-2 leading-[40px]">Arm REC to capture...</span>
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
                </div>

                {/* Lane 4: Scroll Pos — live curve */}
                {/* Lane 4: Scroll POS — expandable, with audio waveform ghost guide */}
                <div className={`flex border-b border-white/5 transition-all duration-200 ${scrollLaneExpanded ? 'h-[120px]' : 'h-12'}`}>
                    <div
                        className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-white/10 sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors ${isRecording ? 'ring-1 ring-inset ring-editor-accent-purple/60 bg-editor-accent-purple/10' : selectedLane === 'scrollPos' ? 'bg-editor-accent-purple/15' : 'bg-black/40 hover:bg-white/5'}`}
                        onClick={() => setSelectedLane('scrollPos')}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xxs uppercase font-bold text-editor-accent-purple">Scroll POS</span>
                            <div className="flex items-center gap-1">
                                {scrollKeyframes.length > 0 && (
                                    <button
                                        className="text-[9px] text-editor-accent-purple/50 hover:text-red-400 transition-colors"
                                        title="Clear scroll automation"
                                        onClick={(e) => { e.stopPropagation(); clearScrollKeyframes(); }}
                                    >✕</button>
                                )}
                                <button
                                    className="text-[9px] text-editor-accent-purple/50 hover:text-editor-accent-purple transition-colors leading-none"
                                    title={scrollLaneExpanded ? 'Collapse lane' : 'Expand lane'}
                                    onClick={(e) => { e.stopPropagation(); setScrollLaneExpanded(v => !v); }}
                                >{scrollLaneExpanded ? '▴' : '▾'}</button>
                            </div>
                        </div>
                        <span className="text-[9px] font-mono text-editor-accent-purple/60">{(scrollProgress * 100).toFixed(1)}%</span>
                        {scrollLaneExpanded && audioUrl && (
                            <span className="text-[8px] text-editor-accent-orange/40 font-mono mt-0.5">♫ audio guide</span>
                        )}
                    </div>
                    <div className="flex-1 relative overflow-hidden bg-editor-accent-purple/[0.03]">
                        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} ${scrollVbH}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                            <defs><filter id="pglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                            {/* Diagonal reference line */}
                            <line x1="0" y1={scrollVbH} x2={VB_W} y2="0" stroke="rgba(168,85,247,0.12)" strokeWidth="1" strokeDasharray="4 4"/>
                            {/* Audio waveform ghost — visible as guide when lane is expanded and audio loaded */}
                            {waveformBgPath && (
                                <path
                                    d={waveformBgPath}
                                    fill="rgba(249,115,22,0.07)"
                                    stroke="rgba(249,115,22,0.15)"
                                    strokeWidth="0.5"
                                />
                            )}
                            {/* Live recording trail */}
                            {scrollPolyline && <>
                                <polyline points={scrollPolyline} fill="none" stroke="rgba(168,85,247,0.25)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points={scrollPolyline} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </>}
                            {/* Recorded keyframes: bezier curve */}
                            {scrollKeyframes.length >= 2 && (() => {
                                const pts = scrollKeyframes.map(kf => ({
                                    x: (kf.time / SEQUENCE_DURATION) * VB_W,
                                    y: (1 - kf.value) * scrollVbH,
                                }));
                                let d = `M ${pts[0].x} ${pts[0].y}`;
                                for (let i = 1; i < pts.length; i++) {
                                    const prev = pts[i - 1];
                                    const curr = pts[i];
                                    const dx = curr.x - prev.x;
                                    d += ` C ${prev.x + dx / 3} ${prev.y}, ${curr.x - dx / 3} ${curr.y}, ${curr.x} ${curr.y}`;
                                }
                                return <path d={d} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.8"/>;
                            })()}
                            {/* Keyframe dots */}
                            {scrollKeyframes.map((kf, i) => {
                                const isSelected = selectedKeyframe?.laneId === 'scrollPos' && Math.abs(selectedKeyframe.position - kf.time) < 0.01;
                                return (
                                <circle
                                    key={i}
                                    cx={(kf.time / SEQUENCE_DURATION) * VB_W}
                                    cy={(1 - kf.value) * scrollVbH}
                                    r={isSelected ? '3' : '1.5'}
                                    fill={isSelected ? 'white' : '#c084fc'}
                                    stroke={isSelected ? '#a855f7' : 'none'}
                                    strokeWidth="1"
                                    className="cursor-ew-resize"
                                    style={{ pointerEvents: 'all' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedKeyframe({ laneId: 'scrollPos', position: kf.time, value: kf.value });
                                    }}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        (e.target as SVGCircleElement).setPointerCapture(e.pointerId);
                                        draggingKfRef.current = { origTime: kf.time, value: kf.value };
                                    }}
                                    onPointerMove={(e) => {
                                        if (!draggingKfRef.current || !(e.buttons & 1)) return;
                                        const { origTime, value } = draggingKfRef.current;
                                        const svgEl = (e.target as SVGCircleElement).ownerSVGElement!;
                                        const rect = svgEl.getBoundingClientRect();
                                        const svgX = ((e.clientX - rect.left) / rect.width) * VB_W;
                                        const newTime = Math.max(0, Math.min(SEQUENCE_DURATION, (svgX / VB_W) * SEQUENCE_DURATION));
                                        setScrollKeyframes(
                                            scrollKeyframes
                                                .filter(k => Math.abs(k.time - origTime) > 0.001)
                                                .concat({ time: newTime, value })
                                                .sort((a, b) => a.time - b.time)
                                        );
                                        draggingKfRef.current = { origTime: newTime, value };
                                    }}
                                    onPointerUp={() => { draggingKfRef.current = null; }}
                                />
                                );
                            })}
                            {/* Current position dot */}
                            <circle cx={seqPos * VB_W} cy={(1 - scrollProgress) * scrollVbH} r="4" fill="#a855f7" filter="url(#pglow)"/>
                            <circle cx={seqPos * VB_W} cy={(1 - scrollProgress) * scrollVbH} r="2.5" fill="white"/>
                        </svg>
                    </div>
                </div>

                {/* Lane 5: Rotation Speed */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-white/10 sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors ${selectedLane === 'rotationSpeed' ? 'bg-teal-500/10' : 'bg-black/40 hover:bg-white/5'}`} onClick={() => setSelectedLane('rotationSpeed')}>
                        <span className="text-xxs uppercase font-bold text-editor-accent-teal">Rotation Speed</span>
                        <span className="text-[9px] font-mono text-editor-accent-teal/60">{rotationSpeed.toFixed(3)}</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
                            {/* reference: current value as horizontal line; range [0, 2] */}
                            {(() => {
                                const y = (1 - rotationSpeed / 2) * VB_H;
                                return (
                                    <>
                                        <line x1="0" y1={y} x2={VB_W} y2={y} stroke="rgba(20,184,166,0.2)" strokeWidth="1" strokeDasharray="4 4"/>
                                        <circle cx={(sheet.sequence.position / SEQUENCE_DURATION) * VB_W} cy={y} r="3" fill="#14b8a6" opacity="0.8"/>
                                    </>
                                );
                            })()}
                        </svg>
                    </div>
                </div>

                {/* Lane 6: Particle Depth */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-white/10 sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors ${selectedLane === 'depth' ? 'bg-green-500/10' : 'bg-black/40 hover:bg-white/5'}`} onClick={() => setSelectedLane('depth')}>
                        <span className="text-xxs uppercase font-bold text-editor-accent-green">Particle Depth</span>
                        <span className="text-[9px] font-mono text-editor-accent-green/60">{particleDepth.toFixed(2)}</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
                            {/* range [0, 10] */}
                            {(() => {
                                const y = (1 - particleDepth / 10) * VB_H;
                                return (
                                    <>
                                        <line x1="0" y1={y} x2={VB_W} y2={y} stroke="rgba(34,197,94,0.2)" strokeWidth="1" strokeDasharray="4 4"/>
                                        <circle cx={(sheet.sequence.position / SEQUENCE_DURATION) * VB_W} cy={y} r="3" fill="#22c55e" opacity="0.8"/>
                                    </>
                                );
                            })()}
                        </svg>
                    </div>
                </div>

                {/* Lane 7: Particle Size */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-white/10 sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors ${selectedLane === 'size' ? 'bg-green-500/10' : 'bg-black/40 hover:bg-white/5'}`} onClick={() => setSelectedLane('size')}>
                        <span className="text-xxs uppercase font-bold text-editor-accent-green">Particle Size</span>
                        <span className="text-[9px] font-mono text-editor-accent-green/60">{particleSize.toFixed(2)}</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
                            {/* range [0.1, 5] */}
                            {(() => {
                                const y = (1 - (particleSize - 0.1) / 4.9) * VB_H;
                                return (
                                    <>
                                        <line x1="0" y1={y} x2={VB_W} y2={y} stroke="rgba(34,197,94,0.2)" strokeWidth="1" strokeDasharray="4 4"/>
                                        <circle cx={(sheet.sequence.position / SEQUENCE_DURATION) * VB_W} cy={y} r="3" fill="#22c55e" opacity="0.8"/>
                                    </>
                                );
                            })()}
                        </svg>
                    </div>
                </div>

                {/* Lane 8: CSS Opacity */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className={`w-[120px] shrink-0 flex flex-col justify-center px-3 border-r border-white/10 sticky left-0 z-30 gap-0.5 cursor-pointer transition-colors ${selectedLane === 'cssOpacity' ? 'bg-blue-500/10' : 'bg-black/40 hover:bg-white/5'}`} onClick={() => setSelectedLane('cssOpacity')}>
                        <span className="text-xxs uppercase font-bold text-editor-accent-blue">CSS Opacity</span>
                        <span className="text-[9px] font-mono text-editor-accent-blue/60">{cssOpacity.toFixed(2)}</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
                            {/* range [0, 1] */}
                            {(() => {
                                const y = (1 - cssOpacity) * VB_H;
                                return (
                                    <>
                                        <line x1="0" y1={y} x2={VB_W} y2={y} stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="4 4"/>
                                        <circle cx={(sheet.sequence.position / SEQUENCE_DURATION) * VB_W} cy={y} r="3" fill="#3b82f6" opacity="0.8"/>
                                    </>
                                );
                            })()}
                        </svg>
                    </div>
                </div>

                {/* Lane 9: Scroll Speed (mock) */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-white/10 bg-black/40 gap-2 sticky left-0 z-30">
                        <span className="text-[10px] uppercase font-bold text-editor-accent-teal">Scroll Speed</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full text-editor-accent-teal" preserveAspectRatio="none">
                            <path d="M0,20 Q150,20 300,5" fill="none" stroke="currentColor" strokeWidth="2"></path>
                        </svg>
                    </div>
                </div>

                {/* Lane 10: Scroll Dir */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-white/10 bg-black/40 gap-2 sticky left-0 z-30">
                        <span className="text-[10px] uppercase font-bold text-editor-accent-blue">Scroll DIR</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center relative">
                        {/* Step mockups */}
                        <div className="absolute left-0 w-[100px] h-[2px] bg-editor-accent-blue" style={{ bottom: '70%' }}></div>
                        <div className="absolute left-[100px] w-1 h-[20%]" style={{ bottom: '50%', backgroundColor: 'var(--color-editor-accent-blue)' }}></div>
                        <div className="absolute left-[100px] w-[100px] h-[2px] bg-editor-accent-blue" style={{ bottom: '50%' }}></div>
                        <div className="absolute left-[200px] w-1 h-[20%]" style={{ bottom: '30%', backgroundColor: 'var(--color-editor-accent-blue)' }}></div>
                        <div className="absolute left-[200px] w-[100px] h-[2px] bg-editor-accent-blue" style={{ bottom: '30%' }}></div>
                    </div>
                </div>

                {/* Lane 11: Click Events */}
                <div className="flex h-10 border-b border-white/5 group">
                    <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-white/10 bg-black/40 gap-2 sticky left-0 z-30">
                        <span className="text-[10px] uppercase font-bold text-red-400 truncate">Clicks</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center">
                        {recordedEvents.filter(e => e.click).length === 0 ? (
                            <span className="text-[10px] text-gray-500 italic px-2">No clicks recorded</span>
                        ) : (
                            recordedEvents.filter(e => e.click).map((ev, i) => (
                                <div
                                    key={i}
                                    className="absolute top-1 bottom-1 w-[3px] bg-red-400 rounded-full"
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
