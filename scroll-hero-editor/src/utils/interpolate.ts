export type ParamKf = { time: number; value: number; easing: string };

function applyEasing(alpha: number, easing: string): number {
    switch (easing) {
        case 'easeIn': return alpha * alpha * alpha;
        case 'easeOut': { const t = 1 - alpha; return 1 - t * t * t; }
        case 'easeInOut': return alpha < 0.5 ? 4 * alpha ** 3 : 1 - Math.pow(-2 * alpha + 2, 3) / 2;
        default: return alpha; // linear
    }
}

/** Interpolate scroll keyframes. No keyframes = linear (t/duration). */
export function interpolateScrollAt(
    keyframes: { time: number; value: number; easing?: string }[],
    t: number,
    duration: number,
): number {
    if (keyframes.length === 0) return t / duration;
    if (t <= keyframes[0].time) return keyframes[0].value;
    if (t >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;
    for (let i = 0; i < keyframes.length - 1; i++) {
        const a = keyframes[i], b = keyframes[i + 1];
        if (t >= a.time && t <= b.time) {
            if (a.easing === 'step') return a.value;
            const alpha = (t - a.time) / (b.time - a.time);
            return a.value + applyEasing(alpha, a.easing ?? 'linear') * (b.value - a.value);
        }
    }
    return t / duration;
}

/** Interpolate param keyframes. Returns null when no keyframes — caller keeps current value. */
export function interpolateParamAt(keyframes: ParamKf[], t: number): number | null {
    if (keyframes.length === 0) return null;
    if (t <= keyframes[0].time) return keyframes[0].value;
    if (t >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;
    for (let i = 0; i < keyframes.length - 1; i++) {
        const a = keyframes[i], b = keyframes[i + 1];
        if (t >= a.time && t <= b.time) {
            if (a.easing === 'step') return a.value;
            const alpha = (t - a.time) / (b.time - a.time);
            return a.value + applyEasing(alpha, a.easing) * (b.value - a.value);
        }
    }
    return null;
}
