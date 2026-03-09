import React from 'react';
import { MessageBubbleProps } from '../types';

const toSourcePreview = (content: string, maxLength: number = 140): string => {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const hasSources = !isUser && Array.isArray(message.sources) && message.sources.length > 0;
  const formattedTime = message.timestamp.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <div className={`message-container ${isUser ? 'user' : 'assistant'}`}>
      <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
        <div>{message.content}</div>
        {hasSources && (
          <div className="message-sources">
            <div className="message-sources-title">Sources</div>
            <ul className="message-sources-list">
              {message.sources!.map((source, index) => (
                <li key={`${message.id}-source-${index}`} className="message-source-item">
                  <div className="message-source-preview">{toSourcePreview(source.content)}</div>
                  {typeof source.similarity === 'number' && (
                    <div className="message-source-score">Similarity {source.similarity.toFixed(2)}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="message-time">
        {formattedTime}
      </div>
    </div>
  );
};

export default MessageBubble;