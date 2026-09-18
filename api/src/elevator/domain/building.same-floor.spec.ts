import { describe, expect, it } from 'vitest';
import { aBuilding, tickUntil } from './test-support.js';

describe('Requests for the floor the car is already on', () => {
  it('opens the doors without moving when the car is already there (spec edge case)', () => {
    const building = aBuilding();
    const car = building.elevator('A');
    expect(car.currentFloor).toBe(1);

    building.requestElevator(1, 'up');
    tickUntil(building, () => car.doors.isOpen());

    expect(car.currentFloor).toBe(1);
  });

  it('treats the current floor as an already-reached destination (FR-029)', () => {
    const building = aBuilding();
    building.requestElevator(3, 'up');
    const car = building.elevator(building.pendingRequests[0]!.assignedTo);
    tickUntil(building, () => car.currentFloor === 3 && car.doors.isOpen());

    building.selectDestination(car.id, 3);

    expect(car.destinations).toEqual([]);
    expect(car.doors.isOpen()).toBe(true);
    expect(car.currentFloor).toBe(3);
  });
});
