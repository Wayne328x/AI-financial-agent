import { ChatSession } from '../types';

const SESSIONS_STORAGE_KEY = 'ai_chat_sessions';
const CURRENT_SESSION_STORAGE_KEY = 'ai_current_session_id';

// Custom replacer for JSON.stringify to handle Date objects
const dateReplacer = (key: string, value: any): any => {
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() };
  }
  return value;
};

// Custom reviver for JSON.parse to restore Date objects
const dateReviver = (key: string, value: any): any => {
  if (typeof value === 'object' && value !== null && value.__type === 'Date') {
    return new Date(value.value);
  }
  return value;
};

export const saveSessionsToStorage = (sessions: ChatSession[]): void => {
  try {
    const serialized = JSON.stringify(sessions, dateReplacer);
    localStorage.setItem(SESSIONS_STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save sessions to localStorage:', error);
  }
};

export const loadSessionsFromStorage = (): ChatSession[] => {
  try {
    const serialized = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!serialized) return [];

    const parsed = JSON.parse(serialized, dateReviver);

    // Validate the structure (basic check)
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((session: any) =>
      session.id &&
      session.title &&
      Array.isArray(session.messages) &&
      Array.isArray(session.uploadedFiles)
    ).map((session: any) => ({
      ...session,
      activeDocumentId: typeof session.activeDocumentId === 'number' ? session.activeDocumentId : null,
      createdAt: session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt),
      updatedAt: session.updatedAt instanceof Date ? session.updatedAt : new Date(session.updatedAt),
      messages: session.messages.map((message: any) => ({
        ...message,
        timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
      })),
      uploadedFiles: session.uploadedFiles.map((file: any) => ({
        ...file,
        documentId: typeof file.documentId === 'number' ? file.documentId : undefined,
        uploadedAt: file.uploadedAt instanceof Date ? file.uploadedAt : new Date(file.uploadedAt)
      }))
    }));
  } catch (error) {
    console.error('Failed to load sessions from localStorage:', error);
    return [];
  }
};

export const saveCurrentSessionIdToStorage = (sessionId: string | null): void => {
  try {
    if (sessionId) {
      localStorage.setItem(CURRENT_SESSION_STORAGE_KEY, sessionId);
    } else {
      localStorage.removeItem(CURRENT_SESSION_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to save current session ID to localStorage:', error);
  }
};

export const loadCurrentSessionIdFromStorage = (): string | null => {
  try {
    const sessionId = localStorage.getItem(CURRENT_SESSION_STORAGE_KEY);
    return sessionId || null;
  } catch (error) {
    console.error('Failed to load current session ID from localStorage:', error);
    return null;
  }
};

// Debounced save function to avoid excessive localStorage writes
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
export const debouncedSaveSessions = (sessions: ChatSession[], delay: number = 500): void => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    saveSessionsToStorage(sessions);
  }, delay);
};

// Clear all stored data (useful for debugging or reset)
export const clearAllStoredData = (): void => {
  try {
    localStorage.removeItem(SESSIONS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear stored data:', error);
  }
};

// Check if localStorage is available
export const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const clearSessionsFromStorage = (): void => {
  localStorage.removeItem(SESSIONS_STORAGE_KEY);
};