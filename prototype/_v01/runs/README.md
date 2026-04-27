# Runs

Each run directory is immutable after completion. One run = one bounded evolution cycle.

## Bounded Loop Phases

```
init → freeze → explore → delegate → evaluate → analyze → mutate → register
```

| Phase | How | Output |
|---|---|---|
| init | `node scripts/cli.js init_run` | `manifest.yaml` |
| freeze | `node scripts/cli.js freeze_inputs` | `inputs/` |
| explore | Agent uses glob/grep/read to explore codebase | Agent builds mental model |
| delegate | Agent writes delegation manifests, spawns spec-generator subagents via Task tool | `generator/delegate/` + `generator/specs/` |
| evaluate | `node scripts/cli.js run_evaluator` | `evaluator/output.yaml` + `evaluator/shadow-findings.yaml` |
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
    golden-set.yaml         ← behaviors the evaluator checks against
    project.yaml             ← codebase_path for exploration
    resolved-inputs.yaml     ← provenance including extends chain
  generator/
    delegate/               ← agent writes one manifest per spec before spawning subagents
      <spec-id>.yaml
    specs/                  ← spec-generator subagents write real behavioral specs here
      <spec-id>.yaml        ← full spec with state machines, evidence, conditions
    output.yaml             ← agent summarizes results after all subagents finish
    trace.json              ← full tool call trace
  evaluator/
    output.yaml            ← official machine-comparable score report
    shadow-findings.yaml   ← qualitative recall/precision/consistency/rubric-gap findings
    trace.json
  analyzer/
    output.yaml
  mutator/
    output.yaml
    rubric-candidate.yaml    ← (if analyzer diagnosed rubric_gap_failure)
  summary.md                 ← (optional) run-level summary after register
```

The run must include the exact formula, rubric snapshot, project config, and golden set used. These are frozen at `freeze_inputs` time and never change during the run.

## Checkpoints

During execution, the agent writes `state/checkpoints/<run-id>.yaml` after each phase. If the agent crashes, resume from the last completed phase:

```bash
node scripts/cli.js resume_run --run-id run-0003
```
