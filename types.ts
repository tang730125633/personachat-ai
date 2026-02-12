export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Personality {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  avatar: string; // Emoji or generic avatar placeholder
  themeColor: string;
  greeting: string;
}

export type ChatStatus = 'idle' | 'thinking' | 'streaming' | 'error';