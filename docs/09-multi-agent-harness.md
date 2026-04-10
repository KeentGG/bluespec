# Multi-Agent Harness

> The team of AI agents that automate the evolution loop.
> Status: ACTIVE DISCUSSION

---

## Why Multiple Agents

One agent can't do this alone. The work requires:
- Running a formula against a codebase (heavy exploration)
- Evaluating output quality (requires different perspective)
- Diagnosing failures (requires analytical reasoning)
- Mutating formulas (requires creative problem-solving)

Each role benefits from a fresh context window and specialized prompts.

---

## Agent Roles

### Generator Agent(s)

Runs the current formula against a codebase. Produces spec files.

**Inputs:** formula, codebase path, config
**Outputs:** spec files, execution trace

The generator follows the formula's steps: explore -> analyze -> draft -> verify -> cross-ref. It's the worker that produces the actual specs.

### Evaluator Agent

Checks specs against golden behaviors (recall) and spot-checks for hallucinations (precision).

**Inputs:** generated specs, golden set, source code
**Outputs:** { hits: [], misses: [], false_positives: [] }

The evaluator also scores:
- Coverage: does the spec set cover all exported functions/components?
- Completeness: does each spec have inputs, outputs, edge cases, error handling?
- Accuracy: if you generate code from the spec, does it match the original?
- Consistency: do cross-references resolve? No contradictions?

### Analyzer Agent

Reads misses + false_positives. Diagnoses WHY the formula missed this.

**Inputs:** evaluation results, execution trace, formula
**Outputs:** { diagnosis: "...", suggested_mutation: "..." }

The analyzer diagnoses failure types:
- Was it a **search failure**? (didn't look in the right files)
- Was it a **recognition failure**? (saw the code but didn't understand the behavior)
- Was it a **format failure**? (understood it but the spec schema had no place to put it)
- Was it a **prompt failure**? (instructions didn't ask for this kind of behavior)

Each failure type requires a different mutation. Getting the diagnosis right is what makes the evolutionary loop converge.

### Mutator Agent

Takes the suggested mutation. Produces a new candidate formula.

**Inputs:** current formula, diagnosis, lessons_learned
**Outputs:** new candidate formula

The mutator also checks the teaching method tracker: has this type of fix been tried on this type of failure before? If yes, try something different.

---

## The Orchestrator

The orchestrator is the state machine that manages the loop:

```
Orchestrator (state machine)
  |
  +-- Generator Agent(s)
  |     Runs current formula against codebase
  |     Produces spec files
  |
  +-- Evaluator Agent
  |     Checks specs against golden_behaviors (recall)
  |     Spot-checks for hallucinations (precision)
  |     Scores: coverage, completeness, accuracy
  |     Produces: { hits: [], misses: [], false_positives: [] }
  |
  +-- Analyzer Agent
  |     Reads misses + false_positives
  |     Diagnoses: WHY did the formula miss this?
  |     Produces: { diagnosis: "...", suggested_mutation: "..." }
  |
  +-- Mutator Agent
  |     Takes suggested_mutation
  |     Produces new candidate formula
  |
  Loop back to Generator with new formula
```

---

## Context Drift: The Real Problem

AI agents are powerful but unreliable for complex, multi-step tasks. When you ask an agent to "understand this codebase and document it," you get inconsistent, incomplete, unstructured results. The agent doesn't know:
- What to look for
- What format to output
- When it's done
- How to verify its own work
- What to do next

Even with strict instructions, as the agent explores and accumulates context, it can drift from the rules. The longer the chain, the more it loses the format rules. Instructions at the start of a 20-step chain get drowned out by accumulated context.

### The 35-Minute Rule

Research shows every agent experiences performance degradation after ~35 minutes of work. Context drift compounds -- a 2% misalignment at step 5 becomes 40% failure by step 15.

Why it happens:
- Earlier instructions get pushed out of the context window
- The agent's most recent actions start defining its goal more than the original prompt
- Each step introduces small interpretation changes that compound

---

## Ephemeral Agents, Persistent State

The solution: every agent session is disposable. Assume it's the last run.

```
Agent session lifecycle:
  1. Read: lessons_learned.json, current_formula.json, state.json
  2. Do: one job (generate, evaluate, analyze, or mutate)
  3. Write: results + any new observations to persistent files
  4. Die: session ends, context is gone

Next session:
  1. Read the files the previous agent wrote
  2. Continue from there
```

The **files are the memory**. The agent is just a transient processor. This solves:
- No context drift (fresh context every time)
- No 35-minute degradation (each session is short)
- No "agent forgot what it was doing" (state is in files, not context)
- Any model can pick up where another left off

The tradeoff is cold start cost -- each session needs to load context from files. But that's a small price for reliability.

---

## Persistent Files (The "Brain")

```
/formulas/
  baseline.json              # universal backbone
  ecosystem/
    frontend.json            # frontend specialization
    backend.json             # backend specialization
/lessons/
  learned.json               # what teaching methods worked
  failed.json                # what didn't work, don't retry
/state/
  current_formula.json       # active formula being tested
  evaluation_results.json    # last run's scores
  golden_set.json            # human-provided ground truth
/runs/
  run_001/
    formula_v1.json          # exact formula used
    specs/                   # generated specs
    evaluation.json          # scores
    trace.json               # step-by-step execution trace
  run_002/
    formula_v2.json          # mutated formula
    specs/
    evaluation.json
    trace.json
```

---

## Ephemeral Agents (The "Hands")

Each reads files, does one job, writes files, exits.

---

## Agent Lifecycle Question

Are agents cleared on every evolution cycle, or only after they reached some number of cycles?

The answer so far: clear on every cycle, but document everything. We document because agents have limited context -- we can't keep the same agent working indefinitely. Even with compacted conversation, sometimes having fresh context makes the agent think clearly.

Document everything assuming the agent's session is their last run and will be taken over by another agent session.

---

## What Does "100% Follow the Expected Flow" Mean

We need a systematic way of guiding agent AI to make sure it follows the expected flow. But with current models, 100% is probably impossible. Even with perfect prompts, agents will sometimes skip steps, misunderstand, or hallucinate.

The harness needs to be **resilient to imperfect agents**, not dependent on perfect instruction following. That means: verification gates that catch drift, not just prompts that prevent it. Assume the agent will mess up, build detection and recovery, not just prevention.

---

## Further Reading

- [Evolution System](08-evolution-system.md) -- The loop these agents execute
- [Spec Formula](07-spec-formula.md) -- What the agents produce and evolve
- [Agent Orchestration](03-agent-orchestration.md) -- Original agent roles and context management
- [Research](10-research.md) -- Papers on agent evaluation, context drift, self-reflection
