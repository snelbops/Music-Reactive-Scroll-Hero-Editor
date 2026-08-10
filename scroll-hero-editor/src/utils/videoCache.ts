/**
 * In-memory video blob cache.
 * Unlike IndexedDB (stale across sessions) or blob: URLs (revoked by Chrome),
 * this cache holds the raw Blob in memory for the lifetime of the current tab.
 * It's always updated when any video is uploaded or switched, so export
 * always gets exactly the video that's currently active in the editor.
 */

let activeVideoBlob: Blob | null = null;
let activeVideoName: string = '';

/** Call this whenever ANY video is loaded into the editor (pad upload, single upload, project load) */
export function cacheActiveVideo(blob: Blob, name?: string) {
    activeVideoBlob = blob;
    activeVideoName = name || 'video';
}

/** Returns the live in-memory blob for the currently active video, or null if none */
export function getCachedActiveVideo(): Blob | null {
    return activeVideoBlob;
}

export function getCachedActiveVideoName(): string {
    return activeVideoName;
}
