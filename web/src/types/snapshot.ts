export type Direction = 'up' | 'down';
export type TravelDirection = Direction | 'none';
export type DoorPhase = 'closed' | 'opening' | 'open' | 'closing';
export type ElevatorId = 'A' | 'B' | 'C';
export type SimulationStatus = 'running' | 'paused';
export type SimulationSpeed = 0.5 | 1 | 2 | 4;

export const LOWEST_FLOOR = 1;
export const HIGHEST_FLOOR = 10;
export const SPEEDS: readonly SimulationSpeed[] = [0.5, 1, 2, 4];

export interface HallRequestSnapshot {
  floor: number;
  direction: Direction;
  assignedTo: ElevatorId;
}

export interface ElevatorSnapshot {
  id: ElevatorId;
  currentFloor: number;
  motion: 'idle' | 'moving' | 'stopped';
  direction: TravelDirection;
  doorPhase: DoorPhase;
  doorHeld: boolean;
  dwellRemaining: number;
  destinations: number[];
  assignedRequests: { floor: number; direction: Direction }[];
}

export interface BuildingSnapshot {
  stepCount: number;
  status: SimulationStatus;
  speed: SimulationSpeed;
  elevators: ElevatorSnapshot[];
  pendingRequests: HallRequestSnapshot[];
}
