import { beforeEach, describe, expect, it } from 'vitest';
import { Building } from '../domain/building.js';
import { NearestSuitableCarStrategy } from '../domain/dispatch/nearest-suitable-car.strategy.js';
import { FakeClock } from './ports/fake-clock.js';
import {
  BASE_STEP_MS,
  InvalidSpeedError,
  SimulationNotPausedError,
  SimulationRunner,
} from './simulation-runner.js';

describe('SimulationRunner', () => {
  let building: Building;
  let clock: FakeClock;
  let runner: SimulationRunner;
  let published: number;

  beforeEach(() => {
    building = new Building(new NearestSuitableCarStrategy());
    clock = new FakeClock();
    published = 0;
    runner = new SimulationRunner(building, clock, () => {
      published += 1;
    });
    runner.start();
  });

  it('advances the building on every tick of the clock (FR-005a)', () => {
    clock.advance(5);

    expect(building.stepCount).toBe(5);
    expect(published).toBe(5);
  });

  it('freezes everything while paused (FR-005b, SC-013)', () => {
    clock.advance(3);
    const frozenAt = building.stepCount;

    runner.pause();
    clock.advance(100); // the clock was stopped, so these do nothing

    expect(runner.status).toBe('paused');
    expect(clock.isRunning).toBe(false);
    expect(building.stepCount).toBe(frozenAt);
  });

  it('advances exactly one step when stepped (FR-005c)', () => {
    runner.pause();
    const before = building.stepCount;

    runner.step();

    expect(building.stepCount).toBe(before + 1);
  });

  it('refuses to step while running (FR-005c)', () => {
    expect(runner.status).toBe('running');
    const before = building.stepCount;

    expect(() => runner.step()).toThrow(SimulationNotPausedError);
    expect(building.stepCount).toBe(before); // unchanged (FR-053)
  });

  it('resumes from where it paused', () => {
    clock.advance(2);
    runner.pause();
    runner.resume();
    clock.advance(2);

    expect(runner.status).toBe('running');
    expect(building.stepCount).toBe(4);
  });

  it('translates speed into an interval and nothing else (FR-005d)', () => {
    expect(runner.intervalMs).toBe(BASE_STEP_MS);

    runner.setSpeed(4);
    expect(runner.speed).toBe(4);
    expect(runner.intervalMs).toBe(BASE_STEP_MS / 4);
    expect(clock.intervalMs).toBe(BASE_STEP_MS / 4);

    runner.setSpeed(0.5);
    expect(runner.intervalMs).toBe(BASE_STEP_MS * 2);
  });

  it('rejects a speed that is not on offer, changing nothing (FR-053)', () => {
    const before = runner.speed;
    expect(() => runner.setSpeed(3)).toThrow(InvalidSpeedError);
    expect(runner.speed).toBe(before);
  });

  it('pause and resume are safe to repeat', () => {
    runner.pause();
    runner.pause();
    runner.resume();
    runner.resume();

    expect(runner.status).toBe('running');
  });
});
