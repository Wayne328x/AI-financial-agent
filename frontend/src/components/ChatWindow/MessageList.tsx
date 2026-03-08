import React from 'react';
import { MessageListProps } from '../types';
import MessageBubble from './MessageBubble';

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  return (
    <div className="chat-messages">
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
        <div className="message-bubble assistant loading">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;