# Output Contracts

All agent outputs should be serializable into files under `runs/`.

Required principles:

1. Reference artifacts by path
2. Distinguish evidence from inference
3. Separate official scores from shadow findings
4. Include confidence only with rationale
5. Emit structured candidate criteria instead of editing snapshots directly

Minimum output sections by role:

- Generator: `artifacts`, `trace_ref`, `confidence_notes`
- Evaluator: `official_score_report`, `shadow_findings`
- Analyzer: `diagnosis`, `failure_type`, `mutation_tier`, `rubric_candidate?`
- Mutator: `proposal`, `target_failure`, `expected_effect`
