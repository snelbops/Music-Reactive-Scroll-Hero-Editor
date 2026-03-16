import { getProject, types } from '@theatre/core';

/** Total sequence length in seconds. scrollProgress 0→1 maps across this duration. */
export const SEQUENCE_DURATION = 10;

// Initialize Theatre.js project — studio persists state in localStorage automatically
export const project = getProject('Scroll Hero Editor');
export const sheet = project.sheet('Main Sequence');

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

// Scene parameter lanes — drive GithubTestParticleField props via Theatre.js
export const sceneParamsObj = sheet.object('Scene Parameters', {
    rotationSpeed: types.number(0.1, { range: [0, 2] }),
    depth: types.number(2.0, { range: [0, 10] }),
    size: types.number(1.4, { range: [0.1, 5] }),
});

// CSS Opacity lane — fades the entire scene in/out
export const cssOpacityObj = sheet.object('CSS Opacity', {
    opacity: types.number(1, { range: [0, 1] }),
});
