# Implementation Plan: Elevator Simulator

**Branch**: `001-elevator-simulator` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-elevator-simulator/spec.md`

## Summary

Simulate a 10-floor building with 3 elevators, where the direction-matching rule, door safety and
sticky dispatch are enforced by a framework-free domain core on the backend, and a React interface
renders a snapshot of that core without deciding anything itself.

The shape of the solution: one in-memory `Building` aggregate advanced by an explicit `tick()`;
a `SimulationRunner` that owns real time behind an injected `ClockPort`; commands in over REST and
full state snapshots out over Server-Sent Events. Polymorphism is used in the two places it removes
branching — a `HallRequest` / `CarCall` hierarchy that owns every stopping decision, and a
`DispatchStrategy` port with a real second implementation — and deliberately avoided elsewhere.

## Technical Context

**Language/Version**: TypeScript 6.0 on Node 25 — `api` (`strict: true`) and `web` (strict enabled by task T001)
**Primary Dependencies**: NestJS 12 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`), `rxjs` 7 (already present — carries the SSE stream); React 19 + Vite 8. **No new runtime dependency is introduced.**
**Storage**: None. In-memory aggregate only; the spec assumes no persistence
**Testing**: Vitest 4 (`api/vitest.config.ts` unit, `api/vitest.config.e2e.ts` e2e), supertest
**Target Platform**: Local development — NestJS on **`:8080`**, Vite dev server on `:5173`. Deployment: `web/` on Vercel, `api/` on a long-running Node host (see Deployment)
**Project Type**: Web application (existing `api/` + `web/` workspaces)
**Performance Goals**: One tick per second at 1×, adjustable 0.5×–4×; state visible in the browser within 1 s of the tick that caused it (SC-011)
**Constraints**: Domain free of NestJS/React/HTTP/clock imports; every duration counted in ticks, never milliseconds (SC-014); dispatch deterministic (FR-043); the API port comes from `PORT` with a default of `8080`, and the browser's API base URL from `VITE_API_BASE_URL` — neither is hard-coded, because deployment changes both
**Scale/Scope**: Fixed at 3 elevators × 10 floors; single shared simulation; ~5 domain entities, ~10 endpoints, ~6 React components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Initial | Post-Design |
|---|-----------|------|---------|-------------|
| I | Clean Architecture | No NestJS / React / HTTP / ORM / clock type reachable from `domain/`; frontend reimplements no rule | PASS | **PASS** — layering fixed in Project Structure; `ClockPort` inverts the only time dependency; browser renders `BuildingSnapshot` and derives nothing |
| II | Object-Oriented Design | Domain objects own their state and invariants; polymorphism only where it replaces type-branching; no inheritance for reuse | PASS | **PASS** — `Doors` and `Elevator` keep private state behind intention-revealing methods; `ElevatorRequest` hierarchy replaces `if (kind === 'hall')`; `DispatchStrategy` has a genuine second implementation |
| III | Correctness First | All five named invariants enforced in the domain; illegal transitions throw typed errors | PASS | **PASS** — I1–I5 assigned to owning objects in data-model.md; `Elevator.tick()` ordering makes I2/I4/I5 structural; domain error hierarchy per research R8 |
| IV | Testability | Domain unit-testable with no framework, network or real time | PASS | **PASS** — `tick()` is pure of time; `ClockPort` injected; no `Date.now`/`setTimeout` below `infrastructure/` |
| V | Simplicity | No unrequested infrastructure; a port needs a second impl, a dependency-direction reason, or test substitution | PASS | **PASS** — no database, broker, cache or container; SSE adds no dependency; both ports justified (see below) |
| VI | Maintainability | Strict TS both sides, no `any` in domain/application, illegal states excluded by types, each rule in one place | **FAIL → resolved** | **PASS after setup task** — `web/tsconfig.app.json` ships without `strict`; enabling it is a blocking setup task (research R11) |

### Gate notes

**Principle VI finding (must fix before feature code).** `api/tsconfig.json` sets `"strict": true`,
but the Vite scaffold's `web/tsconfig.app.json` does not. `"strict": true` and
`"noUncheckedIndexedAccess": true` must be added there first. This is the only constitution
violation found, and it is a configuration fix, not a design compromise.

**Port justifications under Principle V** (a port needs a stated reason to exist):

| Port | Reason it is allowed |
|------|----------------------|
| `ClockPort` | Required by Principle IV — the only way the domain and runner stay testable without real time |
| `DispatchStrategy` | Has a real second implementation (`FixedOrderStrategy`), used as the control case for the SC-007 distribution tests |

No other interface is introduced. There is no repository, no unit-of-work, no event bus, no
mapper layer — the aggregate produces its own read model.

**Deliberate non-abstractions**, recorded so they read as decisions rather than omissions:
motion state is a discriminated union rather than a State-pattern class hierarchy (research R4);
errors throw rather than return `Result` types (research R8); the frontend uses one hook rather than
a state-management library (research R9).

## Project Structure

### Documentation (this feature)

```text
specs/001-elevator-simulator/
├── plan.md              # This file
├── spec.md              # Feature specification (+ 5 recorded clarifications)
├── research.md          # Phase 0 output — 12 resolved decisions
├── data-model.md        # Phase 1 output — entities, invariants, transitions
├── quickstart.md        # Phase 1 output — run it, verify it
├── contracts/           # Phase 1 output
│   ├── README.md
│   ├── http-api.md      # commands in
│   └── state-stream.md  # snapshots out
├── checklists/
│   └── requirements.md  # spec quality checklist (all passing)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
api/src/
├── elevator/
│   ├── domain/                          # zero framework imports
│   │   ├── value-objects/
│   │   │   ├── floor-number.ts          # branded 1..10
│   │   │   ├── direction.ts             # Direction, TravelDirection
│   │   │   └── doors.ts                 # 4-phase door value object
│   │   ├── requests/
│   │   │   ├── elevator-request.ts      # abstract base
│   │   │   ├── hall-request.ts          # + direction rule
│   │   │   └── car-call.ts              # always stops
│   │   ├── dispatch/
│   │   │   ├── dispatch-strategy.ts     # port
│   │   │   └── nearest-suitable-car.strategy.ts
│   │   ├── elevator.ts                  # entity: motion, doors, own invariants
│   │   ├── building.ts                  # aggregate root + snapshot()
│   │   └── errors.ts                    # ElevatorDomainError hierarchy
│   ├── application/
│   │   ├── ports/clock.port.ts
│   │   ├── simulation.service.ts        # use cases over the aggregate
│   │   └── simulation-runner.ts         # run/pause/step/speed
│   ├── infrastructure/
│   │   └── interval-clock.adapter.ts    # the only setInterval in the codebase
│   ├── presentation/
│   │   ├── simulation.controller.ts     # REST commands + GET /state
│   │   ├── simulation-stream.controller.ts  # @Sse()
│   │   ├── dto/                         # request DTOs
│   │   └── domain-error.filter.ts       # domain error -> HTTP
│   └── elevator.module.ts
├── app.module.ts
└── main.ts                              # listens on process.env.PORT ?? 8080

api/test/
└── simulation.e2e-spec.ts

web/src/
├── api/simulation-client.ts             # fetch wrappers
├── hooks/useSimulationState.ts          # owns the SSE subscription
├── types/snapshot.ts                    # mirrors BuildingSnapshot
├── components/
│   ├── BuildingView.tsx
│   ├── ElevatorCar.tsx                  # floor, direction, doors, destinations
│   ├── FloorPanel.tsx                   # up/down call buttons
│   ├── DoorControls.tsx                 # hold / close / destination
│   ├── PendingRequests.tsx
│   └── SimulationControls.tsx           # pause / step / speed / reset
└── App.tsx
```

**Structure Decision**: Web application using the two workspaces that already exist — `api/`
(NestJS) and `web/` (Vite + React). Within `api/src/elevator/` the four constitution layers are
directories, so a violation of Principle I is visible as an import crossing inward — the check is a
glance at an import line, not an architectural review. The existing `app.controller.ts` /
`app.service.ts` scaffold files are removed once `ElevatorModule` is wired.

## Deployment

**Decided: Path A.** Frontend on **Vercel**, backend on **Railway**, both deployed by **GitHub
Actions** from `github.com/TrTueTah/elevator-simulator`. Reasoning in [research R13](./research.md).

Nothing here changes the domain, the tests, or the local workflow. The pipeline is built after the
feature works locally.

### Topology

| Piece | Host | Build | Runtime |
|-------|------|-------|---------|
| `web/` | Vercel | `pnpm build` → static `dist/` | Vercel CDN |
| `api/` | Railway | `pnpm build` → `dist/` | `node dist/main`, long-running Node process |

Railway is a long-running container, so the in-memory `Building`, the interval clock and the SSE
stream all work exactly as designed — no `CatchUpClock`, no key-value store, no polling fallback.

### Configuration

Nothing about an environment is compiled in. Three values move between deployments:

| Value | Where | Notes |
|-------|-------|-------|
| `PORT` | Railway (injected) | `main.ts` reads `process.env.PORT ?? 8080`; Railway supplies its own |
| `VITE_API_BASE_URL` | Vercel project env | **Baked at build time** — the browser bundle hard-codes whatever value the build saw. Changing it requires a rebuild, not a restart |
| `WEB_ORIGIN` | Railway service env | CORS allowlist for the API |

**CORS needs a pattern, not a string.** Vercel gives every preview deployment its own hostname, so
the API allows the production origin exactly plus preview hostnames by pattern
(`https://elevator-simulator-*.vercel.app`). A single fixed origin would let production work and
silently break every preview.

**Health check**: add `GET /api/health` returning `200`. Railway uses it to decide a deploy is live,
and without it a broken build can be promoted.

### Pipeline

Three workflow files under `.github/workflows/`, created during implementation:

| File | Trigger | Jobs |
|------|---------|------|
| `ci.yml` | pull requests, and pushes to `main` | `api-quality`: `pnpm lint`, `pnpm test`, `pnpm test:e2e`. `web-quality`: `pnpm lint`, `pnpm build` (which runs `tsc -b`, so it is the type-check gate) |
| `deploy-api.yml` | push to `main` touching `api/**` | `railway up --service api --detach` |
| `deploy-web.yml` | push to `main` touching `web/**` | `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` |

Rules the pipeline enforces:

- **Deploy jobs `needs:` the matching quality job.** Nothing reaches an environment without lint,
  type-check and tests passing first — this is the constitution's test and lint gates made
  mechanical rather than remembered.
- **Path filters on both deploy workflows**, so a frontend change does not redeploy the API and
  vice versa.
- **`concurrency` group per workflow with `cancel-in-progress`**, so rapid pushes cannot race two
  deploys into the same environment.
- Setup is `pnpm/action-setup` + `actions/setup-node` with `cache: pnpm`, pinned to Node 25 and
  pnpm 10 to match local development.

**Turn off the providers' own Git integrations.** Both Vercel and Railway auto-deploy from a
connected GitHub repo by default. Left on alongside these workflows, every push deploys twice — once
ungated by the tests. Deploying through Actions means Actions must be the only path.

### First deploy has an ordering dependency

`VITE_API_BASE_URL` is baked into the frontend bundle at build time, which makes the first run a
three-step sequence rather than two parallel deploys:

1. Deploy the API to Railway and take its generated public URL.
2. Set `VITE_API_BASE_URL` to that URL in the Vercel project's environment variables, then deploy
   the frontend. (`vercel pull` fetches project env vars, so the Action picks it up automatically.)
3. Set `WEB_ORIGIN` on the Railway service to the Vercel production domain and redeploy the API.

After that first pass the two sides deploy independently.

### Repository secrets required

| Secret | Used by | Source |
|--------|---------|--------|
| `VERCEL_TOKEN` | `deploy-web.yml` | Vercel account settings → Tokens |
| `VERCEL_ORG_ID` | `deploy-web.yml` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `deploy-web.yml` | same file |
| `RAILWAY_TOKEN` | `deploy-api.yml` | Railway project token |

### Alternative considered and rejected

*Everything on Vercel*, with a `CatchUpClock` adapter and a KV snapshot store replacing the interval
and SSE. Rejected: it adds a persistence dependency the spec excludes, and it changes observable
behaviour — the simulation would only advance while someone was watching it, freezing whenever
nobody was connected. Railway costs nothing architecturally and avoids both problems.

*Vercel's and Railway's native Git integrations* instead of Actions. Simpler to set up, but they
deploy on push without running the test suite, so a red build can reach production. The user asked
for Actions, and the gating is the reason it is the better answer anyway.

### Deferred until deployment is undertaken

Custom domain, whether preview deployments get their own API environment or share the production
one, and log/metric retention. None of these block implementation.

## Complexity Tracking

> No constitution violations require justification.

The one finding (`web` missing `strict`) is a configuration fix scheduled as a blocking setup task,
not an accepted violation. Both introduced ports have a stated reason under Principle V and are
recorded in the Gate notes above rather than here, because neither is an exception to the rule —
each meets the bar the constitution sets.
