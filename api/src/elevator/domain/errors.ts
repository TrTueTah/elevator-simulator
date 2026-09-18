/**
 * Every illegal transition fails loudly with a typed error (Constitution
 * Principle III). The presentation layer maps `code` to an HTTP status; the
 * domain itself knows nothing about HTTP.
 */
export abstract class ElevatorDomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class FloorOutOfRangeError extends ElevatorDomainError {
  readonly code = 'FLOOR_OUT_OF_RANGE';

  constructor(value: number, lowest: number, highest: number) {
    super(`Floor ${value} is outside the building: floors run from ${lowest} to ${highest}.`);
  }
}

export class InvalidRequestDirectionError extends ElevatorDomainError {
  readonly code = 'INVALID_REQUEST_DIRECTION';

  constructor(floor: number, direction: string) {
    super(`Cannot request to go ${direction} from floor ${floor}: there is no floor beyond it.`);
  }
}

export class ElevatorNotFoundError extends ElevatorDomainError {
  readonly code = 'ELEVATOR_NOT_FOUND';

  constructor(id: string) {
    super(`No elevator with id "${id}" exists in this building.`);
  }
}

export class DoorsNotOpenError extends ElevatorDomainError {
  readonly code = 'DOORS_NOT_OPEN';

  constructor(id: string, action: string) {
    super(`Elevator ${id} doors are not open; ${action} is not possible.`);
  }
}

export class DoorsCannotOpenError extends ElevatorDomainError {
  readonly code = 'DOORS_CANNOT_OPEN';

  constructor(id: string) {
    super(`Elevator ${id} is between floors; its doors cannot be opened.`);
  }
}

export class ElevatorCannotMoveError extends ElevatorDomainError {
  readonly code = 'ELEVATOR_CANNOT_MOVE';

  constructor(id: string, reason: string) {
    super(`Elevator ${id} cannot move: ${reason}.`);
  }
}
