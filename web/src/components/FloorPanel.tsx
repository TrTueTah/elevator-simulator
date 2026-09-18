import { simulationClient, CommandError } from '../api/simulation-client.ts';
import {
  HIGHEST_FLOOR,
  LOWEST_FLOOR,
  type BuildingSnapshot,
  type Direction,
} from '../types/snapshot.ts';

/**
 * The call buttons. Floor 10 offers no "up" and floor 1 no "down" (FR-008) -
 * they are a property of the building, so the button simply is not there.
 */
export function FloorPanel({
  snapshot,
  onError,
}: {
  snapshot: BuildingSnapshot;
  onError: (message: string) => void;
}) {
  const floors = [];
  for (let floor = HIGHEST_FLOOR; floor >= LOWEST_FLOOR; floor -= 1) floors.push(floor);

  const call = (floor: number, direction: Direction) => {
    simulationClient.requestElevator(floor, direction).catch((error: unknown) => {
      onError(error instanceof CommandError ? error.message : 'The command could not be sent.');
    });
  };

  const pendingAt = (floor: number, direction: Direction) =>
    snapshot.pendingRequests.some((r) => r.floor === floor && r.direction === direction);

  return (
    <section className="panel" aria-label="Call buttons">
      <h2>Floors</h2>
      <ul className="panel__floors">
        {floors.map((floor) => (
          <li key={floor} className="panel__floor">
            <span className="panel__number">{floor}</span>
            <button
              type="button"
              className={pendingAt(floor, 'up') ? 'lit' : ''}
              disabled={floor === HIGHEST_FLOOR}
              onClick={() => call(floor, 'up')}
              aria-label={`Call up from floor ${floor}`}
            >
              ▲
            </button>
            <button
              type="button"
              className={pendingAt(floor, 'down') ? 'lit' : ''}
              disabled={floor === LOWEST_FLOOR}
              onClick={() => call(floor, 'down')}
              aria-label={`Call down from floor ${floor}`}
            >
              ▼
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
