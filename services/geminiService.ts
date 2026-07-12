
import { GoogleGenAI, GenerateContentResponse, Modality, GenerateVideosOperation } from "@google/genai";
import { MODELS } from "../constants";
import { Message } from "../types";

export const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found in environment");
  return new GoogleGenAI({ apiKey });
};

export const generateChatResponse = async (history: Message[], systemInstruction?: string) => {
  const ai = getAIClient();
  
  // Find index of first user message to guarantee the sequence begins with a user turn
  const firstUserIdx = history.findIndex(msg => msg.role === 'user');
  const activeHistory = firstUserIdx >= 0 ? history.slice(firstUserIdx) : history;

  // Map custom Message interface to Gemini content parts
  const contents = activeHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const response = await ai.models.generateContent({
    model: MODELS.CHAT,
    contents: contents,
    config: {
      temperature: 0.8,
      ...(systemInstruction ? { systemInstruction } : {})
    }
  });
  return response.text;
};

export const generateImage = async (prompt: string) => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: MODELS.IMAGES,
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data found in response");
};

export const searchGroundingRequest = async (query: string) => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: MODELS.SEARCH,
    contents: query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text || "";
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  const sources = chunks
    .filter((c: any) => c.web)
    .map((c: any) => ({
      title: c.web.title,
      uri: c.web.uri
    }));

  return { text, sources };
};

export const generateConversationSummary = async (history: Message[]) => {
  const ai = getAIClient();
  
  // Format history safely for key value summaries
  const textHistory = history
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  const response = await ai.models.generateContent({
    model: MODELS.SEARCH, // Use search/flash model for fast speed summary
    contents: `You are an expert technical assistant. Please generate a highly concise, elegant outline and summary of the following chat session. Provide:
1. A 2-sentence overarching theme/summary.
2. Bullet points outlining the primary technical or logical topics explored.
3. Key resolutions, solutions or guidance highlights.

Make the output professional, aesthetic, and formatted with clean Markdown headers and bullet points.

Conversation History to Summarize:
${textHistory}`,
    config: {
      temperature: 0.5,
    }
  });

  return response.text;
};

export const startVideoGeneration = async (prompt: string): Promise<GenerateVideosOperation> => {
  const ai = getAIClient();
  return ai.models.generateVideos({
    model: MODELS.VIDEO,
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });
};

export const pollVideoOperation = async (operation: GenerateVideosOperation): Promise<GenerateVideosOperation> => {
  const ai = getAIClient();
  return ai.operations.getVideosOperation({ operation });
};

export const fetchGeneratedVideoBlob = async (downloadLink: string): Promise<Blob> => {
  const apiKey = process.env.API_KEY;
  const response = await fetch(`${downloadLink}&key=${apiKey}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch video blob: ${response.status} ${response.statusText}`);
  }
  return response.blob();
};

// Audio helpers
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
