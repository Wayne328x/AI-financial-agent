import React, { useState } from 'react';
import { ChatInputProps } from './types';

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, isLoading, error }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div className="chat-input-container">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            disabled
              ? "Upload a file first"
              : isLoading
                ? "AI is thinking..."
                : "Ask a question..."
          }
          disabled={disabled || isLoading}
        />
        <button type="submit" disabled={disabled || !input.trim() || isLoading}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;