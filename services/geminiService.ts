import { ApiResponse, GeminiDefinitionResponse, GeminiSuggestionsResponse } from '../types';
import { ENDPOINTS } from '../constants'; // No longer importing Modality or Type as Gemini calls are proxied

// Helper functions for audio decoding (from guidelines) - still needed client-side for playback
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const geminiService = {
  async generateDefinition(word: string): Promise<ApiResponse<GeminiDefinitionResponse>> {
    try {
      const response = await fetch(ENDPOINTS.GEMINI_DEFINITION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word }),
      });
      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || `Failed to generate definition: ${response.status}`);
      }
      const data: GeminiDefinitionResponse = await response.json();
      return { success: true, data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during definition generation';
      console.error('Error generating definition:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  async suggestWords(count: number = 3, theme?: string): Promise<ApiResponse<GeminiSuggestionsResponse>> {
    try {
      const response = await fetch(ENDPOINTS.GEMINI_SUGGESTIONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count, theme }),
      });
      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || `Failed to fetch word suggestions: ${response.status}`);
      }
      const data: { suggestions: GeminiDefinitionResponse[] } = await response.json(); // Worker returns { suggestions: [...] }
      return { success: true, data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during word suggestion';
      console.error('Error suggesting words:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  async generateSpeech(text: string, voiceName: string = 'Zephyr'): Promise<ApiResponse<string>> {
    try {
      const response = await fetch(ENDPOINTS.GEMINI_TTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voiceName }),
      });
      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || `Failed to generate speech: ${response.status}`);
      }
      const data: { data: string } = await response.json(); // Worker returns { data: base64Audio }
      return { success: true, data: data.data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during speech generation';
      console.error('Error generating speech:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  decodeAudioData, // Export for use in components
  decode, // Export for use in components
};