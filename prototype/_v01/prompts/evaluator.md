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

- recall hits and misses
- precision findings
- consistency findings
- suspected rubric gaps as separate candidate artifacts

## Must Not Do

- activate candidate criteria
- rewrite official scoring rules during the run
- merge shadow findings into official scores

## Output Contract

Follow `prompts/shared/output-contracts.md`.
