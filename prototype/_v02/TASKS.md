# Blueprint Mode v02 — Build Tasks

> Each concept proves the system works. User verifies before proceeding.
> Load the `blueprint-build` skill before starting.
> For detailed implementation steps, see `tasks/concept_N.md` for each concept.

---

## Concept 1: Run Scaffold

> **Detailed plan:** `tasks/concept_1.md`

**Question:** Can we create a run with frozen inputs that will be immutable during the run?

**Files to build:**

| File | Purpose |
|------|---------|
| `scripts/cli.js` | Thin CLI tool with `init`, `freeze` subcommands |
| `state/current.yaml` | Active formula ref, project ref, next run ID |
| `config/prototype.yaml` | Sample project config (codebase_path, behavior_shapes) |
| `formulas/seed/frontend.yaml` | Seed formula for frontend ecosystem |
| `goldens/projects/sample-project/behaviors.yaml` | Sample golden set (3-5 known behaviors) |

**Verify:**
```bash
node scripts/cli.js init --run-id test-001
node scripts/cli.js freeze --run-id test-001
cat runs/test-001/manifest.yaml
cat runs/test-001/inputs/formula.yaml
```

**Expected:**
- `runs/test-001/manifest.yaml` exists with frozen formula ref
- `runs/test-001/inputs/formula.yaml` is a resolved copy
- `runs/test-001/inputs/project.yaml` is a copy
- `runs/test-001/inputs/golden-set.yaml` is a copy
- `state/current.yaml` updated with `last_prepared_run_id: test-001`

---

## Concept 2: Exploration

> **Detailed plan:** `tasks/concept_2.md`

**Question:** Can an AI agent explore a real codebase and identify behavioral patterns?

**Files to build:**

| File | Purpose |
|------|---------|
| `.opencode/agents/harness.md` | Primary agent with explore permissions |
| `prompts/explorer.md` | Explorer role contract (what to look for) |
| `prompts/shared/failure-types.md` | 5-type failure taxonomy |

**Verify:**
- Switch to harness agent with Tab
- Ask it to explore the blueprint-mode project itself
- Observe: uses glob/grep/read, identifies behaviors, produces evidence_refs

**Expected:**
- Agent explores codebase structure
- Identifies behavioral areas (auth, state, UI, etc.)
- Produces behavior_candidates with evidence_refs
- Does NOT read golden-set.yaml or rollingset/

---

## Concept 3: Spec Production

> **Detailed plan:** `tasks/concept_3.md`

**Question:** Can we produce a behavioral spec YAML file from exploration?

**Files to build:**

| File | Purpose |
|------|---------|
| `.opencode/agents/spec-generator.md` | Hidden subagent for spec writing |
| `schemas/spec.schema.yaml` | Spec format: state machines, conditions, evidence_refs |

**Verify:**
- Harness explores codebase (Concept 2)
- Harness spawns spec-generator via Task tool
- Spec-generator writes a spec to `runs/test-001/generator/specs/`

**Expected:**
- `runs/test-001/generator/specs/*.yaml` contains a real spec
- Spec has: id, type, version, behaviors[], evidence_refs[]
- Spec has: state_machine or conditions where applicable
- Evidence_refs contain actual code snippets from source files

---

## Concept 4: Spec Verification

> **Detailed plan:** `tasks/concept_4.md`

**Question:** Can we validate specs against the schema and check cross-references?

**Files to build:**

| File | Purpose |
|------|---------|
| `scripts/cli.js` | Add `validate` subcommand |
| `scripts/lib/validation.js` | Schema + cross-ref validation logic |

**Verify:**
```bash
node scripts/cli.js validate --run-id test-001
cat runs/test-001/verifier/output.yaml
```

**Expected:**
- Valid specs pass validation
- Invalid specs fail with clear error messages
- Cross-ref check: if Spec A references Spec B's transition, verify Spec B defines it
- Output written to `runs/test-001/verifier/output.yaml`

---

## Concept 5: Golden Evaluation

> **Detailed plan:** `tasks/concept_5.md`

**Question:** Can we evaluate specs against known behaviors and fact-check evidence?

**Files to build:**

| File | Purpose |
|------|---------|
| `.opencode/agents/evaluator.md` | Hidden subagent for evaluation |
| `prompts/evaluator.md` | Evaluator role contract |

**Verify:**
- Harness spawns evaluator subagent
- Evaluator reads specs + golden set + source code

**Expected:**
- `runs/test-001/evaluator/golden-results.yaml`: binary found/not-found per behavior
- `runs/test-001/evaluator/structure-review.yaml`: qualitative quality review
- `runs/test-001/evaluator/fact-check.yaml`: evidence_refs verified against actual source
- No numeric scores — binary results + qualitative findings only

---

## Concept 6: Cross-Run Memory

> **Detailed plan:** `tasks/concept_6.md`

**Question:** Can we track discovered specs across runs?

**Files to build:**

| File | Purpose |
|------|---------|
| `scripts/cli.js` | Add `rollset` subcommand |
| `scripts/lib/rollset.js` | Rolling set merge + dedup logic |

**Verify:**
```bash
node scripts/cli.js rollset --run-id test-001
cat runs/rollingset/index.yaml
cat runs/rollingset/stats.yaml
```

**Expected:**
- `runs/rollingset/index.yaml` lists all unique spec IDs
- `runs/rollingset/specs/` contains deduplicated spec files
- `runs/rollingset/stats.yaml` shows counts by category
- Running rollset again with same specs does NOT create duplicates

---

## Concept 7: Failure Diagnosis

> **Detailed plan:** `tasks/concept_7.md`

**Question:** Can we diagnose why specs missed behaviors?

**Files to build:**

| File | Purpose |
|------|---------|
| `.opencode/agents/analyzer.md` | Hidden subagent for diagnosis |
| `prompts/analyzer.md` | Analyzer role contract |
| `scripts/lib/lessons.js` | Lesson append + index + context builder |

**Verify:**
- Create a run where specs miss known behaviors
- Spawn analyzer subagent
- Observe: applies 5-type taxonomy correctly

**Expected:**
- `runs/test-001/analyzer/output.yaml` contains:
  - `primary_failure_type`: one of search/recognition/format/prompt/rubric_gap
  - `diagnosis`: why behaviors were missed
  - `suggested_mutation`: what to change in explore prompt
- Analyzer sees rolling set, golden set results, lesson history

---

## Concept 8: Mutation

> **Detailed plan:** `tasks/concept_8.md`

**Question:** Can we improve the explore prompt based on diagnosis?

**Files to build:**

| File | Purpose |
|------|---------|
| `.opencode/agents/mutator.md` | Hidden subagent for mutation |
| `prompts/mutator.md` | Mutator role contract |
| `prompts/shared/contamination.md` | Contamination guardrail rules |

**Verify:**
- Spawn mutator subagent with analyzer diagnosis + lesson history
- Mutator proposes a mutation

**Expected:**
- `runs/test-001/mutator/output.yaml` contains:
  - Improved explore step prompt
  - Contamination guardrail check passed
  - Lesson history check: no retry of failed methods
- Mutation is project-agnostic: no file names, function names, or pattern names

---

## Concept 9: Full Lifecycle

> **Detailed plan:** `tasks/concept_9.md`

**Question:** Can `/start-training` run the complete loop end-to-end?

**Files to build:**

| File | Purpose |
|------|---------|
| `.opencode/commands/start-training.md` | Entry point command |
| `.opencode/skills/blueprint-harness/SKILL.md` | Full lifecycle skill |
| `opencode.json` | Agent + tool + permission config |
| `.opencode/tools/yaml-ops.ts` | YAML read/write custom tools |
| `.opencode/plugins/blueprint-lifecycle.ts` | Lifecycle hooks (optional) |
| `scripts/cli.js` | Add `register` subcommand |
| `lessons/learned.jsonl` | Append-only lesson log |
| `lessons/failed.jsonl` | Append-only failure log |
| `lessons/index.yaml` | Generated lesson lookup |

**Verify:**
```bash
/start-training
```

**Expected:**
- Agent loads skill, executes all phases
- Specs produced, evaluated, diagnosed, mutated
- Candidates registered for governance
- Agent stops after register (does NOT advance formula)
- Output: "Run test-002 complete. N specs produced. M/N golden. Rolling set: X unique."

---

## File Count Summary

| Concept | New Files | Modified Files |
|---------|-----------|----------------|
| 1. Run Scaffold | 5 | — |
| 2. Exploration | 3 | — |
| 3. Spec Production | 2 | — |
| 4. Spec Verification | — | 2 |
| 5. Golden Evaluation | 2 | — |
| 6. Cross-Run Memory | 2 | 1 |
| 7. Failure Diagnosis | 4 | — |
| 8. Mutation | 4 | — |
| 9. Full Lifecycle | 8 | 1 |
| **Total** | **~30 files** | **~4 modified** |

---

## Dependency Graph

```
Concept 1 (Scaffold)
  │
  ├─→ Concept 2 (Exploration)
  │     │
  │     ├─→ Concept 3 (Spec Production)
  │     │     │
  │     │     ├─→ Concept 4 (Spec Verification)
  │     │     │     │
  │     │     │     └─→ Concept 5 (Golden Evaluation)
  │     │     │           │
  │     │     │           └─→ Concept 6 (Cross-Run Memory)
  │     │     │                 │
  │     │     │                 └─→ Concept 7 (Failure Diagnosis)
  │     │     │                       │
  │     │     │                       └─→ Concept 8 (Mutation)
  │     │     │                             │
  └─────┴─────┴───────────────────────────→ Concept 9 (Full Lifecycle)
```

Each concept assumes all previous concepts work. If a concept fails verification, stop and fix it before building the next one.
