import { describe, expect, it } from 'vitest';
import { NearestSuitableCarStrategy } from './nearest-suitable-car.strategy.js';
import { floorNumber } from '../value-objects/floor-number.js';
import type { ElevatorView } from '../elevator-view.js';
import type { TravelDirection } from '../value-objects/direction.js';

const car = (
  id: 'A' | 'B' | 'C',
  floor: number,
  travelDirection: TravelDirection = 'none',
  workload = 0,
): ElevatorView => ({ id, floor: floorNumber(floor), travelDirection, workload });

describe('NearestSuitableCarStrategy', () => {
  const strategy = new NearestSuitableCarStrategy();

  it('sends the nearest car, not always the same one (FR-042)', () => {
    const cars = [car('A', 1), car('B', 5), car('C', 9)];

    expect(strategy.chooseFor({ floor: floorNumber(8), direction: 'up' }, cars)).toBe('C');
    expect(strategy.chooseFor({ floor: floorNumber(2), direction: 'up' }, cars)).toBe('A');
    expect(strategy.chooseFor({ floor: floorNumber(5), direction: 'up' }, cars)).toBe('B');
  });

  it('prefers a less loaded car when distance is equal (FR-041)', () => {
    const cars = [car('A', 4, 'none', 5), car('B', 4, 'none', 0)];
    expect(strategy.chooseFor({ floor: floorNumber(4), direction: 'up' }, cars)).toBe('B');
  });

  it('penalises a car that would have to reverse (FR-041)', () => {
    // A is close but heading away; B is further but idle.
    const cars = [car('A', 4, 'down'), car('B', 9, 'none')];
    expect(strategy.chooseFor({ floor: floorNumber(6), direction: 'up' }, cars)).toBe('B');
  });

  it('breaks ties by ascending id, deterministically (FR-043)', () => {
    const cars = [car('C', 5), car('B', 5), car('A', 5)];
    const call = { floor: floorNumber(5), direction: 'up' } as const;

    expect(strategy.chooseFor(call, cars)).toBe('A');
    // Identical state, identical answer, every time.
    for (let i = 0; i < 10; i += 1) {
      expect(strategy.chooseFor(call, [...cars].reverse())).toBe('A');
    }
  });
});
