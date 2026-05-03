# Concept 8: Mutation

> Can we improve the explore prompt based on diagnosis, with contamination guardrail?

---

## Goal

Build the mutator subagent. It reads analyzer diagnosis + lesson history, then proposes an improved explore step prompt. The contamination guardrail ensures mutations stay project-agnostic.

---

## Files to Create

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `.opencode/agents/mutator.md` | Hidden subagent for mutation | ~30 |
| `prompts/mutator.md` | Mutator role contract | ~45 |
| `prompts/shared/contamination.md` | Contamination guardrail rules | ~25 |

---

## Implementation Steps

### Step 1: Create `.opencode/agents/mutator.md`

```markdown
---
description: Proposes explore prompt mutations with contamination guardrail
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

You are a mutation proposer. Your job is to improve the explore step prompt based on diagnosed failures.

## Inputs
- Analyzer diagnosis from `runs/<run-id>/analyzer/output.yaml`
- Lesson history from `lessons/index.yaml`
- Current formula from `runs/<run-id>/inputs/formula.yaml`
- Contamination guardrail rules

## Task
1. Read analyzer diagnosis (primary_failure_type, suggested_mutation)
2. Read lesson history (what methods already failed)
3. Check insanity prevention: don't retry a failed method for same failure type
4. Propose an improved explore step prompt
5. Apply contamination guardrail: verify mutation is project-agnostic
6. Write mutation output

## Output: `runs/<run-id>/mutator/output.yaml`
```yaml
run_id: run-XXXX
mutated_at: timestamp
proposed_change:
  type: prompt_tweak | step_management | parent_guideline | schema_change | tool_change | rubric_mutation
  target_step: explore
  current: |
    Current explore prompt text
  proposed: |
    Improved explore prompt text
  expected_improvement: |
    What this should fix
  risk: low | medium | high
  rationale: |
    Why this mutation addresses the diagnosed failure
insanity_check:
  method_already_failed: false
  failed_runs: []
  learned_runs: []
contamination_guardrail:
  passes: true
  violations: []
confidence: 0.85
```

## Contamination Guardrail
Before accepting any mutation, verify it does NOT contain:
- Specific file names, directory paths, function names, variable names
- Specific pattern categories ("hooks", "context", "middleware")
- Behavioral findings from any previous run

Test: "Would this instruction still make sense if the project had a different directory structure?"

## Rules
- Mutator sees diagnosis + lessons (counts only) + formula
- Mutator NEVER sees rolling set contents or golden set contents
- Insanity check: don't retry failed methods without justification
- Only structural exploration techniques cross the bridge
```

### Step 2: Create `prompts/mutator.md`

```markdown
# Mutator Role Contract

## Identity
You are a mutation proposer. You improve the explore step prompt based on diagnosed failures.

## Inputs
- Analyzer diagnosis (failure_type, suggested_mutation)
- Lesson history (what methods failed, what worked)
- Current formula (current explore prompt)
- Contamination guardrail rules

## Task
1. Read analyzer diagnosis
2. Check lesson history for this failure_type × teaching_method pair
3. If same method already FAILED: propose a DIFFERENT approach or justify retry
4. Propose improved explore step prompt
5. Apply contamination guardrail

## Output
- `runs/<run-id>/mutator/output.yaml` with proposed change

## Rules
- Only modify the target step (explore)
- Preserve all other steps exactly
- Update the version number
- Check lesson history for each method you consider
- If method already FAILED for this failure_type: justify or escalate tier
- Contamination guardrail: no project-specific names
```

### Step 3: Create `prompts/shared/contamination.md`

```markdown
# Contamination Guardrail

## Purpose
Ensure mutations stay project-agnostic. The formula must work on ANY project of the same ecosystem, not just the one it was tested on.

## Before Accepting Any Mutation

Verify it does NOT contain:

### ❌ Specific names
- File paths: `src/routes/project-edit.tsx`
- Directory paths: `src/features/auth/`
- Function names: `handleAuth`, `checkAgreement`
- Variable names: `agreementAccepted`, `userAuth`

### ❌ Specific patterns
- Pattern categories: "hooks", "context", "middleware", "contracts"
- Framework-specific: "React hooks", "Express middleware", "Vue composables"

### ❌ Behavioral findings
- Specific behaviors: "auth-conditional-redirect", "download-button-visibility"
- Codebase-specific observations: "the TOA check is in CREATE flow, not EDIT"

### ✅ Structural exploration techniques
- "Trace imports from entry points to find peripheral modules"
- "Search for conditional rendering patterns (show/hide/disable based on state)"
- "Look for route guard patterns (if/then/else in routing files)"
- "Map state transitions by reading component lifecycle methods"

## The Test
"Would this instruction still make sense if the project had a different directory structure and different framework usage?"

If YES → the mutation is clean.
If NO → the mutation is contaminated.
```

---

## Verification

```bash
cd prototype/_v02

# Create a test diagnosis
cat > runs/test-001/analyzer/output.yaml << 'EOF'
run_id: test-001
primary_failure_type: search_failure
diagnosis: |
  The explore step listed files and created coarse-grained behavior candidates
  without deep-diving into route files or gate contracts. The formula treats
  behavior_shapes as categories to match, not as patterns to discover within files.
failure_tier: step_management
affected_steps:
  - explore
suggested_mutation:
  type: step_management
  target_step: explore
  change: |
    Add a mandatory subtask that reads key files (route files, gate contracts,
    component files) to identify specific conditional flows. Output a new field
    conditional_flows_discovered alongside behavior_candidates.
confidence: 0.85
EOF

# Create test lesson
cat > lessons/learned.jsonl << 'EOF'
{"failure_type":"search_failure","teaching_method":"prompt_tweak","result":"FAILED","scenario":"reworded prompt, agent still missed patterns","run_id":"run-0001","recorded_at":"2026-04-20T10:00:00Z"}
EOF
node -e "const { refreshLessonIndex } = require('./scripts/lib/lessons'); refreshLessonIndex();"

# Spawn mutator (manually test the logic)
cat runs/test-001/analyzer/output.yaml
cat lessons/index.yaml
```

**Expected:**
- Mutator reads diagnosis: search_failure
- Mutator reads lesson history: prompt_tweak already failed for search_failure
- Mutator proposes step_management (escalates tier) instead of prompt_tweak
- Mutation passes contamination guardrail (no project-specific names)

---

## What This Proves

The system can evolve its own strategy:
- Mutations address diagnosed failures
- Insanity prevention avoids retrying failed methods
- Contamination guardrail keeps mutations project-agnostic
- The formula improves run over run

---

## What Comes Next

Concept 9 (Full Lifecycle) needs:
- The `/start-training` command
- The blueprint-harness skill with full lifecycle
- `opencode.json` config tying everything together
