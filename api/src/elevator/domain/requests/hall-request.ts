import { ElevatorRequest } from './elevator-request.js';
import type { FloorNumber } from '../value-objects/floor-number.js';
import type { Direction } from '../value-objects/direction.js';
import type { ElevatorId, ElevatorView } from '../elevator-view.js';

/**
 * A person's call from a floor. This class owns the direction rule - FR-021,
 * FR-022, FR-023 and FR-024 are the three conditions in `shouldStopFor` and
 * exist nowhere else in the codebase.
 */
export class HallRequest extends ElevatorRequest {
  constructor(
    floor: FloorNumber,
    readonly direction: Direction,
    /** Set once at creation and never changed - assignment is sticky (FR-011, clarification Q1). */
    readonly assignedTo: ElevatorId,
  ) {
    super(floor);
  }

  /** Identity is (floor, direction): the same call twice is the same request (FR-009, FR-010). */
  get key(): string {
    return `${this.floor}:${this.direction}`;
  }

  shouldStopFor(car: ElevatorView): boolean {
    // An elevator never serves a request belonging to another car (FR-022).
    if (car.id !== this.assignedTo) return false;
    if (car.floor !== this.floor) return false;
    // An idle car may serve either direction (FR-024); a moving one only its own (FR-021).
    return car.travelDirection === 'none' || car.travelDirection === this.direction;
  }
}
