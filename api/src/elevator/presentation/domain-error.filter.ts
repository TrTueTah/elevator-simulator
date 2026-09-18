import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ElevatorDomainError } from '../domain/errors.js';
import { InvalidSpeedError, SimulationNotPausedError } from '../application/simulation-runner.js';

type CodedError = { code: string; message: string };

const STATUS_BY_CODE: Record<string, number> = {
  FLOOR_OUT_OF_RANGE: HttpStatus.BAD_REQUEST,
  INVALID_REQUEST_DIRECTION: HttpStatus.BAD_REQUEST,
  INVALID_SPEED: HttpStatus.BAD_REQUEST,
  ELEVATOR_NOT_FOUND: HttpStatus.NOT_FOUND,
  DOORS_NOT_OPEN: HttpStatus.CONFLICT,
  DOORS_CANNOT_OPEN: HttpStatus.CONFLICT,
  ELEVATOR_CANNOT_MOVE: HttpStatus.CONFLICT,
  SIMULATION_NOT_PAUSED: HttpStatus.CONFLICT,
};

/**
 * The single place a domain error becomes an HTTP response. Translation happens
 * at the boundary and nowhere else (Constitution Principle VI).
 */
@Catch(ElevatorDomainError, SimulationNotPausedError, InvalidSpeedError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: CodedError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = STATUS_BY_CODE[exception.code] ?? HttpStatus.CONFLICT;

    response.status(status).json({
      code: exception.code,
      message: exception.message,
    });
  }
}
