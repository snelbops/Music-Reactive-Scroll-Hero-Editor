/**
 * Punch-in tracking for the live recorders.
 *
 * Recording overwrites the span between the start of the current gesture and the playhead.
 * That is right while you are performing and wrong the moment you stop: the span used to
 * stay open, so touching the control again later swept away everything recorded in
 * between — a stretch you never touched on this pass.
 *
 * A gesture ends when input stops arriving, or when the playhead jumps backwards, which is
 * what a loop wrap looks like from here. Everything else counts as still performing,
 * *including holding the control perfectly still*: that is a deliberate flat value, not an
 * absence of input. Which is why this keys off touch rather than off the value changing.
 *
 * Every input that records to a lane should share this, so scroll, the scrub handle and a
 * MIDI knob all behave the same way.
 */

/** How long a pause in input ends a gesture. Longer than the gap between wheel ticks or
 *  pointer moves; shorter than letting go and coming back. */
export const GESTURE_GAP_MS = 250;

export interface PunchIn {
    /**
     * Call once per recorded input event. Returns where the overwrite span should start,
     * or `undefined` to overwrite nothing but the point itself.
     */
    at(position: number): number | undefined;
    /** Ends the gesture — on pointer release, or when recording stops. */
    reset(): void;
}

export function createPunchIn(gapMs: number = GESTURE_GAP_MS): PunchIn {
    let spanStart: number | null = null;
    let lastInputAt = 0;

    return {
        at(position) {
            const idle = performance.now() - lastInputAt > gapMs;
            const wrapped = spanStart !== null && position < spanStart;
            const from = idle || wrapped ? undefined : spanStart ?? undefined;
            spanStart = position;
            lastInputAt = performance.now();
            return from;
        },
        reset() {
            spanStart = null;
            lastInputAt = 0;
        },
    };
}
