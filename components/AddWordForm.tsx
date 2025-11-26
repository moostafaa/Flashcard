import React, { useState, useCallback } from 'react';
import { Flashcard } from '../types';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import { geminiService } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface AddWordFormProps {
  onAdd: (flashcard: Omit<Flashcard, 'id' | 'createdAt' | 'dueDate' | 'interval'>) => Promise<void>;
  onSuccess?: () => void;
}

const AddWordForm: React.FC<AddWordFormProps> = ({ onAdd, onSuccess }) => {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateDefinition = useCallback(async () => {
    if (!word.trim()) {
      setError('Please enter a word to generate a definition.');
      return;
    }
    setLoadingDefinition(true);
    setError('');
    const response = await geminiService.generateDefinition(word);
    if (response.success && response.data) {
      setDefinition(response.data.definition);
      setExampleSentence(response.data.exampleSentence || '');
    } else {
      setError(response.error || 'Failed to generate definition. Please try again.');
    }
    setLoadingDefinition(false);
  }, [word]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!word.trim() || !definition.trim()) {
      setError('Word and Definition are required.');
      return;
    }

    await onAdd({ word, definition, exampleSentence });
    setWord('');
    setDefinition('');
    setExampleSentence('');
    if (onSuccess) {
      onSuccess();
    }
  }, [word, definition, exampleSentence, onAdd, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Flashcard</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <Input
        id="word"
        label="Word"
        value={word}
        onChange={(e) => {
          setWord(e.target.value);
          setError('');
        }}
        placeholder="Enter word"
        required
      />

      <div className="flex items-end mb-4 space-x-2">
        <div className="flex-grow">
          <Textarea
            id="definition"
            label="Definition"
            value={definition}
            onChange={(e) => {
              setDefinition(e.target.value);
              setError('');
            }}
            placeholder="Enter definition or generate with AI"
            rows={3}
            required
          />
        </div>
        <Button
          type="button"
          onClick={handleGenerateDefinition}
          disabled={loadingDefinition || !word.trim()}
          variant="outline"
          size="sm"
          className="whitespace-nowrap px-3 py-2 text-sm h-min"
        >
          {loadingDefinition ? <LoadingSpinner /> : 'Generate with AI'}
        </Button>
      </div>
      
      <Textarea
        id="exampleSentence"
        label="Example Sentence (Optional)"
        value={exampleSentence}
        onChange={(e) => setExampleSentence(e.target.value)}
        placeholder="Enter an example sentence"
        rows={2}
      />

      <Button type="submit" className="w-full mt-4" disabled={loadingDefinition}>
        Add Flashcard
      </Button>
    </form>
  );
};

export default AddWordForm;
