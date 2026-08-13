import { sheet } from './core';

/**
 * The transport clock.
 *
 * This used to be Theatre's own `sheet.sequence.position`. Theatre clamps that to the
 * sequence's length, and the length is fixed when the project is created: `sequence.length`
 * looks assignable but is not a setter, so writing it silently does nothing, and a length
 * seeded through `getProject({ state })` is ignored once Studio has persisted a state for
 * that project — which it has, for anyone who has opened the editor before. The result was
 * a playhead that stuttered and stopped dead at exactly 10.000s on any longer project.
 *
 * Nothing else depended on Theatre driving the clock. Every animated value in the editor is
 * interpolated from the project's own keyframes, so the clock lives here now. The position
 * is still mirrored into Theatre — where it is clamped, harmlessly — so the Studio UI stays
 * in step for anyone who opens it.
 */
type Listener = (position: number) => void;

let current = 0;
const listeners = new Set<Listener>();

export const playhead = {
    get position(): number {
        return current;
    },

    set position(next: number) {
        const value = Number.isFinite(next) ? Math.max(0, next) : 0;
        if (value === current) return;
        current = value;
        try {
            sheet.sequence.position = value;
        } catch {
            // Mirroring is a convenience for the Studio UI; the clock does not need it.
        }
        for (const listener of [...listeners]) listener(value);
    },

    /** Subscribe to position changes. Returns an unsubscribe function. */
    onChange(listener: Listener): () => void {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },
};
