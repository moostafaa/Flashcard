import { Flashcard, ApiResponse } from '../types';
import { ENDPOINTS } from '../constants';

// This service simulates interaction with a Cloudflare Worker backend.
// In a real application, these fetch calls would hit your Worker's routes.

// Helper to parse error responses
async function parseErrorResponse(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type');
  let errorBody: any;
  if (contentType && contentType.includes('application/json')) {
    try {
      errorBody = await response.json();
    } catch (e) {
      // Fallback if JSON parsing fails despite header
      errorBody = await response.text();
    }
  } else {
    errorBody = await response.text();
  }
  return typeof errorBody === 'string' ? errorBody : (errorBody.error || `Unknown error (${response.status})`);
}

export const flashcardService = {
  async getFlashcards(): Promise<ApiResponse<Flashcard[]>> {
    try {
      const response = await fetch(ENDPOINTS.FLASHCARDS);
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(`Failed to fetch flashcards: ${response.status} ${errorMessage}`);
      }
      const data: Flashcard[] = await response.json();
      return { success: true, data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error fetching flashcards:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  async addFlashcard(flashcard: Omit<Flashcard, 'id' | 'createdAt' | 'dueDate' | 'interval'>): Promise<ApiResponse<Flashcard>> {
    try {
      // Client-side ID generation is now primarily for initial UI state/type conformity,
      // the worker will generate the canonical ID, createdAt, dueDate, interval.
      // We pass the raw data and let the worker handle metadata.
      const response = await fetch(ENDPOINTS.FLASHCARDS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flashcard), // Send only the data the user provides
      });
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(`Failed to add flashcard: ${response.status} ${errorMessage}`);
      }
      // Assuming the worker returns the created flashcard with its ID and metadata
      const data: Flashcard = await response.json();
      return { success: true, data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error adding flashcard:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  async updateFlashcard(flashcard: Flashcard): Promise<ApiResponse<Flashcard>> {
    try {
      const response = await fetch(`${ENDPOINTS.FLASHCARDS}/${flashcard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flashcard),
      });
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(`Failed to update flashcard: ${response.status} ${errorMessage}`);
      }
      const data: Flashcard = await response.json();
      return { success: true, data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error updating flashcard:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  async deleteFlashcard(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${ENDPOINTS.FLASHCARDS}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(`Failed to delete flashcard: ${response.status} ${errorMessage}`);
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error deleting flashcard:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },
};