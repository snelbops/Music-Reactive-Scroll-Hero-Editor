import { useStore } from '../store/useStore';
import type { ParamKf } from './interpolate';

export type ScrollKf = {
    time: number;
    value: number;
    easing?: string;
    handleOut?: { dt: number; dv: number };
    handleIn?: { dt: number; dv: number };
};

export type ProjectData = {
    version: number;
    id?: string;
    name: string;
    updatedAt: number;
    sequenceDuration: number;
    loopStart: number;
    loopEnd: number;
    isLoop: boolean;
    scrollKeyframes: ScrollKf[];
    paramKeyframes: Record<string, ParamKf[]>;
    activePreset: string;
    aspectRatio: string;
    orbitControls: { assemblyDuration: number; assemblyEase: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'; pauseAfterAssembly: boolean };
    classicDarkControls: { random: number; depth: number; size: number; touchRadius: number };
    rotationSpeed?: number;
    particleDepth?: number;
    particleSize?: number;
    cssOpacity?: number;
    videoUrl?: string | null;
    audioUrl?: string | null;
    mp4Asset?: { name: string; url: string } | null;
    videoPads?: Array<{ id: number; name: string; url: string }>;
    activeVideoPadIdx?: number;
    lightImages?: { name: string; url: string }[];
    activeLightImageIdx?: number;
    recordedEvents?: Array<{ time: number; x: number; y: number; click: boolean }>;
    padSwitchEvents?: Array<{ time: number; padIdx: number }>;
    playheadPosition?: number;
    timelineScrollLeft?: number;
    timelineZoom?: number;
    verticalZoom?: number;
    selectedLane?: string;
};

const LOCAL_STORAGE_KEY_CURRENT = 'scroll-hero-current-project';
const LOCAL_STORAGE_KEY_SLOTS = 'scroll-hero-saved-slots';

// Starter Template Projects
export const STARTER_TEMPLATES: ProjectData[] = [
    {
        version: 1,
        id: 'template-default-hero',
        name: '🌟 Default Hero Motion',
        updatedAt: Date.now(),
        sequenceDuration: 10,
        loopStart: 0,
        loopEnd: 10,
        isLoop: false,
        activePreset: 'particle',
        aspectRatio: '16:9',
        orbitControls: { assemblyDuration: 2.0, assemblyEase: 'easeOut', pauseAfterAssembly: false },
        classicDarkControls: { random: 2.0, depth: 4.0, size: 1.5, touchRadius: 0.15 },
        scrollKeyframes: [
            { time: 0, value: 0, easing: 'easeInOut' },
            { time: 3, value: 0.35, easing: 'easeOut' },
            { time: 7, value: 0.8, easing: 'easeInOut' },
            { time: 10, value: 1, easing: 'linear' },
        ],
        paramKeyframes: {
            rotationSpeed: [
                { time: 0, value: 0.1, easing: 'linear' },
                { time: 5, value: 0.8, easing: 'easeInOut' },
                { time: 10, value: 0.1, easing: 'linear' },
            ],
            depth: [
                { time: 0, value: 2.0, easing: 'linear' },
                { time: 3, value: 6.0, easing: 'easeInOut' },
                { time: 7, value: 3.0, easing: 'easeInOut' },
                { time: 10, value: 2.0, easing: 'linear' },
            ],
            size: [
                { time: 0, value: 1.5, easing: 'linear' },
                { time: 5, value: 2.5, easing: 'linear' },
                { time: 10, value: 1.5, easing: 'linear' },
            ],
            cssOpacity: [
                { time: 0, value: 1, easing: 'linear' },
                { time: 8.5, value: 1, easing: 'easeOut' },
                { time: 10, value: 0, easing: 'linear' },
            ],
        },
    },
    {
        version: 1,
        id: 'template-beat-bounce',
        name: '🎵 Music Beat Pulse',
        updatedAt: Date.now(),
        sequenceDuration: 10,
        loopStart: 0,
        loopEnd: 10,
        isLoop: true,
        activePreset: 'particle',
        aspectRatio: '16:9',
        orbitControls: { assemblyDuration: 1.5, assemblyEase: 'easeInOut', pauseAfterAssembly: false },
        classicDarkControls: { random: 3.0, depth: 5.0, size: 2.0, touchRadius: 0.2 },
        scrollKeyframes: [
            { time: 0, value: 0, easing: 'linear' },
            { time: 2, value: 0.25, easing: 'linear' },
            { time: 4, value: 0.5, easing: 'linear' },
            { time: 6, value: 0.75, easing: 'linear' },
            { time: 8, value: 0.9, easing: 'linear' },
            { time: 10, value: 1.0, easing: 'linear' },
        ],
        paramKeyframes: {
            rotationSpeed: [
                { time: 0, value: 0.2, easing: 'linear' },
                { time: 5, value: 1.5, easing: 'easeInOut' },
                { time: 10, value: 0.2, easing: 'linear' },
            ],
            depth: [
                { time: 0, value: 2.0, easing: 'linear' },
                { time: 2.5, value: 8.0, easing: 'easeInOut' },
                { time: 5.0, value: 2.0, easing: 'linear' },
                { time: 7.5, value: 8.0, easing: 'easeInOut' },
                { time: 10.0, value: 2.0, easing: 'linear' },
            ],
        },
    },
    {
        version: 1,
        id: 'template-blank',
        name: '📄 Blank Project',
        updatedAt: Date.now(),
        sequenceDuration: 10,
        loopStart: 0,
        loopEnd: 10,
        isLoop: false,
        activePreset: 'particle',
        aspectRatio: '16:9',
        orbitControls: { assemblyDuration: 2.0, assemblyEase: 'easeOut', pauseAfterAssembly: false },
        classicDarkControls: { random: 2.0, depth: 4.0, size: 1.5, touchRadius: 0.15 },
        scrollKeyframes: [
            { time: 0, value: 0, easing: 'linear' },
            { time: 10, value: 1, easing: 'linear' },
        ],
        paramKeyframes: {},
    },
];

export function getProjectDataFromStore(name = 'Untitled Project'): ProjectData {
    const s = useStore.getState();
    return {
        version: 1,
        name,
        updatedAt: Date.now(),
        sequenceDuration: s.sequenceDuration,
        loopStart: s.loopStart,
        loopEnd: s.loopEnd,
        isLoop: s.isLoop,
        scrollKeyframes: s.scrollKeyframes,
        paramKeyframes: s.paramKeyframes,
        activePreset: s.activePreset,
        aspectRatio: s.aspectRatio,
        orbitControls: s.orbitControls,
        classicDarkControls: s.classicDarkControls,
        rotationSpeed: s.rotationSpeed,
        particleDepth: s.particleDepth,
        particleSize: s.particleSize,
        cssOpacity: s.cssOpacity,
        videoUrl: s.videoUrl,
        audioUrl: s.audioUrl,
        mp4Asset: s.mp4Asset,
        videoPads: s.videoPads,
        activeVideoPadIdx: s.activeVideoPadIdx,
        lightImages: s.lightImages,
        activeLightImageIdx: s.activeLightImageIdx,
        recordedEvents: s.recordedEvents,
        padSwitchEvents: s.padSwitchEvents,
        playheadPosition: s.playheadPosition,
        timelineScrollLeft: s.timelineScrollLeft,
        timelineZoom: s.timelineZoom,
        verticalZoom: s.verticalZoom,
        selectedLane: s.selectedLane ?? undefined,
    };
}

export function applyProjectDataToStore(data: Partial<ProjectData>): void {
    const s = useStore.getState();
    if (data.scrollKeyframes) s.setScrollKeyframes(data.scrollKeyframes);
    if (data.paramKeyframes) {
        ['rotationSpeed', 'depth', 'size', 'cssOpacity'].forEach(id => s.clearParamKeyframes(id));
        Object.entries(data.paramKeyframes).forEach(([laneId, kfs]) => {
            s.setParamKeyframes(laneId, kfs);
        });
    }
    if (typeof data.sequenceDuration === 'number') s.setSequenceDuration(data.sequenceDuration);
    if (typeof data.loopStart === 'number' && typeof data.loopEnd === 'number') {
        s.setLoopRange(data.loopStart, data.loopEnd);
    }
    if (typeof data.isLoop === 'boolean') s.setIsLoop(data.isLoop);
    if (data.activePreset) s.setActivePreset(data.activePreset as any);
    if (data.aspectRatio) s.setAspectRatio(data.aspectRatio as any);
    if (data.orbitControls) s.setOrbitControls(data.orbitControls as any);
    if (data.classicDarkControls) s.setClassicDarkControls(data.classicDarkControls);

    if (typeof data.rotationSpeed === 'number') s.setRotationSpeed(data.rotationSpeed);
    if (typeof data.particleDepth === 'number') s.setParticleDepth(data.particleDepth);
    if (typeof data.particleSize === 'number') s.setParticleSize(data.particleSize);
    if (typeof data.cssOpacity === 'number') s.setCssOpacity(data.cssOpacity);

    if (data.videoUrl !== undefined) s.setVideoUrl(data.videoUrl);
    if (data.audioUrl !== undefined) s.setAudioUrl(data.audioUrl);
    if (data.mp4Asset !== undefined) s.setMp4Asset(data.mp4Asset);
    if (data.videoPads) useStore.setState({ videoPads: data.videoPads });
    if (typeof data.activeVideoPadIdx === 'number') s.setActiveVideoPadIdx(data.activeVideoPadIdx);
    if (data.lightImages) useStore.setState({ lightImages: data.lightImages });
    if (typeof data.activeLightImageIdx === 'number') s.setActiveLightImageIdx(data.activeLightImageIdx);

    if (data.recordedEvents) useStore.setState({ recordedEvents: data.recordedEvents });
    if (data.padSwitchEvents) useStore.setState({ padSwitchEvents: data.padSwitchEvents });

    if (typeof data.playheadPosition === 'number') s.setPlayheadPosition(data.playheadPosition);
    if (typeof data.timelineScrollLeft === 'number') s.setTimelineScrollLeft(data.timelineScrollLeft);
    if (typeof data.timelineZoom === 'number') s.setTimelineZoom(data.timelineZoom);
    if (typeof data.verticalZoom === 'number') s.setVerticalZoom(data.verticalZoom);
    if (typeof data.selectedLane === 'string') s.setSelectedLane(data.selectedLane);

    useStore.setState({ _past: [], _future: [] });
}

// Auto-save working session into localStorage
export function autoSaveWorkingProject(): void {
    if (typeof window === 'undefined') return;
    try {
        const data = getProjectDataFromStore('Working Session');
        localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT, JSON.stringify(data));
    } catch (e) {}
}

export function loadWorkingProject(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT);
        if (!raw) return false;
        const data = JSON.parse(raw) as ProjectData;
        if (data && data.scrollKeyframes && data.scrollKeyframes.length > 0) {
            applyProjectDataToStore(data);
            return true;
        }
    } catch (e) {}
    return false;
}

// Named Project Slots in LocalStorage
export function getSavedProjectSlots(): ProjectData[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SLOTS);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

export function saveProjectSlot(name: string): ProjectData {
    const slots = getSavedProjectSlots();
    const data = getProjectDataFromStore(name);
    data.id = `slot-${Date.now()}`;
    const existingIndex = slots.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
        slots[existingIndex] = data;
    } else {
        slots.unshift(data);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_SLOTS, JSON.stringify(slots));
    autoSaveWorkingProject();
    return data;
}

export function deleteProjectSlot(id: string): void {
    const slots = getSavedProjectSlots().filter(s => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY_SLOTS, JSON.stringify(slots));
}

// Legacy / File export & import
export function saveProject(): void {
    saveProjectToFile();
}

export function saveProjectToFile(filename?: string): void {
    const data = getProjectDataFromStore(filename ?? 'scroll-hero-project');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.name || 'scroll-hero').toLowerCase().replace(/[^a-z0-9]/g, '-')}.shero`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function loadProject(file: File): Promise<void> {
    return loadProjectFromFile(file);
}

export async function loadProjectFromFile(file: File): Promise<void> {
    const text = await file.text();
    const data = JSON.parse(text) as ProjectData;
    if (!data || !data.version) throw new Error('Invalid .shero project file');
    applyProjectDataToStore(data);
    autoSaveWorkingProject();
}

export function startNewProject(): void {
    const blankTemplate = STARTER_TEMPLATES.find(t => t.id === 'template-blank') ?? STARTER_TEMPLATES[0];
    applyProjectDataToStore(blankTemplate);
    const s = useStore.getState();
    s.setPlayheadPosition(0);
    s.setTimelineScrollLeft(0);
    s.setTimelineZoom(1);
    s.setVerticalZoom(1);
    s.setSelectedKeyframes([]);
    s.setTimeSelection(null);
    autoSaveWorkingProject();
}
