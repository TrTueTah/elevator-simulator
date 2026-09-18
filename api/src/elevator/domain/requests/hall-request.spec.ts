import { describe, expect, it } from 'vitest';
import { HallRequest } from './hall-request.js';
import { floorNumber } from '../value-objects/floor-number.js';
import type { ElevatorView } from '../elevator-view.js';
import type { TravelDirection } from '../value-objects/direction.js';

const view = (floor: number, travelDirection: TravelDirection, id: 'A' | 'B' = 'A'): ElevatorView => ({
  id,
  floor: floorNumber(floor),
  travelDirection,
  workload: 0,
});

describe('HallRequest — the direction rule', () => {
  const upFrom5 = new HallRequest(floorNumber(5), 'up', 'A');
  const downFrom7 = new HallRequest(floorNumber(7), 'down', 'A');

  it('stops a car going up for an up request at its floor (FR-021)', () => {
    expect(upFrom5.shouldStopFor(view(5, 'up'))).toBe(true);
  });

  it('does not stop a car going up for a down request (FR-022)', () => {
    expect(downFrom7.shouldStopFor(view(7, 'up'))).toBe(false);
  });

  it('does not stop a car going down for an up request (FR-022)', () => {
    expect(upFrom5.shouldStopFor(view(5, 'down'))).toBe(false);
  });

  it('stops an idle car for either direction (FR-024)', () => {
    expect(upFrom5.shouldStopFor(view(5, 'none'))).toBe(true);
    expect(downFrom7.shouldStopFor(view(7, 'none'))).toBe(true);
  });

  it('never stops a car the request does not belong to (FR-022)', () => {
    expect(upFrom5.shouldStopFor(view(5, 'up', 'B'))).toBe(false);
    expect(upFrom5.shouldStopFor(view(5, 'none', 'B'))).toBe(false);
  });

  it('is irrelevant at any other floor', () => {
    expect(upFrom5.shouldStopFor(view(4, 'up'))).toBe(false);
    expect(upFrom5.shouldStopFor(view(6, 'up'))).toBe(false);
  });

  it('identifies itself by floor and direction (FR-009, FR-010)', () => {
    expect(upFrom5.key).toBe('5:up');
    expect(new HallRequest(floorNumber(5), 'down', 'A').key).toBe('5:down');
  });
});
