import { X } from 'lucide-react';

const shortcuts = [
    {
        section: 'Playback',
        items: [
            { keys: ['Space'], desc: 'Play / Pause' },
            { keys: ['Esc'], desc: 'Exit fullscreen' },
        ],
    },
    {
        section: 'Drawing & Editing',
        items: [
            { keys: ['Left-click + drag'], desc: 'Draw scroll curve (pen/select tool)' },
            { keys: ['Shift + drag'], desc: 'Create time selection region on any lane' },
            { keys: ['Right-click keyframe'], desc: 'Delete keyframe' },
            { keys: ['Ctrl+Z'], desc: 'Undo' },
            { keys: ['Ctrl+Shift+Z'], desc: 'Redo' },
            { keys: ['Ctrl+C'], desc: 'Copy selected keyframes' },
            { keys: ['Ctrl+V'], desc: 'Paste keyframes at playhead' },
        ],
    },
    {
        section: 'Selection Overlay — Cyan Box',
        items: [
            { keys: ['Shift + drag', 'on lane'], desc: 'Create a time selection' },
            { keys: ['Alt + drag UP/DOWN', 'on grip bar'], desc: 'Scale amplitude up/down (all lanes)' },
            { keys: ['Shift + drag UP/DOWN', 'on grip bar'], desc: 'Shift (translate) all values up/down' },
            { keys: ['-25% / +25%'], desc: 'Quick-scale amplitude in 25% steps' },
            { keys: ['X button'], desc: 'Clear selection' },
        ],
    },
    {
        section: 'Audio Context Menu — Right-click audio lane',
        items: [
            { keys: ['Right-click audio lane'], desc: 'Open automation push menu' },
            { keys: ['Peak Intensity slider'], desc: 'Set amplitude of generated curves (20–150%)' },
            { keys: ['Rhythm Presets'], desc: 'Generate beat-synced automation' },
            { keys: ['Insert Shape palette'], desc: 'Sine / Triangle / Saw / Square / Ease shapes' },
            { keys: ['1x / 2x / 4x / 8x / 16x'], desc: 'Repeat shape N times in selection' },
        ],
    },
    {
        section: 'Loop & Export',
        items: [
            { keys: ['L button'], desc: 'Toggle loop on/off' },
            { keys: ['Drag loop handles'], desc: 'Resize loop region' },
            { keys: ['Drag loop bar'], desc: 'Move loop region' },
            { keys: ['Export Loop (nav bar)'], desc: 'Export curves + optional audio for loop region' },
        ],
    },
    {
        section: 'Segment Dragging',
        items: [
            { keys: ['Drag line segment UP/DOWN'], desc: 'Move both keyframes of a segment vertically (ns-resize cursor)' },
        ],
    },
];

export default function HelpPanel({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-start justify-end"
            onClick={onClose}
        >
            <div
                className="relative h-full w-[420px] bg-[#1a1a1c] border-l border-[#3a3a3c] shadow-2xl overflow-y-auto thin-scrollbar font-sans text-[12px] text-editor-fg"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[#1a1a1c] border-b border-[#3a3a3c] px-5 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-bold text-white">Keyboard Shortcuts</h1>
                        <p className="text-[10px] text-gray-400 mt-0.5">Scroll Hero Editor — Quick Reference</p>
                    </div>
                    <button
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-5">
                    {shortcuts.map(section => (
                        <div key={section.section}>
                            <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
                                {section.section}
                            </h2>
                            <div className="rounded-lg border border-[#2c2c2e] overflow-hidden">
                                {section.items.map((item, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-start gap-3 px-3 py-2.5 ${i < section.items.length - 1 ? 'border-b border-[#2c2c2e]' : ''} hover:bg-white/[0.03] transition-colors`}
                                    >
                                        <div className="flex flex-wrap gap-1 shrink-0 w-[175px]">
                                            {item.keys.map((key, ki) => (
                                                <kbd
                                                    key={ki}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#2c2c2e] border border-[#4a4a4c] text-[10px] font-mono text-cyan-300 whitespace-nowrap leading-tight shadow-sm"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                        <span className="text-gray-300 text-[11px] leading-snug pt-0.5">{item.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Pro Tips */}
                    <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 text-[11px] text-cyan-200/80 space-y-1.5">
                        <p className="font-bold text-cyan-300">Pro Tips</p>
                        <p>Generate a rhythm curve first, then grab the <strong>grip bar at the bottom</strong> of the cyan selection box and drag with <strong>Alt held</strong> to scale amplitude interactively.</p>
                        <p>Set <strong>Peak Intensity</strong> before generating: 20% for subtle scroll, 150% for music-reactive drama.</p>
                        <p><strong>Export Loop</strong> in the nav bar packages a section with all automation curves into a self-contained JSON.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
