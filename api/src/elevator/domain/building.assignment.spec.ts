import { describe, expect, it } from 'vitest';
import { aBuilding } from './test-support.js';

describe('Assignment is sticky (FR-011, clarification Q1)', () => {
  it('never moves a request to another car once assigned', () => {
    const building = aBuilding();
    const request = building.requestElevator(7, 'down');
    const owner = request.assignedTo;

    // Churn the building: more requests, many ticks.
    for (let step = 0; step < 60; step += 1) {
      building.tick();
      if (step % 7 === 0) building.requestElevator(((step % 9) + 2) as number, 'up');

      const stillPending = building.pendingRequests.find(
        (r) => r.floor === 7 && r.direction === 'down',
      );
      if (!stillPending) break;
      expect(stillPending.assignedTo).toBe(owner);
      expect(stillPending).toBe(request);
    }
  });

  it('exposes the owner so the interface can show it (FR-011)', () => {
    const building = aBuilding();
    const request = building.requestElevator(5, 'up');

    const snapshot = building.snapshot();
    const shown = snapshot.pendingRequests.find((r) => r.floor === 5);
    expect(shown?.assignedTo).toBe(request.assignedTo);
  });
});
