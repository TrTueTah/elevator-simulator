import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ElevatorModule } from './elevator/elevator.module.js';
import { DomainErrorFilter } from './elevator/presentation/domain-error.filter.js';

@Module({
  imports: [ElevatorModule],
  providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class AppModule {}
