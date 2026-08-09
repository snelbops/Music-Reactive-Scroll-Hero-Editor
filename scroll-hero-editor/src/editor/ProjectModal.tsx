import { useState, useEffect } from 'react';
import { X, FolderOpen, Save, Download, Upload, Trash2, Plus, Sparkles, Check, Clock } from 'lucide-react';
import {
    getSavedProjectSlots,
    saveProjectSlot,
    deleteProjectSlot,
    applyProjectDataToStore,
    saveProjectToFile,
    loadProjectFromFile,
    STARTER_TEMPLATES,
    autoSaveWorkingProject,
    startNewProject,
    type ProjectData,
} from '../utils/project';

interface ProjectModalProps {
    onClose: () => void;
}

export default function ProjectModal({ onClose }: ProjectModalProps) {
    const [slots, setSlots] = useState<ProjectData[]>([]);
    const [projectNameInput, setProjectNameInput] = useState('');
    const [savedNotice, setSavedNotice] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'my-projects' | 'templates' | 'files'>('my-projects');

    useEffect(() => {
        setSlots(getSavedProjectSlots());
    }, []);

    const handleSaveSlot = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const name = projectNameInput.trim() || `Project ${new Date().toLocaleDateString()}`;
        saveProjectSlot(name);
        setSlots(getSavedProjectSlots());
        setProjectNameInput('');
        setSavedNotice(`Saved "${name}" to browser storage!`);
        setTimeout(() => setSavedNotice(null), 3000);
    };

    const handleLoadSlot = (data: ProjectData) => {
        applyProjectDataToStore(data);
        autoSaveWorkingProject();
        onClose();
    };

    const handleDeleteSlot = (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete project "${name}" from browser storage?`)) {
            deleteProjectSlot(id);
            setSlots(getSavedProjectSlots());
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await loadProjectFromFile(file);
                onClose();
            } catch (err) {
                alert('Could not load project file. Please ensure it is a valid .shero file.');
            }
        }
    };

    return (
        <div
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-xl bg-[#1a1a1c] border border-[#3a3a3c] rounded-xl shadow-2xl overflow-hidden font-sans text-editor-fg"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-[#242426] border-b border-[#3a3a3c] px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-cyan-400" />
                        <div>
                            <h2 className="text-base font-bold text-white leading-tight">Project Manager</h2>
                            <p className="text-[11px] text-gray-400">Save to browser storage, load templates, or export/import files</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (confirm('Start a new blank project? Any unsaved changes in current session will be cleared.')) {
                                    startNewProject();
                                    onClose();
                                }
                            }}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                            title="Start fresh blank project"
                        >
                            <Plus className="w-3.5 h-3.5 text-cyan-400" /> New Project
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#3a3a3c] bg-[#1a1a1c] px-5 gap-4">
                    <button
                        className={`py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'my-projects' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                        onClick={() => setActiveTab('my-projects')}
                    >
                        <Save className="w-3.5 h-3.5" />
                        My Projects ({slots.length})
                    </button>
                    <button
                        className={`py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'templates' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                        onClick={() => setActiveTab('templates')}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Starter Templates
                    </button>
                    <button
                        className={`py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'files' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                        onClick={() => setActiveTab('files')}
                    >
                        <Download className="w-3.5 h-3.5" />
                        File (.shero)
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-5 max-h-[420px] overflow-y-auto thin-scrollbar">
                    {/* TAB 1: My Saved Projects */}
                    {activeTab === 'my-projects' && (
                        <div className="space-y-4">
                            {/* Save Form */}
                            <form onSubmit={handleSaveSlot} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter project name..."
                                    value={projectNameInput}
                                    onChange={e => setProjectNameInput(e.target.value)}
                                    className="flex-1 bg-[#242426] border border-[#3a3a3c] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Save Project
                                </button>
                            </form>

                            {savedNotice && (
                                <div className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg animate-fade-in">
                                    <Check className="w-3.5 h-3.5" /> {savedNotice}
                                </div>
                            )}

                            {/* Saved List */}
                            {slots.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-xs border border-dashed border-[#3a3a3c] rounded-xl">
                                    No saved projects yet. Type a name above and click <strong>Save Project</strong>!
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    {slots.map(slot => (
                                        <div
                                            key={slot.id}
                                            onClick={() => handleLoadSlot(slot)}
                                            className="group flex items-center justify-between p-3 rounded-lg border border-[#2c2c2e] bg-[#222224] hover:bg-[#2c2c2e] hover:border-cyan-500/40 transition-all cursor-pointer"
                                        >
                                            <div>
                                                <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                                                    {slot.name}
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {new Date(slot.updatedAt).toLocaleDateString()} {new Date(slot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span>• {slot.sequenceDuration}s duration</span>
                                                    <span>• {slot.scrollKeyframes.length} keyframes</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="px-2.5 py-1 bg-white/10 hover:bg-cyan-500 hover:text-black text-white text-[11px] font-semibold rounded transition-colors"
                                                    onClick={() => handleLoadSlot(slot)}
                                                >
                                                    Load
                                                </button>
                                                <button
                                                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                    onClick={e => handleDeleteSlot(slot.id!, slot.name, e)}
                                                    title="Delete project"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: Starter Templates */}
                    {activeTab === 'templates' && (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-400 mb-3">Load a pre-choreographed template project to start editing immediately:</p>
                            <div className="grid gap-3">
                                {STARTER_TEMPLATES.map(tpl => (
                                    <div
                                        key={tpl.id}
                                        onClick={() => handleLoadSlot(tpl)}
                                        className="group p-3.5 rounded-lg border border-[#2c2c2e] bg-[#222224] hover:bg-[#2c2c2e] hover:border-cyan-500/40 transition-all cursor-pointer flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                                                {tpl.name}
                                            </div>
                                            <div className="text-[11px] text-gray-400 mt-0.5">
                                                {tpl.id === 'template-default-hero' && 'Smooth 10s scroll animation with particle depth & rotation speed'}
                                                {tpl.id === 'template-beat-bounce' && 'Beat-synced pulse & bounce animation for music videos'}
                                                {tpl.id === 'template-blank' && 'Empty canvas with standard 10s timeline'}
                                            </div>
                                        </div>
                                        <button className="px-3 py-1 bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500 group-hover:text-black font-semibold text-xs rounded transition-colors shrink-0">
                                            Load Template
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: File Import / Export */}
                    {activeTab === 'files' && (
                        <div className="space-y-4 text-xs text-gray-300">
                            <div className="p-4 rounded-xl border border-[#2c2c2e] bg-[#222224] space-y-2">
                                <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                                    <Download className="w-4 h-4 text-cyan-400" /> Export Project File (.shero)
                                </h3>
                                <p className="text-gray-400 text-[11px]">
                                    Download your current project as a self-contained <code>.shero</code> JSON file. Perfect for sharing or backing up outside your browser.
                                </p>
                                <button
                                    onClick={() => saveProjectToFile()}
                                    className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download .shero File
                                </button>
                            </div>

                            <div className="p-4 rounded-xl border border-[#2c2c2e] bg-[#222224] space-y-2">
                                <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                                    <Upload className="w-4 h-4 text-cyan-400" /> Import Project File (.shero)
                                </h3>
                                <p className="text-gray-400 text-[11px]">
                                    Open a previously saved <code>.shero</code> project file from your computer.
                                </p>
                                <label className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" /> Open .shero File...
                                    <input
                                        type="file"
                                        accept=".shero,.json"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="bg-[#242426] border-t border-[#3a3a3c] px-5 py-3 flex items-center justify-between text-[11px] text-gray-400">
                    <span>💡 Projects automatically auto-save to browser storage on edit.</span>
                    <button
                        onClick={onClose}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-medium rounded transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
