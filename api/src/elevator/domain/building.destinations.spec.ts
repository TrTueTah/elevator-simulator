import { describe, expect, it } from 'vitest';
import { aBuilding, tickUntil } from './test-support.js';
import { DoorsNotOpenError, FloorOutOfRangeError } from './errors.js';

/** Bring car A to a floor with its doors open, ready to take destinations. */
function boardAt(floor: number) {
  const building = aBuilding();
  building.requestElevator(floor, 'up');
  const owner = building.elevator(building.pendingRequests[0]!.assignedTo);
  tickUntil(building, () => owner.currentFloor === floor && owner.doors.isOpen());
  return { building, owner };
}

describe('Destinations', () => {
  it('serves several destinations in path order, not entry order (FR-027)', () => {
    const { building, owner } = boardAt(3);

    // Entered high-then-low while the car is heading up.
    building.selectDestination(owner.id, 9);
    building.selectDestination(owner.id, 5);

    const stops: number[] = [];
    let wasOpen = true;
    for (let step = 0; step < 60; step += 1) {
      building.tick();
      const open = owner.doors.isOpen();
      if (open && !wasOpen) stops.push(owner.currentFloor);
      wasOpen = open;
    }

    expect(stops).toEqual([5, 9]);
  });

  it('treats a repeat selection as a no-op (FR-028)', () => {
    const { building, owner } = boardAt(2);

    building.selectDestination(owner.id, 7);
    building.selectDestination(owner.id, 7);

    expect(owner.destinations).toEqual([7]);
  });

  it('accepts a destination that contradicts the requested direction (clarification Q4)', () => {
    const { building, owner } = boardAt(5); // called "up"

    expect(() => building.selectDestination(owner.id, 2)).not.toThrow();
    expect(owner.destinations).toEqual([2]);

    tickUntil(building, () => owner.currentFloor === 2 && owner.doors.isOpen(), 60);
  });

  it('records destinations above and below from one stop (spec edge case)', () => {
    const { building, owner } = boardAt(5);

    building.selectDestination(owner.id, 9);
    building.selectDestination(owner.id, 2);

    expect(owner.destinations).toEqual([2, 9]);
  });

  it('refuses a destination while the doors are closed (FR-026)', () => {
    const building = aBuilding();
    expect(() => building.selectDestination('A', 5)).toThrow(DoorsNotOpenError);
  });

  it('refuses a floor outside the building and changes nothing (FR-030, FR-053)', () => {
    const { building, owner } = boardAt(4);
    const before = JSON.stringify(building.snapshot());

    expect(() => building.selectDestination(owner.id, 12)).toThrow(FloorOutOfRangeError);

    expect(JSON.stringify(building.snapshot())).toBe(before);
  });
});
