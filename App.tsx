
import React, { useState } from 'react';
import { DemoMode } from './types';
import { MODES } from './constants';
import ChatSection from './components/ChatSection';
import ImageSection from './components/ImageSection';
import VideoSection from './components/VideoSection';
import LiveSection from './components/LiveSection';
import SearchSection from './components/SearchSection';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<DemoMode>(DemoMode.CHAT);

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
          <div className="hidden md:block text-xs text-slate-500 font-mono">
            API v3.0 Powered
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800/50 glass z-10">
          <h2 className="text-xl font-semibold">{activeMode}</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium border border-green-500/20">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              API Connected
            </div>
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
