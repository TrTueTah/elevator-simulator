import { describe, expect, it } from 'vitest';
import { aBuilding, tickUntil } from './test-support.js';

describe('A complete ride (US1)', () => {
  it('calls a car, opens the doors, takes a destination and delivers (FR-007, FR-026, FR-027)', () => {
    const building = aBuilding();

    building.requestElevator(3, 'up');
    const request = building.pendingRequests[0];
    expect(request).toBeDefined();

    const owner = building.elevator(request!.assignedTo);
    expect(owner.currentFloor).toBe(1);

    // It travels to the caller and opens up.
    tickUntil(building, () => owner.currentFloor === 3 && owner.doors.isOpen());
    expect(owner.motion.kind).toBe('stopped');
    expect(building.pendingRequests).toHaveLength(0); // served (FR-013)

    // The passenger picks a floor.
    building.selectDestination(owner.id, 8);
    expect(owner.destinations).toEqual([8]);

    // The doors close on their own, then it travels.
    tickUntil(building, () => owner.currentFloor === 8 && owner.doors.isOpen());
    expect(owner.destinations).toEqual([]); // cleared on arrival (FR-031)
  });

  it('moves exactly one floor per step and passes through the floors between (FR-016)', () => {
    const building = aBuilding();
    building.requestElevator(5, 'up');
    const owner = building.elevator(building.pendingRequests[0]!.assignedTo);

    const visited: number[] = [owner.currentFloor];
    tickUntil(building, () => {
      if (owner.currentFloor !== visited[visited.length - 1]) visited.push(owner.currentFloor);
      return owner.currentFloor === 5;
    });

    expect(visited).toEqual([1, 2, 3, 4, 5]);
  });

  it('never moves while the doors are anything but closed (FR-033)', () => {
    const building = aBuilding();
    building.requestElevator(4, 'up');
    const owner = building.elevator(building.pendingRequests[0]!.assignedTo);

    for (let step = 0; step < 40; step += 1) {
      const before = owner.currentFloor;
      const doorsClosedBefore = owner.doors.areClosed();
      building.tick();
      if (owner.currentFloor !== before) {
        expect(doorsClosedBefore).toBe(true);
      }
    }
  });
});
