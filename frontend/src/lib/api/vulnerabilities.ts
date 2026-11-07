import { apiRequest } from './client';
import type { VulnerabilityResponse, FindingResponse } from '@/types';

export async function getVulnerabilityIntelligence(): Promise<VulnerabilityResponse[]> {
  return await apiRequest<VulnerabilityResponse[]>('/vulnerabilities/intelligence');
}

export async function getVerifiedFindings(): Promise<FindingResponse[]> {
  return await apiRequest<FindingResponse[]>('/vulnerabilities/findings');
}
