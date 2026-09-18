import type { FloorNumber } from './value-objects/floor-number.js';
import type { TravelDirection } from './value-objects/direction.js';

export type ElevatorId = 'A' | 'B' | 'C';

export const ELEVATOR_IDS: readonly ElevatorId[] = ['A', 'B', 'C'];

export function isElevatorId(value: string): value is ElevatorId {
  return (ELEVATOR_IDS as readonly string[]).includes(value);
}

/**
 * A narrow, readonly projection of an elevator. Requests and dispatch
 * strategies decide against this rather than the entity, so neither can mutate
 * a car.
 */
export interface ElevatorView {
  readonly id: ElevatorId;
  readonly floor: FloorNumber;
  readonly travelDirection: TravelDirection;
  readonly workload: number;
}
