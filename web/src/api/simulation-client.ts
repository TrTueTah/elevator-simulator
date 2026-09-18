import { API_BASE_URL } from './config.ts';
import type { Direction } from '../types/snapshot.ts';

export class CommandError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function post(path: string, body?: unknown): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const { code, message } =
      payload && typeof payload === 'object'
        ? (payload as { code?: string; message?: string })
        : {};
    throw new CommandError(code ?? 'UNKNOWN', message ?? `Request failed (${response.status}).`);
  }
}

export const simulationClient = {
  streamUrl: () => `${API_BASE_URL}/api/simulation/stream`,

  requestElevator: (floor: number, direction: Direction) =>
    post('/api/simulation/requests', { floor, direction }),

  selectDestination: (id: string, floor: number) =>
    post(`/api/simulation/elevators/${id}/destination`, { floor }),

  holdDoors: (id: string) => post(`/api/simulation/elevators/${id}/doors/hold`),
  releaseDoors: (id: string) => post(`/api/simulation/elevators/${id}/doors/release`),
  closeDoors: (id: string) => post(`/api/simulation/elevators/${id}/doors/close`),

  pause: () => post('/api/simulation/pause'),
  resume: () => post('/api/simulation/resume'),
  step: () => post('/api/simulation/step'),
  setSpeed: (speed: number) => post('/api/simulation/speed', { speed }),
  reset: () => post('/api/simulation/reset'),
};
