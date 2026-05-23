
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MODELS } from '../constants';

const VideoSection: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const checkKey = async () => {
      if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (typeof window.aistudio?.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setStatus('Initializing generation...');
    setVideoUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: MODELS.VIDEO,
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setStatus('Thinking and rendering...');
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        setStatus('Processing video frames...');
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        alert("Please select a valid paid API key again.");
      } else {
        alert("Failed to generate video.");
      }
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  if (!hasKey) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-md glass p-10 rounded-3xl border border-blue-500/20">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-key text-blue-500 text-2xl"></i>
          </div>
          <h3 className="text-2xl font-bold mb-4">Paid API Key Required</h3>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Video generation with Veo models requires a paid Google Cloud project. Please select your API key to continue.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            Select API Key
          </button>
          <p className="mt-4 text-xs text-slate-500">
            Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-400 hover:underline">Gemini API Billing</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 h-full flex flex-col">
      <div className="space-y-4 mb-8">
        <h3 className="text-xl font-semibold">Veo Video Studio</h3>
        <div className="flex gap-4">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A futuristic city with flying neon cars at sunset..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="px-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-2xl font-semibold transition-all"
          >
            {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Create'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[400px] glass rounded-3xl overflow-hidden border border-slate-800 relative flex items-center justify-center">
        {loading ? (
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-xl font-bold text-blue-400 animate-pulse">{status}</p>
            <p className="text-slate-500 mt-2 text-sm italic">This usually takes 2-4 minutes...</p>
          </div>
        ) : videoUrl ? (
          <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
        ) : (
          <div className="text-center px-12 opacity-30">
            <i className="fa-solid fa-clapperboard text-8xl mb-6"></i>
            <p className="text-2xl font-medium italic">Describe a scene to bring it to life</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoSection;
