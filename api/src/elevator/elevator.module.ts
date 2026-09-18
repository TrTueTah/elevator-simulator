import { Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Building } from './domain/building.js';
import { NearestSuitableCarStrategy } from './domain/dispatch/nearest-suitable-car.strategy.js';
import { SimulationRunner } from './application/simulation-runner.js';
import { SimulationService } from './application/simulation.service.js';
import { CLOCK_PORT, type ClockPort } from './application/ports/clock.port.js';
import { IntervalClockAdapter } from './infrastructure/interval-clock.adapter.js';
import { SimulationController } from './presentation/simulation.controller.js';
import { SimulationStreamController } from './presentation/simulation-stream.controller.js';

/**
 * The composition root. This is the only file that knows which `ClockPort`
 * implementation is real and which dispatch strategy is in play - swapping
 * either is a change here and nowhere else.
 */
@Module({
  controllers: [SimulationController, SimulationStreamController],
  providers: [
    { provide: CLOCK_PORT, useClass: IntervalClockAdapter },
    { provide: Building, useFactory: () => new Building(new NearestSuitableCarStrategy()) },
    {
      provide: SimulationService,
      inject: [Building, CLOCK_PORT],
      useFactory: (building: Building, clock: ClockPort): SimulationService => {
        // The runner publishes after each tick and the service reports the
        // runner's status, so they refer to each other. Tying that knot here
        // keeps it out of both classes.
        const runner = new SimulationRunner(building, clock, () => service.publish());
        const service = new SimulationService(building, runner);
        return service;
      },
    },
  ],
  exports: [SimulationService],
})
export class ElevatorModule implements OnModuleInit, OnApplicationShutdown {
  constructor(private readonly simulation: SimulationService) {}

  onModuleInit(): void {
    this.simulation.start();
  }

  onApplicationShutdown(): void {
    this.simulation.stop();
  }
}
