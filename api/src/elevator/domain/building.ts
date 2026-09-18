import { Elevator } from './elevator.js';
import { HallRequest } from './requests/hall-request.js';
import {
  floorNumber,
  isBottomFloor,
  isTopFloor,
  LOWEST_FLOOR,
  type FloorNumber,
} from './value-objects/floor-number.js';
import type { Direction } from './value-objects/direction.js';
import { ELEVATOR_IDS, isElevatorId, type ElevatorId } from './elevator-view.js';
import type { DispatchStrategy } from './dispatch/dispatch-strategy.js';
import { ElevatorNotFoundError, InvalidRequestDirectionError } from './errors.js';
import type { BuildingState, ElevatorSnapshot, HallRequestSnapshot } from './snapshot.js';

const STARTING_FLOOR = LOWEST_FLOOR as FloorNumber;

/**
 * The aggregate root. Owns the three cars, the pending hall requests, and the
 * rule that every request has exactly one owner.
 *
 * Invariants:
 *   B1 a (floor, direction) pair is pending at most once
 *   B2 every pending request is owned by exactly one existing elevator
 */
export class Building {
  #elevators: Map<ElevatorId, Elevator>;
  #pending: HallRequest[] = [];
  #stepCount = 0;

  constructor(private readonly dispatch: DispatchStrategy) {
    this.#elevators = new Map(
      ELEVATOR_IDS.map((id) => [id, new Elevator(id, STARTING_FLOOR)] as const),
    );
  }

  get stepCount(): number {
    return this.#stepCount;
  }

  get elevators(): readonly Elevator[] {
    return [...this.#elevators.values()];
  }

  get pendingRequests(): readonly HallRequest[] {
    return [...this.#pending];
  }

  elevator(id: string): Elevator {
    if (!isElevatorId(id)) throw new ElevatorNotFoundError(id);
    const elevator = this.#elevators.get(id);
    if (!elevator) throw new ElevatorNotFoundError(id);
    return elevator;
  }

  /**
   * Create a hall request and give it an owner. Always accepted - a busy
   * building queues, it never refuses (FR-012).
   */
  requestElevator(floorValue: number, direction: Direction): HallRequest {
    const floor = floorNumber(floorValue);

    if (direction === 'up' && isTopFloor(floor)) {
      throw new InvalidRequestDirectionError(floor, direction);
    }
    if (direction === 'down' && isBottomFloor(floor)) {
      throw new InvalidRequestDirectionError(floor, direction);
    }

    // Identity is (floor, direction): pressing twice is one request (FR-009, B1).
    const existing = this.#pending.find(
      (request) => request.floor === floor && request.direction === direction,
    );
    if (existing) return existing;

    const owner = this.dispatch.chooseFor(
      { floor, direction },
      this.elevators.map((elevator) => elevator.view()),
    );
    const request = new HallRequest(floor, direction, owner);
    this.#pending.push(request);
    this.elevator(owner).assign(request);
    return request;
  }

  selectDestination(id: string, floorValue: number): void {
    const floor = floorNumber(floorValue);
    this.elevator(id).selectDestination(floor);
  }

  holdDoors(id: string): void {
    this.elevator(id).holdDoors();
  }

  releaseDoors(id: string): void {
    this.elevator(id).releaseDoors();
  }

  closeDoors(id: string): void {
    this.elevator(id).closeDoors();
  }

  /**
   * Advance the whole building one step. Each car ticks independently; no car's
   * tick reads or mutates another (FR-020).
   */
  tick(): void {
    this.#stepCount += 1;
    for (const elevator of this.#elevators.values()) {
      const served = elevator.tick();
      if (served.length > 0) {
        this.#pending = this.#pending.filter((request) => !served.includes(request));
      }
    }
  }

  reset(): void {
    for (const elevator of this.#elevators.values()) {
      elevator.reset(STARTING_FLOOR);
    }
    this.#pending = [];
    this.#stepCount = 0;
  }

  snapshot(): BuildingState {
    return {
      stepCount: this.#stepCount,
      elevators: this.elevators.map((elevator) => this.elevatorSnapshot(elevator)),
      pendingRequests: this.#pending.map(
        (request): HallRequestSnapshot => ({
          floor: request.floor,
          direction: request.direction,
          assignedTo: request.assignedTo,
        }),
      ),
    };
  }

  private elevatorSnapshot(elevator: Elevator): ElevatorSnapshot {
    return {
      id: elevator.id,
      currentFloor: elevator.currentFloor,
      motion: elevator.motion.kind,
      direction: elevator.travelDirection,
      doorPhase: elevator.doors.phase,
      doorHeld: elevator.doors.isHeld,
      dwellRemaining: elevator.doors.dwellRemaining,
      destinations: elevator.destinations.map((floor) => floor as number),
      assignedRequests: elevator.assignedRequests.map((request) => ({
        floor: request.floor,
        direction: request.direction,
      })),
    };
  }
}
