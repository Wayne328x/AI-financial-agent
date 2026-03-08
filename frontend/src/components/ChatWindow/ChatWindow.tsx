import React from 'react';
import { ChatWindowProps } from '../types';
import FileUploadPanel from '../FileUploadPanel';
import MessageList from './MessageList';
import ChatInput from '../ChatInput';

const ChatWindow: React.FC<ChatWindowProps> = ({
  currentSession,
  isFileUploaded,
  isLoading,
  error,
  onFileUpload,
  onSendMessage
}) => {
  return (
    <div className="main-area">
      {!isFileUploaded && (
        <FileUploadPanel
          onUpload={onFileUpload}
          isLoading={isLoading}
          error={error}
        />
      )}
      {currentSession && (
        <>
          <MessageList messages={currentSession.messages} isLoading={isLoading} />
          <ChatInput
            onSend={onSendMessage}
            disabled={!isFileUploaded}
            isLoading={isLoading}
            error={error}
          />
        </>
      )}
    </div>
  );
};

export default ChatWindow;