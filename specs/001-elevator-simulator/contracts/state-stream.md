# State Stream Contract

### `GET /api/simulation/stream` — Server-Sent Events

The single channel by which simulation state reaches the browser (research R3).

## Emission rules

| Trigger | Source |
|---------|--------|
| On connect, immediately — the current full snapshot | FR-051, SC-003-style late-join behaviour |
| After every tick | FR-051 |
| After every accepted command | SC-011 (visible within 1 second) |

Every event carries a **complete** `BuildingSnapshot`, never a delta. The building is three cars and
a short request list, so a whole snapshot is small, and sending it whole removes any possibility of
the client's picture drifting from the server's.

## Event format

```text
data: {"stepCount":42,"status":"running","speed":1,"elevators":[...],"pendingRequests":[...]}

```

Payload shape is exactly `BuildingSnapshot` from [data-model.md](../data-model.md):

```json
{
  "stepCount": 42,
  "status": "running",
  "speed": 1,
  "elevators": [
    {
      "id": "A",
      "currentFloor": 5,
      "motion": "moving",
      "direction": "up",
      "doorPhase": "closed",
      "doorHeld": false,
      "dwellRemaining": 0,
      "destinations": [8],
      "assignedRequests": [{ "floor": 7, "direction": "up" }]
    }
  ],
  "pendingRequests": [{ "floor": 7, "direction": "up", "assignedTo": "A" }]
}
```

## Guarantees

| # | Guarantee | Source |
|---|-----------|--------|
| S1 | `elevators` always has exactly 3 entries, ordered `A`, `B`, `C` | FR-002, FR-046 |
| S2 | `stepCount` is non-decreasing across events on one connection | FR-051 |
| S3 | Every field FR-046 and FR-047 require the UI to show is present in every event | FR-046, FR-047 |
| S4 | `direction` is `"none"` whenever `motion` is `"idle"` | FR-015 |
| S5 | `doorPhase` is `"closed"` whenever `motion` is `"moving"` | FR-033 |
| S6 | While `status` is `"paused"`, no event is emitted except in response to a command or `step` | FR-005b, SC-013 |

S4 and S5 are invariants of the domain, restated here because they are the two properties an e2e
test can assert cheaply from outside, without reaching into the simulation.

## Client expectations

- The browser holds the latest snapshot and renders from it. It derives no elevator behaviour from
  it (Constitution Principle I).
- On disconnect the browser reconnects; the first event after reconnect is a full snapshot, so no
  catch-up or replay logic is needed.
