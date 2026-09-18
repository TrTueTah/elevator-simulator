import type { DispatchStrategy, HallCall } from './dispatch-strategy.js';
import type { ElevatorId, ElevatorView } from '../elevator-view.js';

/**
 * Always picks the first car, ignoring state entirely. Deliberately naive: it
 * is the second implementation that justifies `DispatchStrategy` being a port,
 * and the control case that proves the distribution tests discriminate.
 * Test-only - never wired into the running application.
 */
export class FixedOrderStrategy implements DispatchStrategy {
  chooseFor(_call: HallCall, cars: readonly ElevatorView[]): ElevatorId {
    const ordered = [...cars].sort((a, b) => a.id.localeCompare(b.id));
    const first = ordered[0];
    if (!first) throw new Error('Cannot dispatch: the building has no elevators.');
    return first.id;
  }
}
