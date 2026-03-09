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

const COMPANY_IDENTIFICATION_QUERY_PATTERN = /\b(company name|what company|which company|who is this report for|who is this filing for|identify (the )?company|name of the company|what is the company)\b/i;

const deriveTitleFromFilename = (filename: string): string => {
  const baseName = filename.replace(/\.[^.]+$/, '');
  const parts = baseName
    .split(/[_\-\s]+/)
    .map(part => part.trim())
    .filter(Boolean);

  const ignoredTokens = new Set([
    '10k',
    '10q',
    '8k',
    'annual',
    'report',
    'quarterly',
    'financial',
    'statement',
    'statements',
    'sec',
    'fy',
    'q1',
    'q2',
    'q3',
    'q4'
  ]);

  const candidate = parts.find(part => {
    const normalized = part.toLowerCase();
    return /[a-zA-Z]/.test(part) && !ignoredTokens.has(normalized) && !/^\d+$/.test(part);
  });

  const fallback = candidate || parts[0] || 'New Chat';
  return fallback.charAt(0).toUpperCase() + fallback.slice(1).toLowerCase();
};

const cleanCompanyTitle = (value: string): string => {
  let cleaned = value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_]+)_(?!_)/g, '$1')
    .replace(/^['"“”‘’()\[\]\s]+|['"“”‘’()\[\]\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  cleaned = cleaned.replace(/^[^A-Za-z0-9]+/, '').trim();
  cleaned = cleaned.replace(/[,:;!?]+$/, '').trim();

  return cleaned;
};

const isLikelyCompanyName = (value: string): boolean => {
  const trimmed = cleanCompanyTitle(value);
  if (!trimmed || trimmed.length < 2 || trimmed.length > 80) {
    return false;
  }

  if (!/[A-Za-z]/.test(trimmed)) {
    return false;
  }

  if (/\b(context|document|report|filing|question|answer|provided)\b/i.test(trimmed)) {
    return false;
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    return false;
  }

  return true;
};

const extractCompanyNameFromAnswer = (answer: string): string | null => {
  const normalized = cleanCompanyTitle(answer);
  if (!normalized) {
    return null;
  }

  const firstLine = normalized.split(/\n+/)[0].trim();
  const directPatterns = [
    /(?:the company is|company is|this report is about|the report is about|this filing is for|the filing is for|the document is about|this document is about|report is for)\s+([^.!?\n]+)/i,
    /(?:about|for)\s+([A-Z][A-Za-z0-9&.,'\- ]{1,80})$/i,
  ];

  for (const pattern of directPatterns) {
    const match = firstLine.match(pattern);
    const candidate = match?.[1] ? cleanCompanyTitle(match[1]) : '';
    if (isLikelyCompanyName(candidate)) {
      return candidate;
    }
  }

  if (isLikelyCompanyName(firstLine)) {
    return firstLine;
  }

  return null;
};

const shouldAdoptCompanyTitle = (session: ChatSession, nextTitle: string): boolean => {
  const latestFilename = session.uploadedFiles[session.uploadedFiles.length - 1]?.name;
  const filenameTitle = latestFilename ? deriveTitleFromFilename(latestFilename) : null;
  const cleanedNextTitle = cleanCompanyTitle(nextTitle);
  const cleanedCurrentTitle = cleanCompanyTitle(session.title);

  if (!cleanedNextTitle || cleanedCurrentTitle === cleanedNextTitle) {
    return false;
  }

  return cleanedCurrentTitle === 'New Chat' || (filenameTitle !== null && cleanedCurrentTitle === cleanCompanyTitle(filenameTitle));
};

const maybeApplyCompanyTitle = (
  sessions: ChatSession[],
  sessionId: string,
  companyName: string | null,
): ChatSession[] => {
  const nextTitle = companyName ? cleanCompanyTitle(companyName) : '';
  if (!nextTitle) {
    return sessions;
  }

  const session = sessions.find(item => item.id === sessionId);
  if (!session || !shouldAdoptCompanyTitle(session, nextTitle)) {
    return sessions;
  }

  return updateSessionTitle(sessions, sessionId, nextTitle);
};

const resolveActiveDocumentId = (session: ChatSession | undefined): number | null => {
  if (!session) {
    return null;
  }

  if (typeof session.activeDocumentId === 'number' && session.activeDocumentId > 0) {
    return session.activeDocumentId;
  }

  for (let index = session.uploadedFiles.length - 1; index >= 0; index -= 1) {
    const documentId = session.uploadedFiles[index]?.documentId;
    if (typeof documentId === 'number' && documentId > 0) {
      return documentId;
    }
  }

  return null;
};

const App: React.FC = () => {
  const [state, setState] = useState<ChatState>({
    sessions: [],
    currentSessionId: null,
    isLoading: false,
    error: null,
    success: null
  });

  const [localStorageAvailable] = useState(() => isLocalStorageAvailable());

  // Load from localStorage on mount
  useEffect(() => {
    if (!localStorageAvailable) {
      console.warn('localStorage is not available. Chat sessions will not be persisted.');
      const defaultSession = createNewSession();
      setState(prev => ({
        ...prev,
        sessions: [defaultSession],
        currentSessionId: defaultSession.id,
        success: null
      }));
      return;
    }

    const loadedSessions = loadSessionsFromStorage();
    const savedCurrentSessionId = loadCurrentSessionIdFromStorage();

    if (loadedSessions.length === 0) {
      const defaultSession = createNewSession();
      setState(prev => ({
        ...prev,
        sessions: [defaultSession],
        currentSessionId: defaultSession.id,
        success: null
      }));
      return;
    }

    // Validate that the saved current session still exists
    const validCurrentSessionId = savedCurrentSessionId &&
      loadedSessions.some(session => session.id === savedCurrentSessionId)
      ? savedCurrentSessionId
      : (loadedSessions.length > 0 ? loadedSessions[0].id : null);

    setState(prev => ({
      ...prev,
      sessions: loadedSessions,
      currentSessionId: validCurrentSessionId,
      success: null
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

    setState(prev => ({ ...prev, isLoading: true, error: null, success: null }));

    try {
      // Upload the first file (can be extended for multiple files)
      const file = files[0];
      const uploadResponse = await uploadFile(file);
      const documentId = uploadResponse.document_id > 0 ? uploadResponse.document_id : undefined;
      const detectedCompanyName = uploadResponse.company_name ? cleanCompanyTitle(uploadResponse.company_name) : '';

      const nextTitle = detectedCompanyName
        ? detectedCompanyName
        : deriveTitleFromFilename(uploadResponse.filename || file.name);

      const sessionsWithFile = addFileToSession(state.sessions, state.currentSessionId!, file, documentId);
      const updatedSessions = updateSessionTitle(sessionsWithFile, state.currentSessionId, nextTitle);
      setState(prev => ({
        ...prev,
        sessions: updatedSessions,
        isLoading: false,
        success: 'File uploaded successfully'
      }));
    } catch (error) {
      console.error('File upload failed', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'File upload failed',
        success: null
      }));
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!state.currentSessionId || !message.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Get current session to check if we need to update title
    const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
    if (!currentSession) return;
    const activeDocumentId = resolveActiveDocumentId(currentSession);

    // Add user message immediately
    const sessionsWithUserMessage = addMessageToSession(
      state.sessions,
      state.currentSessionId,
      {
        role: 'user',
        content: message.trim()
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
      const response = await sendQuery(message, {
        documentId: activeDocumentId,
        chatId: state.currentSessionId,
      });
      const companyNameFromAnswer = COMPANY_IDENTIFICATION_QUERY_PATTERN.test(message)
        ? extractCompanyNameFromAnswer(response.response)
        : null;

      // Add AI response
      const aiMessage: Omit<Message, 'id' | 'timestamp'> = {
        role: 'assistant',
        content: response.response,
        sources: response.sources
      };

      const sessionsWithAI = addMessageToSession(
        sessionsToUse,
        state.currentSessionId,
        aiMessage
      );
      const sessionsWithCompanyTitle = maybeApplyCompanyTitle(
        sessionsWithAI,
        state.currentSessionId,
        companyNameFromAnswer,
      );

      setState(prev => ({
        ...prev,
        sessions: sessionsWithCompanyTitle,
        isLoading: false
      }));
    } catch (error) {
      console.error('Query failed', error);
      const errorMessage: Omit<Message, 'id' | 'timestamp'> = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
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
        success={state.success}
        onFileUpload={handleFileUpload}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default App;