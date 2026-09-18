/** The direction a waiting person wants to travel, and of a car in motion. */
export type Direction = 'up' | 'down';

/**
 * A car's physical direction of travel. There is exactly one direction concept
 * in this domain - no separate "committed service direction" (clarification Q2).
 */
export type TravelDirection = Direction | 'none';

export type DoorPhase = 'closed' | 'opening' | 'open' | 'closing';

export type MotionState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'moving'; readonly direction: Direction }
  | { readonly kind: 'stopped' };

export const IDLE: MotionState = { kind: 'idle' };
export const STOPPED: MotionState = { kind: 'stopped' };

export function moving(direction: Direction): MotionState {
  return { kind: 'moving', direction };
}

export function opposite(direction: Direction): Direction {
  return direction === 'up' ? 'down' : 'up';
}
