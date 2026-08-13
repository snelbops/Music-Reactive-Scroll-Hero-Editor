/**
 * The render backend seam.
 *
 * Rendering an MP4 needs something outside the page: today that is Remotion running in the
 * Vite dev server, reached over HTTP. It is worth naming that boundary rather than leaving a
 * `fetch` in the middle of a modal, for two reasons.
 *
 * The first is honesty about what ships. The dev-server route is registered in
 * `configureServer`, so it exists only while `npm run dev` is running — a production build
 * has no such endpoint, and the export button used to fail there with a bare 404. This
 * module says so out loud instead.
 *
 * The second is that a desktop build replaces exactly this: a Tauri app would render through
 * a bundled ffmpeg rather than an HTTP call, and swapping one implementation of `Exporter`
 * for another is a smaller change than unpicking it from the UI later. See
 * `docs/desktop-app-plan.md`.
 */

export interface RenderRequest {
    fps: number;
    width: number;
    height: number;
    startFrame: number;
    durationInFrames: number;
    /** The active clip, as a data URL. Written to disk by the backend for headless Chrome. */
    videoBase64: string | null;
    audioBase64: string | null;
    /** Everything the composition needs; it renders with no access to the editor's store. */
    inputProps: Record<string, unknown>;
}

export interface Exporter {
    /** Human-readable name of the backend, for status messages. */
    readonly name: string;
    /** Whether a render can be attempted at all right now. */
    isAvailable(): Promise<boolean>;
    /** Renders and resolves with the finished file. */
    render(request: RenderRequest): Promise<Blob>;
}

const ENDPOINT = '/api/export-remotion';

const devServerExporter: Exporter = {
    name: 'Remotion (dev server)',

    async isAvailable() {
        try {
            // The endpoint answers a GET with JSON purely so this question can be asked.
            // Guessing from a POST route is not possible: Vite serves index.html for
            // anything it does not match, so a missing renderer answers just like a
            // present one. And the real request carries the whole clip as base64 — far
            // too much to send only to discover there is nothing at the other end.
            const res = await fetch(ENDPOINT, { method: 'GET' });
            if (!res.ok) return false;
            const data = await res.json().catch(() => null);
            return data?.available === true;
        } catch {
            return false;
        }
    },

    async render(request) {
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({} as { error?: string }));
            throw new Error(data.error || `Render failed (HTTP ${res.status})`);
        }
        return res.blob();
    },
};

/**
 * The backend for this build. A desktop build would return a Tauri-backed one here; the
 * decision belongs in this module rather than at the call site.
 */
export function getExporter(): Exporter {
    return devServerExporter;
}

/** Why rendering is unavailable, phrased for the export panel. */
export const UNAVAILABLE_MESSAGE =
    'Video rendering needs the dev server — it runs Remotion outside the page, and a built '
    + 'copy of the app has no renderer. Run `npm run dev` and export from there.';
