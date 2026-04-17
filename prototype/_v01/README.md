# Evolution Prototype v01

> Main workspace for the evolution-phase prototype.

This folder is the working backbone for the first evolution prototype: formula generation, evaluation, diagnosis, mutation, and governed rubric discovery.

The version label lives at the workspace level here because this is an early prototype sandbox. Longer-term versioning should happen inside artifacts:

- `runs/run-0001/`
- `rubrics/snapshots/v001/`
- `formulas/promoted/*.yaml`

---

## Prototype Goals

1. Build the persistent-file backbone for the evolution loop
2. Keep agents ephemeral and state file-native
3. Separate official scoring from shadow rubric discovery
4. Leave clean adapter points for future OpenCode / Hermes provider plugins and hooks

---

## Design Rules

- **Files are the memory**
- **Markdown explains policy; YAML/JSONL stores machine state**
- **Agents may propose changes; lifecycle tools validate them**
- **Rubric discovery cannot change official scoring in the same run**
- **Official runs must use frozen formula + rubric inputs**

---

## Folder Map

```text
docs/           human-readable prototype decisions and data model
schemas/        machine validation contracts
config/         prototype and sample project config
prompts/        role-specific agent prompts
goldens/        golden-set examples and notes
formulas/       seed, candidate, promoted, archived formulas
rubrics/        seed rubrics, candidates, shadow data, frozen snapshots
lessons/        append-only lessons learned logs
runs/           immutable per-run artifacts
state/          mutable pointers, queues, locks, checkpoints
integrations/   provider adapters, contracts, future hooks
scripts/        thin orchestration tool entrypoints (future)
```

---

## Future Integration Direction

The core prototype should stay provider-neutral.

- `integrations/providers/opencode/` is where OpenCode-specific adapters can live
- `integrations/providers/hermes/` is where Hermes-specific adapters can live
- `integrations/hooks/` defines lifecycle extension points if the evolution loop needs grounded workflow hooks later

Providers should adapt to the prototype contract. They should not redefine the core state layout.

---

## Recommended First Execution Order

1. Define a sample project config in `config/projects/`
2. Finalize one seed formula in `formulas/seed/`
3. Finalize one seed rubric in `rubrics/seed/`
4. Create a sample golden set in `goldens/projects/`
5. Implement thin orchestration commands described in `scripts/README.md`
6. Run `run-0001` with static rubric only
7. Add diagnose-only rubric discovery

---

## Current Status

This is a scaffold, not a running system yet.

What exists now:
- lifecycle folders
- seed artifacts
- schemas
- prompt contracts
- provider/hook extension points

What should come next:
- thin Python CLI
- run materialization
- schema validation
- first real sample project execution
