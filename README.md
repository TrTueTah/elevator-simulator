# Elevator Simulator

A 10-floor office building with 3 elevators running in parallel. The simulation core is a
framework-free TypeScript domain on the backend; the React interface renders a snapshot of it and
decides nothing on its own.

## Run it

```bash
# Terminal 1 — simulation backend on :8080
cd api && pnpm install && pnpm start:dev

# Terminal 2 — interface on :5173
cd web && pnpm install && pnpm dev
```

Open <http://localhost:5173>. Three cars sit idle at Floor 1, stepping once per second.

Configuration: the API reads `PORT` (default `8080`); the browser reads `VITE_API_BASE_URL`
(default `http://localhost:8080`) — see `web/.env.example`. The API's CORS allowlist comes from
`WEB_ORIGIN`.

## The four behaviours worth checking

1. **A ride** — press ▲ on Floor 3, watch a car arrive and open, pick Floor 8, watch it deliver.
2. **The direction rule** — send a car from 1 to 10, then press ▲ on 5 and ▼ on 7 mid-flight. It
   stops at 5 and passes 7; the Floor 7 call waits for a downward run. Use **pause** and **step** to
   watch this frame by frame.
3. **Door safety** — press **hold** with a destination pending and step ten times. The doors stay
   open and the car does not move a single floor.
4. **Dispatch** — call from several floors at once and watch the work spread across all three cars.

## Architecture

```text
api/src/elevator/
  domain/          the simulation. No NestJS, no HTTP, no React, no clock.
  application/     use cases + SimulationRunner (pause/step/speed) over a ClockPort
  infrastructure/  the interval clock adapter — the only setInterval in the codebase
  presentation/    controllers, the SSE stream, the domain-error filter
web/src/
  hooks/           useSimulationState — owns the SSE subscription
  components/      presentational only
  api/             fetch wrappers for the command endpoints
```

**The rule to keep in mind:** if a file under `domain/` imports NestJS, React, an HTTP type or a
timer, something has gone wrong. A lint rule in `api/oxlint.json` enforces it.

Commands travel in over REST; state comes back over a single Server-Sent Events stream carrying a
complete snapshot. One path for state means nothing to reconcile.

### Where the OOP requirement is satisfied

- **`ElevatorRequest` (abstract) → `HallRequest` | `CarCall`**, with a polymorphic
  `shouldStopFor(car)`. `CarCall` says "yes, if it's my floor"; `HallRequest` also applies the
  direction rule. Every stopping decision in the system goes through this one method, so the rule
  exists in exactly one place instead of as an `if (kind === 'hall')` scattered through the code.
- **`DispatchStrategy`** with two real implementations — `NearestSuitableCarStrategy` in production
  and `FixedOrderStrategy` as the control case in the distribution tests.
- **Motion state is a discriminated union, not a State-pattern hierarchy.** Four classes to replace
  an already-exhaustive `switch` would be abstraction without a need.

### Why the invariants hold

`Elevator.tick()` runs in a fixed order: settle the doors → return early unless they are fully
closed → ask "must I stop here?" → decide direction → move one floor. Because movement is gated on
the door check, and the stop check happens *at* a floor rather than after leaving it, "never move
with the doors open" and "never skip a committed floor" are structural rather than something a
later edit has to remember.

The **turnaround stop** is the subtle part: when a car reverses, it adopts the new direction and
asks again before moving. That is how a car at the top of its run collects the people waiting to go
down — and without it, a car owning an up-call below and a down-call above shuttles between them
forever, serving neither.

## Tests

```bash
cd api
pnpm test        # 96 unit tests — domain + application, no NestJS, no HTTP, no real timers
pnpm test:e2e    # 16 e2e tests over HTTP, including the SSE stream
pnpm lint
pnpm build       # type gate

cd ../web
pnpm lint
pnpm build       # tsc -b && vite build
```

The highest-value test is `api/src/elevator/domain/invariants.spec.ts`: a seeded 1,000-step
randomised run asserting at *every* step that no car moved with its doors open, none skipped a
floor it had committed to, none left the 1–10 range, and none was idle while holding a direction.
If that is green, the core rules hold.

Suggested reading order: `requests/hall-request.ts` (where polymorphism removes the branching), then
`elevator.ts` `tick()` (where the ordering makes the invariants structural), then
`invariants.spec.ts` (where all of it is proven).

## Deployment

`web/` → **Vercel** (static Vite build). `api/` → **Railway** (long-running Node process, so the
in-memory simulation, the interval clock and the SSE stream all work unchanged).

**GitHub Actions is the only deploy path**, and every deploy job runs behind lint, type-check and
the full test suite:

| Workflow | Trigger |
|----------|---------|
| `ci.yml` | pull requests and pushes to `main` |
| `deploy-api.yml` | pushes to `main` touching `api/**` → Railway |
| `deploy-web.yml` | pushes to `main` touching `web/**` → Vercel |

### Required repository secrets

| Secret | Used by | Where to get it |
|--------|---------|-----------------|
| `RAILWAY_TOKEN` | `deploy-api.yml` | Railway project settings → Tokens |
| `VERCEL_TOKEN` | `deploy-web.yml` | Vercel account settings → Tokens |
| `VERCEL_ORG_ID` | `deploy-web.yml` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `deploy-web.yml` | the same file |

### Two things to get right when setting this up

**Turn off Vercel's and Railway's own Git integrations.** Both auto-deploy from a connected repo by
default. Left on alongside these workflows, every push deploys twice — and the providers' copy
skips the tests entirely.

**`VITE_API_BASE_URL` is baked in at build time.** The first deploy is therefore a sequence, not two
parallel steps: deploy the API, take its Railway URL, set it in the Vercel project's environment
variables and deploy the frontend, then set `WEB_ORIGIN` on Railway to the Vercel domain. After
that the two sides deploy independently. CORS allows the production origin plus Vercel's
per-deployment preview hostnames by pattern.

## Specification

Requirements, clarifications, design decisions and the task breakdown live in
[`specs/001-elevator-simulator/`](specs/001-elevator-simulator/). The binding project principles are
in [`.specify/memory/constitution.md`](.specify/memory/constitution.md).
