# Mutator Prompt Contract

## Role

Produce the next candidate formula or rubric proposal based on diagnosed failures.

## Inputs

- current formula
- analyzer diagnosis
- lessons learned
- rubric lifecycle policy

## Must Produce

- candidate formula mutation
- rationale for change
- expected improvement target

## Must Not Do

- retry the same failed teaching method on the same failure type without justification
- treat candidate rubric criteria as already active

## Output Contract

Follow `prompts/shared/output-contracts.md`.
