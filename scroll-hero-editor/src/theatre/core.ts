import { getProject, types } from '@theatre/core';
import projectState from './state.json';

/** Total sequence length in seconds. scrollProgress 0→1 maps across this duration. */
export const SEQUENCE_DURATION = 10;

// Initialize Theatre.js project and sheet — pre-seeded state marks position as sequenced
export const project = getProject('Scroll Hero Editor', { state: projectState });
export const sheet = project.sheet('Main Sequence');

// Initialize Studio in dev so studio.transaction is available for recording
if (import.meta.env.DEV) {
    import('@theatre/studio').then(({ default: studio }) => {
        studio.initialize();
    });
}

// Define our core scroll control parameters as a Theatre object.
// These are the lanes that will be visible in the @theatre/studio overlay.
export const scrollControlsObj = sheet.object('Scroll Controls', {
    // Drives the 0 to 1 progress of the ScrollyVideoPlayer natively
    position: types.number(0, { range: [0, 1] }),

    // 0.1 to 5x multiplier curve
    speed: types.number(1, { range: [0.1, 5] }),

    // Step lane for direction: +1 (forward), 0 (paused), -1 (reverse)
    // We use nudgeMultiplier of 1 to encourage step-like integer values.
    direction: types.number(1, { range: [-1, 1], nudgeMultiplier: 1 }),
});

// The Audio Pulse object will receive our programmatic frequency kicks later
export const audioPulseObj = sheet.object('Audio Pulse', {
    kickLevel: types.number(0, { range: [0, 1] })
});

// Mouse Input object — recording target for Story 5
export const mouseInputObj = sheet.object('Mouse Input', {
    mouseX: types.number(0.5, { range: [0, 1] }),
    mouseY: types.number(0.5, { range: [0, 1] }),
    click: types.number(0, { range: [0, 1] }),
});
