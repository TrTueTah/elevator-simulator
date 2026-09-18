import type { Building } from '../domain/building.js';
import type { BuildingState } from '../domain/snapshot.js';
import type { Direction } from '../domain/value-objects/direction.js';
import type { SimulationRunner, SimulationSpeed, SimulationStatus } from './simulation-runner.js';

export type BuildingSnapshot = BuildingState & {
  readonly status: SimulationStatus;
  readonly speed: SimulationSpeed;
};

export type SnapshotListener = (snapshot: BuildingSnapshot) => void;

/**
 * The use cases, expressed over the aggregate. Every command that changes
 * anything publishes a fresh snapshot, so the stream is the single path state
 * takes to the browser (FR-045).
 *
 * Deliberately free of rxjs and of NestJS: listeners are plain callbacks, and
 * the presentation layer adapts them to whatever transport it uses.
 */
export class SimulationService {
  readonly #listeners = new Set<SnapshotListener>();

  constructor(
    private readonly building: Building,
    private readonly runner: SimulationRunner,
  ) {}

  /** Lifecycle, delegated so the module never has to know the runner exists. */
  start(): void {
    this.runner.start();
  }

  stop(): void {
    this.runner.stop();
  }

  snapshot(): BuildingSnapshot {
    return {
      ...this.building.snapshot(),
      status: this.runner.status,
      speed: this.runner.speed,
    };
  }

  subscribe(listener: SnapshotListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  publish(): void {
    const snapshot = this.snapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }

  requestElevator(floor: number, direction: Direction): void {
    this.building.requestElevator(floor, direction);
    this.publish();
  }

  selectDestination(elevatorId: string, floor: number): void {
    this.building.selectDestination(elevatorId, floor);
    this.publish();
  }

  holdDoors(elevatorId: string): void {
    this.building.holdDoors(elevatorId);
    this.publish();
  }

  releaseDoors(elevatorId: string): void {
    this.building.releaseDoors(elevatorId);
    this.publish();
  }

  closeDoors(elevatorId: string): void {
    this.building.closeDoors(elevatorId);
    this.publish();
  }

  pause(): void {
    this.runner.pause();
    this.publish();
  }

  resume(): void {
    this.runner.resume();
    this.publish();
  }

  step(): void {
    this.runner.step();
    // advance() already published; publishing again would duplicate the event.
  }

  setSpeed(value: number): void {
    this.runner.setSpeed(value);
    this.publish();
  }

  reset(): void {
    this.building.reset();
    this.publish();
  }
}
