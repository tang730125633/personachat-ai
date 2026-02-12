import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Personality } from "../types";

const API_KEY = (process as any).env?.GEMINI_API_KEY || '';

class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  private currentModel: string = 'gemini-3-flash-preview';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  // Initialize or reset a chat session with a specific personality
  startChat(personality: Personality) {
    this.chatSession = this.ai.chats.create({
      model: this.currentModel,
      config: {
        systemInstruction: personality.systemInstruction,
      },
    });
  }

  // Send a message and yield chunks for streaming
  async *sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
    if (!this.chatSession) {
      throw new Error("Chat session not initialized.");
    }

    try {
      const result = await this.chatSession.sendMessageStream({ message });

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          yield c.text;
        }
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

// Singleton instance
export const geminiService = new GeminiService();
