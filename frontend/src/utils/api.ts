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
}

export interface ApiError {
  detail: string;
}

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
export const sendQuery = async (query: string): Promise<QueryResponse> => {
  try {
    const response: AxiosResponse<QueryResponse> = await apiClient.post('/query', {
      query: query.trim()
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError: ApiError = error.response?.data || { detail: 'Unknown API error' };
      throw new Error(apiError.detail);
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