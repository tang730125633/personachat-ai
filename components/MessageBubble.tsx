import React from 'react';
import { Message, Personality } from '../types';

interface MessageBubbleProps {
  message: Message;
  personality: Personality;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, personality }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md mt-1
          ${isUser ? 'bg-indigo-600 text-white' : `${personality.themeColor} text-white`}
        `}>
          {isUser ? 'You' : personality.avatar}
        </div>

        {/* Bubble */}
        <div className={`
          px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap
          ${isUser 
            ? 'bg-indigo-600 text-white rounded-tr-sm' 
            : 'bg-surface text-slate-200 rounded-tl-sm border border-slate-700/50'
          }
        `}>
          {message.text}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
