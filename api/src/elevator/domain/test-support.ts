import { Building } from './building.js';
import { NearestSuitableCarStrategy } from './dispatch/nearest-suitable-car.strategy.js';
import type { DispatchStrategy } from './dispatch/dispatch-strategy.js';
import type { Elevator } from './elevator.js';
import type { ElevatorId } from './elevator-view.js';

export function aBuilding(strategy: DispatchStrategy = new NearestSuitableCarStrategy()): Building {
  return new Building(strategy);
}

export function car(building: Building, id: ElevatorId): Elevator {
  return building.elevator(id);
}

/** Advance the building, with a hard stop so a broken rule fails rather than hangs. */
export function tickUntil(
  building: Building,
  predicate: () => boolean,
  limit = 200,
): number {
  for (let step = 1; step <= limit; step += 1) {
    building.tick();
    if (predicate()) return step;
  }
  throw new Error(`Condition never held within ${limit} steps.`);
}

export function tickTimes(building: Building, times: number): void {
  for (let i = 0; i < times; i += 1) building.tick();
}

/** Drive a car to a floor by giving it a destination, then let the doors settle. */
export function sendTo(building: Building, id: ElevatorId, floor: number): void {
  const elevator = building.elevator(id);
  // Open the doors first so a destination can legally be selected.
  elevator.openDoors();
  tickUntil(building, () => elevator.doors.isOpen());
  building.selectDestination(id, floor);
  tickUntil(building, () => elevator.currentFloor === floor);
}
