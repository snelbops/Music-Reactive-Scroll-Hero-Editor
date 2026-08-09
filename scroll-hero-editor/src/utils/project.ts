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
