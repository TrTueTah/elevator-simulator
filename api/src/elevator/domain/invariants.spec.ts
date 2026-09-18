import { describe, expect, it } from 'vitest';
import { aBuilding } from './test-support.js';
import { HIGHEST_FLOOR, LOWEST_FLOOR } from './value-objects/floor-number.js';
import type { ElevatorSnapshot } from './snapshot.js';

const STEPS = 1000;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The highest-value test in the suite. A randomised run with every kind of
 * command, checking after EVERY step that the five invariants from the data
 * model still hold. If this is green, the core rules hold (SC-003, SC-004,
 * SC-005).
 */
describe('Invariants hold across a 1,000-step randomised run', () => {
  it('never violates I1-I5', () => {
    const building = aBuilding();
    const random = mulberry32(42);
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;

    let movesObserved = 0;
    let stopsObserved = 0;

    for (let step = 1; step <= STEPS; step += 1) {
      // --- random commands, all of which must leave the building legal -----
      if (random() < 0.3) {
        const floor = 1 + Math.floor(random() * 10);
        const direction = random() < 0.5 ? 'up' : 'down';
        if (!(floor === 10 && direction === 'up') && !(floor === 1 && direction === 'down')) {
          building.requestElevator(floor, direction);
        }
      }
      for (const car of building.elevators) {
        if (car.doors.isOpen()) {
          if (random() < 0.4) building.selectDestination(car.id, 1 + Math.floor(random() * 10));
          if (random() < 0.15) building.holdDoors(car.id);
          if (random() < 0.15) building.releaseDoors(car.id);
          if (random() < 0.15) building.closeDoors(car.id);
        }
      }
      void pick;

      const before = building.snapshot().elevators;
      building.tick();
      const after = building.snapshot().elevators;

      for (const [index, post] of after.entries()) {
        const pre = before[index]!;
        const moved = pre.currentFloor !== post.currentFloor;
        if (moved) movesObserved += 1;
        if (post.doorPhase === 'opening' && pre.doorPhase === 'closed') stopsObserved += 1;

        // I1 - always on a floor of this building (SC-005)
        expect(post.currentFloor).toBeGreaterThanOrEqual(LOWEST_FLOOR);
        expect(post.currentFloor).toBeLessThanOrEqual(HIGHEST_FLOOR);

        // I2 / I5 - the car changes floor only with the doors fully closed
        // (SC-003). The doors settle at the START of a step, so a door that was
        // 'closing' is legitimately 'closed' by the time the car moves; what may
        // never happen is movement with the doors open or opening.
        if (moved) {
          expect(
            ['closed', 'closing'],
            `${post.id} moved from doors ${pre.doorPhase}`,
          ).toContain(pre.doorPhase);
          expect(post.doorPhase, `${post.id} moved with doors ${post.doorPhase}`).toBe('closed');
        }

        // FR-016 - at most one floor per step
        expect(Math.abs(post.currentFloor - pre.currentFloor)).toBeLessThanOrEqual(1);

        // I3 - idle implies no direction and no outstanding work (SC-005)
        if (post.motion === 'idle') {
          expect(post.direction, `${post.id} is idle but pointing ${post.direction}`).toBe('none');
          expect(post.destinations).toHaveLength(0);
          expect(post.assignedRequests).toHaveLength(0);
        }
        if (post.direction === 'none') {
          expect(post.motion).not.toBe('moving');
        }

        // I4 - never pass a floor the car had committed to serve (SC-004)
        if (moved) assertDidNotSkip(pre, post);
      }
    }

    // The run must actually have exercised the building.
    expect(movesObserved).toBeGreaterThan(200);
    expect(stopsObserved).toBeGreaterThan(20);
  });
});

function assertDidNotSkip(pre: ElevatorSnapshot, post: ElevatorSnapshot): void {
  const left = pre.currentFloor;
  const travelled = post.currentFloor > pre.currentFloor ? 'up' : 'down';

  // A destination is served regardless of direction, so leaving one behind is
  // always a skip.
  expect(
    pre.destinations.includes(left),
    `${pre.id} left floor ${left} with a destination there`,
  ).toBe(false);

  // A hall call going the way the car just went should have been collected.
  const skipped = pre.assignedRequests.find(
    (request) => request.floor === left && request.direction === travelled,
  );
  expect(
    skipped,
    `${pre.id} left floor ${left} going ${travelled} past its own ${travelled} call`,
  ).toBeUndefined();
}
