/**
 * The only way real time enters the system. The domain never reads a clock and
 * the runner only knows this interface, which is what keeps both testable
 * without waiting (Constitution Principle IV).
 */
export interface ClockPort {
  start(onTick: () => void, intervalMs: number): void;
  stop(): void;
}

export const CLOCK_PORT = Symbol('ClockPort');
