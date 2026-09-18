import { describe, expect, it } from 'vitest';
import { aBuilding } from './test-support.js';
import { FixedOrderStrategy } from './dispatch/fixed-order.strategy.js';

describe('Repositioning is not an express run (FR-025a, clarification Q2)', () => {
  it('collects its own same-direction calls while travelling to reach another', () => {
    const building = aBuilding(new FixedOrderStrategy());
    const car = building.elevator('A');

    // A must climb from 1 to 8 to serve a DOWN call, passing an UP call at 5.
    building.requestElevator(8, 'down');
    building.requestElevator(5, 'up');

    const stops: number[] = [];
    let wasOpen = false;
    for (let step = 0; step < 40; step += 1) {
      building.tick();
      const open = car.doors.isOpen();
      if (open && !wasOpen) stops.push(car.currentFloor);
      wasOpen = open;
    }

    // It stopped at 5 on the way up: its direction of travel at that moment was
    // up, and there is no separate "committed service direction".
    expect(stops[0]).toBe(5);
    expect(stops).toContain(8);
    expect(building.pendingRequests).toHaveLength(0);
  });
});
