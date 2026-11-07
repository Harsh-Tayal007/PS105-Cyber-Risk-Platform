/**
 * Centralized API Client for PS105 FastAPI Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

const memoryStorage: Record<string, string> = {};

export function getToken(): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('ps105_access_token');
  }
  return memoryStorage['ps105_access_token'] || null;
}

export function setToken(token: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('ps105_access_token', token);
  }
  memoryStorage['ps105_access_token'] = token;
}

export function removeToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('ps105_access_token');
  }
  delete memoryStorage['ps105_access_token'];
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ps105_unauthorized'));
    }
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    const message = errorData.detail || `HTTP Error ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }

  // Handle blob responses (for PDF downloads)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return (await response.blob()) as unknown as T;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return await response.json();
}
