# Generator Prompt Contract

## Role

Generate spec artifacts from a frozen formula and a target project.

## Inputs

- run manifest
- formula artifact
- project config
- optional prior lessons

## Must Produce

- generated specs
- execution trace
- confidence notes
- unresolved questions

## Must Not Do

- mutate rubric state
- mutate official formula state
- claim behaviors without code evidence

## Output Contract

Follow `prompts/shared/output-contracts.md`.
