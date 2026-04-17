# Runs

Each run directory should be immutable after completion.

Recommended shape:

```text
run-0001/
  manifest.yaml
  inputs/
  generator/
  evaluator/
  analyzer/
  mutator/
  summary.md
```

The run must include the exact formula, rubric snapshot, project config, and golden set used.
