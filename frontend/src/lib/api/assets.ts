import { apiRequest } from './client';
import type { AssetResponse, AssetCreatePayload, AssetUpdatePayload } from '@/types';

export async function getAssets(): Promise<AssetResponse[]> {
  return await apiRequest<AssetResponse[]>('/assets');
}

export async function createAsset(payload: AssetCreatePayload): Promise<AssetResponse> {
  return await apiRequest<AssetResponse>('/assets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAsset(
  assetId: number,
  payload: AssetUpdatePayload
): Promise<AssetResponse> {
  return await apiRequest<AssetResponse>(`/assets/${assetId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAsset(assetId: number): Promise<{ message: string }> {
  return await apiRequest<{ message: string }>(`/assets/${assetId}`, {
    method: 'DELETE',
  });
}

