<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0
Bump rationale: MINOR-to-initial — first concrete ratification of the constitution;
all placeholder tokens replaced with project-specific principles and constraints.

Modified principles (template placeholder → concrete):
- [PRINCIPLE_1_NAME] → I. Clean Architecture
- [PRINCIPLE_2_NAME] → II. Object-Oriented Domain Design
- [PRINCIPLE_3_NAME] → III. Correctness First (NON-NEGOTIABLE)
- [PRINCIPLE_4_NAME] → IV. Testability
- [PRINCIPLE_5_NAME] → V. Simplicity
- (new) → VI. Maintainability

Added sections:
- Technology Constraints (was [SECTION_2_NAME])
- Development Workflow & Quality Gates (was [SECTION_3_NAME])

Removed sections: none

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — "Constitution Check" gate is
  constitution-driven ("[Gates determined based on constitution file]"); no edit needed,
  gates now resolve against the six principles below.
- ✅ .specify/templates/spec-template.md — no constitution-mandated sections added or
  removed; template remains aligned.
- ✅ .specify/templates/tasks-template.md — task categories (Setup, Foundational,
  per-story, Polish) already accommodate domain-first ordering and unit-test tasks
  required by Principles III and IV; no edit needed.
- ✅ CLAUDE.md — generic, agent-neutral pointer to the current plan; no outdated
  principle references.
- ⚠ README.md (repository root) — does not exist; create if project-level docs are added
  and reference these principles there.

Follow-up TODOs: none
-->

# Elevator Simulator Constitution

## Core Principles

### I. Clean Architecture

Domain logic MUST NOT depend on frameworks, transport, or UI. Dependencies MUST point
inward: presentation → application → domain, and infrastructure → domain via interfaces
owned by the domain or application layer.

- The domain layer MUST contain no NestJS decorators, HTTP types, React types, ORM
  types, or timer/clock calls.
- The application layer orchestrates use cases over domain objects and exposes ports
  (interfaces); infrastructure supplies adapters for those ports.
- The presentation layer (NestJS controllers/gateways, React components) MUST only
  translate between external formats and application-layer inputs/outputs. It MUST NOT
  contain elevator rules.
- Frontend state MUST be a projection of backend-provided state; the frontend MUST NOT
  reimplement scheduling, movement, or door rules.

**Rationale**: Isolating the simulation core is what makes it testable, replaceable at
the edges, and explainable independently of the delivery mechanism.

### II. Object-Oriented Domain Design

Domain concepts MUST be modeled as objects that own their behavior and invariants, not
as anemic data bags manipulated by external procedures.

- Entities such as `Elevator`, `Floor`, `Request`, and value objects such as
  `Direction`, `DoorState`, `FloorNumber` MUST encapsulate their own state transitions.
- Mutable state MUST be private; changes happen only through intention-revealing methods
  (e.g. `openDoors()`, `stepTo(floor)`), never by external field assignment.
- Inheritance and polymorphism MUST be used only where they replace conditional
  branching on type (e.g. a `SchedulingStrategy` interface with concrete strategies).
  Inheritance for code reuse alone is prohibited; prefer composition.
- Invariant checks MUST live inside the object that owns the invariant.

**Rationale**: Behavior placed next to the state it governs prevents rule duplication and
makes invalid states unreachable by construction rather than by convention.

### III. Correctness First (NON-NEGOTIABLE)

The simulation MUST behave exactly as the defined requirements specify, and invalid
elevator states MUST be unrepresentable or rejected.

- The following MUST hold at all times and MUST be enforced in the domain layer:
  - An elevator MUST NOT move while its doors are open or in transition.
  - An elevator MUST NOT skip a floor it has committed to serving in its current
    direction of travel.
  - An elevator MUST NOT be positioned outside the configured floor range.
  - Direction MUST be consistent with the elevator's outstanding requests; an idle
    elevator MUST have no direction of travel.
  - Duplicate requests for the same floor and direction MUST be idempotent, never queued
    twice.
- Illegal transitions MUST fail loudly with a typed domain error, never be silently
  ignored or coerced into a "closest valid" state.
- State MUST advance only through explicit, discrete ticks; no partial or interpolated
  domain state.
- Every invariant listed above MUST have at least one test that asserts the violation is
  rejected.

**Rationale**: A simulator whose core rules can drift is worthless as a model; defects
here are invisible in the UI until they are catastrophic.

### IV. Testability

Core elevator logic MUST be unit-testable with no framework, network, browser, or
real-time dependency.

- Domain and application tests MUST run without a NestJS application context, without
  HTTP, and without React.
- Time MUST be injected. The domain MUST NOT call `Date.now()`, `setTimeout`,
  `setInterval`, or any ambient clock; simulation advances via an explicit `tick` or an
  injected clock/scheduler port.
- Randomness, if used, MUST be injected behind a port so tests can be deterministic.
- Every domain rule in Principle III MUST be covered by a test that can fail.
- Tests MUST assert on observable domain behavior, not on private internals.

**Rationale**: If the core needs a running server or a real clock to test, correctness
becomes unverifiable and slow to check, and Principle III cannot be upheld.

### V. Simplicity

The simplest design that satisfies the requirements MUST be chosen; abstraction is
introduced in response to a demonstrated need, not in anticipation of one.

- Persistent storage, message brokers, caches, containers, and background job systems
  MUST NOT be added unless a stated requirement demands them; in-memory state is the
  default.
- An interface/port MUST NOT be introduced unless it has a second implementation, is
  needed to break a dependency direction required by Principle I, or is needed for test
  substitution under Principle IV.
- Generic frameworks, plugin systems, and configuration-driven indirection are prohibited
  absent an explicit requirement.
- The architecture MUST be explainable end-to-end — layers, main domain objects, and the
  path of a single request — in a few minutes without reading code.

**Rationale**: Unjustified infrastructure obscures the elevator rules, which are the
actual substance of this project.

### VI. Maintainability

Code MUST be readable and changeable by someone who did not write it.

- Names MUST reflect domain language (`ElevatorCar`, `HallCall`, `CarCall`,
  `DoorState`), consistently across backend and frontend.
- TypeScript strict mode MUST be enabled in both `api/` and `web/`. `any` and unchecked
  type assertions are prohibited in domain and application code.
- Illegal states MUST be excluded through the type system (discriminated unions, literal
  union types, branded value objects) wherever feasible, rather than through runtime
  checks alone.
- Error handling MUST be consistent: the domain throws typed domain errors; the
  application layer translates them; the presentation layer maps them to HTTP responses
  or UI state at the boundary only.
- Business rules MUST exist in exactly one place. Duplicating a rule between layers,
  between backend and frontend, or between a service and an entity is prohibited.
- Modules MUST be small and cohesive, each with a single clear reason to change.

**Rationale**: Duplicated or weakly typed rules are the primary way a correct simulator
silently becomes an incorrect one.

## Technology Constraints

- **Backend**: NestJS with TypeScript, located in `api/`. NestJS is a delivery and
  wiring mechanism only; its decorators and modules MUST stay out of the domain layer.
- **Frontend**: React with TypeScript, built with Vite, located in `web/`. The frontend
  renders and dispatches; it holds no elevator rules.
- **Language**: TypeScript in strict mode on both sides. Shared vocabulary MUST be kept
  consistent across the two projects.
- **Testing**: Vitest, already configured in `api/` (unit and e2e configurations).
  Domain tests MUST run under the unit configuration with no application bootstrap.
- **Linting**: `oxlint` for `api/`, `eslint` for `web/`. Both MUST pass before a change
  is considered complete.
- **State**: In-memory simulation state by default. Any persistence layer requires an
  explicit requirement and a Complexity Tracking entry under Principle V.
- **Communication**: The backend is the single source of truth for simulation state. The
  frontend obtains state only from the backend API.

## Development Workflow & Quality Gates

- **Plan gate**: Every `/speckit-plan` run MUST complete the Constitution Check against
  the six principles above, before Phase 0 research and again after Phase 1 design.
- **Layering gate**: Any change that introduces a dependency from the domain layer to a
  framework, transport, UI, or clock MUST be rejected.
- **Correctness gate**: Any change to movement, direction, door, or request-handling
  behavior MUST arrive with tests covering the affected invariants from Principle III.
- **Test gate**: `pnpm test` in `api/` MUST pass. Domain tests MUST NOT require a running
  server.
- **Lint and type gate**: Lint and `tsc` MUST pass in both `api/` and `web/`.
- **Complexity gate**: Any new dependency, layer, port, or infrastructure component that
  is not required by a stated requirement MUST be recorded in the plan's Complexity
  Tracking table with the simpler rejected alternative, or removed.
- **Duplication gate**: A reviewer MUST be able to name the single location of each
  business rule touched by a change.

## Governance

This constitution supersedes other practices and conventions in this repository. Where a
tool default, template, or habit conflicts with a principle here, the principle wins.

**Amendment procedure**: Amendments MUST be made by editing this file, MUST state the
rationale in the Sync Impact Report comment at the top, and MUST propagate to
`.specify/templates/plan-template.md`, `.specify/templates/spec-template.md`,
`.specify/templates/tasks-template.md`, and any runtime guidance docs in the same change.

**Versioning policy**: Semantic versioning applies to this document.

- **MAJOR**: A principle is removed or redefined in a backward-incompatible way, or
  governance rules change incompatibly.
- **MINOR**: A principle or section is added, or existing guidance is materially
  expanded.
- **PATCH**: Clarifications, wording, and non-semantic refinements.

**Compliance review**: Every plan MUST pass the Constitution Check gate. Every review
MUST verify the quality gates above. Violations MUST be either fixed or justified in the
plan's Complexity Tracking table; an unjustified violation blocks the change. Runtime
development guidance for agents lives in `CLAUDE.md`, which points at the current plan.

**Version**: 1.0.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-18
