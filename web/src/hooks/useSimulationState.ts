import { useEffect, useState } from 'react';
import { simulationClient } from '../api/simulation-client.ts';
import type { BuildingSnapshot } from '../types/snapshot.ts';

/**
 * Owns the connection to the simulation and holds the latest snapshot. This is
 * the only place the browser learns anything about the building - nothing here
 * or downstream decides how an elevator behaves.
 */
export function useSimulationState(): {
  snapshot: BuildingSnapshot | null;
  connected: boolean;
} {
  const [snapshot, setSnapshot] = useState<BuildingSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(simulationClient.streamUrl());

    source.onopen = () => setConnected(true);
    source.onmessage = (event: MessageEvent<string>) => {
      setConnected(true);
      setSnapshot(JSON.parse(event.data) as BuildingSnapshot);
    };
    source.onerror = () => setConnected(false);

    return () => source.close();
  }, []);

  return { snapshot, connected };
}
