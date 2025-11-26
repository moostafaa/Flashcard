export const API_BASE_URL = '/api'; // This would be handled by Cloudflare Workers

export const ENDPOINTS = {
  FLASHCARDS: `${API_BASE_URL}/flashcards`,
  GEMINI_DEFINITION: `${API_BASE_URL}/gemini/definition`,
  GEMINI_SUGGESTIONS: `${API_BASE_URL}/gemini/suggestions`,
  GEMINI_TTS: `${API_BASE_URL}/gemini/speech`, // Added for TTS proxy
};

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash';
export const GEMINI_MODEL_TTS = 'gemini-2.5-flash-preview-tts';

export const TTS_VOICES = [
  { name: 'Zephyr', label: 'US English (Zephyr)' },
  { name: 'Kore', label: 'UK English (Kore)' },
  { name: 'Puck', label: 'Australian English (Puck)' },
  { name: 'Charon', label: 'Indian English (Charon)' },
  { name: 'Fenrir', label: 'Irish English (Fenrir)' },
];