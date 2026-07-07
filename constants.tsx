
import React from 'react';
import { DemoMode } from './types';

export const MODES = [
  { id: DemoMode.CHAT, icon: 'fa-comments', label: 'Multimodal Chat', description: 'Persona-driven chat with file context and export' },
  { id: DemoMode.IMAGES, icon: 'fa-image', label: 'Image Studio', description: 'Text-to-image generation' },
  { id: DemoMode.VIDEO, icon: 'fa-video', label: 'Video Generation', description: 'Long-running Veo video jobs with polling' },
  { id: DemoMode.LIVE, icon: 'fa-microphone', label: 'Real-time Live', description: 'Low-latency bidirectional voice conversations' },
  { id: DemoMode.SEARCH, icon: 'fa-globe', label: 'Search Grounding', description: 'Web-grounded answers with cited sources' },
];

export const MODELS = {
  CHAT: 'gemini-3-pro-preview',
  IMAGES: 'gemini-2.5-flash-image',
  VIDEO: 'veo-3.1-fast-generate-preview',
  LIVE: 'gemini-2.5-flash-native-audio-preview-12-2025',
  SEARCH: 'gemini-3-flash-preview'
};

// Maps each demo mode to the model it drives, so UI surfaces (e.g. the header
// model chip) can stay in sync with MODELS without hardcoding strings.
export const MODE_MODEL_MAP: Record<DemoMode, string> = {
  [DemoMode.CHAT]: MODELS.CHAT,
  [DemoMode.IMAGES]: MODELS.IMAGES,
  [DemoMode.VIDEO]: MODELS.VIDEO,
  [DemoMode.LIVE]: MODELS.LIVE,
  [DemoMode.SEARCH]: MODELS.SEARCH,
};
