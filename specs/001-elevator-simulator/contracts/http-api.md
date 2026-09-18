# Command API Contract

Base path: `/api/simulation`. All request and response bodies are JSON.

Commands **acknowledge only** — they return `202 Accepted` with no state body. The caller learns the
outcome by watching the [state stream](./state-stream.md), which emits a fresh snapshot immediately
after any accepted command. This is deliberate: one path for state, no reconciliation (FR-045).

---

## Building commands

### `POST /api/simulation/requests`

Create a hall request (FR-007).

```json
{ "floor": 5, "direction": "up" }
```

| Response | When |
|----------|------|
| `202 Accepted` | Accepted, or already pending — identical `(floor, direction)` is idempotent (FR-009) |
| `400 INVALID_REQUEST_DIRECTION` | `up` from floor 10, or `down` from floor 1 (FR-008) |
| `400 FLOOR_OUT_OF_RANGE` | `floor` outside 1–10 |

Never returns a "no elevator available" error: requests are always accepted and queued (FR-012).

---

### `POST /api/simulation/elevators/:id/destination`

Select a destination from inside a car (FR-026).

```json
{ "floor": 2 }
```

| Response | When |
|----------|------|
| `202 Accepted` | Recorded, or already recorded (FR-028); selecting the current floor is a no-op that re-opens the doors (FR-029) |
| `409 DOORS_NOT_OPEN` | That car's doors are not `open` (FR-026) |
| `400 FLOOR_OUT_OF_RANGE` | `floor` outside 1–10 (FR-030) |
| `404 ELEVATOR_NOT_FOUND` | `id` is not `A`, `B` or `C` |

Any floor in range is accepted regardless of why the car stopped (clarification Q4).

---

### `POST /api/simulation/elevators/:id/doors/hold`

Hold the doors open (FR-037). Repeatable and safe to interleave with `close` (FR-040).

| Response | When |
|----------|------|
| `202 Accepted` | Hold applied, or ignored because the doors have already begun closing |
| `409 DOORS_NOT_OPEN` | The doors are `closed` |

### `POST /api/simulation/elevators/:id/doors/release`

Release a hold; the dwell period restarts (FR-038). Same responses as `hold`.

### `POST /api/simulation/elevators/:id/doors/close`

Close immediately, overriding hold and remaining dwell (FR-039).

| Response | When |
|----------|------|
| `202 Accepted` | Closing has begun, or the doors were already closed |

---

## Time controls

### `POST /api/simulation/pause` · `POST /api/simulation/resume`

Pause or resume the automatic advance (FR-005b). Both return `202 Accepted` and are idempotent.

### `POST /api/simulation/step`

Advance exactly one step (FR-005c).

| Response | When |
|----------|------|
| `202 Accepted` | One tick applied |
| `409 SIMULATION_NOT_PAUSED` | The simulation is running; pause first |

### `POST /api/simulation/speed`

```json
{ "speed": 2 }
```

| Response | When |
|----------|------|
| `202 Accepted` | `speed` is one of `0.5`, `1`, `2`, `4` (FR-005d) |
| `400 INVALID_SPEED` | Any other value |

Changing speed alters only real-world pacing, never the sequence of states (SC-014).

### `POST /api/simulation/reset`

Return to three idle cars at Floor 1, doors closed, nothing pending (FR-006). Always `202 Accepted`.

---

## Read endpoint

### `GET /api/simulation/state`

Returns the current `BuildingSnapshot` (same shape as a stream event). Present so that the UI can
render before the stream connects and so e2e tests can assert without consuming a stream. Not the
primary path.

---

## Error body

Every `4xx` shares one shape, produced by a single exception filter mapping the domain error
hierarchy (research R8):

```json
{ "code": "DOORS_NOT_OPEN", "message": "Elevator B doors are closed; no destination can be selected." }
```

| Guarantee | Source |
|-----------|--------|
| A rejected command leaves the simulation exactly as it was | FR-053 |
| The message names what was attempted and why it was refused | FR-054 |

`code` values are stable and are the contract; `message` is for humans and may be reworded.
