
export enum DemoMode {
  CHAT = 'Chat',
  IMAGES = 'Images',
  VIDEO = 'Video',
  LIVE = 'Live Voice',
  SEARCH = 'Grounding'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface GeneratedAsset {
  id: string;
  url: string;
  prompt: string;
  type: 'image' | 'video';
}

export interface GroundingSource {
  title: string;
  uri: string;
}
