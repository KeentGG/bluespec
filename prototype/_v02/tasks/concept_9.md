# Concept 9: Full Lifecycle

> Can `/start-training` run the complete loop end-to-end?

---

## Goal

Wire everything together. The `/start-training` command triggers the harness agent, which loads the blueprint-harness skill and executes the full 10-phase lifecycle: init → freeze → explore → draft → verify → evaluate → rollset → diagnose → mutate → register.

---

## Files to Create/Modify

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `.opencode/commands/start-training.md` | Entry point command | ~10 |
| `.opencode/skills/blueprint-harness/SKILL.md` | Full lifecycle skill | ~100 |
| `opencode.json` | Agent + tool + permission config | ~80 |
| `scripts/cli.js` | Add `register` subcommand | ~40 (modified) |

---

## Implementation Steps

### Step 1: Create `.opencode/commands/start-training.md`

```markdown
---
description: Start one evolution cycle
agent: harness
subtask: false
---
Load the blueprint-harness skill and execute one bounded evolution cycle.
Read state/current.yaml for the next run ID, then proceed through all phases.
Stop after register. Do NOT call advance_formula or promote_rubric_snapshot.
```

### Step 2: Create `.opencode/skills/blueprint-harness/SKILL.md`

```markdown
---
name: blueprint-harness
description: Blueprint Mode evolution cycle — explore, produce specs, evaluate, diagnose, mutate
---

## Identity

You are the Blueprint Mode harness orchestrator. You execute one bounded evolution cycle.

## Phase Sequence

```
init → freeze → explore → draft → verify → evaluate → rollset → diagnose → mutate → register → STOP
```

## Phase 1: INIT

Run:
```bash
node scripts/cli.js init --run-id <run-id>
```

If no run-id given, read `state/current.yaml` for `next_run_id`.

## Phase 2: FREEZE

Run:
```bash
node scripts/cli.js freeze --run-id <run-id>
```

This copies formula, project config, and golden set into `runs/<run-id>/inputs/`.

## Phase 3: EXPLORE

Use glob, grep, read tools directly. Do NOT spawn a subagent for this.

1. Read `runs/<run-id>/inputs/formula.yaml` for the explore step prompt
2. Read `runs/<run-id>/inputs/project.yaml` for codebase_path
3. Explore the codebase using the formula's guidance
4. Identify behavioral areas, read key files, discover conditional flows
5. Output structured exploration results

**DO NOT read:**
- `runs/<run-id>/inputs/golden-set.yaml`
- `runs/rollingset/`
- `lessons/`

## Phase 4: DRAFT

1. Write delegation manifests to `runs/<run-id>/generator/delegate/`
2. Spawn spec-generator subagent via Task tool (one per behavior)
3. Wait for subagent to write specs
4. Verify specs exist at `runs/<run-id>/generator/specs/`

## Phase 5: VERIFY

Run:
```bash
node scripts/cli.js validate --run-id <run-id>
```

Check `runs/<run-id>/verifier/output.yaml` for results.

## Phase 6: EVALUATE

Spawn evaluator subagent via Task tool.

Evaluator reads:
- Spec files from `runs/<run-id>/generator/specs/`
- Golden set from `runs/<run-id>/inputs/golden-set.yaml`
- Source code for fact-checking

Evaluator writes:
- `runs/<run-id>/evaluator/golden-results.yaml`
- `runs/<run-id>/evaluator/structure-review.yaml`
- `runs/<run-id>/evaluator/fact-check.yaml`

## Phase 7: ROLL SET

Run:
```bash
node scripts/cli.js rollset --run-id <run-id>
```

This merges new unique specs into `runs/rollingset/`.

## Phase 8: DIAGNOSE

Spawn analyzer subagent via Task tool.

Analyzer reads:
- Evaluator output
- Rolling set
- Lesson history
- Current formula

Analyzer writes:
- `runs/<run-id>/analyzer/output.yaml`

## Phase 9: MUTATE

Spawn mutator subagent via Task tool.

Mutator reads:
- Analyzer diagnosis
- Lesson history
- Contamination guardrail rules

Mutator writes:
- `runs/<run-id>/mutator/output.yaml`

## Phase 10: REGISTER

Run:
```bash
node scripts/cli.js register --run-id <run-id>
```

This registers formula/rubric candidates for governance.

## STOP

After register, report results and STOP.

**Do NOT call:**
- `advance_formula`
- `promote_rubric_snapshot`

These are governed steps requiring human review.
```

### Step 3: Create `opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "harness": {
      "description": "Blueprint Mode evolution cycle orchestrator",
      "mode": "primary",
      "permission": {
        "edit": "allow",
        "bash": {
          "node scripts/cli.js *": "allow",
          "*": "deny"
        },
        "task": {
          "spec-generator": "allow",
          "evaluator": "allow",
          "analyzer": "allow",
          "mutator": "allow",
          "*": "deny"
        },
        "skill": {
          "blueprint-harness": "allow"
        }
      }
    },
    "spec-generator": {
      "description": "Generates behavioral spec YAML from exploration results",
      "mode": "subagent",
      "hidden": true,
      "permission": {
        "read": "allow",
        "glob": "allow",
        "grep": "allow",
        "edit": "allow",
        "bash": "deny",
        "task": "deny"
      }
    },
    "evaluator": {
      "description": "Evaluates specs against golden set and fact-checks evidence",
      "mode": "subagent",
      "hidden": true,
      "permission": {
        "read": "allow",
        "glob": "allow",
        "grep": "allow",
        "edit": "allow",
        "bash": "deny",
        "task": "deny"
      }
    },
    "analyzer": {
      "description": "Diagnoses why specs missed behaviors using 5-type failure taxonomy",
      "mode": "subagent",
      "hidden": true,
      "permission": {
        "read": "allow",
        "glob": "allow",
        "grep": "allow",
        "edit": "allow",
        "bash": "deny",
        "task": "deny"
      }
    },
    "mutator": {
      "description": "Proposes explore prompt mutations with contamination guardrail",
      "mode": "subagent",
      "hidden": true,
      "permission": {
        "read": "allow",
        "glob": "allow",
        "grep": "allow",
        "edit": "allow",
        "bash": "deny",
        "task": "deny"
      }
    }
  }
}
```

### Step 4: Update `scripts/cli.js` — Add register subcommand

Add after the rollset function:

```javascript
function register(runId) {
  console.log(`[register] Registering candidates from: ${runId}`);

  const runDir = resolveWorkspacePath(`runs/${runId}`);
  const mutatorDir = path.join(runDir, 'mutator');

  if (!fileExists(path.join(mutatorDir, 'output.yaml'))) {
    console.error(`[register] No mutator output found for ${runId}`);
    process.exit(1);
  }

  const mutatorOutput = readYamlFile(path.join(mutatorDir, 'output.yaml'));

  if (!mutatorOutput.proposed_change) {
    console.log(`[register] No mutation proposed. Nothing to register.`);
    return;
  }

  // Register as candidate
  const candidateId = `${runId}-${mutatorOutput.proposed_change.type}`;
  const candidatesDir = resolveWorkspacePath('formulas/candidates');
  ensureDir(candidatesDir);

  const candidate = {
    id: candidateId,
    source_run: runId,
    created_at: timestamp(),
    proposed_change: mutatorOutput.proposed_change,
    status: 'pending_review',
  };

  writeYamlFile(path.join(candidatesDir, `${candidateId}.yaml`), candidate);

  // Update queue
  const queuePath = resolveWorkspacePath('state/queue.yaml');
  let queue = { pending_promotions: { formulas: [] } };
  if (fileExists(queuePath)) {
    queue = readYamlFile(queuePath);
  }
  if (!queue.pending_promotions) queue.pending_promotions = { formulas: [] };
  queue.pending_promotions.formulas.push(candidateId);
  writeYamlFile(queuePath, queue);

  console.log(`[register] Registered candidate: ${candidateId}`);
  console.log(`[register] Added to queue for human review`);
}
```

Add to CLI router:

```javascript
} else if (cmd === 'register') {
  const runId = args['run-id'];
  if (!runId) {
    console.error('Usage: node scripts/cli.js register --run-id <run-id>');
    process.exit(1);
  }
  register(runId);
}
```

---

## Verification

```bash
cd prototype/_v02

# Ensure state is initialized
cat state/current.yaml

# Start training
# (In OpenCode, type: /start-training)

# Or test the register command manually:
node scripts/cli.js register --run-id test-001
cat formulas/candidates/test-001-step_management.yaml
cat state/queue.yaml
```

**Expected:**
- `/start-training` appears in OpenCode command list
- Harness agent loads blueprint-harness skill
- Agent executes all 10 phases sequentially
- Specs produced, evaluated, diagnosed, mutated
- Candidates registered for governance
- Agent stops after register

---

## What This Proves

The system works as a whole:
- One command triggers the full evolution cycle
- All agents work together through the skill
- CLI tools handle mechanical operations
- Agent handles creative reasoning
- Governance boundary respected (no auto-promotion)

---

## Complete File List (All Concepts)

After all 9 concepts are built, the prototype contains:

```
prototype/_v02/
├── ARCHITECTURE.md
├── AGENTS.md
├── TASKS.md
├── tasks/
│   ├── concept_1.md
│   ├── concept_2.md
│   ├── concept_3.md
│   ├── concept_4.md
│   ├── concept_5.md
│   ├── concept_6.md
│   ├── concept_7.md
│   ├── concept_8.md
│   └── concept_9.md
├── opencode.json
├── .opencode/
│   ├── commands/start-training.md
│   ├── agents/harness.md
│   ├── agents/spec-generator.md
│   ├── agents/evaluator.md
│   ├── agents/analyzer.md
│   ├── agents/mutator.md
│   └── skills/blueprint-harness/SKILL.md
├── scripts/
│   ├── cli.js
│   └── lib/
│       ├── common.js
│       ├── validation.js
│       └── lessons.js
├── prompts/
│   ├── explorer.md
│   ├── evaluator.md
│   ├── analyzer.md
│   ├── mutator.md
│   └── shared/
│       ├── failure-types.md
│       └── contamination.md
├── schemas/spec.schema.yaml
├── state/current.yaml
├── formulas/seed/frontend.yaml
├── goldens/projects/sample-project/behaviors.yaml
├── runs/rollingset/
├── lessons/
│   ├── learned.jsonl
│   ├── failed.jsonl
│   └── index.yaml
└── config/prototype.yaml
```
