import type { ClockPort } from './clock.port.js';

/** Test double: time passes only when a test says so. */
export class FakeClock implements ClockPort {
  #onTick: (() => void) | null = null;
  #intervalMs = 0;

  get isRunning(): boolean {
    return this.#onTick !== null;
  }

  get intervalMs(): number {
    return this.#intervalMs;
  }

  start(onTick: () => void, intervalMs: number): void {
    this.#onTick = onTick;
    this.#intervalMs = intervalMs;
  }

  stop(): void {
    this.#onTick = null;
  }

  /** Fire the scheduled callback `times` times. */
  advance(times = 1): void {
    for (let i = 0; i < times; i += 1) {
      this.#onTick?.();
    }
  }
}
