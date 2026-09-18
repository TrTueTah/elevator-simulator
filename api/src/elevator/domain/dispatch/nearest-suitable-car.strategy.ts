import type { DispatchStrategy, HallCall } from './dispatch-strategy.js';
import type { ElevatorId, ElevatorView } from '../elevator-view.js';
import { HIGHEST_FLOOR, LOWEST_FLOOR } from '../value-objects/floor-number.js';

/** A full sweep of the shaft - the cost of being sent the wrong way. */
const REVERSAL_PENALTY = HIGHEST_FLOOR - LOWEST_FLOOR;
/** How much each outstanding piece of work counts against a car. */
const WORKLOAD_WEIGHT = 2;

/**
 * Scores every car and picks the lowest. Reads floor, direction and workload
 * (FR-041); a better-placed car therefore wins (FR-042); ties resolve by
 * ascending id so identical states always produce identical assignments
 * (FR-043).
 */
export class NearestSuitableCarStrategy implements DispatchStrategy {
  chooseFor(call: HallCall, cars: readonly ElevatorView[]): ElevatorId {
    const ordered = [...cars].sort((a, b) => a.id.localeCompare(b.id));
    const first = ordered[0];
    if (!first) throw new Error('Cannot dispatch: the building has no elevators.');

    let best = first;
    let bestScore = this.score(first, call);

    for (const car of ordered.slice(1)) {
      const score = this.score(car, call);
      // Strict less-than, over an id-ordered list, is the tie-break (FR-043).
      if (score < bestScore) {
        best = car;
        bestScore = score;
      }
    }
    return best.id;
  }

  private score(car: ElevatorView, call: HallCall): number {
    const distance = Math.abs(car.floor - call.floor);
    return distance + this.reversalPenalty(car, call) + car.workload * WORKLOAD_WEIGHT;
  }

  private reversalPenalty(car: ElevatorView, call: HallCall): number {
    if (car.travelDirection === 'none') return 0;

    const approaching =
      car.travelDirection === 'up' ? call.floor >= car.floor : call.floor <= car.floor;
    const sameDirection = car.travelDirection === call.direction;

    return approaching && sameDirection ? 0 : REVERSAL_PENALTY;
  }
}
