import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { CLOCK_PORT } from '../src/elevator/application/ports/clock.port.js';
import { FakeClock } from '../src/elevator/application/ports/fake-clock.js';

/**
 * Boots the real application with the real domain, but with time under the
 * test's control - so the e2e suite never waits on a wall clock.
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  clock: FakeClock;
  moduleRef: TestingModule;
}> {
  const clock = new FakeClock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK_PORT)
    .useValue(clock)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return { app, clock, moduleRef };
}
