# State

Mutable live state for the prototype workspace.

- `current.yaml` — active refs and the next run ID
- `queue.yaml` — pending reviews and promotions
- `locks/<run-id>.lock` — held while a run is active; prevents concurrent execution
- `checkpoints/<run-id>.yaml` — phase checkpoint written by the agent orchestrator after each phase

Unlike `runs/`, this folder is intentionally mutable.

## Checkpoints

Written by the agent orchestrator via `checkpoint_run` CLI command. Valid phases:

```
init → freeze → generator → evaluator → analyzer → mutator → register
```

A checkpoint records which phase is currently `active`, `complete`, or `failed`. The orchestrator reads `checkpoints/<run-id>.yaml` to resume from the last completed phase after a crash.

```bash
# Write a checkpoint
node scripts/cli.js checkpoint_run --run-id run-0003 --phase generator --status complete

# Inspect a checkpoint
node scripts/cli.js resume_run --run-id run-0003
```

## Locks

Acquired automatically by `node start.js`. Prevent concurrent execution of the same run ID. If `node start` crashes, the lock file persists and must be released manually:

```bash
node scripts/cli.js release_lock --run-id run-0003
```

The lock is released automatically when the agent completes the `register` phase and exits.
