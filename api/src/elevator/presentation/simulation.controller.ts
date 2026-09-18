import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { SimulationService, type BuildingSnapshot } from '../application/simulation.service.js';
import type {
  CreateRequestDto,
  SelectDestinationDto,
  SetSpeedDto,
} from './dto/commands.dto.js';

/**
 * Commands acknowledge only - they never return state. The browser learns the
 * outcome from the stream, which keeps one path for state and no reconciliation
 * (contracts/http-api.md).
 */
@Controller('api')
export class SimulationController {
  constructor(private readonly simulation: SimulationService) {}

  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('simulation/state')
  state(): BuildingSnapshot {
    return this.simulation.snapshot();
  }

  @Post('simulation/requests')
  @HttpCode(HttpStatus.ACCEPTED)
  createRequest(@Body() body: CreateRequestDto): void {
    this.simulation.requestElevator(body.floor, body.direction);
  }

  @Post('simulation/elevators/:id/destination')
  @HttpCode(HttpStatus.ACCEPTED)
  selectDestination(@Param('id') id: string, @Body() body: SelectDestinationDto): void {
    this.simulation.selectDestination(id, body.floor);
  }

  @Post('simulation/elevators/:id/doors/hold')
  @HttpCode(HttpStatus.ACCEPTED)
  holdDoors(@Param('id') id: string): void {
    this.simulation.holdDoors(id);
  }

  @Post('simulation/elevators/:id/doors/release')
  @HttpCode(HttpStatus.ACCEPTED)
  releaseDoors(@Param('id') id: string): void {
    this.simulation.releaseDoors(id);
  }

  @Post('simulation/elevators/:id/doors/close')
  @HttpCode(HttpStatus.ACCEPTED)
  closeDoors(@Param('id') id: string): void {
    this.simulation.closeDoors(id);
  }

  @Post('simulation/pause')
  @HttpCode(HttpStatus.ACCEPTED)
  pause(): void {
    this.simulation.pause();
  }

  @Post('simulation/resume')
  @HttpCode(HttpStatus.ACCEPTED)
  resume(): void {
    this.simulation.resume();
  }

  @Post('simulation/step')
  @HttpCode(HttpStatus.ACCEPTED)
  step(): void {
    this.simulation.step();
  }

  @Post('simulation/speed')
  @HttpCode(HttpStatus.ACCEPTED)
  setSpeed(@Body() body: SetSpeedDto): void {
    this.simulation.setSpeed(body.speed);
  }

  @Post('simulation/reset')
  @HttpCode(HttpStatus.ACCEPTED)
  reset(): void {
    this.simulation.reset();
  }
}
