
import React, { useState } from 'react';
import { searchGroundingRequest } from '../services/geminiService';
import { GroundingSource } from '../types';

const SearchSection: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; sources: GroundingSource[] } | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchGroundingRequest(query);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Search grounding failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-12">
        <div className="flex gap-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ask about recent events, weather, or news..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-inner"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-2xl font-semibold transition-all shadow-lg shadow-blue-900/10"
          >
            {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="glass p-8 rounded-3xl border border-slate-700/50 leading-relaxed text-lg">
            {result.text}
          </div>

          <div className="space-y-4">
            <h4 className="flex items-center gap-2 font-semibold text-slate-400 text-sm uppercase tracking-wider">
              <i className="fa-solid fa-link"></i> Sources
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.sources.map((source, i) => (
                <a
                  key={i}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-900 transition-all group"
                >
                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-blue-400">
                    <i className="fa-solid fa-earth-americas"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{source.title}</p>
                    <p className="text-xs text-slate-500 truncate">{new URL(source.uri).hostname}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
            <i className="fa-solid fa-google text-4xl"></i>
          </div>
          <p className="text-slate-500 italic">Queries are grounded using Google Search results</p>
        </div>
      )}
    </div>
  );
};

export default SearchSection;
