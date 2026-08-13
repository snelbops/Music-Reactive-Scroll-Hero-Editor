/**
 * Bounded, lazy cache over a proxy frame sequence.
 *
 * Decoding every frame up front is what made the proxy path unusable: memory grew with the
 * clip's length, so a proxy long enough to be useful was a proxy too big to hold. Frames are
 * decoded on demand in a window around the playhead instead, and the cache is capped.
 *
 * The decode target is injected, because there are two consumers with different needs — a
 * GPU texture for the R3F scene, an ImageBitmap for the 2D canvas the video pads draw to —
 * and the windowing and eviction are the same for both.
 */

const PREFETCH_BACK = 6;
const PREFETCH_FORWARD = 24;
const MAX_CONCURRENT_DECODES = 4;
export const DEFAULT_CAPACITY = 96;

export class WindowedFrameCache<T> {
    private readonly blobs: Blob[];
    private readonly decode: (blob: Blob) => Promise<T>;
    private readonly release: (value: T) => void;
    private readonly capacity: number;
    private readonly entries = new Map<number, T>();
    private readonly pending = new Set<number>();
    private queue: number[] = [];
    private current = -1;
    private disposed = false;

    constructor(
        blobs: Blob[],
        decode: (blob: Blob) => Promise<T>,
        release: (value: T) => void,
        capacity: number = DEFAULT_CAPACITY,
    ) {
        this.blobs = blobs;
        this.decode = decode;
        this.release = release;
        this.capacity = Math.max(2, capacity);
    }

    get length(): number { return this.blobs.length; }
    /** How many frames are decoded right now. */
    get size(): number { return this.entries.size; }

    /** Decode `index` and the window around it. Cheap to call every animation frame. */
    request(index: number): void {
        if (this.disposed || !this.blobs.length) return;
        if (index === this.current && this.queue.length === 0 && this.pending.size === 0) return;
        this.current = index;

        this.queue = [];
        const last = this.blobs.length - 1;
        // Ahead of the playhead first — a scrub usually keeps going the way it started.
        for (let i = index; i <= Math.min(last, index + PREFETCH_FORWARD); i++) this.enqueue(i);
        for (let i = index - 1; i >= Math.max(0, index - PREFETCH_BACK); i--) this.enqueue(i);
        this.pump();
    }

    /** The requested frame if it is decoded, otherwise the closest one that is. */
    nearest(index: number): T | null {
        const exact = this.entries.get(index);
        if (exact !== undefined) return exact;

        let best: T | null = null;
        let bestDistance = Infinity;
        for (const [i, value] of this.entries) {
            const distance = Math.abs(i - index);
            if (distance < bestDistance) { bestDistance = distance; best = value; }
        }
        return best;
    }

    dispose(): void {
        this.disposed = true;
        this.queue = [];
        this.pending.clear();
        for (const value of this.entries.values()) this.release(value);
        this.entries.clear();
    }

    private enqueue(index: number): void {
        if (!this.entries.has(index) && !this.pending.has(index)) this.queue.push(index);
    }

    private pump(): void {
        while (!this.disposed && this.pending.size < MAX_CONCURRENT_DECODES && this.queue.length) {
            const index = this.queue.shift()!;
            if (this.entries.has(index) || this.pending.has(index)) continue;
            this.pending.add(index);
            void this.load(index);
        }
    }

    private async load(index: number): Promise<void> {
        try {
            const value = await this.decode(this.blobs[index]);
            if (this.disposed) { this.release(value); return; }
            this.entries.set(index, value);
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
        if (this.entries.size <= this.capacity) return;
        const byDistance = [...this.entries.keys()]
            .filter(i => i !== this.current)
            .sort((a, b) => Math.abs(b - this.current) - Math.abs(a - this.current));

        while (this.entries.size > this.capacity && byDistance.length) {
            const index = byDistance.shift()!;
            const value = this.entries.get(index);
            if (value === undefined) continue;
            this.entries.delete(index);
            this.release(value);
        }
    }
}

/** Frames as ImageBitmaps, for drawing to a 2D canvas. */
export function createBitmapCache(blobs: Blob[], capacity = DEFAULT_CAPACITY) {
    return new WindowedFrameCache<ImageBitmap>(
        blobs,
        (blob) => createImageBitmap(blob),
        (bitmap) => bitmap.close(),
        capacity,
    );
}
