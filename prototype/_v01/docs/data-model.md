# Data Model

## Core Entities

### Formula

Defines the recipe for producing specs.

Fields:
- identity and version
- ecosystem / behavior shape
- steps
- validations
- tools / routing hints
- compatible rubric snapshot(s)

### Rubric Criterion

Defines one evaluation dimension.

Lifecycle:

```text
seed/active -> candidate -> probation -> active -> deprecated/rejected
```

### Rubric Snapshot

A frozen set of active criteria used for official scoring in one batch or run window.

### Golden Set

Human-curated behaviors used as the primary anchor for recall and precision.

### Lesson

Observed teaching result from a previous failure and attempted fix.

### Run Manifest

Frozen record of which formula, rubric snapshot, project config, and golden set were used for a run.

## State Split

### Immutable

- `runs/`
- `rubrics/snapshots/`
- promoted formula artifacts

### Mutable

- `state/current.yaml`
- `state/queue.yaml`
- candidate criterion files
- active work queues

## Safety Invariants

1. A run must record exact formula + rubric inputs
2. Official scoring cannot read candidate criteria
3. A candidate criterion cannot become active inside the run that discovered it
4. Lessons are append-only observations, not rewritten history
5. Providers and hooks cannot bypass snapshot freezing
