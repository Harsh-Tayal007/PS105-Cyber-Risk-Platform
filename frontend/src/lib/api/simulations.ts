import { apiRequest } from './client';
import type { SimulationRunRequestPayload, SimulationResultDict } from '@/types';

export async function runMonteCarloSimulation(
  payload: SimulationRunRequestPayload
): Promise<SimulationResultDict> {
  return await apiRequest<SimulationResultDict>('/simulations/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
