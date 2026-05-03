# Concept 2: Exploration

> Can an AI agent explore a real codebase and identify behavioral patterns worth documenting?

---

## Goal

Build the harness agent that can explore a codebase, identify behavioral areas, and produce structured output with evidence_refs. The agent must NOT read golden-set.yaml or rollingset/.

---

## Files to Create

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `.opencode/agents/harness.md` | Primary agent definition | ~25 |
| `prompts/explorer.md` | Explorer role contract | ~40 |
| `prompts/shared/failure-types.md` | 5-type failure taxonomy | ~55 |

---

## Implementation Steps

### Step 1: Create `.opencode/agents/harness.md`

The primary agent. Has full tool access but restricted bash (only cli.js).

```markdown
---
description: Blueprint Mode evolution cycle orchestrator
mode: primary
permission:
  edit: allow
  bash:
    "node scripts/cli.js *": allow
    "*": deny
  task:
    "spec-generator": allow
    "*": deny
  skill:
    "blueprint-harness": allow
---

You are the Blueprint Mode harness orchestrator.

Your job: execute one bounded evolution cycle, then STOP.

## What You Know
- You have access to glob, grep, read, write tools for codebase exploration
- You can call `node scripts/cli.js` for lifecycle operations
- You have a formula that tells you how to explore and what to look for

## What You Must NOT Know
- Do NOT read `goldens/` directory (hidden test — evaluator uses it)
- Do NOT read `runs/rollingset/` (cross-run memory — analyzer uses it)
- Do NOT read `lessons/` (insanity prevention — mutator uses it)

## Your Mission
1. Read `state/current.yaml` to get the active formula and project
2. Read the frozen formula from `runs/<run-id>/inputs/formula.yaml`
3. Follow the formula's explore step to explore the codebase
4. Identify behavioral patterns worth documenting
5. Output structured exploration results with evidence_refs
```

### Step 2: Create `prompts/explorer.md`

The explorer role contract. This is what the harness agent reads to understand how to explore.

```markdown
# Explorer Role Contract

## Identity
You are a codebase explorer. Your job is to understand the structure and behavioral patterns of the codebase.

## Inputs
- Codebase path from project config
- Behavioral shapes to look for (from formula)
- Prior exploration notes (if resuming)

## Task
1. List all source files using glob
2. Identify potential behavioral areas (auth, state, UI, API, etc.)
3. For each area, list evidence files that contain the behavior
4. For key files, read them to discover specific conditional flows
5. Output structured results with evidence_refs

## Output Format
```yaml
file_tree:
  - src/path/to/file.ts

behavior_candidates:
  - id: kebab-case-id
    description: what the behavior does
    evidence_refs:
      - file: src/path/to/file.ts
        lines: "10-25"
        snippet: "actual code snippet"
    confidence: 0.0-1.0

conditional_flows_discovered:
  - id: kebab-case-id
    description: what the flow does
    guard_conditions:
      - "user.isAuthenticated"
      - "report.progress >= download_stage"
    render_mode: hidden | visible-disabled | visible-enabled | redirect
    evidence_refs: []
```

## Rules
- Read actual source files to verify claims
- Include real code snippets in evidence_refs
- Flag files that are infrastructure vs business logic
- DO NOT guess — if you can't find the behavior, say so
- DO NOT read golden-set.yaml
```

### Step 3: Create `prompts/shared/failure-types.md`

The 5-type failure taxonomy. Used by the analyzer (Concept 7) but defined here so it's available.

```markdown
# Failure Types

Use these labels consistently:

- `search_failure`
- `recognition_failure`
- `format_failure`
- `prompt_failure`
- `rubric_gap_failure`

## Decision Tree

Apply in order. Stop at the first matching type.

### 1. `search_failure` — Generator never found the relevant files

**Signal**: Explore step has `files_analyzed: []` or key files are absent.
**Rule out**: If files were analyzed and behavioral artifacts exist, continue to step 2.

### 2. `recognition_failure` — Found files but collapsed the pattern

**Signal**: Explore step identified files, but draft step did not produce a dedicated spec section.
**Rule out**: If the spec has a dedicated section for the missed behavior, continue to step 3.

### 3. `format_failure` — Output doesn't match the spec schema

**Signal**: Validation errors or inconsistent field coverage.
**Rule out**: If schema is satisfied, continue to step 4.

### 4. `prompt_failure` — Formula never asked for this behavior

**Signal**: The formula's prompts don't list this behavior class as required output.
**Check**: Compare missed behavior against `formula.steps[].outputs`.
**Rule out**: If formula already lists this behavior class, continue to step 5.

### 5. `rubric_gap_failure` — Rubric genuinely lacks a criterion

**Signal**: The rubric has no criterion for this behavior. Only valid after steps 1-4 exhausted.

## Rules
- `rubric_gap_failure` is only valid when the current rubric genuinely lacks a criterion
- Exhaust lower-tier explanations before proposing rubric gaps
```

---

## Verification

1. **Agent appears in OpenCode:**
   - Open OpenCode in `prototype/_v02/`
   - Switch to harness agent with Tab
   - Verify it appears as "harness" in the agent list

2. **Agent can explore:**
   - Ask harness: "Explore the blueprint-mode project at `../../` and list all behavioral areas"
   - Observe: uses glob/grep/read tools
   - Observe: produces behavior_candidates with evidence_refs
   - Observe: does NOT try to read golden-set.yaml

3. **Agent respects isolation:**
   - Ask harness: "Read goldens/projects/sample-project/behaviors.yaml"
   - Expected: agent should NOT be able to read it (or should refuse)

---

## What This Proves

The agent can do useful codebase exploration:
- Identifies behavioral areas from file structure
- Reads source files to understand patterns
- Produces structured output with evidence
- Respects isolation rules (doesn't read golden set)

---

## What Comes Next

Concept 3 (Spec Production) needs:
- A spec-generator subagent that can read exploration results and write specs
- A spec schema that defines the output format
