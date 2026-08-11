import { useEffect } from 'react';
import { useStore } from '../store/useStore';

/**
 * Web MIDI API integration hook.
 * Maps physical MIDI controller knobs/faders to Scroll POS (scrollProgress)
 * and MIDI pads to Video Pads 1-4.
 */
export function useWebMIDI() {
    useEffect(() => {
        if (!navigator.requestMIDIAccess) return;

        let midiAccess: MIDIAccess | null = null;

        const onMIDIMessage = (event: MIDIMessageEvent) => {
            if (!event.data) return;
            const status = event.data[0];
            const data1 = event.data[1];
            const data2 = event.data[2];
            const command = status & 0xf0;

            // Note On command (0x90) or Control Change (0xb0)
            if (command === 0x90 && data2 > 0) {
                // MIDI Pad triggers (Notes 35-48 for standard 10 drumpads / Akai LPD8)
                const padMap: Record<number, number> = {
                    45: 0, // Pad 7 (Index 0)
                    47: 1, // Pad 8 (Index 1)
                    48: 2, // Pad 9 (Index 2)
                    40: 3, // Pad 4 (Index 3)
                    41: 4, // Pad 5 (Index 4)
                    43: 5, // Pad 6 (Index 5)
                    36: 6, // Pad 1 (Index 6)
                    37: 7, // Pad 2 (Index 7)
                    38: 8, // Pad 3 (Index 8)
                    35: 9, // Pad 0 (Index 9)
                };
                if (data1 in padMap) {
                    useStore.getState().setActiveVideoPadIdx(padMap[data1]);
                }
            } else if (command === 0xb0) {
                // Control Change (CC) - Knob / Fader
                // Normalize CC value (0-127) to 0.0 - 1.0
                const normalizedValue = data2 / 127;
                
                // Map CC 1 (Modwheel), CC 7 (Volume), CC 16-20 (Knobs) to Scroll POS
                if ([1, 7, 16, 17, 18, 19, 20, 74].includes(data1)) {
                    const store = useStore.getState();
                    store.setScrollProgress(normalizedValue);

                    // If recording, write live scroll keyframe
                    if (store.isRecording && store.isPlaying) {
                        const time = store.scrollProgress;
                        store.addScrollKeyframe(time, normalizedValue);
                    }
                }
            }
        };

        navigator.requestMIDIAccess().then(
            (access) => {
                midiAccess = access;
                for (const input of midiAccess.inputs.values()) {
                    input.onmidimessage = onMIDIMessage;
                }
                midiAccess.onstatechange = (e: any) => {
                    if (e.port.type === 'input' && e.port.state === 'connected') {
                        e.port.onmidimessage = onMIDIMessage;
                    }
                };
            },
            () => {
                // MIDI access denied or unavailable; fail gracefully
            }
        );

        return () => {
            if (midiAccess) {
                for (const input of midiAccess.inputs.values()) {
                    input.onmidimessage = null;
                }
            }
        };
    }, []);
}
