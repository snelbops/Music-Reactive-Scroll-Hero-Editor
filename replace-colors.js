const fs = require('fs');

const files = [
  'scroll-hero-editor/src/editor/LeftPanel.tsx',
  'scroll-hero-editor/src/editor/Inspector.tsx',
  'scroll-hero-editor/src/editor/Timeline.tsx'
];

const map = {
  'bg-black/20': 'bg-editor-panel text-editor-fg',
  'bg-black/40': 'bg-editor-panel text-editor-fg',
  'bg-white/5': 'bg-editor-surface',
  'bg-white/2': 'bg-editor-surface',
  'bg-white/3': 'bg-editor-surface',
  'hover:bg-white/5': 'hover:bg-editor-surface-hover',
  'hover:bg-white/8': 'hover:bg-editor-surface-hover',
  'hover:bg-white/10': 'hover:bg-editor-surface-hover',
  'hover:bg-white/20': 'hover:bg-editor-surface-hover',
  'text-white': 'text-editor-fg',
  'hover:text-white': 'hover:text-editor-fg',
  'text-gray-200': 'text-[11px] text-editor-fg',
  'text-gray-300': 'text-editor-muted',
  'text-gray-400': 'text-editor-muted',
  'text-gray-500': 'text-editor-muted',
  'text-gray-600': 'text-editor-muted',
  'border-white/5': 'border-editor-border',
  'border-white/10': 'border-editor-border',
  'border-white/20': 'border-editor-border'
};

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  for (const [k, v] of Object.entries(map)) {
    content = content.replaceAll(k, v);
  }
  fs.writeFileSync(f, content);
});
console.log("Colors replaced!");
