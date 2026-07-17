
import React, { useState, useEffect } from 'react';
import { DemoMode } from './types';
import { MODES, MODE_MODEL_MAP } from './constants';
import ChatSection from './components/ChatSection';
import ImageSection from './components/ImageSection';
import VideoSection from './components/VideoSection';
import LiveSection from './components/LiveSection';
import SearchSection from './components/SearchSection';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<DemoMode>(DemoMode.CHAT);
  const [hasApiKey, setHasApiKey] = useState(() => Boolean(process.env.API_KEY));
  const activeModeMeta = MODES.find((mode) => mode.id === activeMode);

  useEffect(() => {
    if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
      window.aistudio.hasSelectedApiKey().then(setHasApiKey);
    }
  }, []);

  const renderContent = () => {
    switch (activeMode) {
      case DemoMode.CHAT: return <ChatSection />;
      case DemoMode.IMAGES: return <ImageSection />;
      case DemoMode.VIDEO: return <VideoSection />;
      case DemoMode.LIVE: return <LiveSection />;
      case DemoMode.SEARCH: return <SearchSection />;
      default: return <ChatSection />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-wand-magic-sparkles text-white text-sm"></i>
          </div>
          <span className="hidden md:block font-bold text-lg tracking-tight">Gemini Hub</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              title={mode.label}
              aria-current={activeMode === mode.id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeMode === mode.id
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <i className={`fa-solid ${mode.icon} w-5 text-center`}></i>
              <span className="hidden md:block font-medium">{mode.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-amber-500'}`}></span>
            Gemini API {hasApiKey ? 'Ready' : 'Not Configured'}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800/50 glass z-10">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-tight">{activeMode}</h2>
            {activeModeMeta?.description && (
              <p className="hidden sm:block text-xs text-slate-500 truncate">{activeModeMeta.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-800/60 text-slate-400 rounded-full text-xs font-mono border border-slate-700/50">
              <i className="fa-solid fa-microchip text-[10px]"></i>
              {MODE_MODEL_MAP[activeMode]}
            </div>
            {hasApiKey ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium border border-green-500/20">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                API Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium border border-amber-500/20">
                <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                API Key Missing
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Section */}
        <div className="flex-1 overflow-auto relative">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
