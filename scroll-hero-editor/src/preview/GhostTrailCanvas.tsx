import { useRef, useEffect } from 'react';

/**
 * GhostTrailCanvas — 60fps canvas-based mouse trail overlay.
 * Uses useRef + raw Canvas 2D to bypass React's rendering pipeline entirely.
 * This is crucial for performance as discussed in the architecture plan.
 */
export default function GhostTrailCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const trailRef = useRef<{ x: number; y: number; age: number; click: boolean }[]>([]);
    const TRAIL_MAX_AGE = 60; // frames before a point fades out

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const trail = trailRef.current;

            // Age out old points
            for (let i = trail.length - 1; i >= 0; i--) {
                trail[i].age++;
                if (trail[i].age > TRAIL_MAX_AGE) {
                    trail.splice(i, 1);
                }
            }

            // Draw trail
            if (trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(trail[0].x, trail[0].y);
                for (let i = 1; i < trail.length; i++) {
                    const alpha = 1 - trail[i].age / TRAIL_MAX_AGE;
                    ctx.strokeStyle = `rgba(45, 212, 191, ${alpha * 0.8})`; // teal ghost
                    ctx.lineWidth = 2;
                    ctx.lineTo(trail[i].x, trail[i].y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(trail[i].x, trail[i].y);
                }
            }

            // Draw click bursts
            for (const pt of trail) {
                if (pt.click) {
                    const alpha = 1 - pt.age / TRAIL_MAX_AGE;
                    const radius = 8 + pt.age * 0.5;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.6})`; // purple ring
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            animFrameRef.current = requestAnimationFrame(draw);
        };

        animFrameRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', resize);
        };
    }, []);

    // Expose a method to push trail points from the parent
    // We do this via a data attribute + custom event to stay fully ref-based
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { x: number; y: number; click: boolean };
            trailRef.current.push({ x: detail.x, y: detail.y, age: 0, click: detail.click });
        };
        canvas.addEventListener('ghost-point', handler);
        return () => canvas.removeEventListener('ghost-point', handler);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            id="ghost-trail-canvas"
            className="absolute inset-0 w-full h-full pointer-events-none z-40"
        />
    );
}

/** Helper to push a point to the ghost trail canvas from anywhere */
export function pushGhostPoint(x: number, y: number, click: boolean) {
    const canvas = document.getElementById('ghost-trail-canvas');
    if (canvas) {
        canvas.dispatchEvent(new CustomEvent('ghost-point', { detail: { x, y, click } }));
    }
}
