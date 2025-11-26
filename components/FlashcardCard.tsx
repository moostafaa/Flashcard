import React, { useState, useEffect, useRef } from 'react';
import { Flashcard } from '../types';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { TTS_VOICES } from '../constants'; // Import TTS_VOICES

interface FlashcardCardProps {
  flashcard: Flashcard;
  onReview: (id: string, success: boolean) => void;
  onDelete: (id: string) => void;
  onReadAloud: (text: string, voiceName: string) => Promise<void>;
  isReadingAloud: boolean;
  onSetError: (error: string | null) => void;
}

const FlashcardCard: React.FC<FlashcardCardProps> = ({ 
  flashcard, 
  onReview, 
  onDelete, 
  onReadAloud, 
  isReadingAloud,
  onSetError,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(TTS_VOICES[0].name);

  // Reset flip state when flashcard changes
  useEffect(() => {
    setIsFlipped(false);
  }, [flashcard.id]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleReview = (success: boolean) => {
    onReview(flashcard.id, success);
    setIsFlipped(false); // Flip back to front after review
  };

  const handleReadAloudClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip when clicking the button
    onSetError(null); // Clear previous errors
    const textToSpeak = `${flashcard.word}. ${flashcard.definition}${flashcard.exampleSentence ? ` Example: ${flashcard.exampleSentence}` : ''}`;
    await onReadAloud(textToSpeak, selectedVoice);
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-full md:w-96 h-64 bg-white rounded-lg shadow-lg cursor-pointer perspective-1000 transform transition-transform duration-500 hover:scale-102"
        onClick={handleFlip}
      >
        <div
          className={`relative w-full h-full transform-style-3d transition-transform duration-500 ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front of the card */}
          <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-white to-gray-50 rounded-lg p-6 flex items-center justify-center border border-gray-200">
            <p className="text-2xl font-bold text-gray-800 text-center">{flashcard.word}</p>
            <div className="absolute bottom-4 right-4 flex items-center space-x-2">
              <select
                className="bg-gray-100 border border-gray-300 rounded-md text-sm p-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedVoice}
                onChange={(e) => {
                  setSelectedVoice(e.target.value);
                  e.stopPropagation(); // Prevent card flip
                }}
                onClick={(e) => e.stopPropagation()} // Prevent card flip
                aria-label="Select voice accent"
              >
                {TTS_VOICES.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.label}
                  </option>
                ))}
              </select>
              <Button 
                onClick={handleReadAloudClick}
                disabled={isReadingAloud}
                variant="outline"
                size="sm"
                aria-label="Read aloud"
              >
                {isReadingAloud ? <LoadingSpinner /> : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="V5.625c0-1.036.784-1.875 1.75-1.875h.375a.75.75 0 0 1 .75.75v3.15c0 .414.336.75.75.75H21a.75.75 0 0 1 .75.75v2.812a.75.75 0 0 1-.416.687L19.25 14.25h-.375a.75.75 0 0 1-.75-.75V11.25a.75.75 0 0 1-.75-.75h-7.5a.75.75 0 0 1-.75-.75V7.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M3 15.625c0-1.036.784-1.875 1.75-1.875h.375a.75.75 0 0 1 .75.75v3.15c0 .414.336.75.75.75H21a.75.75 0 0 1 .75.75v2.812a.75.75 0 0 1-.416.687L19.25 22.5h-.375a.75.75 0 0 1-.75-.75V19.5a.75.75 0 0 1-.75-.75h-7.5a.75.75 0 0 1-.75-.75V15.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                  </svg>
                )}
              </Button>
            </div>
          </div>

          {/* Back of the card */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 flex flex-col justify-center items-start text-gray-700 border border-indigo-200">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">{flashcard.word}</h3>
            <p className="text-base text-gray-800 mb-2">{flashcard.definition}</p>
            {flashcard.exampleSentence && (
              <p className="text-sm italic text-gray-600 mt-1">
                <span className="font-medium">Example:</span> {flashcard.exampleSentence}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-auto w-full text-right">
              Last reviewed: {flashcard.lastReviewedAt ? timeAgo(flashcard.lastReviewedAt) : 'Never'}
            </p>
             <div className="absolute bottom-4 right-4 flex items-center space-x-2">
              <select
                className="bg-gray-100 border border-gray-300 rounded-md text-sm p-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedVoice}
                onChange={(e) => {
                  setSelectedVoice(e.target.value);
                  e.stopPropagation(); // Prevent card flip
                }}
                onClick={(e) => e.stopPropagation()} // Prevent card flip
                aria-label="Select voice accent"
              >
                {TTS_VOICES.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.label}
                  </option>
                ))}
              </select>
              <Button 
                onClick={handleReadAloudClick}
                disabled={isReadingAloud}
                variant="outline"
                size="sm"
                aria-label="Read aloud"
              >
                {isReadingAloud ? <LoadingSpinner /> : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M11.5 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 9.75a.75.75 0 0 0 0 1.5h15a.75.75 0 0 0 0-1.5h-15Z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M12.875 17.25a.75.75 0 0 0 0-1.5h-9.75a.75.75 0 0 0 0 1.5h9.75Z" clipRule="evenodd" />
                  </svg>

                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="flex mt-6 space-x-4">
          <Button variant="danger" onClick={() => handleReview(false)}>
            Hard
          </Button>
          <Button variant="secondary" onClick={() => handleReview(true)}>
            Easy
          </Button>
          <Button variant="outline" onClick={() => onDelete(flashcard.id)}>
            Delete
          </Button>
        </div>
      )}
    </div>
  );
};

export default FlashcardCard;