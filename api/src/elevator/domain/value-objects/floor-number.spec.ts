import { describe, expect, it } from 'vitest';
import {
  allFloors,
  floorNumber,
  HIGHEST_FLOOR,
  isBottomFloor,
  isTopFloor,
  LOWEST_FLOOR,
} from './floor-number.js';
import { FloorOutOfRangeError } from '../errors.js';

describe('FloorNumber', () => {
  it('accepts every floor in the building', () => {
    expect(allFloors()).toHaveLength(10);
    expect(floorNumber(LOWEST_FLOOR)).toBe(1);
    expect(floorNumber(HIGHEST_FLOOR)).toBe(10);
  });

  it.each([0, 11, -1, 100])('rejects floor %i as out of range (FR-004)', (value) => {
    expect(() => floorNumber(value)).toThrow(FloorOutOfRangeError);
  });

  it.each([1.5, Number.NaN])('rejects the non-integer %s', (value) => {
    expect(() => floorNumber(value)).toThrow(FloorOutOfRangeError);
  });

  it('knows the boundaries that limit travel (FR-019)', () => {
    expect(isTopFloor(floorNumber(10))).toBe(true);
    expect(isTopFloor(floorNumber(9))).toBe(false);
    expect(isBottomFloor(floorNumber(1))).toBe(true);
    expect(isBottomFloor(floorNumber(2))).toBe(false);
  });
});
