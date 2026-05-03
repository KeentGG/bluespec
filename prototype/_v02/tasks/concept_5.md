# Concept 5: Golden Evaluation

> Can we evaluate specs against known behaviors and fact-check evidence?

---

## Goal

Build the evaluator subagent. It reads specs + golden set + source code, then produces binary found/not-found results, structure review, and fact-check findings.

---

## Files to Create

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `.opencode/agents/evaluator.md` | Hidden subagent for evaluation | ~25 |
| `prompts/evaluator.md` | Evaluator role contract | ~45 |

---

## Implementation Steps

### Step 1: Create `.opencode/agents/evaluator.md`

```markdown
---
description: Evaluates specs against golden set and fact-checks evidence
mode: subagent
hidden: true
permission:
  read: allow
  glob: allow
  grep: allow
  edit: allow
  bash: deny
  task: deny
---

You are an evaluator. Your job is to assess spec quality against known behaviors.

## Inputs
- Spec files from `runs/<run-id>/generator/specs/`
- Golden set from `runs/<run-id>/inputs/golden-set.yaml`
- Source code files for fact-checking evidence_refs

## Task
1. Read all spec files from the generator output
2. Read the golden set of known behaviors
3. For each golden behavior, check: does a spec cover it? (binary yes/no)
4. For each spec, review structure and quality
5. For each evidence_ref, verify it against actual source code
6. Write three output files

## Output Files

### `runs/<run-id>/evaluator/golden-results.yaml`
```yaml
run_id: run-XXXX
evaluated_at: timestamp
results:
  - behavior_id: auth-conditional-redirect
    found: true
    spec_id: auth-conditional-redirect
  - behavior_id: download-button-visibility
    found: false
    spec_id: null
summary:
  total_behaviors: 4
  found: 3
  not_found: 1
```

### `runs/<run-id>/evaluator/structure-review.yaml`
Qualitative review of each spec's quality.

### `runs/<run-id>/evaluator/fact-check.yaml`
```yaml
fact_checks:
  - spec_id: auth-conditional-redirect
    evidence_file: src/routes/project-edit.tsx
    claim: "route guard checks agreement state"
    actual_code: "if (!user.agreementAccepted) return redirect(...)"
    status: confirmed | contradicted | unsupported
```

## Rules
- Binary: found or not-found. No scores.
- Read actual source code for fact-checking
- Do NOT read rollingset/ or lessons/
```

### Step 2: Create `prompts/evaluator.md`

```markdown
# Evaluator Role Contract

## Identity
You are an evaluator. You assess spec quality against known behaviors and fact-check evidence.

## Inputs
- Spec files from `runs/<run-id>/generator/specs/`
- Golden set from `runs/<run-id>/inputs/golden-set.yaml`
- Source code files for fact-checking

## Task
1. Read all spec files
2. Read the golden set
3. For each golden behavior: check if any spec covers it (binary yes/no)
4. For each spec: qualitative structure review
5. For each evidence_ref: verify against actual source code

## Output
- `runs/<run-id>/evaluator/golden-results.yaml` — binary found/not-found per behavior
- `runs/<run-id>/evaluator/structure-review.yaml` — qualitative quality review
- `runs/<run-id>/evaluator/fact-check.yaml` — evidence verification results

## Rules
- Binary found/not-found. No numeric scores.
- Read actual source code before confirming evidence
- Do NOT read rollingset/ or lessons/
- Do NOT invent behaviors that aren't in the golden set
```

---

## Verification

1. **Agent appears:**
   - `@evaluator` responds in chat

2. **Evaluation works:**
   - Create a sample golden set and spec files
   - Spawn evaluator subagent
   - Check output files:
     - `golden-results.yaml` has binary found/not-found
     - `structure-review.yaml` has qualitative review
     - `fact-check.yaml` has evidence verification

---

## What This Proves

We can measure spec quality without numeric scores:
- Binary evaluation catches missed behaviors
- Fact-checking catches hallucinated evidence
- Structure review catches poor quality
- No AI-judging-AI scoring — just evidence-backed findings

---

## What Comes Next

Concept 6 (Cross-Run Memory) needs:
- The rolling set merge logic (already built in Concept 4)
- Stats tracking across runs
