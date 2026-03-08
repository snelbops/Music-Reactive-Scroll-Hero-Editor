import React, { useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { GithubTestParticleField } from './GithubTest/GithubTestParticleField';
import { Upload, Moon, Sun, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface UploadedImage {
    id: string;
    url: string;
    name: string;
}

type Preset = 'classic' | 'orbit';

interface OrbitControls {
    rotationSpeed: number;
    depth: number;
    size: number;
    touchRadius: number;
}

interface ClassicControls {
    random: number;
    depth: number;
    size: number;
    touchRadius: number;
}

const SIDEBAR_W = 280;
const PANEL_W = 260;

// ── Slider component ────────────────────────────────────────────────────────
const Slider = ({
    label, value, min, max, step = 0.01,
    onChange, theme
}: {
    label: string; value: number; min: number; max: number; step?: number;
    onChange: (v: number) => void; theme: 'dark' | 'light';
}) => (
    <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px', opacity: 0.7 }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value.toFixed(2)}</span>
        </div>
        <input
            type="range"
            min={min} max={max} step={step} value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{
                width: '100%',
                accentColor: theme === 'dark' ? '#fff' : '#000',
                cursor: 'pointer',
            }}
        />
    </div>
);

// ── Main View ────────────────────────────────────────────────────────────────
export const GithubTestView: React.FC = () => {
    const [images, setImages] = useState<UploadedImage[]>([
        { id: 'sample-1', url: '/github-test-app/images/sample-01.png', name: 'Sample 01' },
        { id: 'sample-2', url: '/github-test-app/images/sample-02.png', name: 'Sample 02' },
        { id: 'sample-3', url: '/github-test-app/images/sample-03.png', name: 'Sample 03' },
        { id: 'sample-4', url: '/github-test-app/images/sample-04.png', name: 'Sample 04' },
        { id: 'sample-5', url: '/github-test-app/images/sample-05.png', name: 'Sample 05' },
    ]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [preset, setPreset] = useState<Preset>('orbit');

    const [orbitControls, setOrbitControls] = useState<OrbitControls>({
        rotationSpeed: 0.1,
        depth: 2.0,
        size: 1.4,
        touchRadius: 0.15,
    });
    const [classicControls, setClassicControls] = useState<ClassicControls>({
        random: 2.0,
        depth: 4.0,
        size: 1.5,
        touchRadius: 0.15,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const url = ev.target?.result as string;
                setImages(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), url, name: file.name }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const moveImage = (index: number, dir: 'up' | 'down') => {
        const ni = dir === 'up' ? index - 1 : index + 1;
        if (ni < 0 || ni >= images.length) return;
        const next = [...images];
        [next[index], next[ni]] = [next[ni], next[index]];
        if (activeIndex === index) setActiveIndex(ni);
        else if (activeIndex === ni) setActiveIndex(index);
        setImages(next);
    };

    const removeImage = (id: string) => {
        const idx = images.findIndex(i => i.id === id);
        const next = images.filter(i => i.id !== id);
        setImages(next);
        if (activeIndex === idx) setActiveIndex(Math.max(0, idx - 1));
        else if (activeIndex > idx) setActiveIndex(activeIndex - 1);
    };

    // Send control updates to the classic iframe via postMessage
    const updateClassic = useCallback((updated: ClassicControls) => {
        setClassicControls(updated);
        iframeRef.current?.contentWindow?.postMessage({ type: 'CONTROLS_UPDATE', payload: updated }, '*');
    }, []);

    const bg = theme === 'dark' ? '#0a0a0a' : '#ffffff';
    const fg = theme === 'dark' ? '#ffffff' : '#000000';
    const border = theme === 'dark' ? '#2a2a2a' : '#ebebeb';
    const panelBg = theme === 'dark' ? 'rgba(18,18,18,0.92)' : 'rgba(248,248,248,0.92)';
    const activeImg = images[activeIndex];

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', background: bg, color: fg, fontFamily: 'Inter, system-ui, sans-serif', transition: 'background 0.3s, color 0.3s', overflow: 'hidden' }}>

            {/* ── Left Sidebar ──────────────────────────────────────────────── */}
            <div style={{ width: SIDEBAR_W, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${border}`, background: panelBg, backdropFilter: 'blur(12px)', zIndex: 10 }}>

                {/* Header */}
                <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>Particle Lab</span>
                        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ background: 'none', border: 'none', color: fg, cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>

                    {/* Preset tabs */}
                    <div style={{ display: 'flex', gap: '6px', background: theme === 'dark' ? '#1a1a1a' : '#f0f0f0', borderRadius: '8px', padding: '4px' }}>
                        {(['orbit', 'classic'] as Preset[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPreset(p)}
                                style={{
                                    flex: 1, padding: '7px 0', borderRadius: '6px', border: 'none',
                                    background: preset === p ? (theme === 'dark' ? '#fff' : '#000') : 'transparent',
                                    color: preset === p ? (theme === 'dark' ? '#000' : '#fff') : fg,
                                    fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                                    textTransform: 'capitalize', transition: 'all 0.2s',
                                }}
                            >
                                {p === 'orbit' ? '🌀 Orbit' : '✨ Classic'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Upload */}
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: theme === 'dark' ? '#222' : '#f4f4f4', color: fg, border: `1px solid ${border}`, fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                        <Upload size={15} /> Upload Image
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*" style={{ display: 'none' }} />
                </div>

                {/* Image list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.4, marginBottom: '10px', paddingLeft: '6px', letterSpacing: '0.08em' }}>
                        Images ({images.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {images.map((img, index) => (
                            <div
                                key={img.id}
                                onClick={() => setActiveIndex(index)}
                                style={{
                                    padding: '10px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s',
                                    background: activeIndex === index ? (theme === 'dark' ? '#2a2a2a' : '#ebebeb') : 'transparent',
                                    border: `1px solid ${activeIndex === index ? (theme === 'dark' ? '#444' : '#ccc') : 'transparent'}`,
                                }}
                            >
                                <div style={{ width: '36px', height: '36px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#111', border: `1px solid ${border}` }}>
                                    <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden', fontSize: '0.8rem', fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</div>
                                <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
                                    <button onClick={() => moveImage(index, 'up')} disabled={index === 0} style={{ background: 'none', border: 'none', color: fg, cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.2 : 0.5, padding: '3px' }}><ArrowUp size={13} /></button>
                                    <button onClick={() => moveImage(index, 'down')} disabled={index === images.length - 1} style={{ background: 'none', border: 'none', color: fg, cursor: index === images.length - 1 ? 'default' : 'pointer', opacity: index === images.length - 1 ? 0.2 : 0.5, padding: '3px' }}><ArrowDown size={13} /></button>
                                    <button onClick={() => removeImage(img.id)} style={{ background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer', opacity: 0.7, padding: '3px' }}><Trash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Canvas Area ───────────────────────────────────────────────── */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {preset === 'orbit' && activeImg && (
                    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} style={{ background: 'transparent' }}>
                        <GithubTestParticleField
                            imageUrl={activeImg.url}
                            theme={theme}
                            rotationSpeed={orbitControls.rotationSpeed}
                            depth={orbitControls.depth}
                            size={orbitControls.size}
                            touchRadius={orbitControls.touchRadius}
                        />
                    </Canvas>
                )}

                {preset === 'classic' && (
                    <iframe
                        ref={iframeRef}
                        src="/github-test-app/index.html"
                        style={{ width: '100%', height: '100%', border: 'none', filter: theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none', transition: 'filter 0.3s' }}
                        title="Classic Interactive Particles"
                    />
                )}

                {/* Hint */}
                <div style={{ position: 'absolute', bottom: '20px', right: PANEL_W + 20, fontSize: '0.7rem', opacity: 0.4, pointerEvents: 'none', textAlign: 'right', lineHeight: 1.6 }}>
                    {preset === 'classic' ? 'CLICK CANVAS TO CYCLE IMAGES · G TO TOGGLE PANEL' : 'MOVE MOUSE TO INTERACT'}
                </div>
            </div>

            {/* ── Right Control Panel ──────────────────────────────────────── */}
            <div style={{ width: PANEL_W, flexShrink: 0, borderLeft: `1px solid ${border}`, background: panelBg, backdropFilter: 'blur(12px)', padding: '20px', overflowY: 'auto', zIndex: 10 }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.4, marginBottom: '20px', letterSpacing: '0.08em' }}>Control Panel</div>

                {preset === 'orbit' && (
                    <>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.5, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Animation</div>
                        <Slider label="Rotation Speed" value={orbitControls.rotationSpeed} min={0} max={0.5} onChange={v => setOrbitControls(c => ({ ...c, rotationSpeed: v }))} theme={theme} />
                        <Slider label="Depth" value={orbitControls.depth} min={0.5} max={10} onChange={v => setOrbitControls(c => ({ ...c, depth: v }))} theme={theme} />

                        <div style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.5, marginBottom: '14px', marginTop: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Particles</div>
                        <Slider label="Size" value={orbitControls.size} min={0.1} max={3} onChange={v => setOrbitControls(c => ({ ...c, size: v }))} theme={theme} />
                        <Slider label="Touch Radius" value={orbitControls.touchRadius} min={0} max={0.5} onChange={v => setOrbitControls(c => ({ ...c, touchRadius: v }))} theme={theme} />
                    </>
                )}

                {preset === 'classic' && (
                    <>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.5, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Particles</div>
                        <Slider label="Random Scatter" value={classicControls.random} min={1} max={10} onChange={v => updateClassic({ ...classicControls, random: v })} theme={theme} />
                        <Slider label="Depth" value={classicControls.depth} min={1} max={10} onChange={v => updateClassic({ ...classicControls, depth: v })} theme={theme} />
                        <Slider label="Size" value={classicControls.size} min={0} max={3} onChange={v => updateClassic({ ...classicControls, size: v })} theme={theme} />

                        <div style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.5, marginBottom: '14px', marginTop: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Touch</div>
                        <Slider label="Touch Radius" value={classicControls.touchRadius} min={0} max={0.5} onChange={v => updateClassic({ ...classicControls, touchRadius: v })} theme={theme} />

                        <div style={{ marginTop: '24px', padding: '12px', borderRadius: '8px', background: theme === 'dark' ? '#1a1a1a' : '#f0f0f0', fontSize: '0.75rem', opacity: 0.6, lineHeight: 1.6 }}>
                            💡 The classic demo's built-in panel (press G) is still available inside the canvas.
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
