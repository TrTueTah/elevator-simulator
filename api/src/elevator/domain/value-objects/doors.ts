import type { DoorPhase } from './direction.js';

/**
 * Dwell is counted in simulation steps, never in milliseconds, so that changing
 * the simulation speed cannot change behaviour (FR-005d, SC-014).
 */
export const DWELL_TICKS = 3;

/**
 * Owns every door transition and the single guard the elevator consults before
 * moving. All state is private: the phase can only change through these methods
 * (Constitution Principle II).
 */
export class Doors {
  #phase: DoorPhase = 'closed';
  #dwellRemaining = 0;
  #holdRequested = false;

  get phase(): DoorPhase {
    return this.#phase;
  }

  get dwellRemaining(): number {
    return this.#dwellRemaining;
  }

  get isHeld(): boolean {
    return this.#holdRequested;
  }

  /** The one guard that makes "never move with the doors open" structural (FR-033). */
  areClosed(): boolean {
    return this.#phase === 'closed';
  }

  isOpen(): boolean {
    return this.#phase === 'open';
  }

  /**
   * Begin opening. Re-opening already-open doors restarts the dwell, which is
   * what makes selecting the current floor as a destination meaningful (FR-029).
   */
  beginOpening(): void {
    switch (this.#phase) {
      case 'closed':
      case 'closing':
        this.#phase = 'opening';
        return;
      case 'open':
        this.#dwellRemaining = DWELL_TICKS;
        return;
      case 'opening':
        return;
    }
  }

  /** Hold the doors open indefinitely (FR-037). Ignored once closing has begun (FR-040). */
  hold(): void {
    if (this.#phase === 'closing') return;
    this.#holdRequested = true;
  }

  /** Release the hold; the dwell period restarts from full (FR-038). */
  releaseHold(): void {
    this.#holdRequested = false;
    if (this.#phase === 'open') {
      this.#dwellRemaining = DWELL_TICKS;
    }
  }

  /** Close now, overriding both an active hold and any remaining dwell (FR-039). */
  closeNow(): void {
    this.#holdRequested = false;
    if (this.#phase === 'open' || this.#phase === 'opening') {
      this.#phase = 'closing';
      this.#dwellRemaining = 0;
    }
  }

  tick(): void {
    switch (this.#phase) {
      case 'opening':
        this.#phase = 'open';
        this.#dwellRemaining = DWELL_TICKS;
        return;
      case 'open':
        if (this.#holdRequested) return;
        this.#dwellRemaining -= 1;
        if (this.#dwellRemaining <= 0) {
          this.#phase = 'closing';
          this.#dwellRemaining = 0;
        }
        return;
      case 'closing':
        this.#phase = 'closed';
        return;
      case 'closed':
        return;
    }
  }
}
