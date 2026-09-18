# Quickstart: Elevator Simulator

**Feature**: 001-elevator-simulator | **Plan**: [plan.md](./plan.md)

## Prerequisites

Node 25 and pnpm 10 (both already present in this environment). No database, no broker, no
container — the simulation lives in memory (research R1).

## Run it

Two terminals from the repository root:

```bash
# Terminal 1 — simulation backend on :8080
cd api && pnpm install && pnpm start:dev

# Terminal 2 — interface on :5173
cd web && pnpm install && pnpm dev
```

The API listens on `process.env.PORT ?? 8080`. The browser finds it through `VITE_API_BASE_URL`,
which defaults to `http://localhost:8080`; set it in `web/.env.local` to point somewhere else.
Neither value is hard-coded, because deployment changes both.

Open `http://localhost:5173`. Three elevators sit idle at Floor 1 and the simulation is running at
1×; one step per second.

## Verify the behaviour that matters

The four checks below map to the invariants the exercise is judged on.

**1. A basic ride (US1)**
Press **up** on Floor 3. Watch a car travel 1 → 3, stop, and open its doors. Select **8** as the
destination. The doors close, the car travels to 8, and opens again.

**2. The direction rule (US2)** — the one worth pausing for

A caveat first, because it trips people up: with three cars and light traffic the dispatcher sends a
*different* car to each call, so no single car ever demonstrates the rule. That is correct
behaviour, not a bug. To see the rule you need a car that owns calls in both directions, which means
putting the building under load.

**Pause first**, then press these eight buttons:

| ▲ | 2, 4, 6, 8 |
|---|---|
| ▼ | 9, 7, 5, 3 |

Each car now owns two or three calls — check the "Assigned calls" line on each car. Now **step**
repeatedly and watch a car climb past a floor where it owns a ▼ call: it does not stop, the call
stays in the Waiting list, and it is collected on the way back down.

With the exact sequence above you will see it at **step 3** (car B leaves Floor 3 going up, passing
its own down call) and again at **step 10** (car A does the same at Floor 5).

At 1× each of these moments passes in about a second, which is why stepping is the way to watch it.

**3. The door invariant (US3)**
With a car stopped and a destination pending, press **hold**. Step the simulation ten times: the
doors stay open and the car does not move a single floor. Press **close now** and travel resumes.

**4. Dispatch across three cars (US4)**
Let the cars scatter, then press call buttons on Floors 2, 6 and 9 in quick succession. The
assignments spread across more than one car, and each goes to a plausibly placed one.

## Run the tests

```bash
cd api
pnpm test            # unit: domain + application, no NestJS, no HTTP, no real timers
pnpm test:e2e        # controller contracts over supertest
pnpm test:cov        # coverage
pnpm lint            # oxlint

cd ../web
pnpm lint            # eslint
pnpm build           # tsc -b && vite build  (type-check gate)
```

The highest-value test is the **invariant harness** in the domain suite: a seeded 1,000-step
randomised run asserting, at every step, that no car moved with doors open, none skipped a committed
floor, none left the 1–10 range, and none was idle while holding a direction (SC-003 → SC-005).
If that suite is green, the core rules hold.

## Where things live

```text
api/src/elevator/
  domain/          the simulation. No NestJS, no HTTP, no clock, no React.
  application/     use cases + SimulationRunner (pause/step/speed) over a ClockPort
  infrastructure/  the interval clock adapter
  presentation/    controllers, SSE stream, exception filter
web/src/
  hooks/           useSimulationState — owns the SSE subscription
  components/      presentational only; decide nothing about elevators
  api/             fetch wrappers for the command endpoints
```

The rule to keep in mind while working: **if a file under `domain/` imports NestJS, React, an HTTP
type or a timer, something has gone wrong** (Constitution Principle I).

## Poking at it directly

```bash
curl -X POST localhost:8080/api/simulation/requests \
  -H 'content-type: application/json' -d '{"floor":5,"direction":"up"}'

curl -N localhost:8080/api/simulation/stream    # watch snapshots stream by

curl -X POST localhost:8080/api/simulation/pause
curl -X POST localhost:8080/api/simulation/step
```

Full endpoint list: [contracts/http-api.md](./contracts/http-api.md).

## Deploying it

`web/` goes to **Vercel** as a static Vite build; `api/` goes to **Railway**, which runs it as a
long-running process so the in-memory simulation, the interval clock and the SSE stream all work
unchanged. **GitHub Actions** is the only deploy path, and its deploy jobs run only after lint,
type-check and tests pass. Details, required secrets and the first-deploy ordering:
the plan's [Deployment section](./plan.md#deployment).
