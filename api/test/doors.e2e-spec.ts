import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './test-app.js';
import type { FakeClock } from '../src/elevator/application/ports/fake-clock.js';

describe('Door control over HTTP', () => {
  let app: INestApplication;
  let clock: FakeClock;

  beforeEach(async () => {
    ({ app, clock } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  const state = async () => (await request(app.getHttpServer()).get('/api/simulation/state')).body;
  const car = async (id: string) =>
    (await state()).elevators.find((e: { id: string }) => e.id === id);

  async function bringCarToFloorWithOpenDoors(floor: number): Promise<string> {
    await request(app.getHttpServer())
      .post('/api/simulation/requests')
      .send({ floor, direction: 'up' });
    const owner = (await state()).pendingRequests[0].assignedTo;
    clock.advance(floor + 3);
    expect((await car(owner)).doorPhase).toBe('open');
    return owner;
  }

  it('held doors keep the car on its floor across many steps (FR-037, FR-033)', async () => {
    const owner = await bringCarToFloorWithOpenDoors(3);

    await request(app.getHttpServer())
      .post(`/api/simulation/elevators/${owner}/destination`)
      .send({ floor: 9 })
      .expect(202);
    await request(app.getHttpServer())
      .post(`/api/simulation/elevators/${owner}/doors/hold`)
      .expect(202);

    clock.advance(30);

    const held = await car(owner);
    expect(held.doorPhase).toBe('open');
    expect(held.doorHeld).toBe(true);
    expect(held.currentFloor).toBe(3);
    expect(held.destinations).toEqual([9]);
  });

  it('closing on command releases the car to travel (FR-039)', async () => {
    const owner = await bringCarToFloorWithOpenDoors(3);
    await request(app.getHttpServer())
      .post(`/api/simulation/elevators/${owner}/destination`)
      .send({ floor: 9 });
    await request(app.getHttpServer()).post(`/api/simulation/elevators/${owner}/doors/hold`);
    clock.advance(10);
    expect((await car(owner)).currentFloor).toBe(3);

    await request(app.getHttpServer())
      .post(`/api/simulation/elevators/${owner}/doors/close`)
      .expect(202);
    clock.advance(20);

    expect((await car(owner)).currentFloor).toBe(9);
  });

  it('refuses to hold doors that are closed (FR-053, FR-054)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/simulation/elevators/A/doors/hold')
      .expect(409);

    expect(response.body.code).toBe('DOORS_NOT_OPEN');
    expect((await car('A')).doorPhase).toBe('closed');
  });
});
