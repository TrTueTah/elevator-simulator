import { simulationClient, CommandError } from '../api/simulation-client.ts';
import { SPEEDS, type BuildingSnapshot } from '../types/snapshot.ts';

export function SimulationControls({
  snapshot,
  connected,
  onError,
}: {
  snapshot: BuildingSnapshot;
  connected: boolean;
  onError: (message: string) => void;
}) {
  const paused = snapshot.status === 'paused';

  const run = (action: () => Promise<void>) => () => {
    action().catch((error: unknown) => {
      onError(error instanceof CommandError ? error.message : 'The command could not be sent.');
    });
  };

  return (
    <section className="sim" aria-label="Simulation controls">
      <span className={`sim__status sim__status--${snapshot.status}`}>
        {paused ? '❚❚ Paused' : '▶ Running'}
      </span>
      <span className="sim__step">step {snapshot.stepCount}</span>
      <span className={connected ? 'sim__live' : 'sim__stale'}>
        {connected ? 'live' : 'disconnected'}
      </span>

      <button type="button" onClick={run(paused ? simulationClient.resume : simulationClient.pause)}>
        {paused ? 'Resume' : 'Pause'}
      </button>
      {/* Stepping is only meaningful while paused (FR-005c). */}
      <button type="button" disabled={!paused} onClick={run(simulationClient.step)}>
        Step
      </button>

      <label className="sim__speed">
        Speed
        <select
          value={snapshot.speed}
          onChange={(event) => {
            simulationClient.setSpeed(Number(event.target.value)).catch((error: unknown) => {
              onError(
                error instanceof CommandError ? error.message : 'The command could not be sent.',
              );
            });
          }}
        >
          {SPEEDS.map((speed) => (
            <option key={speed} value={speed}>
              {speed}×
            </option>
          ))}
        </select>
      </label>

      <button type="button" onClick={run(simulationClient.reset)}>
        Reset
      </button>
    </section>
  );
}
