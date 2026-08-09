import { useStore } from '../store/useStore';
import { sheet } from '../theatre/core';
import { interpolateScrollAt, interpolateParamAt, type ParamKf } from '../utils/interpolate';

export type VideoExportOptions = {
    fps: 30 | 60;
    format: 'webm' | 'mp4';
    mode: 'realtime' | 'offline';
    aspectRatio?: string;
    includeParticles?: boolean;
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
        const selectedRatio = options.aspectRatio || useStore.getState().aspectRatio || '16:9';
        const shouldIncludeParticles = options.includeParticles !== false;

        // Locate viewport container elements
        const container = document.querySelector('div[data-purpose="viewport-container"]') as HTMLElement | null;
        const videoEl = container?.querySelector('video') as HTMLVideoElement | null;
        const threeCanvas = container?.querySelector('canvas') as HTMLCanvasElement | null;

        if (!videoEl && !threeCanvas) {
            options.onError?.(new Error('No preview canvas or video element found in viewport. Make sure scene is active.'));
            return;
        }

        // Calculate resolution based on selected export aspect ratio
        let targetWidth = 1920;
        let targetHeight = 1080;

        if (selectedRatio === '9:16') {
            targetWidth = 1080;
            targetHeight = 1920;
        } else if (selectedRatio === '1:1') {
            targetWidth = 1080;
            targetHeight = 1080;
        } else if (selectedRatio === '16:9') {
            targetWidth = 1920;
            targetHeight = 1080;
        } else if (selectedRatio === 'native' && videoEl && videoEl.videoWidth > 0) {
            targetWidth = videoEl.videoWidth;
            targetHeight = videoEl.videoHeight;
        } else if (container) {
            const rect = container.getBoundingClientRect();
            if (rect.height > 0 && rect.height > 0) {
                const scale = 1080 / rect.height;
                targetHeight = 1080;
                targetWidth = Math.round(rect.width * scale);
            }
        }

        // Ensure even pixel dimensions for video encoders
        if (targetWidth % 2 !== 0) targetWidth += 1;
        if (targetHeight % 2 !== 0) targetHeight += 1;

        try {
            // High-resolution Composite Canvas matching selected aspect ratio
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = targetWidth;
            compositeCanvas.height = targetHeight;
            const ctx = compositeCanvas.getContext('2d', { alpha: false })!;

            // Stream setup
            const compositeStream = compositeCanvas.captureStream(fps);
            let finalStream = compositeStream;

            // Audio Stream setup via WebAudio Destination
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

            // Supported MIME types
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
                videoBitsPerSecond: 12000000, // 12 Mbps HD high bit-rate
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
                a.download = `scroll-hero-${selectedRatio}-${targetWidth}x${targetHeight}-${Date.now()}.${ext}`;
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

            // Pause background TheatreSync loop to prevent playhead conflicts
            useStore.getState().setIsPlaying(false);
            sheet.sequence.position = 0;
            this.mediaRecorder.start(100);

            if (audioEl) {
                audioEl.currentTime = 0;
                audioEl.play().catch((e) => console.warn('Audio export play error:', e));
            }

            // OFFLINE FRAME-BY-FRAME SAMPLER (Waiting for seeked & requestVideoFrameCallback per frame)
            const totalFrames = Math.ceil(seqDur * fps);

            for (let i = 0; i < totalFrames; i++) {
                if (this.isCancelled) break;

                const t = (i / totalFrames) * seqDur;
                sheet.sequence.position = t;

                // 1. Evaluate scroll keyframes at time t
                const kfs = useStore.getState().scrollKeyframes;
                const prog = interpolateScrollAt(kfs, t, seqDur);
                useStore.getState().setSceneProgress(prog);

                // 2. Evaluate param keyframes at time t
                const pkfs = useStore.getState().paramKeyframes;
                const rSpeed = interpolateParamAt((pkfs['rotationSpeed'] ?? []) as ParamKf[], t);
                if (rSpeed !== null) useStore.getState().setRotationSpeed(rSpeed);
                const depth = interpolateParamAt((pkfs['depth'] ?? []) as ParamKf[], t);
                if (depth !== null) useStore.getState().setParticleDepth(depth);
                const size = interpolateParamAt((pkfs['size'] ?? []) as ParamKf[], t);
                if (size !== null) useStore.getState().setParticleSize(size);
                const opacity = interpolateParamAt((pkfs['cssOpacity'] ?? []) as ParamKf[], t);
                if (opacity !== null) useStore.getState().setCssOpacity(opacity);

                // 3. Multi-clip pad switch events check
                const padEvents = useStore.getState().padSwitchEvents;
                if (padEvents.length > 0) {
                    const activeEv = padEvents.filter(e => e.time <= t).pop();
                    if (activeEv && activeEv.padIdx !== useStore.getState().activeVideoPadIdx) {
                        useStore.getState().setActiveVideoPadIdx(activeEv.padIdx);
                    }
                }

                // 4. Seek background video and WAIT for GPU hardware decode frame callback
                if (videoEl && videoEl.duration > 0) {
                    const syncMode = useStore.getState().videoSyncMode;
                    const ratio = useStore.getState().videoSpeedRatio;
                    let videoTargetTime = 0;
                    if (syncMode === 'fit') {
                        videoTargetTime = (prog * videoEl.duration) * ratio;
                    } else if (syncMode === 'loop') {
                        videoTargetTime = (prog * seqDur * ratio) % videoEl.duration;
                    } else {
                        videoTargetTime = prog * seqDur * ratio;
                    }
                    videoTargetTime = Math.max(0, Math.min(videoEl.duration - 0.01, videoTargetTime));

                    if (Math.abs(videoEl.currentTime - videoTargetTime) > 0.001) {
                        videoEl.currentTime = videoTargetTime;

                        await new Promise<void>((resolve) => {
                            let isDone = false;
                            const done = () => {
                                if (!isDone) {
                                    isDone = true;
                                    videoEl.removeEventListener('seeked', done);
                                    requestAnimationFrame(() => resolve());
                                }
                            };

                            if ('requestVideoFrameCallback' in videoEl) {
                                (videoEl as any).requestVideoFrameCallback(done);
                            }
                            videoEl.addEventListener('seeked', done, { once: true });
                            setTimeout(done, 80);
                        });
                    }
                } else {
                    await new Promise(r => requestAnimationFrame(r));
                }

                // 5. Draw Composite Canvas Frame (Video + Three.js Canvas overlay)
                ctx.fillStyle = '#0a0a0f';
                ctx.fillRect(0, 0, targetWidth, targetHeight);

                if (videoEl && videoEl.readyState >= 2) {
                    try {
                        ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
                    } catch (e) {}
                }

                if (shouldIncludeParticles && threeCanvas && threeCanvas.width > 0) {
                    try {
                        ctx.drawImage(threeCanvas, 0, 0, targetWidth, targetHeight);
                    } catch (e) {}
                }

                // Explicit request frame on track if supported
                const track = compositeStream.getVideoTracks()[0] as any;
                if (track && typeof track.requestFrame === 'function') {
                    track.requestFrame();
                }

                options.onProgress?.((i + 1) / totalFrames, t);
            }

            // Finish recording when all frames rendered
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }

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
