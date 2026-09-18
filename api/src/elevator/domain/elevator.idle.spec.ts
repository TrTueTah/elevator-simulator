import { describe, expect, it } from 'vitest';
import { aBuilding, tickTimes, tickUntil } from './test-support.js';

describe('An elevator with nothing left to do', () => {
  it('goes idle with no direction of travel (FR-015)', () => {
    const building = aBuilding();
    building.requestElevator(4, 'up');
    const car = building.elevator(building.pendingRequests[0]!.assignedTo);

    tickUntil(building, () => car.motion.kind === 'idle', 60);

    expect(car.travelDirection).toBe('none');
    expect(car.destinations).toEqual([]);
    expect(car.assignedRequests).toEqual([]);
  });

  it('stays on the floor where it finished rather than returning home (FR-018a, clarification Q5)', () => {
    const building = aBuilding();
    building.requestElevator(7, 'up');
    const car = building.elevator(building.pendingRequests[0]!.assignedTo);

    tickUntil(building, () => car.currentFloor === 7 && car.doors.isOpen());
    tickTimes(building, 40);

    expect(car.currentFloor).toBe(7);
    expect(car.motion.kind).toBe('idle');
  });

  it('never reports a direction while idle (invariant I3)', () => {
    const building = aBuilding();
    building.requestElevator(6, 'down');

    for (let step = 0; step < 60; step += 1) {
      building.tick();
      for (const car of building.elevators) {
        if (car.motion.kind === 'idle') expect(car.travelDirection).toBe('none');
      }
    }
  });
});
