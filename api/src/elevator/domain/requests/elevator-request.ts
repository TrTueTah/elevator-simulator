import type { FloorNumber } from '../value-objects/floor-number.js';
import type { ElevatorView } from '../elevator-view.js';

/**
 * The base of the one inheritance hierarchy in this domain. It exists to remove
 * branching: without it, every stopping decision would test what kind of
 * request it is holding (Constitution Principle II).
 */
export abstract class ElevatorRequest {
  protected constructor(readonly floor: FloorNumber) {}

  /**
   * Does this request oblige the given car to stop right now? Each subclass
   * answers for itself - this is where the stopping rules live, and the only
   * place they live.
   */
  abstract shouldStopFor(car: ElevatorView): boolean;

  isAt(floor: FloorNumber): boolean {
    return this.floor === floor;
  }
}
