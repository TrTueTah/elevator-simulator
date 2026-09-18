import type { BuildingSnapshot } from '../types/snapshot.ts';
import { ElevatorCar } from './ElevatorCar.tsx';

export function BuildingView({
  snapshot,
  onError,
}: {
  snapshot: BuildingSnapshot;
  onError: (message: string) => void;
}) {
  return (
    <div className="building">
      {snapshot.elevators.map((elevator) => (
        <ElevatorCar key={elevator.id} elevator={elevator} onError={onError} />
      ))}
    </div>
  );
}
