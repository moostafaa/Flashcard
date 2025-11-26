import { Flashcard, ApiResponse } from '../types';
import { ENDPOINTS } from '../constants';

// This service simulates interaction with a Cloudflare Worker backend.
// In a real application, these fetch calls would hit your Worker's routes.

export const flashcardService = {
  async getFlashcards(): Promise<ApiResponse<Flashcard[]>> {
    try {
      const response = await fetch(ENDPOINTS.FLASHCARDS);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch flashcards: ${response.status} ${errorText}`);
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
      const newFlashcard: Flashcard = {
        ...flashcard,
        id: crypto.randomUUID(), // Client-side ID for simulation
        createdAt: Date.now(),
        dueDate: Date.now(), // Due immediately upon creation
        interval: 0,
      };
      const response = await fetch(ENDPOINTS.FLASHCARDS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFlashcard),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add flashcard: ${response.status} ${errorText}`);
      }
      // Assuming the worker returns the created flashcard
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
        const errorText = await response.text();
        throw new Error(`Failed to update flashcard: ${response.status} ${errorText}`);
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
        const errorText = await response.text();
        throw new Error(`Failed to delete flashcard: ${response.status} ${errorText}`);
      }
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error deleting flashcard:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },
};
