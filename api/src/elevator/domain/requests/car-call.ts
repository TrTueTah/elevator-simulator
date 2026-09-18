import { ElevatorRequest } from './elevator-request.js';
import type { FloorNumber } from '../value-objects/floor-number.js';
import type { ElevatorId, ElevatorView } from '../elevator-view.js';

/**
 * A destination selected from inside a car. Destinations are served regardless
 * of the direction-matching rule that governs pickups (FR-025) - which is
 * expressed here simply by not testing direction at all.
 */
export class CarCall extends ElevatorRequest {
  constructor(
    readonly elevatorId: ElevatorId,
    floor: FloorNumber,
  ) {
    super(floor);
  }

  shouldStopFor(car: ElevatorView): boolean {
    return car.id === this.elevatorId && car.floor === this.floor;
  }
}
