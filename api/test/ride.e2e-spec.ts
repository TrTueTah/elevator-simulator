import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './test-app.js';
import type { FakeClock } from '../src/elevator/application/ports/fake-clock.js';

describe('Ride flow over HTTP', () => {
  let app: INestApplication;
  let clock: FakeClock;

  beforeEach(async () => {
    ({ app, clock } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  const state = async () => (await request(app.getHttpServer()).get('/api/simulation/state')).body;

  it('reports a building of three idle cars at floor 1', async () => {
    const body = await state();

    expect(body.elevators).toHaveLength(3);
    expect(body.elevators.map((e: { id: string }) => e.id)).toEqual(['A', 'B', 'C']);
    for (const car of body.elevators) {
      expect(car.currentFloor).toBe(1);
      expect(car.motion).toBe('idle');
      expect(car.doorPhase).toBe('closed');
    }
    expect(body.status).toBe('running');
    expect(body.speed).toBe(1);
  });

  it('accepts a call, delivers the car, then takes a destination', async () => {
    await request(app.getHttpServer())
      .post('/api/simulation/requests')
      .send({ floor: 3, direction: 'up' })
      .expect(202);

    const pending = (await state()).pendingRequests;
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ floor: 3, direction: 'up' });
    const owner = pending[0].assignedTo;

    clock.advance(6);

    const arrived = (await state()).elevators.find((e: { id: string }) => e.id === owner);
    expect(arrived.currentFloor).toBe(3);
    expect(arrived.doorPhase).toBe('open');

    await request(app.getHttpServer())
      .post(`/api/simulation/elevators/${owner}/destination`)
      .send({ floor: 8 })
      .expect(202);

    clock.advance(20);

    const delivered = (await state()).elevators.find((e: { id: string }) => e.id === owner);
    expect(delivered.currentFloor).toBe(8);
  });

  it('is idempotent for a repeated call (FR-009)', async () => {
    for (let i = 0; i < 3; i += 1) {
      await request(app.getHttpServer())
        .post('/api/simulation/requests')
        .send({ floor: 6, direction: 'up' })
        .expect(202);
    }

    expect((await state()).pendingRequests).toHaveLength(1);
  });

  it('refuses up from the top floor with a coded error (FR-008, FR-054)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/simulation/requests')
      .send({ floor: 10, direction: 'up' })
      .expect(400);

    expect(response.body.code).toBe('INVALID_REQUEST_DIRECTION');
    expect(response.body.message).toContain('10');
  });

  it('refuses a destination while the doors are closed (FR-026)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/simulation/elevators/A/destination')
      .send({ floor: 5 })
      .expect(409);

    expect(response.body.code).toBe('DOORS_NOT_OPEN');
  });

  it('refuses an unknown elevator', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/simulation/elevators/Z/doors/close')
      .expect(404);

    expect(response.body.code).toBe('ELEVATOR_NOT_FOUND');
  });

  it('pauses, steps exactly once, and refuses to step while running', async () => {
    await request(app.getHttpServer()).post('/api/simulation/pause').expect(202);
    const before = (await state()).stepCount;

    await request(app.getHttpServer()).post('/api/simulation/step').expect(202);
    expect((await state()).stepCount).toBe(before + 1);

    await request(app.getHttpServer()).post('/api/simulation/resume').expect(202);
    const response = await request(app.getHttpServer()).post('/api/simulation/step').expect(409);
    expect(response.body.code).toBe('SIMULATION_NOT_PAUSED');
  });

  it('rejects a speed that is not on offer', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/simulation/speed')
      .send({ speed: 3 })
      .expect(400);

    expect(response.body.code).toBe('INVALID_SPEED');
  });

  it('resets the building (FR-006)', async () => {
    await request(app.getHttpServer())
      .post('/api/simulation/requests')
      .send({ floor: 9, direction: 'down' });
    clock.advance(5);

    await request(app.getHttpServer()).post('/api/simulation/reset').expect(202);

    const body = await state();
    expect(body.stepCount).toBe(0);
    expect(body.pendingRequests).toHaveLength(0);
    expect(body.elevators.every((e: { currentFloor: number }) => e.currentFloor === 1)).toBe(true);
  });

  it('answers the health check Railway depends on', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' });
  });
});
