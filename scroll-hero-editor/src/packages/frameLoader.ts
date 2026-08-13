import * as THREE from 'three';
import { WindowedFrameCache, DEFAULT_CAPACITY } from './frameCache';

/**
 * Proxy frames as GPU textures, for the R3F frame-sequence scene.
 *
 * The windowing and eviction live in WindowedFrameCache, which the video pads' 2D canvas
 * shares — only the decode target differs.
 */

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
    if (image && typeof image.close === 'function') image.close();
    texture.dispose();
}

export class FrameCache extends WindowedFrameCache<THREE.Texture> {
    constructor(blobs: Blob[], capacity: number = DEFAULT_CAPACITY) {
        super(blobs, blobToTexture, disposeTexture, capacity);
    }
}
