import { ChatSession, Message, FileMetadata } from '../types';

export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

/**
 * Generate a readable title from a user message
 * Uses the first 6-10 words, with proper capitalization
 */
export const generateTitleFromMessage = (message: string): string => {
  if (!message || message.trim().length === 0) {
    return 'New Chat';
  }

  // Clean the message and split into words
  const words = message.trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .slice(0, 10); // Take first 10 words max

  if (words.length === 0) {
    return 'New Chat';
  }

  // Join words and limit length
  let title = words.join(' ');

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Truncate if too long (aim for 50 characters)
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }

  return title;
};

/**
 * Check if a session has any user messages
 */
export const hasUserMessages = (session: ChatSession): boolean => {
  return session.messages.some(message => message.role === 'user');
};

export const createNewSession = (title?: string): ChatSession => {
  const now = new Date();
  return {
    id: generateId(),
    title: title || 'New Chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
    uploadedFiles: [],
    activeDocumentId: null
  };
};

export const addMessageToSession = (
  sessions: ChatSession[],
  sessionId: string,
  message: Omit<Message, 'id' | 'timestamp'>
): ChatSession[] => {
  const now = new Date();
  const newMessage: Message = {
    id: generateId(),
    ...message,
    timestamp: now
  };

  return sessions.map(session =>
    session.id === sessionId
      ? {
          ...session,
          messages: [...session.messages, newMessage],
          updatedAt: now
        }
      : session
  );
};

export const addFileToSession = (
  sessions: ChatSession[],
  sessionId: string,
  file: File,
  documentId?: number
): ChatSession[] => {
  const now = new Date();
  const fileMetadata: FileMetadata = {
    id: generateId(),
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: now,
    documentId
  };

  return sessions.map(session =>
    session.id === sessionId
      ? {
          ...session,
          uploadedFiles: [...session.uploadedFiles, fileMetadata],
          activeDocumentId: typeof documentId === 'number' ? documentId : (session.activeDocumentId ?? null),
          updatedAt: now
        }
      : session
  );
};

export const updateSessionTitle = (
  sessions: ChatSession[],
  sessionId: string,
  newTitle: string
): ChatSession[] => {
  return sessions.map(session =>
    session.id === sessionId
      ? { ...session, title: newTitle, updatedAt: new Date() }
      : session
  );
};

export const deleteSession = (
  sessions: ChatSession[],
  sessionId: string
): ChatSession[] => {
  return sessions.filter(session => session.id !== sessionId);
};

export const getSessionById = (
  sessions: ChatSession[],
  sessionId: string
): ChatSession | undefined => {
  return sessions.find(session => session.id === sessionId);
};