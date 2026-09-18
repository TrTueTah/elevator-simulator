import { describe, expect, it } from 'vitest';
import { CarCall } from './car-call.js';
import { floorNumber } from '../value-objects/floor-number.js';
import type { ElevatorView } from '../elevator-view.js';
import type { TravelDirection } from '../value-objects/direction.js';

const view = (floor: number, travelDirection: TravelDirection, id: 'A' | 'B' = 'A'): ElevatorView => ({
  id,
  floor: floorNumber(floor),
  travelDirection,
  workload: 0,
});

describe('CarCall — destinations ignore the direction rule (FR-025)', () => {
  const toFloor6 = new CarCall('A', floorNumber(6));

  it.each<TravelDirection>(['up', 'down', 'none'])(
    'stops the car at its destination while travelling %s',
    (direction) => {
      expect(toFloor6.shouldStopFor(view(6, direction))).toBe(true);
    },
  );

  it('belongs to exactly one car', () => {
    expect(toFloor6.shouldStopFor(view(6, 'up', 'B'))).toBe(false);
  });

  it('is irrelevant at other floors', () => {
    expect(toFloor6.shouldStopFor(view(5, 'up'))).toBe(false);
  });
});
