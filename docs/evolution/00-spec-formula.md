# Spec Formula

> The compilation of spec format, steps, guidelines, tools, and evaluation rubric that produces the most comprehensive spec for a given project type.
> Status: ACTIVE DISCUSSION

---

## What Is a Spec Formula

A spec formula is not just a YAML schema. It's the entire recipe for producing specs:

- What steps to take (explore -> analyze -> draft -> verify)
- What prompts to use at each step
- What tools to call
- What validation checks to run
- What format the output should follow
- What evaluation rubric to use

The formula is the **compile target**. The project's real goal is to evolve these formulas, not hand-write them.

A formula is a compilation of:
- spec format
- steps
- guidelines
- tools

to produce the most comprehensive spec out there.

---

## Why Formulas, Not Fixed Formats

One initial observation was the question of whether there should be a rigid spec structure to follow. The answer is no -- it depends on the codebase. Even with strict format guides (A -> B -> C, or B -> D -> C), in the middle of context exploration, the agent will hallucinate and not follow the rules.

The process of producing spec content is systematic but with the creativity of the agent AI's model. The framework controls:
- What the agent does next (prompt chain order)
- What format the output takes (YAML schema)
- What gets verified before proceeding (gates)

But the agent's model brings:
- Understanding *why* code exists, not just what it does
- Inferring edge cases from comments, test patterns, naming conventions
- Judging confidence
- Connecting dots across files

The schema says "include a confidence score" -- but it's the model that decides 0.92 vs 0.6 based on test coverage, code clarity, documentation quality.

**Constrain the container, not the content.**

---

## The Formula Output

A formula produces more than just spec files:

```
formula_output = {
  spec_format: { ... },      # what specs look like
  steps: [ ... ],            # how to produce them
  evaluation_rubric: { ... } # how to judge them (generated, not fixed)
}
```

The evaluation rubric itself should be generated per project type, not hardcoded. The formula doesn't just produce specs -- it also produces the rubric for evaluating those specs.

---

## Ecosystem Taxonomy

Formulas split by **software shape**, not framework. React/Vue/Angular all are frontend components and share similarities in software design pattern. There should not be different formulas for React vs Vue vs Angular. But there should be different formulas for frontend vs backend vs mobile vs game development.

### Baseline (All Formulas Share)

Every formula includes a universal backbone:

- **Core envelope:** title, type, status, owner, intent, audience, scope, links
- **Universal steps:** explore -> analyze -> draft -> verify -> cross-ref
- **Universal validation:** schema valid, refs resolve, no contradictions
- **Universal blocks:** inputs, outputs, edge cases, error handling

### Ecosystem Specializations

Each ecosystem adds domain-specific blocks to the baseline:

**Frontend** (React, Vue, Svelte, Angular, mobile UI):
- Component states, lifecycle, layout, accessibility, styling
- ComponentSpec with layout definitions
- UI interaction behavior

**Backend API** (Node, Python, PHP, Go, Rust):
- Endpoints, auth, request/response schemas, rate limiting, middleware
- IntegrationSpec for external APIs
- FunctionSpec for business logic

**Mobile** (iOS, Android, Flutter, React Native):
- Screen navigation, platform APIs, offline state, push notifications

**Game** (Unity, Unreal, Godot):
- Game states, input mapping, physics, rendering pipeline, asset refs

**CLI / Library:**
- Command structure, arguments, help text, exit codes, piping

---

## Non-Linear Exploration

Real code exploration is a graph, not a pipeline:

```
Scan structure -> find auth module -> deep dive ->
  discover it calls payments -> branch to explore payments ->
    find shared types -> branch to explore types ->
  come back to auth -> now auth looks different ->
finish
```

The formula must account for this. The agent discovers things mid-exploration that change what earlier steps should have been. The exploration state machine handles this through conditional routing: what the agent found determines what happens next, not a fixed sequence.

---

## How Spec Format Connects to the Formula

The spec format isn't just documentation -- it's the **contract between prompt chain steps**:

- The exploration prompt chain outputs specs in this format
- The verification step validates specs against this schema
- The implementation prompt chain reads specs in this format to generate code
- The sync prompt chain diffs specs in this format to detect drift

The format serves the prompts. The prompts serve the agents. The agents serve the developer.

---

## Spec Formula as Evolution Target

The formula is what gets evolved. Each evolution cycle:
1. Run the current formula against a codebase
2. Evaluate the output
3. Diagnose failures
4. Mutate the formula
5. Run again

Over time, the formula converges on the best recipe for producing comprehensive specs for a given project type.

The project will go through iterative process and evolution to create the best and most suitable spec formula for each kind of project. That's why one of the initial milestones is to create the backbone essential for evolution training and procedurally generated spec formulas.

---

## Further Reading

- [Evolution System](evolution/01-evolution-system.md) -- How formulas are evolved
- [Multi-Agent Harness](evolution/02-multi-agent-harness.md) -- The agents that run formulas
- [Spec Format](production/00-spec-format.md) -- The YAML schemas formulas produce
- [Research](evolution/03-research.md) -- Scientific papers and findings
