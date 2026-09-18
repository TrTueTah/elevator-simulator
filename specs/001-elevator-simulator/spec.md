# Feature Specification: Elevator Simulator

**Feature Branch**: `001-elevator-simulator`
**Created**: 2026-09-18
**Status**: Draft
**Input**: User description: "Elevator simulator web application for an office building with 10 floors and 3 elevators working in parallel, covering passenger requests with direction, direction-matched stops, destination selection, door controls, multi-elevator dispatch, and a simple web interface for observing and driving the simulation."

## Clarifications

### Session 2026-09-18

- Q: Is an elevator assignment permanent once made? → A: Sticky — scored against all elevators once at request time, and that elevator owns the request until it is served.
- Q: When an elevator travels to reach a call, does it pick up along the way? → A: Yes — a single direction concept driven by physical travel governs every stopping decision; there is no separate committed service direction.
- Q: How does the user control the passage of simulation time? → A: Auto-run at a steady pace, plus pause/resume, single-step while paused, and an adjustable speed.
- Q: Can a destination contradict the direction the passenger asked for? → A: Yes — any floor in range may be selected regardless of the request direction that caused the stop; it is served in path order.
- Q: What does an elevator do after it finishes its last request? → A: Stays put on the floor where it finished, idle with doors closed; no return-to-home or parking redistribution.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Call an elevator and ride to a destination (Priority: P1)

A person standing on a floor of the building presses the up or down button. The system picks one of
the three elevators and sends it to that floor. When it arrives, the doors open, the person chooses
the floor they want to go to, and the elevator carries them there and opens the doors again.

**Why this priority**: This is the complete round trip that makes the product a working elevator
simulator. Without it there is nothing to observe or verify; with it alone the simulation is already
demonstrable end to end.

**Independent Test**: With a single idle elevator and an empty building, press "up" on Floor 3,
watch an elevator travel from its resting floor to Floor 3 and open its doors, select Floor 8 as the
destination, and confirm the elevator closes its doors, travels to Floor 8, and opens them. Delivers
a usable single-passenger elevator ride.

**Acceptance Scenarios**:

1. **Given** all elevators are idle at Floor 1 and no requests exist, **When** a person requests "up"
   from Floor 3, **Then** the system assigns exactly one elevator to that request and that elevator
   begins travelling toward Floor 3.
2. **Given** an elevator is travelling toward Floor 3 to serve a request, **When** it reaches
   Floor 3, **Then** it stops, its direction reflects that it is no longer in motion, its doors open,
   and the request for Floor 3 is removed from the pending list.
3. **Given** an elevator is stopped at Floor 3 with its doors open, **When** the person selects
   Floor 8 as their destination, **Then** Floor 8 is recorded as a destination for that elevator.
4. **Given** Floor 8 is a recorded destination and the doors have closed, **When** the simulation
   advances, **Then** the elevator moves upward one floor per step until it reaches Floor 8, where it
   stops and opens its doors.
5. **Given** an elevator has served its last destination, **When** no further requests or
   destinations exist for it, **Then** it becomes idle with no direction of travel, and it stays on that
   floor rather than returning to a home floor.

---

### User Story 2 - Direction-matched stops along the route (Priority: P2)

While an elevator is travelling in one direction, it picks up people who want to go the same way and
passes by people who want to go the opposite way. Those people wait for a later run.

**Why this priority**: This is the defining rule of the simulation and the behaviour the exercise is
built around. It is separable from User Story 1 because a single-request ride works without it, but
the simulator is not correct until it holds.

**Independent Test**: Send an elevator from Floor 1 toward Floor 10, then place an "up" request on
Floor 5 and a "down" request on Floor 7 while it is in motion. Confirm it stops at Floor 5 and does
not stop at Floor 7 during the upward run, and that the Floor 7 request is still pending afterwards
and is served on a later downward run.

**Acceptance Scenarios**:

1. **Given** an elevator is moving up from Floor 1 toward Floor 10 and is currently below Floor 5,
   **When** an "up" request is made from Floor 5, **Then** the elevator stops at Floor 5 on its way
   up and opens its doors.
2. **Given** an elevator is moving up from Floor 1 toward Floor 10 and is currently below Floor 7,
   **When** a "down" request is made from Floor 7, **Then** the elevator does not stop at Floor 7
   during the upward run and the request remains pending.
3. **Given** a pending "down" request at Floor 7 was passed over during an upward run, **When** an
   elevator later travels downward through Floor 7, **Then** it stops at Floor 7 and the request is
   served.
4. **Given** an elevator is moving up and is already above Floor 5, **When** an "up" request is made
   from Floor 5, **Then** the elevator does not reverse mid-run to collect it and the request is
   served on a later upward run.
5. **Given** an elevator is idle at Floor 4, **When** a request is made in either direction from any
   floor, **Then** the elevator is eligible to serve it regardless of the request's direction.
6. **Given** an elevator has a recorded destination at Floor 6 while travelling up, **When** it
   reaches Floor 6, **Then** it always stops there, because destinations are served independently of
   the direction-matching rule.
7. **Given** an elevator is idle at Floor 2 and is assigned a "down" request from Floor 8, so it must
   first travel upward to reach it, **When** it passes Floor 5 where it also owns an "up" request,
   **Then** it stops at Floor 5, because its direction of travel at that moment is up.

---

### User Story 3 - Control the doors (Priority: P2)

A person in an elevator can hold the doors open for as long as they need, or close them straight
away when they are ready to move. The elevator never moves while the doors are anything other than
fully closed.

**Why this priority**: Door control is directly requested behaviour and carries the single most
important safety invariant of the system. It is separable because rides already work with automatic
doors alone.

**Independent Test**: Bring an elevator to a floor with a pending destination, use "hold open" and
confirm the doors stay open across many simulation steps and the elevator does not move, then use
"close now" and confirm the doors close and travel resumes.

**Acceptance Scenarios**:

1. **Given** an elevator stops at a floor it was serving, **When** it arrives, **Then** its doors
   open automatically.
2. **Given** an elevator's doors are open and no one is holding them, **When** the dwell period
   elapses, **Then** the doors close automatically.
3. **Given** an elevator's doors are open, **When** a person activates "hold open", **Then** the
   doors remain open for as long as the hold is active, regardless of how many simulation steps pass.
4. **Given** the doors are being held open, **When** the hold is released, **Then** the normal dwell
   period restarts and the doors close automatically when it elapses.
5. **Given** an elevator's doors are open, **When** a person activates "close now", **Then** the
   doors begin closing immediately, overriding any active hold and any remaining dwell time.
6. **Given** an elevator has a pending destination and its doors are open or in transition, **When**
   the simulation advances, **Then** the elevator stays on its current floor and does not move.
7. **Given** an elevator's doors are fully closed, **When** an instruction to open them arrives while
   the elevator is between floors, **Then** the instruction is rejected and the doors stay closed.

---

### User Story 4 - Balanced dispatch across three elevators (Priority: P3)

Three elevators serve the building at the same time. Requests are spread across them based on where
each one is and what it is already doing, so the building is served faster than it would be by one
elevator.

**Why this priority**: Parallel operation is a stated requirement, but each elevator's own behaviour
must be correct first. A single-elevator simulation is still demonstrable.

**Independent Test**: With three elevators resting at different floors, place requests on several
widely separated floors and confirm that more than one elevator is dispatched and that each request
goes to an elevator that is plausibly positioned to serve it.

**Acceptance Scenarios**:

1. **Given** three elevators are idle at Floors 1, 5 and 9, **When** a request is made from Floor 8,
   **Then** the elevator at Floor 9 is assigned rather than the one at Floor 1.
2. **Given** requests are made from several different floors in quick succession, **When** the system
   assigns them, **Then** the assignments are spread across more than one elevator rather than all
   going to the same one.
3. **Given** all three elevators are already serving requests, **When** a new request is made,
   **Then** the request is accepted and held as pending, and is assigned to an elevator that will
   serve it rather than being rejected or discarded.
4. **Given** two elevators are equally well placed for a request, **When** the system assigns it,
   **Then** it makes a consistent, repeatable choice rather than an arbitrary one that varies between
   identical runs.
5. **Given** an elevator is assigned a request, **When** the state is observed, **Then** it is clear
   which elevator owns that request.

---

### User Story 5 - Monitor the whole building at a glance (Priority: P3)

An observer watching the simulation can see, at any moment, where all three elevators are, which way
they are going, whether their doors are open, which requests are still waiting, and which floors each
elevator is heading to.

**Why this priority**: Visibility is what makes the simulation legible and reviewable, but the
underlying behaviour must exist before there is anything worth showing.

**Independent Test**: Start the simulation, create a mix of requests and destinations, and confirm
that every piece of state named above is visible on screen and updates as the simulation runs,
without needing to inspect anything behind the interface.

**Acceptance Scenarios**:

1. **Given** the simulation is running, **When** the observer looks at the interface, **Then** all
   three elevators are shown with their current floor, direction of travel, and door state.
2. **Given** requests are pending, **When** the observer looks at the interface, **Then** each
   pending request is shown with its floor and its requested direction.
3. **Given** an elevator has recorded destinations, **When** the observer looks at the interface,
   **Then** those destination floors are shown for that elevator.
4. **Given** the simulation advances a step, **When** any elevator's floor, direction or door state
   changes, **Then** the displayed state reflects the change promptly without a manual refresh.
5. **Given** the observer wants to drive the simulation, **When** they use the interface, **Then**
   they can create a request from any floor in either available direction, select a destination for an
   elevator whose doors are open, and hold or close that elevator's doors.
6. **Given** the observer wants to inspect a moment closely, **When** they pause the simulation,
   **Then** all elevators hold their exact state, and each single-step advances the whole building by
   exactly one step.
7. **Given** the simulation is running, **When** the observer changes the pace, **Then** the steps
   occur faster or slower in real time while the sequence of states produced is unchanged.

---

### Edge Cases

- **All elevators busy**: A request made while every elevator is already serving other requests is
  accepted and queued, never rejected. It is assigned to an elevator and served once that elevator
  works through its earlier commitments.
- **Duplicate request for the same floor and direction**: Pressing "up" on Floor 4 twice results in
  one pending request, one assignment, and one stop — not two.
- **Both directions requested from the same floor**: "Up" and "down" at Floor 4 are two separate
  pending requests. Serving one does not clear the other; an elevator stopping to collect the "up"
  request leaves the "down" request pending.
- **Multiple destinations in one car**: Destinations are served in the order they are encountered
  along the elevator's path of travel, not in the order they were entered. Selecting Floor 9 and then
  Floor 5 while travelling up results in stops at Floor 5 first, then Floor 9.
- **Requesting the elevator's current floor**: If a person on Floor 6 requests an elevator and an
  assigned elevator is already stopped at Floor 6, the doors open without any movement.
- **Selecting the current floor as a destination**: The destination is treated as already reached —
  the doors open (or stay open) and no movement occurs.
- **Destination contradicting the requested direction**: A person who called the elevator with "up"
  from Floor 5 may still select Floor 2. The destination is accepted and served in path order, which
  may mean the elevator finishes its upward commitments first and reaches Floor 2 on a later
  downward run.
- **Destinations in both directions from one stop**: Several people boarding at the same stop may
  select floors above and below the current one. All are recorded, and each is served when the
  elevator's path reaches it.
- **Attempting to move with the doors open**: The move does not happen. The elevator remains on its
  floor and the attempt is reported as invalid rather than silently ignored.
- **Reaching the top floor**: An elevator at Floor 10 cannot continue upward. "Up" is not an
  available request direction on Floor 10.
- **Reaching the bottom floor**: An elevator at Floor 1 cannot continue downward. "Down" is not an
  available request direction on Floor 1.
- **Direction reversal**: An elevator reverses direction only when it has no remaining requests or
  destinations ahead of it in its current direction.
- **Idle after last request**: An elevator that runs out of work stops where it is. Over a long run
  the three elevators naturally scatter across the building rather than clustering at Floor 1.
- **Repositioning pickups**: An elevator travelling toward the floor of a request it was assigned
  still collects its own same-direction requests on the way. Being en route to a call does not make
  the leg an express run.
- **Starvation**: A request that is repeatedly passed over by direction-matched traffic is still
  eventually served; no request can wait forever.
- **Request during door transition**: A destination selected while the doors are closing is recorded
  and served on the elevator's onward journey; it does not reopen the doors.
- **Rapid repeated door commands**: Alternating "hold open" and "close now" leaves the doors in a
  single well-defined state consistent with the most recent command, never in an undefined one.

## Requirements *(mandatory)*

### Elevator State Model

Each elevator's observable state is the combination of a **motion state**, a **door state**, and a
**current floor**.

| Motion state | Meaning |
|--------------|---------|
| Idle | Stopped, no outstanding requests or destinations, no direction of travel |
| Moving Up | Travelling upward toward a committed floor |
| Moving Down | Travelling downward toward a committed floor |
| Stopped | Halted at a floor to serve a request or destination, doors in use |

| Door state | Meaning |
|------------|---------|
| Closed | Fully closed; the only state in which the elevator may move |
| Opening | In transition toward open; movement prohibited |
| Open | Fully open; movement prohibited; destinations may be selected |
| Closing | In transition toward closed; movement prohibited |

- **FR-001**: The building MUST have exactly 10 floors, numbered 1 (lowest) through 10 (highest).
- **FR-002**: The building MUST have exactly 3 elevators, each with a stable identity that
  distinguishes it from the others for the lifetime of a simulation run.
- **FR-003**: At the start of a simulation run, every elevator MUST be Idle, with doors Closed, at a
  defined starting floor, with no pending requests or destinations anywhere in the system.
- **FR-004**: An elevator MUST at all times be at exactly one floor within the range 1 to 10; a
  position outside that range MUST be impossible.
- **FR-005**: The simulation MUST advance in discrete, uniform steps. One step MUST correspond to at
  most one floor of travel for each elevator.
- **FR-005a**: While running, the simulation MUST advance automatically at a steady real-time pace
  without user intervention.
- **FR-005b**: A user MUST be able to pause the simulation and resume it. While paused, no elevator may
  change floor, no door timer may advance, and no state may change except in response to an explicit
  user action.
- **FR-005c**: While paused, a user MUST be able to advance the simulation by exactly one step.
- **FR-005d**: A user MUST be able to adjust the automatic pace within a defined range. Changing the
  pace MUST change only how fast steps occur in real time; it MUST NOT change the outcome of any step.
  All durations in the simulation, including the door dwell period, MUST be counted in steps rather than
  in real-world time, so that a run at any speed produces the same sequence of states.
- **FR-006**: The system MUST provide a way to reset the simulation to its starting state.

### Passenger Requests

- **FR-007**: A person MUST be able to request an elevator from any floor, specifying a direction of
  either up or down.
- **FR-008**: The system MUST NOT offer or accept an "up" request from Floor 10 or a "down" request
  from Floor 1.
- **FR-009**: The system MUST treat a request as uniquely identified by its floor and direction.
  A repeat request for a floor and direction that is already pending MUST have no additional effect.
- **FR-010**: The system MUST track "up" and "down" requests at the same floor as two independent
  requests, each served separately.
- **FR-011**: The system MUST assign exactly one elevator to each pending request at the moment the
  request is made, and MUST make the assignment observable. Once made, the assignment MUST NOT
  change: the assigned elevator owns that request until it is served.
- **FR-012**: The system MUST accept a request even when every elevator is already busy; requests
  MUST NOT be rejected, dropped, or silently discarded for lack of capacity.
- **FR-013**: A pending request MUST remain pending until an elevator stops at that floor and opens
  its doors while able to serve that direction.
- **FR-014**: Every accepted request MUST eventually be served; no request may remain pending
  indefinitely while other requests continue to be served.

### Elevator Movement

- **FR-015**: An elevator's direction MUST be one of up, down, or none, and an Idle elevator MUST
  have no direction of travel.
- **FR-016**: While in motion, an elevator MUST move exactly one floor per simulation step, passing
  through intermediate floors rather than jumping between non-adjacent floors.
- **FR-017**: An elevator MUST stop at every floor it has committed to serve — its own destinations,
  and requests assigned to it that it is eligible to serve on the current run. It MUST NOT skip such a
  floor.
- **FR-018**: An elevator MUST reverse its direction only when it has no remaining committed floors
  ahead of it in its current direction.
- **FR-018a**: An elevator that has no remaining requests or destinations MUST become Idle on the
  floor where it served its last one and MUST remain there with doors Closed until it is assigned new
  work. The system MUST NOT move an idle elevator to a home or parking floor.
- **FR-019**: An elevator at Floor 10 MUST NOT travel further up, and an elevator at Floor 1 MUST NOT
  travel further down.
- **FR-020**: Each elevator MUST operate independently of the others; the movement of one elevator
  MUST NOT block or stall the movement of another within the same simulation step.

### Direction Rule

- **FR-021**: A moving elevator MUST stop for a pending request assigned to it only when the
  request's direction matches the elevator's current direction of physical travel and the request's
  floor lies ahead of the elevator on its current path. An elevator's direction MUST be its physical
  direction of travel only; the system MUST NOT model a separate committed service direction.
- **FR-022**: A moving elevator MUST NOT stop for a pending request whose direction is opposite to its
  current direction of travel, and MUST NOT stop for a request assigned to a different elevator. That request MUST remain pending and be served on a later run in the
  matching direction.
- **FR-023**: A moving elevator MUST NOT stop for a request at a floor it has already passed on the
  current run; that request MUST be served on a later run.
- **FR-024**: An Idle elevator MUST be eligible to serve a request in either direction.
- **FR-025**: An elevator MUST always stop at its own recorded destination floors, regardless of the
  direction-matching rule that governs pickups.
- **FR-025a**: The direction-matching rule MUST apply uniformly, including while an elevator is
  travelling to reach the floor of a request assigned to it. Such a repositioning leg MUST NOT be
  treated as an express run: the elevator MUST stop for its own assigned requests that it passes in
  the matching direction.

### Destinations

- **FR-026**: A destination floor MUST be selectable for an elevator only while that elevator is
  stopped at a floor with its doors Open. Any floor in the range 1 to 10 MUST be selectable,
  regardless of the direction of the request that caused the stop. The system MUST NOT require an
  elevator to remember why it stopped, and MUST NOT restrict destinations to one direction.
- **FR-027**: An elevator MUST accept multiple destinations and MUST serve them in the order they are
  encountered along its path of travel, not in the order they were selected.
- **FR-028**: A repeat selection of a destination already recorded for an elevator MUST have no
  additional effect.
- **FR-029**: Selecting the elevator's current floor as a destination MUST NOT cause movement; the
  doors MUST be open or reopen and the destination MUST be treated as already reached.
- **FR-030**: A destination outside the range 1 to 10 MUST be rejected with a clear error and MUST
  leave the elevator's state unchanged.
- **FR-031**: A destination MUST be cleared once the elevator has stopped at that floor.

### Doors

- **FR-032**: Each elevator's doors MUST be in exactly one of the states Closed, Opening, Open, or
  Closing at any moment.
- **FR-033**: An elevator MUST NOT move unless its doors are fully Closed. Any attempt to move with
  doors in any other state MUST be rejected and MUST leave the elevator's floor unchanged.
- **FR-034**: An attempt to open the doors while the elevator is between floors or in motion MUST be
  rejected with a clear error and MUST leave the door state unchanged.
- **FR-035**: Doors MUST open automatically when an elevator stops at a floor it committed to serve.
- **FR-036**: Open doors MUST close automatically after a defined dwell period, unless a hold is
  active.
- **FR-037**: A person MUST be able to hold the doors open; while the hold is active the doors MUST
  remain Open for an unbounded number of simulation steps.
- **FR-038**: Releasing a hold MUST restart the dwell period, after which the doors close
  automatically.
- **FR-039**: A person MUST be able to close the doors immediately; this MUST override both any
  active hold and any remaining dwell time.
- **FR-040**: Door commands MUST be safe to repeat and to interleave; any sequence of hold and close
  commands MUST leave the doors in a single well-defined state consistent with the latest command.

### Dispatch Across Elevators

- **FR-041**: The system MUST select the elevator for a request based on the current state of all
  elevators, including at minimum each elevator's current floor, direction of travel, and outstanding
  workload.
- **FR-042**: The system MUST NOT always select the same elevator; when another elevator is better
  positioned for a request, that elevator MUST be selected.
- **FR-043**: When two or more elevators are equally suitable, the system MUST resolve the tie
  consistently, so that identical simulation states produce identical assignments.
- **FR-044**: The system MUST NOT assign a request to an elevator in a way that makes it impossible
  to eventually serve, such as an elevator that will never travel in the required direction.

### Observation and Control Interface

- **FR-045**: A single authoritative simulation state MUST exist; what the interface displays MUST be
  a view of that state rather than a separately computed one.
- **FR-046**: The interface MUST display, for each of the three elevators: its identity, current
  floor, direction of travel, door state, recorded destinations, and the requests assigned to it.
- **FR-047**: The interface MUST display all pending requests with their floor and requested
  direction.
- **FR-048**: The interface MUST allow a user to create a request from any floor in any direction
  available on that floor.
- **FR-049**: The interface MUST allow a user to select a destination for an elevator whose doors are
  Open.
- **FR-050**: The interface MUST allow a user to hold open and to immediately close the doors of a
  chosen elevator.
- **FR-050a**: The interface MUST expose the simulation time controls — pause, resume, single-step
  while paused, and pace adjustment — and MUST make it evident whether the simulation is currently
  running or paused.
- **FR-051**: The interface MUST reflect changes to elevator floor, direction, door state,
  destinations, and pending requests as the simulation advances, without requiring a manual refresh.
- **FR-052**: Controls that are not valid in the current state MUST be visibly unavailable or MUST
  produce a clear explanation when used, rather than failing silently.

### Invalid Actions

- **FR-053**: Every rejected action MUST leave the simulation state exactly as it was before the
  attempt.
- **FR-054**: Every rejected action MUST produce a message that identifies what was attempted and why
  it was not allowed.

### Key Entities

- **Building**: The whole simulated environment. Holds the fixed set of floors and the set of
  elevators, and owns the pending requests that have not yet been served.
- **Floor**: A numbered level from 1 to 10. Knows which request directions are available on it —
  Floor 1 has no "down", Floor 10 has no "up".
- **Elevator**: A single car. Knows its identity, current floor, motion state, direction of travel,
  door state, its recorded destinations, and the requests assigned to it. Owns the rules governing its
  own movement, stopping, and doors.
- **Request (hall call)**: A person's call for an elevator, identified by a floor and a direction.
  Carries its pending-or-served status and the identity of the elevator assigned to it.
- **Destination (car call)**: A floor selected from inside an elevator. Belongs to exactly one
  elevator and is cleared when that elevator stops at the floor.
- **Direction**: Up, down, or none. Applies both to a request's intent and to an elevator's physical
  travel. An elevator has exactly one direction — there is no separate committed service direction.
- **Door State**: Closed, Opening, Open, or Closing, together with whether a hold is active and how
  much dwell time remains.
- **Simulation Step**: One discrete advance of the whole building's state, during which each elevator
  moves at most one floor and door timers advance.
- **Assignment**: The association between a pending request and the elevator chosen to serve it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every request made from any floor is assigned to an elevator within one simulation
  step, in 100% of attempts.
- **SC-002**: With all three elevators idle, an elevator arrives and opens its doors at the
  requesting floor within 12 simulation steps of the request, in 100% of attempts.
- **SC-003**: Across a randomised run of at least 1,000 simulation steps with continuous mixed
  traffic, an elevator changes floors while its doors are not fully closed exactly 0 times.
- **SC-004**: Across the same run, an elevator passes a floor it had committed to serve exactly
  0 times.
- **SC-005**: Across the same run, an elevator is positioned outside the range of Floors 1 to 10, or
  is idle while holding a direction of travel, exactly 0 times.
- **SC-006**: 100% of requests whose direction is opposite to a passing elevator's travel are left
  unserved by that run and are served on a subsequent run in the matching direction.
- **SC-007**: Across a workload of at least 20 requests spread over different floors, every one of
  the three elevators serves at least one request, and no single elevator serves more than 60% of them.
- **SC-008**: Across a run of at least 1,000 simulation steps with continuous traffic, no individual
  request waits more than 60 simulation steps to be served.
- **SC-009**: An observer new to the simulation can state the current floor, direction, and door
  state of all three elevators within 10 seconds of looking at the interface.
- **SC-010**: A person using the interface for the first time, without instructions, can create a
  request, select a destination, and complete one full ride in under 60 seconds.
- **SC-011**: A change in any elevator's floor, direction, or door state becomes visible in the
  interface within 1 second of the simulation step that caused it.
- **SC-012**: Every invalid action attempted through the interface produces an explanatory message
  and leaves the simulation state unchanged, in 100% of attempts.
- **SC-013**: While the simulation is paused, no observable state changes on its own over at least 60
  seconds of real time, and each single-step advances every elevator by at most one floor.
- **SC-014**: The same sequence of user actions replayed at the slowest and the fastest available
  pace produces an identical sequence of simulation states.

## Assumptions

- **Automatic advance with manual override**: The simulation advances on its own at a steady
  real-time pace once running, and the user may pause it, single-step it, and adjust the pace. One
  simulation step corresponds to one floor of travel. A default pace of roughly one step per second is
  assumed so the simulation is watchable, with the adjustable range spanning a few times slower to a
  few times faster than that default.
- **Door dwell period**: Doors left alone stay open for a small fixed number of simulation steps
  before closing automatically. Three steps is assumed as the default.
- **Starting position**: All three elevators begin at Floor 1, idle, with doors closed. This is a
  starting condition only, not a resting place they return to.
- **No capacity limit**: Elevators are not modelled as having a passenger capacity or weight limit.
  Any number of destinations may be recorded for a car. Capacity is out of scope.
- **No individual passenger identity**: People are not modelled as tracked individuals. A request is
  a call at a floor in a direction, and a destination is a floor selected from inside a car. The
  simulator does not verify that the person who called the elevator is the one who selected the
  destination.
- **Single shared simulation**: There is one simulation running at a time, shared by anyone observing
  it. Multi-user sessions, separate simulations per user, and user accounts are out of scope.
- **No persistence**: Simulation state lives only for the duration of a run. History is not stored and
  state is not expected to survive a restart.
- **No door obstruction sensor**: Doors are controlled only by the automatic dwell, the hold command,
  and the close command. Physical obstruction detection is out of scope.
- **Direction availability**: Floor 1 offers only "up" and Floor 10 offers only "down"; this is
  treated as a property of the building rather than an error case to be handled at request time.
- **Out of scope for this feature**: emergency stop, fire service or maintenance modes, express or
  zoned elevator types, out-of-service elevators, power failure, overload alarms, floor access
  restrictions, and any performance target beyond a watchable simulation pace.
- **Technology decisions deferred**: The interface is a web interface and the simulation is
  authoritative outside it, but the specific stack, internal structure, and interfaces are determined
  during planning, within the bounds of the project constitution.
