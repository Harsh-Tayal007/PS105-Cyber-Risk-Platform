import { apiRequest } from './client';
import type { OrganizationResponse, OrganizationUpdatePayload } from '@/types';

export async function getOrganizationMe(): Promise<OrganizationResponse> {
  return await apiRequest<OrganizationResponse>('/organizations/me');
}

export async function updateOrganizationMe(
  payload: OrganizationUpdatePayload
): Promise<OrganizationResponse> {
  return await apiRequest<OrganizationResponse>('/organizations/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
