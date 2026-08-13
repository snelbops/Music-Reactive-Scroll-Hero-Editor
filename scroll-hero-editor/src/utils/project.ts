import { useStore, type VideoPad } from '../store/useStore';
import type { ParamKf } from './interpolate';
import { saveMediaFile, loadMediaFile, getMediaDataUrl, dataUrlToBlob, getMediaBlob, newPadMediaKey, revokeMediaUrl } from './mediaStore';
import { rehydratePadProxies } from './padProxy';

/**
 * Pad and light-image URLs are `blob:` URLs, which die with the page. The bytes live on in
 * IndexedDB, so after a reload every stored URL has to be minted again — without this the
 * pad grid looks populated but every pad is dead.
 *
 * Older projects stored pad media under `video-pad-<index>`; those are migrated onto a
 * stable per-clip key on first load so reordering can no longer desync them.
 */
export async function rehydrateMediaUrls(): Promise<void> {
    const s = useStore.getState();

    const pads = await Promise.all(s.videoPads.map(async (pad, idx) => {
        if (!pad.name && !pad.url && !pad.mediaKey) return pad;
        let key = pad.mediaKey;
        let blob = key ? await getMediaBlob(key) : null;
        if (!blob) {
            const legacy = await getMediaBlob(`video-pad-${idx}`);
            if (!legacy) return pad.url ? { ...pad, url: '' } : pad;
            key = newPadMediaKey();
            await saveMediaFile(key, legacy);
            blob = legacy;
        }
        revokeMediaUrl(pad.url);   // the URL being replaced is dead or superseded
        return { ...pad, url: URL.createObjectURL(blob), mediaKey: key };
    }));
    useStore.setState({ videoPads: pads });

    const images = await Promise.all(s.lightImages.map(async (img) => {
        const url = await loadMediaFile(`light-img-${img.name}`);
        return url ? { ...img, url } : img;
    }));
    if (images.length > 0) useStore.setState({ lightImages: images });

    // The active pad drives the viewport, so point it at the URL we just minted.
    const active = pads[useStore.getState().activeVideoPadIdx];
    if (active?.url) useStore.getState().setVideoUrl(active.url);
}

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
    videoPads?: VideoPad[];
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

/**
 * A `blob:` URL only lives as long as the document that minted it, so one read back out of
 * a saved project is always dead. Restoring it left the app pointing at a URL that fails to
 * fetch — the waveform silently never drew, and the video export had nothing to send.
 * Dropping it lets the IndexedDB rehydration that follows mint a fresh one instead.
 */
const liveUrl = (url: string | null | undefined): string | null =>
    url && !url.startsWith('blob:') ? url : null;

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

    if (data.videoUrl !== undefined) s.setVideoUrl(liveUrl(data.videoUrl));
    if (data.audioUrl !== undefined) s.setAudioUrl(liveUrl(data.audioUrl));
    if (data.mp4Asset !== undefined) {
        // Keeps the file name for the panel; setMp4Asset mirrors its url into videoUrl,
        // so a dead one has to be cleared again afterwards.
        s.setMp4Asset(data.mp4Asset);
        if (data.mp4Asset && !liveUrl(data.mp4Asset.url)) s.setVideoUrl(null);
    }
    const DEFAULT_PAD_COLORS: Record<number, string> = {
        7: '#5f7f9e', 8: '#6e9c73', 9: '#a86a5c', 4: '#7a6fa8', 5: '#c98a4d',
        6: '#5f9e96', 1: '#9e7a5f', 2: '#7d848c', 3: '#8a9e6e', 0: '#6e7a9e',
    };
    if (data.videoPads) {
        const mergedPads = data.videoPads.map((p, idx) => ({
            ...p,
            color: p.color || DEFAULT_PAD_COLORS[p.id] || ['#5f7f9e', '#6e9c73', '#a86a5c', '#7a6fa8', '#c98a4d', '#5f9e96', '#9e7a5f', '#7d848c', '#8a9e6e', '#6e7a9e'][idx % 10],
        }));
        useStore.setState({ videoPads: mergedPads });
    }
    if (typeof data.activeVideoPadIdx === 'number') s.setActiveVideoPadIdx(data.activeVideoPadIdx, { keepPreset: true });
    if (data.lightImages) useStore.setState({ lightImages: data.lightImages });
    if (typeof data.activeLightImageIdx === 'number') s.setActiveLightImageIdx(data.activeLightImageIdx);

    useStore.setState({
        recordedEvents: data.recordedEvents ?? [],
        padSwitchEvents: data.padSwitchEvents ?? [],
    });

    if (typeof data.playheadPosition === 'number') s.setPlayheadPosition(data.playheadPosition);
    if (typeof data.timelineScrollLeft === 'number') s.setTimelineScrollLeft(data.timelineScrollLeft);
    if (typeof data.timelineZoom === 'number') s.setTimelineZoom(data.timelineZoom);
    if (typeof data.verticalZoom === 'number') s.setVerticalZoom(data.verticalZoom);
    if (typeof data.selectedLane === 'string') s.setSelectedLane(data.selectedLane);

    useStore.setState({ _past: [], _future: [] });
}

/**
 * Auto-save the working session.
 *
 * localStorage caps around 5MB and a long recording plus a dense envelope can exceed it.
 * This used to swallow the QuotaExceededError, so work simply stopped being saved with no
 * sign. Now the recordings — by far the bulkiest part — are dropped so the rest of the
 * project still persists, and the outcome is published to the store so the UI can say so.
 */
export function autoSaveWorkingProject(): void {
    if (typeof window === 'undefined') return;

    const data = getProjectDataFromStore('Working Session');
    let status: 'ok' | 'trimmed' | 'failed' = 'ok';
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT, JSON.stringify(data));
    } catch {
        try {
            localStorage.setItem(
                LOCAL_STORAGE_KEY_CURRENT,
                JSON.stringify({ ...data, recordedEvents: [], padSwitchEvents: [] }),
            );
            status = 'trimmed';
        } catch {
            status = 'failed';
        }
    }
    // Guarded so this cannot loop: it is called from a store subscription, and writing the
    // same value again would re-enter.
    if (useStore.getState().autosaveStatus !== status) {
        useStore.setState({ autosaveStatus: status });
    }
}

export async function loadWorkingProject(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT);
        if (!raw) return false;
        const data = JSON.parse(raw) as ProjectData;
        if (data && (data.version !== undefined || data.name || data.scrollKeyframes)) {
            applyProjectDataToStore(data);

            // Restore persistent audio and video files from IndexedDB
            const audioUrl = await loadMediaFile('active-audio');
            if (audioUrl) {
                useStore.getState().setAudioUrl(audioUrl);
            }
            const videoUrl = await loadMediaFile('active-video');
            if (videoUrl) {
                const s = useStore.getState();
                const name = s.mp4Asset?.name || 'Uploaded Video';
                s.setMp4Asset({ name, url: videoUrl });
                s.setVideoUrl(videoUrl);
            }
            // Pads and light images carry their own stored files — revive those too.
            await rehydrateMediaUrls();
            // Proxies are expensive to build, so a stored one is picked back up rather than
            // rebuilt. Deliberately not awaited: it only makes scrubbing cheaper, and the
            // editor should not wait on it to open.
            void rehydratePadProxies();
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

export async function saveProjectToFile(filename?: string): Promise<void> {
    const data = getProjectDataFromStore(filename ?? 'scroll-hero-project');

    // Embed audio and video Data URLs for portable .shero export if available
    const audioDataUrl = await getMediaDataUrl('active-audio');
    if (audioDataUrl) {
        (data as any).audioDataUrl = audioDataUrl;
    }
    const videoDataUrl = await getMediaDataUrl('active-video');
    if (videoDataUrl) {
        (data as any).videoDataUrl = videoDataUrl;
    }

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
    const data = JSON.parse(text) as ProjectData & { audioDataUrl?: string; videoDataUrl?: string };
    if (!data || !data.version) throw new Error('Invalid .shero project file');
    applyProjectDataToStore(data);

    if (data.audioDataUrl) {
        const audioBlob = dataUrlToBlob(data.audioDataUrl);
        const url = await saveMediaFile('active-audio', audioBlob);
        useStore.getState().setAudioUrl(url);
    }
    if (data.videoDataUrl) {
        const videoBlob = dataUrlToBlob(data.videoDataUrl);
        const url = await saveMediaFile('active-video', videoBlob);
        const name = data.mp4Asset?.name || 'Embedded Video';
        useStore.getState().setMp4Asset({ name, url });
        useStore.getState().setVideoUrl(url);
    }

    // Pad URLs in the file are blob: URLs from whoever saved it — always dead here.
    await rehydrateMediaUrls();
    void rehydratePadProxies();

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
