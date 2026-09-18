# Phase 0 Research: Elevator Simulator

**Feature**: 001-elevator-simulator | **Date**: 2026-09-18
**Input**: [spec.md](./spec.md) | [constitution](../../.specify/memory/constitution.md)

This document resolves every open technical question before design begins. Each entry records
the decision, why it was chosen, and what was rejected.

---

## R1. Where the authoritative simulation lives

**Decision**: One in-memory `Building` aggregate owned by the backend, held by a single
long-lived application service. The frontend holds no simulation logic and no independent copy
of the rules — only the latest snapshot it was given.

**Rationale**: FR-045 requires a single authoritative state and constitution Principle I forbids
the frontend from reimplementing elevator rules. Keeping the aggregate in memory on the server
satisfies both while avoiding persistence infrastructure that Principle V rules out absent a
requirement (the spec explicitly assumes no persistence).

**Alternatives considered**:
- *Simulation in the browser, backend as a thin store*: rejected — pushes domain rules into the
  presentation layer, violating Principle I, and makes the core untestable without a browser.
- *Persisted state (database/Redis)*: rejected — no requirement calls for durability, and
  Principle V forbids infrastructure added in anticipation of need.

---

## R2. How the simulation advances without coupling the domain to a clock

**Decision**: The domain exposes a pure `tick(): void` on the `Building` aggregate and never reads
a clock. A `SimulationRunner` in the application layer owns run/pause/step/speed and depends on a
`ClockPort` interface. An infrastructure adapter implements `ClockPort` with a real interval timer;
tests substitute a fake that fires on demand.

**Rationale**: Constitution Principle IV forbids `Date.now()`, `setTimeout` and `setInterval` in the
domain and requires time to be injected. FR-005d additionally requires every duration — including
the door dwell — to be counted in *steps*, not milliseconds, so that changing the pace cannot change
behaviour (SC-014). Counting in ticks makes that property structural rather than a thing to remember.

**Alternatives considered**:
- *NestJS `@Interval()` decorator directly on a service that also holds rules*: rejected — binds the
  simulation loop to the framework and makes the loop untestable without an application context.
- *Real-time delta (`dt`) based movement*: rejected — produces fractional floor positions, which
  makes the "never skip a committed floor" invariant (FR-017) much harder to state and to assert.

---

## R3. How the browser stays in sync

**Decision**: Commands travel over plain REST `POST` requests. State flows back over a single
**Server-Sent Events** stream that emits a full `BuildingSnapshot` after every tick and after every
accepted command.

**Rationale**: SC-011 requires changes to be visible within one second; a push stream delivers them
immediately. NestJS provides SSE through a built-in `@Sse()` decorator returning an RxJS
`Observable`, and `rxjs` is already a dependency — so this adds **no new package**, which keeps it
inside Principle V. SSE is one-directional, which exactly matches the traffic shape here: many small
state updates out, occasional commands in over ordinary HTTP.

Full snapshots rather than deltas: the whole building is three elevators and a short request list,
so a snapshot is small, and sending it whole removes an entire class of client-side reconciliation
bugs. It also makes reconnection trivial — the next event is complete by construction.

**Alternatives considered**:
- *Polling every 500 ms*: rejected — simple, but wasteful and it makes SC-011 a matter of luck at
  the boundary. Would be the fallback if SSE proved awkward behind a proxy.
- *WebSocket (`@nestjs/websockets` + Socket.IO)*: rejected — full duplex is not needed, and it adds
  two dependencies and a second transport to explain for no behavioural gain.

---

## R4. Where polymorphism and inheritance genuinely earn their place

**Decision**: Two hierarchies, both replacing type-branching:

1. **`ElevatorRequest` (abstract) → `HallRequest` | `CarCall`** with a polymorphic
   `shouldStopFor(elevator): boolean`. `CarCall` answers "yes, if it is my floor". `HallRequest`
   additionally applies the direction rule. This is the single place FR-021, FR-022 and FR-025 live.
2. **`DispatchStrategy` (interface) → `NearestSuitableCarStrategy`** (plus a deliberately naive
   `FixedOrderStrategy` used in tests to prove the port is real).

Motion state is modelled as a **discriminated union** (`Idle | MovingUp | MovingDown | Stopped`)
with behaviour on `Elevator`, *not* as a State-pattern class hierarchy.

**Rationale**: Constitution Principle II permits polymorphism only where it replaces conditional
branching on type, and forbids inheritance used purely for reuse. The request hierarchy meets that
test exactly: without it, every stopping decision becomes `if (request.kind === 'hall')`. The
strategy interface meets Principle V's bar for introducing a port because it has a second
implementation. A State-pattern hierarchy for motion would add four classes to replace a `switch`
that is already exhaustive and type-checked, which is abstraction without a demonstrated need.

This also satisfies the exercise's explicit requirement to demonstrate encapsulation, inheritance
and polymorphism — with a defensible answer for where each was *not* used.

**Alternatives considered**:
- *State pattern for motion*: rejected as above; noted here because it is the obvious thing a
  reviewer will ask about.
- *One `Request` class with a `type` field*: rejected — reintroduces exactly the branching the
  hierarchy removes, and scatters the direction rule across call sites.

---

## R5. Dispatch: scoring and determinism

**Decision**: `NearestSuitableCarStrategy` scores each elevator for a hall request and picks the
lowest score. Score components, in order of weight: distance from the elevator's current floor to
the request floor; a penalty when the elevator would have to reverse to reach it; and the size of
the elevator's outstanding workload. Ties are broken by **ascending elevator id**.

**Rationale**: FR-041 requires the decision to read each elevator's floor, direction and workload;
FR-042 requires that a better-placed elevator actually win; FR-043 requires identical states to
produce identical assignments, which rules out anything random or wall-clock dependent. Explicit
id tie-breaking makes SC-007's distribution property testable rather than incidental. The workload
term is what stops all three cars being sent to the same busy region.

**Alternatives considered**:
- *Round-robin*: rejected — violates FR-041 outright by ignoring state. Retained as the test-only
  `FixedOrderStrategy` so the strategy port has a genuine second implementation.
- *Estimated-time-of-arrival simulation per candidate*: rejected — meaningfully more accurate, but
  requires simulating each elevator forward and is far harder to explain; Principle V prefers the
  simple scoring until a requirement demands better.

---

## R6. Why no request can starve

**Decision**: Each elevator keeps its own sticky set of assigned requests. Its next direction is
chosen by a fixed rule: **continue** in the current direction if any owned request or destination
lies ahead; otherwise **reverse** if any lies behind; otherwise **go idle in place**.

**Rationale**: This is the standard elevator sweep, and it is what makes FR-014 and SC-008
provable rather than hoped for. Because assignment is sticky (clarification Q1), a request's owner
never changes, and because the owner always reverses once it runs out of work ahead, every owned
request is reached within at most one full sweep of the shaft. The worst case is bounded: 9 floors
up, 9 floors down, plus dwell time at intervening stops — comfortably inside SC-008's 60-step budget
at the modelled traffic levels.

**Alternatives considered**:
- *Global re-evaluation of assignments each tick*: rejected at clarification time (Q1) — better
  average waits, but the starvation argument becomes much harder to make and the displayed
  assignment would churn.

---

## R7. Door model

**Decision**: A `Doors` value object owns the four states (`Closed`, `Opening`, `Open`, `Closing`),
a `holdRequested` flag and a `dwellRemaining` counter measured in ticks. `Opening` and `Closing`
each last one tick. `Elevator.tick()` asks `Doors` to advance before considering movement, and
movement is guarded by a single `doors.areClosed()` check.

**Rationale**: FR-033's invariant — never move unless fully closed — is enforced at exactly one
place, satisfying Principle III ("invariant checks live inside the object that owns the invariant")
and Principle VI ("business rules exist in exactly one place"). Modelling `Opening`/`Closing` as
real states rather than instant transitions is what makes FR-034 and the "doors in transition"
language of the constitution meaningful. Counting dwell in ticks rather than milliseconds is what
delivers SC-014.

`closeNow` clears the hold and sets state to `Closing`; `hold` is ignored while `Closing` has
already begun, which gives FR-040 its "single well-defined state" guarantee.

**Alternatives considered**:
- *Boolean `isOpen`*: rejected — cannot express "in transition", so FR-034 becomes unstatable.

---

## R8. Error handling across the layers

**Decision**: A small domain error hierarchy rooted at `ElevatorDomainError`
(`DoorsNotClosedError`, `FloorOutOfRangeError`, `InvalidDestinationError`,
`DoorsNotOpenError`, …). The application layer lets them propagate. A single NestJS exception
filter in the presentation layer maps `ElevatorDomainError` to HTTP 409/400 with a stable
`{ code, message }` body. The domain never imports an HTTP type.

**Rationale**: Constitution Principle VI mandates consistent error handling with translation at the
boundary only, and Principle III requires illegal transitions to fail loudly rather than be coerced.
FR-053 and FR-054 require the state to be unchanged and the reason to be reported — throwing before
any mutation gives both for free.

**Alternatives considered**:
- *Result/Either return types*: rejected — defensible, but noisier at every call site in TypeScript
  and inconsistent with NestJS's exception-filter idiom at the edge.

---

## R9. Frontend state management

**Decision**: One `useSimulationState` hook owning the SSE subscription and holding the latest
snapshot in `useState`. Components are presentational and receive the snapshot by props. Commands
are thin `fetch` calls in an `api/` module. No state-management library.

**Rationale**: The client holds exactly one piece of server-owned state, so a store would be
ceremony around a single value — precisely the unnecessary abstraction Principle V prohibits. It
also keeps Principle I's rule visible: nothing in `web/` decides anything about elevators.

**Alternatives considered**:
- *Redux Toolkit / Zustand*: rejected — no client-owned state to manage.
- *TanStack Query*: rejected — built for request/response caching, not a push stream.

---

## R10. Testing strategy

**Decision**: Three tiers.
- **Domain unit tests** (`api/src/**/domain/**/*.spec.ts`) — no NestJS, no HTTP, no timers.
  Includes an invariant harness that drives a randomised 1,000-step run and asserts SC-003 through
  SC-005 hold at every step.
- **Application tests** — use cases and `SimulationRunner` against a fake clock.
- **E2E tests** (`api/test/*.e2e-spec.ts`, existing `vitest.config.e2e.ts`) — controller contracts
  over supertest, including the SSE stream shape.

**Rationale**: Principle IV requires the core to be testable without framework, network or real
time. The randomised invariant harness is what turns SC-003/004/005 from prose into a gate, and is
the single highest-value test in the suite for an exercise judged on correctness.

**Alternatives considered**:
- *Only e2e tests*: rejected — slow, and cannot isolate the direction rule.
- *Property-based testing library (fast-check)*: attractive for the invariant harness, but adds a
  dependency; a seeded pseudo-random loop in plain Vitest gives most of the value. Revisit only if
  the hand-rolled harness proves weak.

---

## R11. TypeScript strictness gap (must fix)

**Finding**: `api/tsconfig.json` sets `"strict": true`, but **`web/tsconfig.app.json` does not**.
Constitution Principle VI requires strict mode in both projects.

**Decision**: Add `"strict": true` (and `"noUncheckedIndexedAccess": true`) to
`web/tsconfig.app.json` as a setup task before any feature code is written.

**Note**: `api/tsconfig.json` also sets `"strictPropertyInitialization": false`, which the NestJS
schematic ships by default. Domain entities are constructed through constructors with all fields
assigned, so this does not weaken the domain; it is left as-is rather than fought with the
framework default, and is recorded here so the choice is deliberate rather than unnoticed.

---

## R12. Simulation pace model

**Decision**: `SimulationRunner` holds an interval in milliseconds. Pace is exposed as a small set
of named speeds (0.5×, 1×, 2×, 4× relative to a 1000 ms default step). Pause stops the interval;
`step()` invokes one tick directly and is accepted only while paused.

**Rationale**: FR-005a–d and SC-013/SC-014. A fixed set of speeds rather than a free-form number
keeps the control simple and the test matrix finite, and since no domain duration is expressed in
milliseconds, every speed provably yields the same state sequence.

---

## R13. Deployment target (Vercel) and what it costs

**Finding**: Vercel runs functions, not long-lived processes. Three things in this design do not
survive that model unchanged:

| Design element | Why it breaks on a Vercel function |
|----------------|-------------------------------------|
| In-memory `Building` singleton (R1) | Instances are ephemeral and may scale to zero; two requests can land on different instances, so state is lost or forked |
| `setInterval` tick adapter (R2) | Nothing runs between requests; the simulation would only advance while a request happened to be in flight |
| Long-lived SSE stream (R3) | Function duration is capped, so the stream is cut and must be re-established |

**Decision**: Split the deployment, with **GitHub Actions as the only deploy path**.

- **`web/` on Vercel** — a Vite static build is exactly what Vercel is for. No friction.
- **`api/` on Railway** — a long-running container, so the in-memory aggregate, the interval clock
  and the SSE stream all work precisely as designed.
- **CI/CD via GitHub Actions** on `github.com/TrTueTah/elevator-simulator`, with deploy jobs gated
  behind lint, type-check and tests, and the providers' own Git auto-deploy switched off so nothing
  reaches an environment ungated.

**Rationale**: The default split costs nothing and keeps the architecture the exercise is judged on
intact. Forcing the API onto functions would import a key-value store — infrastructure the spec
never asked for and that Principle V forbids adding in anticipation — and would trade a
continuously-running simulation for one that advances only when someone is looking.

**What the architecture already earns here**: because the domain never reads a clock and time
arrives through `ClockPort` (Principle IV), moving to a serverless model is an *infrastructure*
change. `Building`, `Elevator`, `Doors` and the request hierarchy are untouched either way — only
the adapter behind the port and the transport change. That is the layering paying for itself.

**Alternatives considered**:
- *Everything on Vercel with a KV snapshot store*: viable, but it adds a dependency and a
  persistence story the spec excludes, and the simulation would advance only while someone was
  watching it. Rejected.
- *The providers' native Git integrations instead of Actions*: less setup, but they deploy on push
  without running the suite, so a red build can reach production. Rejected.

---

## Resolved unknowns summary

| # | Question | Resolution |
|---|----------|------------|
| R1 | Where state lives | Server-side in-memory `Building` aggregate |
| R2 | Tick source | `ClockPort` injected; interval adapter in infrastructure |
| R3 | Client sync | REST commands + SSE full snapshots (no new dependency) |
| R4 | OOP demonstration | Request hierarchy + dispatch strategy; union for motion |
| R5 | Dispatch scoring | Distance + reversal penalty + workload; id tie-break |
| R6 | Starvation | Sticky assignment + sweep reversal rule |
| R7 | Doors | 4-state value object, dwell counted in ticks |
| R8 | Errors | Domain error hierarchy, mapped by one exception filter |
| R9 | Frontend state | Single hook, no library |
| R10 | Testing | Domain unit + application + e2e, plus invariant harness |
| R11 | Strictness | **Gap found**: enable `strict` in `web/tsconfig.app.json` |
| R12 | Pace | Named speed multipliers over a 1000 ms base step |
| R13 | Deployment | `web/` → Vercel, `api/` → Railway, deployed only by GitHub Actions behind the test gate |

**No NEEDS CLARIFICATION items remain.**
