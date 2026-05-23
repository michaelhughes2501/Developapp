
import React from 'react';
import { DemoMode } from './types';

export const MODES = [
  { id: DemoMode.CHAT, icon: 'fa-comments', label: 'Multimodal Chat' },
  { id: DemoMode.IMAGES, icon: 'fa-image', label: 'Image Studio' },
  { id: DemoMode.VIDEO, icon: 'fa-video', label: 'Video Generation' },
  { id: DemoMode.LIVE, icon: 'fa-microphone', label: 'Real-time Live' },
  { id: DemoMode.SEARCH, icon: 'fa-globe', label: 'Search Grounding' },
];

export const MODELS = {
  CHAT: 'gemini-3-pro-preview',
  IMAGES: 'gemini-2.5-flash-image',
  VIDEO: 'veo-3.1-fast-generate-preview',
  LIVE: 'gemini-2.5-flash-native-audio-preview-12-2025',
  SEARCH: 'gemini-3-flash-preview'
};
