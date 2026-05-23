
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';

const ImageSection: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ url: string; prompt: string }[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const url = await generateImage(prompt);
      setImages(prev => [{ url, prompt }, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex flex-col md:flex-row gap-6 mb-12">
        <div className="flex-1">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create..."
            className="w-full h-32 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
          />
        </div>
        <div className="md:w-48 flex flex-col gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 h-full rounded-2xl font-semibold flex flex-col items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/10"
          >
            {loading ? (
              <i className="fa-solid fa-spinner animate-spin text-2xl"></i>
            ) : (
              <i className="fa-solid fa-wand-magic text-2xl"></i>
            )}
            <span>Generate</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {images.map((img, i) => (
          <div key={i} className="group relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl transition-all hover:scale-[1.02]">
            <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <p className="text-xs text-slate-400 line-clamp-3 italic">"{img.prompt}"</p>
              <div className="mt-4 flex gap-2">
                <a 
                  href={img.url} 
                  download={`gemini-gen-${i}.png`}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-center text-xs font-medium border border-slate-700 transition-colors"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        ))}

        {images.length === 0 && !loading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-600">
            <i className="fa-solid fa-images text-6xl mb-4 opacity-20"></i>
            <p className="text-xl font-medium opacity-50">Start creating to see images here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSection;
