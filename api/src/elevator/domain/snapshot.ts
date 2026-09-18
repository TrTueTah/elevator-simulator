import type { Direction, DoorPhase, TravelDirection } from './value-objects/direction.js';
import type { ElevatorId } from './elevator-view.js';

export interface HallRequestSnapshot {
  readonly floor: number;
  readonly direction: Direction;
  readonly assignedTo: ElevatorId;
}

export interface ElevatorSnapshot {
  readonly id: ElevatorId;
  readonly currentFloor: number;
  readonly motion: 'idle' | 'moving' | 'stopped';
  readonly direction: TravelDirection;
  readonly doorPhase: DoorPhase;
  readonly doorHeld: boolean;
  readonly dwellRemaining: number;
  readonly destinations: readonly number[];
  readonly assignedRequests: readonly { readonly floor: number; readonly direction: Direction }[];
}

/**
 * Everything the interface needs in order to render without deciding anything
 * (FR-046, FR-047). The simulation's run status and pace are not part of the
 * building - the application layer adds those.
 */
export interface BuildingState {
  readonly stepCount: number;
  readonly elevators: readonly ElevatorSnapshot[];
  readonly pendingRequests: readonly HallRequestSnapshot[];
}
