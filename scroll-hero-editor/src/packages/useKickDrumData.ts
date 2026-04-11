import { useState, useEffect } from 'react';

export interface KickDrumData {
    beats: number[];
    waveform: Float32Array;
    isReady: boolean;
}

/**
 * Decodes an audio file URL using Web Audio API.
 * Returns a downsampled waveform (amplitude envelope) and simple energy-based beat timestamps.
 */
export function useKickDrumData(audioUrl: string | null): KickDrumData {
    const [data, setData] = useState<KickDrumData>({
        beats: [],
        waveform: new Float32Array(0),
        isReady: false,
    });

    useEffect(() => {
        if (!audioUrl) return;

        let cancelled = false;

        (async () => {
            try {
                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();

                const ctx = new AudioContext();
                const decoded = await ctx.decodeAudioData(arrayBuffer);
                await ctx.close();

                if (cancelled) return;

                const raw = decoded.getChannelData(0);
                const sampleRate = decoded.sampleRate;
                const duration = decoded.duration;

                // ── Waveform: RMS over ~300 windows ──────────────────────────
                const NUM_BARS = 512;
                const blockSize = Math.floor(raw.length / NUM_BARS);
                const waveform = new Float32Array(NUM_BARS);
                for (let i = 0; i < NUM_BARS; i++) {
                    const start = i * blockSize;
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += raw[start + j] ** 2;
                    }
                    waveform[i] = Math.sqrt(sum / blockSize);
                }
                // Normalize to 0..1
                const maxRms = Math.max(...waveform, 1e-6);
                for (let i = 0; i < NUM_BARS; i++) waveform[i] /= maxRms;

                // ── Beat detection: energy in low-freq band via simple windowed RMS ──
                // Use ~50ms windows, flag peaks above 1.5× local average
                const WIN_SEC = 0.05;
                const winSamples = Math.floor(WIN_SEC * sampleRate);
                const numWindows = Math.floor(raw.length / winSamples);
                const energies: number[] = [];

                for (let w = 0; w < numWindows; w++) {
                    const start = w * winSamples;
                    let sum = 0;
                    for (let j = 0; j < winSamples; j++) {
                        sum += raw[start + j] ** 2;
                    }
                    energies.push(sum / winSamples);
                }

                // Local average over ~1s (20 windows) for adaptive threshold
                const LOCAL_WIN = 20;
                const beats: number[] = [];
                const MIN_BEAT_GAP_SEC = 0.2;
                let lastBeat = -999;

                for (let w = LOCAL_WIN; w < energies.length - 1; w++) {
                    const localStart = Math.max(0, w - LOCAL_WIN);
                    let localSum = 0;
                    for (let k = localStart; k < w; k++) localSum += energies[k];
                    const localAvg = localSum / (w - localStart);

                    const t = (w * winSamples) / sampleRate;
                    if (
                        energies[w] > 1.5 * localAvg &&
                        energies[w] > energies[w - 1] &&
                        t - lastBeat > MIN_BEAT_GAP_SEC &&
                        t < duration
                    ) {
                        beats.push(parseFloat(t.toFixed(3)));
                        lastBeat = t;
                    }
                }

                setData({ beats, waveform, isReady: true });
            } catch (err) {
                console.warn('[useKickDrumData] decode failed:', err);
            }
        })();

        return () => { cancelled = true; };
    }, [audioUrl]);

    return data;
}
