# Tasks

> High-level milestones, phase breakdown, and execution tasks for the evolution prototype.

Status: ACTIVE PLAN

---

## Why This Plan Exists

This prototype is not the full Blueprint Mode product. Its purpose is to build the evolution harness first: a governed system that can run spec-formula experiments, preserve artifacts, diagnose failures, and evolve formulas without losing auditability.

The plan below follows the repo's current intent:

- harness before intelligence
- frozen runs before autonomous mutation
- static rubric before adaptive rubric
- diagnose-only rubric discovery before self-evolving rubric promotion
- provider-neutral core before OpenCode / Hermes-specific execution

---

## Planning Principles

- **Files are the memory.** State and outputs should remain inspectable in git.
- **Thin tooling enforces lifecycle.** Agents may propose changes, but tooling governs what becomes official.
- **Official scoring must stay stable.** Candidate rubric criteria do not affect same-run scoring.
- **Prototype scope stays narrow.** Full sync, full codegen, and autonomous promotion are later phases.
- **A real run matters more than scaffolding purity.** The harness must be exercised on a real brownfield target early.
- **CLI as tools, agent as orchestrator.** The CLI commands are stateless, machine-readable tools. The agent decides when to call which command. This separates what runs (CLI) from who decides (agent).

---

## Milestone 1 -- Build the Harness Backbone

### Why this phase exists

Without a harness, there is nothing to train. This phase creates the persistent-file backbone needed for future generation, evaluation, diagnosis, and mutation.

### Outcome

The prototype can materialize a run, freeze its inputs, validate its state, and hold governed formula/rubric artifacts in a stable filesystem layout.

### Tasks

- [x] Create prototype workspace structure under `prototype/_v01/`
- [x] Define seed formula artifacts
- [x] Define seed rubric artifacts
- [x] Define golden-set placeholder structure
- [x] Define mutable state files (`current.yaml`, `queue.yaml`)
- [x] Define schema validation contracts
- [x] Define prompt contracts for Generator / Evaluator / Analyzer / Mutator
- [x] Define provider-neutral integration folders and hook boundaries
- [x] Add architecture and folder documentation
- [x] Add formula candidate registration flow
- [x] Add rubric snapshot promotion flow
- [x] Add formula advancement flow
- [x] Add seed rubric schema and validate seed rubric files (`universal.yaml`, `backend.yaml`, `frontend.yaml`)
- [x] Clarify or remove `rubric.schema.yaml` -- marked deprecated; dead weight removed
- [x] Add queue governance commands: `approve_rubric_candidate`, `reject_rubric_candidate` to drain `state/queue.yaml`

> All items completed 2026-04-17. Full governance pipeline tested end-to-end with `conditional_flow_documentation` (rubric) and `frontend-derived` (formula).

---

## Milestone 2 -- Materialize the First Real Evolution Cycle

### Why this phase exists

The harness is only valuable if it can support a complete experiment cycle. This phase proves the prototype can move from static artifacts to an actual run sequence on a real project.

### Outcome

The system can execute one end-to-end run using frozen inputs and produce role-specific outputs for later analysis.

### Tasks

- [x] Point the sample project config at a real target (`dashboard-v2`)
- [x] Regenerate `run-0001` from the updated target config
- [x] Validate frozen run inputs and candidate registration flow
- [x] Implement `run_generator` — per-step AI calls, `###CURRENT_STEP###` marker for step isolation
- [x] Write generator outputs into `runs/run-000X/generator/` — `output.yaml`, `trace.json`, `steps/`, `specs/`
- [x] Implement `run_evaluator` — scores specs against rubric + golden set; `###ROLE### evaluator` marker
- [x] Write evaluator outputs into `runs/run-000X/evaluator/` — `output.yaml`, `trace.json`
- [x] Implement `run_analyzer` — diagnoses failures; `###ROLE### analyzer` marker
- [x] Write analyzer outputs into `runs/run-000X/analyzer/` — `output.yaml`
- [x] Implement `run_mutator` — proposes mutations; `###ROLE### mutator` marker
- [x] Write mutator outputs into `runs/run-000X/mutator/` — `output.yaml`
- [x] Add formula `extends` resolution logic
  - `freeze_inputs` calls `resolveFormulaExtends()` to inline the full extends chain; verified with `run-0002` (5 steps inlined) and `run-0003`
- [ ] Add run summary materialization (`summary.md` or equivalent)
- [ ] Define agent output schemas for each role
  - ✅ Generator output schema: `schemas/generator-output.schema.yaml`
  - ✅ Generator step schema: `schemas/generator-step.schema.yaml`
  - [ ] Evaluator output schema
  - [ ] Analyzer output schema
  - [ ] Mutator output schema
- [ ] Add precision workflow (false-positive schema + spot-check mechanism)
- [ ] Validate `codebase_path` existence in project config before run materialization

> Full evolution loop verified on `run-0002` (all role outputs materialized: generator, evaluator, analyzer, mutator). Full autonomous agentic run on `run-0003` via `node start`: bounded loop completed by OpenCode agent, `frontend-derived-state-boundaries.yaml` registered as formula candidate.

### Run Artifacts

| Run | Generator | Evaluator | Analyzer | Mutator | Registered |
|-----|-----------|-----------|----------|---------|------------|
| run-0001 | scaffold only | — | — | — | — |
| run-0002 | 5/5 steps | 0.74 score | recognition_failure / prompt_tweak | step_management | — |
| run-0003 | 5/5 steps | 0.74 score | recognition_failure / prompt_tweak | step_management | `frontend-derived-state-boundaries.yaml` (agent-driven) |

### Run-0003 Findings

- **Stub specs**: Generated specs contain only YAML frontmatter (`id`, `type`, `version`). This is a `local` provider stub limitation — real AI provider would produce actual behavioral content.
- **Canned metrics**: `latency_ms: 0`, `tokens_used` values are hardcoded stub outputs, not real measurements.
- **Governance guardrails confirmed**: `rubric_gap_proposed: false`, `same_run_rubric_activation: false`, `advance_formula` not called — all correct.
- **Bug found and fixed**: `writeCheckpoint` had spread-order bug (`...existing` after `phase`/`status` overwrote new values with stale init values). Fixed and verified. Also `resume_run` displayed misleading "remaining phases" for completed runs; fixed to show "none — run is complete".

---

## Milestone 2c -- Agent Harness (Fully Agentic Orchestration)

### Why this phase exists

The CLI loop is complete and machine-readable. The next step is making it agent-driven. Instead of a human deciding when to run each step, an OpenCode agent bootstraps, reads outputs, and orchestrates the full cycle autonomously.

This is **Option C**: `node start` launches an OpenCode agent, the agent reads the CLI reference and run state, and drives generator → evaluator → analyzer → mutator to completion with no per-step human intervention.

### Architecture Decision (locked via Oracle)

```
node start [--run-id run-XXXX] [--resume]
  → acquires run lock
  → spawns 'opencode run <bootstrapMessage> --dir <workspace>'
  → bootstrapMessage tells agent to load blueprint-harness skill
  → agent calls CLI via bash tool, reads output.yaml after each phase
  → agent writes checkpoints after each phase
  → after register phase, agent stops
  → lock released
```

**Key decisions locked:**
- Entry point: `node start.js` (thin launcher) + repo-versioned `SKILL.md` (not inline system prompt)
- Agent role: CLI Orchestrator, not virtual teammate — deterministic, bounded, stops at register
- Bounded loop: one autonomous session = init → freeze → generator → evaluator → analyzer → mutator → register, then STOP
- `advance_formula` and `promote_rubric_snapshot` excluded from autonomous loop (governance boundary)
- Context management: `state/current.yaml` only for new-run init; after freeze, trust run-artifacts only
- Recovery: checkpoint + lock files per run

### Outcome

A human runs `node start`, optionally specifies a run ID, and the OpenCode agent orchestrates the full evolution cycle autonomously.

### Tasks

- [x] Design the `start` script entry point (`node start [--run-id run-XXXX] [--resume]`)
- [x] Design the system prompt or skill that instructs the agent on:
  - Available CLI commands
  - Run directory structure
  - How to read each role's `output.yaml`
  - Loop termination signals
  - Governance escalation path
- [x] Write `blueprint-harness` skill (`SKILL.md`) for OpenCode agents
- [x] Implement the skill: command reference, output schemas, driving instructions
- [x] Test: run `node start` and verify the agent orchestrates the full loop on its own
  - ✅ run-0003: full autonomous loop completed, formula candidate registered
- [x] Determine checkpoint model: autonomous full loop with per-phase checkpoints (not per-role human review)

### Subtasks (implemented but not previously listed)

- [x] Add checkpoint helpers to `scripts/lib/common.js`: `writeCheckpoint`, `getCheckpoint`, `acquireLock`, `releaseLock`, `RUN_PHASES`, `phasesFrom`, `nextPhase`
- [x] Add checkpoint CLI commands: `checkpoint_run`, `resume_run`, `release_lock`
- [x] Update `state/README.md` with checkpoint and lock documentation
- [x] Update `runs/README.md` with bounded loop phase documentation
- [x] Add `package.json` convenience scripts: `start`, `checkpoint-run`, `resume-run`, `release-lock`

### Open Questions Resolved

- ~~**Bootstrap mechanism**~~ — `node start.js` spawns `opencode run <message> --dir <workspace>` ✅
- ~~**Skill vs system prompt**~~ — SKILL.md at `.opencode/skills/blueprint-harness/SKILL.md`, agent loads via `skill({ name: "blueprint-harness" })` ✅
- ~~**Agent tool discovery**~~ — CLI commands via bash tool, skill provides command reference ✅
- ~~**Checkpoint model**~~ — per-phase checkpoints written by agent after each phase; full loop autonomous ✅
- ~~**Termination**~~ — agent stops after register phase; governance steps (`advance_formula`, `promote_rubric_snapshot`) explicitly excluded from autonomous loop ✅
- ~~**Skill vs MCP**~~ — bash tool calls `node scripts/cli.js`, no MCP needed ✅

### Key Reference

- `start.js` entry point
- `SKILL.md`: `.opencode/skills/blueprint-harness/SKILL.md`
- CLI commands: `prototype/_v01/scripts/cli.js`
- Checkpoint/lock helpers: `scripts/lib/common.js`
- State files: `prototype/_v01/state/checkpoints/<run-id>.yaml`, `prototype/_v01/state/locks/<run-id>.lock`

> Implemented and tested. run-0003 completed full autonomous loop. Bug found in `writeCheckpoint` spread order — fixed before run-0003 checkpoint sync.

### Why this phase exists

Rubric discovery is strategically important, but dangerous if introduced too early into official scoring. This phase isolates discovery as diagnosis only so the system can learn what may be missing without moving the goalpost.

### Outcome

The Analyzer can emit suspected rubric gaps as candidate criteria, and those candidates enter governed storage and review queues without affecting official run fitness.

### Tasks

- [x] Define rubric candidate schema
- [x] Implement `register_rubric_candidate`
- [x] Queue rubric candidate review state in `state/queue.yaml`
- [x] Document rubric lifecycle and same-run guardrails
- [x] Teach Analyzer outputs to distinguish: search, recognition, format, prompt, rubric_gap failure
  - [Decision tree in `prompts/shared/failure-types.md`](./prompts/shared/failure-types.md) — rubric_gap_failure only valid after steps 1–4 exhausted
  - Analyzer prompt now passes: scored_specs, recall_hits, recall_misses, precision_findings, rubric_gap_candidates, generator step outputs (explore/draft/verify), formula structure
- [x] Add candidate provenance fields from real analyzer output
  - Added to `schemas/rubric-candidate.schema.yaml`: source_run, evaluator_score, failure_type, analyzer_confidence, recall_misses_triggered, scored_specs_examined
- [x] Add shadow-ready metadata for future probation scoring
  - Added to schema: evidence_count, first_observed_run, last_observed_run, precision_concern, weight_recommendation, probation_runs_remaining
- [x] Teach Mutator to package rubric_gap_proposal into a registerable criterion
  - When analyzer.rubric_gap_proposed === true, mutator writes `runs/<run-id>/mutator/rubric-candidate.yaml` with full provenance
  - Agent registers via `register_rubric_candidate --file runs/<run-id>/mutator/rubric-candidate.yaml`
  - SKILL.md updated to reflect dual registration path
- [x] Add reviewer workflow for accepting / rejecting candidates
  - [Reviewer checklist in `rubrics/candidates/README.md`](./rubrics/candidates/README.md) — 5-question decision guide (repeated evidence, low overlap, holdout effect, precision tradeoff, provenance audit)
  - Each question linked to the approve/reject CLI commands
  - Promotion rules table and probation tracking policy documented

---

## Milestone 2b — COMPLETE ✅

> Rubric Discovery v1 (Diagnose Only) is fully implemented. All tasks complete. Rubric gap diagnosis is gated behind steps 1–4 exhaustion, candidates enter governed review without affecting same-run scoring, and reviewers have an explicit checklist before approving or rejecting.

---

## Milestone 3 -- Stabilize the Evaluation Loop

### Why this phase exists

Before specializing formulas or evolving rubrics further, the system needs a stable evaluation core. This phase tightens run quality, comparability, and lessons-learned reuse.

### Outcome

The prototype can run repeated experiments with consistent scoring, reusable failure knowledge, and clearer promotion criteria.

### Tasks

- [ ] Extend evaluator outputs into explicit score reports
- [ ] Separate official score artifacts from shadow findings
- [ ] Strengthen lesson ingestion from analyzer + mutator results
- [ ] Prevent repeated failed teaching methods for same failure classes
- [ ] Add lesson index or lookup by failure_type + teaching_method to enforce insanity prevention rule
  - *Gap: the mutator must not retry the same failed teaching method on the same failure type ("insanity prevention"). But `lessons/failed.jsonl` is a flat append-only log with no index. To check whether a method was already tried, the system must scan the entire file. As lessons accumulate, this becomes a lookup problem. The `lessons/index.yaml` describes policy but doesn't index actual content.*
- [ ] Add run-to-run comparison support
- [ ] Add artifact diffing between formula candidates and promoted formulas
- [ ] Add richer validation for project config and run manifests
- [ ] Add checkpoint or resumability support for interrupted runs

---

## Milestone 3b -- Rubric Discovery v2 (Governed Promotion)

### Why this phase exists

Once diagnose-only discovery is stable, the next step is controlled promotion. This phase allows rubric evolution to become operational without making the rubric self-justifying or noisy.

### Outcome

Candidate rubric criteria can move through a governed lifecycle: candidate -> probation -> active, with snapshot freezing and delayed effect.

### Tasks

- [ ] Implement rubric candidate state transitions
- [ ] Add probation/shadow scoring artifact storage
- [ ] Implement `promote_rubric_snapshot`
- [ ] Record rubric snapshot provenance automatically
- [ ] Enforce delayed activation in future runs only
- [ ] Add review checklist for promotion criteria:
  - repeated evidence
  - low overlap
  - positive holdout effect
  - acceptable precision tradeoff
- [ ] Add criteria deprecation / rejection workflow

---

## Milestone 4 -- Ecosystem Specialization

### Why this phase exists

The baseline harness should eventually produce different formulas for different project types. This phase moves from one generic loop to ecosystem-aware evolution.

### Outcome

The prototype can manage distinct formula families and rubric expectations for frontend, backend, and later other project shapes.

### Tasks

- [ ] Define promotion rules for ecosystem-specific formulas
- [ ] Split baseline runs by ecosystem and behavior shape
- [ ] Expand project config taxonomy beyond a single sample target
- [ ] Add sample targets for backend and at least one additional behavior-heavy frontend
- [ ] Add per-ecosystem golden sets
- [ ] Add compatibility tracking between formulas and rubric snapshots
- [ ] Implement ecosystem rubric merging -- mechanism to compose universal + ecosystem seed rubrics into a snapshot
  - *Gap: the rubric snapshot `v001` only sources from `rubrics/seed/universal.yaml`. The project config points at `rubrics/seed/frontend.yaml` as `seed_rubric_ref`, but the frontend-specific criteria (state transitions, conditional visibility, accessibility) never make it into any snapshot. There is no mechanism to merge universal + ecosystem seeds into a combined snapshot. The `provenance.yaml` acknowledges this gap: "frontend and backend seeds remain available for project-specific merges later" -- but no design exists for how that merge works.*

---

## Milestone 5 -- Provider Execution Layer

### Why this phase exists

The prototype already reserves space for OpenCode, Hermes, and local adapters. This phase makes that boundary real, so the same lifecycle can run through different agent backends without changing core state rules.

### Outcome

The prototype can execute through a normalized runner contract with backend-specific adapters.

### Tasks

- [ ] Implement local provider first
- [ ] Define normalized runner operations in executable form
- [ ] Route Generator / Evaluator / Analyzer / Mutator through provider contracts
- [ ] Emit lifecycle events from runs
- [ ] Add optional hook execution for observational workflows only
- [ ] Add OpenCode adapter proof of concept
- [ ] Add Hermes adapter proof of concept

---

## Milestone 5b -- Production Fine-Tuning

### Why this phase exists

Evolution produces general-purpose formulas per ecosystem. But every project is different -- a dashboard app, an e-commerce storefront, and a design tool have different spec needs even within the same ecosystem. Users need a way to fine-tune promoted formulas for their specific project without forking or manual formula editing.

This phase brings adaptive rubric discovery into production as a user-facing feature.

### Outcome

Users can run `blueprint fine-tune` against their project. The system scans codebase patterns, runs adaptive rubric discovery, proposes project-specific criteria additions/suppressions/weight changes, and produces a derived formula layered on top of a promoted parent.

### Tasks

- [ ] Add `formulas/derived/` directory for project-specific fine-tuned formulas
  - *The prototype has `seed/`, `candidates/`, `promoted/`, `archive/` but no place for user-specific derived formulas. Derived formulas are not candidates (they're user-approved) and not promoted (they're project-scoped, not ecosystem-wide).*
- [ ] Add `fine_tune` mode to run manifest schema
  - *The run manifest `mode` field only allows `official | shadow | compare`. Fine-tune runs are a different execution type -- they produce derived formulas, not spec outputs. The manifest needs to distinguish them so the system knows what artifacts to expect.*
- [ ] Implement `fine_tune` CLI command with codebase structure analysis
  - *Core entry point. Scans the project structure to infer dominant patterns (state machines, auth gating, data pipelines, etc.) before running discovery. This automatic inference is the first anchor signal that replaces golden sets in production.*
- [ ] Implement adaptive rubric discovery in fine-tune context (automatic codebase inference)
  - *Reuses the adaptive rubric machinery from evolution (Milestone 2b/3b) but with different constraints: no golden set anchor, faster promotion via direct user approval, project-scoped rather than ecosystem-scoped.*
- [ ] Implement interactive proposal review (accept/reject/adjust weight per discovered criterion)
  - *In evolution, governance is multi-run probation. In fine-tuning, the user IS the governance. Each discovered criterion is presented with evidence and confidence, and the user decides immediately.*
- [ ] Write derived formula output with parent reference, fine_tuned_criteria, suppressed_criteria
  - *The derived formula is a layer, not a fork. It records what was added, what was suppressed, and what parent it inherits from. This enables upstream rebase when the parent formula improves through evolution.*
- [ ] Add fine-tune discovery log (what was proposed, what was accepted/rejected)
  - *Audit trail for fine-tune decisions. Also useful for subsequent fine-tune runs -- the system can see what was already proposed and rejected to avoid re-proposing the same thing.*
- [ ] Add state tracking for fine-tune runs and their derived formulas
  - *`state/current.yaml` currently tracks `current_formula_ref` pointing at seed or promoted formulas. It needs to also track derived formula refs and which fine-tune runs produced them.*
- [ ] Implement parent rebase -- when upstream formula is promoted, rebase fine-tuned layer onto new parent
  - *If evolution promotes `frontend-v009` to replace `frontend-v008`, existing derived formulas based on `v008` need a rebase path. Without this, users are stuck on stale parents or lose their fine-tuning.*
- [ ] Add user review feedback signal from `blueprint review` as fine-tune input
  - *When users review specs and flag misses, that feedback should feed into fine-tune discovery. "This spec missed auth gating" → the system infers what criterion would have caught it.*
- [ ] Add explicit user goals (`--goals`) as anchor signal for fine-tune discovery
  - *Users should be able to declare priorities directly: "auth flows matter most, styling matters least." This provides a strong signal that complements automatic codebase inference.*
- [ ] Enforce forward-only activation -- fine-tune discoveries activate for next scan, not retroactively
  - *Even with relaxed governance (user approval instead of multi-run probation), retroactive re-scoring would create churn by re-evaluating all existing specs under new criteria. Discovered criteria apply to the next `blueprint scan` only.*

---

## Milestone 6 -- Advanced Learning Layer

### Why this phase exists

After the harness, loop, and governed rubric evolution are stable, the system can support deeper learning strategies. This phase is deliberately later because it depends on high-quality accumulated data.

### Outcome

The prototype becomes a credible training substrate for stronger evaluation and sharing mechanisms.

### Tasks

- [ ] Accumulate structured evaluation corpora from completed runs
- [ ] Define dataset export format for judge-model training
- [ ] Explore fine-tuned judge model handoff from prompt-based evaluation
- [ ] Define sharable formula package format
- [ ] Explore community formula distribution workflow

---

## Current Phase Focus

The immediate focus should stay on the shortest path to a real, inspectable evolution cycle.

### Now

- [x] Implement `run_generator` — ✅ implemented, verified on run-0002 and run-0003
- [x] Implement `run_evaluator` — ✅ implemented, verified on run-0002 and run-0003
- [x] Implement `run_analyzer` — ✅ implemented, verified on run-0002 and run-0003
- [x] Implement `run_mutator` — ✅ implemented, verified on run-0002 and run-0003
- [x] Materialize one full run with role outputs under `runs/run-000X/` — ✅ run-0002 and run-0003 fully materialized
- [x] Agent harness (`node start`) — ✅ implemented and verified on run-0003
- [x] Rubric Discovery v1 (Diagnose Only) — ✅ complete: 5-type analyzer routing, provenance fields, mutator packaging, reviewer workflow
- [ ] Define agent output schemas for evaluator, analyzer, mutator
- [ ] Add precision workflow (false-positive schema + spot-check)
- [ ] Validate `codebase_path` existence in project config before run materialization

### Next

- [ ] Add lesson lookup index for insanity prevention
- [ ] Add shadow/probation artifacts for rubric discovery v2

### Later

- [ ] Provider adapters (OpenCode, Hermes)
- [ ] Ecosystem specialization
- [ ] Ecosystem rubric merging (compose universal + ecosystem seeds into snapshot)
- [ ] Production fine-tuning (`blueprint fine-tune`, derived formulas, parent rebase)
- [ ] Fine-tuned judge data exports

---

## Deferred on Purpose

These are intentionally not early-phase tasks for v01:

- [ ] full code generation workflow
- [ ] sync engine
- [ ] fully autonomous rubric promotion
- [ ] provider-specific hooks that bypass lifecycle controls
- [ ] fine-tuned judge model training before rubric stabilizes

These remain later because they depend on a stable run/evaluation/mutation foundation.

---

## Gap Analysis Cross-Reference

The tasks above address the following architectural gaps identified during prototype analysis:

| Gap | Where Addressed |
|-----|----------------|
| Fine-tuning has no prototype presence | Milestone 5b |
| Rubric snapshot only uses universal seed | Milestone 4 (ecosystem rubric merging) |
| Formula `extends` has no resolution logic | **Done (Milestone 2)** |
| No schema for generator output artifacts | **Done (Milestone 2)** — generator schemas done, evaluator/analyzer/mutator pending |
| Lesson lookup has no index | Milestone 3 |
| `rubric.schema.yaml` is ambiguous | **Done (Milestone 1)** |
| No seed rubric schema | **Done (Milestone 1)** |
| Queue has no governance commands | **Done (Milestone 1)** |
| `codebase_path` not validated | Milestone 2 |
| No golden set precision workflow | Milestone 2 |
| Agent harness (CLI orchestration) | **Done (Milestone 2c)** |
| Bounded loop / checkpoint model | **Done (Milestone 2c)** |
| Checkpoint/lock infrastructure for interrupted runs | **Done (Milestone 2c)** |
| Generated specs are stubs (no real provider) | Milestone 5 (provider adapters) |
| Rubric gap 5-type diagnosis (analyzer routing) | **Done (Milestone 2b)** |
| Rubric candidate provenance fields | **Done (Milestone 2b)** |
| Mutator rubric_gap_proposal packaging | **Done (Milestone 2b)** |
| Reviewer workflow (checklist + approve/reject) | **Done (Milestone 2b)** |
