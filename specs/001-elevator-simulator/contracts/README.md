# Contracts: Elevator Simulator

The backend exposes exactly two interfaces to the browser:

| Contract | Direction | File |
|----------|-----------|------|
| Command API | browser → simulation | [http-api.md](./http-api.md) |
| State stream | simulation → browser | [state-stream.md](./state-stream.md) |

Both carry the same vocabulary as [data-model.md](../data-model.md). The stream is the **only** way
state reaches the browser; command responses acknowledge, they do not carry authoritative state.
This keeps a single source of truth (FR-045) and means the frontend never has two paths to reconcile.

Nothing in these contracts encodes an elevator rule. They move commands in and snapshots out; every
decision happens in the domain (Constitution Principle I).
