import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Personality } from "../types";

class GeminiService {
  private ai: GoogleGenAI | null = null;
  private chatSession: Chat | null = null;
  private currentModel: string = 'gemini-2.0-flash';
  private apiKey: string = '';

  // Initialize with API key
  initialize(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("API Key is required");
    }
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({ apiKey });
  }

  // Check if service is initialized
  isInitialized(): boolean {
    return this.ai !== null;
  }

  // Initialize or reset a chat session with a specific personality
  startChat(personality: Personality) {
    if (!this.ai) {
      throw new Error("GeminiService not initialized. Please set API Key first.");
    }
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
