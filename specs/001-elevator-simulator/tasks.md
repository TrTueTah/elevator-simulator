---

description: "Task list for Elevator Simulator implementation"
---

# Tasks: Elevator Simulator

**Input**: Design documents from `/specs/001-elevator-simulator/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Test tasks ARE included. The project constitution makes them mandatory, not optional —
Principle III requires every named invariant to have a test that asserts the violation is rejected,
and Principle IV requires the domain to be unit-testable with no framework, network or real timer.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested and
demonstrated on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: The user story this task serves (US1–US5)
- Every task names the exact file it touches

## Path Conventions

Two existing workspaces: `api/` (NestJS) and `web/` (Vite + React). Domain code lives under
`api/src/elevator/domain/` and must import nothing from NestJS, React, HTTP or any clock.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring the scaffold in line with the constitution and the plan before any feature code.

- [X] T001 Enable strict type-checking by adding `"strict": true` and `"noUncheckedIndexedAccess": true` to `compilerOptions` in `web/tsconfig.app.json` — **blocking constitution fix** (Principle VI, research R11)
- [X] T002 [P] Change the listen port to `process.env.PORT ?? 8080` and enable CORS from a `WEB_ORIGIN` allowlist in `api/src/main.ts`
- [X] T003 [P] Create the layer directories `domain/value-objects/`, `domain/requests/`, `domain/dispatch/`, `application/ports/`, `infrastructure/`, `presentation/dto/` under `api/src/elevator/`
- [X] T004 [P] Add `VITE_API_BASE_URL` with a `http://localhost:8080` fallback in `web/src/api/config.ts` and document it in `web/.env.example`
- [X] T005 [P] Add an `import/no-restricted-paths`-style lint rule (or an equivalent oxlint restriction) in `api/oxlint.json` forbidding `@nestjs/*`, `express`, and timer globals inside `api/src/elevator/domain/**`

**Checkpoint**: Both workspaces type-check strictly; the layering rule is machine-enforced.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The domain skeleton, the transport, and the rendering shell. Nothing is demonstrable
until these exist.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Domain core

- [X] T006 [P] Implement the branded `FloorNumber` (range 1–10, `LOWEST`/`HIGHEST`, `isTop()`, `isBottom()`) in `api/src/elevator/domain/value-objects/floor-number.ts`
- [X] T007 [P] Define `Direction`, `TravelDirection` and `DoorPhase` types in `api/src/elevator/domain/value-objects/direction.ts`
- [X] T008 [P] Implement the `ElevatorDomainError` hierarchy (`FloorOutOfRangeError`, `DoorsNotClosedError`, `DoorsNotOpenError`, `DoorsCannotOpenError`, `InvalidRequestDirectionError`, `ElevatorNotFoundError`, `SimulationNotPausedError`) in `api/src/elevator/domain/errors.ts`
- [X] T009 [P] Unit-test `FloorNumber` construction, boundaries and out-of-range rejection in `api/src/elevator/domain/value-objects/floor-number.spec.ts`
- [X] T010 Implement the `Doors` value object — four phases, `dwellRemaining` counted in ticks, `DWELL_TICKS = 3`, `beginOpening()`, `tick()`, `areClosed()` — in `api/src/elevator/domain/value-objects/doors.ts`
- [X] T011 Unit-test the `Doors` state machine: `closed→opening→open→closing→closed`, dwell countdown, and that `beginOpening()` throws when not stopped, in `api/src/elevator/domain/value-objects/doors.spec.ts`
- [X] T012 [P] Implement the abstract `ElevatorRequest` base with `id`, `floor` and `abstract shouldStopFor(car: ElevatorView): boolean` in `api/src/elevator/domain/requests/elevator-request.ts`
- [X] T013 [P] Implement `CarCall extends ElevatorRequest` whose `shouldStopFor` ignores direction entirely, in `api/src/elevator/domain/requests/car-call.ts`
- [X] T014 Implement `HallRequest extends ElevatorRequest` with `direction` and a readonly `assignedTo`, in `api/src/elevator/domain/requests/hall-request.ts` (stopping rule arrives in US2)
- [X] T015 Implement the `Elevator` entity — private `currentFloor`, `motion`, `doors`, `carCalls`, `assignedHallRequests`, plus the fixed `tick()` ordering from data-model.md (doors tick → closed guard → stop check → direction → move) — in `api/src/elevator/domain/elevator.ts`
- [X] T016 Implement the `Building` aggregate with three elevators, `tick()` fanning out to each, `reset()` and `snapshot()`, in `api/src/elevator/domain/building.ts`
- [X] T017 [P] Define the `BuildingSnapshot`, `ElevatorSnapshot` and `HallRequestSnapshot` read-model types in `api/src/elevator/domain/snapshot.ts`

### Application layer

- [X] T018 [P] Define the `ClockPort` interface (`start(onTick, intervalMs)`, `stop()`) in `api/src/elevator/application/ports/clock.port.ts`
- [X] T019 [P] Implement a `FakeClock` test double that fires on demand in `api/src/elevator/application/ports/fake-clock.ts`
- [X] T020 Implement `SimulationRunner` holding `status`, `speed` and `BASE_STEP_MS = 1000`, driving `building.tick()` through the injected `ClockPort`, in `api/src/elevator/application/simulation-runner.ts`
- [X] T021 Implement `SimulationService` exposing the use cases over the aggregate and emitting a snapshot after every tick and accepted command, in `api/src/elevator/application/simulation.service.ts`

### Infrastructure & presentation

- [X] T022 [P] Implement `IntervalClockAdapter` — the only `setInterval` in the codebase — in `api/src/elevator/infrastructure/interval-clock.adapter.ts`
- [X] T023 [P] Implement the exception filter mapping `ElevatorDomainError` to `{ code, message }` with the status codes in contracts/http-api.md, in `api/src/elevator/presentation/domain-error.filter.ts`
- [X] T024 Implement `GET /api/simulation/state` returning the current snapshot in `api/src/elevator/presentation/simulation.controller.ts`
- [X] T025 Implement `GET /api/simulation/stream` as an `@Sse()` endpoint emitting full snapshots per contracts/state-stream.md, in `api/src/elevator/presentation/simulation-stream.controller.ts`
- [X] T026 Wire `ElevatorModule` (providers, `ClockPort` binding, controllers, filter) in `api/src/elevator/elevator.module.ts` and register it in `api/src/app.module.ts`
- [X] T027 Delete the unused NestJS scaffold files `api/src/app.controller.ts`, `api/src/app.service.ts` and `api/src/app.controller.spec.ts`

### Frontend shell

- [X] T028 [P] Mirror the snapshot types in `web/src/types/snapshot.ts`
- [X] T029 [P] Implement the command wrappers over `fetch` in `web/src/api/simulation-client.ts`
- [X] T030 Implement the `useSimulationState` hook owning the SSE subscription and holding the latest snapshot in `web/src/hooks/useSimulationState.ts`
- [X] T031 Implement `BuildingView` and `ElevatorCar` rendering three cars with floor, direction and door phase in `web/src/components/BuildingView.tsx` and `web/src/components/ElevatorCar.tsx`
- [X] T032 Replace the Vite starter content with the simulation shell in `web/src/App.tsx`

**Checkpoint**: Three idle elevators render in the browser and tick once per second. No requests yet.

---

## Phase 3: User Story 1 - Call an elevator and ride to a destination (Priority: P1) 🎯 MVP

**Goal**: A person calls an elevator from a floor, it arrives and opens its doors, they pick a
destination, and it carries them there.

**Independent Test**: Press **up** on Floor 3 with all cars idle at Floor 1; a car travels to
Floor 3 and opens its doors; select Floor 8; the car closes, travels to Floor 8 and opens again.

### Tests for User Story 1

- [X] T033 [P] [US1] Test the full ride flow — call, arrive, doors open, destination, travel, doors open — in `api/src/elevator/domain/building.ride.spec.ts`
- [X] T034 [P] [US1] Test that an elevator with no work becomes idle in place with `direction === 'none'` (FR-018a, clarification Q5) in `api/src/elevator/domain/elevator.idle.spec.ts`
- [X] T035 [P] [US1] Test that requesting the current floor of a stopped car opens the doors without movement, and that selecting the current floor as a destination is a no-op (FR-029) in `api/src/elevator/domain/building.same-floor.spec.ts`
- [X] T036 [P] [US1] Test that a repeat request for an already-pending `(floor, direction)` produces exactly one pending request, one assignment and one stop (FR-009) in `api/src/elevator/domain/building.requests.spec.ts` — **constitution Principle III names this invariant explicitly**
- [X] T037 [P] [US1] Test that multiple destinations are served in path order rather than entry order — selecting 9 then 5 while ascending stops at 5 first (FR-027) — in `api/src/elevator/domain/building.destinations.spec.ts`

### Implementation for User Story 1

- [X] T038 [P] [US1] Define the `DispatchStrategy` port and the narrow `ElevatorView` projection in `api/src/elevator/domain/dispatch/dispatch-strategy.ts`
- [X] T039 [US1] Implement a first `NearestSuitableCarStrategy` using distance only (scoring is completed in US4) in `api/src/elevator/domain/dispatch/nearest-suitable-car.strategy.ts`
- [X] T040 [US1] Implement `Building.requestElevator(floor, direction)` — direction availability check, `(floor, direction)` idempotency, dispatch, sticky assignment — in `api/src/elevator/domain/building.ts`
- [X] T041 [US1] Implement `Elevator.decideNextDirection()` (continue ahead → reverse → idle in place) in `api/src/elevator/domain/elevator.ts`
- [X] T042 [US1] Implement `Elevator.shouldStopHere()` and request-clearing on arrival, calling `doors.beginOpening()`, in `api/src/elevator/domain/elevator.ts`
- [X] T043 [US1] Implement `Building.selectDestination(elevatorId, floor)` requiring open doors and accepting any in-range floor (clarification Q4) in `api/src/elevator/domain/building.ts`
- [X] T044 [US1] Add `POST /api/simulation/requests` and `POST /api/simulation/elevators/:id/destination` with their DTOs in `api/src/elevator/presentation/simulation.controller.ts` and `api/src/elevator/presentation/dto/`
- [X] T045 [P] [US1] Implement `FloorPanel` with up/down call buttons, omitting up on Floor 10 and down on Floor 1 (FR-008), in `web/src/components/FloorPanel.tsx`
- [X] T046 [P] [US1] Implement destination selection shown only while that car's doors are open in `web/src/components/DestinationSelector.tsx`
- [X] T047 [US1] Show each car's destinations in `web/src/components/ElevatorCar.tsx`
- [X] T048 [US1] E2E-test the ride flow over HTTP in `api/test/ride.e2e-spec.ts`

**Checkpoint**: A complete single-passenger ride works end to end. This is the MVP.

---

## Phase 4: User Story 2 - Direction-matched stops along the route (Priority: P2)

**Goal**: A moving elevator collects people going its way and passes those going the other way.

**Independent Test**: Send a car from Floor 1 to Floor 10; add an **up** request at Floor 5 and a
**down** request at Floor 7 mid-flight. It stops at 5, not at 7, and 7 is served on a later
downward run.

### Tests for User Story 2

- [X] T049 [P] [US2] Test that a car moving up stops for an up-request ahead and does not stop for a down-request ahead (FR-021, FR-022) in `api/src/elevator/domain/requests/hall-request.spec.ts`
- [X] T050 [P] [US2] Test that a passed-over opposite-direction request is served on the next run in the matching direction (FR-022, SC-006) in `api/src/elevator/domain/building.direction-rule.spec.ts`
- [X] T051 [US2] Test that a car does not reverse mid-run for a request behind it, and that an idle car accepts either direction (FR-023, FR-024) in `api/src/elevator/domain/building.direction-rule.spec.ts`
- [X] T052 [P] [US2] Test the repositioning case — a car travelling up to reach an assigned down-request still collects its own up-requests en route (FR-025a, clarification Q2) — in `api/src/elevator/domain/building.repositioning.spec.ts`
- [X] T053 [P] [US2] Test that a destination is always served regardless of direction (FR-025) in `api/src/elevator/domain/requests/car-call.spec.ts`
- [X] T054 [P] [US2] Test that up and down requests at the same floor are independent — serving one leaves the other pending (FR-010) — in `api/src/elevator/domain/building.both-directions.spec.ts`

### Implementation for User Story 2

- [X] T055 [US2] Implement `HallRequest.shouldStopFor` — ownership check, floor match, and direction match or idle-at-floor — in `api/src/elevator/domain/requests/hall-request.ts`
- [X] T056 [US2] Make `Elevator.shouldStopHere()` consult `shouldStopFor` polymorphically across both car calls and assigned hall requests, removing any branching on request type, in `api/src/elevator/domain/elevator.ts`
- [X] T057 [US2] Ensure a car never serves a request assigned to another car (FR-022) in `api/src/elevator/domain/elevator.ts`
- [X] T058 [P] [US2] Implement `PendingRequests` listing each waiting request with floor, direction and assigned car in `web/src/components/PendingRequests.tsx`

**Checkpoint**: The defining rule of the exercise holds and is visible in the pending list.

---

## Phase 5: User Story 3 - Control the doors (Priority: P2)

**Goal**: Doors can be held open or closed immediately, and the car never moves unless they are shut.

**Independent Test**: With a destination pending, press **hold** and step ten times — the doors stay
open and the floor never changes. Press **close now** and travel resumes.

### Tests for User Story 3

- [X] T059 [P] [US3] Test that `hold()` keeps the doors open across many ticks and that the car does not change floor (FR-037, FR-033, invariants I2/I5) in `api/src/elevator/domain/elevator.doors.spec.ts`
- [X] T060 [P] [US3] Test that `releaseHold()` restarts the dwell and that `closeNow()` overrides both hold and remaining dwell (FR-038, FR-039) in `api/src/elevator/domain/value-objects/doors.spec.ts`
- [X] T061 [US3] Test that interleaved hold/close commands always leave one well-defined state (FR-040) in `api/src/elevator/domain/value-objects/doors.spec.ts`
- [X] T062 [US3] Test that opening the doors mid-travel throws `DoorsCannotOpenError` and changes nothing (FR-034, FR-053) in `api/src/elevator/domain/elevator.doors.spec.ts`

### Implementation for User Story 3

- [X] T063 [US3] Implement `hold()`, `releaseHold()` and `closeNow()` on `Doors`, with `closeNow` clearing the hold, in `api/src/elevator/domain/value-objects/doors.ts`
- [X] T064 [US3] Expose `holdDoors`, `releaseDoors` and `closeDoors` on the aggregate in `api/src/elevator/domain/building.ts`
- [X] T065 [US3] Add the three door endpoints from contracts/http-api.md in `api/src/elevator/presentation/simulation.controller.ts`
- [X] T066 [P] [US3] Implement `DoorControls` with hold, release and close-now buttons in `web/src/components/DoorControls.tsx`
- [X] T067 [US3] Display door phase and hold state per car in `web/src/components/ElevatorCar.tsx`
- [X] T068 [US3] E2E-test that a held door blocks movement across repeated steps in `api/test/doors.e2e-spec.ts`

**Checkpoint**: The safety invariant is enforced and demonstrable from the interface.

---

## Phase 6: User Story 4 - Balanced dispatch across three elevators (Priority: P3)

**Goal**: Requests spread across the three cars according to where each one is and what it is doing.

**Independent Test**: With cars at Floors 1, 5 and 9, request from Floor 8 — the car at 9 is chosen,
not the one at 1. Fire requests at several floors and confirm more than one car is used.

### Tests for User Story 4

- [X] T069 [P] [US4] Test that the better-placed car wins and that the same car is not always chosen (FR-042) in `api/src/elevator/domain/dispatch/nearest-suitable-car.strategy.spec.ts`
- [X] T070 [US4] Test that ties resolve by ascending elevator id and that identical states produce identical assignments (FR-043) in `api/src/elevator/domain/dispatch/nearest-suitable-car.strategy.spec.ts`
- [X] T071 [P] [US4] Test that a request made while all three cars are busy is queued and eventually served, never rejected (FR-012) in `api/src/elevator/domain/building.dispatch.spec.ts`
- [X] T072 [P] [US4] Test SC-007 — across 20 requests on different floors every car serves at least one and none serves more than 60% — using `FixedOrderStrategy` as the failing control, in `api/src/elevator/domain/building.distribution.spec.ts`
- [X] T073 [P] [US4] Test that a request's `assignedTo` never changes once set, across many ticks and intervening requests (FR-011, clarification Q1) in `api/src/elevator/domain/building.assignment.spec.ts`

### Implementation for User Story 4

- [X] T074 [P] [US4] Implement `FixedOrderStrategy`, the second implementation that justifies the port, in `api/src/elevator/domain/dispatch/fixed-order.strategy.ts`
- [X] T075 [US4] Complete the scoring with a reversal penalty and an outstanding-workload term, tie-broken by ascending id, in `api/src/elevator/domain/dispatch/nearest-suitable-car.strategy.ts`
- [X] T076 [US4] Expose `workload` on the `ElevatorView` projection in `api/src/elevator/domain/dispatch/dispatch-strategy.ts`
- [X] T077 [P] [US4] Show which car owns each pending request in `web/src/components/PendingRequests.tsx`

**Checkpoint**: All three cars share the load on a state-aware, deterministic basis.

---

## Phase 7: User Story 5 - Monitor the whole building at a glance (Priority: P3)

**Goal**: Everything the spec requires to be visible is visible, and the observer controls the clock.

**Independent Test**: Every field in FR-046 and FR-047 is on screen and updates live; pause freezes
the building; each step advances it exactly one step; changing pace does not change behaviour.

### Tests for User Story 5

- [X] T078 [P] [US5] Test that pause freezes all state and that `step()` advances exactly one tick, rejecting `step()` while running (FR-005b, FR-005c, SC-013) in `api/src/elevator/application/simulation-runner.spec.ts`
- [X] T079 [P] [US5] Test SC-014 — the same command sequence at 0.5× and 4× yields an identical state sequence — using `FakeClock` in `api/src/elevator/application/simulation-runner.speed.spec.ts`
- [X] T080 [P] [US5] Test that the snapshot carries every field FR-046 and FR-047 require, and guarantees S4 and S5 from the stream contract, in `api/src/elevator/domain/snapshot.spec.ts`
- [X] T081 [P] [US5] E2E-test that the SSE stream delivers a full snapshot on connect and after each command in `api/test/stream.e2e-spec.ts`

### Implementation for User Story 5

- [X] T082 [US5] Implement `pause()`, `resume()`, `step()` and `setSpeed()` on `SimulationRunner` in `api/src/elevator/application/simulation-runner.ts`
- [X] T083 [US5] Add the `pause`, `resume`, `step`, `speed` and `reset` endpoints in `api/src/elevator/presentation/simulation.controller.ts`
- [X] T084 [P] [US5] Implement `SimulationControls` with pause/resume, step, speed selector and reset, showing whether the simulation is running or paused, in `web/src/components/SimulationControls.tsx`
- [X] T085 [US5] Disable controls that are invalid in the current state and surface rejected commands as a readable message (FR-052, FR-054) in `web/src/App.tsx`

**Checkpoint**: All five user stories are complete and independently demonstrable.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T086 Implement the randomised invariant harness — a seeded 1,000-step run asserting at every step that no car moved with doors open, none skipped a committed floor, none left the 1–10 range, and none was idle while holding a direction (SC-003, SC-004, SC-005) — in `api/src/elevator/domain/invariants.spec.ts`
- [X] T087 [P] Test SC-008 — no request waits more than 60 steps under continuous traffic — in `api/src/elevator/domain/building.starvation.spec.ts`
- [X] T088 [P] Add `GET /api/health` returning `200` for Railway's health check in `api/src/elevator/presentation/simulation.controller.ts`
- [X] T089 [P] Extend the CORS configuration to allow the Vercel preview hostname pattern alongside the production origin in `api/src/main.ts`
- [X] T090 [P] Add `.github/workflows/ci.yml` running `api-quality` (`pnpm lint`, `pnpm build` for the `tsc` gate, `pnpm test`, `pnpm test:e2e`) and `web-quality` (`pnpm lint`, `pnpm build` for the `tsc -b` gate) on pull requests and pushes to `main`, pinned to Node 25 and pnpm 10 — both workspaces MUST type-check (constitution lint/type gate)
- [X] T091 [P] Add `.github/workflows/deploy-api.yml` deploying to Railway on pushes to `main` touching `api/**`, gated on `api-quality` with a `concurrency` group
- [X] T092 [P] Add `.github/workflows/deploy-web.yml` deploying to Vercel (`pull` → `build --prod` → `deploy --prebuilt --prod`) on pushes to `main` touching `web/**`, gated on `web-quality`
- [X] T093 Write the root `README.md` covering the architecture, the layering rule, how to run and test, and the four repository secrets the deploy workflows require
- [X] T094 Disable Vercel's and Railway's native Git auto-deploy in the provider dashboards so GitHub Actions is the only deploy path
- [X] T095 Walk through every verification scenario in `specs/001-elevator-simulator/quickstart.md` against the running application and correct any drift
- [X] T096 Confirm no file under `api/src/elevator/domain/` imports NestJS, React, an HTTP type or a timer, and that no `any` appears in domain or application code (Principles I and VI)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies. T001 blocks all `web/` work.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks every user story.**
- **User Stories (Phases 3–7)**: All depend on Foundational.
  - US1 (P1) is the MVP and should be completed first.
  - US2 and US3 depend only on Foundational and may run in parallel with each other once US1 has
    settled the ride flow.
  - US4 refines the strategy US1 stubbed at T039, so it follows US1.
  - US5 depends only on Foundational for its time controls, but its display tasks are most useful
    once US2–US4 give it something to show.
- **Polish (Phase 8)**: T086 and T087 need all domain rules present, so they follow US1–US4. The
  CI/CD tasks T090–T092 depend only on the test suites existing and can start any time after US1.
  T093 (README) must precede T094, which records nothing but provider settings.

### Within each user story

- Tests before implementation. Constitution Principle III requires the invariant test to exist and
  fail before the rule is written.
- Value objects → entities → aggregate → endpoints → interface.
- Complete the story before moving to the next priority.

### Parallel opportunities

- **Phase 1**: T002–T005 all run in parallel after T001.
- **Phase 2**: T006, T007, T008 in parallel; then T012, T013 in parallel; T017–T019, T022, T023 in
  parallel; T028, T029 in parallel.
- **Every story's test tasks** are parallel with each other (different files).
- **Backend and frontend** tasks within a story are parallel: T045/T046 with T044; T066 with T065;
  T084 with T083.
- **Phase 8**: T087–T092 all in parallel. T093 and T094 are sequential and touch no shared code.

---

## Parallel Example: User Story 2

```bash
# All five direction-rule test files are independent — write them together:
Task: "Hall request direction matching in api/src/elevator/domain/requests/hall-request.spec.ts"
Task: "Passed-over request served on later run in api/src/elevator/domain/building.direction-rule.spec.ts"
Task: "No mid-run reversal; idle accepts either direction in api/src/elevator/domain/building.direction-rule.spec.ts"
Task: "Repositioning pickups in api/src/elevator/domain/building.repositioning.spec.ts"
Task: "Destinations ignore the direction rule in api/src/elevator/domain/requests/car-call.spec.ts"
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 Setup — T001 is blocking and takes a minute.
2. Phase 2 Foundational — the largest phase; nothing renders until it is done.
3. Phase 3 US1 — a working ride.
4. **Stop and validate** against the US1 independent test.

### Incremental delivery

1. Setup + Foundational → three cars tick on screen.
2. + US1 → a complete ride. **MVP.**
3. + US2 → the direction rule, the behaviour the exercise is really about.
4. + US3 → door safety.
5. + US4 → genuine multi-car dispatch.
6. + US5 → full visibility and time controls.
7. + Polish → the invariant harness and the deployment pipeline.

### Suggested review order for an interviewer

`hall-request.ts` and `car-call.ts` (where polymorphism removes the branching), then
`elevator.ts` `tick()` (where the ordering makes the invariants structural), then
`invariants.spec.ts` (where all of it is proven).

---

## Notes

- `[P]` means a different file and no dependency on incomplete work.
- The constitution's gates are the definition of done: `pnpm test` and `pnpm lint` green in `api/`,
  `pnpm lint` and `pnpm build` green in `web/`, and no domain file importing a framework.
- Commit after each task or logical group.
- T086 is the single highest-value test in the suite — if it is green, the core rules hold.
