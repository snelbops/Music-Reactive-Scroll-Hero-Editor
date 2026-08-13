import * as THREE from 'three';

/**
 * Bounded, lazy texture cache for a proxy frame sequence.
 *
 * The previous version uploaded every frame to the GPU before showing anything. At
 * 1080p that is roughly 8 MB of texture per frame, so a few hundred frames exhausted
 * video memory and the preview crawled or died. A proxy that covers a whole clip only
 * makes that worse, so frames are now decoded on demand around the playhead and the
 * cache is capped.
 */

const PREFETCH_BACK = 6;
const PREFETCH_FORWARD = 24;
const MAX_CONCURRENT_DECODES = 4;
const DEFAULT_CAPACITY = 96;

async function blobToTexture(blob: Blob): Promise<THREE.Texture> {
    let texture: THREE.Texture;

    if (typeof createImageBitmap === 'function') {
        // ImageBitmap has no flipY of its own, so it is baked in at decode time and the
        // texture's own flip is turned off — the WebGL unpack flip does not apply here.
        const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY' });
        texture = new THREE.Texture(bitmap);
        texture.flipY = false;
    } else {
        const url = URL.createObjectURL(blob);
        try {
            texture = await new THREE.TextureLoader().loadAsync(url);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    // Proxy frames are shown at roughly their own size and swapped constantly; mipmaps
    // would cost a chain per frame for nothing.
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
}

function disposeTexture(texture: THREE.Texture): void {
    const image = texture.image as ImageBitmap | undefined;
    if (image && typeof (image as ImageBitmap).close === 'function') image.close();
    texture.dispose();
}

export class FrameCache {
    private readonly blobs: Blob[];
    private readonly capacity: number;
    private readonly textures = new Map<number, THREE.Texture>();
    private readonly pending = new Set<number>();
    private queue: number[] = [];
    private current = -1;
    private disposed = false;

    constructor(blobs: Blob[], capacity: number = DEFAULT_CAPACITY) {
        this.blobs = blobs;
        this.capacity = Math.max(2, capacity);
    }

    get length(): number { return this.blobs.length; }
    /** Frames currently held on the GPU. */
    get size(): number { return this.textures.size; }

    /** Decode `index` and the window around it. Cheap to call every animation frame. */
    request(index: number): void {
        if (this.disposed || !this.blobs.length) return;
        if (index === this.current && this.queue.length === 0 && this.pending.size === 0) return;
        this.current = index;

        this.queue = [];
        const last = this.blobs.length - 1;
        // Ahead of the playhead first — scrubbing usually keeps going the way it started.
        for (let i = index; i <= Math.min(last, index + PREFETCH_FORWARD); i++) this.enqueue(i);
        for (let i = index - 1; i >= Math.max(0, index - PREFETCH_BACK); i--) this.enqueue(i);
        this.pump();
    }

    /** The requested frame if it is decoded, otherwise the closest one that is. */
    nearest(index: number): THREE.Texture | null {
        const exact = this.textures.get(index);
        if (exact) return exact;

        let best: THREE.Texture | null = null;
        let bestDistance = Infinity;
        for (const [i, texture] of this.textures) {
            const distance = Math.abs(i - index);
            if (distance < bestDistance) { bestDistance = distance; best = texture; }
        }
        return best;
    }

    dispose(): void {
        this.disposed = true;
        this.queue = [];
        this.pending.clear();
        for (const texture of this.textures.values()) disposeTexture(texture);
        this.textures.clear();
    }

    private enqueue(index: number): void {
        if (!this.textures.has(index) && !this.pending.has(index)) this.queue.push(index);
    }

    private pump(): void {
        while (!this.disposed && this.pending.size < MAX_CONCURRENT_DECODES && this.queue.length) {
            const index = this.queue.shift()!;
            if (this.textures.has(index) || this.pending.has(index)) continue;
            this.pending.add(index);
            void this.decode(index);
        }
    }

    private async decode(index: number): Promise<void> {
        try {
            const texture = await blobToTexture(this.blobs[index]);
            if (this.disposed) { disposeTexture(texture); return; }
            this.textures.set(index, texture);
            this.evict();
        } catch {
            // A frame that will not decode is left out; the nearest one stands in for it.
        } finally {
            this.pending.delete(index);
            this.pump();
        }
    }

    /** Drops whatever is furthest from the playhead, which is what a scrub reaches last. */
    private evict(): void {
        if (this.textures.size <= this.capacity) return;
        const byDistance = [...this.textures.keys()]
            .filter((i) => i !== this.current)
            .sort((a, b) => Math.abs(b - this.current) - Math.abs(a - this.current));

        while (this.textures.size > this.capacity && byDistance.length) {
            const index = byDistance.shift()!;
            const texture = this.textures.get(index);
            if (!texture) continue;
            this.textures.delete(index);
            disposeTexture(texture);
        }
    }
}
