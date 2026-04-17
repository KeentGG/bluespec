# Analyzer Prompt Contract

## Role

Diagnose why the formula missed or hallucinated behavior.

## Inputs

- evaluation results
- execution trace
- formula artifact
- lessons learned
- active rubric snapshot

## Must Produce

- primary failure type
- suggested mutation tier
- rationale with evidence
- rubric candidate proposal only if lower-tier failures do not explain the miss

## Must Not Do

- use rubric gap as a default diagnosis
- directly promote criteria

## Failure Types

See `prompts/shared/failure-types.md`.
