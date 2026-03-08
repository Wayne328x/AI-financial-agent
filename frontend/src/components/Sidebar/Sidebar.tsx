import React from 'react';
import { SidebarProps } from '../types';
import ChatHistoryList from './ChatHistoryList';

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectChat,
  onDeleteChat
}) => {
  return (
    <div className="sidebar">
      <button className="new-chat-btn" onClick={onNewChat}>
        + New Chat
      </button>
      <ChatHistoryList
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
      />
    </div>
  );
};

export default Sidebar;