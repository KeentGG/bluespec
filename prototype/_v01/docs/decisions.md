# Prototype Decisions

## Storage

- Canonical human/machine inputs: YAML
- Append-only event logs: JSONL
- Human policy and reasoning: Markdown

Rationale:
- YAML is easier to read and edit during prototype work
- JSONL is a good fit for lessons and traces
- Markdown is better for heuristics than machine state

## Lifecycle Enforcement

Rubric lifecycle should be enforced by thin tooling, not by prompt obedience alone.

Rationale:
- state transitions need validation
- same-run rubric mutation must be blocked from official scoring
- frozen snapshots must stay immutable

## Official vs Shadow Scoring

- Official scoring uses the frozen active rubric snapshot
- Shadow scoring is reserved for candidate/probationary criteria

Rationale:
- preserves comparability across runs
- prevents goalpost shifting
- keeps rubric discovery honest

## Provider Architecture

The prototype core is provider-neutral.

Future adapters may target:
- OpenCode
- Hermes
- local runners

Provider code belongs under `integrations/providers/` and should translate provider-specific behavior into prototype contracts.

## Hook Strategy

Hooks are extension points, not the source of truth.

Hooks may:
- enrich events
- trigger external workflows
- export artifacts
- notify reviewers

Hooks must not silently mutate active rubric or formula state outside the governed lifecycle.
