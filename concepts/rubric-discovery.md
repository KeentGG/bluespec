# Rubric Discovery

> The Self-Evolving capability where agents autonomously formulate and refine evaluation criteria, rather than operating against fixed human-defined rubrics.

**Source:** Analysis of "A Survey on Agent-as-a-Judge" (You et al., 2026) [research_papers/04-agent-as-judge-survey-2026.pdf]

---

## Core Concept

**Traditional evaluation** uses fixed criteria defined upfront by humans. The agent's job is to measure outputs against these predetermined standards.

**Rubric Discovery** enables agents to:
- **Discover what to evaluate** dynamically based on the evaluand
- **Formulate evaluation criteria** appropriate to the specific context
- **Refine rubrics** as they encounter new types of inputs

> *"Unlike general agents focused on task completion, Judge Agents have the distinct capability to autonomously formulate and refine rubrics, representing a hallmark of the Self-Evolving stage."*

---

## Three Mechanisms of Rubric Discovery

### 1. External Discovery (EvalAgents [53])

**Approach:** Query Generator plans web searches to discover implicit evaluation criteria.

**How it works:**
- Agent searches external sources for domain-specific standards
- Discovers criteria like "vivid sensory details" for travel writing or "prop validation" for React components
- Incorporates discovered criteria into the evaluation rubric

**Example:**
```
Input: Travel blog post to evaluate
Action: Search "what makes good travel writing"
Discovered criteria: ["vivid sensory details", "practical tips", "personal narrative arc"]
Rubric updated: Now evaluates against these discovered criteria
```

**Paper:** Wadhwa et al., "EvalAgents: Discovering implicit evaluation criteria from the web" (2025)

---

### 2. Contextual Inference (AGENT-X [45])

**Approach:** Adaptive Router infers domain context and generates appropriate evaluation guidelines.

**How it works:**
- Router agent analyzes the input to detect domain/type
- Dynamically selects or generates rubric appropriate to that domain
- Different rubrics for different contexts (React components vs API docs vs math solutions)

**Example:**
```
Input: Code file to evaluate
Analysis: Detects React component with hooks
Generated rubric: ["prop validation", "hook usage", "accessibility attributes"]

Input: API documentation
Analysis: Detects endpoint documentation
Generated rubric: ["endpoint coverage", "example completeness", "error code documentation"]
```

**Key capability:** *"Dynamically selects the most relevant base agents based on intermediate analysis results"*

**Paper:** Li et al., "Agent-x: Adaptive guideline-based evaluation" (ACL Findings 2025)

---

### 3. Comparative Learning (OnlineRubrics [55])

**Approach:** Learn evaluation criteria from pairwise comparisons using reinforcement learning.

**How it works:**
- Present agent with pairwise comparisons (A vs B)
- Human or oracle indicates which is better
- Agent infers implicit criteria from comparison patterns
- Rubric evolves to detect reward hacking (models gaming the metric)

**Example:**
```
Comparison: Code solution A vs B
Feedback: B is better
Inference: B has more complete error handling
Learned criterion: "error handling completeness"

Next evaluation: Check error handling completeness
```

**Key innovation:** The rubric itself is a learned parameter, not a fixed prompt.

**Paper:** Rezaei et al., "Online rubrics elicitation from pairwise comparisons" (2025)

---

## Comparison: Fixed vs. Discovered Rubrics

| Dimension | Fixed Rubric (Traditional) | Discovered Rubric (Self-Evolving) |
|-----------|---------------------------|-----------------------------------|
| **Source of criteria** | Human-defined upfront | Agent-discovered or inferred |
| **Adaptability** | Static across all evaluations | Dynamic per evaluand |
| **Coverage** | Limited to human foresight | Expands to cover discovered patterns |
| **Domain specificity** | Generic or manually specialized | Automatically context-appropriate |
| **Evolution** | Manual updates only | Continuous learning from comparisons |

---

## Implications for Blueprint Mode

### Current State (Fixed Rubric)

Blueprint Mode uses a **golden set**—human-provided behaviors that serve as ground truth:

```yaml
evaluation:
  criteria:
    - coverage: "does spec cover all exported functions?"
    - completeness: "does each spec have inputs, outputs, edge cases?"
    - accuracy: "if you generate code from spec, does it match original?"
    - consistency: "do cross-references resolve?"
```

The **what** is hardcoded. Evolution only optimizes **how** to achieve these metrics.

---

### Potential Evolution (Dynamic Rubric Discovery)

**Scenario:** Generator produces a spec for a complex authentication flow with conditional redirects.

**Current approach:**
- Evaluator checks against fixed criteria
- May miss that "conditional routing" is a critical pattern worth documenting

**With Rubric Discovery:**
1. **Analyzer detects:** "This auth flow has conditional redirects based on user state"
2. **Analyzer infers:** "Conditional routing is a critical pattern that should be in the rubric"
3. **Mutator updates:** Formula now includes `conditional_flow_documentation` as a criterion
4. **Next run:** Evaluator checks whether specs document conditional behavior

**The rubric itself evolves** based on what the codebase actually contains.

---

## New Failure Mode: Rubric Gap

With Rubric Discovery, the Analyzer gains a new failure category:

| Current Failure Types | New Failure Type |
|----------------------|------------------|
| Search failure | **Rubric gap failure** |
| Recognition failure | "The spec is complete by current rubric standards, |
| Format failure | but misses critical behavior that should have been |
| Prompt failure | in the rubric" |

---

## New Mutation Type: Rubric Mutation

The Mutator Agent gains a new mutation category:

| Current Mutations | New Mutation |
|-------------------|--------------|
| Prompt changes | **Rubric mutation** |
| Step insertion | Add/remove/modify evaluation dimensions |
| Step reordering | Based on discovered patterns |
| Format changes | |
| Tool changes | |

---

## Key Insight

The Self-Evolving stage isn't just about *improving how you evaluate*—it's about *discovering what to evaluate in the first place*.

| | Fixed Rubric | Discovered Rubric |
|---|---|---|
| **Initial state** | Human defines what matters | Minimal or no human criteria |
| **Evolution target** | Learn how to find those things | Learn both *what matters* and *how to find it* |
| **Human role** | Curate golden sets | Provide pairwise feedback or minimal seed |

---

## Related Concepts

- **Procedural Agent-as-a-Judge** - Fixed workflows, predetermined rubrics
- **Reactive Agent-as-a-Judge** - Adaptive routing, conditional rubric selection
- **Self-Evolving Agent-as-a-Judge** - Autonomous rubric formulation and refinement
- **Golden Set** - Human-provided ground truth behaviors (Blueprint Mode's current approach)
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
**Related:** [Spec Formula](../docs/evolution/00-spec-formula.md), [Evolution System](../docs/evolution/01-evolution-system.md), [Multi-Agent Harness](../docs/evolution/02-multi-agent-harness.md)
