// IndexedDB storage for Audio, Video, and Image files so they persist across refreshes & sessions

const DB_NAME = 'ScrollHeroMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not supported'));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Store a File or Blob under `key` without minting an Object URL.
 *
 * Callers that only want the bytes cached should use this. `saveMediaFile` always creates a
 * URL, and callers that discarded it leaked the whole video every time — switching pads did
 * exactly that, since it re-caches the active clip on each press.
 */
export async function putMediaFile(key: string, file: Blob | File): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(file, key);
        await new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = rej;
        });
    } catch (e) {
        console.warn('Could not save media file to IndexedDB:', e);
    }
}

/**
 * Store any structured-cloneable value — used for a pad's proxy, which is an array of JPEG
 * blobs rather than a single file. IndexedDB clones arrays of Blobs directly, so a whole
 * proxy is one entry rather than several hundred.
 */
export async function putMediaValue(key: string, value: unknown): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        await new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = rej;
        });
    } catch (e) {
        console.warn('Could not save value to IndexedDB:', e);
    }
}

/** Read back a value stored by putMediaValue. */
export async function getMediaValue<T>(key: string): Promise<T | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        const value = await new Promise<T | undefined>((res, rej) => {
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
        return value ?? null;
    } catch (e) {
        console.warn('Could not read value from IndexedDB:', e);
        return null;
    }
}

/** Release an Object URL previously minted here. Safe to call with anything. */
export function revokeMediaUrl(url: string | undefined | null): void {
    if (url && url.startsWith('blob:')) {
        try { URL.revokeObjectURL(url); } catch { /* already gone */ }
    }
}

/** Store a File or Blob in IndexedDB under key, and return a working Object URL */
export async function saveMediaFile(key: string, file: Blob | File): Promise<string> {
    await putMediaFile(key, file);
    return URL.createObjectURL(file);
}

/** Load a stored File or Blob from IndexedDB key and return a valid Object URL, or null */
export async function loadMediaFile(key: string): Promise<string | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        const file = await new Promise<Blob | undefined>((res, rej) => {
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
        if (file) {
            return URL.createObjectURL(file);
        }
    } catch (e) {
        console.warn('Could not load media file from IndexedDB:', e);
    }
    return null;
}

/** Mint a key that belongs to a clip for its lifetime, so reordering pads cannot desync it. */
export function newPadMediaKey(): string {
    const rand = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `pad-media-${rand}`;
}

/** Read the stored Blob itself. Avoids the base64 round-trip when the caller wants bytes. */
export async function getMediaBlob(key: string): Promise<Blob | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        const file = await new Promise<Blob | undefined>((res, rej) => {
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
        return file ?? null;
    } catch (e) {
        console.warn('Could not read media blob from IndexedDB:', e);
        return null;
    }
}

/** Load stored File or Blob from IndexedDB and convert to Data URL */
export async function getMediaDataUrl(key: string): Promise<string | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        const file = await new Promise<Blob | undefined>((res, rej) => {
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
        if (file) {
            return await blobToDataUrl(file);
        }
    } catch (e) {}
    return null;
}

/** Clear stored media file from IndexedDB */
export async function deleteMediaFile(key: string): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
    } catch (e) {}
}

/** Convert a File or Blob to a Data URL (base64) for portable .shero project files */
export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/** Convert a Data URL back to a Blob */
export function dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}
