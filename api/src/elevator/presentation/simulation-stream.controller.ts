import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SimulationService } from '../application/simulation.service.js';

/**
 * The single channel state takes to the browser. Every event carries a complete
 * snapshot rather than a delta, which makes reconnection trivial: the next
 * event is whole by construction (contracts/state-stream.md).
 */
@Controller('api/simulation')
export class SimulationStreamController {
  constructor(private readonly simulation: SimulationService) {}

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      subscriber.next({ data: this.simulation.snapshot() });
      const unsubscribe = this.simulation.subscribe((snapshot) => {
        subscriber.next({ data: snapshot });
      });
      return () => unsubscribe();
    });
  }
}
