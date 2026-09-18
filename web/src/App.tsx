import { useCallback, useEffect, useState } from 'react';
import { useSimulationState } from './hooks/useSimulationState.ts';
import { BuildingView } from './components/BuildingView.tsx';
import { FloorPanel } from './components/FloorPanel.tsx';
import { PendingRequests } from './components/PendingRequests.tsx';
import { SimulationControls } from './components/SimulationControls.tsx';
import './App.css';

export default function App() {
  const { snapshot, connected } = useSimulationState();
  const [error, setError] = useState<string | null>(null);

  const onError = useCallback((message: string) => setError(message), []);

  // Rejected commands change nothing; the message is the whole outcome (FR-054).
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  if (!snapshot) {
    return (
      <main className="app">
        <h1>Elevator Simulator</h1>
        <p className="hint">Connecting to the simulation…</p>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1>Elevator Simulator</h1>
        <SimulationControls snapshot={snapshot} connected={connected} onError={onError} />
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="app__body">
        <FloorPanel snapshot={snapshot} onError={onError} />
        <BuildingView snapshot={snapshot} onError={onError} />
        <PendingRequests snapshot={snapshot} />
      </div>
    </main>
  );
}
