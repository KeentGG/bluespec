# Scope

## MVP Scope

This prototype targets the evolution loop, not the full Blueprint Mode product.

Included:
- seed formula definitions
- seed rubric definitions
- governed rubric lifecycle scaffolding
- golden set structure
- lessons learned tracking
- immutable run artifacts
- mutable orchestrator state
- prompt contracts for Generator / Evaluator / Analyzer / Mutator

Deferred:
- full code generation workflow
- sync engine
- fine-tuned judge model
- fully autonomous rubric promotion
- provider-specific runtime hooks beyond adapter contracts

## MVP Success Criteria

1. A run can be materialized with frozen inputs
2. Evaluator can score with static rubric + golden set
3. Analyzer can emit suspected rubric gaps as candidate criteria
4. Candidate criteria land in governed state, not active scoring
5. All artifacts are inspectable in git

## Rubric Discovery Scope

For v01, rubric discovery is **diagnose-only by default**.

That means:
- agents can propose candidate criteria
- candidates can be stored and reviewed
- shadow scoring can exist later
- official scoring remains tied to active snapshot only
