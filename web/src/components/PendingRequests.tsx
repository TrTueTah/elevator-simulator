import type { BuildingSnapshot } from '../types/snapshot.ts';

export function PendingRequests({ snapshot }: { snapshot: BuildingSnapshot }) {
  return (
    <section className="pending" aria-label="Pending requests">
      <h2>Waiting ({snapshot.pendingRequests.length})</h2>
      {snapshot.pendingRequests.length === 0 ? (
        <p className="hint">Nobody is waiting.</p>
      ) : (
        <ul>
          {[...snapshot.pendingRequests]
            .sort((a, b) => b.floor - a.floor || a.direction.localeCompare(b.direction))
            .map((request) => (
              <li key={`${request.floor}:${request.direction}`}>
                Floor <strong>{request.floor}</strong> going{' '}
                <strong>{request.direction}</strong> → elevator{' '}
                <strong>{request.assignedTo}</strong>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
