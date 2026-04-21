# Scripts

Thin Node.js orchestration CLI for the evolution prototype.

## Implementation direction

- thin Node CLI
- YAML as canonical input
- JSONL for append-only logs
- no database required for v01

## Governance commands

- `init_run` - materialize `runs/run-000X/manifest.yaml` from current refs
- `freeze_inputs` - copy resolved inputs into a run folder; **resolves formula `extends` chain** and inlines steps/validations/specializations/behavior_shapes
- `validate_artifacts` - validate YAML against schemas
- `register_rubric_candidate` - store candidate criterion artifact
- `approve_rubric_candidate` - govern rubric candidates through review pipeline
- `reject_rubric_candidate` - remove candidate from consideration
- `promote_rubric_snapshot` - create next frozen rubric snapshot after governance approval
- `register_formula_candidate` - store formula candidate artifact
- `advance_formula` - promote formula to active, update `state/current.yaml`
- `validate_seed_rubrics` - validate all `rubrics/seed/*.yaml` against seed rubric schema

## Loop commands (all implemented)

- `run_generator` - execute Generator role for a run (5-step AI cadence)
- `run_evaluator` - score specs against frozen rubric + golden set
- `run_analyzer` - diagnose failures, propose rubric gaps
- `run_mutator` - propose formula mutations with insanity check

## Checkpoint commands (agent harness)

- `checkpoint_run` - write phase checkpoint after each step
- `resume_run` - inspect checkpoint and report remaining phases
- `release_lock` - release a stale lock (recovery only)

## Usage

```bash
# New run
node scripts/cli.js init_run [--run-id run-0001]
node scripts/cli.js freeze_inputs --run-id run-0001

# Loop phases
node scripts/cli.js run_generator --run-id run-0001
node scripts/cli.js run_evaluator --run-id run-0001
node scripts/cli.js run_analyzer --run-id run-0001
node scripts/cli.js run_mutator --run-id run-0001

# Agent harness entry point (launches OpenCode orchestrator)
node start.js [--run-id run-0003] [--resume] [--opencode-bin opencode]

# Recovery
node scripts/cli.js resume_run --run-id run-0003
node scripts/cli.js release_lock --run-id run-0003
```
