import React from 'react';
import { GeminiDefinitionResponse } from '../types';
import Button from './Button';

interface WordSuggestionCardProps {
  suggestion: GeminiDefinitionResponse;
  onAdd: (suggestion: GeminiDefinitionResponse) => void;
  onDismiss: (word: string) => void;
  isAdding: boolean;
}

const WordSuggestionCard: React.FC<WordSuggestionCardProps> = ({ suggestion, onAdd, onDismiss, isAdding }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex-grow">
        <h3 className="text-lg font-semibold text-gray-800">{suggestion.word}</h3>
        <p className="text-sm text-gray-700">{suggestion.definition}</p>
        {suggestion.exampleSentence && (
          <p className="text-xs italic text-gray-500 mt-1">Example: {suggestion.exampleSentence}</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          onClick={() => onAdd(suggestion)} 
          variant="primary" 
          size="sm"
          disabled={isAdding}
        >
          {isAdding ? 'Adding...' : 'Add to Flashcards'}
        </Button>
        <Button 
          onClick={() => onDismiss(suggestion.word)} 
          variant="secondary" 
          size="sm"
          disabled={isAdding}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
};

export default WordSuggestionCard;
