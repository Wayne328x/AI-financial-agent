import axios, { AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const UPLOAD_URL = 'http://localhost:8000/api/v1/upload';

// Types for API responses
export interface QueryResponse {
  response: string;
  sources?: Array<{
    content: string;
    similarity: number;
  }>;
}

export interface UploadResponse {
  message: string;
  document_id: number;
  company_name?: string;
  filename?: string;
}

export interface ApiError {
  detail: string | Array<{ msg?: string; loc?: Array<string | number> }>;
}

export interface QueryRequestOptions {
  documentId?: number | null;
  chatId?: string | null;
}

const getApiErrorMessage = (errorData: unknown): string => {
  if (!errorData) {
    return 'Unknown API error';
  }

  if (typeof errorData === 'string') {
    return errorData;
  }

  if (typeof errorData === 'object') {
    const payload = errorData as Record<string, unknown>;
    const detail = payload.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const firstIssue = detail[0] as Record<string, unknown>;
      if (typeof firstIssue?.msg === 'string' && firstIssue.msg.trim()) {
        return firstIssue.msg;
      }
    }

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  }

  return 'Unknown API error';
};

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for LLM requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Helper Functions

/**
 * Send a query to the backend and get AI response
 */
export const sendQuery = async (query: string, options: QueryRequestOptions = {}): Promise<QueryResponse> => {
  try {
    const body = new URLSearchParams({ query: query.trim() });
    if (typeof options.documentId === 'number' && options.documentId > 0) {
      body.set('document_id', String(options.documentId));
    }
    if (options.chatId) {
      body.set('chat_id', options.chatId);
    }
    const response: AxiosResponse<QueryResponse> = await apiClient.post('/query', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(getApiErrorMessage(error.response?.data));
    }
    throw new Error('Network error occurred');
  }
};

/**
 * Upload a PDF file to the backend
 */
export const uploadFile = async (file: File): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // Some backends may return empty/non-JSON body even for successful uploads.
      return { message: 'Upload completed', document_id: 0 };
    }

    if (data && typeof data === 'object') {
      const payload = data as Record<string, unknown>;
      if (typeof payload.detail === 'string' && payload.detail.trim()) {
        throw new Error(payload.detail);
      }
      if (typeof payload.error === 'string' && payload.error.trim()) {
        throw new Error(payload.error);
      }

      return {
        message: typeof payload.message === 'string' ? payload.message : 'Upload completed',
        document_id: typeof payload.document_id === 'number' ? payload.document_id : 0,
        company_name: typeof payload.company_name === 'string' ? payload.company_name : undefined,
        filename: typeof payload.filename === 'string' ? payload.filename : undefined,
      };
    }

    return { message: 'Upload completed', document_id: 0 };
  } catch (error) {
    const isNetworkFailure = error instanceof TypeError;
    console.error('Upload request failed:', {
      endpoint: UPLOAD_URL,
      fileName: file.name,
      fileSize: file.size,
      networkFailure: isNetworkFailure,
      error,
    });
    if (error instanceof Error) {
      console.log('Upload error message:', error.message);
      throw error;
    }
    throw new Error('Network error during file upload');
  }
};

/**
 * Check if the backend is healthy
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.status === 200;
  } catch {
    return false;
  }
};