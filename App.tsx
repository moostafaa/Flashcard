import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Flashcard, GeminiDefinitionResponse } from './types';
import { flashcardService } from './services/flashcardService';
import { geminiService } from './services/geminiService';
import Navbar from './components/Navbar';
import FlashcardCard from './components/FlashcardCard';
import AddWordForm from './components/AddWordForm';
import Button from './components/Button';
import LoadingSpinner from './components/LoadingSpinner';
import WordSuggestionCard from './components/WordSuggestionCard';
import Input from './components/Input';
import { TTS_VOICES } from './constants'; // Import TTS_VOICES
import { ENDPOINTS } from './constants'; // Import ENDPOINTS to log the URL

const App: React.FC = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const navigate = useNavigate();

  const [suggestedWords, setSuggestedWords] = useState<GeminiDefinitionResponse[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionTheme, setSuggestionTheme] = useState('');
  const [addingSuggestionWord, setAddingSuggestionWord] = useState<string | null>(null);

  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext if it doesn't exist
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({sampleRate: 24000});
    }
    // Cleanup AudioContext on unmount
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
        audioContextRef.current = null;
      }
    };
  }, []);

  // Spaced Repetition System logic (simplified)
  const calculateNextDueDate = useCallback((flashcard: Flashcard, success: boolean): Flashcard => {
    let newInterval = flashcard.interval || 0;
    if (success) {
      newInterval = Math.max(1, newInterval === 0 ? 1 : newInterval * 2); // Double interval, min 1 day
    } else {
      newInterval = Math.max(0, newInterval / 2); // Halve interval, min 0 days
    }

    const newDueDate = Date.now() + newInterval * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    return {
      ...flashcard,
      lastReviewedAt: Date.now(),
      interval: newInterval,
      dueDate: newDueDate,
    };
  }, []);

  const fetchFlashcards = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("Attempting to fetch flashcards from:", ENDPOINTS.FLASHCARDS); // Added for debugging
    const response = await flashcardService.getFlashcards();
    if (response.success && response.data) {
      // Sort flashcards by due date, oldest first
      const sortedFlashcards = response.data.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
      setFlashcards(sortedFlashcards);
    } else {
      setError(response.error || 'Failed to load flashcards.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFlashcards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddFlashcard = useCallback(async (newFlashcardData: Omit<Flashcard, 'id' | 'createdAt' | 'dueDate' | 'interval'>) => {
    setError(null);
    const response = await flashcardService.addFlashcard(newFlashcardData);
    if (response.success && response.data) {
      setFlashcards((prev) => [...prev, response.data].sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0)));
    } else {
      setError(response.error || 'Failed to add flashcard.');
    }
  }, []);

  const handleReviewFlashcard = useCallback(async (id: string, success: boolean) => {
    const flashcardToUpdate = flashcards.find((f) => f.id === id);
    if (!flashcardToUpdate) return;

    const updatedFlashcard = calculateNextDueDate(flashcardToUpdate, success);
    setError(null);
    const response = await flashcardService.updateFlashcard(updatedFlashcard);
    if (response.success && response.data) {
      setFlashcards((prev) =>
        prev
          .map((f) => (f.id === id ? response.data! : f))
          .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
      );
      // Move to next card only if there are cards left
      if (flashcards.length > 1) {
        setCurrentFlashcardIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
      }
    } else {
      setError(response.error || 'Failed to update flashcard review status.');
    }
  }, [flashcards, calculateNextDueDate]);

  const handleDeleteFlashcard = useCallback(async (id: string) => {
    setError(null);
    const response = await flashcardService.deleteFlashcard(id);
    if (response.success) {
      setFlashcards((prev) => prev.filter((f) => f.id !== id));
      if (currentFlashcardIndex >= flashcards.length - 1 && flashcards.length > 1) {
        setCurrentFlashcardIndex(0); // Reset index if current card was last
      }
    } else {
      setError(response.error || 'Failed to delete flashcard.');
    }
  }, [flashcards.length, currentFlashcardIndex]);

  const handleNextFlashcard = useCallback(() => {
    setCurrentFlashcardIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
  }, [flashcards.length]);

  const handlePreviousFlashcard = useCallback(() => {
    setCurrentFlashcardIndex((prevIndex) => (prevIndex - 1 + flashcards.length) % flashcards.length);
  }, [flashcards.length]);

  const currentFlashcard = useMemo(() => {
    return flashcards.length > 0 ? flashcards[currentFlashcardIndex] : null;
  }, [flashcards, currentFlashcardIndex]);

  const fetchSuggestions = useCallback(async (theme?: string) => {
    setLoadingSuggestions(true);
    setError(null);
    setSuggestedWords([]);
    const response = await geminiService.suggestWords(5, theme);
    if (response.success && response.data) {
      setSuggestedWords(response.data.suggestions);
    } else {
      setError(response.error || 'Failed to fetch word suggestions. Please ensure the Gemini API key is configured in your Cloudflare Worker.');
    }
    setLoadingSuggestions(false);
  }, []);

  const handleAddSuggestedWord = useCallback(async (suggestion: GeminiDefinitionResponse) => {
    setAddingSuggestionWord(suggestion.word);
    await handleAddFlashcard(suggestion);
    // Remove the added word from suggestions list
    setSuggestedWords((prev) => prev.filter((s) => s.word !== suggestion.word));
    setAddingSuggestionWord(null);
  }, [handleAddFlashcard]);

  const handleDismissSuggestion = useCallback((word: string) => {
    setSuggestedWords((prev) => prev.filter((s) => s.word !== word));
  }, []);

  const handleReadAloud = useCallback(async (text: string, voiceName: string) => {
    if (!audioContextRef.current) {
      setError('Audio context not available.');
      return;
    }

    setIsReadingAloud(true);
    setError(null);

    // Stop any currently playing audio
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current.disconnect();
      currentAudioSourceRef.current = null;
    }

    try {
      const response = await geminiService.generateSpeech(text, voiceName);

      if (response.success && response.data) {
        const base64Audio = response.data;
        const audioBytes = geminiService.decode(base64Audio);
        const audioBuffer = await geminiService.decodeAudioData(
          audioBytes,
          audioContextRef.current,
          24000, // Sample rate as defined in TTS guideline
          1,     // Number of channels as defined in TTS guideline
        );

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
          setIsReadingAloud(false);
          if (currentAudioSourceRef.current === source) {
            currentAudioSourceRef.current = null;
          }
        };

        source.start();
        currentAudioSourceRef.current = source;
      } else {
        setError(response.error || 'Failed to generate speech. Please ensure the Gemini API key is configured in your Cloudflare Worker.');
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during speech playback.';
      setError(`Read aloud error: ${errorMessage}`);
    } finally {
      // If no audio was played or an error occurred before playback started
      if (!currentAudioSourceRef.current) {
         setIsReadingAloud(false);
      }
    }
  }, []);


  return (
    <div className="flex flex-col min-h-screen text-gray-900">
      <Navbar appName="Flashcard AI" />
      <main className="flex-grow container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <div className="flex flex-col items-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-8">Your Flashcards</h2>
                {loading ? (
                  <LoadingSpinner />
                ) : flashcards.length === 0 ? (
                  <div className="text-center text-gray-600">
                    <p className="text-lg">You don't have any flashcards yet!</p>
                    <p className="mt-2">Go to the "Add Word" tab to create some, or "Suggest" to get AI-generated words.</p>
                    <Button onClick={() => navigate('/add')} className="mt-4">
                      Add Your First Word
                    </Button>
                  </div>
                ) : (
                  <>
                    <FlashcardCard
                      flashcard={currentFlashcard!}
                      onReview={handleReviewFlashcard}
                      onDelete={handleDeleteFlashcard}
                      onReadAloud={handleReadAloud}
                      isReadingAloud={isReadingAloud}
                      onSetError={setError}
                    />
                    <div className="flex mt-8 space-x-4 sticky bottom-4 md:bottom-8 bg-white p-3 rounded-full shadow-lg">
                      <Button
                        onClick={handlePreviousFlashcard}
                        disabled={flashcards.length <= 1 || isReadingAloud}
                        variant="secondary"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={handleNextFlashcard}
                        disabled={flashcards.length <= 1 || isReadingAloud}
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}
              </div>
            }
          />
          <Route
            path="/add"
            element={<AddWordForm onAdd={handleAddFlashcard} onSuccess={() => navigate('/')} />}
          />
          <Route
            path="/suggest"
            element={
              <div className="max-w-xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">AI Word Suggestions</h2>
                
                <div className="flex flex-col sm:flex-row gap-2 mb-6">
                  <Input
                    id="suggestionTheme"
                    placeholder="e.g., Science, Cooking, Travel"
                    value={suggestionTheme}
                    onChange={(e) => setSuggestionTheme(e.target.value)}
                    className="flex-grow"
                    label="Suggest words related to (optional):"
                  />
                  <Button 
                    onClick={() => fetchSuggestions(suggestionTheme)} 
                    disabled={loadingSuggestions} 
                    className="mt-2 sm:mt-0 px-6 py-2"
                  >
                    {loadingSuggestions ? <LoadingSpinner /> : 'Get Suggestions'}
                  </Button>
                </div>
                {loadingSuggestions && <LoadingSpinner />}
                {!loadingSuggestions && suggestedWords.length === 0 && (
                  <p className="text-gray-600 text-center">
                    Click "Get Suggestions" to receive AI-powered word recommendations.
                  </p>
                )}
                <div className="mt-4">
                  {suggestedWords.map((suggestion, index) => (
                    <WordSuggestionCard
                      key={index} // Not ideal, but fine for temporary suggestions
                      suggestion={suggestion}
                      onAdd={handleAddSuggestedWord}
                      onDismiss={handleDismissSuggestion}
                      isAdding={addingSuggestionWord === suggestion.word}
                    />
                  ))}
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;