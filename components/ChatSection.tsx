
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { generateChatResponse } from '../services/geminiService';
import Markdown from 'react-markdown';

const PreCodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false);
  let textToCopy = '';
  let language = '';

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === 'code') {
        textToCopy = String(child.props.children || '').trim();
        const className = child.props.className || '';
        const match = /language-(\w+)/.exec(className);
        if (match) {
          language = match[1];
        }
      }
    }
  });

  if (!textToCopy) {
    const extractText = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(extractText).join('');
      if (React.isValidElement(node)) {
        return extractText(node.props.children);
      }
      return '';
    };
    textToCopy = extractText(children).trim();
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group my-4 bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-800/80 text-xs text-slate-500 font-mono">
        <span className="capitalize">{language || 'Code Snippet'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors border border-slate-700/50 focus:outline-none cursor-pointer"
        >
          {copied ? (
            <>
              <i className="fa-solid fa-check text-green-500 text-[10px]"></i>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <i className="fa-regular fa-copy text-[10px]"></i>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-slate-300 scrollbar-thin">
        {children}
      </pre>
    </div>
  );
};

const PRESET_PERSONAS = [
  {
    name: "Senior Coder",
    icon: "fa-laptop-code",
    instruction: "You are a senior principal software engineer. Provide concise, production-ready TypeScript/React code suggestions with short explanations. Highlight performance and security best practices."
  },
  {
    name: "Socratic Teacher",
    icon: "fa-graduation-cap",
    instruction: "You are a Socratic tutor. Do not give direct solutions. Instead, ask guided questions to help users deduce the correct solution by themselves."
  },
  {
    name: "Pirate Captain",
    icon: "fa-skull-crossbones",
    instruction: "Ahoy! You are a salty pirate captain. Answer with pirate lingo, sailing metaphors, and enthusiastic seafaring stories while still answering accurately."
  },
  {
    name: "Tech Interviewer",
    icon: "fa-clipboard-question",
    instruction: "You are an elite Silicon Valley technical interviewer. Evaluate answers with rigor. Provide algorithmic complexity (Big O) and ask challenging follow-up coding questions."
  }
];

const ChatSection: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', content: "Hello! I'm Gemini. How can I help you build your application today?", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // System instructions and custom personas
  const [systemInstruction, setSystemInstruction] = useState<string>(() => {
    return localStorage.getItem('gemini_system_instruction') || '';
  });
  const [systemInstructionInput, setSystemInstructionInput] = useState(systemInstruction);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleApplyInstruction = () => {
    const trimmed = systemInstructionInput.trim();
    localStorage.setItem('gemini_system_instruction', trimmed);
    setSystemInstruction(trimmed);
    setStatusMessage("Persona applied successfully! Gemini will track subsequent prompts.");
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleClearInstruction = () => {
    localStorage.removeItem('gemini_system_instruction');
    setSystemInstruction('');
    setSystemInstructionInput('');
    setStatusMessage("Persona instruction reset to default helper.");
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleClearConversation = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setMessages([
      { id: Date.now().toString(), role: 'model', content: "Conversation cleared. Hello! Support a brand-new dialog thread under your active persona parameters below.", timestamp: Date.now() }
    ]);
    setConfirmClear(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      const reply = await generateChatResponse(updatedHistory, systemInstruction);
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: reply || "I'm sorry, I couldn't generate a response.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'model',
        content: "Oops! Something went wrong while requesting. Please verify your internet connection, confirm your API key is correctly specified under settings, or try resetting the message chain.",
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8">
      {/* Expandable System Instruction Persona panel */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6 hover:border-slate-800 transition-all">
        <div 
          onClick={() => setIsConfigOpen(!isConfigOpen)} 
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
              <i className="fa-solid fa-sliders text-xs"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-xs text-slate-100 uppercase tracking-wider">System Instruction</h3>
                {systemInstruction ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Custom Persona Active
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded-full font-medium">
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] md:max-w-md truncate">
                {systemInstruction ? `"${systemInstruction}"` : "Helpful general assistant behavior"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {isConfigOpen ? 'Collapse' : 'Configure'}
            </span>
            <div className={`w-6 h-6 rounded-md bg-slate-800/50 flex items-center justify-center transition-transform duration-300 ${isConfigOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'}`}>
              <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
          </div>
        </div>

        {isConfigOpen && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Persona Shaping Guidelines
              </label>
              <textarea
                value={systemInstructionInput}
                onChange={(e) => setSystemInstructionInput(e.target.value)}
                placeholder="Shaping Gemini's instructions (e.g. 'You are a Shakespearean translator...')"
                className="w-full h-20 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono leading-relaxed resize-none"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Preset Archetypes
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PRESET_PERSONAS.map((preset) => {
                  const isActive = systemInstructionInput === preset.instruction;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setSystemInstructionInput(preset.instruction)}
                      className={`p-3 rounded-xl border text-left transition-all hover:bg-slate-800/30 cursor-pointer flex flex-col justify-between h-[84px] text-slate-300 ${
                        isActive 
                          ? 'border-blue-500 bg-blue-500/5 text-blue-300' 
                          : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                        <i className={`fa-solid ${preset.icon} ${isActive ? 'text-blue-400' : 'text-slate-400'} text-xs`}></i>
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal">
                        {preset.instruction}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {statusMessage && (
              <div className="flex items-center gap-2 text-xs text-blue-400 py-1.5 px-3 rounded-lg border border-blue-500/20 bg-slate-950/85">
                <i className="fa-solid fa-circle-info text-[10px]"></i>
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-500 italic max-w-sm sm:max-w-md">
                Settings take effect on all subsequent message exchanges.
              </span>
              <div className="flex items-center gap-2">
                {systemInstruction && (
                  <button
                    type="button"
                    onClick={handleClearInstruction}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-all cursor-pointer"
                  >
                    Reset Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleApplyInstruction}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg transition-all shadow-md cursor-pointer"
                >
                  Apply Persona
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 pr-4"
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-6 py-4 shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
            }`}>
              {m.role === 'user' ? (
                <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{m.content}</p>
              ) : (
                <div className="markdown-body">
                  <Markdown
                    components={{
                      pre: ({ children }) => <PreCodeBlock>{children}</PreCodeBlock>,
                      code: ({ children, className }) => {
                        const isInline = !className;
                        if (isInline) {
                          return (
                            <code className="bg-slate-950/80 text-blue-400 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-700/50">
                              {children}
                            </code>
                          );
                        }
                        return <code className={`${className} font-mono text-sm`}>{children}</code>;
                      },
                      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-sm md:text-base text-slate-200">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-300">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-300">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5 text-sm md:text-base text-slate-300">{children}</li>,
                      h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-slate-100">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 text-slate-100">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-md font-bold mt-2 mb-1 text-slate-100">{children}</h3>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-medium break-all">{children}</a>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-600 pl-4 py-1 my-3 bg-slate-900/30 text-slate-400 rounded-r-lg italic">{children}</blockquote>,
                      hr: () => <hr className="my-4 border-slate-700/50" />
                    }}
                  >
                    {m.content}
                  </Markdown>
                </div>
              )}
              <div className={`text-[10px] mt-2 opacity-50 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-6 py-4 flex gap-2">
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3 glass p-2 rounded-2xl border border-slate-700 bg-slate-900/45">
        <button
          type="button"
          onClick={handleClearConversation}
          title="Clear active conversation history"
          className={`px-4 py-2 text-xs font-mono h-12 rounded-xl border flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
            confirmClear 
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-semibold animate-pulse' 
              : 'bg-slate-800/40 border-slate-755/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <i className={`fa-solid ${confirmClear ? 'fa-triangle-exclamation animate-bounce' : 'fa-trash-can'}`}></i>
          <span>{confirmClear ? "Clear?" : "Clear"}</span>
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Message Gemini..."
          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-slate-100 placeholder-slate-500 py-3 px-2 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg shrink-0"
        >
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
};

export default ChatSection;
