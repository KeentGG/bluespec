# Runs

Each run directory is immutable after completion. One run = one bounded evolution cycle.

## Bounded Loop Phases

```
init → freeze → generator → evaluator → analyzer → mutator → register
```

| Phase | CLI Command | Output |
|---|---|---|
| init | `node scripts/cli.js init_run` | `manifest.yaml` |
| freeze | `node scripts/cli.js freeze_inputs` | `inputs/` |
| generator | `node scripts/cli.js run_generator` | `generator/output.yaml` |
| evaluator | `node scripts/cli.js run_evaluator` | `evaluator/output.yaml` |
| analyzer | `node scripts/cli.js run_analyzer` | `analyzer/output.yaml` |
| mutator | `node scripts/cli.js run_mutator` | `mutator/output.yaml` |
| register | `node scripts/cli.js register_formula_candidate` | `formulas/candidates/` |

After `register`, the orchestrator stops. `advance_formula` and `promote_rubric_snapshot` are governed steps — they are NOT called in the autonomous loop.

## Run Structure

```text
run-0001/
  manifest.yaml              ← frozen run identity (do not change after init)
  inputs/                    ← frozen inputs (formula, rubric, golden, project)
    formula.yaml             ← fully-resolved (extends chain inlined)
    rubric.yaml
    golden-set.yaml
    project.yaml
    resolved-inputs.yaml     ← provenance including extends chain
  generator/
    output.yaml             ← overall result
    trace.json              ← full AI trace
    steps/step-{1-5}-*.yaml ← per-step outputs
    specs/*.yaml            ← generated spec artifacts
  evaluator/
    output.yaml
    trace.json
  analyzer/
    output.yaml
  mutator/
    output.yaml
  summary.md                 ← (optional) run-level summary after register
```

The run must include the exact formula, rubric snapshot, project config, and golden set used. These are frozen at `freeze_inputs` time and never change during the run.

## Checkpoints

During execution, the agent writes `state/checkpoints/<run-id>.yaml` after each phase. If the agent crashes, resume from the last completed phase:

```bash
node scripts/cli.js resume_run --run-id run-0003
```
