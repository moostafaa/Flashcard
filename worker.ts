/// <reference types="@cloudflare/workers-types" />

// Workaround for missing @cloudflare/workers-types definitions
// if the /// <reference> directive is not picked up by the environment.
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(): Promise<{ keys: { name: string }[] }>;
  delete(key: string): Promise<void>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
}

import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Flashcard, GeminiDefinitionResponse, GeminiSuggestionsResponse } from "./types"; // Assuming types.ts is available to the worker bundler

// Define the environment variables and KV namespace bindings
export interface Env {
  FLASHCARDS_KV: KVNamespace;
  API_KEY: string; // Gemini API Key
}

// Helper function to create JSON responses with CORS headers
function createJsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Allow all for now, adjust for production
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    },
    status: status,
  });
}

// Helper function to create JSON error responses with CORS headers
function createErrorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Allow all for now, adjust for production
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    },
    status: status,
  });
}

// Gemini Response Schemas (re-defined here for worker self-containment, or could be imported if bundler handles it)
const geminiDefinitionSchema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    definition: { type: Type.STRING },
    exampleSentence: { type: Type.STRING, nullable: true },
  },
  required: ['word', 'definition'],
};

const geminiSuggestionsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      definition: { type: Type.STRING },
      exampleSentence: { type: Type.STRING, nullable: true },
    },
    required: ['word', 'definition'],
  },
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle preflight OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // --- Flashcard API Endpoints ---
    if (path.startsWith('/api/flashcards')) {
      if (!env.FLASHCARDS_KV) {
        return createErrorResponse('KV Namespace (FLASHCARDS_KV) not configured.', 500);
      }

      // GET all flashcards
      if (path === '/api/flashcards' && request.method === 'GET') {
        try {
          const { keys } = await env.FLASHCARDS_KV.list();
          const flashcardPromises = keys
            .map(async (key) => {
              const value = await env.FLASHCARDS_KV.get(key.name);
              return value ? JSON.parse(value) : null;
            });
          const flashcards = (await Promise.all(flashcardPromises)).filter(Boolean) as Flashcard[];
          return createJsonResponse(flashcards);
        } catch (e: any) {
          return createErrorResponse(`Failed to retrieve flashcards: ${e.message}`, 500);
        }
      } 
      // POST a new flashcard
      else if (path === '/api/flashcards' && request.method === 'POST') {
        try {
          const newFlashcardData: Omit<Flashcard, 'id' | 'createdAt' | 'dueDate' | 'interval'> = await request.json();
          const id = crypto.randomUUID();
          const createdAt = Date.now();
          const dueDate = Date.now(); // Due immediately upon creation
          const interval = 0;

          const flashcard: Flashcard = {
            ...newFlashcardData,
            id,
            createdAt,
            dueDate,
            interval,
          };

          await env.FLASHCARDS_KV.put(id, JSON.stringify(flashcard));
          return createJsonResponse(flashcard, 201);
        } catch (e: any) {
          return createErrorResponse(`Failed to add flashcard: ${e.message}`, 400);
        }
      } 
      // PUT (update) or DELETE a specific flashcard
      else if (path.startsWith('/api/flashcards/')) {
        const id = path.split('/').pop();
        if (!id) {
            return createErrorResponse('Flashcard ID is missing.', 400);
        }

        if (request.method === 'PUT') {
          try {
            const updatedData: Flashcard = await request.json();
            if (updatedData.id !== id) {
              return createErrorResponse('Flashcard ID in path and body do not match.', 400);
            }
            await env.FLASHCARDS_KV.put(id, JSON.stringify(updatedData));
            return createJsonResponse(updatedData);
          } catch (e: any) {
            return createErrorResponse(`Failed to update flashcard: ${e.message}`, 400);
          }
        } else if (request.method === 'DELETE') {
          try {
            await env.FLASHCARDS_KV.delete(id);
            return new Response(null, { 
              status: 204, 
              headers: { 
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
              }
            });
          } catch (e: any) {
            return createErrorResponse(`Failed to delete flashcard: ${e.message}`, 500);
          }
        }
      }
      return createErrorResponse('Method Not Allowed for Flashcards API.', 405);
    }

    // --- Gemini API Endpoints ---
    if (path.startsWith('/api/gemini')) {
      if (!env.API_KEY) {
        return createErrorResponse('Gemini API Key is not configured in worker environment variables (API_KEY).', 500);
      }
      // Always initialize GoogleGenAI here to ensure the latest API key is used, if applicable for Veo.
      // Although not directly relevant to current functionality, it aligns with best practices from the guidelines.
      const ai = new GoogleGenAI({ apiKey: env.API_KEY });

      // POST /api/gemini/definition
      if (path === '/api/gemini/definition' && request.method === 'POST') {
        try {
          const { word } = await request.json();
          const prompt = `Provide a concise definition and a simple example sentence for the word "${word}". Return the response in JSON format with 'word', 'definition', and 'exampleSentence' keys.`;

          const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
              responseMimeType: "application/json",
              responseSchema: geminiDefinitionSchema,
            },
          });

          const jsonStr = geminiResponse.text.trim();
          const cleanJsonStr = jsonStr.startsWith('```json') && jsonStr.endsWith('```')
            ? jsonStr.slice(7, -3).trim()
            : jsonStr;
          const data: GeminiDefinitionResponse = JSON.parse(cleanJsonStr);
          return createJsonResponse(data);
        } catch (e: any) {
          console.error("Gemini definition error:", e);
          return createErrorResponse(`Gemini definition error: ${e.message || 'Unknown error'}`, 500);
        }
      } 
      // POST /api/gemini/suggestions
      else if (path === '/api/gemini/suggestions' && request.method === 'POST') {
        try {
          const { count = 3, theme } = await request.json();
          const themePrompt = theme ? ` related to the theme "${theme}"` : '';
          const prompt = `Suggest ${count} common English words, each with a concise definition and a simple example sentence${themePrompt}. Return the response in JSON format as an array of objects, each with 'word', 'definition', and 'exampleSentence' keys.`;

          const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
              responseMimeType: "application/json",
              responseSchema: geminiSuggestionsSchema,
            },
          });

          const jsonStr = geminiResponse.text.trim();
          const cleanJsonStr = jsonStr.startsWith('```json') && jsonStr.endsWith('```')
            ? jsonStr.slice(7, -3).trim()
            : jsonStr;
          const suggestions: GeminiDefinitionResponse[] = JSON.parse(cleanJsonStr);
          return createJsonResponse({ suggestions });
        } catch (e: any) {
          console.error("Gemini suggestions error:", e);
          return createErrorResponse(`Gemini suggestions error: ${e.message || 'Unknown error'}`, 500);
        }
      } 
      // POST /api/gemini/speech (TTS)
      else if (path === '/api/gemini/speech' && request.method === 'POST') {
        try {
          const { text, voiceName = 'Zephyr' } = await request.json();
          const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: text }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName },
                },
              },
            },
          });
          const base64Audio = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            return createJsonResponse({ data: base64Audio });
          } else {
            return createErrorResponse('No audio data received from Gemini TTS.', 500);
          }
        } catch (e: any) {
          console.error("Gemini speech error:", e);
          return createErrorResponse(`Gemini speech error: ${e.message || 'Unknown error'}`, 500);
        }
      }
      return createErrorResponse('Gemini API endpoint not found or method not allowed.', 404);
    }

    // For any non-API requests, return a 404.
    // In a real PWA deployment with Cloudflare Workers/Pages, static assets (index.html, index.tsx, etc.)
    // would be served by the hosting environment, and the worker would primarily handle API routes.
    return new Response('Not Found', { status: 404 });
  },
};