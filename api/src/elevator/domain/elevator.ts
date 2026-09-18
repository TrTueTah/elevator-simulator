import { Doors } from './value-objects/doors.js';
import {
  IDLE,
  STOPPED,
  moving,
  opposite,
  type Direction,
  type MotionState,
  type TravelDirection,
} from './value-objects/direction.js';
import {
  floorNumber,
  isBottomFloor,
  isTopFloor,
  type FloorNumber,
} from './value-objects/floor-number.js';
import { CarCall } from './requests/car-call.js';
import type { HallRequest } from './requests/hall-request.js';
import { DoorsCannotOpenError, DoorsNotOpenError, ElevatorCannotMoveError } from './errors.js';
import type { ElevatorId, ElevatorView } from './elevator-view.js';

/**
 * A single car. It owns its floor, motion, doors, destinations and the requests
 * assigned to it, and every invariant about them (Constitution Principle III).
 *
 * Invariants, all enforced here:
 *   I1 the car is always on a floor within the building
 *   I2 the car changes floor only when the doors are fully closed
 *   I3 idle implies no outstanding work and no direction of travel
 *   I4 the car never passes a floor it has committed to serve
 *   I5 the doors are never anything but closed while the car is moving
 */
export class Elevator {
  #currentFloor: FloorNumber;
  #motion: MotionState = IDLE;
  #lastDirection: TravelDirection = 'none';
  #doors = new Doors();
  #carCalls = new Set<number>();
  #assigned: HallRequest[] = [];

  constructor(
    readonly id: ElevatorId,
    startingFloor: FloorNumber,
  ) {
    this.#currentFloor = startingFloor;
  }

  get currentFloor(): FloorNumber {
    return this.#currentFloor;
  }

  get motion(): MotionState {
    return this.#motion;
  }

  get doors(): Doors {
    return this.#doors;
  }

  /** An idle car has no direction of travel (FR-015, invariant I3). */
  get travelDirection(): TravelDirection {
    return this.#motion.kind === 'moving' ? this.#motion.direction : 'none';
  }

  get destinations(): readonly FloorNumber[] {
    return [...this.#carCalls].sort((a, b) => a - b).map((value) => value as FloorNumber);
  }

  get assignedRequests(): readonly HallRequest[] {
    return [...this.#assigned];
  }

  get workload(): number {
    return this.#carCalls.size + this.#assigned.length;
  }

  view(): ElevatorView {
    return {
      id: this.id,
      floor: this.#currentFloor,
      travelDirection: this.travelDirection,
      workload: this.workload,
    };
  }

  /** Take ownership of a hall request. Sticky: it is never handed on (FR-011). */
  assign(request: HallRequest): void {
    this.#assigned.push(request);
  }

  /**
   * Record a destination. Only possible while stopped with the doors open
   * (FR-026); any floor in the building is acceptable regardless of why the car
   * stopped (clarification Q4).
   */
  selectDestination(floor: FloorNumber): void {
    if (!this.#doors.isOpen()) {
      throw new DoorsNotOpenError(this.id, 'selecting a destination');
    }
    if (floor === this.#currentFloor) {
      // Already here: re-open rather than queue a trip to nowhere (FR-029).
      this.#doors.beginOpening();
      return;
    }
    this.#carCalls.add(floor); // a Set makes a repeat selection a no-op (FR-028)
  }

  holdDoors(): void {
    this.requireDoorsInUse('holding the doors');
    this.#doors.hold();
  }

  releaseDoors(): void {
    this.requireDoorsInUse('releasing the doors');
    this.#doors.releaseHold();
  }

  closeDoors(): void {
    this.#doors.closeNow();
  }

  /** Opening the doors is only ever legal while stopped at a floor (FR-034). */
  openDoors(): void {
    if (this.#motion.kind === 'moving') {
      throw new DoorsCannotOpenError(this.id);
    }
    this.#doors.beginOpening();
  }

  /**
   * Advance one step. The ORDER of these five stages is what makes invariants
   * I2, I4 and I5 structural rather than something a later edit must remember:
   * the doors are settled first, movement is gated on them, and "must I stop
   * here?" is asked AT a floor, never after leaving it.
   */
  tick(): readonly HallRequest[] {
    // 1. Settle the doors.
    this.#doors.tick();

    // 2. Doors busy means the car cannot move this step (I2, I5).
    if (!this.#doors.areClosed()) return [];

    const direction = this.travelDirection;

    // 3. Must the car stop where it already is, given the way it is going? (I4)
    const served = this.serveStopHere();
    if (served !== null) return served;

    // 4. Where next?
    const next = this.decideNextDirection();
    const nextDirection = next.kind === 'moving' ? next.direction : 'none';

    // 5. The turnaround stop. If the car is about to reverse or stand down, it
    //    adopts that direction HERE and asks again - which is how a car at the
    //    top of its run collects the people waiting to go down. Without this a
    //    car owning an up call below it and a down call above it would shuttle
    //    between the two forever, serving neither (FR-014).
    this.#motion = next;
    if (nextDirection !== direction) {
      const servedOnTurn = this.serveStopHere();
      if (servedOnTurn !== null) return servedOnTurn;
    }

    // 6. Move at most one floor (FR-016).
    if (this.#motion.kind === 'moving') {
      this.#lastDirection = this.#motion.direction;
      this.#currentFloor = this.stepTo(this.#motion.direction);
    }
    return [];
  }

  reset(startingFloor: FloorNumber): void {
    this.#currentFloor = startingFloor;
    this.#motion = IDLE;
    this.#lastDirection = 'none';
    this.#doors = new Doors();
    this.#carCalls.clear();
    this.#assigned = [];
  }

  /**
   * Asks every outstanding request whether it obliges a stop. Both kinds answer
   * through the same method, so there is no branching on request type here -
   * that is the point of the hierarchy.
   */
  private serveStopHere(): readonly HallRequest[] | null {
    const car = this.view();

    const carCall = this.#carCalls.has(this.#currentFloor)
      ? new CarCall(this.id, this.#currentFloor)
      : null;
    const stopForCarCall = carCall?.shouldStopFor(car) ?? false;
    const servedHallRequests = this.#assigned.filter((request) => request.shouldStopFor(car));

    if (!stopForCarCall && servedHallRequests.length === 0) return null;

    if (stopForCarCall) this.#carCalls.delete(this.#currentFloor); // FR-031
    this.#assigned = this.#assigned.filter((request) => !servedHallRequests.includes(request));

    this.#motion = STOPPED;
    this.#doors.beginOpening(); // FR-035
    return servedHallRequests;
  }

  /**
   * The sweep rule, and the whole of the starvation argument: keep going while
   * there is work ahead, otherwise reverse, otherwise stop where you are
   * (FR-018, FR-018a). Because assignment is sticky, every owned request is
   * reached within at most one full sweep.
   */
  private decideNextDirection(): MotionState {
    const targets = this.committedFloors();
    if (targets.length === 0) return IDLE;

    const preferred: TravelDirection =
      this.#motion.kind === 'moving' ? this.#motion.direction : this.#lastDirection;

    if (preferred !== 'none') {
      if (this.hasWorkAhead(targets, preferred)) return moving(preferred);
      const other = opposite(preferred);
      if (this.hasWorkAhead(targets, other)) return moving(other);
      // Work remains only on this floor; going idle lets the next tick serve it
      // with travelDirection 'none', which any request accepts (FR-024).
      return IDLE;
    }

    if (this.hasWorkAhead(targets, 'up')) return moving('up');
    if (this.hasWorkAhead(targets, 'down')) return moving('down');
    return IDLE;
  }

  private committedFloors(): readonly number[] {
    return [...this.#carCalls, ...this.#assigned.map((request) => request.floor)];
  }

  private hasWorkAhead(targets: readonly number[], direction: Direction): boolean {
    return direction === 'up'
      ? targets.some((floor) => floor > this.#currentFloor)
      : targets.some((floor) => floor < this.#currentFloor);
  }

  /** Movement is bounded by the building (FR-019, invariant I1). */
  private stepTo(direction: Direction): FloorNumber {
    if (direction === 'up' && isTopFloor(this.#currentFloor)) {
      throw new ElevatorCannotMoveError(this.id, 'it is already at the top floor');
    }
    if (direction === 'down' && isBottomFloor(this.#currentFloor)) {
      throw new ElevatorCannotMoveError(this.id, 'it is already at the bottom floor');
    }
    return floorNumber(this.#currentFloor + (direction === 'up' ? 1 : -1));
  }

  private requireDoorsInUse(action: string): void {
    if (this.#doors.areClosed()) {
      throw new DoorsNotOpenError(this.id, action);
    }
  }
}
