import { apiRequest } from './client';
import type { SecurityControlResponse, SecurityControlCreatePayload } from '@/types';

export async function getSecurityControls(): Promise<SecurityControlResponse[]> {
  return await apiRequest<SecurityControlResponse[]>('/controls');
}

export async function createSecurityControl(
  payload: SecurityControlCreatePayload
): Promise<SecurityControlResponse> {
  return await apiRequest<SecurityControlResponse>('/controls', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
