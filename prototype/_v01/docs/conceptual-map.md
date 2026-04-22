# Blueprint Mode — Conceptual Map

> How all the pieces correlate: data relationships, evolution flow, governance, and memory

---

## 1. The Big Picture — Concept Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           BLUEPRINT MODE — CONCEPTUAL ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         HUMAN-PROVIDED ANCHORS                                │   │
│  │                                                                                 │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                     │   │
│  │  │ GOLDEN SET   │    │ SEED FORMULA │    │ SEED RUBRIC  │                     │   │
│  │  │              │    │              │    │              │                     │   │
│  │  │ "What are    │    │ "How to      │    │ "How to      │                     │   │
│  │  │  the known   │    │  produce     │    │  evaluate    │                     │   │
│  │  │  behaviors?" │    │  specs?"     │    │  specs?"     │                     │   │
│  │  │              │    │              │    │              │                     │   │
│  │  │ • 3-20 items │    │ • Steps      │    │ • Criteria   │                     │   │
│  │  │ • High-value │    │ • Prompts    │    │ • Weights    │                     │   │
│  │  │ • Evidence   │    │ • Tools      │    │ • Scope      │                     │   │
│  │  │   refs       │    │ • Format     │    │              │                     │   │
│  │  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                     │   │
│  │         │                   │                   │                              │   │
│  │         │                   │                   │                              │   │
│  │         ▼                   ▼                   ▼                              │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │                    FROZEN INPUTS (per run)                              │   │   │
│  │  │                                                                         │   │   │
│  │  │  runs/run-0015/inputs/                                                 │   │   │
│  │  │  ├── golden-set.yaml    ← copied from goldens/                         │   │   │
│  │  │  ├── formula.yaml       ← resolved extends chain, inlined              │   │   │
│  │  │  ├── rubric.yaml        ← copied from rubrics/snapshots/v002/          │   │   │
│  │  │  └── project.yaml       ← copied from config/projects/                 │   │   │
│  │  │                                                                         │   │   │
│  │  │  WHY FROZEN: Ensures reproducibility. Same inputs → same evaluation.   │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                               │
│                                         ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         EVOLUTION LOOP (per run)                               │   │
│  │                                                                                 │   │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                │   │
│  │  │GENERATOR │───►│EVALUATOR │───►│ ANALYZER │───►│ MUTATOR  │                │   │
│  │  │          │    │          │    │          │    │          │                │   │
│  │  │ "Produce │    │ "Score   │    │ "Diagnose│    │ "Propose │                │   │
│  │  │  specs"  │    │  specs"  │    │  why it  │    │  fix"    │                │   │
│  │  │          │    │          │    │  failed" │    │          │                │   │
│  │  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘                │   │
│  │       │               │               │               │                       │   │
│  │       ▼               ▼               ▼               ▼                       │   │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                │   │
│  │  │  SPECS   │    │  SCORES  │    │DIAGNOSIS │    │MUTATION  │                │   │
│  │  │  (YAML)  │    │  (YAML)  │    │  (YAML)  │    │PROPOSAL  │                │   │
│  │  └──────────┘    └──────────┘    └──────────┘    └──────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                               │
│                                         ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                      GOVERNANCE (human review required)                        │   │
│  │                                                                                 │   │
│  │  ┌──────────────────┐              ┌──────────────────┐                       │   │
│  │  │ FORMULA CANDIDATE│              │ RUBRIC CANDIDATE │                       │   │
│  │  │                  │              │                  │                       │   │
│  │  │ "Proposed fix to │              │ "Proposed new    │                       │   │
│  │  │  the formula"    │              │  evaluation      │                       │   │
│  │  │                  │              │  criterion"      │                       │   │
│  │  └────────┬─────────┘              └────────┬─────────┘                       │   │
│  │           │                                 │                                 │   │
│  │           ▼                                 ▼                                 │   │
│  │  ┌──────────────────┐              ┌──────────────────┐                       │   │
│  │  │ advance_formula  │              │ approve_rubric   │                       │   │
│  │  │ (human approves) │              │ (human approves) │                       │   │
│  │  └────────┬─────────┘              └────────┬─────────┘                       │   │
│  │           │                                 │                                 │   │
│  │           ▼                                 ▼                                 │   │
│  │  ┌──────────────────┐              ┌──────────────────┐                       │   │
│  │  │ PROMOTED FORMULA │              │ RUBRIC SNAPSHOT  │                       │   │
│  │  │                  │              │                  │                       │   │
│  │  │ "Active recipe   │              │ "Frozen version  │                       │   │
│  │  │  for producing   │              │  of evaluation   │                       │   │
│  │  │  specs"          │              │  criteria"       │                       │   │
│  │  └──────────────────┘              └──────────────────┘                       │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                               │
│                                         ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         LESSON MEMORY (append-only)                            │   │
│  │                                                                                 │   │
│  │  ┌──────────────────┐              ┌──────────────────┐                       │   │
│  │  │ learned.jsonl    │              │ failed.jsonl     │                       │   │
│  │  │                  │              │                  │                       │   │
│  │  │ "What teaching   │              │ "What teaching   │                       │   │
│  │  │  methods WORKED" │              │  methods FAILED" │                       │   │
│  │  │                  │              │                  │                       │   │
│  │  │ • failure_type   │              │ • failure_type   │                       │   │
│  │  │ • teaching_method│              │ • teaching_method│                       │   │
│  │  │ • result: PASSED │              │ • result: FAILED │                       │   │
│  │  │ • works_on: [...]│              │ • scenario       │                       │   │
│  │  └──────────────────┘              └──────────────────┘                       │   │
│  │                                                                                 │   │
│  │  WHY: Insanity prevention. Never try the same fix twice for same failure.     │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow — How Information Moves

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW MAP                                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  HUMAN INPUTS                    EVOLUTION LOOP                    GOVERNANCE          │
│  ────────────                    ──────────────                    ──────────          │
│                                                                                         │
│  ┌─────────┐                                                                          
│  │ GOLDEN  │                                                                          
│  │  SET    │──────┐                                                                    
│  └─────────┘      │                                                                    
│                   │    ┌─────────────────────────────────────────────────────────┐    
│  ┌─────────┐      │    │                                                         │    
│  │  SEED   │      │    │  ┌─────────┐    ┌─────────┐    ┌─────────┐            │    
│  │ FORMULA │──────┼───►│  │GENERATOR│───►│EVALUATOR│───►│ANALYZER │            │    
│  └─────────┘      │    │  │         │    │         │    │         │            │    
│                   │    │  │ reads:  │    │ reads:  │    │ reads:  │            │    
│  ┌─────────┐      │    │  │ • formula│   │ • specs │    │ • scores│            │    
│  │  SEED   │      │    │  │ • golden │   │ • rubric│    │ • shadow│            │    
│  │ RUBRIC  │──────┘    │  │ • project│   │ • golden│    │ • formula│           │    
│  └─────────┘           │  │         │    │         │    │ • rubric│            │    
│                        │  │ writes: │    │ writes: │    │         │            │    
│  ┌─────────┐           │  │ • specs │    │ • scores│    │ writes: │            │    
│  │ PROJECT │──────────►│  │         │    │ • shadow│    │ • diag  │            │    
│  │ CONFIG  │           │  └─────────┘    └─────────┘    └─────────┘            │    
│  └─────────┘           │       │              │              │                   │    
│                        │       ▼              ▼              ▼                   │    
│                        │  ┌─────────┐    ┌─────────┐    ┌─────────┐            │    
│                        │  │  SPECS  │    │  SCORES │    │DIAGNOSIS│            │    
│                        │  │  (YAML) │    │  (YAML) │    │  (YAML) │            │    
│                        │  └─────────┘    └─────────┘    └─────────┘            │    
│                        │                       │              │                   │    
│                        │                       └──────┬───────┘                   │    
│                        │                              ▼                           │    
│                        │                       ┌─────────────┐                   │    
│                        │                       │   MUTATOR   │                   │    
│                        │                       │             │                   │    
│                        │                       │ reads:      │                   │    
│                        │                       │ • diagnosis │                   │    
│                        │                       │ • scores    │                   │    
│                        │                       │ • lessons   │                   │    
│                        │                       │             │                   │    
│                        │                       │ writes:     │                   │    
│                        │                       │ • mutation  │                   │    
│                        │                       │ • candidate │                   │    
│                        │                       └─────────────┘                   │    
│                        │                              │                           │    
│                        └──────────────────────────────┼───────────────────────────┘    
│                                                       │                               
│                                                       ▼                               
│                                                ┌─────────────┐                       
│                                                │  CANDIDATE  │                       
│                                                │  (formula   │                       
│                                                │  or rubric) │                       
│                                                └──────┬──────┘                       
│                                                       │                               
│                                                       ▼                               
│                                                ┌─────────────┐                       
│                                                │  GOVERNANCE │                       
│                                                │  (human     │                       
│                                                │  review)    │                       
│                                                └──────┬──────┘                       
│                                                       │                               
│                                          ┌────────────┴────────────┐                 
│                                          ▼                         ▼                 
│                                   ┌─────────────┐          ┌─────────────┐          
│                                   │  PROMOTED   │          │  RUBRIC     │          
│                                   │  FORMULA    │          │  SNAPSHOT   │          
│                                   └─────────────┘          └─────────────┘          
│                                          │                         │                 
│                                          └────────────┬────────────┘                 
│                                                       │                               
│                                                       ▼                               
│                                                ┌─────────────┐                       
│                                                │   LESSONS   │                       
│                                                │  (learned/  │                       
│                                                │   failed)   │                       
│                                                └─────────────┘                       
│                                                       │                               
│                                                       ▼                               
│                                                ┌─────────────┐                       
│                                                │  NEXT RUN   │                       
│                                                │  (uses      │                       
│                                                │  promoted   │                       
│                                                │  formula +  │                       
│                                                │  new rubric │                       
│                                                │  snapshot)  │                       
│                                                └─────────────┘                       
│                                                                                        
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Evolution Loop — Detailed View

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           EVOLUTION LOOP — DETAILED VIEW                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         GENERATOR PHASE                                        │   │
│  │                                                                                 │   │
│  │  INPUTS:                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ formula.yaml (resolved)                                                │   │   │
│  │  │ ├── steps:                                                             │   │   │
│  │  │ │   ├── explore   → "Read codebase, find behavioral areas"             │   │   │
│  │  │ │   ├── analyze   → "Produce predicate inventory"                      │   │   │
│  │  │ │   ├── draft     → "Write spec YAML with state machines"              │   │   │
│  │  │ │   ├── verify    → "Check schema + reference consistency"             │   │   │
│  │  │ │   └── cross_ref → "Link related specs"                               │   │   │
│  │  │ └── specializations: [component_state_tracking, conditional_rendering]  │   │   │
│  │  │                                                                         │   │   │
│  │  │ golden-set.yaml                                                         │   │   │
│  │  │ └── behaviors:                                                          │   │   │
│  │  │     ├── auth-conditional-redirect                                       │   │   │
│  │  │     ├── download-button-visibility                                      │   │   │
│  │  │     └── toa-gated-first-report-creation                                 │   │   │
│  │  │                                                                         │   │   │
│  │  │ project.yaml                                                            │   │   │
│  │  │ └── codebase_path: /path/to/dashboard-v2                               │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  PROCESS:                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ 1. explore: glob/grep/read codebase → build mental model               │   │   │
│  │  │ 2. analyze: produce predicate inventory (hidden/disabled/enabled)       │   │   │
│  │  │ 3. draft: write spec YAML per golden behavior                          │   │   │
│  │  │ 4. verify: check schema + references                                   │   │   │
│  │  │ 5. cross_ref: link related specs                                       │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  OUTPUTS:                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ generator/specs/                                                       │   │   │
│  │  │ ├── auth.conditional-redirect.yaml                                     │   │   │
│  │  │ │   ├── golden_behaviors: [{id: auth-conditional-redirect, coverage:   │   │   │
│  │  │ │   │   partial}]                                                      │   │   │
│  │  │ │   ├── state_machine:                                                 │   │   │
│  │  │ │   │   ├── states: [idle, editing, submitting, success, error]        │   │   │
│  │  │ │   │   └── transitions: [{from: idle, to: editing, guard: click}]     │   │   │
│  │  │ │   ├── conditions: [{if: "agreementAccepted", then: "allow_edit"}]    │   │   │
│  │  │ │   ├── evidence_refs: [{file: "src/routes/...", code: "..."}]         │   │   │
│  │  │ │   └── confidence: {score: 0.85, rationale: "..."}                    │   │   │
│  │  │ │                                                                       │   │   │
│  │  │ ├── download.button-visibility.yaml                                    │   │   │
│  │  │ └── toa.gated-first-report-creation.yaml                               │   │   │
│  │  │                                                                         │   │   │
│  │  │ generator/output.yaml                                                  │   │   │
│  │  │ ├── status: complete                                                   │   │   │
│  │  │ ├── specs_written: 3                                                   │   │   │
│  │  │ ├── overall_confidence: 0.91                                           │   │   │
│  │  │ └── flags_for_analyzer: ["stale evidence ref"]                         │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                               │
│                                         ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         EVALUATOR PHASE                                        │   │
│  │                                                                                 │   │
│  │  INPUTS:                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ generator/specs/*.yaml (the specs to score)                            │   │   │
│  │  │ inputs/rubric.yaml (evaluation criteria)                               │   │   │
│  │  │ inputs/golden-set.yaml (known behaviors)                               │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  PROCESS:                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ For each spec:                                                         │   │   │
│  │  │   1. Check recall: does spec cover each golden behavior?               │   │   │
│  │  │   2. Check precision: are claims supported by code evidence?           │   │   │
│  │  │   3. Check consistency: no contradictions within/between specs?        │   │   │
│  │  │   4. Check rubric compliance: does spec meet all criteria?             │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  OUTPUTS:                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ evaluator/output.yaml (OFFICIAL — machine-comparable)                  │   │   │
│  │  │ ├── spec_scores:                                                       │   │   │
│  │  │ │   ├── toa.gated-first-report-creation:                               │   │   │
│  │  │ │   │   recall: 1.0, precision: 0.90, consistency: 0.95               │   │   │
│  │  │ │   ├── download.button-visibility:                                    │   │   │
│  │  │ │   │   recall: 0.90, precision: 0.95, consistency: 0.95              │   │   │
│  │  │ │   └── auth.conditional-redirect:                                     │   │   │
│  │  │ │       recall: 0.50, precision: 0.90, consistency: 0.90  ← MISS     │   │   │
│  │  │ ├── overall_score: 0.85                                                │   │   │
│  │  │ └── overall_score_breakdown: {recall: 0.80, precision: 0.92}          │   │   │
│  │  │                                                                         │   │   │
│  │  │ evaluator/shadow-findings.yaml (SHADOW — for discovery)                │   │   │
│  │  │ ├── recall_misses:                                                     │   │   │
│  │  │ │   └── behavior_id: auth-conditional-redirect                         │   │   │
│  │  │ │       missing: "TOA guard not in edit flow"                          │   │   │
│  │  │ │       severity: high                                                 │   │   │
│  │  │ ├── precision_findings: [{spec: toa, issue: "inferred wiring"}]       │   │   │
│  │  │ └── rubric_gap_candidates:                                             │   │   │
│  │  │     proposed_only: true  ← CANNOT activate in this run                 │   │   │
│  │  │     gaps: [{criterion: conditional_flow_documentation}]                │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                               │
│                                         ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         ANALYZER PHASE                                         │   │
│  │                                                                                 │   │
│  │  INPUTS:                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ evaluator/output.yaml (official scores)                                │   │   │
│  │  │ evaluator/shadow-findings.yaml (qualitative findings)                  │   │   │
│  │  │ generator/output.yaml (what happened)                                  │   │   │
│  │  │ inputs/formula.yaml (what instructions were used)                      │   │   │
│  │  │ inputs/rubric.yaml (what criteria existed)                             │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  PROCESS: 5-Type Failure Decision Tree                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │                                                                         │   │   │
│  │  │  For each recall miss, apply in order (stop at first match):           │   │   │
│  │  │                                                                         │   │   │
│  │  │  1. search_failure ──────── Did explore fail to find files?            │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  CHECK: Are evidence_refs stale? Do files exist?                 │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     ├── YES → search_failure (stop here)                               │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     └── NO ──► 2. recognition_failure                                 │   │   │
│  │  │                                                                         │   │   │
│  │  │  2. recognition_failure ── Found files but didn't understand?          │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  CHECK: Did the agent recognize the behavior pattern?            │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     ├── YES → recognition_failure (stop here)                          │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     └── NO ──► 3. format_failure                                      │   │   │
│  │  │                                                                         │   │   │
│  │  │  3. format_failure ──────── Spec failed schema validation?             │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  CHECK: Does spec YAML pass AJV validation?                      │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     ├── YES → format_failure (stop here)                               │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     └── NO ──► 4. prompt_failure                                      │   │   │
│  │  │                                                                         │   │   │
│  │  │  4. prompt_failure ──────── Formula never asked for this?              │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  CHECK: Does formula.steps[].prompt mention this behavior?       │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     ├── YES → prompt_failure (stop here)                               │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     └── NO ──► 5. rubric_gap_failure                                  │   │   │
│  │  │                                                                         │   │   │
│  │  │  5. rubric_gap_failure ──── Criterion ABSENT from rubric?              │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  CHECK: Is criterion in rubric.active_criteria?                  │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     ├── YES → rubric_gap_failure (stop here)                           │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     └── NO ──► This shouldn't happen (rubric should have caught it)   │   │   │
│  │  │                                                                         │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  OUTPUT:                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ analyzer/output.yaml                                                   │   │   │
│  │  │ ├── primary_failure_type: search_failure                              │   │   │
│  │  │ ├── diagnosis: "explore step relied on stale file reference"           │   │   │
│  │  │ ├── failure_tier: step_management                                      │   │   │
│  │  │ ├── suggested_mutation: "add reference-validation sub-step"            │   │   │
│  │  │ └── rubric_gap_proposed: false                                         │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                               │
│                                         ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         MUTATOR PHASE                                          │   │
│  │                                                                                 │   │
│  │  INPUTS:                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ analyzer/output.yaml (diagnosis)                                       │   │   │
│  │  │ evaluator/output.yaml (scores)                                         │   │   │
│  │  │ evaluator/shadow-findings.yaml (precision/rubric gaps)                 │   │   │
│  │  │ inputs/formula.yaml (current formula)                                  │   │   │
│  │  │ inputs/rubric.yaml (current rubric)                                    │   │   │
│  │  │ lessons/failed.jsonl (what didn't work)                                │   │   │
│  │  │ lessons/learned.jsonl (what worked)                                    │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  PROCESS: Mutation Tiers + Insanity Prevention                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │                                                                         │   │   │
│  │  │  Mutation Tiers (escalating severity):                                 │   │   │
│  │  │                                                                         │   │   │
│  │  │  Tier 1: prompt_tweak ────── Re-word prompt, add instruction           │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  If failed for this failure_type?                                │   │   │
│  │  │     ├── YES → escalate to Tier 2                                       │   │   │
│  │  │     └── NO ──► try this tier                                           │   │   │
│  │  │                                                                         │   │   │
│  │  │  Tier 2: step_management ─── Add/remove/reorder steps                  │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  If failed for this failure_type?                                │   │   │
│  │  │     ├── YES → escalate to Tier 3                                       │   │   │
│  │  │     └── NO ──► try this tier                                           │   │   │
│  │  │                                                                         │   │   │
│  │  │  Tier 3: parent_guideline ── Add cross-step guidance                   │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  If failed for this failure_type?                                │   │   │
│  │  │     ├── YES → escalate to Tier 4                                       │   │   │
│  │  │     └── NO ──► try this tier                                           │   │   │
│  │  │                                                                         │   │   │
│  │  │  Tier 4: schema_change ───── Change spec schema requirements           │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  If failed for this failure_type?                                │   │   │
│  │  │     ├── YES → escalate to Tier 5                                       │   │   │
│  │  │     └── NO ──► try this tier                                           │   │   │
│  │  │                                                                         │   │   │
│  │  │  Tier 5: tool_change ─────── Add/change tooling                        │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  If failed for this failure_type?                                │   │   │
│  │  │     ├── YES → escalate to Tier 6                                       │   │   │
│  │  │     └── NO ──► try this tier                                           │   │   │
│  │  │                                                                         │   │   │
│  │  │  Tier 6: rubric_mutation ──── Add new evaluation criterion             │   │   │
│  │  │     │                                                                   │   │   │
│  │  │     │  Only if rubric_gap_failure diagnosed                            │   │   │
│  │  │     └── YES → propose rubric candidate                                 │   │   │
│  │  │                                                                         │   │   │
│  │  │  INSANITY CHECK:                                                       │   │   │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  │ Before proposing, check lessons/failed.jsonl:                  │   │   │
│  │  │  │                                                               │   │   │
│  │  │  │ Has {teaching_method: X, failure_type: Y} failed before?     │   │   │
│  │  │  │                                                               │   │   │
│  │  │  │ YES → Must either:                                            │   │   │
│  │  │  │   a) Propose DIFFERENT approach, OR                          │   │   │
│  │  │  │   b) Provide EXPLICIT justification to retry                  │   │   │
│  │  │  │                                                               │   │   │
│  │  │  │ NO → Proceed with proposal                                   │   │   │
│  │  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  OUTPUT:                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ mutator/output.yaml                                                    │   │   │
│  │  │ ├── proposed_change:                                                   │   │   │
│  │  │ │   ├── type: step_management                                         │   │   │
│  │  │ │   ├── target_step: explore                                          │   │   │
│  │  │ │   ├── current: "explore does not validate file paths"               │   │   │
│  │  │ │   ├── proposed: "add reference-validation sub-step"                 │   │   │
│  │  │ │   ├── expected_improvement: "recall 0.50 → 0.90"                   │   │   │
│  │  │ │   └── risk: low                                                     │   │   │
│  │  │ ├── insanity_check:                                                   │   │   │
│  │  │ │   ├── method_already_failed: false                                  │   │   │
│  │  │ │   └── learned_runs: [{run_id: run-0003, result: PASSED}]           │   │   │
│  │  │ └── confidence: 0.88                                                  │   │   │
│  │  │                                                                         │   │   │
│  │  │ mutator/formula-candidate.yaml (if formula mutation)                   │   │   │
│  │  │ └── New formula with reference-validation step added                   │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Governance Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           GOVERNANCE LIFECYCLE                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  FORMULA CANDIDATES:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐ │   │
│  │  │  CANDIDATE  │────►│  REGISTERED │────►│   HUMAN     │────►│  PROMOTED   │ │   │
│  │  │  (created   │     │  (in queue) │     │   REVIEW    │     │  (active)   │ │   │
│  │  │  by mutator)│     │             │     │             │     │             │ │   │
│  │  └─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘ │   │
│  │                                                  │                             │   │
│  │                                                  │                             │   │
│  │                                                  ▼                             │   │
│  │                                           ┌─────────────┐                     │   │
│  │                                           │  REJECTED   │                     │   │
│  │                                           │  (archived) │                     │   │
│  │                                           └─────────────┘                     │   │
│  │                                                                                 │   │
│  │  COMMANDS:                                                                     │   │
│  │  • register_formula_candidate → creates candidate, adds to queue              │   │
│  │  • advance_formula → promotes to active, updates state/current.yaml           │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  RUBRIC CANDIDATES:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐ │   │
│  │  │  CANDIDATE  │────►│  REGISTERED │────►│   HUMAN     │────►│  PROBATION  │ │   │
│  │  │  (created   │     │  (in queue) │     │   REVIEW    │     │  (testing)  │ │   │
│  │  │  by mutator)│     │             │     │             │     │             │ │   │
│  │  └─────────────┘     └─────────────┘     └──────┬──────┘     └──────┬──────┘ │   │
│  │                                                  │                    │        │   │
│  │                                                  │                    │        │   │
│  │                                                  ▼                    ▼        │   │
│  │                                           ┌─────────────┐     ┌─────────────┐ │   │
│  │                                           │  REJECTED   │     │   ACTIVE    │ │   │
│  │                                           │  (archived) │     │  (in next   │ │   │
│  │                                           └─────────────┘     │  snapshot)  │ │   │
│  │                                                               └─────────────┘ │   │
│  │                                                                                 │   │
│  │  COMMANDS:                                                                     │   │
│  │  • register_rubric_candidate → creates candidate, adds to queue               │   │
│  │  • approve_rubric_candidate → moves to probation or active                     │   │
│  │  • reject_rubric_candidate → marks as rejected                                 │   │
│  │  • promote_rubric_snapshot → bundles probationary into new snapshot            │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  RUBRIC SNAPSHOT LIFECYCLE:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                     │   │
│  │  │   SEED      │────►│  SNAPSHOT   │────►│  SNAPSHOT   │────► ...            │   │
│  │  │  (v001)     │     │  (v002)     │     │  (v003)     │                     │   │
│  │  └─────────────┘     └─────────────┘     └─────────────┘                     │   │
│  │                                                                                 │   │
│  │  Each snapshot is:                                                             │   │
│  │  • Frozen (never modified after creation)                                     │   │
│  │  • Versioned (v001, v002, v003...)                                            │   │
│  │  • Referenced by runs (frozen at freeze_inputs time)                          │   │
│  │  • Contains active_criteria + weights                                         │   │
│  │                                                                                 │   │
│  │  PROMOTION PROCESS:                                                            │   │
│  │  1. Collect all probationary candidates                                       │   │
│  │  2. Create new snapshot version (v002 → v003)                                 │   │
│  │  3. Add probationary criteria to active_criteria                              │   │
│  │  4. Update weights from candidate confidence scores                           │   │
│  │  5. Write provenance.yaml (what was promoted, when, why)                      │   │
│  │  6. Update state/current.yaml to point to new snapshot                        │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Lesson Memory System

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           LESSON MEMORY SYSTEM                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  FILES:                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  lessons/learned.jsonl (append-only)                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ {                                                                       │   │   │
│  │  │   "failure_type": "recognition_failure",                               │   │   │
│  │  │   "scenario": "Agent missed conditional UI visibility",                │   │   │
│  │  │   "teaching_method": "verification_crosscheck",                        │   │   │
│  │  │   "result": "PASSED",                                                  │   │   │
│  │  │   "works_on": ["conditional_rendering", "feature_flags"],              │   │   │
│  │  │   "source_ref": "runs/run-0003/analyzer/output.yaml",                 │   │   │
│  │  │   "run_id": "run-0003"                                                 │   │   │
│  │  │ }                                                                       │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  lessons/failed.jsonl (append-only)                                           │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ {                                                                       │   │   │
│  │  │   "failure_type": "prompt_failure",                                    │   │   │
│  │  │   "scenario": "Prompt rewording failed for conditional routing",       │   │   │
│  │  │   "teaching_method": "prompt_reword_only",                             │   │   │
│  │  │   "result": "FAILED",                                                  │   │   │
│  │  │   "source_ref": "runs/run-0010/mutator/output.yaml",                  │   │   │
│  │  │   "run_id": "run-0010"                                                 │   │   │
│  │  │ }                                                                       │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  lessons/index.yaml (generated lookup)                                        │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ by_failure_type:                                                       │   │   │
│  │  │   search_failure:                                                      │   │   │
│  │  │     learned: []                                                        │   │   │
│  │  │     failed: []                                                         │   │   │
│  │  │   recognition_failure:                                                 │   │   │
│  │  │     learned: [{teaching_method: verification_crosscheck, ...}]         │   │   │
│  │  │     failed: []                                                         │   │   │
│  │  │   prompt_failure:                                                      │   │   │
│  │  │     learned: []                                                        │   │   │
│  │  │     failed: [{teaching_method: prompt_reword_only, ...}]              │   │   │
│  │  │   rubric_gap_failure:                                                  │   │   │
│  │  │     learned: [{teaching_method: rubric_candidate_proposal, ...}]      │   │   │
│  │  │     failed: [{teaching_method: prompt_tweak, ...}]                    │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  HOW IT WORKS:                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  1. Mutator reads lessons/failed.jsonl before proposing                        │   │
│  │                                                                                 │   │
│  │  2. Checks: Has {teaching_method: X, failure_type: Y} failed before?          │   │
│  │                                                                                 │   │
│  │  3. If YES:                                                                    │   │
│  │     a) Propose DIFFERENT approach, OR                                          │   │
│  │     b) Provide EXPLICIT justification to retry                                 │   │
│  │                                                                                 │   │
│  │  4. If NO: Proceed with proposal                                               │   │
│  │                                                                                 │   │
│  │  5. After run completes:                                                       │   │
│  │     - If mutation worked → append to learned.jsonl                             │   │
│  │     - If mutation failed → append to failed.jsonl                              │   │
│  │                                                                                 │   │
│  │  WHY: Reinforcement learning at the formula level.                             │   │
│  │       Never try the same fix twice for same failure.                           │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Formula Inheritance Chain

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           FORMULA INHERITANCE CHAIN                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  ┌─────────────────┐                                                          │   │
│  │  │ universal.yaml  │  ← Base formula (all ecosystems)                        │   │
│  │  │                 │                                                          │   │
│  │  │ steps:          │                                                          │   │
│  │  │  - explore      │                                                          │   │
│  │  │  - analyze      │                                                          │   │
│  │  │  - draft        │                                                          │   │
│  │  │  - verify       │                                                          │   │
│  │  │  - cross_ref    │                                                          │   │
│  │  │                 │                                                          │   │
│  │  │ validations:    │                                                          │   │
│  │  │  - schema_valid │                                                          │   │
│  │  │  - refs_resolve │                                                          │   │
│  │  └────────┬────────┘                                                          │   │
│  │           │                                                                    │   │
│  │           │ extends                                                           │   │
│  │           ▼                                                                    │   │
│  │  ┌─────────────────┐                                                          │   │
│  │  │ frontend.yaml   │  ← Frontend specialization                              │   │
│  │  │                 │                                                          │   │
│  │  │ extends:        │                                                          │   │
│  │  │  universal.yaml │                                                          │   │
│  │  │                 │                                                          │   │
│  │  │ behavior_shapes:│                                                          │   │
│  │  │  - stateful_ui  │                                                          │   │
│  │  │  - conditional  │                                                          │   │
│  │  │    _flow        │                                                          │   │
│  │  │                 │                                                          │   │
│  │  │ specializations:│                                                          │   │
│  │  │  - component    │                                                          │   │
│  │  │    _state       │                                                          │   │
│  │  │  - conditional  │                                                          │   │
│  │  │    _rendering   │                                                          │   │
│  │  └────────┬────────┘                                                          │   │
│  │           │                                                                    │   │
│  │           │ extends (via seed)                                                │   │
│  │           ▼                                                                    │   │
│  │  ┌─────────────────┐                                                          │   │
│  │  │ frontend-       │  ← First evolution (added state_machine_boundaries)     │   │
│  │  │ derived.yaml    │                                                          │   │
│  │  │                 │                                                          │   │
│  │  │ extends:        │                                                          │   │
│  │  │  frontend.yaml  │                                                          │   │
│  │  │                 │                                                          │   │
│  │  │ steps:          │                                                          │   │
│  │  │  - explore      │  ← Added output: state_machine_boundaries               │   │
│  │  │  - analyze      │                                                          │   │
│  │  │  - draft        │                                                          │   │
│  │  │  - verify       │                                                          │   │
│  │  │  - cross_ref    │                                                          │   │
│  │  └────────┬────────┘                                                          │   │
│  │           │                                                                    │   │
│  │           │ extends                                                           │   │
│  │           ▼                                                                    │   │
│  │  ┌─────────────────┐                                                          │   │
│  │  │ frontend-       │  ← Second evolution (added state_transition_map)        │   │
│  │  │ derived-v002    │                                                          │   │
│  │  │ .yaml           │                                                          │   │
│  │  │                 │                                                          │   │
│  │  │ steps:          │                                                          │   │
│  │  │  - explore      │                                                          │   │
│  │  │  - analyze      │                                                          │   │
│  │  │  - draft        │  ← Added output: state_transition_map                   │   │
│  │  │  - verify       │                                                          │   │
│  │  │  - cross_ref    │                                                          │   │
│  │  └────────┬────────┘                                                          │   │
│  │           │                                                                    │   │
│  │           │ extends                                                           │   │
│  │           ▼                                                                    │   │
│  │  ┌─────────────────┐                                                          │   │
│  │  │ frontend-       │  ← Third evolution (added predicate_inventory)          │   │
│  │  │ derived-v003    │                                                          │   │
│  │  │ -consolidated   │  ← CURRENTLY ACTIVE (referenced by state/current.yaml)  │   │
│  │  │ .yaml           │                                                          │   │
│  │  │                 │                                                          │   │
│  │  │ steps:          │                                                          │   │
│  │  │  - explore      │  ← output: state_machine_boundaries                     │   │
│  │  │  - analyze      │  ← output: predicate_inventory                          │   │
│  │  │  - draft        │  ← output: state_transition_map                         │   │
│  │  │  - verify       │                                                          │   │
│  │  │  - cross_ref    │                                                          │   │
│  │  └─────────────────┘                                                          │   │
│  │                                                                                 │   │
│  │  RESOLUTION:                                                                   │   │
│  │  When freeze_inputs runs, it recursively merges the extends chain:            │   │
│  │  universal → frontend → derived → derived-v002 → derived-v003                │   │
│  │  The final formula.yaml in runs/run-XXX/inputs/ has NO extends field —       │   │
│  │  all steps/validations/specializations are flattened and inlined.             │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Dual-Channel Scoring

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DUAL-CHANNEL SCORING                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  EVALUATOR OUTPUT                                                              │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │                                                                         │   │   │
│  │  │  ┌───────────────────────┐      ┌───────────────────────┐             │   │   │
│  │  │  │   OFFICIAL SCORE     │      │   SHADOW FINDINGS     │             │   │   │
│  │  │  │   REPORT             │      │                       │             │   │   │
│  │  │  │                      │      │                       │             │   │   │
│  │  │  │  • scored_specs      │      │  • recall_hits        │             │   │   │
│  │  │  │  • overall_score     │      │  • recall_misses      │             │   │   │
│  │  │  │  • breakdown         │      │  • precision_findings │             │   │   │
│  │  │  │  • confidence        │      │  • consistency        │             │   │   │
│  │  │  │                      │      │  • rubric_gap_        │             │   │   │
│  │  │  │  MACHINE-COMPARABLE  │      │    candidates         │             │   │   │
│  │  │  │  (for reproducibility│      │                       │             │   │   │
│  │  │  │   and cross-run      │      │  QUALITATIVE          │             │   │   │
│  │  │  │   comparison)        │      │  (for rubric          │             │   │   │
│  │  │  │                      │      │   discovery)          │             │   │   │
│  │  │  └───────────┬──────────┘      └───────────┬───────────┘             │   │   │
│  │  │              │                             │                         │   │   │
│  │  └──────────────┼─────────────────────────────┼─────────────────────────┘   │   │
│  │                 │                             │                             │   │
│  │                 ▼                             ▼                             │   │
│  │  ┌───────────────────────┐      ┌───────────────────────┐                 │   │
│  │  │      ANALYZER         │      │      ANALYZER         │                 │   │
│  │  │                       │      │                       │                 │   │
│  │  │  Uses for:            │      │  Uses for:            │                 │   │
│  │  │  • Overall score      │      │  • Recall misses      │                 │   │
│  │  │  • Per-spec scores    │      │  • Precision issues   │                 │   │
│  │  │  • Confidence         │      │  • Rubric gap suspects│                 │   │
│  │  └───────────────────────┘      └───────────────────────┘                 │   │
│  │                                                                                 │   │
│  │  WHY TWO CHANNELS:                                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │                                                                         │   │   │
│  │  │  1. OFFICIAL channel ensures reproducibility:                          │   │   │
│  │  │     - Same inputs → same scores                                        │   │   │
│  │  │     - Cross-run comparison is valid                                    │   │   │
│  │  │     - No same-run goalpost shifting                                    │   │   │
│  │  │                                                                         │   │   │
│  │  │  2. SHADOW channel enables discovery:                                  │   │   │
│  │  │     - Can propose new criteria                                         │   │   │
│  │  │     - Cannot activate in same run                                      │   │   │
│  │  │     - Goes through governance before affecting scoring                 │   │   │
│  │  │                                                                         │   │   │
│  │  │  3. PREVENTS self-justifying criteria:                                 │   │   │
│  │  │     - A weak formula can't invent criteria that reward its style       │   │   │
│  │  │     - Discovery is separate from scoring                              │   │   │
│  │  │                                                                         │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. State Management

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           STATE MANAGEMENT                                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  MUTABLE STATE (changes over time):                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  state/current.yaml                                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ current_formula_ref: formulas/promoted/frontend-derived-v003.yaml      │   │   │
│  │  │ current_rubric_snapshot_ref: rubrics/snapshots/v002/rubric.yaml        │   │   │
│  │  │ current_golden_set_ref: goldens/projects/sample-project/behaviors.yaml │   │   │
│  │  │ current_project_ref: config/projects/sample-project.yaml               │   │   │
│  │  │ next_run_id: run-0016                                                  │   │   │
│  │  │ last_prepared_run_id: run-0015                                         │   │   │
│  │  │ mode: official                                                         │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  state/queue.yaml                                                              │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ pending_promotions:                                                     │   │   │
│  │  │   formulas: [frontend-derived-stale-reference-recovery]                │   │   │
│  │  │   rubric_criteria: [conditional_flow_documentation, stale_golden...]   │   │   │
│  │  │ pending_reviews:                                                        │   │   │
│  │  │   - formula:frontend-derived-stale-reference-recovery                  │   │   │
│  │  │   - rubric:conditional_flow_documentation                              │   │   │
│  │  │   - rubric:stale_golden_vs_observed_implementation                     │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  state/checkpoints/<run-id>.yaml                                              │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ run_id: run-0015                                                       │   │   │
│  │  │ phase: register                                                        │   │   │
│  │  │ status: complete                                                       │   │   │
│  │  │ updated_at: 2026-04-22T12:30:00Z                                       │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  IMMUTABLE STATE (append-only or frozen):                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  runs/run-0015/ (immutable after completion)                                   │   │
│  │  ├── manifest.yaml                                                            │   │
│  │  ├── inputs/ (frozen at freeze_inputs time)                                   │   │
│  │  ├── generator/specs/ (written once)                                          │   │
│  │  ├── evaluator/output.yaml (written once)                                     │   │
│  │  ├── analyzer/output.yaml (written once)                                      │   │
│  │  └── mutator/output.yaml (written once)                                       │   │
│  │                                                                                 │   │
│  │  rubrics/snapshots/v002/rubric.yaml (frozen after creation)                   │   │
│  │  formulas/promoted/*.yaml (frozen after promotion)                            │   │
│  │  lessons/learned.jsonl (append-only)                                          │   │
│  │  lessons/failed.jsonl (append-only)                                           │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  LOCKS (prevent concurrent execution):                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                 │   │
│  │  state/locks/<run-id>.lock                                                    │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ Created at: 2026-04-22T12:00:00Z                                       │   │   │
│  │  │ Released at: 2026-04-22T12:30:00Z (after register phase)              │   │   │
│  │  │                                                                         │   │   │
│  │  │ Prevents: Two instances of same run executing simultaneously           │   │   │
│  │  │ Recovery: node scripts/cli.js release_lock --run-id run-0015           │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary: How It All Connects

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE COMPLETE PICTURE                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  HUMAN PROVIDES:                                                                       │
│  • Golden set (known behaviors)                                                        │
│  • Seed formula (how to produce specs)                                                 │
│  • Seed rubric (how to evaluate specs)                                                 │
│  • Project config (codebase path)                                                      │
│                                                                                         │
│  SYSTEM EVOLVES:                                                                       │
│  • Formula through mutations (prompt_tweak → step_management → ...)                    │
│  • Rubric through discovered criteria (candidate → probation → active)                 │
│  • Lessons through success/failure tracking (learned.jsonl / failed.jsonl)            │
│                                                                                         │
│  GOVERNANCE CONTROLS:                                                                  │
│  • Formula promotion requires human review                                             │
│  • Rubric promotion requires human review                                              │
│  • Same-run rubric activation is forbidden                                             │
│  • Insanity prevention prevents repeated failures                                      │
│                                                                                         │
│  FILES ARE THE MEMORY:                                                                 │
│  • Every phase reads from and writes to YAML files                                     │
│  • Agents are ephemeral — each reads files the previous agent wrote                    │
│  • Frozen inputs ensure reproducibility                                                │
│  • Immutable run history enables comparison                                            │
│                                                                                         │
│  THE LOOP CONVERGES:                                                                   │
│  • Each run improves the formula based on diagnosed failures                           │
│  • Lessons prevent repeating failed approaches                                         │
│  • Rubric discovery expands what gets evaluated                                        │
│  • Over time, the formula catches more automatically                                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```
