export type ParamKf = {
    time: number;
    value: number;
    easing: string;
    handleOut?: { dt: number; dv: number };
    handleIn?:  { dt: number; dv: number };
};

function applyEasing(alpha: number, easing: string): number {
    switch (easing) {
        case 'easeIn': return alpha * alpha * alpha;
        case 'easeOut': { const t = 1 - alpha; return 1 - t * t * t; }
        case 'easeInOut': return alpha < 0.5 ? 4 * alpha ** 3 : 1 - Math.pow(-2 * alpha + 2, 3) / 2;
        case 'spring': {
            // Critically-damped spring: overshoot ~8% then settle
            const w = 3;
            return 1 - (1 + w * alpha) * Math.exp(-w * alpha);
        }
        default: return alpha; // linear
    }
}

function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

/** 
 * Solves for the bezier parameter 't' given x position on the curve. 
 * Assumes x is monotonic (cp1.x, cp2.x between 0 and 1).
 */
function solveT(x: number, x1: number, x2: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    // Newton-Raphson or binary search? Let's use 8 iterations of binary search for stability.
    let min = 0, max = 1;
    for (let i = 0; i < 8; i++) {
        const estX = cubicBezier(t, 0, x1, x2, 1);
        if (Math.abs(estX - x) < 0.001) break;
        if (estX < x) min = t; else max = t;
        t = (min + max) / 2;
    }
    return t;
}

export type ScrollKf = { time: number; value: number; easing?: string; handleOut?: { dt: number; dv: number }; handleIn?: { dt: number; dv: number } };

/** Interpolate scroll keyframes. No keyframes = linear (t/duration). */
export function interpolateScrollAt(
    keyframes: ScrollKf[],
    t: number,
    duration: number,
): number {
    if (keyframes.length === 0) return t / duration;
    if (t <= keyframes[0].time) return keyframes[0].value;
    const last = keyframes[keyframes.length - 1];
    if (t >= last.time) return last.value;

    for (let i = 0; i < keyframes.length - 1; i++) {
        const a = keyframes[i], b = keyframes[i + 1];
        if (t >= a.time && t <= b.time) {
            if (a.easing === 'step') return a.value;
            const deltaT = b.time - a.time;
            const alphaX = (t - a.time) / deltaT;

            if (a.handleOut || b.handleIn) {
                // Horizontal handle normalized to [0,1] — clamp to 45% bound to guarantee monotonic time
                const x1 = Math.max(0, Math.min(0.45, (a.handleOut?.dt ?? 0) / deltaT));
                const x2 = Math.min(1, Math.max(0.55, 1 + (b.handleIn?.dt ?? 0) / deltaT));
                const bezT = solveT(alphaX, x1, x2);
                
                // Vertical value control points
                const y0 = a.value;
                const y1 = a.value + (a.handleOut?.dv ?? 0);
                const y2 = b.value + (b.handleIn?.dv ?? 0);
                const y3 = b.value;
                
                return cubicBezier(bezT, y0, y1, y2, y3);
            }
            return a.value + applyEasing(alphaX, a.easing ?? 'linear') * (b.value - a.value);
        }
    }
    return t / duration;
}

/** Interpolate param keyframes. Returns null when no keyframes — caller keeps current value. */
export function interpolateParamAt(keyframes: ParamKf[], t: number): number | null {
    if (keyframes.length === 0) return null;
    if (t <= keyframes[0].time) return keyframes[0].value;
    const last = keyframes[keyframes.length - 1];
    if (t >= last.time) return last.value;

    for (let i = 0; i < keyframes.length - 1; i++) {
        const a = keyframes[i], b = keyframes[i + 1];
        if (t >= a.time && t <= b.time) {
            if (a.easing === 'step') return a.value;
            const deltaT = b.time - a.time;
            const alphaX = (t - a.time) / deltaT;

            if (a.handleOut || b.handleIn) {
                const x1 = Math.max(0, Math.min(0.45, (a.handleOut?.dt ?? 0) / deltaT));
                const x2 = Math.min(1, Math.max(0.55, 1 + (b.handleIn?.dt ?? 0) / deltaT));
                const bezT = solveT(alphaX, x1, x2);
                const y0 = a.value;
                const y1 = a.value + (a.handleOut?.dv ?? 0);
                const y2 = b.value + (b.handleIn?.dv ?? 0);
                const y3 = b.value;
                return cubicBezier(bezT, y0, y1, y2, y3);
            }
            return a.value + applyEasing(alphaX, a.easing) * (b.value - a.value);
        }
    }
    return null;
}
