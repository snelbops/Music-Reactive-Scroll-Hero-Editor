scroll-hero-editor/
├── src/
│   ├── editor/
│   │   ├── Timeline.tsx          # Theatre.js studio embed + transport
│   │   ├── AudioLane.tsx         # Waveform + onset markers
│   │   └── RecordMode.tsx        # Arm + capture to Theatre.js keyframes
│   ├── preview/
│   │   ├── ScrollViewport.tsx    # Tall scrollable hero pane
│   │   └── ScrollyVideoPlayer.tsx# ScrollyVideo.js wrapper
│   ├── packages/                 # Reused from existing project
│   │   ├── frameLoader.ts
│   │   └── useKickDrumData.ts
│   └── export/
│       └── generateHero.ts       # Outputs standalone HTML/JS/CSS bundle
├── public/
│   └── hero.mp4                  # AI video input
├── MUSIC_SCROLL_HERO_PRD.md
└── package.json
