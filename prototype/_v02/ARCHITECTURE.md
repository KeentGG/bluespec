# Blueprint Mode — Prototype v02 Architecture

> Status: DESIGN — pre-implementation
> v01 lessons applied: agent-initiated lifecycle, OpenCode-native orchestration, remove numeric scoring, collapse rubric into formula feedback, add rolling-set comparative analysis, enforce project-agnostic mutations, single code path.

---

## 1. Design Principles

1. **Agent-initiated, not script-initiated.** The user says "start training" — an AI agent orchestrates the full lifecycle. No Node.js orchestrator state machine.
2. **OpenCode-native.** Agents, skills, commands, tools, plugins — all first-class OpenCode primitives. No custom orchestration framework.
3. **One code path.** The harness agent reads the skill and calls CLI tools. No dual orchestration (SKILL.md + orchestrator.js).
4. **Files are the memory.** YAML files store all state. Agents are ephemeral. The next agent reads files the previous agent wrote.
5. **Thin scripts, rich agents.** CLI scripts do file operations only. Agents do all reasoning, exploration, and creative work.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    v02 — OPENCODE-NATIVE ARCHITECTURE                       │
│                                                                              │
│  ════════════════════════  USER INTERFACE  ══════════════════════════════   │
│                                                                              │
│   User types: /start-training                                                │
│     → OpenCode loads harness PRIMARY agent                                   │
│     → Agent loads blueprint-harness SKILL.md                                 │
│     → Agent orchestrates full lifecycle                                       │
│                                                                              │
│  ════════════════════════  AGENT LAYER  ═════════════════════════════════   │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                     HARNESS AGENT (primary)                          │  │
│   │                                                                      │  │
│   │  Reads skill. Drives phases. Calls CLI tools. Spawns subagents.     │  │
│   │  Can switch to with Tab. Invoked by /start-training.                │  │
│   │                                                                      │  │
│   │  ┌──────────────────────────────────────────────────────────────┐   │  │
│   │  │              FORMULA STEPS (executed by harness)             │   │  │
│   │  │                                                              │   │  │
│   │  │  ┌──────────┐   ┌──────────┐   ┌──────────┐               │   │  │
│   │  │  │ EXPLORE  │──→│  DRAFT   │──→│  VERIFY  │               │   │  │
│   │  │  │ (tools)  │   │(subagent)│   │(cli.js)  │               │   │  │
│   │  │  └──────────┘   └──────────┘   └──────────┘               │   │  │
│   │  │                                                              │   │  │
│   │  └──────────────────────────────────────────────────────────────┘   │  │
│   │                              │                                       │  │
│   │                        produces specs                                │  │
│   │                              │                                       │  │
│   │  ┌──────────────────────────────────────────────────────────────┐   │  │
│   │  │                   EVALUATE PHASE                             │   │  │
│   │  │                                                              │   │  │
│   │  │  ┌───────────┐   ┌──────────────┐   ┌──────────────┐       │   │  │
│   │  │  │  GOLDEN   │   │  STRUCTURE   │   │ FACT-CHECK   │       │   │  │
│   │  │  │  SET      │   │  RUBRIC      │   │              │       │   │  │
│   │  │  │  (binary) │   │  (qualitative│   │ evidence_refs│       │   │  │
│   │  │  │           │   │   review)    │   │ vs source    │       │   │  │
│   │  │  └─────┬─────┘   └──────┬───────┘   └──────┬───────┘       │   │  │
│   │  │        │                │                   │                │   │  │
│   │  │        └────────┬───────┴───────────────────┘                │   │  │
│   │  │                 │                                            │   │  │
│   │  │           produces results                                   │   │  │
│   │  └──────────────────────────────────────────────────────────────┘   │  │
│   │                              │                                       │  │
│   │  ┌──────────────────────────────────────────────────────────────┐   │  │
│   │  │                   ROLLING SET                                │   │  │
│   │  │  new unique specs merged in (deduped)                        │   │  │
│   │  └──────────────────────────────────────────────────────────────┘   │  │
│   │                              │                                       │  │
│   │  ┌──────────────────────────────────────────────────────────────┐   │  │
│   │  │                   ANALYZE PHASE                              │   │  │
│   │  │                                                              │   │  │
│   │  │  Spawns analyzer subagent via Task tool                     │   │  │
│   │  │  Compares: current specs vs golden set vs rolling set       │   │  │
│   │  │  Diagnoses: WHY were things missed?                         │   │  │
│   │  │  5 failure types: search/recognition/format/prompt/rubric  │   │  │
│   │  └──────────────────────────────────────────────────────────────┘   │  │
│   │                              │                                       │  │
│   │  ┌──────────────────────────────────────────────────────────────┐   │  │
│   │  │                   MUTATE PHASE                               │   │  │
│   │  │                                                              │   │  │
│   │  │  Spawns mutator subagent via Task tool                      │   │  │
│   │  │  Produces: improved EXPLORE step prompt                     │   │  │
│   │  │  Contamination guardrail: project-agnostic only             │   │  │
│   │  └──────────────────────────────────────────────────────────────┘   │  │
│   │                              │                                       │  │
│   │  ┌──────────────────────────────────────────────────────────────┐   │  │
│   │  │                   REGISTER PHASE                             │   │  │
│   │  │  Register candidates for governance                          │   │  │
│   │  │  STOP. Do NOT advance_formula or promote_rubric.             │   │  │
│   │  └──────────────────────────────────────────────────────────────┘   │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ══════════════════════  SUBAGENT LAYER  ═══════════════════════════════   │
│                                                                              │
│   spec-generator    evaluator    analyzer    mutator                         │
│   (draft specs)     (evaluate)   (diagnose)  (propose mutation)             │
│   hidden, via Task  hidden       hidden      hidden                         │
│                                                                              │
│  ══════════════════════  TOOL LAYER  ═══════════════════════════════════   │
│                                                                              │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐      │
│   │  CLI (cli.js)    │   │  Custom Tools    │   │  Plugins         │      │
│   │  init, freeze,   │   │  yaml-ops.ts     │   │  lifecycle hooks │      │
│   │  validate,       │   │  read_yaml,      │   │  auto-checkpoint │      │
│   │  rollset,        │   │  write_yaml      │   │                  │      │
│   │  register        │   │                  │   │                  │      │
│   └──────────────────┘   └──────────────────┘   └──────────────────┘      │
│                                                                              │
│  ══════════════════════  ISOLATION RULES  ═══════════════════════════════  │
│                                                                              │
│   THE WALL:                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  HARNESS + SPEC-GENERATOR + VERIFIER                                │  │
│   │  MUST NEVER SEE:                                                    │  │
│   │  • Golden Set contents                                              │  │
│   │  • Rolling Set contents                                             │  │
│   │  • Lesson data                                                      │  │
│   │  They see ONLY: formula steps + project context                     │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  EVALUATOR + ANALYZER + MUTATOR                                     │  │
│   │  Analyzer sees everything (needs full context to compare)           │  │
│   │  Evaluator sees: specs + golden set + structure rubric + source     │  │
│   │  Mutator sees: diagnosis + lessons (counts only) + formula         │  │
│   │  Mutator NEVER sees: rolling set CONTENTS, golden set CONTENTS     │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  CONVERGENCE: When a single run reproduces ALL specs in the rolling set     │
│  + passes all golden behaviors + passes structure rubric, flag for human.    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. OpenCode Primitives

### 3.1 Entry Point: `/start-training` Command

```markdown
# .opencode/commands/start-training.md
---
description: Start one evolution cycle
agent: harness
subtask: false
---
Load the blueprint-harness skill and execute one bounded evolution cycle.
Read state/current.yaml for the next run ID, then proceed through all phases.
Stop after register. Do NOT call advance_formula or promote_rubric_snapshot.
```

### 3.2 Harness Agent (Primary)

```markdown
# .opencode/agents/harness.md
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
    "evaluator": allow
    "analyzer": allow
    "mutator": allow
    "*": deny
  skill:
    "blueprint-harness": allow
---
```

The harness is a **primary agent** — user-facing, switchable with Tab, capable of spawning subagents via the Task tool.

### 3.3 Subagents (Hidden)

| Agent | File | Purpose | Tools |
|---|---|---|---|
| spec-generator | `agents/spec-generator.md` | Write spec YAML from exploration results | read, glob, grep, write |
| evaluator | `agents/evaluator.md` | Golden check + structure review + fact-check | read, glob, grep, write |
| analyzer | `agents/analyzer.md` | 5-type failure diagnosis | read, glob, grep, write |
| mutator | `agents/mutator.md` | Propose explore prompt mutation | read, glob, grep, write |

All subagents are `hidden: true` — only invoked programmatically by the harness via the Task tool.

### 3.4 Skill

```markdown
# .opencode/skills/blueprint-harness/SKILL.md
---
name: blueprint-harness
description: Blueprint Mode evolution cycle — explore, produce specs, evaluate, diagnose, mutate
---
```

The skill defines the full lifecycle. It is the single source of truth for what the harness agent does.

### 3.5 Custom Tools

```typescript
# .opencode/tools/yaml-ops.ts
// read_yaml, write_yaml, validate_yaml
// Type-safe with Zod, invoked as native tools
```

### 3.6 Plugin

```typescript
# .opencode/plugins/blueprint-lifecycle.ts
// Hooks: tool.execute.after, session.idle
// Auto-checkpoint, notification on completion
```

---

## 4. Core Concepts

### 4.1 The Formula

The formula is a set of exploration instructions executed by AI agents.

| Step | Role | What it does |
|------|------|-------------|
| `explore` | Harness (tools) | Explores codebase structure. Shaped by exploration rubric. |
| `analyze` | Harness (tools) | Identifies behavioral patterns worth documenting. |
| `draft` | Spec Generator subagent | Produces structured spec YAML files. |
| `verify` | Harness (cli.js) | Validates specs against schema + cross-ref resolution. |
| `cross-ref` | Harness (cli.js) | Mechanical check: do all cross-spec references resolve? |

The formula mutates over runs. The EXPLORE step prompt is the primary mutation target.

### 4.2 Two Rubrics

| | Structure Rubric | Exploration Rubric |
|---|---|---|
| **Purpose** | "Is this spec well-formed?" | "What should we look for?" |
| **Applied** | AFTER spec generation | BEFORE spec generation |
| **Audience** | Evaluator subagent | Harness agent (shapes exploration) |
| **Lifecycle** | candidate → probation → active | candidate → probation → active |

Both rubrics grow over time through the governed lifecycle. Discovered criteria never activate in the same run.

### 4.3 Golden Set (Mechanical)

A human-curated list of known behaviors. Binary check: **"did we find a spec for this behavior?"** — yes or no. No scoring. No weighting.

The golden set is **hidden from the harness** during explore/draft phases. Only the evaluator and analyzer see it.

### 4.4 Rolling Discovered Specs

A deduplicated set of ALL unique specs ever produced across all runs.

| Property | Rule |
|----------|------|
| **Who adds to it** | After each run, new unique specs are merged in |
| **Who can read it** | ONLY the Analyzer |
| **Who must NOT see it** | Harness, Spec Generator, Verifier |
| **Purpose** | Institutional knowledge across runs |
| **Used for** | Comparative analysis: "did this run miss specs that previous runs found?" |

### 4.5 Lessons (Insanity Prevention)

Recorded after each run: `failure_type × teaching_method → PASSED / FAILED`.

- **Aggregate counts only** — no scenario text, no behavioral findings, no spec IDs
- Prevents the mutator from retrying the same failed approach
- Injected into analyzer and mutator prompts. NEVER into harness/explorer.

### 4.6 Contamination Guardrail

Before accepting any mutation, verify:

```
✅ Describes a structural relationship or exploration technique
   ("trace imports from entry points to find peripheral modules")

❌ Names a specific file, directory, function, variable, or module
❌ Names a specific pattern category ("hooks", "context", "middleware")
❌ Encodes a finding from a previous run
```

Test: "Would this instruction still make sense if the project had a different directory structure and different framework usage?"

---

## 5. Run Lifecycle

User types `/start-training` or says "start training".

```
Phase 1: INIT
  → harness runs: node scripts/cli.js init --run-id run-XXXX
  → creates runs/run-XXXX/manifest.yaml

Phase 2: FREEZE
  → harness runs: node scripts/cli.js freeze --run-id run-XXXX
  → copies formula, project, golden set into inputs/

Phase 3: EXPLORE (harness agent, direct tools)
  → reads formula step prompts for guidance
  → uses glob/grep/read to explore codebase
  → DOES NOT read golden-set.yaml, rollingset/, lessons/
  → output: mental model of codebase behaviors

Phase 4: DRAFT (harness spawns spec-generator subagent)
  → harness writes delegation manifests
  → spawns spec-generator via Task tool (one per spec)
  → subagent reads source files, writes spec YAML
  → output: runs/run-XXXX/generator/specs/*.yaml

Phase 5: VERIFY (harness runs cli.js validate)
  → harness runs: node scripts/cli.js validate --run-id run-XXXX
  → schema check + cross-ref resolution
  → output: runs/run-XXXX/verifier/output.yaml

Phase 6: EVALUATE (harness spawns evaluator subagent)
  → evaluator checks:
    a. Binary golden set (found/not-found per behavior)
    b. Structure rubric review (qualitative)
    c. Fact-check evidence_refs against source code
  → output: evaluator/golden-results.yaml, structure-review.yaml, fact-check.yaml

Phase 7: ROLL SET (harness runs cli.js rollset)
  → harness runs: node scripts/cli.js rollset --run-id run-XXXX
  → merges new unique specs into rollingset/

Phase 8: DIAGNOSE (harness spawns analyzer subagent)
  → analyzer applies 5-type failure decision tree
  → compares current specs vs golden set vs rolling set
  → output: analyzer/output.yaml

Phase 9: MUTATE (harness spawns mutator subagent)
  → mutator reads analyzer diagnosis + lesson history
  → proposes improved explore step prompt
  → applies contamination guardrail
  → output: mutator/output.yaml

Phase 10: REGISTER (harness runs cli.js register)
  → harness runs: node scripts/cli.js register --run-id run-XXXX
  → registers formula/rubric candidates for governance

→ harness reports results, STOPS
→ does NOT call advance_formula or promote_rubric_snapshot
```

---

## 6. Agent Roles

| Agent | Type | When | Knows | Must NOT know |
|---|---|---|---|---|
| **Harness** | primary | Full lifecycle | Formula steps, project context | Golden set, rolling set, lessons |
| **Spec Generator** | subagent (hidden) | Draft step | Exploration results, spec schema | Golden set, rolling set, lessons |
| **Evaluator** | subagent (hidden) | Evaluate phase | Specs, golden set, structure rubric, source | Rolling set contents, lessons |
| **Analyzer** | subagent (hidden) | Diagnose phase | Everything | — |
| **Mutator** | subagent (hidden) | Mutate phase | Diagnosis, lessons (counts only), formula | Rolling set contents, golden set contents |

---

## 7. 5-Type Failure Taxonomy

The analyzer applies this decision tree in order. Stop at the first match.

1. **search_failure** — explore failed to find the relevant files
2. **recognition_failure** — found files but didn't understand the pattern
3. **format_failure** — spec failed schema validation
4. **prompt_failure** — formula never asked for this behavior
5. **rubric_gap_failure** — criterion absent from rubric (only valid after 1-4 exhausted)

---

## 8. The Rolling Set in Detail

```
runs/rollingset/
├── index.yaml       # ID → metadata mapping
├── specs/           # deduplicated spec files
│   ├── auth_login_flow.yaml
│   ├── state_management_store.yaml
│   └── ...
└── stats.yaml       # count by category, growth over time
```

**Merge logic (per run):**
- Extract spec IDs from current run's generated specs
- Compare against rolling set index
- Any spec ID NOT already present → add to rolling set
- Update stats

**Analyzer use:**
- "Run N produced 12 specs. Rolling set has 18 unique specs. Which 6 are missing?"
- "The missing specs cluster around utility modules — did the explore step skip those?"

**Strict governance:**
- Harness agent NEVER reads rolling set files
- Mutator NEVER receives rolling set contents (only aggregate stats like "18 total, 12 produced")

---

## 9. Human Promotion

Convergence signal: **N consecutive runs where a single run reproduces ALL specs in the rolling set + passes all golden behaviors + passes structure rubric.**

When this happens:
- The system flags the formula for human review
- Human decides: promote formula to promoted/ (becomes the active formula for future fine-tuning) or keep running
- If promoted: formula moves to `formulas/promoted/`, state updated

The system does NOT auto-promote. Human gates the final decision.

---

## 10. File Structure

```
prototype/_v02/
├── ARCHITECTURE.md                              # This document
├── opencode.json                                # Agent + tool + plugin config
├── AGENTS.md                                    # Project-level rules
├── .opencode/
│   ├── commands/
│   │   └── start-training.md                    # /start-training entry point
│   ├── agents/
│   │   ├── harness.md                           # PRIMARY orchestrator
│   │   ├── spec-generator.md                    # Draft subagent
│   │   ├── evaluator.md                         # Evaluate subagent
│   │   ├── analyzer.md                          # Diagnose subagent
│   │   └── mutator.md                           # Mutate subagent
│   ├── skills/
│   │   └── blueprint-harness/
│   │       └── SKILL.md                         # Core lifecycle instructions
│   ├── tools/
│   │   └── yaml-ops.ts                          # YAML read/write/validate
│   └── plugins/
│       └── blueprint-lifecycle.ts               # Lifecycle hooks
├── scripts/
│   └── cli.js                                   # Thin CLI tool (~400 lines)
│       ├── init                                 # Create run scaffold
│       ├── freeze                               # Copy + resolve inputs
│       ├── validate                             # Schema + cross-ref check
│       ├── rollset                              # Merge into rolling set
│       └── register                             # Register candidates
├── state/
│   ├── current.yaml                             # Active refs + run counter
│   └── queue.yaml                               # Pending promotions
├── formulas/
│   ├── seed/                                    # Initial formulas
│   ├── candidates/                              # Mutator outputs
│   ├── promoted/                                # Human-approved
│   └── archived/
├── rubrics/
│   ├── seed/                                    # Initial criteria
│   ├── candidates/                              # Proposed new criteria
│   └── active.yaml                              # Currently active criteria
├── goldens/
│   └── projects/<id>/
│       └── behaviors.yaml                       # Human-curated known behaviors
├── runs/
│   ├── run-0001/
│   │   ├── manifest.yaml
│   │   ├── inputs/                              # Frozen formula, project, golden
│   │   ├── generator/                           # Explore + draft output + specs/
│   │   ├── verifier/                            # Schema + cross-ref results
│   │   ├── evaluator/                           # Golden + structure + fact-check
│   │   ├── analyzer/                            # Diagnosis
│   │   └── mutator/                             # Mutation proposal
│   └── rollingset/                              # Deduplicated specs across runs
│       ├── index.yaml
│       ├── specs/
│       └── stats.yaml
├── lessons/
│   ├── learned.jsonl                            # Append-only
│   ├── failed.jsonl                             # Append-only
│   └── index.yaml                               # Generated lookup
├── schemas/
│   └── spec.schema.yaml                         # Spec file format
└── config/
    └── prototype.yaml                           # Provider config
```

---

## 11. What We Removed From v01

| v01 Concept | v02 Replacement |
|-------------|-----------------|
| `node start.js` entry point | `/start-training` command |
| `orchestrator.js` (1,156 lines) | SKILL.md (~80 lines) |
| `cli.js` monolith (1,762 lines) | `cli.js` thin tool (~400 lines) |
| Dual orchestration paths | One path: harness agent reads skill |
| `lib/agent.js` (agent spawning) | OpenCode Task tool (built-in) |
| `lib/evolution.js` (cross-run context) | Skill instruction or plugin |
| Custom checkpoint/lock system | OpenCode session + /resume |
| Numeric rubric scoring (0.0–1.0) | Binary gates + agent reasoning |
| Confidence fields | Removed entirely |
| Precision/recall as scores | Golden set as binary found/not-found |
| Rubric weights | Removed |
| Evaluator as scoring agent | Structure Rubric Agent (qualitative) |
| CLI + Orchestrator dual paths | Single path: agent calls CLI tools |
| Formula `extends` inheritance | Flat formulas, mutation applies directly |
| Agent evaluation (AI judging AI) | Fact-Check Agent (evidence-backed) |
| Lesson scenario text | Aggregate counts only |
| Evolution context module | Folded into skill instructions |

---

## 12. Comparison: v01 vs v02

| Metric | v01 | v02 |
|---|---|---|
| Entry point | `node start` | `/start-training` (agent) |
| Orchestrator | Node state machine (1,156 lines) | Harness agent + SKILL.md (80 lines) |
| CLI | 1,762-line monolith | ~400-line thin tool |
| Agent roles | 4 | 5 (+1: fact-check inside evaluator) |
| Scripts total | 3,974 lines | ~500 lines |
| Code paths | Two (SKILL.md + orchestrator.js) | One (agent reads skill, calls tools) |
| Checkpoint | YAML files + lock | OpenCode session + /resume |
| Provider support | OpenCode, Hermes (planned) | OpenCode-native |

---

## 13. Next Steps

- [ ] Write AGENTS.md with project-level rules
- [ ] Create `/start-training` command
- [ ] Create harness primary agent definition
- [ ] Create 4 subagent definitions (spec-generator, evaluator, analyzer, mutator)
- [ ] Write blueprint-harness SKILL.md
- [ ] Implement thin cli.js (init, freeze, validate, rollset, register)
- [ ] Create yaml-ops custom tool
- [ ] Create blueprint-lifecycle plugin
- [ ] Define spec schema
- [ ] Create initial seed formula
- [ ] Create seed structure rubric criteria
- [ ] Create seed exploration rubric criteria
- [ ] Build golden set for a sample project
- [ ] Run first evolution cycle

---

*Last updated: 2026-05-03*
