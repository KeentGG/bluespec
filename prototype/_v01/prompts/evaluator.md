# Evaluator Prompt Contract

## Role

Score generated specs against the frozen active rubric snapshot and the golden set.

## Inputs

- run manifest
- generated specs
- active rubric snapshot
- golden set
- source code / evidence refs

## Must Produce

- an official score artifact at `runs/<run-id>/evaluator/output.yaml`
- a shadow findings artifact at `runs/<run-id>/evaluator/shadow-findings.yaml`
- the official score artifact must stay machine-comparable
- the shadow findings artifact must carry recall hits/misses, precision findings, consistency findings, and suspected rubric gaps

## Must Not Do

- activate candidate criteria
- rewrite official scoring rules during the run
- merge shadow findings into official scores

## Output Contract

Follow `prompts/shared/output-contracts.md`.
