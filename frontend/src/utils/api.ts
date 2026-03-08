import axios, { AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

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

    const response: AxiosResponse<UploadResponse> = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError: ApiError = error.response?.data || { detail: 'Unknown upload error' };
      throw new Error(apiError.detail);
    }
    throw new Error('File upload failed');
  }
};

/**
 * Check if the backend is healthy
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/');
    return response.status === 200;
  } catch {
    return false;
  }
};