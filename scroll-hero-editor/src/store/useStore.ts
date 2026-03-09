import { create } from 'zustand';

type PresetId = 'orbit' | 'classic';
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
}

export const useStore = create<EditorState>((set) => ({
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
}));
