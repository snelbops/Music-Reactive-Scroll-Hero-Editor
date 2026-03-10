import { create } from 'zustand';
import type { SceneAdapter } from '../preview/SceneAdapter';

type PresetId = 'orbit' | 'light' | 'classic' | 'frames';
type AspectRatio = '16:9' | '9:16' | '1:1' | 'free';

export interface RecordedEvent {
    time: number;   // normalised 0–1 along sequence
    x: number;      // normalised 0–1 across viewport width
    y: number;      // normalised 0–1 across viewport height
    click: boolean;
}

interface EditorState {
    // Global App State
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;

    videoUrl: string | null;
    setVideoUrl: (url: string | null) => void;

    audioUrl: string | null;
    setAudioUrl: (url: string | null) => void;

    // Recording state
    isRecording: boolean;
    setIsRecording: (rec: boolean) => void;
    recordedEvents: RecordedEvent[];
    pushRecordedEvent: (ev: RecordedEvent) => void;
    clearRecordedEvents: () => void;

    // ScrollyVideo scrub state
    scrollProgress: number; // 0.0 to 1.0
    setScrollProgress: (progress: number) => void;

    // Preset switching
    activePreset: PresetId;
    setActivePreset: (preset: PresetId) => void;
    aspectRatio: AspectRatio;
    setAspectRatio: (ratio: AspectRatio) => void;
    isFullscreen: boolean;
    setIsFullscreen: (v: boolean) => void;

    // Transport / loop state (Phase 2)
    isLoop: boolean;
    setIsLoop: (v: boolean) => void;
    recordStartPosition: number;
    setRecordStartPosition: (v: number) => void;

    // Frame extraction state (Epic 4)
    mp4Asset: { name: string; url: string } | null;
    setMp4Asset: (asset: { name: string; url: string } | null) => void;
    extractedFrames: Blob[];
    setExtractedFrames: (frames: Blob[]) => void;
    extractionProgress: number;
    setExtractionProgress: (p: number) => void;
    extractionStatus: 'idle' | 'extracting' | 'done' | 'error';
    setExtractionStatus: (s: 'idle' | 'extracting' | 'done' | 'error') => void;

    // Inspector selection state (Story 3.3)
    selectedLane: string | null;
    setSelectedLane: (id: string | null) => void;
    selectedKeyframe: { laneId: string; position: number; value: number } | null;
    setSelectedKeyframe: (kf: { laneId: string; position: number; value: number } | null) => void;

    // Scene parameter lanes (Epic 3)
    rotationSpeed: number;
    setRotationSpeed: (v: number) => void;
    particleDepth: number;
    setParticleDepth: (v: number) => void;
    particleSize: number;
    setParticleSize: (v: number) => void;
    cssOpacity: number;
    setCssOpacity: (v: number) => void;

    // Scene adapter (Phase 2) — the active preset's progress driver
    activeAdapter: SceneAdapter | null;
    setActiveAdapter: (adapter: SceneAdapter | null) => void;

    /**
     * setSceneProgress — unified progress path used by scrub handle, transport, and recording.
     * Calls activeAdapter.setProgress(p) AND updates scrollProgress in Zustand.
     */
    setSceneProgress: (p: number) => void;
}

export const useStore = create<EditorState>((set, get) => ({
    isPlaying: false,
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    videoUrl: 'https://scrollyvideo.js.org/goldengate.mp4',
    setVideoUrl: (url) => set({ videoUrl: url }),

    audioUrl: null,
    setAudioUrl: (url) => set({ audioUrl: url }),

    isRecording: false,
    setIsRecording: (rec) => set({ isRecording: rec }),
    recordedEvents: [],
    pushRecordedEvent: (ev) => set((state) => ({ recordedEvents: [...state.recordedEvents, ev] })),
    clearRecordedEvents: () => set({ recordedEvents: [] }),

    scrollProgress: 0,
    setScrollProgress: (progress) => set({ scrollProgress: progress }),

    activePreset: 'orbit',
    setActivePreset: (preset) => set({ activePreset: preset }),
    aspectRatio: '16:9',
    setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
    isFullscreen: false,
    setIsFullscreen: (v) => set({ isFullscreen: v }),

    // Transport / loop state
    isLoop: false,
    setIsLoop: (v) => set({ isLoop: v }),
    recordStartPosition: 0,
    setRecordStartPosition: (v) => set({ recordStartPosition: v }),

    // Frame extraction state
    mp4Asset: null,
    setMp4Asset: (asset) => set({ mp4Asset: asset }),
    extractedFrames: [],
    setExtractedFrames: (frames) => set({ extractedFrames: frames }),
    extractionProgress: 0,
    setExtractionProgress: (p) => set({ extractionProgress: p }),
    extractionStatus: 'idle',
    setExtractionStatus: (s) => set({ extractionStatus: s }),

    // Inspector selection state
    selectedLane: null,
    setSelectedLane: (id) => set({ selectedLane: id, selectedKeyframe: null }),
    selectedKeyframe: null,
    setSelectedKeyframe: (kf) => set({ selectedKeyframe: kf, selectedLane: kf?.laneId ?? null }),

    // Scene parameter lanes
    rotationSpeed: 0.1,
    setRotationSpeed: (v) => set({ rotationSpeed: v }),
    particleDepth: 2.0,
    setParticleDepth: (v) => set({ particleDepth: v }),
    particleSize: 1.4,
    setParticleSize: (v) => set({ particleSize: v }),
    cssOpacity: 1,
    setCssOpacity: (v) => set({ cssOpacity: v }),

    // Scene adapter
    activeAdapter: null,
    setActiveAdapter: (adapter) => set({ activeAdapter: adapter }),

    // Unified progress path — drives adapter + Zustand bridge
    setSceneProgress: (p) => {
        get().activeAdapter?.setProgress(p);
        set({ scrollProgress: p });
    },
}));
