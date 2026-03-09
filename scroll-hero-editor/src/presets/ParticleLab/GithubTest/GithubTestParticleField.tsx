import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TouchTexture } from '../TouchTexture';

const VERTEX_SHADER = /* glsl */`
precision highp float;

attribute vec3 aPosition;
attribute vec2 aUv;
attribute float pindex;
attribute vec2 offset;
attribute float angle;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uDepth;
uniform float uSize;
uniform float uAspect;
uniform sampler2D uTexture;
uniform sampler2D uTouch;
uniform float uAssemble;

varying vec2 vPUv;
varying vec2 vUv;

vec3 mod289_3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289_2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute3(vec3 x) { return mod289_3(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1  = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy  -= i1;
  i = mod289_2(i);
  vec3 p = permute3(permute3(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x_) - 0.5;
  vec3 ox = floor(x_ + 0.5);
  vec3 a0 = x_ - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float rnd(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  vUv = aUv;
  vPUv = vec2(offset.x, 1.0 - offset.y);

  vec4 col = texture2D(uTexture, vPUv);
  float grey = col.r * 0.21 + col.g * 0.71 + col.b * 0.07;

  vec3 displaced = vec3((offset.x - 0.5) * 2.0 * uAspect, -(offset.y - 0.5) * 2.0, 0.0);

  float ease = smoothstep(0.0, 1.0, uAssemble);
  float currentDepth = mix(40.0, uDepth, ease);
  float currentRandom = mix(5.0, 0.0, ease);
  float sizeIntroMult = mix(0.1, 1.0, ease);

  displaced.xy += vec2(rnd(pindex) - 0.5, rnd(offset.x + pindex) - 0.5) * currentRandom;
  float rndz = (rnd(pindex) + snoise(vec2(pindex * 0.1, uTime * 0.1)));
  displaced.z += rndz * rnd(pindex) * 2.0 * currentDepth;

  float t = texture2D(uTouch, vPUv).r;
  displaced.z += t * 20.0 * rndz * ease;
  displaced.x += cos(angle) * t * 20.0 * rndz * ease;
  displaced.y += sin(angle) * t * 20.0 * rndz * ease;

  float psize = (snoise(vec2(uTime * 0.5, pindex * 0.5)) + 2.0);
  psize *= max(grey, 0.2);
  psize *= uSize * sizeIntroMult;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  mvPosition.xyz += aPosition * psize * 0.015;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT_SHADER = /* glsl */`
precision highp float;

uniform sampler2D uTexture;
uniform float uInvert;

varying vec2 vPUv;
varying vec2 vUv;

void main() {
  vec4 col = texture2D(uTexture, vPUv);
  float grey = col.r * 0.21 + col.g * 0.71 + col.b * 0.07;
  
  vec3 finalColor;
  if (uInvert > 0.5) {
    // Light mode: dark particles on white
    finalColor = vec3(1.0 - grey) * 0.75;
  } else {
    // Dark mode: white/grey particles
    finalColor = vec3(grey);
  }

  float dist = distance(vUv, vec2(0.5));
  float alpha = smoothstep(0.5, 0.35, dist);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface ParticleBuffers {
    offsets: Float32Array;
    pindices: Float32Array;
    angles: Float32Array;
    count: number;
    texture: THREE.CanvasTexture;
    imageWidth: number;
    imageHeight: number;
}

const MAX_PARTICLES = 80000;

function buildBuffers(imageData: ImageData, canvas: HTMLCanvasElement): ParticleBuffers {
    const { width, height } = imageData;
    const offsets: number[] = [];
    const pindices: number[] = [];
    const angles: number[] = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            offsets.push(x / width, y / height);
            pindices.push(offsets.length / 2 - 1);
            angles.push(Math.random() * Math.PI * 2);
            if (offsets.length / 2 >= MAX_PARTICLES) break;
        }
        if (offsets.length / 2 >= MAX_PARTICLES) break;
    }

    const count = Math.min(offsets.length / 2, MAX_PARTICLES);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.flipY = true;

    return {
        offsets: new Float32Array(offsets.slice(0, count * 2)),
        pindices: new Float32Array(pindices.slice(0, count)),
        angles: new Float32Array(angles.slice(0, count)),
        count,
        texture,
        imageWidth: width,
        imageHeight: height,
    };
}

interface GithubTestParticleFieldProps {
    imageUrl: string;
    theme: 'light' | 'dark';
    rotationSpeed?: number;
    depth?: number;
    size?: number;
    touchRadius?: number;
    /** Optional external progress (0–1). When provided, drives uAssemble instead of the internal timer. */
    progress?: number;
}

export const GithubTestParticleField = ({ imageUrl, theme, rotationSpeed = 0.1, depth = 2.0, size = 1.4, touchRadius = 0.15, progress }: GithubTestParticleFieldProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.RawShaderMaterial>(null);
    const touchRef = useRef<TouchTexture | null>(null);
    const timeRef = useRef(0);
    const { camera } = useThree();
    const [aspect, setAspect] = useState(1.0);
    const isDark = theme === 'dark';

    // Set up camera
    useEffect(() => {
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);
    }, [camera]);

    // Create touch texture early so it's available when material mounts
    const touch = useMemo(() => new TouchTexture(), []);
    useEffect(() => {
        touchRef.current = touch;
        return () => {
            touch.dispose();
            touchRef.current = null;
        };
    }, [touch]);

    // When material mounts, assign the touch texture
    useEffect(() => {
        if (matRef.current && touch) {
            matRef.current.uniforms.uTouch.value = touch.texture;
        }
    });

    const buffersPromise = useMemo(() => {
        if (!imageUrl) return Promise.resolve(null);
        return new Promise<ParticleBuffers | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const maxDim = 250;
                const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
                const w = Math.floor(img.width * scale);
                const h = Math.floor(img.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);
                resolve(buildBuffers(imageData, canvas));
            };
            img.onerror = (e) => {
                console.error('[GithubTestParticleField] Failed to load image:', imageUrl, e);
                resolve(null);
            };
            img.src = imageUrl;
        });
    }, [imageUrl]);

    useEffect(() => {
        let cancelled = false;
        buffersPromise.then((bufs) => {
            if (cancelled || !bufs || !meshRef.current || !matRef.current) return;
            const { offsets, pindices, angles, count, imageWidth, imageHeight } = bufs;
            const geo = new THREE.InstancedBufferGeometry();
            geo.setAttribute('aPosition', new THREE.BufferAttribute(new Float32Array([-0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]), 3));
            geo.setAttribute('aUv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2));
            geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1));
            geo.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 2));
            geo.setAttribute('pindex', new THREE.InstancedBufferAttribute(pindices, 1));
            geo.setAttribute('angle', new THREE.InstancedBufferAttribute(angles, 1));
            geo.instanceCount = count;

            meshRef.current.geometry.dispose();
            meshRef.current.geometry = geo;

            const u = matRef.current.uniforms;
            if (u.uTexture.value && u.uTexture.value !== bufs.texture) {
                (u.uTexture.value as THREE.Texture).dispose();
            }
            u.uTexture.value = bufs.texture;
            u.uAspect.value = imageWidth / imageHeight;
            // Re-assign touch texture after geometry rebuild
            if (touchRef.current) u.uTouch.value = touchRef.current.texture;
            setAspect(imageWidth / imageHeight);
            timeRef.current = 0;
        });
        return () => { cancelled = true; };
    }, [buffersPromise]);

    // Update blending mode when theme changes
    useEffect(() => {
        if (matRef.current) {
            matRef.current.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
            matRef.current.needsUpdate = true;
        }
    }, [isDark]);

    // Keep touch radius in sync
    useEffect(() => {
        if (touchRef.current) {
            (touchRef.current as any).radius = touchRadius;
        }
    }, [touchRadius]);

    useFrame((_, delta) => {
        if (!matRef.current) return;
        const u = matRef.current.uniforms;
        timeRef.current += delta;
        u.uTime.value = timeRef.current;
        // When an external progress prop is provided (scrub/transport), use it directly.
        // Otherwise fall back to the internal time-based intro animation.
        u.uAssemble.value = progress !== undefined ? progress : Math.min(1.0, timeRef.current / 2.0);
        u.uInvert.value = isDark ? 0.0 : 1.0;
        u.uDepth.value = depth;
        u.uSize.value = size;
        touchRef.current?.update();

        if (meshRef.current) {
            meshRef.current.rotation.y = timeRef.current * rotationSpeed;
            meshRef.current.rotation.x = Math.sin(timeRef.current * 0.2) * 0.05;
        }
    });

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uDepth: { value: 2.0 },
        uSize: { value: 1.4 },
        uAspect: { value: 1.0 },
        uTexture: { value: new THREE.Texture() },
        uTouch: { value: new THREE.Texture() },
        uAssemble: { value: 0 },
        uInvert: { value: 0 },
    }), []);

    return (
        <group>
            <mesh ref={meshRef}>
                <bufferGeometry />
                <rawShaderMaterial
                    ref={matRef}
                    vertexShader={VERTEX_SHADER}
                    fragmentShader={FRAGMENT_SHADER}
                    uniforms={uniforms}
                    transparent
                    depthWrite={false}
                    blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
                />
            </mesh>
            {/* Invisible hit area for touch/mouse tracking */}
            <mesh
                visible={false}
                onPointerMove={(e) => {
                    if (e.uv && touchRef.current) {
                        touchRef.current.addTouch({ x: e.uv.x, y: e.uv.y });
                    }
                }}
            >
                <planeGeometry args={[2.0 * aspect, 2.0]} />
            </mesh>
        </group>
    );
};
