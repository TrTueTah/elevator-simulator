import type { Direction } from '../../domain/value-objects/direction.js';

export interface CreateRequestDto {
  floor: number;
  direction: Direction;
}

export interface SelectDestinationDto {
  floor: number;
}

export interface SetSpeedDto {
  speed: number;
}
