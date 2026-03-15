import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { pushGhostPoint } from './GhostTrailCanvas';

/**
 * RecordMode — invisible overlay that captures mouse events on the Viewport.
 * When isRecording is true, it listens for mousemove and click, normalises coordinates,
 * pushes to Zustand (for later Theatre keyframe generation), and feeds the ghost trail.
 */
export default function RecordMode() {
    const isRecording = useStore((s) => s.isRecording);
    const scrollProgress = useStore((s) => s.scrollProgress);
    const pushRecordedEvent = useStore((s) => s.pushRecordedEvent);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Throttle: only capture every ~16ms (60fps)
    const lastCaptureRef = useRef<number>(0);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isRecording) return;

        const now = performance.now();
        if (now - lastCaptureRef.current < 16) return; // 60fps throttle
        lastCaptureRef.current = now;

        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        pushRecordedEvent({
            time: scrollProgress,
            x: Math.max(0, Math.min(1, x)),
            y: Math.max(0, Math.min(1, y)),
            click: false,
        });

        // Feed raw pixel coords to ghost trail (bypasses React)
        pushGhostPoint(e.clientX - rect.left, e.clientY - rect.top, false);
    }, [isRecording, scrollProgress, pushRecordedEvent]);

    const handleClick = useCallback((e: MouseEvent) => {
        if (!isRecording) return;

        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        pushRecordedEvent({
            time: scrollProgress,
            x: Math.max(0, Math.min(1, x)),
            y: Math.max(0, Math.min(1, y)),
            click: true,
        });

        pushGhostPoint(e.clientX - rect.left, e.clientY - rect.top, true);
    }, [isRecording, scrollProgress, pushRecordedEvent]);

    useEffect(() => {
        const el = overlayRef.current;
        if (!el) return;
        el.addEventListener('mousemove', handleMouseMove);
        el.addEventListener('click', handleClick);
        return () => {
            el.removeEventListener('mousemove', handleMouseMove);
            el.removeEventListener('click', handleClick);
        };
    }, [handleMouseMove, handleClick]);

    if (!isRecording) return null;

    return (
        <div
            ref={overlayRef}
            className="absolute inset-0 z-50 cursor-crosshair"
            style={{ background: 'rgba(220, 38, 38, 0.03)' }}
        >
            {/* Recording indicator — large and prominent */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-900/90 px-4 py-2 rounded-lg border border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.4)] backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                <span className="text-sm font-bold font-mono text-red-300 uppercase tracking-wider">RECORDING</span>
            </div>
            {/* Bottom recording border glow */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse"></div>
        </div>
    );
}
