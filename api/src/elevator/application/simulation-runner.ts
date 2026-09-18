import type { Building } from '../domain/building.js';
import type { ClockPort } from './ports/clock.port.js';

export const BASE_STEP_MS = 1000;
export const SPEEDS = [0.5, 1, 2, 4] as const;

export type SimulationSpeed = (typeof SPEEDS)[number];
export type SimulationStatus = 'running' | 'paused';

export function isSimulationSpeed(value: number): value is SimulationSpeed {
  return (SPEEDS as readonly number[]).includes(value);
}

export class SimulationNotPausedError extends Error {
  readonly code = 'SIMULATION_NOT_PAUSED';

  constructor() {
    super('The simulation is running; pause it before stepping.');
    this.name = 'SimulationNotPausedError';
  }
}

export class InvalidSpeedError extends Error {
  readonly code = 'INVALID_SPEED';

  constructor(value: number) {
    super(`Speed ${value} is not available; choose one of ${SPEEDS.join(', ')}.`);
    this.name = 'InvalidSpeedError';
  }
}

/**
 * Owns the passage of real time and nothing else - no elevator rule lives here.
 * Pace is expressed only in milliseconds between ticks; every duration inside
 * the simulation is counted in ticks, so changing speed cannot change the
 * sequence of states (FR-005d, SC-014).
 */
export class SimulationRunner {
  #status: SimulationStatus = 'running';
  #speed: SimulationSpeed = 1;

  constructor(
    private readonly building: Building,
    private readonly clock: ClockPort,
    private readonly onAdvance: () => void,
  ) {}

  get status(): SimulationStatus {
    return this.#status;
  }

  get speed(): SimulationSpeed {
    return this.#speed;
  }

  get intervalMs(): number {
    return BASE_STEP_MS / this.#speed;
  }

  start(): void {
    if (this.#status === 'running') this.schedule();
  }

  stop(): void {
    this.clock.stop();
  }

  pause(): void {
    if (this.#status === 'paused') return;
    this.#status = 'paused';
    this.clock.stop();
  }

  resume(): void {
    if (this.#status === 'running') return;
    this.#status = 'running';
    this.schedule();
  }

  /** Exactly one step, and only while paused (FR-005c). */
  step(): void {
    if (this.#status !== 'paused') throw new SimulationNotPausedError();
    this.advance();
  }

  setSpeed(value: number): void {
    if (!isSimulationSpeed(value)) throw new InvalidSpeedError(value);
    this.#speed = value;
    if (this.#status === 'running') this.schedule();
  }

  private schedule(): void {
    this.clock.stop();
    this.clock.start(() => this.advance(), this.intervalMs);
  }

  private advance(): void {
    this.building.tick();
    this.onAdvance();
  }
}
