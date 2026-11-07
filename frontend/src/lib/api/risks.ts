import { apiRequest } from './client';
import type { RiskQuantificationDict, ThreatResponse, RiskCreatePayload } from '@/types';

export async function getRiskAssessment(): Promise<RiskQuantificationDict[]> {
  return await apiRequest<RiskQuantificationDict[]>('/risks/assessment');
}

export async function calculateRiskResiduals(
  selectedControlIds: number[]
): Promise<RiskQuantificationDict[]> {
  return await apiRequest<RiskQuantificationDict[]>('/risks/calculate', {
    method: 'POST',
    body: JSON.stringify({ selected_control_ids: selectedControlIds }),
  });
}

export async function getThreats(): Promise<ThreatResponse[]> {
  return await apiRequest<ThreatResponse[]>('/risks/threats');
}

export async function createRisk(payload: RiskCreatePayload): Promise<any> {
  return await apiRequest<any>('/risks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function autoMapRisks(): Promise<{ message: string; created_risks_count: number }> {
  return await apiRequest<{ message: string; created_risks_count: number }>('/risks/auto-map', {
    method: 'POST',
  });
}

