import { describe, expect, it } from 'vitest';
import { Building } from '../domain/building.js';
import { NearestSuitableCarStrategy } from '../domain/dispatch/nearest-suitable-car.strategy.js';
import { FakeClock } from './ports/fake-clock.js';
import { SimulationRunner, SPEEDS, type SimulationSpeed } from './simulation-runner.js';
import { SimulationService } from './simulation.service.js';

/** Run one identical scenario at a given speed and collect every state it passed through. */
function statesAtSpeed(speed: SimulationSpeed): string[] {
  const building = new Building(new NearestSuitableCarStrategy());
  const clock = new FakeClock();
  let service: SimulationService;
  const runner = new SimulationRunner(building, clock, () => service.publish());
  service = new SimulationService(building, runner);

  const states: string[] = [];
  service.subscribe((snapshot) => {
    // Everything except the pace itself, which is the only thing allowed to differ.
    const { speed: _ignored, ...rest } = snapshot;
    states.push(JSON.stringify(rest));
  });

  runner.setSpeed(speed);
  runner.start();

  service.requestElevator(5, 'up');
  clock.advance(10);
  for (const car of building.elevators) {
    if (car.doors.isOpen()) service.selectDestination(car.id, 9);
  }
  clock.advance(15);
  service.requestElevator(3, 'down');
  clock.advance(20);

  return states;
}

describe('Speed changes pacing, never behaviour (FR-005d, SC-014)', () => {
  it('produces an identical sequence of states at every available speed', () => {
    const baseline = statesAtSpeed(1);

    for (const speed of SPEEDS) {
      expect(statesAtSpeed(speed), `speed ${speed} diverged`).toEqual(baseline);
    }
  });

  it('runs the slowest and fastest speeds to the same place', () => {
    expect(statesAtSpeed(0.5)).toEqual(statesAtSpeed(4));
  });
});
