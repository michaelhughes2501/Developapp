
import React, { useState, useRef, useEffect } from 'react';
import { getAIClient, encode, decode, decodeAudioData } from '../services/geminiService';
import { LiveServerMessage, Modality } from '@google/genai';
import { MODELS } from '../constants';

const LiveSection: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopSession = () => {
    setIsActive(false);
    if (sessionRef.current) {
      // In a real scenario, we'd close it, but session closing is handled by garbage collection or explicit close if the API supports it
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    
    audioContextRef.current = null;
    outputAudioContextRef.current = null;
    sourcesRef.current.clear();
  };

  const startSession = async () => {
    try {
      setError(null);
      const ai = getAIClient();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: MODELS.LIVE,
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            if (message.serverContent?.inputTranscription) {
               setTranscript(prev => [...prev, `User: ${message.serverContent?.inputTranscription?.text}`]);
            }
            if (message.serverContent?.outputTranscription) {
               setTranscript(prev => [...prev, `Gemini: ${message.serverContent?.outputTranscription?.text}`]);
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputCtx;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live Error:", e);
            setError("Connection error occurred.");
            stopSession();
          },
          onclose: () => {
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "You are a friendly, concise AI assistant in a live voice session. Keep responses natural and conversational."
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start microphone access.");
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="relative mb-12">
          {/* Animated rings */}
          <div className={`absolute inset-0 bg-blue-500/20 rounded-full scale-[2.5] blur-xl transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className={`absolute inset-0 bg-blue-500/10 rounded-full scale-[3.5] blur-2xl transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
          
          <button
            onClick={isActive ? stopSession : startSession}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
              isActive 
                ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_50px_rgba(239,68,68,0.4)]' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.4)]'
            }`}
          >
            <i className={`fa-solid ${isActive ? 'fa-phone-slash' : 'fa-microphone'} text-4xl text-white`}></i>
          </button>
        </div>

        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold mb-2">{isActive ? 'Live Interaction Active' : 'Start Voice Conversation'}</h3>
          <p className="text-slate-400">
            {isActive ? 'Gemini is listening... Say hello!' : 'Talk to Gemini in real-time with ultra-low latency.'}
          </p>
          {error && <p className="mt-4 text-red-400 font-medium">{error}</p>}
        </div>

        {/* Live Transcription Box */}
        <div className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-6 h-64 overflow-y-auto space-y-3 font-mono text-sm shadow-inner">
          <div className="text-slate-500 text-xs uppercase mb-4 sticky top-0 bg-slate-950/80 py-1">Session Transcript</div>
          {transcript.length === 0 && <p className="text-slate-700 italic">Capturing speech...</p>}
          {transcript.map((line, i) => (
            <div key={i} className={`p-3 rounded-xl ${line.startsWith('User:') ? 'bg-blue-600/10 text-blue-300' : 'bg-slate-800/50 text-slate-300'}`}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveSection;
