# Rubric Lifecycle

> How adaptive evaluation criteria are discovered, validated, promoted, versioned, and retired during formula evolution.
> Status: ACTIVE DISCUSSION

---

## Purpose

Blueprint Mode evolves not only the formula that generates specs, but also the rubric that judges them. This document defines how rubric evolution works without letting the system rewrite its own test mid-flight.

The core constraint:

- **Formulas may discover candidate criteria during a run**
- **But those criteria must not affect official scoring in that same run**

Adaptive rubric is useful only if it remains governed.

---

## Goals

- Let evaluation criteria improve over time
- Keep fitness scores comparable across runs
- Prevent noisy, self-justifying, or overfit criteria
- Preserve provenance for every rubric change
- Keep the golden set as the primary anchor

## Non-Goals

- Fully autonomous rubric mutation in MVP
- Same-run rubric updates affecting official fitness
- Replacing the golden set with free-form judge reasoning

---

## Core Principles

### 1. Golden Set Stays the Anchor

The golden set remains the highest-trust signal because it comes from human-curated, code-grounded behaviors.

Adaptive rubric extends evaluation coverage. It does **not** replace anchored recall and precision.

### 2. A Discovered Criterion Is a Hypothesis First

Rubric discovery does not immediately create a new scoring rule. It creates a **candidate criterion** with evidence, scope, and confidence.

The system should treat discovery as:

```text
observation -> hypothesis -> probation -> promotion -> official scoring
```

### 3. Rubric Changes Must Be Slower Than Formula Changes

Formulas can mutate every cycle. Rubrics should change on a slower cadence, usually at experiment or batch boundaries.

This keeps run-to-run comparisons meaningful.

### 4. Temporal Separation Prevents Self-Reward

A formula must not benefit from a criterion it helped discover during the same run.

Otherwise the system can drift into a loop where:

1. the formula misses something
2. the evaluator invents a criterion that favors the formula's style
3. the formula gets rewarded by the new rule immediately

That is not learning. That is moving the goalpost.

### 5. Rubric Gap Is a Late Diagnosis, Not a Convenient One

Before labeling something a rubric gap, the Analyzer should rule out:

- search failure
- recognition failure
- format failure
- prompt failure

Many apparent rubric gaps are really discovery failures wearing a better name.

---

## What the Rubric Evaluates Against

The rubric evaluates generated specs against multiple anchors, not just one.

### 1. Source Code Reality

Does the spec describe behavior that actually exists in the codebase?

Checks include:
- real control flow
- state-dependent behavior
- error handling and edge cases
- actual integrations and references

### 2. Golden Set Behaviors

Does the spec capture the human-provided behaviors known to matter?

This remains the primary recall and precision anchor.

### 3. Spec Contract / Schema Validity

Does the spec satisfy the expected structure and internal consistency?

Checks include:
- required fields present
- references resolve
- no contradictions across specs
- required blocks are populated

### 4. Ecosystem Expectations

Does the spec include behavior that this kind of project should normally document?

Examples:
- frontend: accessibility, conditional rendering, state transitions, layout intent
- backend: auth, request/response contracts, validation, failure modes
- mobile: navigation state, offline behavior, platform APIs
- CLI/library: command shape, flags, exit behavior, piping

### 5. Comparative Quality

When two spec drafts cover the same area, which one is more faithful and useful?

Comparative evaluation helps surface criteria humans may struggle to score directly.

### 6. Holdout Transfer

Does the criterion still help on future runs, holdout projects, and adjacent codebases?

If a criterion only helps on the trigger case, it is probably overfit.

---

## Rubric Lifecycle States

### Seed

The initial rubric comes from:

- golden set patterns
- universal spec invariants
- ecosystem baseline expectations

Seed criteria are trusted enough to affect official fitness.

### Candidate

A potential new criterion discovered during evaluation.

Entry requirements:
- repeated miss pattern or high-value observation
- evidence linked to code/spec/trace
- analyzer can describe the behavior class

Effect:
- logged only
- does not affect official fitness

### Probation

The candidate is evaluated in shadow mode across future runs.

Entry requirements:
- enough evidence to justify testing
- not obviously redundant with active criteria

Effect:
- shadow scores are computed
- can influence diagnosis
- cannot determine formula survival

### Active

The criterion becomes part of an official rubric snapshot.

Entry requirements:
- recurrence across multiple runs
- ideally recurrence across multiple projects of similar shape
- positive holdout effect
- acceptable precision impact
- approval by governance rule

Effect:
- contributes to official scoring only in later runs using the new frozen snapshot

### Deprecated / Rejected

The criterion is archived or removed.

Common reasons:
- low signal
- redundancy
- easy to game
- excessive false penalties
- poor transfer beyond the trigger case

---

## Rubric Snapshot Model

All formulas in a batch should compete under the same rubric snapshot.

Example:

```yaml
rubric_version: v3
parent_version: v2
active_criteria:
  - completeness_inputs_outputs
  - edge_case_coverage
  - conditional_flow_documentation
weights:
  completeness_inputs_outputs: 1.0
  edge_case_coverage: 1.2
  conditional_flow_documentation: 0.8
effective_from_run: run_020
change_reason:
  - promoted conditional_flow_documentation after repeated support on auth and wizard flows
```

This frozen versioning solves a core problem: if the rubric changes every run, fitness trends become uninterpretable.

---

## Per-Run Workflow

```text
1. Generator produces specs using current formula
2. Evaluator scores specs against:
   - active rubric snapshot
   - golden set
3. Evaluator emits suspected rubric gaps separately
4. Analyzer classifies each finding:
   - true rubric gap
   - or search/recognition/format/prompt failure
5. Discovery records are written
6. Governance step reviews promotion on a slower cadence
7. If promoted, a future rubric snapshot is created
```

### Score Channels

Blueprint Mode should maintain two scoreboards:

#### Official / Anchor Fitness
- golden set recall and precision
- active rubric snapshot only
- used for selection and formula survival

#### Exploratory / Shadow Fitness
- candidate and probationary criteria
- used for diagnosis, trend detection, and promotion decisions
- never used for same-run selection

---

## Why We Do Not Update the Rubric on the Same Run

This is a design guardrail, not just a convenience.

### 1. Prevents goalpost shifting

If the evaluator changes the rubric while scoring the current output, the system can redefine success after seeing the answer.

### 2. Preserves comparability

Formula A and Formula B must be graded on the same test. Same-run rubric mutation makes scores incomparable.

### 3. Prevents self-justifying criteria

A weak formula could indirectly generate a criterion that favors its own output style instead of improving truthfulness.

### 4. Forces evidence accumulation

Good criteria should survive repeated use, not one persuasive run.

### 5. Keeps rubric mutation honest

If a miss can be fixed by better exploration or recognition, the system should fix that first rather than patching the judge.

---

## Minimum Persistent Objects

### Criterion Registry

```yaml
id: conditional_flow_documentation
name: Conditional flow documentation
description: Specs must capture routing or behavior changes caused by runtime or user state
scope:
  ecosystems: [frontend, backend]
  behavior_shapes: [auth_flow, multi_step_wizard]
status: candidate
source: contextual_inference
confidence: 0.78
novelty_score: 0.61
created_in_run: run_014
evidence_count: 3
```

### Discovery Record

```yaml
discovery_id: disc_088
run_id: run_014
candidate_criterion_id: conditional_flow_documentation
trigger: rubric_gap_suspected
source_artifacts:
  - specs/auth.login.yaml
  - src/routes/auth.ts
  - trace/step_07.json
analyzer_summary: Current rubric marks the spec as complete, but it omits conditional redirect logic tied to agreement state
validation_outcome: supporting
```

### Rubric Snapshot

```yaml
rubric_version: v3
parent_version: v2
active_criteria:
  - completeness_inputs_outputs
  - edge_case_coverage
  - conditional_flow_documentation
weights:
  completeness_inputs_outputs: 1.0
  edge_case_coverage: 1.2
  conditional_flow_documentation: 0.8
effective_from_run: run_020
```

---

## Expected Output from Rubric Discovery

Rubric discovery should output **criterion hypotheses**, not immediate live scoring changes.

### 1. Candidate Criterion Proposals

```yaml
candidate_criteria:
  - id: conditional_flow_documentation
    title: Conditional flow documentation
    description: Specs should capture user-state-driven redirects and gated transitions
    rationale: Repeated misses in auth and onboarding flows were not penalized by the current rubric
    applies_to:
      ecosystems: [frontend, backend]
      behavior_shapes: [auth_flow, multi_step_wizard]
    evidence:
      - run_id: run_014
        files: [src/routes/auth.ts, specs/auth.login.yaml]
      - run_id: run_017
        files: [src/onboarding/flow.ts, specs/onboarding.yaml]
    confidence: 0.81
    novelty_score: 0.66
    recommended_state: probation
```

### 2. Discovery Batch Summary

```yaml
rubric_discovery_summary:
  run_id: run_014
  total_candidates: 3
  high_confidence: 1
  rejected_as_noise: 1
  reclassified_as_prompt_failure: 1
  promotion_recommendations:
    - conditional_flow_documentation
```

### 3. Reclassification Output

Many suspected rubric gaps should be rejected.

```yaml
reclassified_findings:
  - finding_id: gap_022
    original_label: suspected_rubric_gap
    final_label: recognition_failure
    reason: The agent read the file but failed to interpret state-based branching already covered by active criteria
```

### 4. Promotion Recommendation

```yaml
promotion_recommendation:
  criterion_id: conditional_flow_documentation
  current_state: probation
  recommendation: promote
  reasons:
    - supported in 4 runs
    - improved holdout detection
    - low overlap with existing criteria
  risks:
    - may overlap with generic flow completeness if kept too broad
```

---

## Operational Findings and Guardrails

### 1. Rubric gap is easy to over-diagnose

It is tempting to call every miss a rubric gap. That hides real failures in exploration or understanding.

### 2. Adaptive rubric should optimize coverage, not verbosity

A bad criterion often rewards bigger specs rather than truer specs. Promotion should track whether a criterion improves fidelity, not just document length.

### 3. Behavior shape may matter more than framework

Rubric transfer may cluster around behavioral shapes such as:

- auth-heavy systems
- multi-step workflows
- event-driven systems
- data pipelines
- SDK/library contracts

This may prove more useful than ecosystem alone.

### 4. Negative evidence must be first-class

Track when a candidate criterion adds noise, duplicates another criterion, or creates false penalties.

### 5. Rubric evolution needs its own budget

If criteria can only be added, the rubric will bloat. The system should force merge, prune, or reject weak criteria.

---

## Staged Rollout

### MVP
- discovery only
- log candidate criteria
- no official scoring impact
- human reviews promotions

### Intermediate
- add candidate -> probation -> active lifecycle
- compute shadow scores
- promote only after recurrence and holdout support

### Advanced
- controlled weight tuning
- comparative learning for merges/splits
- later, train a judge model after rubric churn stabilizes

---

## Further Reading

- [Rubric Discovery](../../concepts/rubric-discovery.md) -- Research background and discovery mechanisms
- [Spec Formula](00-spec-formula.md) -- Formula output includes evaluation rubric
- [Evolution System](01-evolution-system.md) -- Failure types, mutation tiers, and fitness loop
- [Multi-Agent Harness](02-multi-agent-harness.md) -- Generator, Evaluator, Analyzer, Mutator roles
