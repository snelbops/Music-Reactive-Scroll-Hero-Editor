# Particle Lab — Portable Package

A self-contained interactive 3D particle system for React apps. Drop this into any **React + Vite** project.

## What You Get

| Feature | Details |
|---|---|
| 🌀 **Orbit preset** | Custom GLSL rotating particle cloud, driven by uploaded images |
| ✨ **Classic preset** | Original Bruno Imbrizi interactive particle portrait (iframe) |
| 🖼️ **Image sidebar** | Upload local images, reorder, delete |
| 🎛️ **Control panel** | Live sliders per preset (rotation speed, depth, size, touch radius) |
| 🌓 **Theme toggle** | Dark (black bg, white particles) / Light (white bg, dark particles) |

## Package Contents

```
particle-lab-package/
├── README.md                        ← This file
├── src/
│   ├── GithubTestView.tsx           ← Main route component
│   ├── GithubTest/
│   │   └── GithubTestParticleField.tsx  ← Orbit preset (R3F + GLSL)
│   └── TouchTexture.ts              ← Shared mouse interaction texture
└── public/
    └── github-test-app/             ← Classic preset static bundle (copy entire folder)
        ├── index.html
        ├── css/
        ├── scripts/
        └── images/
```

## Setup (5 steps)

### 1. Install Dependencies

```bash
npm install @react-three/fiber three lucide-react
# or
yarn add @react-three/fiber three lucide-react
```

### 2. Copy Source Files

```
src/GithubTestView.tsx          → your-project/src/views/GithubTestView.tsx (or wherever you keep views)
src/GithubTest/                 → your-project/src/views/GithubTest/
src/TouchTexture.ts             → your-project/src/presets/TouchTexture.ts  (or any shared location)
public/github-test-app/         → your-project/public/github-test-app/
```

> **Important:** Update the import path for `TouchTexture` and `GithubTestParticleField` in
> `GithubTestView.tsx` and `GithubTestParticleField.tsx` to match where you placed them.

### 3. Update Import Paths

In `GithubTestParticleField.tsx`, change:
```tsx
import { TouchTexture } from '../../presets/TouchTexture';
```
…to wherever you placed `TouchTexture.ts` in your project.

In `GithubTestView.tsx`, change:
```tsx
import { GithubTestParticleField } from './GithubTest/GithubTestParticleField';
```
…to the correct relative path.

### 4. Register the Route

```tsx
// In your router (React Router v6 example)
import { GithubTestView } from './views/GithubTestView';

<Route path="/particle-lab" element={<GithubTestView />} />
```

### 5. (Optional) Rename the View

The component is named `GithubTestView` — you can rename it to `ParticleLabView` or anything you like.
Just update the export name in `GithubTestView.tsx` and your import.

---

## Requirements

| Requirement | Version |
|---|---|
| React | 18+ |
| `@react-three/fiber` | 8.x |
| `three` | 0.163.x+ |
| `lucide-react` | 0.365+ |
| Vite (or any bundler that serves `/public`) | — |

> If your project doesn't use Vite, make sure `public/github-test-app/` is served as a static asset
> at the path `/github-test-app/index.html`. The Classic preset loads that path in an iframe.

---

## Telling Your AI About It

Paste this into your AI prompt when dropping it into a new project:

```
I've added a Particle Lab feature to this project. Here's the structure:

- src/views/GithubTestView.tsx — main component (register at any route you like)
- src/views/GithubTest/GithubTestParticleField.tsx — the Orbit preset particle field (React Three Fiber)
- src/presets/TouchTexture.ts — shared mouse interaction texture
- public/github-test-app/ — the Classic preset (static iframe app)

Dependencies needed: @react-three/fiber, three, lucide-react

The view has two presets (Orbit and Classic), an image upload sidebar, a live control panel,
and a dark/light theme toggle. Please wire it up to a route and fix any import paths.
```

---

## Customising

### Change default sample images
Edit the `images` array in `GithubTestView.tsx`:
```tsx
const [images, setImages] = useState([
  { id: 'my-img', url: '/path/to/my-image.png', name: 'My Image' },
]);
```

### Adjust particle density
In `GithubTestParticleField.tsx`:
```tsx
const MAX_PARTICLES = 80000; // lower = faster, higher = more detail
```

### Add a new control slider
In `GithubTestView.tsx`, add a `<Slider>` in the Orbit or Classic control panel section,
then pass the value as a prop to `GithubTestParticleField` and wire it to a uniform in `useFrame`.
