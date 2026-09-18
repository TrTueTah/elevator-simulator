import { describe, expect, it } from 'vitest';
import { aBuilding } from './test-support.js';
import { FixedOrderStrategy } from './dispatch/fixed-order.strategy.js';
import { NearestSuitableCarStrategy } from './dispatch/nearest-suitable-car.strategy.js';
import type { DispatchStrategy } from './dispatch/dispatch-strategy.js';
import type { ElevatorId } from './elevator-view.js';
import type { HallRequest } from './requests/hall-request.js';

const CALLS: readonly (readonly [number, 'up' | 'down'])[] = [
  [5, 'up'], [8, 'up'], [3, 'down'], [10, 'down'], [2, 'up'],
  [7, 'down'], [4, 'up'], [9, 'up'], [6, 'down'], [3, 'up'],
  [10, 'down'], [2, 'down'], [8, 'down'], [5, 'down'], [7, 'up'],
  [4, 'down'], [9, 'down'], [6, 'up'], [10, 'down'], [2, 'up'],
];

/** Run the workload and report how many distinct requests each car was given. */
function assignmentCounts(strategy: DispatchStrategy): Map<ElevatorId, number> {
  const building = aBuilding(strategy);
  const seen = new Set<HallRequest>();
  const counts = new Map<ElevatorId, number>();

  for (const [floor, direction] of CALLS) {
    const request = building.requestElevator(floor, direction);
    if (!seen.has(request)) {
      seen.add(request);
      counts.set(request.assignedTo, (counts.get(request.assignedTo) ?? 0) + 1);
    }
    for (let i = 0; i < 4; i += 1) building.tick();
  }
  return counts;
}

describe('Work is spread across all three cars (SC-007)', () => {
  it('uses every car, and no car takes more than 60% of the work', () => {
    const counts = assignmentCounts(new NearestSuitableCarStrategy());
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

    expect(total).toBeGreaterThanOrEqual(18);
    expect(counts.size).toBe(3); // every car served at least one
    for (const [id, count] of counts) {
      expect(count / total, `elevator ${id} took too much of the load`).toBeLessThanOrEqual(0.6);
    }
  });

  it('fails for a strategy that ignores state — so the test discriminates', () => {
    const counts = assignmentCounts(new FixedOrderStrategy());

    // The control case: one car does everything.
    expect(counts.size).toBe(1);
    expect(counts.get('A')).toBeGreaterThan(0);
  });
});
