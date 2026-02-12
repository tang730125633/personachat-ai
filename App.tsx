import React, { useState, useEffect, useRef } from 'react';
import { PERSONALITIES, DEFAULT_PERSONALITY } from './constants';
import { Message, Personality, ChatStatus } from './types';
import { geminiService } from './services/geminiService';
import PersonalityCard from './components/PersonalityCard';
import MessageBubble from './components/MessageBubble';
import { v4 as uuidv4 } from 'uuid'; // Actually we don't need uuid dependency if we make simple ids, let's use Date.now() for simplicity to avoid import issues in this env

// Simple ID generator since we can't easily rely on external npm packages in this specific output format if they aren't standard
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const App: React.FC = () => {
  const [activePersonality, setActivePersonality] = useState<Personality>(DEFAULT_PERSONALITY);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize chat when personality changes
  useEffect(() => {
    geminiService.startChat(activePersonality);
    setMessages([
      {
        id: generateId(),
        role: 'model',
        text: activePersonality.greeting,
        timestamp: Date.now(),
      },
    ]);
    setStatus('idle');
  }, [activePersonality]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || status === 'thinking' || status === 'streaming') return;

    const userMsgText = inputText.trim();
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      text: userMsgText,
      timestamp: Date.now(),
    };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMessage]);
    setStatus('thinking');

    try {
      // Create a placeholder for the bot response
      const botMessageId = generateId();
      let fullResponse = "";
      
      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          role: 'model',
          text: "", // Start empty
          timestamp: Date.now(),
        },
      ]);

      setStatus('streaming');

      const stream = geminiService.sendMessageStream(userMsgText);

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === botMessageId ? { ...msg, text: fullResponse } : msg
          )
        );
      }

      setStatus('idle');
    } catch (error) {
      console.error("Failed to send message", error);
      setStatus('error');
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'model',
          text: "I'm having trouble connecting to my brain right now. Please try again.",
          timestamp: Date.now(),
        }
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full bg-darker text-slate-200 font-sans">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Personality Selector */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 bg-dark border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 00-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 01-.189-.866c0-.298.059-.605.189-.866zm2.023 6.828a.75.75 0 10-1.06-1.06 3.75 3.75 0 01-5.304 0 .75.75 0 00-1.06 1.06 5.25 5.25 0 007.424 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="font-bold text-lg tracking-tight">PersonaChat AI</h1>
          </div>
          <p className="text-xs text-slate-500 mt-2">Switch personalities to change the vibe.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {PERSONALITIES.map((personality) => (
            <PersonalityCard
              key={personality.id}
              personality={personality}
              isSelected={activePersonality.id === personality.id}
              onClick={() => {
                setActivePersonality(personality);
                setIsSidebarOpen(false);
              }}
            />
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-600 text-center">
          Powered by Google Gemini
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-800/50 bg-darker/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 absolute top-0 left-0 right-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">{activePersonality.avatar}</span>
              <div>
                <h2 className="font-bold text-slate-200 leading-tight">{activePersonality.name}</h2>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${status === 'idle' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`}></span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                    {status === 'idle' ? 'Online' : status === 'thinking' ? 'Thinking' : 'Typing'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto pt-20 pb-4 px-4 lg:px-8 scroll-smooth">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                personality={activePersonality} 
              />
            ))}
            
            {/* Typing Indicator */}
            {status === 'thinking' && (
              <div className="flex w-full mb-6 animate-fade-in justify-start">
                <div className="flex max-w-[75%] gap-3">
                   <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md mt-1
                    ${activePersonality.themeColor} text-white
                  `}>
                    {activePersonality.avatar}
                  </div>
                  <div className="bg-surface px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-700/50 flex items-center gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-darker border-t border-slate-800">
          <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-surface rounded-3xl border border-slate-700 p-2 shadow-xl">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activePersonality.name}...`}
              disabled={status === 'thinking' || status === 'streaming'}
              className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 focus:ring-0 resize-none max-h-32 py-3 px-4"
              rows={1}
              style={{ minHeight: '48px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || status === 'thinking' || status === 'streaming'}
              className={`
                p-3 rounded-full flex-shrink-0 transition-all duration-200 mb-0.5
                ${!inputText.trim() || status !== 'idle'
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                  : `bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25`
                }
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-slate-600 text-[10px] mt-2">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
