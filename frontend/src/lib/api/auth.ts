import { apiRequest, setToken, removeToken } from './client';
import type { LoginPayload, RegisterPayload, TokenResponse, UserResponse } from '@/types';

export async function loginApi(payload: LoginPayload): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data.access_token) {
    setToken(data.access_token);
  }
  return data;
}

export async function demoLoginApi(): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>('/auth/demo', {
    method: 'POST',
  });
  if (data.access_token) {
    setToken(data.access_token);
  }
  return data;
}

export async function registerApi(payload: RegisterPayload): Promise<UserResponse> {
  return await apiRequest<UserResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logoutApi(): void {
  removeToken();
}

