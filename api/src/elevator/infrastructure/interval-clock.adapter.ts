import { Injectable } from '@nestjs/common';
import type { ClockPort } from '../application/ports/clock.port.js';

/**
 * The only `setInterval` in the codebase. Everything above this file receives
 * time through `ClockPort` (Constitution Principle IV).
 */
@Injectable()
export class IntervalClockAdapter implements ClockPort {
  #handle: NodeJS.Timeout | null = null;

  start(onTick: () => void, intervalMs: number): void {
    this.stop();
    this.#handle = setInterval(onTick, intervalMs);
  }

  stop(): void {
    if (this.#handle !== null) {
      clearInterval(this.#handle);
      this.#handle = null;
    }
  }
}
