import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { ChatSession, ChatState, Message } from './types';
import { createNewSession, addMessageToSession, addFileToSession, deleteSession, generateTitleFromMessage, hasUserMessages, updateSessionTitle } from './utils/chatHelpers';
import {
  saveSessionsToStorage,
  loadSessionsFromStorage,
  saveCurrentSessionIdToStorage,
  loadCurrentSessionIdFromStorage,
  debouncedSaveSessions,
  isLocalStorageAvailable
} from './utils/storage';
import { sendQuery, uploadFile } from './utils/api';
import './App.css';

const App: React.FC = () => {
  const [state, setState] = useState<ChatState>({
    sessions: [],
    currentSessionId: null,
    isLoading: false,
    error: null
  });

const App: React.FC = () => {
  const [state, setState] = useState<ChatState>({
    sessions: [],
    currentSessionId: null,
    isLoading: false,
    error: null
  });

  const [localStorageAvailable] = useState(() => isLocalStorageAvailable());

  // Load from localStorage on mount
  useEffect(() => {
    if (!localStorageAvailable) {
      console.warn('localStorage is not available. Chat sessions will not be persisted.');
      return;
    }

    const loadedSessions = loadSessionsFromStorage();
    const savedCurrentSessionId = loadCurrentSessionIdFromStorage();

    // Validate that the saved current session still exists
    const validCurrentSessionId = savedCurrentSessionId &&
      loadedSessions.some(session => session.id === savedCurrentSessionId)
      ? savedCurrentSessionId
      : (loadedSessions.length > 0 ? loadedSessions[0].id : null);

    setState(prev => ({
      ...prev,
      sessions: loadedSessions,
      currentSessionId: validCurrentSessionId
    }));
  }, [localStorageAvailable]);

  // Debounced save to localStorage whenever sessions change (prevents excessive writes)
  useEffect(() => {
    if (localStorageAvailable && state.sessions.length > 0) {
      debouncedSaveSessions(state.sessions);
    }
  }, [state.sessions, localStorageAvailable]);

  // Save current session ID immediately when it changes (no debouncing needed)
  useEffect(() => {
    if (localStorageAvailable) {
      saveCurrentSessionIdToStorage(state.currentSessionId);
    }
  }, [state.currentSessionId, localStorageAvailable]);

  // Cleanup: save any pending changes on unmount
  useEffect(() => {
    return () => {
      if (localStorageAvailable && state.sessions.length > 0) {
        saveSessionsToStorage(state.sessions);
      }
    };
  }, [state.sessions, localStorageAvailable]);

  const handleNewChat = useCallback(() => {
    const newSession = createNewSession();
    setState(prev => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      currentSessionId: newSession.id
    }));
  }, []);

  const handleSelectChat = useCallback((sessionId: string) => {
    setState(prev => ({
      ...prev,
      currentSessionId: sessionId
    }));
  }, []);

  const handleDeleteChat = useCallback((sessionId: string) => {
    setState(prev => {
      const updatedSessions = deleteSession(prev.sessions, sessionId);
      const newCurrentSessionId = prev.currentSessionId === sessionId
        ? (updatedSessions.length > 0 ? updatedSessions[0].id : null)
        : prev.currentSessionId;

      return {
        ...prev,
        sessions: updatedSessions,
        currentSessionId: newCurrentSessionId
      };
    });
  }, []);

  const handleFileUpload = async (files: File[]) => {
    if (!state.currentSessionId || files.length === 0) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Upload the first file (can be extended for multiple files)
      const file = files[0];
      await uploadFile(file);

      // Add file metadata to the session
      const fileMetadata = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date()
      };

      const updatedSessions = addFileToSession(state.sessions, state.currentSessionId!, fileMetadata);
      setState(prev => ({
        ...prev,
        sessions: updatedSessions,
        isLoading: false
      }));
    } catch (error) {
      console.error('File upload failed', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'File upload failed'
      }));
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!state.currentSessionId || !message.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Get current session to check if we need to update title
    const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
    if (!currentSession) return;

    // Add user message immediately
    const sessionsWithUserMessage = addMessageToSession(
      state.sessions,
      state.currentSessionId,
      {
        id: Date.now().toString(),
        role: 'user',
        content: message.trim(),
        timestamp: new Date()
      }
    );

    // Check if this is the first user message and title needs updating
    let sessionsToUse = sessionsWithUserMessage;
    const wasFirstUserMessage = !hasUserMessages(currentSession);
    const needsTitleUpdate = wasFirstUserMessage && currentSession.title === 'New Chat';

    if (needsTitleUpdate) {
      const newTitle = generateTitleFromMessage(message.trim());
      sessionsToUse = updateSessionTitle(sessionsWithUserMessage, state.currentSessionId, newTitle);
    }

    setState(prev => ({
      ...prev,
      sessions: sessionsToUse
    }));

    try {
      // Call backend API
      const response = await sendQuery(message);

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };

      const sessionsWithAI = addMessageToSession(
        sessionsToUse,
        state.currentSessionId,
        aiMessage
      );

      setState(prev => ({
        ...prev,
        sessions: sessionsWithAI,
        isLoading: false
      }));
    } catch (error) {
      console.error('Query failed', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };

      const sessionsWithError = addMessageToSession(
        sessionsToUse,
        state.currentSessionId,
        errorMessage
      );

      setState(prev => ({
        ...prev,
        sessions: sessionsWithError,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Query failed'
      }));
    }
  };
    } catch (error) {
      console.error('Query failed', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };

      const sessionsWithError = addMessageToSession(
        sessionsWithUserMessage,
        state.currentSessionId,
        errorMessage
      );

      setState(prev => ({
        ...prev,
        sessions: sessionsWithError,
        isLoading: false
      }));
    }
  };

  const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
  const isFileUploaded = currentSession ? currentSession.uploadedFiles.length > 0 : false;

  return (
    <div className="app">
      <Sidebar
        sessions={state.sessions}
        currentSessionId={state.currentSessionId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />
      <ChatWindow
        currentSession={currentSession}
        isFileUploaded={isFileUploaded}
        isLoading={state.isLoading}
        error={state.error}
        onFileUpload={handleFileUpload}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default App;