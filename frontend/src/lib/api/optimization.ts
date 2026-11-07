import { apiRequest } from './client';
import type {
  OptimizationRunRequestPayload,
  OptimizationResultDict,
  ScenarioCreatePayload,
  ScenarioResponse,
} from '@/types';

export async function getScenarios(): Promise<ScenarioResponse[]> {
  return await apiRequest<ScenarioResponse[]>('/optimization/scenarios');
}

export async function createScenario(
  payload: ScenarioCreatePayload
): Promise<ScenarioResponse> {
  return await apiRequest<ScenarioResponse>('/optimization/scenarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function runOptimization(
  payload: OptimizationRunRequestPayload
): Promise<OptimizationResultDict> {
  return await apiRequest<OptimizationResultDict>('/optimization/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

