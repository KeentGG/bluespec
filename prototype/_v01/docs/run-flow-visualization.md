# Blueprint Mode — Prototype Run Flow Visualization

> Complete walkthrough of what happens when you run `node start`

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         `node start` ENTRY POINT                           │
│                                                                             │
│  1. Parse args (--run-id, --resume, --opencode-bin)                        │
│  2. Acquire lock (prevents concurrent runs)                                │
│  3. Read harness skill + build orchestration prompt                         │
│  4. Spawn OpenCode agent with full prompt                                   │
│  5. Agent executes 7 phases autonomously                                    │
│  6. Release lock, exit                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase-by-Phase Flow

### Phase 1: init + freeze (CLI Commands)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: INIT + FREEZE                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COMMANDS EXECUTED:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ node scripts/cli.js init_run --run-id run-0015                     │   │
│  │ node scripts/cli.js freeze_inputs --run-id run-0015                │   │
│  │ node scripts/cli.js checkpoint_run --run-id run-0015 \             │   │
│  │   --phase freeze --status complete                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WHAT HAPPENS:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Read state/current.yaml → get active refs                       │   │
│  │    - current_formula_ref: formulas/promoted/frontend-derived-v003  │   │
│  │    - current_rubric_snapshot_ref: rubrics/snapshots/v002/rubric    │   │
│  │    - current_golden_set_ref: goldens/projects/sample-project/...   │   │
│  │    - current_project_ref: config/projects/sample-project.yaml      │   │
│  │                                                                     │   │
│  │ 2. Create run directory: runs/run-0015/                            │   │
│  │    ├── manifest.yaml          ← frozen run identity                │   │
│  │    ├── inputs/                ← frozen inputs                      │   │
│  │    │   ├── formula.yaml       ← resolved extends chain inlined     │   │
│  │    │   ├── rubric.yaml        ← copied from snapshot               │   │
│  │    │   ├── golden-set.yaml    ← copied from goldens                │   │
│  │    │   ├── project.yaml       ← copied from config                 │   │
│  │    │   └── resolved-inputs.yaml ← provenance metadata             │   │
│  │    ├── generator/             ← empty, ready for specs             │   │
│  │    ├── evaluator/             ← empty, ready for scoring           │   │
│  │    ├── analyzer/              ← empty, ready for diagnosis         │   │
│  │    └── mutator/               ← empty, ready for mutations         │   │
│  │                                                                     │   │
│  │ 3. Update state/current.yaml:                                      │   │
│  │    - next_run_id: run-0015 → run-0016                              │   │
│  │    - last_prepared_run_id: run-0015                                │   │
│  │                                                                     │   │
│  │ 4. Write checkpoint: state/checkpoints/run-0015.yaml               │   │
│  │    phase: freeze, status: complete                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FILES CREATED:                                                             │
│  ✓ runs/run-0015/manifest.yaml                                             │
│  ✓ runs/run-0015/inputs/formula.yaml (resolved)                           │
│  ✓ runs/run-0015/inputs/rubric.yaml                                       │
│  ✓ runs/run-0015/inputs/golden-set.yaml                                   │
│  ✓ runs/run-0015/inputs/project.yaml                                      │
│  ✓ runs/run-0015/inputs/resolved-inputs.yaml                              │
│  ✓ state/checkpoints/run-0015.yaml                                        │
│  ✓ state/current.yaml (updated)                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 2: explore (Agent Does This — No CLI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: EXPLORE (Agent reads codebase directly)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NO CLI COMMANDS — Agent uses glob/grep/read tools                         │
│                                                                             │
│  WHAT THE AGENT DOES:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Read golden-set.yaml → know which behaviors to find             │   │
│  │    - auth-conditional-redirect                                      │   │
│  │    - download-button-visibility                                     │   │
│  │    - toa-gated-first-report-creation                                │   │
│  │                                                                     │   │
│  │ 2. Read project.yaml → get codebase_path                           │   │
│  │    - codebase_path: /path/to/dashboard-v2                          │   │
│  │                                                                     │   │
│  │ 3. Explore codebase structure:                                      │   │
│  │    glob("<codebase_path>/src/**/*.{ts,tsx,js,jsx}")                │   │
│  │    → discovers file tree, identifies key modules                    │   │
│  │                                                                     │   │
│  │ 4. Search for behavioral areas:                                     │   │
│  │    grep("auth|login|session|state|agreement|toa")                  │   │
│  │    → finds relevant source files                                    │   │
│  │                                                                     │   │
│  │ 5. Read source files to understand behavior:                       │   │
│  │    - src/routes/project-edit.tsx (or equivalent)                   │   │
│  │    - src/components/ReportActions.tsx (or equivalent)              │   │
│  │    - src/features/auth/contracts/toa-contract.js                   │   │
│  │    - src/features/reports/hooks/useReportCreation.ts               │   │
│  │                                                                     │   │
│  │ 6. Map golden behaviors to source files:                           │   │
│  │    - auth-conditional-redirect → project-edit.tsx                  │   │
│  │    - download-button-visibility → ReportActions.tsx                │   │
│  │    - toa-gated-first-report-creation → toa-contract.js + hooks    │   │
│  │                                                                     │   │
│  │ 7. Note stale references (if any):                                 │   │
│  │    - "src/routes/project-edit.tsx does not exist"                  │   │
│  │    - "src/components/ReportActions.tsx → actual: src/features/..." │   │
│  │                                                                     │   │
│  │ 8. Build mental model of behavior:                                 │   │
│  │    - State machines discovered                                      │   │
│  │    - Conditional flows identified                                   │   │
│  │    - Guard predicates noted                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OUTPUT: Agent's internal mental model (not written to files)              │
│  DURATION: ~2-5 minutes of synchronous tool calls                          │
│                                                                             │
│  KEY RULE:                                                                  │
│  - Do NOT use explore subagents                                            │
│  - Do NOT use background tasks                                             │
│  - Use glob/grep/read DIRECTLY and SYNCHRONOUSLY                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 3: delegate + draft (Spawn Spec-Generator Subagents)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: DELEGATE + DRAFT (Spawn subagents for each golden behavior)       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: Write Delegation Manifests (Agent does this)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ For EACH golden behavior, write a manifest to:                     │   │
│  │ runs/run-0015/generator/delegate/<spec-id>.yaml                    │   │
│  │                                                                     │   │
│  │ Example manifest (auth.conditional-redirect.yaml):                 │   │
│  │ ┌─────────────────────────────────────────────────────────────┐   │   │
│  │ │ spec_id: auth.conditional-redirect                         │   │   │
│  │ │ output_path: runs/run-0015/generator/specs/auth.conditional│   │   │
│  │ │ golden_behaviors:                                           │   │   │
│  │ │   - id: auth-conditional-redirect                          │   │   │
│  │ │     description: editing project routes through a gated    │   │   │
│  │ │       edit flow only when agreement state is satisfied     │   │   │
│  │ │     priority: high                                          │   │   │
│  │ │ source_files:                                               │   │   │
│  │ │   - src/routes/project-edit.tsx                            │   │   │
│  │ │   - src/features/auth/contracts/toa-contract.js            │   │   │
│  │ │ ecosystem: frontend                                         │   │   │
│  │ │ prior_context: |                                            │   │   │
│  │ │   Agent exploration notes:                                 │   │   │
│  │ │   - TOA check exists in CREATE flow, not EDIT flow         │   │   │
│  │ │   - Agreement state stored in user.agreementAccepted       │   │   │
│  │ │   - Edit route at /dashboard/projects/:id/edit             │   │   │
│  │ └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: Spawn Spec-Generator Subagents (3 subagents)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  SUBAGENT 1: auth.conditional-redirect                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Task tool call:                                             │   │   │
│  │  │ - subagent_type: spec-generator                             │   │   │
│  │  │ - category: unspecified-high                                │   │   │
│  │  │ - prompt:                                                   │   │   │
│  │  │   "Read delegation manifest at:                            │   │   │
│  │  │    runs/run-0015/generator/delegate/auth.conditional-      │   │   │
│  │  │    redirect.yaml                                            │   │   │
│  │  │                                                             │   │   │
│  │  │    Then write the spec to:                                  │   │   │
│  │  │    runs/run-0015/generator/specs/auth.conditional-         │   │   │
│  │  │    redirect.yaml                                            │   │   │
│  │  │                                                             │   │   │
│  │  │    Follow schemas/spec.schema.yaml.                         │   │   │
│  │  │    Include evidence_refs with REAL code snippets.           │   │   │
│  │  │    Include state_machine if behavior is stateful.           │   │   │
│  │  │    Include conditions for conditional behaviors.            │   │   │
│  │  │    Include confidence with rationale."                      │   │   │
│  │  │                                                             │   │   │
│  │  │ - run_in_background: false (synchronous)                    │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  SUBAGENT 2: download.button-visibility                            │   │
│  │  (Same pattern, different manifest/spec)                           │   │
│  │                                                                     │   │
│  │  SUBAGENT 3: toa.gated-first-report-creation                       │   │
│  │  (Same pattern, different manifest/spec)                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 3: Wait for Completion (Synchronous)                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - Task tool calls are synchronous — parent waits for subagent     │   │
│  │ - Each subagent reads manifest → reads source files → writes spec │   │
│  │ - Duration: ~1-3 minutes per subagent                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 4: Verify Specs Written (Agent does this)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - Read each spec file to confirm it was written correctly         │   │
│  │ - Note confidence and unresolved questions for output.yaml        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 5: Write Generator Output (Agent does this)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Write runs/run-0015/generator/output.yaml:                       │   │
│  │ ┌─────────────────────────────────────────────────────────────┐   │   │
│  │ │ status: complete                                            │   │   │
│  │ │ specs_written: 3                                            │   │   │
│  │ │ specs:                                                      │   │   │
│  │ │   - id: auth.conditional-redirect                           │   │   │
│  │ │     golden_behaviors_covered: 1                             │   │   │
│  │ │     coverage: partial                                       │   │   │
│  │ │     confidence: 0.85                                        │   │   │
│  │ │     unresolved_questions: 4                                 │   │   │
│  │ │   - id: download.button-visibility                          │   │   │
│  │ │     golden_behaviors_covered: 1                             │   │   │
│  │ │     coverage: full                                          │   │   │
│  │ │     confidence: 0.95                                        │   │   │
│  │ │   - id: toa.gated-first-report-creation                     │   │   │
│  │ │     golden_behaviors_covered: 1                             │   │   │
│  │ │     coverage: full                                          │   │   │
│  │ │     confidence: 0.92                                        │   │   │
│  │ │ overall_confidence: 0.91                                    │   │   │
│  │ │ flags_for_analyzer:                                         │   │   │
│  │ │   - "auth-conditional-redirect: stale evidence ref"         │   │   │
│  │ │   - "download-button-visibility: stale evidence ref"        │   │   │
│  │ └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FILES CREATED:                                                             │
│  ✓ runs/run-0015/generator/delegate/auth.conditional-redirect.yaml         │
│  ✓ runs/run-0015/generator/delegate/download.button-visibility.yaml        │
│  ✓ runs/run-0015/generator/delegate/toa.gated-first-report-creation.yaml   │
│  ✓ runs/run-0015/generator/specs/auth.conditional-redirect.yaml            │
│  ✓ runs/run-0015/generator/specs/download.button-visibility.yaml           │
│  ✓ runs/run-0015/generator/specs/toa.gated-first-report-creation.yaml      │
│  ✓ runs/run-0015/generator/output.yaml                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 4: evaluate (CLI Spawns Evaluator Agent)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: EVALUATE (CLI spawns Evaluator agent)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COMMAND EXECUTED:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ node scripts/cli.js run_evaluator --run-id run-0015                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WHAT HAPPENS:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. CLI reads frozen inputs:                                        │   │
│  │    - formula.yaml (what steps were used)                           │   │
│  │    - rubric.yaml (evaluation criteria)                             │   │
│  │    - golden-set.yaml (known behaviors)                             │   │
│  │    - project.yaml (project context)                                │   │
│  │                                                                     │   │
│  │ 2. CLI reads generator output:                                     │   │
│  │    - generator/output.yaml (what specs were written)               │   │
│  │    - generator/specs/*.yaml (the actual spec files)                │   │
│  │                                                                     │   │
│  │ 3. CLI spawns OpenCode agent with prompt:                          │   │
│  │    ┌─────────────────────────────────────────────────────────┐     │   │
│  │    │ "You are the Evaluator agent. Score specs for run      │     │   │
│  │    │  run-0015.                                              │     │   │
│  │    │                                                         │     │   │
│  │    │ 1. Read all spec files from: generator/specs/          │     │   │
│  │    │ 2. Read the rubric from: inputs/rubric.yaml            │     │   │
│  │    │ 3. Read the golden set from: inputs/golden-set.yaml    │     │   │
│  │    │ 4. Read the generator output from: generator/output.yaml│    │   │
│  │    │ 5. Score each spec against rubric + golden set          │     │   │
│  │    │ 6. Write official score report to: evaluator/output.yaml│    │   │
│  │    │ 7. Write shadow findings to: evaluator/shadow-findings.yaml│  │   │
│  │    │                                                         │     │   │
│  │    │ Official score report must include:                     │     │   │
│  │    │ - scored_specs with per-spec scores                     │     │   │
│  │    │ - overall_score (0.0-1.0)                               │     │   │
│  │    │ - overall_score_breakdown {recall, precision, consistency}│   │   │
│  │    │ - confidence, confidence_rationale                      │     │   │
│  │    │                                                         │     │   │
│  │    │ Shadow findings must include:                           │     │   │
│  │    │ - recall_hits, recall_misses with severity              │     │   │
│  │    │ - precision_findings, consistency_findings              │     │   │
│  │    │ - rubric_gap_candidates (proposed_only: true)"          │     │   │
│  │    └─────────────────────────────────────────────────────────┘     │   │
│  │                                                                     │   │
│  │ 4. Agent reads all spec files, scores them:                        │   │
│  │    - toa.gated-first-report-creation: recall=1.0, precision=0.90   │   │
│  │    - download.button-visibility: recall=0.90, precision=0.95       │   │
│  │    - auth.conditional-redirect: recall=0.50, precision=0.90        │   │
│  │                                                                     │   │
│  │ 5. Agent writes TWO output files:                                  │   │
│  │    - evaluator/output.yaml (official, machine-comparable)          │   │
│  │    - evaluator/shadow-findings.yaml (qualitative, for discovery)   │   │
│  │                                                                     │   │
│  │ 6. CLI validates outputs against schemas:                          │   │
│  │    - evaluator-output.schema.yaml                                  │   │
│  │    - evaluator-shadow-findings.schema.yaml                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FILES CREATED:                                                             │
│  ✓ runs/run-0015/evaluator/output.yaml                                     │
│  ✓ runs/run-0015/evaluator/shadow-findings.yaml                            │
│                                                                             │
│  EXAMPLE OUTPUT (evaluator/output.yaml):                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ run_id: run-0015                                                  │   │
│  │ evaluator: evaluator-agent                                        │   │
│  │ status: completed                                                 │   │
│  │ spec_scores:                                                      │   │
│  │   - spec_id: toa.gated-first-report-creation                      │   │
│  │     recall: 1.0                                                   │   │
│  │     precision: 0.90                                               │   │
│  │     consistency: 0.95                                             │   │
│  │   - spec_id: download.button-visibility                           │   │
│  │     recall: 0.90                                                  │   │
│  │     precision: 0.95                                               │   │
│  │   - spec_id: auth.conditional-redirect                            │   │
│  │     recall: 0.50   ← PARTIAL (TOA guard missing in edit flow)    │   │
│  │     precision: 0.90                                               │   │
│  │ overall_score: 0.85                                               │   │
│  │ overall_score_breakdown:                                          │   │
│  │   recall: 0.80                                                    │   │
│  │   precision: 0.92                                                 │   │
│  │   consistency: 0.93                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  EXAMPLE SHADOW FINDINGS:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ recall_misses:                                                     │   │
│  │   - behavior_id: auth-conditional-redirect                         │   │
│  │     severity: high                                                 │   │
│  │     missing: "agreement state (TOA) guard is not present in edit" │   │
│  │ rubric_gap_candidates:                                             │   │
│  │   proposed_only: true                                              │   │
│  │   gaps:                                                            │   │
│  │     - criterion: conditional_flow_documentation                    │   │
│  │       severity: high                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 5: analyze (CLI Spawns Analyzer Agent)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: ANALYZE (CLI spawns Analyzer agent)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COMMAND EXECUTED:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ node scripts/cli.js run_analyzer --run-id run-0015                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WHAT HAPPENS:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. CLI reads evaluator outputs:                                    │   │
│  │    - evaluator/output.yaml (official scores)                       │   │
│  │    - evaluator/shadow-findings.yaml (qualitative findings)         │   │
│  │                                                                     │   │
│  │ 2. CLI reads generator output + formula + rubric:                  │   │
│  │    - generator/output.yaml (what happened)                         │   │
│  │    - inputs/formula.yaml (what instructions were used)             │   │
│  │    - inputs/rubric.yaml (what criteria existed)                    │   │
│  │                                                                     │   │
│  │ 3. CLI spawns OpenCode agent with prompt:                          │   │
│  │    ┌─────────────────────────────────────────────────────────┐     │   │
│  │    │ "You are the Analyzer agent. Diagnose run run-0015.    │     │   │
│  │    │                                                         │     │   │
│  │    │ Apply the 5-type failure decision tree to each recall  │     │   │
│  │    │ miss:                                                   │     │   │
│  │    │                                                         │     │   │
│  │    │ 1. search_failure — explore failed to find files       │     │   │
│  │    │ 2. recognition_failure — found files but didn't        │     │   │
│  │    │    recognize the behavior                               │     │   │
│  │    │ 3. format_failure — spec failed schema validation      │     │   │
│  │    │ 4. prompt_failure — formula never asked for this       │     │   │
│  │    │ 5. rubric_gap_failure — criterion ABSENT from rubric   │     │   │
│  │    │                                                         │     │   │
│  │    │ Write diagnosis to: analyzer/output.yaml"              │     │   │
│  │    └─────────────────────────────────────────────────────────┘     │   │
│  │                                                                     │   │
│  │ 4. Agent applies decision tree:                                    │   │
│  │    - auth-conditional-redirect recall miss (0.50)                  │   │
│  │    - Checks: search_failure? YES — stale file reference           │   │
│  │    - Diagnosis: "explore step relied on non-existent file"        │   │
│  │    - Failure tier: step_management                                 │   │
│  │    - Suggested mutation: "add reference-validation sub-step"      │   │
│  │                                                                     │   │
│  │ 5. Agent writes diagnosis:                                         │   │
│  │    - analyzer/output.yaml                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FILES CREATED:                                                             │
│  ✓ runs/run-0015/analyzer/output.yaml                                      │
│                                                                             │
│  EXAMPLE OUTPUT (analyzer/output.yaml):                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ run_id: run-0015                                                  │   │
│  │ analyzer: analyzer-agent                                          │   │
│  │ status: completed                                                 │   │
│  │ primary_failure_type: search_failure                              │   │
│  │ diagnosis: >                                                      │   │
│  │   The recall miss on auth-conditional-redirect is caused by       │   │
│  │   the generator's explore step relying on a stale file reference │   │
│  │   (src/routes/project-edit.tsx) that does not exist.             │   │
│  │ failure_tier: step_management                                     │   │
│  │ suggested_mutation: >                                             │   │
│  │   Add a reference-validation and recovery sub-step to explore:   │   │
│  │   (1) verify every referenced file path exists;                  │   │
│  │   (2) if missing, trigger secondary search using ecosystem       │   │
│  │   conventions; (3) only proceed once all references resolved.    │   │
│  │ rubric_gap_proposed: false                                        │   │
│  │ confidence: 0.85                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 6: mutate (CLI Spawns Mutator Agent)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: MUTATE (CLI spawns Mutator agent)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COMMAND EXECUTED:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ node scripts/cli.js run_mutator --run-id run-0015                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WHAT HAPPENS:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. CLI reads analyzer output + evaluator outputs:                  │   │
│  │    - analyzer/output.yaml (diagnosis)                              │   │
│  │    - evaluator/output.yaml (scores)                                │   │
│  │    - evaluator/shadow-findings.yaml (precision/rubric gaps)        │   │
│  │                                                                     │   │
│  │ 2. CLI reads formula + rubric + lesson history:                    │   │
│  │    - inputs/formula.yaml (current formula)                         │   │
│  │    - inputs/rubric.yaml (current rubric)                           │   │
│  │    - lessons/failed.jsonl (what didn't work)                       │   │
│  │    - lessons/learned.jsonl (what worked)                           │   │
│  │                                                                     │   │
│  │ 3. CLI spawns OpenCode agent with prompt:                          │   │
│  │    ┌─────────────────────────────────────────────────────────┐     │   │
│  │    │ "You are the Mutator agent. Propose mutation for       │     │   │
│  │    │  run-0015.                                              │     │   │
│  │    │                                                         │     │   │
│  │    │ Mutation tiers (in order):                              │     │   │
│  │    │ 1. prompt_tweak (preferred)                             │     │   │
│  │    │ 2. step_management                                     │     │   │
│  │    │ 3. parent_guideline                                    │     │   │
│  │    │ 4. schema_change                                       │     │   │
│  │    │ 5. tool_change                                         │     │   │
│  │    │ 6. rubric_mutation (only if rubric_gap_failure)        │     │   │
│  │    │                                                         │     │   │
│  │    │ Insanity check: if same mutation failed for same        │     │   │
│  │    │ failure_type, justify or propose different approach.    │     │   │
│  │    │                                                         │     │   │
│  │    │ Write to: mutator/output.yaml"                          │     │   │
│  │    └─────────────────────────────────────────────────────────┘     │   │
│  │                                                                     │   │
│  │ 4. Agent checks insanity prevention:                               │   │
│  │    - Has step_management failed for search_failure before?         │   │
│  │    - Check lessons/failed.jsonl                                    │   │
│  │    - Result: NO — step_management succeeded in run-0003            │   │
│  │                                                                     │   │
│  │ 5. Agent proposes mutation:                                         │   │
│  │    - Type: step_management                                         │   │
│  │    - Target: explore step                                          │   │
│  │    - Change: add reference-validation sub-step                     │   │
│  │    - Risk: low                                                     │   │
│  │                                                                     │   │
│  │ 6. Agent writes mutation proposal:                                  │   │
│  │    - mutator/output.yaml                                           │   │
│  │    - mutator/formula-candidate.yaml (if formula mutation)          │   │
│  │    - mutator/rubric-candidate.yaml (if rubric_gap_failure)         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FILES CREATED:                                                             │
│  ✓ runs/run-0015/mutator/output.yaml                                       │
│  ✓ runs/run-0015/mutator/formula-candidate.yaml (if formula mutation)      │
│  ✓ runs/run-0015/mutator/rubric-candidate.yaml (if rubric_gap_failure)     │
│                                                                             │
│  EXAMPLE OUTPUT (mutator/output.yaml):                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ run_id: run-0015                                                  │   │
│  │ mutator: mutator-agent                                           │   │
│  │ status: complete                                                  │   │
│  │ proposed_change:                                                  │   │
│  │   type: step_management                                          │   │
│  │   target_step: explore                                           │   │
│  │   current: |                                                      │   │
│  │     The explore step produces trace, exploration_notes, and       │   │
│  │     state_machine_boundaries. It does not validate file paths.   │   │
│  │   proposed: |                                                     │   │
│  │     Add reference-validation sub-step:                           │   │
│  │     1. verify_references: verify every file path exists          │   │
│  │     2. ecosystem_recovery: secondary search for missing paths    │   │
│  │     3. proceed_gate: only proceed once all refs resolved         │   │
│  │   expected_improvement: |                                         │   │
│  │     Eliminates recall misses from stale file paths.              │   │
│  │     Expected recall for auth.conditional-redirect: 0.50 → 0.90  │   │
│  │   risk: low                                                      │   │
│  │ insanity_check:                                                   │   │
│  │   method_already_failed: false                                   │   │
│  │   learned_runs:                                                   │   │
│  │     - run_id: run-0003                                           │   │
│  │       teaching_method: step_management                           │   │
│  │       result: PASSED                                             │   │
│  │ confidence: 0.88                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 7: register (CLI Registers Candidates)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 7: REGISTER (CLI registers candidates for governance)                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COMMANDS EXECUTED:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ # If formula candidate exists:                                     │   │
│  │ node scripts/cli.js register_formula_candidate \                   │   │
│  │   --file runs/run-0015/mutator/formula-candidate.yaml \            │   │
│  │   --run-id run-0015                                                │   │
│  │                                                                     │   │
│  │ # If rubric candidate exists:                                      │   │
│  │ node scripts/cli.js register_rubric_candidate \                    │   │
│  │   --file runs/run-0015/mutator/rubric-candidate.yaml \             │   │
│  │   --run-id run-0015                                                │   │
│  │                                                                     │   │
│  │ # Write final checkpoint:                                          │   │
│  │ node scripts/cli.js checkpoint_run --run-id run-0015 \             │   │
│  │   --phase register --status complete                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WHAT HAPPENS:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. CLI reads mutator output.yaml:                                  │   │
│  │    - If proposed_change.type == rubric_mutation:                   │   │
│  │      → register rubric candidate                                   │   │
│  │    - If proposed_change.type == (prompt_tweak|step_management|...):│   │
│  │      → register formula candidate                                  │   │
│  │                                                                     │   │
│  │ 2. CLI copies candidate to governance queue:                       │   │
│  │    - formulas/candidates/<id>.yaml (or rubrics/candidates/<id>.yaml)│  │
│  │    - Updates state/queue.yaml with pending review                  │   │
│  │                                                                     │   │
│  │ 3. CLI writes final checkpoint:                                    │   │
│  │    - state/checkpoints/run-0015.yaml                               │   │
│  │    - phase: register, status: complete                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FILES CREATED:                                                             │
│  ✓ formulas/candidates/frontend-derived-stale-reference-recovery.yaml      │
│  ✓ state/checkpoints/run-0015.yaml (final)                                │
│  ✓ state/queue.yaml (updated with pending review)                          │
│                                                                             │
│  AFTER REGISTER:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Agent outputs "CYCLE_COMPLETE" and STOPS.                         │   │
│  │                                                                     │   │
│  │ Do NOT call:                                                       │   │
│  │ - advance_formula (governed step — requires human review)          │   │
│  │ - promote_rubric_snapshot (governed step — requires human review)  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete File Tree After One Run

```
runs/run-0015/
├── manifest.yaml                          ← frozen run identity
├── inputs/
│   ├── formula.yaml                       ← resolved extends chain inlined
│   ├── rubric.yaml                        ← copied from snapshot
│   ├── golden-set.yaml                    ← copied from goldens
│   ├── project.yaml                       ← copied from config
│   └── resolved-inputs.yaml               ← provenance metadata
├── generator/
│   ├── delegate/
│   │   ├── auth.conditional-redirect.yaml ← delegation manifest
│   │   ├── download.button-visibility.yaml
│   │   └── toa.gated-first-report-creation.yaml
│   ├── specs/
│   │   ├── auth.conditional-redirect.yaml ← actual behavioral spec
│   │   ├── download.button-visibility.yaml
│   │   └── toa.gated-first-report-creation.yaml
│   └── output.yaml                        ← generator summary
├── evaluator/
│   ├── output.yaml                        ← official score report
│   └── shadow-findings.yaml               ← qualitative findings
├── analyzer/
│   └── output.yaml                        ← diagnosis + suggested mutation
└── mutator/
    ├── output.yaml                        ← mutation proposal
    └── formula-candidate.yaml             ← new formula candidate

formulas/candidates/
└── frontend-derived-stale-reference-recovery.yaml  ← registered for governance

state/
├── current.yaml                           ← updated (next_run_id: run-0016)
├── queue.yaml                             ← updated (pending review)
└── checkpoints/
    └── run-0015.yaml                      ← final checkpoint
```

---

## AI Models Spawned

| Phase | Agent | Model | Prompt Summary |
|-------|-------|-------|----------------|
| explore | (main agent) | opencode default | Direct tool calls (glob/grep/read) |
| delegate | spec-generator ×3 | opencode default | "Read manifest, write spec YAML" |
| evaluate | evaluator | opencode default | "Score specs against rubric + golden set" |
| analyze | analyzer | opencode default | "Apply 5-type failure decision tree" |
| mutate | mutator | opencode default | "Propose mutation with insanity check" |

**Total AI calls per run:** ~6-8 (1 main agent + 3 spec-generators + 1 evaluator + 1 analyzer + 1 mutator)

---

## Timing

| Phase | Duration | Why |
|-------|----------|-----|
| init + freeze | ~2s | CLI file operations |
| explore | ~2-5min | Synchronous glob/grep/read calls |
| delegate + draft | ~5-10min | 3 sequential subagent spawns |
| evaluate | ~2-3min | Agent reads + scores + writes |
| analyze | ~1-2min | Agent reads + diagnoses + writes |
| mutate | ~1-2min | Agent reads + proposes + writes |
| register | ~2s | CLI file operations |
| **Total** | **~12-25min** | One bounded evolution cycle |

---

## Key Insights

1. **Files are the memory** — Every phase reads from and writes to YAML files. No in-memory state passes between phases.

2. **Agents are ephemeral** — Each agent session is disposable. The next agent reads files the previous agent wrote.

3. **Frozen inputs ensure reproducibility** — The formula, rubric, golden set, and project config are frozen at `freeze_inputs` time and never change during the run.

4. **Dual-channel scoring** — The evaluator writes both an official score report (for reproducibility) AND shadow findings (for rubric discovery). Shadow findings cannot activate in the same run.

5. **Insanity prevention** — The mutator checks lesson history before proposing mutations. If the same teaching method already failed for the same failure type, it must justify or propose a different approach.

6. **Governed steps are NOT in the autonomous loop** — `advance_formula` and `promote_rubric_snapshot` require human review. The autonomous loop only proposes candidates.
