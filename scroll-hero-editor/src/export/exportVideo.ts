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
    private animFrameId: number | null = null;

    async startExport(options: VideoExportOptions): Promise<void> {
        this.isCancelled = false;
        this.chunks = [];

        const seqDur = useStore.getState().sequenceDuration;
        const fps = options.fps || 60;

        // Locate viewport container elements
        const container = document.querySelector('div[data-purpose="viewport-container"]');
        const videoEl = container?.querySelector('video') as HTMLVideoElement | null;
        const threeCanvas = container?.querySelector('canvas') as HTMLCanvasElement | null;

        if (!videoEl && !threeCanvas) {
            options.onError?.(new Error('No preview canvas or video element found in viewport.'));
            return;
        }

        try {
            // Create a high-res Composite Canvas (1920x1080 Full HD or native viewport size)
            const compositeCanvas = document.createElement('canvas');
            const targetWidth = threeCanvas?.width || videoEl?.videoWidth || 1920;
            const targetHeight = threeCanvas?.height || videoEl?.videoHeight || 1080;
            compositeCanvas.width = targetWidth;
            compositeCanvas.height = targetHeight;
            const ctx = compositeCanvas.getContext('2d', { alpha: false })!;

            // Composite rendering loop — draws background video + canvas overlay every frame
            const renderCompositeFrame = () => {
                if (this.isCancelled) return;

                ctx.fillStyle = '#0a0a0f';
                ctx.fillRect(0, 0, targetWidth, targetHeight);

                // 1. Draw HTML5 Video background if active
                if (videoEl && videoEl.readyState >= 2) {
                    try {
                        ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
                    } catch (e) {}
                }

                // 2. Draw Three.js / Canvas overlay if active
                if (threeCanvas && threeCanvas.width > 0) {
                    try {
                        ctx.drawImage(threeCanvas, 0, 0, targetWidth, targetHeight);
                    } catch (e) {}
                }

                this.animFrameId = requestAnimationFrame(renderCompositeFrame);
            };

            renderCompositeFrame();

            // Stream from Composite Canvas
            const compositeStream = compositeCanvas.captureStream(fps);
            let finalStream = compositeStream;

            // Audio Stream pipeline
            const audioUrl = useStore.getState().audioUrl;
            let audioEl: HTMLAudioElement | null = null;
            let audioCtx: AudioContext | null = null;

            if (audioUrl) {
                try {
                    audioEl = new Audio();
                    audioEl.src = audioUrl;
                    audioEl.crossOrigin = 'anonymous';
                    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const source = audioCtx.createMediaElementSource(audioEl);
                    const dest = audioCtx.createMediaStreamDestination();
                    source.connect(dest);
                    source.connect(audioCtx.destination);

                    const audioTrack = dest.stream.getAudioTracks()[0];
                    if (audioTrack) {
                        finalStream = new MediaStream([...compositeStream.getVideoTracks(), audioTrack]);
                    }
                } catch (e) {
                    console.warn('Audio capture setup warning:', e);
                }
            } else if (videoEl) {
                // If no separate audio file, check if background video has audio stream
                try {
                    const videoStream = (videoEl as any).captureStream ? (videoEl as any).captureStream() : (videoEl as any).mozCaptureStream ? (videoEl as any).mozCaptureStream() : null;
                    if (videoStream) {
                        const audioTrack = videoStream.getAudioTracks()[0];
                        if (audioTrack) {
                            finalStream = new MediaStream([...compositeStream.getVideoTracks(), audioTrack]);
                        }
                    }
                } catch (e) {}
            }

            // Determine best supported MIME type for MP4 / WebM
            const formats = options.format === 'mp4'
                ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
                : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

            let mimeType = '';
            for (const f of formats) {
                if (MediaRecorder.isTypeSupported(f)) {
                    mimeType = f;
                    break;
                }
            }
            if (!mimeType) mimeType = 'video/webm';

            this.mediaRecorder = new MediaRecorder(finalStream, {
                mimeType,
                videoBitsPerSecond: 12000000, // 12 Mbps Full HD high bit-rate
            });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    this.chunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }

                if (this.isCancelled) return;

                const blob = new Blob(this.chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const isMp4 = mimeType.includes('mp4') || options.format === 'mp4';
                const ext = isMp4 ? 'mp4' : 'webm';
                a.download = `scroll-hero-video-${Date.now()}.${ext}`;
                a.click();
                URL.revokeObjectURL(url);

                if (audioEl) {
                    audioEl.pause();
                }
                if (audioCtx) {
                    audioCtx.close();
                }

                options.onComplete?.();
            };

            // Seek sequence to 0 and start playback + recording synchronously
            sheet.sequence.position = 0;
            useStore.getState().setIsPlaying(true);
            this.mediaRecorder.start(100);

            if (audioEl) {
                audioEl.currentTime = 0;
                audioEl.play();
            }

            // Monitor position until sequence duration completes
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
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
            options.onError?.(err);
        }
    }

    cancelExport() {
        this.isCancelled = true;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        useStore.getState().setIsPlaying(false);
    }
}

export const videoExporter = new VideoExporter();
