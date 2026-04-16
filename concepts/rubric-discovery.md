# Rubric Discovery

> The Self-Evolving capability where agents discover possible evaluation criteria, but only promote them through a governed lifecycle.

**Source:** Analysis of "A Survey on Agent-as-a-Judge" (You et al., 2026) [research_papers/04-agent-as-judge-survey-2026.pdf]

---

## Core Concept

**Traditional evaluation** uses fixed criteria defined upfront by humans.

**Rubric Discovery** adds a second capability:
- discover what else may need to be evaluated
- formulate candidate criteria appropriate to the codebase or project type
- refine those candidates over time

The key Blueprint Mode interpretation is stricter than the broad research framing:

> discovered criteria are **hypotheses first**, not live scoring rules.

That distinction matters. Without it, the evaluator can change the test after seeing the answer.

---

## Why Govern Discovery Instead of Updating the Rubric Immediately

Research on self-evolving judges is useful, but Blueprint Mode cannot safely use same-run live rubric mutation.

### 1. Same-run updates shift the goalpost

If the evaluator discovers a criterion and immediately scores the current formula with it, the system is redefining success after the output already exists.

### 2. It destroys comparability across runs

Two formulas cannot be compared fairly if they were graded under different rubrics inside the same experiment window.

### 3. It enables self-justifying criteria

A weak formula could indirectly cause the system to invent criteria that reward its own style instead of truthfulness.

### 4. Many “rubric gaps” are not real rubric gaps

What looks like a missing criterion is often:
- search failure
- recognition failure
- prompt failure
- format failure

Rubric mutation should be the late diagnosis, not the convenient one.

### 5. Good criteria need repeated evidence

If a criterion is real, it should recur across multiple runs or adjacent projects. One run is too weak a basis for promotion.

---

## Three Mechanisms of Rubric Discovery

### 1. External Discovery (EvalAgents [53])

**Approach:** Query Generator plans web searches to discover implicit evaluation criteria.

**How it works:**
- search external sources for domain standards
- discover criteria that may matter for a given project shape
- convert findings into candidate criteria

**Blueprint Mode use:**
- best used as a weak prior or seed source
- should not directly activate a new criterion without internal evidence from code/spec evaluation

**Paper:** Wadhwa et al., "EvalAgents: Discovering implicit evaluation criteria from the web" (2025)

---

### 2. Contextual Inference (AGENT-X [45])

**Approach:** Infer domain context and generate appropriate evaluation guidelines.

**How it works:**
- analyze the evaluand to detect project type or behavior shape
- propose criteria that match that context
- emit candidate criteria with scope and rationale

**Blueprint Mode use:**
- likely the most useful first mechanism
- grounded in actual code and spec misses rather than outside theory

**Paper:** Li et al., "Agent-x: Adaptive guideline-based evaluation" (ACL Findings 2025)

---

### 3. Comparative Learning (OnlineRubrics [55])

**Approach:** Learn evaluation criteria from pairwise comparisons.

**How it works:**
- compare spec A vs spec B
- determine which is better
- infer latent criteria from repeated preferences
- convert those criteria into candidate rubric updates

**Blueprint Mode use:**
- useful once enough run history exists
- especially good for surfacing criteria humans find easier to compare than score directly

**Paper:** Rezaei et al., "Online rubrics elicitation from pairwise comparisons" (2025)

---

## Comparison: Fixed vs. Governed Discovery

| Dimension | Fixed Rubric | Governed Rubric Discovery |
|-----------|--------------|---------------------------|
| **Source of criteria** | Human-defined upfront | Human-seeded + agent-proposed |
| **Adaptability** | Static | Adaptive, but versioned |
| **Scoring stability** | High | High if frozen per batch |
| **Coverage growth** | Limited to human foresight | Expands through evidence-backed discovery |
| **Failure risk** | Misses unseen patterns | Risks bloat/drift without governance |

---

## Implications for Blueprint Mode

### Current State

Blueprint Mode already has a strong anchor:

```yaml
evaluation:
  criteria:
    - coverage: does spec cover all exported functions/components?
    - completeness: does each spec have inputs, outputs, edge cases?
    - accuracy: if code were generated from the spec, would it match the original?
    - consistency: do cross-references resolve?
```

The golden set and fixed rubric establish what official fitness means.

### Governed Evolution

With rubric discovery enabled, the system can notice patterns the seed rubric missed.

Example:
1. Evaluator sees a spec for an auth flow marked “complete” by the active rubric
2. Analyzer notices the spec omitted conditional redirect behavior tied to user state
3. System records a **candidate criterion** such as `conditional_flow_documentation`
4. Future runs test it in shadow mode
5. Only after repeated support does it enter an official rubric snapshot

The rubric evolves, but on a slower, governed cadence.

---

## What Rubric Discovery Should Output

Rubric discovery should output **structured candidate artifacts**, not immediate rubric edits.

### Candidate Criterion Proposal

```yaml
candidate_criteria:
  - id: conditional_flow_documentation
    description: Specs should capture routing or behavior changes caused by runtime state
    source: contextual_inference
    rationale: Current rubric marked auth spec complete despite missing user-state redirect logic
    confidence: 0.81
    recommended_state: probation
```

### Discovery Summary

```yaml
rubric_discovery_summary:
  run_id: run_014
  total_candidates: 3
  high_confidence: 1
  rejected_as_noise: 1
  reclassified_as_recognition_failure: 1
```

### Reclassification Output

```yaml
reclassified_findings:
  - finding_id: gap_022
    original_label: suspected_rubric_gap
    final_label: recognition_failure
    reason: Active rubric already covered the behavior class; the generator failed to interpret it
```

### Promotion Recommendation

```yaml
promotion_recommendation:
  criterion_id: conditional_flow_documentation
  recommendation: promote
  reasons:
    - repeated support across multiple runs
    - positive holdout impact
    - low overlap with current active criteria
```

---

## New Failure Mode: Rubric Gap

Rubric discovery adds a new failure type, but it should be used carefully.

**Rubric gap failure** means:

> the spec is acceptable by current rubric standards, yet still misses an important behavior class that the rubric itself should have penalized.

This should only be diagnosed after ruling out lower-tier failures.

---

## New Mutation Type: Rubric Mutation

Rubric mutation is the act of adding, modifying, merging, weighting, or retiring criteria.

In Blueprint Mode, rubric mutation should happen through lifecycle states:

```text
candidate -> probation -> active -> deprecated/rejected
```

Not through direct same-run replacement.

---

## Key Insight

The Self-Evolving stage is not just about improving **how** the system evaluates.

It is also about discovering **what else matters**.

But the moment that discovery affects official scoring, it becomes part of governance, not just research.

That is why Blueprint Mode needs both:
- the research idea of dynamic rubric discovery
- the operational discipline of frozen snapshots, provenance, and delayed promotion

---

## Related Concepts

- **Procedural Agent-as-a-Judge** - Fixed workflows, predetermined rubrics
- **Reactive Agent-as-a-Judge** - Adaptive routing, conditional rubric selection
- **Self-Evolving Agent-as-a-Judge** - Autonomous rubric formulation and refinement
- **Golden Set** - Human-provided ground truth behaviors
- **Rubric Lifecycle** - The governed promotion path from candidate criterion to official scoring
- **Teaching Method Tracker** - Records which fixes work for which failure types

---

## References

1. You et al. (2026). "A Survey on Agent-as-a-Judge." arXiv:2601.05111v1 [cs.CL]
2. Wadhwa et al. (2025). "EvalAgents: Discovering implicit evaluation criteria from the web." Second Conference on Language Modeling.
3. Li et al. (2025). "Agent-x: Adaptive guideline-based evaluation." ACL Findings 2025.
4. Rezaei et al. (2025). "Online rubrics elicitation from pairwise comparisons." arXiv:2510.07284.

---

**Status:** Research synthesis  
**Created:** 2026-04-11  
**Updated:** 2026-04-15  
**Related:** [Rubric Lifecycle](../docs/evolution/04-rubric-lifecycle.md), [Spec Formula](../docs/evolution/00-spec-formula.md), [Evolution System](../docs/evolution/01-evolution-system.md), [Multi-Agent Harness](../docs/evolution/02-multi-agent-harness.md)
