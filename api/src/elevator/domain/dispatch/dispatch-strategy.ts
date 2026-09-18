import type { FloorNumber } from '../value-objects/floor-number.js';
import type { Direction } from '../value-objects/direction.js';
import type { ElevatorId, ElevatorView } from '../elevator-view.js';

export type { ElevatorView };

export interface HallCall {
  readonly floor: FloorNumber;
  readonly direction: Direction;
}

/**
 * Chooses which car owns a new hall request. A port with two real
 * implementations, which is what earns it the right to exist under
 * Constitution Principle V.
 */
export interface DispatchStrategy {
  chooseFor(call: HallCall, cars: readonly ElevatorView[]): ElevatorId;
}
