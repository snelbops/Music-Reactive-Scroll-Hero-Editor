export type ParamKf = { time: number; value: number; easing: string };

function applyEasing(alpha: number, easing: string): number {
    switch (easing) {
        case 'easeIn': return alpha * alpha * alpha;
        case 'easeOut': { const t = 1 - alpha; return 1 - t * t * t; }
        case 'easeInOut': return alpha < 0.5 ? 4 * alpha ** 3 : 1 - Math.pow(-2 * alpha + 2, 3) / 2;
        default: return alpha; // linear
    }
}

/** Cubic bezier value — t is the bezier parameter [0,1], p0–p3 are value control points. */
function cubicBezierValue(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

type ScrollKf = { time: number; value: number; easing?: string; handleOut?: { dt: number; dv: number }; handleIn?: { dt: number; dv: number } };

/** Interpolate scroll keyframes. No keyframes = linear (t/duration). */
export function interpolateScrollAt(
    keyframes: ScrollKf[],
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
            if (a.handleOut || b.handleIn) {
                // Cubic bezier: use handle dv offsets as value control points
                const p1v = a.value + (a.handleOut?.dv ?? 0);
                const p2v = b.value + (b.handleIn?.dv ?? 0);
                return cubicBezierValue(alpha, a.value, p1v, p2v, b.value);
            }
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
