import React from 'react';
import { ChatHistoryListProps } from '../types';
import { ChatSession } from '../../types';

const ChatHistoryList: React.FC<ChatHistoryListProps> = ({
  sessions,
  currentSessionId,
  onSelectChat,
  onDeleteChat
}) => {
  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent triggering the select action
    if (window.confirm('Are you sure you want to delete this chat?')) {
      onDeleteChat(sessionId);
    }
  };

  return (
    <div className="chat-list">
      {sessions.map((session: ChatSession) => (
        <div
          key={session.id}
          className={`chat-item ${session.id === currentSessionId ? 'active' : ''}`}
          onClick={() => onSelectChat(session.id)}
        >
          <div className="chat-content">
            <div className="chat-title">{session.title}</div>
            <div className="chat-date">
              {session.updatedAt.toLocaleDateString()}
            </div>
          </div>
          <button
            className="delete-chat-btn"
            onClick={(e) => handleDelete(e, session.id)}
            title="Delete chat"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChatHistoryList;