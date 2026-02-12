import React, { useState, useEffect, useRef } from 'react';
import { PERSONALITIES, DEFAULT_PERSONALITY } from './constants';
import { Message, Personality, ChatStatus } from './types';
import { geminiService } from './services/geminiService';
import PersonalityCard from './components/PersonalityCard';
import MessageBubble from './components/MessageBubble';

// Simple ID generator
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Storage key for API Key
const API_KEY_STORAGE_KEY = 'personachat_api_key';

const App: React.FC = () => {
  const [activePersonality, setActivePersonality] = useState<Personality>(DEFAULT_PERSONALITY);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [showPersonalityPanel, setShowPersonalityPanel] = useState(false);

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load API Key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
      setApiKey(savedApiKey);
      try {
        geminiService.initialize(savedApiKey);
        setIsApiKeySet(true);
      } catch (e) {
        console.error('Failed to initialize with saved API key:', e);
      }
    }
  }, []);

  // Initialize chat when personality changes (only if API key is set)
  useEffect(() => {
    if (!isApiKeySet) return;

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
  }, [activePersonality, isApiKeySet]);

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

  // Handle API Key submission
  const handleApiKeySubmit = () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setApiKeyError('请输入 API Key');
      return;
    }

    if (!trimmedKey.startsWith('AIza')) {
      setApiKeyError('API Key 格式不正确，Google API Key 应以 "AIza" 开头');
      return;
    }

    try {
      geminiService.initialize(trimmedKey);
      localStorage.setItem(API_KEY_STORAGE_KEY, trimmedKey);
      setIsApiKeySet(true);
      setApiKeyError('');
    } catch (e) {
      setApiKeyError('初始化失败，请检查 API Key 是否正确');
    }
  };

  // Clear API Key
  const handleClearApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setIsApiKeySet(false);
    setMessages([]);
  };

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

    setMessages((prev) => [...prev, userMessage]);
    setStatus('thinking');

    try {
      const botMessageId = generateId();
      let fullResponse = "";

      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          role: 'model',
          text: "",
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
          text: "抱歉，连接 AI 服务时出错。请检查你的 API Key 是否有效，或稍后再试。",
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

  // API Key Input Screen
  if (!isApiKeySet) {
    return (
      <div className="min-h-screen w-full bg-[#f6d8c6] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#B88E2F] p-6 text-center">
            <h1 className="text-2xl font-bold text-white">PersonaChat</h1>
            <p className="text-white/80 text-sm mt-1">智能对话，个性体验</p>
          </div>
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">开始对话</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                    placeholder="AIza..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B88E2F] focus:border-transparent pr-12"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    type="button"
                  >
                    {showApiKey ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {apiKeyError && (
                  <p className="text-red-500 text-sm mt-2">{apiKeyError}</p>
                )}
              </div>

              <button
                onClick={handleApiKeySubmit}
                className="w-full bg-[#B88E2F] hover:bg-[#a07d28] text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                开始使用
              </button>

              <div className="text-center text-gray-500 text-sm space-y-2 pt-4 border-t border-gray-100">
                <p>还没有 API Key？</p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#B88E2F] hover:text-[#a07d28] inline-flex items-center gap-1 font-medium"
                >
                  免费获取 Google Gemini API Key
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span>你的 API Key 仅存储在本地浏览器中，不会上传到任何服务器。</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f6d8c6]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#B88E2F] rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 00-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 01-.189-.866c0-.298.059-.605.189-.866zm2.023 6.828a.75.75 0 10-1.06-1.06 3.75 3.75 0 01-5.304 0 .75.75 0 00-1.06 1.06 5.25 5.25 0 007.424 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-800">PersonaChat</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => setShowPersonalityPanel(!showPersonalityPanel)}
                className="text-gray-600 hover:text-[#B88E2F] font-medium transition-colors flex items-center gap-2"
              >
                <span>{activePersonality.avatar}</span>
                <span>{activePersonality.name}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={handleClearApiKey}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                退出
              </button>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowPersonalityPanel(!showPersonalityPanel)}
              className="md:hidden p-2 text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Personality Panel */}
          <div className={`lg:col-span-1 ${showPersonalityPanel ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">选择角色</h2>
              <div className="space-y-3">
                {PERSONALITIES.map((personality) => (
                  <button
                    key={personality.id}
                    onClick={() => {
                      setActivePersonality(personality);
                      setShowPersonalityPanel(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                      activePersonality.id === personality.id
                        ? 'bg-[#B88E2F] text-white shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-2xl">{personality.avatar}</span>
                    <div>
                      <p className="font-medium">{personality.name}</p>
                      <p className={`text-xs ${activePersonality.id === personality.id ? 'text-white/80' : 'text-gray-500'}`}>
                        {personality.description.slice(0, 20)}...
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden min-h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-[#B88E2F] to-[#d4a84a] px-6 py-4 flex items-center gap-3">
                <span className="text-3xl">{activePersonality.avatar}</span>
                <div className="text-white">
                  <h2 className="font-bold text-lg">{activePersonality.name}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${status === 'idle' ? 'bg-green-300' : 'bg-yellow-300 animate-pulse'}`}></span>
                    <span className="text-xs text-white/80">
                      {status === 'idle' ? '在线' : status === 'thinking' ? '思考中...' : '输入中...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[400px] max-h-[500px]">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-6xl mb-4">{activePersonality.avatar}</span>
                    <p className="text-lg">开始和 {activePersonality.name} 对话吧</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-5 py-3 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-[#B88E2F] text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {/* Typing Indicator */}
                {status === 'thinking' && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-5 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                <div className="flex items-end gap-2 bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`给 ${activePersonality.name} 发送消息...`}
                    disabled={status === 'thinking' || status === 'streaming'}
                    className="flex-1 bg-transparent border-none text-gray-700 placeholder-gray-400 focus:ring-0 resize-none max-h-32 py-2 px-3 outline-none"
                    rows={1}
                    style={{ minHeight: '40px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || status === 'thinking' || status === 'streaming'}
                    className={`
                      p-2.5 rounded-lg flex-shrink-0 transition-all duration-200
                      ${!inputText.trim() || status !== 'idle'
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#B88E2F] text-white hover:bg-[#a07d28]'
                      }
                    `}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  </button>
                </div>
                <p className="text-center text-gray-400 text-xs mt-2">
                  AI 可能会犯错，请核实重要信息。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
