# Phase 1 Data Model: Elevator Simulator

**Feature**: 001-elevator-simulator | **Date**: 2026-09-18
**Source**: [spec.md](./spec.md) Key Entities + Requirements | **Decisions**: [research.md](./research.md)

All types below live in the **domain layer** and import nothing from NestJS, React, HTTP or any
clock. Field names are the canonical vocabulary for the whole codebase, backend and frontend alike
(Constitution Principle VI).

---

## Value objects

### `FloorNumber`

A branded integer in the inclusive range 1–10.

| Rule | Source |
|------|--------|
| MUST be an integer in 1..10; construction outside the range throws `FloorOutOfRangeError` | FR-004, FR-030 |
| `LOWEST = 1`, `HIGHEST = 10` exposed as constants | FR-001 |
| `isTop()` / `isBottom()` used to derive available request directions | FR-008, FR-019 |

Branding (rather than a bare `number`) is what makes an out-of-range floor unrepresentable rather
than merely validated — Principle VI's "exclude illegal states through the type system".

### `Direction`

`'up' | 'down'` — the direction of a request, and of an elevator that is moving.

### `TravelDirection`

`Direction | 'none'` — an elevator's physical direction of travel. An `Idle` elevator is `'none'`
(FR-015). Per clarification Q2 there is exactly one direction concept; no committed *service*
direction exists.

### `DoorPhase`

`'closed' | 'opening' | 'open' | 'closing'` (FR-032).

### `MotionState`

Discriminated union (research R4):

| Variant | Meaning |
|---------|---------|
| `{ kind: 'idle' }` | No work; no direction of travel |
| `{ kind: 'moving', direction: Direction }` | Travelling toward a committed floor |
| `{ kind: 'stopped' }` | Halted at a floor to serve, doors in use |

---

## `Doors` (value object, owns its own transitions)

| Field | Type | Notes |
|-------|------|-------|
| `phase` | `DoorPhase` | Current state |
| `dwellRemaining` | `number` | Ticks left before auto-close; only meaningful while `open` |
| `holdRequested` | `boolean` | True while a user holds the doors |

**Constants**: `DWELL_TICKS = 3` (spec Assumptions), `TRANSITION_TICKS = 1`.

**Behaviour** (all mutation happens through these; no field is settable from outside):

| Method | Rule | Source |
|--------|------|--------|
| `beginOpening()` | Only legal while `closed` and the car is stopped at a floor; otherwise `DoorsCannotOpenError` | FR-034, FR-035 |
| `hold()` | Sets `holdRequested`. Ignored once `closing` has begun | FR-037, FR-040 |
| `releaseHold()` | Clears hold and **restarts** `dwellRemaining` at `DWELL_TICKS` | FR-038 |
| `closeNow()` | Clears the hold and moves straight to `closing`, overriding remaining dwell | FR-039 |
| `tick()` | `opening`→`open` (dwell reset); `open`→ decrement dwell, →`closing` at 0 unless held; `closing`→`closed` | FR-036 |
| `areClosed()` | `phase === 'closed'` — the single guard the elevator consults before moving | FR-033 |

**Transition diagram**

```text
closed ──beginOpening()──> opening ──tick()──> open ──dwell hits 0 and not held──> closing
                                                 │                                    │
                                                 └── closeNow() ─────────────────────>┘
                                                                                      │
                                                                       tick() ────────> closed
```

While `holdRequested` is true, `open` is absorbing: `dwellRemaining` does not decrease.

---

## `ElevatorRequest` (abstract base) — inheritance + polymorphism

The one place the stopping rules live (research R4).

| Field | Type |
|-------|------|
| `id` | `RequestId` |
| `floor` | `FloorNumber` |

| Method | Contract |
|--------|----------|
| `abstract shouldStopFor(car: ElevatorView): boolean` | Does this request oblige the car to stop *right now*? |
| `isAt(floor)` | Convenience used by both subclasses |

### `HallRequest extends ElevatorRequest`

| Field | Type | Notes |
|-------|------|-------|
| `direction` | `Direction` | The direction the waiting person wants to travel |
| `assignedTo` | `ElevatorId` | Set once at creation and **never changed** (clarification Q1, FR-011) |

`shouldStopFor(car)` returns true only when **all** hold:
1. `car.id === this.assignedTo` — an elevator never serves another's request (FR-022)
2. `car.floor === this.floor`
3. the car is idle at that floor, **or** `car.travelDirection === this.direction` (FR-021, FR-024)

Identity: `(floor, direction)` is unique among pending requests (FR-009, FR-010). Re-requesting an
already-pending `(floor, direction)` is a no-op.

### `CarCall extends ElevatorRequest`

| Field | Type | Notes |
|-------|------|-------|
| `elevatorId` | `ElevatorId` | The car this destination belongs to |

`shouldStopFor(car)` returns `car.id === this.elevatorId && car.floor === this.floor` — no direction
test at all, which is exactly FR-025.

Identity: `(elevatorId, floor)` is unique; re-selecting a recorded destination is a no-op (FR-028).

---

## `Elevator` (entity)

| Field | Type | Visibility |
|-------|------|------------|
| `id` | `ElevatorId` (`'A' \| 'B' \| 'C'`) | readonly, public |
| `currentFloor` | `FloorNumber` | private, exposed via getter |
| `motion` | `MotionState` | private |
| `doors` | `Doors` | private |
| `carCalls` | `Set<FloorNumber>` | private |
| `assignedHallRequests` | `HallRequest[]` | private |

**Derived**: `travelDirection` — `motion.kind === 'moving' ? motion.direction : 'none'` (FR-015).

### Invariants (enforced inside `Elevator`, per Principle III)

| # | Invariant | Source |
|---|-----------|--------|
| I1 | `currentFloor` is always within 1..10 | FR-004, FR-019 |
| I2 | The car changes floor only when `doors.areClosed()` | FR-033 |
| I3 | `motion.kind === 'idle'` implies no car calls, no assigned requests, and `travelDirection === 'none'` | FR-015, FR-018a |
| I4 | The car never passes a floor for which it owns a request that `shouldStopFor` accepts | FR-017 |
| I5 | Doors are never `open`/`opening`/`closing` while `motion.kind === 'moving'` | FR-033 |

### `tick()` order of operations

The sequence is fixed and is the reason I2 and I5 cannot be violated:

```text
1. doors.tick()                     advance door phase / dwell
2. if (!doors.areClosed()) return   doors busy -> the car cannot move this step  [I2, I5]
3. if (shouldStopHere()) -> clear the served request(s), doors.beginOpening(), motion = stopped
4. decide next direction:
     any owned work ahead in current direction? -> keep going
     else any owned work behind?                -> reverse                        [FR-018]
     else                                        -> motion = idle, stay put       [FR-018a]
5. if moving -> currentFloor += 1 step in that direction                          [FR-016]
```

Step 3 before step 5 is what guarantees I4: the car evaluates "must I stop here?" *at* a floor,
never after leaving it.

### Direction choice (`decideNextDirection`)

Sole implementation of FR-018 / FR-018a and the starvation argument in research R6:

| Condition | Result |
|-----------|--------|
| Owned car call or assigned hall request strictly ahead in `travelDirection` | continue |
| Otherwise, any owned work strictly behind | reverse |
| Otherwise | `idle`, remaining on the current floor |

---

## `Building` (aggregate root)

| Field | Type | Visibility |
|-------|------|------------|
| `elevators` | `ReadonlyMap<ElevatorId, Elevator>` (exactly 3) | private |
| `pendingHallRequests` | `HallRequest[]` | private |
| `stepCount` | `number` | private |
| `dispatch` | `DispatchStrategy` | injected at construction |

| Method | Rule | Source |
|--------|------|--------|
| `requestElevator(floor, direction)` | Rejects up-from-10 and down-from-1 (`InvalidRequestDirectionError`); returns the existing request if `(floor, direction)` is already pending; otherwise asks `dispatch` for an owner, creates the `HallRequest`, hands it to that elevator | FR-007–FR-013 |
| `selectDestination(elevatorId, floor)` | Requires that car's doors to be `open` (`DoorsNotOpenError`); any floor in 1..10 is acceptable regardless of why the car stopped (clarification Q4); current floor is a no-op that re-opens the doors | FR-026, FR-029, FR-030 |
| `holdDoors(id)` / `closeDoors(id)` | Delegate to that elevator's `Doors` | FR-037, FR-039 |
| `tick()` | Increments `stepCount`, then ticks **every** elevator; no elevator's tick may read or mutate another (FR-020) | FR-005, FR-020 |
| `snapshot()` | Produces the immutable `BuildingSnapshot` read model | FR-045, FR-046 |
| `reset()` | Returns to three idle cars at Floor 1, doors closed, nothing pending | FR-003, FR-006 |

**Invariant B1**: a `(floor, direction)` pair appears at most once in `pendingHallRequests`.
**Invariant B2**: every pending hall request is owned by exactly one existing elevator (FR-011, FR-044).

---

## `DispatchStrategy` (port) — polymorphism

```text
interface DispatchStrategy {
  chooseFor(request: { floor, direction }, cars: readonly ElevatorView[]): ElevatorId
}
```

- **`NearestSuitableCarStrategy`** (production): score = `|car.floor - request.floor|`
  + reversal penalty + outstanding workload; lowest wins; **ties broken by ascending id** (FR-043).
- **`FixedOrderStrategy`** (tests only): always returns the first car — the second implementation
  that justifies the port existing at all under Principle V, and the control case proving the
  distribution tests in SC-007 actually discriminate.

`ElevatorView` is a narrow readonly projection (`id`, `floor`, `travelDirection`, `workload`), so a
strategy cannot mutate a car.

---

## `SimulationRunner` (application layer, not domain)

Owns the passage of real time; holds **no** elevator rules.

| Field | Type |
|-------|------|
| `status` | `'running' \| 'paused'` |
| `speed` | `0.5 \| 1 \| 2 \| 4` |
| `clock` | `ClockPort` (injected) |

| Method | Rule | Source |
|--------|------|--------|
| `pause()` / `resume()` | Stops/starts the clock subscription | FR-005b |
| `step()` | One `building.tick()`; rejected with `SimulationNotPausedError` unless paused | FR-005c |
| `setSpeed(s)` | Reschedules at `1000 / s` ms. Changes nothing inside the domain | FR-005d, SC-014 |

`BASE_STEP_MS = 1000`. No domain duration is ever expressed in milliseconds (research R12).

---

## Read model: `BuildingSnapshot`

The one shape crossing to the presentation layer and the wire. Immutable, plain data, no methods.

```text
BuildingSnapshot {
  stepCount: number
  status: 'running' | 'paused'
  speed: 0.5 | 1 | 2 | 4
  elevators: ElevatorSnapshot[]        // always 3, ordered by id
  pendingRequests: HallRequestSnapshot[]
}

ElevatorSnapshot {
  id: 'A' | 'B' | 'C'
  currentFloor: number                 // 1..10
  motion: 'idle' | 'moving' | 'stopped'
  direction: 'up' | 'down' | 'none'
  doorPhase: 'closed' | 'opening' | 'open' | 'closing'
  doorHeld: boolean
  dwellRemaining: number
  destinations: number[]               // ascending
  assignedRequests: { floor: number; direction: 'up' | 'down' }[]
}

HallRequestSnapshot {
  floor: number
  direction: 'up' | 'down'
  assignedTo: 'A' | 'B' | 'C'
}
```

Every field FR-046 and FR-047 require the interface to display is present, so the frontend renders
without deriving anything (Principle I).

---

## Entity relationships

```text
Building 1 ──── 3 Elevator
   │                 │
   │                 ├── 1 Doors
   │                 ├── * CarCall          (destinations owned by this car)
   │                 └── * HallRequest      (sticky assignment, ref by id)
   │
   ├── * HallRequest (pending, each assignedTo exactly one Elevator)
   └── 1 DispatchStrategy (injected port)

ElevatorRequest (abstract)
   ├── HallRequest   (floor + direction + assignedTo)
   └── CarCall       (floor + elevatorId)
```

---

## Requirement coverage

| Area | Requirements | Home |
|------|--------------|------|
| Floor range | FR-001, FR-004, FR-019, FR-030 | `FloorNumber` |
| Request identity & direction availability | FR-007–FR-010 | `Building.requestElevator`, `HallRequest` |
| Sticky assignment | FR-011, FR-044 | `HallRequest.assignedTo` (readonly) |
| Direction rule | FR-021–FR-025a | `HallRequest.shouldStopFor` |
| Destinations always served | FR-025 | `CarCall.shouldStopFor` |
| Unrestricted destinations | FR-026, FR-029 | `Building.selectDestination` |
| Never move with doors open | FR-033, FR-034 | `Doors.areClosed` + `Elevator.tick` step 2 |
| Door commands | FR-035–FR-040 | `Doors` |
| Dispatch | FR-041–FR-043 | `NearestSuitableCarStrategy` |
| Idle in place | FR-018a | `Elevator.decideNextDirection` |
| Time controls | FR-005a–d | `SimulationRunner` |
| Display contract | FR-045–FR-047 | `BuildingSnapshot` |
| Errors | FR-053, FR-054 | Domain error hierarchy + exception filter |
