import { useCallback, useEffect, useState } from 'react';
import { useSimulationState } from './hooks/useSimulationState.ts';
import { API_BASE_URL, API_BASE_URL_MISSING } from './api/config.ts';
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

  if (API_BASE_URL_MISSING) {
    return (
      <main className="app">
        <h1>Elevator Simulator</h1>
        <p className="error" role="alert">
          This build has no backend address. <code>VITE_API_BASE_URL</code> was not set when it was
          built, so it is falling back to <code>{API_BASE_URL}</code>, which only exists on a
          developer's machine. Set the variable in the hosting project and rebuild — it is baked in
          at build time, so re-deploying the existing build will not pick it up.
        </p>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="app">
        <h1>Elevator Simulator</h1>
        <p className="hint">
          Connecting to the simulation at <code>{API_BASE_URL}</code>…
        </p>
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
