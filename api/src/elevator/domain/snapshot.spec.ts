import { describe, expect, it } from 'vitest';
import { aBuilding, tickUntil } from './test-support.js';

describe('The snapshot carries everything the interface must show', () => {
  it('reports all three cars in a stable order (FR-046, guarantee S1)', () => {
    const snapshot = aBuilding().snapshot();

    expect(snapshot.elevators.map((e) => e.id)).toEqual(['A', 'B', 'C']);
  });

  it('includes every field FR-046 requires', () => {
    const building = aBuilding();
    building.requestElevator(4, 'up');
    const car = building.snapshot().elevators[0]!;

    expect(car).toMatchObject({
      id: expect.any(String),
      currentFloor: expect.any(Number),
      motion: expect.any(String),
      direction: expect.any(String),
      doorPhase: expect.any(String),
      doorHeld: expect.any(Boolean),
      dwellRemaining: expect.any(Number),
      destinations: expect.any(Array),
      assignedRequests: expect.any(Array),
    });
  });

  it('includes every pending request with floor, direction and owner (FR-047)', () => {
    const building = aBuilding();
    building.requestElevator(7, 'down');

    const pending = building.snapshot().pendingRequests;
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      floor: 7,
      direction: 'down',
      assignedTo: expect.stringMatching(/^[ABC]$/),
    });
  });

  it('holds guarantees S4 and S5 at every step of a run', () => {
    const building = aBuilding();
    building.requestElevator(8, 'up');
    building.requestElevator(3, 'down');

    for (let step = 0; step < 80; step += 1) {
      building.tick();
      for (const car of building.snapshot().elevators) {
        // S4 - idle implies no direction
        if (car.motion === 'idle') expect(car.direction).toBe('none');
        // S5 - moving implies the doors are closed
        if (car.motion === 'moving') expect(car.doorPhase).toBe('closed');
      }
    }
  });

  it('counts steps and returns to zero on reset (FR-006)', () => {
    const building = aBuilding();
    building.requestElevator(5, 'up');
    tickUntil(building, () => building.stepCount === 6, 10);
    expect(building.snapshot().stepCount).toBe(6);

    building.reset();

    const snapshot = building.snapshot();
    expect(snapshot.stepCount).toBe(0);
    expect(snapshot.pendingRequests).toHaveLength(0);
    for (const car of snapshot.elevators) {
      expect(car.currentFloor).toBe(1);
      expect(car.motion).toBe('idle');
      expect(car.doorPhase).toBe('closed');
      expect(car.destinations).toHaveLength(0);
    }
  });
});
