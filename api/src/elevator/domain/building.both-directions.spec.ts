import { describe, expect, it } from 'vitest';
import { aBuilding, tickUntil } from './test-support.js';
import { FixedOrderStrategy } from './dispatch/fixed-order.strategy.js';

describe('Up and down at the same floor (FR-010)', () => {
  it('tracks them as two independent requests', () => {
    const building = aBuilding();

    building.requestElevator(4, 'up');
    building.requestElevator(4, 'down');

    expect(building.pendingRequests).toHaveLength(2);
    expect(new Set(building.pendingRequests.map((r) => r.direction))).toEqual(
      new Set(['up', 'down']),
    );
  });

  it('leaves the other one pending when one is served', () => {
    const building = aBuilding(new FixedOrderStrategy());
    const car = building.elevator('A');

    building.requestElevator(4, 'up');
    building.requestElevator(4, 'down');

    // The car arrives at 4 travelling up, so only the up call is collected.
    tickUntil(building, () => car.currentFloor === 4 && car.doors.isOpen());

    const stillPending = building.pendingRequests;
    expect(stillPending).toHaveLength(1);
    expect(stillPending[0]!.direction).toBe('down');
  });
});
