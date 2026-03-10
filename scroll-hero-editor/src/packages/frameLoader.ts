import * as THREE from 'three';

/**
 * frameLoader — loads PNG Blob[] as THREE.Texture[] for FrameSequenceScene.
 * Each blob URL is stored on the texture for later revocation.
 */
export const frameLoader = {
    loadTextures: async (blobs: Blob[]): Promise<THREE.Texture[]> => {
        const loader = new THREE.TextureLoader();
        return Promise.all(
            blobs.map(blob => {
                const url = URL.createObjectURL(blob);
                return loader.loadAsync(url).then(texture => {
                    (texture as THREE.Texture & { __blobUrl: string }).__blobUrl = url;
                    return texture;
                });
            })
        );
    },

    disposeTextures: (textures: THREE.Texture[]): void => {
        textures.forEach(t => {
            const url = (t as THREE.Texture & { __blobUrl?: string }).__blobUrl;
            if (url) URL.revokeObjectURL(url);
            t.dispose();
        });
    },
};
