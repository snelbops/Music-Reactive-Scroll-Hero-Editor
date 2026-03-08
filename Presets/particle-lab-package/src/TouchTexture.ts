import * as THREE from 'three';

interface TouchPoint {
    x: number;
    y: number;
    age: number;
    force: number;
}

const easeOutSine = (t: number): number => Math.sin((t * Math.PI) / 2);

/**
 * 64×64 canvas texture that paints radial gradients at mouse positions.
 * Updated each frame; fed to the particle shader as `uTouch`.
 */
export class TouchTexture {
    private size = 64;
    private maxAge = 80;
    private radius = 0.15;
    private trail: TouchPoint[] = [];

    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public texture: THREE.Texture;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvas.height = this.size;
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.size, this.size);
        this.texture = new THREE.CanvasTexture(this.canvas);
    }

    /**
     * Add a touch/hover point (UV coordinates in [0,1] range).
     */
    addTouch(point: { x: number; y: number }): void {
        let force = 0;
        const last = this.trail[this.trail.length - 1];
        if (last) {
            const dx = last.x - point.x;
            const dy = last.y - point.y;
            force = Math.min((dx * dx + dy * dy) * 10000, 1);
        }
        this.trail.push({ x: point.x, y: point.y, age: 0, force });
    }

    private clear(): void {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.size, this.size);
    }

    private drawPoint(point: TouchPoint): void {
        const pos = { x: point.x * this.size, y: (1 - point.y) * this.size };

        let intensity = 1;
        const fadeIn = this.maxAge * 0.3;
        if (point.age < fadeIn) {
            intensity = easeOutSine(point.age / fadeIn);
        } else {
            intensity = easeOutSine(1 - (point.age - fadeIn) / (this.maxAge - fadeIn));
        }
        intensity *= point.force;

        const radius = this.size * this.radius * intensity;
        const grd = this.ctx.createRadialGradient(
            pos.x, pos.y, radius * 0.25,
            pos.x, pos.y, radius
        );
        grd.addColorStop(0, 'rgba(255,255,255,0.2)');
        grd.addColorStop(1, 'rgba(0,0,0,0.0)');

        this.ctx.beginPath();
        this.ctx.fillStyle = grd;
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    update(): void {
        this.clear();
        // Age and prune
        this.trail = this.trail
            .map((p) => ({ ...p, age: p.age + 1 }))
            .filter((p) => p.age <= this.maxAge);
        this.trail.forEach((p) => this.drawPoint(p));
        this.texture.needsUpdate = true;
    }

    dispose(): void {
        this.texture.dispose();
    }
}
