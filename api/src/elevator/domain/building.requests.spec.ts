import { describe, expect, it } from 'vitest';
import { aBuilding, tickTimes } from './test-support.js';
import { InvalidRequestDirectionError, FloorOutOfRangeError } from './errors.js';

describe('Hall requests', () => {
  // Constitution Principle III names this invariant explicitly.
  it('treats a repeat of a pending (floor, direction) as the same request (FR-009)', () => {
    const building = aBuilding();

    const first = building.requestElevator(6, 'up');
    const second = building.requestElevator(6, 'up');
    const third = building.requestElevator(6, 'up');

    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(building.pendingRequests).toHaveLength(1);

    const owner = building.elevator(first.assignedTo);
    expect(owner.assignedRequests).toHaveLength(1);
  });

  it('produces exactly one stop for a request pressed repeatedly (FR-009)', () => {
    const building = aBuilding();
    building.requestElevator(4, 'up');
    building.requestElevator(4, 'up');
    const owner = building.elevator(building.pendingRequests[0]!.assignedTo);

    let stops = 0;
    let wasOpen = false;
    for (let step = 0; step < 40; step += 1) {
      building.tick();
      const open = owner.doors.isOpen();
      if (open && !wasOpen) stops += 1;
      wasOpen = open;
    }

    expect(stops).toBe(1);
  });

  it('accepts a request even when every car is busy — it queues, never refuses (FR-012)', () => {
    const building = aBuilding();
    for (const floor of [3, 6, 9]) building.requestElevator(floor, 'up');
    tickTimes(building, 2);

    expect(() => building.requestElevator(2, 'up')).not.toThrow();
    expect(building.pendingRequests.some((r) => r.floor === 2)).toBe(true);
  });

  it('refuses to go up from the top or down from the bottom (FR-008)', () => {
    const building = aBuilding();
    expect(() => building.requestElevator(10, 'up')).toThrow(InvalidRequestDirectionError);
    expect(() => building.requestElevator(1, 'down')).toThrow(InvalidRequestDirectionError);
    expect(() => building.requestElevator(10, 'down')).not.toThrow();
    expect(() => building.requestElevator(1, 'up')).not.toThrow();
  });

  it('refuses a floor outside the building (FR-004)', () => {
    const building = aBuilding();
    expect(() => building.requestElevator(11, 'up')).toThrow(FloorOutOfRangeError);
    expect(() => building.requestElevator(0, 'up')).toThrow(FloorOutOfRangeError);
  });

  it('leaves the simulation untouched when a request is refused (FR-053)', () => {
    const building = aBuilding();
    const before = JSON.stringify(building.snapshot());

    expect(() => building.requestElevator(10, 'up')).toThrow();

    expect(JSON.stringify(building.snapshot())).toBe(before);
  });
});
