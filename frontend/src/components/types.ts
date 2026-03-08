// Shared component types
export interface SidebarProps {
  sessions: import('../types').ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
}

export interface ChatHistoryListProps {
  sessions: import('../types').ChatSession[];
  currentSessionId: string | null;
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
}

export interface ChatWindowProps {
  currentSession: import('../types').ChatSession | undefined;
  isFileUploaded: boolean;
  isLoading: boolean;
  error: string | null;
  onFileUpload: (files: File[]) => void;
  onSendMessage: (message: string) => void;
}

export interface MessageListProps {
  messages: import('../types').Message[];
  isLoading?: boolean;
}

export interface MessageBubbleProps {
  message: import('../types').Message;
}

export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface FileUploadPanelProps {
  onUpload: (files: File[]) => void;
  isLoading: boolean;
  error: string | null;
}