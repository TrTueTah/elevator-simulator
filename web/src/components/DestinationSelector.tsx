import { simulationClient, CommandError } from '../api/simulation-client.ts';
import { HIGHEST_FLOOR, LOWEST_FLOOR, type ElevatorSnapshot } from '../types/snapshot.ts';

/**
 * Destinations can only be chosen while the doors are open (FR-026), so the
 * whole control is absent otherwise rather than present-but-failing (FR-052).
 */
export function DestinationSelector({
  elevator,
  onError,
}: {
  elevator: ElevatorSnapshot;
  onError: (message: string) => void;
}) {
  if (elevator.doorPhase !== 'open') {
    return <p className="hint">Doors closed — board the car to choose a destination.</p>;
  }

  const floors = [];
  for (let floor = LOWEST_FLOOR; floor <= HIGHEST_FLOOR; floor += 1) floors.push(floor);

  return (
    <div className="controls" role="group" aria-label={`Destination for elevator ${elevator.id}`}>
      <span className="controls__label">Go to:</span>
      {floors.map((floor) => (
        <button
          key={floor}
          type="button"
          className={elevator.destinations.includes(floor) ? 'selected' : ''}
          onClick={() => {
            simulationClient.selectDestination(elevator.id, floor).catch((error: unknown) => {
              onError(
                error instanceof CommandError ? error.message : 'The command could not be sent.',
              );
            });
          }}
        >
          {floor}
        </button>
      ))}
    </div>
  );
}
