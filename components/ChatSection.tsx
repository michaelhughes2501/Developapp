
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { generateChatResponse, generateConversationSummary } from '../services/geminiService';
import Markdown from 'react-markdown';

const escapeRegExp = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const escapedQuery = escapeRegExp(query.trim());
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-amber-400 bg-opacity-45 text-amber-200 font-semibold px-0.5 rounded border border-amber-500/30 shadow-sm transition-all duration-300">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const highlightNode = (node: React.ReactNode, query: string): React.ReactNode => {
  if (!query.trim()) return node;
  if (typeof node === 'string') {
    return highlightText(node, query);
  }
  if (typeof node === 'number') {
    return highlightText(String(node), query);
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => <React.Fragment key={i}>{highlightNode(child, query)}</React.Fragment>);
  }
  if (React.isValidElement(node)) {
    const props = node.props as any;
    if (props && props.children) {
      return React.cloneElement(node, {
        ...props,
        children: highlightNode(props.children, query)
      });
    }
  }
  return node;
};

const PreCodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false);
  let textToCopy = '';
  let language = '';

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === 'code') {
        const codeProps = child.props as { children?: React.ReactNode; className?: string };
        textToCopy = String(codeProps.children || '').trim();
        const className = codeProps.className || '';
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
        return extractText((node.props as { children?: React.ReactNode }).children);
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

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'cpp': 'cpp',
    'h': 'cpp',
    'c': 'c',
    'java': 'java',
    'kt': 'kotlin',
    'md': 'markdown',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'sh': 'bash',
    'yml': 'yaml',
    'yaml': 'yaml'
  };
  return map[ext] || 'text';
};

const WORKSPACE_FILES = [
  { name: 'App.tsx', path: '/App.tsx', desc: 'Main Layout' },
  { name: 'geminiService.ts', path: '/services/geminiService.ts', desc: 'API Client' },
  { name: 'ChatSection.tsx', path: '/components/ChatSection.tsx', desc: 'Active Chat view' },
  { name: 'types.ts', path: '/types.ts', desc: 'Typing Schemas' },
  { name: 'constants.tsx', path: '/constants.tsx', desc: 'Meta Values' },
];

const CODE_FEATURES = [
  {
    id: 'explain',
    name: 'Explain Context',
    icon: 'fa-circle-question',
    color: 'from-blue-500/10 to-blue-500/5 hover:border-blue-500/30 text-blue-400 border-blue-500/20',
    prompt: 'Provide a complete architectural and step-by-step logic breakdown of this file. Detail what each section is doing, how state flows, and what the key dependencies are.'
  },
  {
    id: 'optimize',
    name: 'Optimize Code',
    icon: 'fa-bolt-lightning',
    color: 'from-amber-500/10 to-amber-500/5 hover:border-amber-500/30 text-amber-400 border-amber-500/20',
    prompt: 'Analyze this file for potential speed bottlenecks, redundant rendering paths in React, or nesting loops. Show an optimized version using elegant typescript patterns.'
  },
  {
    id: 'test',
    name: 'Generate Tests',
    icon: 'fa-flask-vial',
    color: 'from-purple-500/10 to-purple-500/5 hover:border-purple-500/30 text-purple-400 border-purple-500/20',
    prompt: 'Autogenerate a robust test runner suit checking the critical logic, error catch-points, and prop boundaries for the functions and components inside this file.'
  },
  {
    id: 'audit',
    name: 'Audit Security',
    icon: 'fa-shield-halved',
    color: 'from-rose-500/10 to-rose-500/5 hover:border-rose-500/30 text-rose-400 border-rose-500/20',
    prompt: 'Perform a security and bug audit in this file. Scan specifically for unhandled exceptions, memory leaks, racing effects, or null-pointer issues. Advise step-by-step mitigations.'
  },
  {
    id: 'doc',
    name: 'Document Code',
    icon: 'fa-book-open',
    color: 'from-emerald-500/10 to-emerald-500/5 hover:border-emerald-500/30 text-emerald-400 border-emerald-500/20',
    prompt: 'Draft and append production JSDoc declarations above all component types, handlers, and logic wrappers inside this file.'
  }
];

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

interface LoadedFile {
  name: string;
  content: string;
  size: number;
  lines: number;
  language: string;
}

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

  // Context analyzer variables
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<'persona' | 'code'>('persona');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search and filter messages
  const [searchQuery, setSearchQuery] = useState('');

  // Export session dropdown details
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  // Summary modal states
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryCopied, setSummaryCopied] = useState(false);

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : messages;

  const handleGenerateSummary = async () => {
    if (messages.length === 0) {
      setFileError("There is no conversation active to summarize.");
      setTimeout(() => setFileError(null), 3000);
      return;
    }
    
    setSummaryModalOpen(true);
    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryText('');
    setSummaryCopied(false);
    
    try {
      const summary = await generateConversationSummary(messages);
      setSummaryText(summary || "No summary could be generated at this time.");
    } catch (err: any) {
      console.error(err);
      setSummaryError("Failed to generate a conversation summary. Please verify your connection or API configuration.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const copySummaryToClipboard = () => {
    if (!summaryText) return;
    navigator.clipboard.writeText(summaryText).then(() => {
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2500);
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportContainerRef.current && !exportContainerRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const exportAsJSON = () => {
    if (messages.length === 0) {
      setFileError("There is no conversation active to export.");
      setTimeout(() => setFileError(null), 3000);
      return;
    }
    try {
      const jsonString = JSON.stringify(messages, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `gemini-chat-session-${Date.now()}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
      
      setStatusMessage("Session exported successfully as JSON!");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error(err);
      setFileError("Failure exporting JSON session.");
      setTimeout(() => setFileError(null), 3500);
    }
  };

  const exportAsMarkdown = () => {
    if (messages.length === 0) {
      setFileError("There is no conversation active to export.");
      setTimeout(() => setFileError(null), 3000);
      return;
    }
    try {
      let mdContent = `# Gemini Chat Session\n*Exported on: ${new Date().toLocaleString()}*\n\n---\n\n`;
      messages.forEach((msg) => {
        const roleName = msg.role === 'user' ? 'User' : 'Gemini';
        const timestampText = new Date(msg.timestamp).toLocaleString();
        mdContent += `### **[${roleName}]** - *${timestampText}*\n\n${msg.content}\n\n---\n\n`;
      });
      const blob = new Blob([mdContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `gemini-chat-session-${Date.now()}.md`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);

      setStatusMessage("Session exported successfully as Markdown!");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error(err);
      setFileError("Failure exporting Markdown session.");
      setTimeout(() => setFileError(null), 3500);
    }
  };

  const parseFileAndSet = (name: string, content: string, size: number) => {
    try {
      const lines = content.split('\n').length;
      const language = getLanguageFromFilename(name);
      setLoadedFile({
        name,
        content,
        size,
        lines,
        language
      });
      setFileError(null);
      
      setStatusMessage(`Attached: "${name}" (${lines} lines, ${(size / 1024).toFixed(1)} KB) - Choose analytical features inside the Control Center.`);
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err) {
      setFileError("Failure formatting file context.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      readFileObject(file);
    }
  };

  const readFileObject = (file: File) => {
    setFileLoading(true);
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseFileAndSet(file.name, text, file.size);
      setFileLoading(false);
    };
    reader.onerror = () => {
      setFileError("Error loading active code content.");
      setFileLoading(false);
    };
    reader.readAsText(file);
  };

  const handleLoadWorkspaceFile = async (name: string, path: string) => {
    setFileLoading(true);
    setFileError(null);
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP index ${response.status}`);
      }
      const text = await response.text();
      parseFileAndSet(name, text, text.length);
    } catch (err: any) {
      setFileError(`Could not fetch workspace source: ${err.message}. Try manually browsing folders.`);
    } finally {
      setFileLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readFileObject(file);
    }
  };

  const clearLoadedFile = () => {
    setLoadedFile(null);
    setFileError(null);
    setStatusMessage("Code file detached.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleExecuteFeature = async (featurePrompt: string, featureName: string) => {
    if (!loadedFile || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Please run **${featureName}** on the active context code file: **${loadedFile.name}**\n*(Analyzing ${loadedFile.lines} lines, language detected: *${loadedFile.language}*)*`,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Hydrate query with file details under the hood
      const fullPromptText = `${featurePrompt}\n\nHere is the source code of the file "${loadedFile.name}" under analysis:\n\n\`\`\`${loadedFile.language}\n${loadedFile.content}\n\`\`\``;
      const apiHistory = [...messages, { ...userMsg, content: fullPromptText }];

      const reply = await generateChatResponse(apiHistory, systemInstruction);
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: reply || "I couldn't run the requested logic. Check parameters or structure.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'model',
        content: "Oops! Analysis request failed. Ensure your Gemini API key is valid under settings.",
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
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
      // Hydrate query with file context if file is attached
      let apiHistory = updatedHistory;
      if (loadedFile) {
        const fullPromptText = `${input}\n\n---\n**Refer to the linked code context file for answering the question above:**\nFile: ${loadedFile.name}\n\`\`\`${loadedFile.language}\n${loadedFile.content}\n\`\`\``;
        apiHistory = [...messages, { ...userMsg, content: fullPromptText }];
      }

      const reply = await generateChatResponse(apiHistory, systemInstruction);
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
      {/* Control Center Panel */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6 hover:border-slate-800 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
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
                <h3 className="font-semibold text-xs text-slate-100 uppercase tracking-wider">Control Center</h3>
                {systemInstruction && (
                  <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
                    Persona: Active
                  </span>
                )}
                {loadedFile && (
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    File Context: Mounted
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] md:max-w-md truncate">
                {loadedFile ? `Mounted "${loadedFile.name}" (${loadedFile.lines} lines)` : systemInstruction ? `"${systemInstruction}"` : "Shaping instructions or loading file context"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {isConfigOpen ? 'Collapse' : 'Configure Workspace'}
            </span>
            <div className={`w-6 h-6 rounded-md bg-slate-800/50 flex items-center justify-center transition-transform duration-300 ${isConfigOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'}`}>
              <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
          </div>
        </div>

        {isConfigOpen && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
            {/* Tab Switched Header */}
            <div className="flex border-b border-slate-800/80 pb-2 gap-4">
              <button
                type="button"
                onClick={() => setActiveConfigTab('persona')}
                className={`pb-2 text-xs font-semibold tracking-wider uppercase transition-colors outline-none cursor-pointer border-b-2 flex items-center gap-2 ${
                  activeConfigTab === 'persona' 
                    ? 'border-blue-500 text-blue-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <i className="fa-solid fa-user-gear text-xs"></i>
                Persona Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab('code')}
                className={`pb-2 text-xs font-semibold tracking-wider uppercase transition-colors outline-none cursor-pointer border-b-2 flex items-center gap-2 ${
                  activeConfigTab === 'code' 
                    ? 'border-blue-500 text-blue-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <i className="fa-solid fa-folder-open text-xs"></i>
                Code Analyzer Context
              </button>
            </div>

            {/* TAB 1: PERSONA PANEL */}
            {activeConfigTab === 'persona' && (
              <div className="space-y-4 animate-fadeIn">
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

            {/* TAB 2: CODE CONTEXT ANALYZER */}
            {activeConfigTab === 'code' && (
              <div className="space-y-4 animate-fadeIn">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.sh,.md,.json,.html,.css,.txt"
                />

                {/* File Drop Region */}
                {!loadedFile ? (
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-800/60 text-slate-400 mx-auto flex items-center justify-center mb-3">
                      <i className="fa-solid fa-cloud-arrow-up text-sm"></i>
                    </div>
                    <span className="block text-xs font-semibold text-slate-300">
                      Drag / Drop code file or browse computer
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Supports TS, TSX, JS, PY, RS, JAVA, HTML, JSON, and MD
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                        <i className="fa-solid fa-file-code text-sm"></i>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-200">{loadedFile.name}</span>
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase font-mono tracking-wider font-semibold">
                            {loadedFile.language}
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                          <span>{loadedFile.lines} lines</span>
                          <span>&bull;</span>
                          <span>{(loadedFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={clearLoadedFile}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700/85 hover:text-rose-400 text-slate-400 border border-slate-700/50 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      <i className="fa-solid fa-trash-can mr-1.5"></i>
                      Detach Context
                    </button>
                  </div>
                )}

                {/* Workspace quick selections */}
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Quick Mount Live Project Files
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {WORKSPACE_FILES.map((file) => (
                      <button
                        key={file.name}
                        type="button"
                        onClick={() => handleLoadWorkspaceFile(file.name, file.path)}
                        disabled={fileLoading}
                        className={`px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 hover:border-slate-750 hover:bg-slate-850 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                          loadedFile && loadedFile.name === file.name 
                            ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400 font-medium' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <i className={`fa-solid ${loadedFile && loadedFile.name === file.name ? 'fa-check' : 'fa-code'} text-[10px]`}></i>
                        <span>{file.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analytical Model Presets Grid */}
                {loadedFile && (
                  <div className="pt-2 animate-fadeIn">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Available Analysis Operations
                    </span>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                      {CODE_FEATURES.map((feat) => (
                        <button
                          key={feat.id}
                          type="button"
                          onClick={() => handleExecuteFeature(feat.prompt, feat.name)}
                          disabled={loading}
                          className={`p-2.5 rounded-xl border bg-gradient-to-b text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex flex-col justify-between h-[78px] ${feat.color}`}
                        >
                          <i className={`fa-solid ${feat.icon} text-xs mt-0.5`}></i>
                          <div className="mt-1.5">
                            <span className="block font-semibold text-[10px] tracking-wide text-slate-200 uppercase">
                              {feat.name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {fileError && (
                  <div className="flex items-center gap-2 text-xs text-rose-400 py-1.5 px-3 rounded-lg border border-rose-500/20 bg-slate-950/85">
                    <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                    <span>{fileError}</span>
                  </div>
                )}

                {statusMessage && (
                  <div className="flex items-center gap-2 text-xs text-blue-400 py-1.5 px-3 rounded-lg border border-blue-500/20 bg-slate-950/85">
                    <i className="fa-solid fa-circle-info text-[10px]"></i>
                    <span>{statusMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>


      {/* Messages Filter & Search Bar */}
      <div className="mb-6 bg-slate-900/35 border border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_2px_15px_rgba(0,0,0,0.2)] hover:border-slate-800/80 transition-all">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-500">
            <i className="fa-solid fa-magnifying-glass text-xs"></i>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords inside chat stream..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans leading-relaxed"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3.5 flex items-center text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
              title="Clear search"
            >
              <i className="fa-solid fa-circle-xmark text-xs"></i>
            </button>
          )}
        </div>
        
        {searchQuery.trim() && (
          <div className="flex items-center gap-2 justify-between md:justify-end">
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/15 px-2.5 py-1.5 rounded-lg font-mono">
              Filtered: <strong className="font-semibold text-white">{filteredMessages.length}</strong> {filteredMessages.length === 1 ? 'match' : 'matches'}
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-900/40 px-2 py-1.5 rounded-lg cursor-pointer transition-all active:scale-[0.98]"
            >
              Show All
            </button>
          </div>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 pr-4 animate-fadeIn"
      >
        {filteredMessages.length === 0 && searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-950/20 border border-dashed border-slate-850 rounded-2xl animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-slate-900/60 border border-slate-800/80 text-slate-500 flex items-center justify-center mb-4">
              <i className="fa-solid fa-magnifying-glass-chart text-lg"></i>
            </div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">No Matches Found</h4>
            <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
              We couldn't locate any messages containing <span className="text-slate-450 font-semibold font-mono">"{searchQuery}"</span> in the current discussion.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all cursor-pointer shadow-md"
            >
              Clear Search Query
            </button>
          </div>
        ) : (
          filteredMessages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-6 py-4 shadow-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
              }`}>
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{highlightNode(m.content, searchQuery)}</p>
                ) : (
                  <div className="markdown-body">
                    <Markdown
                      components={{
                        pre: ({ children }) => <PreCodeBlock>{highlightNode(children, searchQuery)}</PreCodeBlock>,
                        code: ({ children, className }) => {
                          const isInline = !className;
                          if (isInline) {
                            return (
                              <code className="bg-slate-950/80 text-blue-400 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-700/50">
                                {highlightNode(children, searchQuery)}
                              </code>
                            );
                          }
                          return <code className={`${className} font-mono text-sm`}>{highlightNode(children, searchQuery)}</code>;
                        },
                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-sm md:text-base text-slate-200">{highlightNode(children, searchQuery)}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-300">{highlightNode(children, searchQuery)}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-300">{highlightNode(children, searchQuery)}</ol>,
                        li: ({ children }) => <li className="mb-0.5 text-sm md:text-base text-slate-300">{highlightNode(children, searchQuery)}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-slate-100">{highlightNode(children, searchQuery)}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 text-slate-100">{highlightNode(children, searchQuery)}</h2>,
                        h3: ({ children }) => <h3 className="text-md font-bold mt-2 mb-1 text-slate-100">{highlightNode(children, searchQuery)}</h3>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{highlightNode(children, searchQuery)}</strong>,
                        em: ({ children }) => <em className="italic text-slate-300">{highlightNode(children, searchQuery)}</em>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-medium break-all">{highlightNode(children, searchQuery)}</a>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-600 pl-4 py-1 my-3 bg-slate-900/30 text-slate-400 rounded-r-lg italic">{highlightNode(children, searchQuery)}</blockquote>,
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
          ))
        )}
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

      {loadedFile && (
        <div className="mt-6 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-xs text-emerald-400 font-mono">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-paperclip text-[10px]"></i>
            <span className="font-semibold text-emerald-500">Active Code Context:</span>
            <span className="text-slate-200">{loadedFile.name}</span>
            <span className="text-slate-500">({loadedFile.lines} lines, {loadedFile.language})</span>
          </div>
          <button 
            type="button"
            onClick={clearLoadedFile}
            className="hover:text-rose-400 font-bold px-2 py-1 cursor-pointer transition-colors"
            title="Detach file"
          >
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      )}

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

        {/* Session Export dropdown */}
        <div className="relative" ref={exportContainerRef}>
          <button
            type="button"
            onClick={() => setIsExportOpen(!isExportOpen)}
            title="Export conversation history"
            className={`px-4 py-2 text-xs font-mono h-12 rounded-xl border flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 ${isExportOpen ? 'text-slate-100 bg-slate-800 border-slate-600' : ''}`}
          >
            <i className="fa-solid fa-download"></i>
            <span>Export</span>
            <i className={`fa-solid fa-chevron-up text-[9px] transition-transform duration-200 ${isExportOpen ? 'rotate-180 text-blue-400' : ''}`}></i>
          </button>

          {isExportOpen && (
            <div className="absolute bottom-14 left-0 w-44 bg-slate-950 border border-slate-800 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.5)] p-1.5 z-50 space-y-1 animate-fadeIn">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-900 mb-1">
                Save Format
              </div>
              <button
                type="button"
                onClick={() => {
                  exportAsMarkdown();
                  setIsExportOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-350 hover:text-white hover:bg-slate-900 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer font-sans"
              >
                <i className="fa-solid fa-file-lines text-blue-400 w-4 text-center"></i>
                <span className="font-semibold">Markdown (.md)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportAsJSON();
                  setIsExportOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-350 hover:text-white hover:bg-slate-900 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer font-sans"
              >
                <i className="fa-solid fa-file-code text-amber-400 w-4 text-center"></i>
                <span className="font-semibold">JSON Schema (.json)</span>
              </button>
            </div>
          )}
        </div>

        {/* Summarize button */}
        <button
          type="button"
          onClick={handleGenerateSummary}
          title="Summarize conversation using Gemini"
          className="px-4 py-2 text-xs font-mono h-12 rounded-xl border flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-600 active:scale-95 shrink-0"
        >
          <i className="fa-solid fa-wand-magic-sparkles text-indigo-400"></i>
          <span>Summarize</span>
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

      {/* Session Summarizer Modal */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setSummaryModalOpen(false)} 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Modal Container */}
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-fadeIn z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/40 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <i className="fa-solid fa-wand-magic-sparkles text-sm"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider">Conversation Summary</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Synthesized overview by Gemini AI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-800 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                title="Close modal"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Display Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative flex items-center justify-center mb-4">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                    <i className="fa-solid fa-wand-magic-sparkles text-indigo-400 absolute text-xs animate-pulse"></i>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">Synthesizing Session...</h4>
                  <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                    Analyzing conversation history and drafting key logically targeted discussion points.
                  </p>
                </div>
              ) : summaryError ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-rose-500/5 border border-dashed border-rose-500/20 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-rose-900/40 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                    <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest">Synthesis Failed</h4>
                  <p className="text-xs text-rose-400/80 mt-2 max-w-sm leading-relaxed font-mono">
                    {summaryError}
                  </p>
                </div>
              ) : (
                <div className="markdown-body space-y-3 prose prose-invert max-w-none">
                  <Markdown
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-slate-200 text-xs md:text-sm">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-300 text-xs md:text-sm">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-300 text-xs md:text-sm">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5 text-slate-300 text-xs md:text-sm">{children}</li>,
                      h1: ({ children }) => <h1 className="text-base font-bold mt-4 mb-2 text-slate-100 border-b border-slate-800 pb-1 uppercase tracking-wide text-indigo-400">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-2 text-slate-100 uppercase tracking-wide text-indigo-400">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xs font-bold mt-2 mb-1 text-slate-100">{children}</h3>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                      hr: () => <hr className="my-4 border-slate-800" />
                    }}
                  >
                    {summaryText}
                  </Markdown>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-500 font-mono">
                {summaryText ? `${summaryText.split(/\s+/).length} words parsed` : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSummaryModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-all cursor-pointer"
                >
                  Close
                </button>
                {summaryText && !summaryError && !summaryLoading && (
                  <button
                    type="button"
                    onClick={copySummaryToClipboard}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      summaryCopied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <i className={`fa-solid ${summaryCopied ? 'fa-check' : 'fa-copy'}`}></i>
                    <span>{summaryCopied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSection;
