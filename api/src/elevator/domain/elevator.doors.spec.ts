import { describe, expect, it } from 'vitest';
import { aBuilding, tickTimes, tickUntil } from './test-support.js';
import { FixedOrderStrategy } from './dispatch/fixed-order.strategy.js';
import { DoorsCannotOpenError, DoorsNotOpenError } from './errors.js';

function carAtFloorWithDoorsOpen(floor: number) {
  const building = aBuilding(new FixedOrderStrategy());
  const car = building.elevator('A');
  building.requestElevator(floor, 'up');
  tickUntil(building, () => car.currentFloor === floor && car.doors.isOpen());
  return { building, car };
}

describe('Door control (US3)', () => {
  it('holds the doors open indefinitely and the car does not move (FR-037, FR-033)', () => {
    const { building, car } = carAtFloorWithDoorsOpen(3);
    building.selectDestination('A', 9); // somewhere to go, if only it could

    building.holdDoors('A');
    tickTimes(building, 30);

    expect(car.doors.phase).toBe('open');
    expect(car.doors.isHeld).toBe(true);
    expect(car.currentFloor).toBe(3); // never moved a single floor
    expect(car.destinations).toEqual([9]); // still waiting
  });

  it('resumes travel once the doors are closed on command (FR-039)', () => {
    const { building, car } = carAtFloorWithDoorsOpen(3);
    building.selectDestination('A', 9);
    building.holdDoors('A');
    tickTimes(building, 10);
    expect(car.currentFloor).toBe(3);

    building.closeDoors('A');

    tickUntil(building, () => car.currentFloor === 9, 40);
    expect(car.currentFloor).toBe(9);
  });

  it('restarts the dwell when the hold is released (FR-038)', () => {
    const { building, car } = carAtFloorWithDoorsOpen(2);
    building.holdDoors('A');
    tickTimes(building, 10);

    building.releaseDoors('A');
    expect(car.doors.isHeld).toBe(false);
    expect(car.doors.dwellRemaining).toBeGreaterThan(0);

    tickUntil(building, () => car.doors.areClosed(), 10);
  });

  it('refuses to open the doors while the car is between floors (FR-034)', () => {
    const building = aBuilding(new FixedOrderStrategy());
    const car = building.elevator('A');
    building.requestElevator(8, 'up');
    tickUntil(building, () => car.motion.kind === 'moving');

    const before = JSON.stringify(building.snapshot());
    expect(() => car.openDoors()).toThrow(DoorsCannotOpenError);
    expect(JSON.stringify(building.snapshot())).toBe(before); // unchanged (FR-053)
  });

  it('refuses hold and release when the doors are closed (FR-053)', () => {
    const building = aBuilding();
    expect(() => building.holdDoors('A')).toThrow(DoorsNotOpenError);
    expect(() => building.releaseDoors('A')).toThrow(DoorsNotOpenError);
  });

  it('survives any interleaving of hold and close (FR-040)', () => {
    const { building, car } = carAtFloorWithDoorsOpen(4);

    building.holdDoors('A');
    building.closeDoors('A');
    building.holdDoors('A'); // ignored: already closing

    expect(car.doors.phase).toBe('closing');
    expect(car.doors.isHeld).toBe(false);

    building.tick();
    expect(car.doors.areClosed()).toBe(true);
  });
});
