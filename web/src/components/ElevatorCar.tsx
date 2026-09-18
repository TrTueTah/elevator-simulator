import type { ElevatorSnapshot } from '../types/snapshot.ts';
import { HIGHEST_FLOOR, LOWEST_FLOOR } from '../types/snapshot.ts';
import { DoorControls } from './DoorControls.tsx';
import { DestinationSelector } from './DestinationSelector.tsx';

const DIRECTION_GLYPH: Record<string, string> = { up: '▲', down: '▼', none: '—' };

export function ElevatorCar({
  elevator,
  onError,
}: {
  elevator: ElevatorSnapshot;
  onError: (message: string) => void;
}) {
  const floors = [];
  for (let floor = HIGHEST_FLOOR; floor >= LOWEST_FLOOR; floor -= 1) floors.push(floor);

  return (
    <section className="car" aria-label={`Elevator ${elevator.id}`}>
      <header className="car__header">
        <h2>Elevator {elevator.id}</h2>
        <dl className="car__state">
          <div>
            <dt>Floor</dt>
            <dd className="car__floor">{elevator.currentFloor}</dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>
              {DIRECTION_GLYPH[elevator.direction]} {elevator.direction}
            </dd>
          </div>
          <div>
            <dt>Motion</dt>
            <dd>{elevator.motion}</dd>
          </div>
          <div>
            <dt>Doors</dt>
            <dd className={`doors doors--${elevator.doorPhase}`}>
              {elevator.doorPhase}
              {elevator.doorHeld ? ' (held)' : ''}
            </dd>
          </div>
        </dl>
      </header>

      <ol className="shaft" aria-label={`Shaft ${elevator.id}`}>
        {floors.map((floor) => {
          const here = floor === elevator.currentFloor;
          const isDestination = elevator.destinations.includes(floor);
          const isAssigned = elevator.assignedRequests.some((r) => r.floor === floor);
          return (
            <li
              key={floor}
              className={[
                'shaft__floor',
                here ? 'shaft__floor--here' : '',
                isDestination ? 'shaft__floor--destination' : '',
                isAssigned ? 'shaft__floor--assigned' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="shaft__number">{floor}</span>
              {here && <span className="shaft__car">{DIRECTION_GLYPH[elevator.direction]}</span>}
            </li>
          );
        })}
      </ol>

      <p className="car__list">
        <strong>Destinations:</strong>{' '}
        {elevator.destinations.length > 0 ? elevator.destinations.join(', ') : 'none'}
      </p>
      <p className="car__list">
        <strong>Assigned calls:</strong>{' '}
        {elevator.assignedRequests.length > 0
          ? elevator.assignedRequests.map((r) => `${r.floor} ${r.direction}`).join(', ')
          : 'none'}
      </p>

      <DestinationSelector elevator={elevator} onError={onError} />
      <DoorControls elevator={elevator} onError={onError} />
    </section>
  );
}
