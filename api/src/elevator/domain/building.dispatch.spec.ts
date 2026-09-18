import { describe, expect, it } from 'vitest';
import { aBuilding, tickTimes, tickUntil } from './test-support.js';

describe('Dispatch across the building (US4)', () => {
  it('queues a request made while every car is busy, and serves it (FR-012, FR-014)', () => {
    const building = aBuilding();
    for (const floor of [4, 7, 10]) building.requestElevator(floor, 'down');
    tickTimes(building, 3);

    const late = building.requestElevator(2, 'up');
    expect(late.assignedTo).toBeDefined();

    tickUntil(building, () => building.pendingRequests.length === 0, 200);
  });

  it('gives every request exactly one owner that exists (FR-011, invariant B2)', () => {
    const building = aBuilding();
    for (const floor of [2, 5, 8]) building.requestElevator(floor, 'up');

    const ids = building.elevators.map((car) => car.id);
    for (const request of building.pendingRequests) {
      expect(ids).toContain(request.assignedTo);
      const owner = building.elevator(request.assignedTo);
      expect(owner.assignedRequests).toContain(request);
      // ...and no other car claims it.
      const others = building.elevators.filter((car) => car.id !== request.assignedTo);
      for (const car of others) expect(car.assignedRequests).not.toContain(request);
    }
  });

  it('eventually serves every assigned request, so no assignment is a dead end (FR-044)', () => {
    const building = aBuilding();
    building.requestElevator(9, 'down');
    building.requestElevator(2, 'up');
    building.requestElevator(6, 'down');

    tickUntil(building, () => building.pendingRequests.length === 0, 200);
  });
});
