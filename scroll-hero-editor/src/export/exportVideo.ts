import { useStore } from '../store/useStore';
import { sheet } from '../theatre/core';

export type VideoExportOptions = {
    fps: 30 | 60;
    format: 'webm' | 'mp4';
    mode: 'realtime' | 'offline';
    onProgress?: (progress: number, currentTime: number) => void;
    onComplete?: () => void;
    onError?: (err: Error) => void;
};

export class VideoExporter {
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private isCancelled = false;

    async startExport(options: VideoExportOptions): Promise<void> {
        this.isCancelled = false;
        this.chunks = [];

        const seqDur = useStore.getState().sequenceDuration;
        const fps = options.fps || 60;

        // Locate preview canvas or video element
        const canvas = (document.querySelector('div[data-purpose="viewport-container"] canvas') ||
            document.querySelector('canvas')) as HTMLCanvasElement | null;

        if (!canvas) {
            options.onError?.(new Error('Preview canvas not found. Make sure scene is active.'));
            return;
        }

        try {
            // Setup MediaStream from canvas
            const canvasStream = canvas.captureStream(fps);
            let combinedStream = canvasStream;

            // Connect Audio if active
            const audioUrl = useStore.getState().audioUrl;
            let audioEl: HTMLAudioElement | null = null;
            if (audioUrl) {
                try {
                    audioEl = new Audio(audioUrl);
                    audioEl.crossOrigin = 'anonymous';
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const source = audioCtx.createMediaElementSource(audioEl);
                    const dest = audioCtx.createMediaStreamDestination();
                    source.connect(dest);
                    source.connect(audioCtx.destination);

                    const audioTrack = dest.stream.getAudioTracks()[0];
                    if (audioTrack) {
                        combinedStream = new MediaStream([...canvasStream.getVideoTracks(), audioTrack]);
                    }
                } catch (e) {
                    console.warn('Audio track capture notice:', e);
                }
            }

            // Determine MIME type
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }
            if (options.format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            }

            this.mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType,
                videoBitsPerSecond: 8000000, // 8 Mbps high quality
            });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    this.chunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                if (this.isCancelled) return;

                const blob = new Blob(this.chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                a.download = `scroll-hero-animation-${Date.now()}.${ext}`;
                a.click();
                URL.revokeObjectURL(url);

                if (audioEl) {
                    audioEl.pause();
                }

                options.onComplete?.();
            };

            // Reset sequence to 0 and start playback + recording
            sheet.sequence.position = 0;
            useStore.getState().setIsPlaying(true);
            this.mediaRecorder.start(100);

            if (audioEl) {
                audioEl.currentTime = 0;
                audioEl.play();
            }

            // Monitor position until sequence completion
            const startTime = performance.now();
            const checkInterval = setInterval(() => {
                if (this.isCancelled) {
                    clearInterval(checkInterval);
                    return;
                }

                const currentPos = sheet.sequence.position;
                const progress = Math.min(1, currentPos / seqDur);
                options.onProgress?.(progress, currentPos);

                if (currentPos >= seqDur - 0.05 || (performance.now() - startTime) / 1000 >= seqDur + 0.5) {
                    clearInterval(checkInterval);
                    useStore.getState().setIsPlaying(false);
                    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                        this.mediaRecorder.stop();
                    }
                }
            }, 50);

        } catch (err: any) {
            options.onError?.(err);
        }
    }

    cancelExport() {
        this.isCancelled = true;
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        useStore.getState().setIsPlaying(false);
    }
}

export const videoExporter = new VideoExporter();
