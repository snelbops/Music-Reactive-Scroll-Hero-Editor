// deferred: audio sync — v2
import { useState, useEffect } from 'react';

export interface KickDrumData {
    beats: number[];
    waveform: Float32Array;
    isReady: boolean;
}

export function useKickDrumData(audioUrl: string | null): KickDrumData {
    const [data, setData] = useState<KickDrumData>({
        beats: [],
        waveform: new Float32Array(0),
        isReady: false
    });

    useEffect(() => {
        if (!audioUrl) return;

        // Mock static array of fake beat timestamps (in seconds)
        const mockBeats = [1.2, 2.4, 3.6, 4.8, 6.0];

        // Mock flat waveform buffer (1024 values just to have something)
        const mockWaveform = new Float32Array(1024);
        for (let i = 0; i < mockWaveform.length; i++) {
            mockWaveform[i] = Math.sin(i * 0.1) * 0.5 + 0.5; // simple sine wave mock
        }

        // Simulate loading time
        const timer = setTimeout(() => {
            setData({
                beats: mockBeats,
                waveform: mockWaveform,
                isReady: true
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [audioUrl]);

    return data;
}
