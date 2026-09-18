import { simulationClient, CommandError } from '../api/simulation-client.ts';
import type { ElevatorSnapshot } from '../types/snapshot.ts';

export function DoorControls({
  elevator,
  onError,
}: {
  elevator: ElevatorSnapshot;
  onError: (message: string) => void;
}) {
  const doorsInUse = elevator.doorPhase !== 'closed';

  const run = (action: () => Promise<void>) => () => {
    action().catch((error: unknown) => {
      onError(error instanceof CommandError ? error.message : 'The command could not be sent.');
    });
  };

  return (
    <div className="controls" role="group" aria-label={`Doors for elevator ${elevator.id}`}>
      <button
        type="button"
        disabled={!doorsInUse || elevator.doorHeld}
        onClick={run(() => simulationClient.holdDoors(elevator.id))}
      >
        Hold open
      </button>
      <button
        type="button"
        disabled={!doorsInUse || !elevator.doorHeld}
        onClick={run(() => simulationClient.releaseDoors(elevator.id))}
      >
        Release
      </button>
      <button
        type="button"
        disabled={!doorsInUse}
        onClick={run(() => simulationClient.closeDoors(elevator.id))}
      >
        Close now
      </button>
    </div>
  );
}
