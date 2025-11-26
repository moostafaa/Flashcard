export interface Flashcard {
  id: string;
  word: string;
  definition: string;
  exampleSentence?: string;
  createdAt: number;
  lastReviewedAt?: number;
  dueDate?: number;
  interval?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GeminiDefinitionResponse {
  word: string;
  definition: string;
  exampleSentence?: string;
}

export interface GeminiSuggestionsResponse {
  suggestions: GeminiDefinitionResponse[];
}
