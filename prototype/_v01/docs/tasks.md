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

> Full evolution loop verified on `run-0002` (all role outputs materialized: generator, evaluator, analyzer, mutator). The autonomous harness was first proven on `run-0003`, and later runs `run-0011` and `run-0012` verified the hardened `node start` path with real spec files, evaluator/analyzer/mutator outputs, and governed candidate registration.

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

### Later Harness Findings (runs 0009–0012)

- **Real spec generation is now proven**: `run-0010`, `run-0011`, and `run-0012` contain non-stub spec YAML with state machines, conditions, and evidence refs under `runs/<run-id>/generator/specs/`.
- **`node start` is now resilient, not just functional**: `start.js` retries on provider overload and treats success as `register: complete`, not just subprocess exit.
- **Governance is live**: `run-0011` registered `stale_golden_vs_observed_implementation` as a rubric candidate, and `run-0012` registered `frontend-derived-stale-reference-recovery` as a formula candidate.
- **Formula evolution has moved past v001**: the active formula is now `formulas/promoted/frontend-derived-v003-consolidated.yaml`, which combines the run-0003, run-0004, and run-0009 mutations.

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
  - ✅ run-0011: full autonomous loop completed with real generator specs, evaluator/analyzer/mutator outputs, and rubric candidate registration
  - ✅ run-0012: resumed autonomous loop completed with real generator specs and formula candidate registration
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

> Implemented and tested. `run-0003` proved the bounded loop, while `run-0011` and `run-0012` proved the hardened harness path with real agent-written specs and successful register-phase completion. `start.js` now retries provider overloads and only treats the run as successful when the checkpoint reaches `register: complete`.

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

## Milestone 2d — Agentic Spec Generation (Partially Complete)

### Why this phase exists

The original generator harness was CLI-driven: CLI calls AI, CLI parses output, CLI writes files. The AI had no ownership and never touched the filesystem. Specs were 6-line stubs. This phase replaces that with a genuine two-tier agent architecture: main orchestrator explores and delegates, spec-generator subagents write real files with real content.

### The Core Problem

The local provider was a hardcoded stub. Even with a real provider, the design had a fundamental issue: the CLI treated AI output as text to parse, not as files to write. The AI said "I produced auth.session.yaml" and the CLI created an empty file with YAML frontmatter. The AI never produced behavioral content.

Additionally, the harness treated agents as stateless text generators rather than autonomous agents with tool access. The agent had no knowledge of the run lifecycle, no ownership of files, and no ability to take meaningful action.

### The Architecture

```
Main Agent (blueprint-harness skill)
├─ Reads golden-set.yaml — knows which behaviors to find
├─ Reads project.yaml — knows codebase_path
├─ Uses OpenCode tools: glob, grep, read — explores actual source
├─ Groups files by behavioral area
├─ Writes delegation manifest per spec (source files + context)
├─ Invokes spec-generator subagent via Task tool (one per spec)
│   └─ Subagent reads source files, writes real spec YAML
├─ Waits for all subagents
├─ Writes generator/output.yaml
└─ Proceeds to evaluator phase
```

### New Files

- `schemas/spec.schema.yaml` — behavioral spec format: state machines, conditions, inputs/outputs, evidence_refs with real code snippets, coverage tracking per golden behavior
- `.opencode/agents/spec-generator.md` — reusable subagent config with read/write/glob/grep tools, no bash
- `.opencode/skills/blueprint-harness/SKILL.md` — updated: explore with tools → write delegation manifests → spawn subagents via Task tool → subagents write real specs

### Key Design Decisions

- **Subagent via Task tool** — Task tool is the internal delegation primitive, not @mention (which is manual/user-facing)
- **Child gets fresh session, no parent context fork** — everything must be in the prompt or delegation manifest
- **Child writes file, parent verifies** — reliable pattern; subagent returns text, but the real output is the file it wrote
- **Delegation manifest as context bridge** — writes source files + prior context, subagent reads and produces spec
- **Sequential subagent spawning** — Task tool blocks parent; for parallelism, outer launcher would spawn multiple `opencode run` processes

### Outcome

Spec-generator subagents produce real behavioral specs — not stubs. Each spec has state machines, conditions, inputs/outputs, and evidence_refs pointing to actual source code with real snippets.

### Tasks

- [x] Behavioral spec schema (`schemas/spec.schema.yaml`) — state machines, conditions, coverage per golden behavior, evidence_refs
- [x] Spec-generator subagent (`.opencode/agents/spec-generator.md`) — read/write/glob/grep tools, writes one spec per delegation manifest
- [x] Agentic generator flow in SKILL.md — explore with tools, write delegation manifests, spawn subagents, verify output
- [x] Test: run `node start` — verify specs are written with real content and evidence_refs
  - ✅ `run-0011`: full `node start` cycle wrote three real specs and completed through `register`
  - ✅ `run-0012`: resumed `node start` cycle wrote three real specs and completed through `register`
- [ ] Wire up normalized real AI provider adapter (OpenCode adapter)
  - Current state: the agentic path uses OpenCode CLI + Task tool directly and produces real artifacts, but `integrations/providers/` still does not contain an OpenCode adapter implementation

> Practical status: the old local-provider stub path still exists, but the real agentic path is now proven through `node start`. What remains is normalizing that path into the provider adapter layer rather than relying on direct OpenCode orchestration in `start.js`/`cli.js`.

---

## Milestone 3 -- Stabilize the Evaluation Loop

### Why this phase exists

Before specializing formulas or evolving rubrics further, the system needs a stable evaluation core. This phase tightens run quality, comparability, and lessons-learned reuse.

### Outcome

The prototype can run repeated experiments with consistent scoring, reusable failure knowledge, and clearer promotion criteria.

### Tasks

- [x] Extend evaluator outputs into explicit score reports
  - `runs/<run-id>/evaluator/output.yaml` is now the official machine-comparable score report
- [x] Separate official score artifacts from shadow findings
  - `runs/<run-id>/evaluator/shadow-findings.yaml` now carries recall / precision / consistency / rubric-gap qualitative findings
- [ ] Strengthen lesson ingestion from analyzer + mutator results
- [x] Prevent repeated failed teaching methods for same failure classes
  - `run_mutator` now rejects retries of previously failed methods for the same `failure_type` unless the output explicitly acknowledges the prior failure and provides justification
- [x] Add lesson index or lookup by failure_type + teaching_method to enforce insanity prevention rule
  - `scripts/lib/lessons.js` now generates `lessons/index.yaml` with lookup buckets by failure type and teaching method
  - `run_mutator` refreshes the index before prompting, injects an indexed lesson summary into the prompt, and rejects retries of previously failed methods unless the output explicitly acknowledges and justifies the retry
- [ ] Add run-to-run comparison support
- [ ] Add artifact diffing between formula candidates and promoted formulas
- [ ] Add richer validation for project config and run manifests
- [ ] Add checkpoint or resumability support for interrupted runs

> Milestone 3 is now started. The first slice landed as a lesson-index + lookup layer for insanity prevention (`scripts/lib/lessons.js`, generated `lessons/index.yaml`, and mutator-side retry enforcement). The evaluator split slice is now complete: official score report plus shadow findings artifacts and their schemas are in place.

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

The immediate focus is on consolidating the now-working agentic harness: keep real spec generation stable, close the remaining schema/validation gaps, and move the new governance artifacts through review without regressing the proven `node start` path.

### Now

- [x] Implement `run_generator` — ✅ implemented; later real-artifact runs include `run-0010`, `run-0011`, and `run-0012`
- [x] Implement `run_evaluator` — ✅ implemented; real evaluator outputs now exist through `run-0012`
- [x] Implement `run_analyzer` — ✅ implemented; real analyzer routing proven for prompt, rubric-gap, and search failures
- [x] Implement `run_mutator` — ✅ implemented; both formula and rubric candidate packaging proven
- [x] Materialize one full run with role outputs under `runs/run-000X/` — ✅ multiple full runs now materialized, including `run-0011` and `run-0012`
- [x] Agent harness (`node start`) — ✅ implemented, hardened, and verified on `run-0003`, `run-0011`, and `run-0012`
- [x] Rubric Discovery v1 (Diagnose Only) — ✅ complete: 5-type analyzer routing, provenance fields, mutator packaging, reviewer workflow
- [x] Behavioral spec schema — ✅ `schemas/spec.schema.yaml` with state machines, conditions, evidence_refs, coverage tracking
- [x] Spec-generator subagent — ✅ `.opencode/agents/spec-generator.md` with read/write/glob/grep tools
- [x] Agentic generator flow — ✅ SKILL.md updated to: explore with tools → write delegation manifests → spawn subagents via Task tool → subagents write real specs
- [x] Test: run `node start` with agentic generator — ✅ verified on `run-0011` and `run-0012`
- [x] Consolidate promoted formula mutations into a new active baseline — ✅ `frontend-derived-v003-consolidated.yaml` is active
- [x] Add lesson index or lookup for insanity prevention — ✅ `scripts/lib/lessons.js` + generated `lessons/index.yaml` + mutator enforcement hook
- [x] Define evaluator output schemas (official score + shadow findings)
  - `schemas/evaluator-output.schema.yaml`
  - `schemas/evaluator-shadow-findings.schema.yaml`
- [ ] Define analyzer, mutator output schemas (generator schemas done)
  - [ ] Add precision workflow (false-positive schema + spot-check)
- [ ] Validate `codebase_path` existence in project config before run materialization
- [ ] Review current governance queue — pending: `rubric:stale_golden_vs_observed_implementation`, `formula:frontend-derived-stale-reference-recovery`

### Next

- [ ] Add shadow/probation artifacts for rubric discovery v2
- [ ] Decide whether to promote `stale_golden_vs_observed_implementation` to probation and `frontend-derived-stale-reference-recovery` to active

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
| Specs are empty stubs (CLI writes frontmatter, AI never produces real content) | **Done (Milestone 2)** — behavioral spec schema + spec-generator subagent + agentic generator flow |
| Harness is CLI-driven, not agentic — agent has no ownership | **Done (Milestone 2)** — main agent explores, writes delegation manifests, spawns spec-generator subagents, subagents own file creation |
| Lesson lookup has no index | **Done (Milestone 3)** — `scripts/lib/lessons.js` generates `lessons/index.yaml` and `run_mutator` consumes it |
| `rubric.schema.yaml` is ambiguous | **Done (Milestone 1)** |
| No seed rubric schema | **Done (Milestone 1)** |
| Queue has no governance commands | **Done (Milestone 1)** |
| `codebase_path` not validated | Milestone 2 |
| No golden set precision workflow | Milestone 2 |
| Agent harness (CLI orchestration) | **Done (Milestone 2c)** |
| Bounded loop / checkpoint model | **Done (Milestone 2c)** |
| Checkpoint/lock infrastructure for interrupted runs | **Done (Milestone 2c)** |
| Generated specs are stubs (no real provider) | Partially closed — real specs are produced in the agentic OpenCode path (`run-0010` onward), but Milestone 5 still needs a normalized OpenCode provider adapter |
| Rubric gap 5-type diagnosis (analyzer routing) | **Done (Milestone 2b)** |
| Rubric candidate provenance fields | **Done (Milestone 2b)** |
| Mutator rubric_gap_proposal packaging | **Done (Milestone 2b)** |
| Reviewer workflow (checklist + approve/reject) | **Done (Milestone 2b)** |
