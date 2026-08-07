import { useStore } from '../store/useStore';
import type { ParamKf } from './interpolate';

type ScrollKf = { time: number; value: number; easing?: string; handleOut?: { dt: number; dv: number }; handleIn?: { dt: number; dv: number } };

type ProjectFile = {
    version: number;
    scrollKeyframes: ScrollKf[];
    paramKeyframes: Record<string, ParamKf[]>;
    activePreset: string;
    aspectRatio: string;
    orbitControls: { assemblyDuration: number; assemblyEase: string; pauseAfterAssembly: boolean };
    classicDarkControls: { random: number; depth: number; size: number; touchRadius: number };
};

export function saveProject(): void {
    const s = useStore.getState();
    const data: ProjectFile = {
        version: 1,
        scrollKeyframes: s.scrollKeyframes,
        paramKeyframes: s.paramKeyframes,
        activePreset: s.activePreset,
        aspectRatio: s.aspectRatio,
        orbitControls: s.orbitControls,
        classicDarkControls: s.classicDarkControls,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scroll-hero-${Date.now()}.shero`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function loadProject(file: File): Promise<void> {
    const text = await file.text();
    const data = JSON.parse(text) as ProjectFile;
    if (!data.version) throw new Error('Invalid project file');
    const s = useStore.getState();
    s.setScrollKeyframes(data.scrollKeyframes ?? []);
    // Clear all existing param lanes then load saved ones
    ['rotationSpeed', 'depth', 'size', 'cssOpacity'].forEach(id => s.clearParamKeyframes(id));
    Object.entries(data.paramKeyframes ?? {}).forEach(([laneId, kfs]) => {
        s.setParamKeyframes(laneId, kfs);
    });
    if (data.activePreset) s.setActivePreset(data.activePreset as Parameters<typeof s.setActivePreset>[0]);
    if (data.aspectRatio) s.setAspectRatio(data.aspectRatio as Parameters<typeof s.setAspectRatio>[0]);
    if (data.orbitControls) s.setOrbitControls(data.orbitControls as any);
    if (data.classicDarkControls) s.setClassicDarkControls(data.classicDarkControls);
    // Clear history — loaded project is a clean slate
    useStore.setState({ _past: [], _future: [] });
}
