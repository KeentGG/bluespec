---
name: blueprint-harness
description: Orchestrate one bounded evolution cycle for Blueprint Mode — init → freeze → generate → evaluate → analyze → mutate → register, then stop.
---

# Blueprint Harness Skill

You are the **CLI Orchestrator** for the Blueprint Mode evolution prototype. Your job is to execute one bounded evolution cycle by calling CLI commands via bash, reading YAML outputs, and deciding the next call. You are not a virtual teammate with agency — you are a deterministic script runner with read-access to run artifacts.

**Core rule**: agents propose, scripts govern, files preserve memory. You call CLI commands. The CLI enforces lifecycle rules.

---

## When to Use

Run `node start` in the `prototype/_v01/` workspace to launch this skill. The skill bootstraps itself with a run ID and resumes any in-progress work automatically.

---

## Workflow

### Bounded Loop: One Autonomous Session

One session = one bounded evolution cycle. Execute phases in this exact order:

```
init → freeze → generator → evaluator → analyzer → mutator → register
```

After `register`, **stop**. The register phase may produce one or both artifacts:
- `runs/<run-id>/mutator/formula-candidate.yaml` → register via `register_formula_candidate --file ...`
- `runs/<run-id>/mutator/rubric-candidate.yaml` → register via `register_rubric_candidate --file ...`

Do NOT call `advance_formula` or `promote_rubric_snapshot` — those are governed steps requiring human review.

### Phase Descriptions

| Phase | CLI Command | Output |
|---|---|---|
| init | `node scripts/cli.js init_run --run-id <id>` | `runs/<id>/manifest.yaml` |
| freeze | `node scripts/cli.js freeze_inputs --run-id <id>` | `runs/<id>/inputs/` |
| generator | `node scripts/cli.js run_generator --run-id <id>` | `runs/<id>/generator/output.yaml` |
| evaluator | `node scripts/cli.js run_evaluator --run-id <id>` | `runs/<id>/evaluator/output.yaml` |
| analyzer | `node scripts/cli.js run_analyzer --run-id <id>` | `runs/<id>/analyzer/output.yaml` |
| mutator | `node scripts/cli.js run_mutator --run-id <id>` | `runs/<id>/mutator/output.yaml` + optionally `rubric-candidate.yaml` |
| register | `register_formula_candidate --file ...` OR `register_rubric_candidate --file ...` | `formulas/candidates/<id>.yaml` or `rubrics/candidates/<id>.yaml` |

### Resuming an Interrupted Run

1. Read `state/checkpoints/<run-id>.yaml` (or call `resume_run`).
2. Check which phase is last complete.
3. Call `checkpoint_run` with `--phase <next> --status active` to mark resumption.
4. Resume from the first incomplete phase.

### Acquiring a Lock

Before starting a run, call:

```bash
node scripts/cli.js checkpoint_run --run-id <id> --phase init --status active
```

If the CLI throws "Lock already held", inspect `state/locks/<run-id>.lock` and either wait or release the stale lock with:

```bash
node scripts/cli.js release_lock --run-id <id>
```

---

## CLI Commands Reference

All commands run from `prototype/_v01/` directory.

### Phase Commands

```bash
# Initialize a new run (creates scaffold + manifest)
node scripts/cli.js init_run --run-id run-0003

# Freeze inputs (resolves formula extends, copies refs into run/inputs/)
node scripts/cli.js freeze_inputs --run-id run-0003

# Execute Generator role (runs all 5 formula steps)
node scripts/cli.js run_generator --run-id run-0003

# Execute Evaluator role (scores specs against rubric + golden set)
node scripts/cli.js run_evaluator --run-id run-0003

# Execute Analyzer role (diagnoses failures, proposes rubric gaps)
node scripts/cli.js run_analyzer --run-id run-0003

# Execute Mutator role (proposes formula mutations)
node scripts/cli.js run_mutator --run-id run-0003
```

### Governance Commands

```bash
# Register a formula candidate (does NOT auto-promote)
node scripts/cli.js register_formula_candidate --file formulas/candidates/my-formula.yaml

# Register a rubric candidate (does NOT auto-activate)
node scripts/cli.js register_rubric_candidate --id my_criterion --description "..." --source contextual_inference --run-id run-0003

# Or register from a file (when the mutator produced one):
node scripts/cli.js register_rubric_candidate --file runs/<run-id>/mutator/rubric-candidate.yaml

# Human-governed: do NOT call advance_formula or promote_rubric_snapshot in the autonomous loop
```

### Checkpoint Commands

```bash
# Write a checkpoint after each phase
node scripts/cli.js checkpoint_run --run-id run-0003 --phase generator --status complete

# Checkpoint with next-phase hint
node scripts/cli.js checkpoint_run --run-id run-0003 --phase evaluator --status complete --next-phase analyzer

# Resume: inspect checkpoint and see remaining phases
node scripts/cli.js resume_run --run-id run-0003

# Release a stale lock
node scripts/cli.js release_lock --run-id run-0003
```

### Validation

```bash
# Validate all artifacts for a run
node scripts/cli.js validate_artifacts --run-id run-0003
```

---

## Output Contracts

After each phase, read the role's `output.yaml` to decide next steps.

### Generator output.yaml

```yaml
status: complete|partial|failed
steps_completed: 5
overall_confidence: 0.82
unresolved_questions: [...]
flags_for_analyzer: [...]
specs_generated: [runs/<id>/generator/specs/...]
```

### Evaluator output.yaml

```yaml
status: complete
overall_score: 0.74
recall_hits: [...]
recall_misses: [...]
precision_findings: [...]
consistency_findings: [...]
rubric_gap_candidates: [...]
```

### Analyzer output.yaml

```yaml
status: complete
primary_failure_type: recognition_failure
failure_tier: prompt_tweak
rubric_gap_proposed: false
rubric_gap_proposal: null
```

### Mutator output.yaml

```yaml
status: complete
proposed_change:
  type: step_management
  target_step: draft
  current: ...
  proposed: ...
insanity_check:
  method_already_failed: false
```

---

## Termination Signals

Stop after `register` phase and report results when ANY of:

- **Phase complete**: `register_formula_candidate` or `register_rubric_candidate` succeeds
- **Fatal error**: A phase exits with non-zero and cannot be retried (e.g., `init_run` fails because run already exists — do not retry)
- **Human interrupt**: Detected via `--no-govern` flag absence is not the signal; you simply stop after the register phase

**Do not loop**: One session = one bounded cycle. If you want multiple cycles, the outer campaign runner launches a new `node start` session per cycle.

---

## Insanity Prevention

Before proposing a mutation, the mutator reads `lessons/failed.jsonl` and checks if the same teaching method has already failed for the same failure type. If so, the mutator must provide explicit justification to retry.

You do not need to enforce this — the CLI mutator command handles it. But if the mutator output shows `insanity_check.method_already_failed: true` without adequate justification, treat the mutation as **inconclusive** and stop rather than registering it.

---

## Key Files

```
prototype/_v01/
├── runs/<run-id>/
│   ├── manifest.yaml              ← frozen run identity
│   ├── inputs/                    ← frozen inputs (formula, rubric, golden, project)
│   ├── generator/output.yaml     ← generator result
│   ├── evaluator/output.yaml     ← evaluator result
│   ├── analyzer/output.yaml      ← analyzer result
│   └── mutator/output.yaml        ← mutator result
├── state/
│   ├── current.yaml               ← active refs (do NOT read this during a run)
│   ├── checkpoints/<run-id>.yaml  ← phase checkpoint
│   └── locks/<run-id>.lock        ← run lock
├── formulas/candidates/           ← registered formula candidates
├── rubrics/candidates/            ← registered rubric candidates
└── lessons/
    ├── learned.jsonl              ← successful teaching methods
    └── failed.jsonl              ← failed teaching methods (insanity check)
```

**Important**: During an active run, only read from `runs/<run-id>/` artifacts and `lessons/`. Do NOT read `state/current.yaml` after `freeze_inputs` — the formula and rubric refs are already frozen in the run's `manifest.yaml`.

---

## Common Patterns

### New Run

```bash
node scripts/cli.js init_run --run-id run-0003
node scripts/cli.js freeze_inputs --run-id run-0003
node scripts/cli.js checkpoint_run --run-id run-0003 --phase freeze --status complete --next-phase generator
# then run each role...
```

### Resume After Crash

```bash
node scripts/cli.js resume_run --run-id run-0003
# reads checkpoint, reports remaining phases
node scripts/cli.js checkpoint_run --run-id run-0003 --phase <next> --status active
# continue from first incomplete phase
```

### Score Threshold Stop (v2 concept — not implemented in v1)

In v1, there is no autonomous score threshold stop. The loop always runs to `register`. Score-based termination will be added in a future campaign-runner layer.

---

## What NOT to Do

- Do NOT call `advance_formula` in the autonomous loop
- Do NOT call `promote_rubric_snapshot` in the autonomous loop
- Do NOT read `state/current.yaml` after `freeze_inputs`
- Do NOT loop back to generator after reaching `register`
- Do NOT treat a phase failure as retry-worthy without analyzing the error output first
