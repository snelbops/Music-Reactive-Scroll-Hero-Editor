import { create } from 'zustand';
import type { SceneAdapter } from '../preview/SceneAdapter';
import { interpolateParamAt, type ParamKf } from '../utils/interpolate';

type PresetId = 'orbit' | 'light' | 'classic-dark' | 'classic-dark-copy' | 'classic-light' | 'classic-inverted' | 'light-images' | 'frames';
type AspectRatio = '16:9' | '9:16' | '1:1' | 'free';

export interface RecordedEvent {
    time: number;
    x: number;
    y: number;
    click: boolean;
}

interface EditorState {
    isPlaying: boolean; setIsPlaying: (playing: boolean) => void;
    videoUrl: string | null; setVideoUrl: (url: string | null) => void;
    audioUrl: string | null; setAudioUrl: (url: string | null) => void;
    isRecording: boolean; setIsRecording: (rec: boolean) => void;
    recordCountdown: number | null; setRecordCountdown: (n: number | null) => void;
    recordedEvents: RecordedEvent[]; pushRecordedEvent: (ev: RecordedEvent) => void; clearRecordedEvents: () => void;
    scrollProgress: number; setScrollProgress: (progress: number) => void;
    activePreset: PresetId; setActivePreset: (preset: PresetId) => void;
    aspectRatio: AspectRatio; setAspectRatio: (ratio: AspectRatio) => void;
    isFullscreen: boolean; setIsFullscreen: (v: boolean) => void;
    isLoop: boolean; setIsLoop: (v: boolean) => void;
    recordStartPosition: number; setRecordStartPosition: (v: number) => void;
    mp4Asset: { name: string; url: string } | null; setMp4Asset: (asset: { name: string; url: string } | null) => void;
    extractedFrames: Blob[]; setExtractedFrames: (frames: Blob[]) => void;
    extractionProgress: number; setExtractionProgress: (p: number) => void;
    extractionStatus: 'idle' | 'extracting' | 'done' | 'error'; setExtractionStatus: (s: 'idle' | 'extracting' | 'done' | 'error') => void;
    isScrubbing: boolean; setIsScrubbing: (v: boolean) => void;
    scrollKeyframes: { time: number; value: number; easing?: string; handleOut?: { dt: number; dv: number }; handleIn?: { dt: number; dv: number } }[];
    // rangeStart: if provided, clears old keyframes strictly between rangeStart and time (overdub).
    addScrollKeyframe: (time: number, value: number, rangeStart?: number) => void;
    clearScrollKeyframes: () => void;
    setScrollKeyframes: (kfs: { time: number; value: number; easing?: string; handleOut?: { dt: number; dv: number }; handleIn?: { dt: number; dv: number } }[]) => void;
    updateScrollKeyframeEasing: (time: number, easing: string) => void;
    updateScrollKeyframeHandle: (time: number, side: 'in' | 'out', handle: { dt: number; dv: number }) => void;
    paramKeyframes: Record<string, ParamKf[]>;
    addParamKeyframe: (laneId: string, time: number, value: number) => void;
    removeParamKeyframe: (laneId: string, time: number) => void;
    updateParamKeyframeEasing: (laneId: string, time: number, easing: string) => void;
    updateParamKeyframeValue: (laneId: string, time: number, value: number) => void;
    updateParamKeyframeHandle: (laneId: string, time: number, side: 'in' | 'out', handle: { dt: number; dv: number }) => void;
    setParamKeyframes: (laneId: string, kfs: ParamKf[]) => void;
    clearParamKeyframes: (laneId: string) => void;
    applyParamKeyframesAt: (time: number) => void;
    selectedLane: string | null; setSelectedLane: (id: string | null) => void;
    selectedKeyframes: { laneId: string; position: number; value: number }[];
    setSelectedKeyframe: (kf: { laneId: string; position: number; value: number } | null) => void;
    setSelectedKeyframes: (kfs: { laneId: string; position: number; value: number }[]) => void;
    toggleSelectedKeyframe: (kf: { laneId: string; position: number; value: number }) => void;
    rotationSpeed: number; setRotationSpeed: (v: number) => void;
    particleDepth: number; setParticleDepth: (v: number) => void;
    particleSize: number; setParticleSize: (v: number) => void;
    cssOpacity: number; setCssOpacity: (v: number) => void;
    classicDarkControls: { random: number; depth: number; size: number; touchRadius: number };
    setClassicDarkControls: (c: { random: number; depth: number; size: number; touchRadius: number }) => void;
    lightImages: { name: string; url: string }[]; addLightImage: (img: { name: string; url: string }) => void; removeLightImage: (name: string) => void;
    activeLightImageIdx: number; setActiveLightImageIdx: (i: number) => void;
    activeAdapter: SceneAdapter | null; setActiveAdapter: (adapter: SceneAdapter | null) => void;
    setSceneProgress: (p: number) => void;
}

export const useStore = create<EditorState>((set, get) => ({
    isPlaying: false, setIsPlaying: (playing) => set({ isPlaying: playing }),
    videoUrl: 'https://scrollyvideo.js.org/goldengate.mp4', setVideoUrl: (url) => set({ videoUrl: url }),
    audioUrl: null, setAudioUrl: (url) => set({ audioUrl: url }),
    isRecording: false, setIsRecording: (rec) => set({ isRecording: rec }),
    recordCountdown: null, setRecordCountdown: (n) => set({ recordCountdown: n }),
    recordedEvents: [], pushRecordedEvent: (ev) => set((s) => ({ recordedEvents: [...s.recordedEvents, ev] })), clearRecordedEvents: () => set({ recordedEvents: [] }),
    scrollProgress: 0, setScrollProgress: (progress) => set({ scrollProgress: progress }),
    activePreset: 'orbit', setActivePreset: (preset) => set({ activePreset: preset }),
    aspectRatio: '16:9', setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
    isFullscreen: false, setIsFullscreen: (v) => set({ isFullscreen: v }),
    isLoop: false, setIsLoop: (v) => set({ isLoop: v }),
    recordStartPosition: 0, setRecordStartPosition: (v) => set({ recordStartPosition: v }),
    mp4Asset: { name: 'sample.mp4', url: '/sample.mp4' }, setMp4Asset: (asset) => set({ mp4Asset: asset }),
    extractedFrames: [], setExtractedFrames: (frames) => set({ extractedFrames: frames }),
    extractionProgress: 0, setExtractionProgress: (p) => set({ extractionProgress: p }),
    extractionStatus: 'idle', setExtractionStatus: (s) => set({ extractionStatus: s }),
    isScrubbing: false, setIsScrubbing: (v) => set({ isScrubbing: v }),
    scrollKeyframes: [],
    addScrollKeyframe: (time, value, rangeStart?) => set((s) => {
        const filtered = rangeStart !== undefined
            // Range clear: keep keyframes up-to-and-including rangeStart, plus anything after time.
            // +0.001 keeps the previous fresh sample (at exactly rangeStart) while deleting old
            // keyframes strictly between rangeStart and the current position.
            ? s.scrollKeyframes.filter(kf => kf.time < rangeStart + 0.001 || kf.time > time + 0.001)
            : s.scrollKeyframes.filter(kf => Math.abs(kf.time - time) > 0.016);
        return { scrollKeyframes: [...filtered, { time, value }].sort((a, b) => a.time - b.time) };
    }),
    clearScrollKeyframes: () => set({ scrollKeyframes: [] }),
    setScrollKeyframes: (kfs) => set({ scrollKeyframes: kfs }),
    updateScrollKeyframeEasing: (time, easing) => set((s) => ({
        scrollKeyframes: s.scrollKeyframes.map(kf => Math.abs(kf.time - time) < 0.001 ? { ...kf, easing } : kf),
    })),
    updateScrollKeyframeHandle: (time, side, handle) => set((s) => ({
        scrollKeyframes: s.scrollKeyframes.map(kf =>
            Math.abs(kf.time - time) < 0.001
                ? { ...kf, [side === 'in' ? 'handleIn' : 'handleOut']: handle }
                : kf
        ),
    })),
    paramKeyframes: {},
    addParamKeyframe: (laneId, time, value) => set((s) => {
        const existing = s.paramKeyframes[laneId] ?? [];
        const filtered = existing.filter(kf => Math.abs(kf.time - time) > 0.016);
        return { paramKeyframes: { ...s.paramKeyframes, [laneId]: [...filtered, { time, value, easing: 'linear' }].sort((a, b) => a.time - b.time) } };
    }),
    removeParamKeyframe: (laneId, time) => set((s) => ({
        paramKeyframes: { ...s.paramKeyframes, [laneId]: (s.paramKeyframes[laneId] ?? []).filter(kf => Math.abs(kf.time - time) > 0.001) },
    })),
    updateParamKeyframeEasing: (laneId, time, easing) => set((s) => ({
        paramKeyframes: { ...s.paramKeyframes, [laneId]: (s.paramKeyframes[laneId] ?? []).map(kf => Math.abs(kf.time - time) < 0.001 ? { ...kf, easing } : kf) },
    })),
    updateParamKeyframeValue: (laneId, time, value) => set((s) => ({
        paramKeyframes: { ...s.paramKeyframes, [laneId]: (s.paramKeyframes[laneId] ?? []).map(kf => Math.abs(kf.time - time) < 0.001 ? { ...kf, value } : kf) },
    })),
    updateParamKeyframeHandle: (laneId, time, side, handle) => set((s) => ({
        paramKeyframes: { ...s.paramKeyframes, [laneId]: (s.paramKeyframes[laneId] ?? []).map(kf =>
            Math.abs(kf.time - time) < 0.001 ? { ...kf, [side === 'in' ? 'handleIn' : 'handleOut']: handle } : kf
        )},
    })),
    setParamKeyframes: (laneId, kfs) => set((s) => ({ paramKeyframes: { ...s.paramKeyframes, [laneId]: kfs } })),
    clearParamKeyframes: (laneId) => set((s) => { const next = { ...s.paramKeyframes }; delete next[laneId]; return { paramKeyframes: next }; }),
    applyParamKeyframesAt: (time) => {
        const kfs = get().paramKeyframes;
        const updates: Partial<{ rotationSpeed: number; particleDepth: number; particleSize: number; cssOpacity: number }> = {};
        const rSpeed = interpolateParamAt((kfs['rotationSpeed'] ?? []) as ParamKf[], time);
        if (rSpeed !== null) updates.rotationSpeed = rSpeed;
        const depth = interpolateParamAt((kfs['depth'] ?? []) as ParamKf[], time);
        if (depth !== null) updates.particleDepth = depth;
        const size = interpolateParamAt((kfs['size'] ?? []) as ParamKf[], time);
        if (size !== null) updates.particleSize = size;
        const opacity = interpolateParamAt((kfs['cssOpacity'] ?? []) as ParamKf[], time);
        if (opacity !== null) updates.cssOpacity = opacity;
        if (Object.keys(updates).length > 0) set(updates);
    },
    selectedLane: null, setSelectedLane: (id) => set({ selectedLane: id, selectedKeyframes: [] }),
    selectedKeyframes: [],
    setSelectedKeyframe: (kf) => set({ selectedKeyframes: kf ? [kf] : [], selectedLane: kf?.laneId ?? null }),
    setSelectedKeyframes: (kfs) => set({ selectedKeyframes: kfs, selectedLane: kfs.at(-1)?.laneId ?? null }),
    toggleSelectedKeyframe: (kf) => set((s) => {
        const exists = s.selectedKeyframes.some(k => k.laneId === kf.laneId && Math.abs(k.position - kf.position) < 0.001);
        const next = exists
            ? s.selectedKeyframes.filter(k => !(k.laneId === kf.laneId && Math.abs(k.position - kf.position) < 0.001))
            : [...s.selectedKeyframes, kf];
        return { selectedKeyframes: next, selectedLane: next.at(-1)?.laneId ?? s.selectedLane };
    }),
    rotationSpeed: 0.1, setRotationSpeed: (v) => set({ rotationSpeed: v }),
    particleDepth: 2.0, setParticleDepth: (v) => set({ particleDepth: v }),
    particleSize: 1.4, setParticleSize: (v) => set({ particleSize: v }),
    cssOpacity: 1, setCssOpacity: (v) => set({ cssOpacity: v }),
    classicDarkControls: { random: 2.0, depth: 4.0, size: 1.5, touchRadius: 0.15 },
    setClassicDarkControls: (c) => set({ classicDarkControls: c }),
    lightImages: [], addLightImage: (img) => set((s) => ({ lightImages: [...s.lightImages, img] })), removeLightImage: (name) => set((s) => ({ lightImages: s.lightImages.filter(i => i.name !== name) })),
    activeLightImageIdx: 0, setActiveLightImageIdx: (i) => set({ activeLightImageIdx: i }),
    activeAdapter: null, setActiveAdapter: (adapter) => set({ activeAdapter: adapter }),
    setSceneProgress: (p) => { get().activeAdapter?.setProgress(p); set({ scrollProgress: p }); },
}));
