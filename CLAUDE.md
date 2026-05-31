# CLAUDE.md

Guidance for Claude Code (and humans) when working in this repository.

## Project overview

**Developapp** (Gemini Developer Hub) is a React + TypeScript + Vite SPA that showcases five Google Gemini API capabilities side-by-side:

1. **Multimodal Chat** with personas, file-context analysis, and conversation export
2. **Image Studio** — image generation via `gemini-2.5-flash-image`
3. **Video Generation** — long-running `veo-3.1-fast-generate-preview` jobs with polling
4. **Real-time Live Voice** — bidirectional audio via the native-audio Gemini model
5. **Search Grounding** — web search with citation sources

The app was exported from Google AI Studio and is configured to run anywhere Vite runs (the AI Studio source app is at `https://ai.studio/apps/0dd9e649-d70b-48b3-ae68-54d2f479f23f`).

## Tech stack

- React 19 + TypeScript 5
- Vite 6 (`@vitejs/plugin-react`)
- `@google/genai` 1.x — Gemini SDK
- `react-markdown` for chat rendering
- Tailwind utility classes (loaded via CDN in `index.html` — no Tailwind build step)
- Font Awesome 6 for icons
- Web Audio API + microphone access for the Live voice mode

## Commands

```bash
npm install
npm run dev        # Vite dev server (port 3000, host 0.0.0.0)
npm run build      # Production build → dist/
npm run preview    # Preview the built bundle
```

## Environment

Create `.env.local` at the repo root:

```
GEMINI_API_KEY=your-key-here
```

`vite.config.ts` injects this as both `process.env.GEMINI_API_KEY` and `process.env.API_KEY` at build time via `define`. **The key ends up in the client bundle** — only use a key intended for client-side exposure, or proxy through a backend before publishing this.

## Repo layout

```
Developapp/
├── index.html                 # Vite HTML entry; mounts #root
├── index.tsx                  # ReactDOM.createRoot + <React.StrictMode><App/></StrictMode>
├── App.tsx                    # Sidebar + active-mode switching shell
├── constants.tsx              # MODES list + MODELS map (centralized model names)
├── types.ts                   # DemoMode enum, Message / GeneratedAsset / GroundingSource
├── services/
│   └── geminiService.ts       # Single source of truth for all Gemini API calls + audio utils
├── components/
│   ├── ChatSection.tsx        # Multimodal chat (personas, file context, export, search)
│   ├── ImageSection.tsx       # Image generation UI
│   ├── VideoSection.tsx       # Veo job submission + polling
│   ├── LiveSection.tsx        # Real-time audio session
│   └── SearchSection.tsx      # Grounded search with sources
├── migrated_prompt_history/   # Archived prompt history from earlier iterations (reference only)
├── metadata.json              # Declares camera + microphone permissions for AI Studio
├── vite.config.ts             # React plugin + GEMINI_API_KEY define + @/* path alias
├── tsconfig.json              # Target ES2022, JSX react-jsx, baseUrl='.', paths { @/*: ['./*'] }
└── package.json
```

## Conventions

- **Path alias**: `@/...` maps to the repo root (e.g. `@/services/geminiService`).
- **Service layer**: every Gemini API call goes through `services/geminiService.ts` (`getAIClient`, `generateChatResponse`, `generateImage`, `searchGroundingRequest`, `generateConversationSummary`, plus `encode`/`decode`/`decodeAudioData` helpers). Components should never instantiate `GoogleGenAI` directly.
- **Models** are centralized in `constants.tsx` (`MODELS.CHAT`, `MODELS.IMAGES`, etc.). Always reference these — don't hardcode model strings inside components.
- **State**: local React state with hooks. No Redux, no Context (apart from React's built-ins). The chat persists its system instruction to `localStorage` under `gemini_system_instruction`.
- **Styling**: Tailwind utility classes (CDN) and Font Awesome icons. Dark glassmorphic theme (slate-950 backgrounds, blur/transparency).
- **Component naming**: PascalCase for components (`ChatSection.tsx`), camelCase for services.
- **Long-running jobs** (video): poll the operation handle with `ai.operations.getVideosOperation({ operation })` at 5-second intervals (see `components/VideoSection.tsx`); surface progress in the UI.
- **Live audio**: use the existing `encode`/`decode`/`decodeAudioData` helpers — don't reinvent the WebAudio wiring.

## Where to add features

- New top-level mode → add to the `DemoMode` enum (`types.ts`), the `MODES` array (`constants.tsx`), a new `*Section.tsx` component, and a switch case in `App.tsx`.
- New Gemini call → add a wrapper to `services/geminiService.ts`, then consume it from the relevant component.
- New persona preset → extend the persona archetypes list inside `ChatSection.tsx`.

## What's intentionally absent

- No tests, no ESLint/Prettier config, no Tailwind config (CDN), no CI workflows. Keep changes small and TypeScript-safe; rely on `tsc` (via Vite) for type checking.
