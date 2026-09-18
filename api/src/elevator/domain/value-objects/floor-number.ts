import { FloorOutOfRangeError } from '../errors.js';

declare const floorBrand: unique symbol;

/**
 * A floor is a branded integer, so a value outside the building is
 * unrepresentable rather than merely validated (Constitution Principle VI).
 */
export type FloorNumber = number & { readonly [floorBrand]: true };

export const LOWEST_FLOOR = 1;
export const HIGHEST_FLOOR = 10;

export function floorNumber(value: number): FloorNumber {
  if (!Number.isInteger(value) || value < LOWEST_FLOOR || value > HIGHEST_FLOOR) {
    throw new FloorOutOfRangeError(value, LOWEST_FLOOR, HIGHEST_FLOOR);
  }
  return value as FloorNumber;
}

export function isTopFloor(floor: FloorNumber): boolean {
  return floor === HIGHEST_FLOOR;
}

export function isBottomFloor(floor: FloorNumber): boolean {
  return floor === LOWEST_FLOOR;
}

export function allFloors(): FloorNumber[] {
  const floors: FloorNumber[] = [];
  for (let value = LOWEST_FLOOR; value <= HIGHEST_FLOOR; value += 1) {
    floors.push(value as FloorNumber);
  }
  return floors;
}
