import React from 'react';
import { Personality } from '../types';

interface PersonalityCardProps {
  personality: Personality;
  isSelected: boolean;
  onClick: () => void;
}

const PersonalityCard: React.FC<PersonalityCardProps> = ({ personality, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-all duration-200 border group
        ${isSelected 
          ? `bg-surface border-${personality.themeColor.replace('bg-', '')} shadow-lg shadow-${personality.themeColor.replace('bg-', '')}/20` 
          : 'bg-transparent border-transparent hover:bg-surface/50 text-slate-400 hover:text-slate-200'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner
          ${isSelected ? personality.themeColor + ' text-white' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}
        `}>
          {personality.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
            {personality.name}
          </h3>
          <p className="text-xs text-slate-500 truncate group-hover:text-slate-400">
            {personality.description}
          </p>
        </div>
        {isSelected && (
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        )}
      </div>
    </button>
  );
};

export default PersonalityCard;
