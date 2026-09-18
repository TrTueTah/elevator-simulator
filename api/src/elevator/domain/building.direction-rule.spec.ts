import { describe, expect, it } from 'vitest';
import { aBuilding, tickUntil } from './test-support.js';
import { FixedOrderStrategy } from './dispatch/fixed-order.strategy.js';
import type { Building } from './building.js';
import type { Elevator } from './elevator.js';

/**
 * These tests pin one car's behaviour, so they use the fixed strategy to send
 * every request to car A. Which car is chosen is User Story 4's concern; what
 * a moving car does with the requests it owns is this one's.
 */
function withOneCar(): { building: Building; car: Elevator } {
  const building = aBuilding(new FixedOrderStrategy());
  return { building, car: building.elevator('A') };
}

/** Every floor at which the doors opened, in order. */
function recordStops(building: Building, car: Elevator, steps: number): number[] {
  const stops: number[] = [];
  let wasOpen = car.doors.isOpen();
  for (let step = 0; step < steps; step += 1) {
    building.tick();
    const open = car.doors.isOpen();
    if (open && !wasOpen) stops.push(car.currentFloor);
    wasOpen = open;
  }
  return stops;
}

describe('The direction rule (US2)', () => {
  it('collects same-direction calls and passes opposite ones (FR-021, FR-022)', () => {
    const { building, car } = withOneCar();

    // Send the car on a run from 1 to 10.
    building.requestElevator(1, 'up');
    tickUntil(building, () => car.doors.isOpen());
    building.selectDestination('A', 10);

    // Someone going up at 5, someone going down at 7.
    building.requestElevator(5, 'up');
    building.requestElevator(7, 'down');

    const stops = recordStops(building, car, 40);

    // It stopped at 5 on the way up and did NOT stop at 7 on the way up.
    expect(stops.slice(0, 2)).toEqual([5, 10]);
    // ...and collected the down call on the return run.
    expect(stops).toContain(7);
    expect(stops.indexOf(7)).toBeGreaterThan(stops.indexOf(10));
  });

  it('leaves a passed-over call pending until a run in its direction (FR-022, SC-006)', () => {
    const { building, car } = withOneCar();

    building.requestElevator(1, 'up');
    tickUntil(building, () => car.doors.isOpen());
    building.selectDestination('A', 10);
    building.requestElevator(7, 'down');

    // While the car is below 7 and heading up, the call stays pending.
    tickUntil(building, () => car.currentFloor === 8);
    expect(building.pendingRequests.some((r) => r.floor === 7 && r.direction === 'down')).toBe(true);

    // It is collected once the car is heading down.
    tickUntil(building, () => car.currentFloor === 7 && car.doors.isOpen(), 60);
    expect(building.pendingRequests.some((r) => r.floor === 7)).toBe(false);
  });

  it('does not reverse mid-run for a call behind it (FR-023)', () => {
    const { building, car } = withOneCar();

    building.requestElevator(1, 'up');
    tickUntil(building, () => car.doors.isOpen());
    building.selectDestination('A', 10);
    tickUntil(building, () => car.currentFloor === 6);

    building.requestElevator(3, 'up'); // behind the car

    // It keeps climbing to 10 rather than turning around.
    const floors: number[] = [];
    tickUntil(building, () => {
      floors.push(car.currentFloor);
      return car.currentFloor === 10;
    }, 40);
    expect(Math.min(...floors)).toBeGreaterThanOrEqual(6);

    // The call is served on a later run, not dropped (FR-014).
    tickUntil(building, () => car.currentFloor === 3 && car.doors.isOpen(), 80);
    expect(building.pendingRequests).toHaveLength(0);
  });

  it('lets an idle car answer a call in either direction (FR-024)', () => {
    const { building, car } = withOneCar();
    expect(car.motion.kind).toBe('idle');

    building.requestElevator(6, 'down');

    tickUntil(building, () => car.currentFloor === 6 && car.doors.isOpen(), 40);
    expect(building.pendingRequests).toHaveLength(0);
  });

  it('always stops at its own destination whatever the direction (FR-025)', () => {
    const { building, car } = withOneCar();

    building.requestElevator(1, 'up');
    tickUntil(building, () => car.doors.isOpen());
    building.selectDestination('A', 6);
    building.selectDestination('A', 9);

    const stops = recordStops(building, car, 40);
    expect(stops.slice(0, 2)).toEqual([6, 9]);
  });
});
