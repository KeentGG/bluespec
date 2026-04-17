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
- [ ] Add formula candidate registration flow
- [ ] Add rubric snapshot promotion flow
- [ ] Add formula advancement flow
- [ ] Add seed rubric schema and validate seed rubric files (`universal.yaml`, `backend.yaml`, `frontend.yaml`)
  - *Gap: seed rubrics use a structure (`rubric_id`, `version`, `extends`, `criteria[]`) that no schema validates. If someone edits a seed rubric incorrectly, nothing catches it until a downstream failure.*
- [ ] Clarify or remove `rubric.schema.yaml` -- no artifact currently uses its shape
  - *Gap: `rubric.schema.yaml` defines a wrapper with optional `criterion` and `snapshot` sub-objects, but no file in the prototype matches this structure. Seeds, snapshots, and candidates each have their own schemas already. This file is dead weight that could confuse contributors.*
- [ ] Add queue governance commands: `approve_rubric_candidate`, `reject_rubric_candidate` to drain `state/queue.yaml`
  - *Gap: `register_rubric_candidate` enqueues items into `state/queue.yaml`, but no command processes them. The queue accumulates indefinitely. The docs say "lifecycle enforcement by thin tooling, not prompt obedience" but the governance half of that tooling doesn't exist.*

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
- [ ] Implement `run_generator`
- [ ] Write generator outputs into `runs/run-000X/generator/`
- [ ] Implement `run_evaluator`
- [ ] Write evaluator outputs into `runs/run-000X/evaluator/`
- [ ] Implement `run_analyzer`
- [ ] Write analyzer outputs into `runs/run-000X/analyzer/`
- [ ] Implement `run_mutator`
- [ ] Write mutator outputs into `runs/run-000X/mutator/`
- [ ] Add run summary materialization (`summary.md` or equivalent)
- [ ] Define agent output schemas for each role (generator, evaluator, analyzer, mutator output contracts)
  - *Gap: the prompt contracts define what each agent should output (`artifacts`, `trace_ref`, `official_scores`, `diagnosis`, etc.) but no schemas validate those outputs. Runs have input validation via `validate_artifacts` but no equivalent gate for outputs. Without output schemas, malformed agent results pass silently.*
- [ ] Add formula `extends` resolution logic -- merge parent steps/validations into child before freezing inputs
  - *Gap: `backend.yaml` and `frontend.yaml` declare `extends: formulas/seed/universal.yaml`, but `freeze_inputs` copies the leaf file as-is without resolving inheritance. The frozen formula in `runs/run-0001/inputs/formula.yaml` is just the frontend seed -- it has no steps, only specializations. Any agent reading it would not know the actual step sequence without manually following the `extends` chain.*
- [ ] Add precision workflow: schema for false-positive findings, spot-check sampling mechanism, precision scoring in evaluator output
  - *Gap: the loss function is precision + recall, but only recall has a structured workflow (golden set behaviors → recall hits/misses). Precision (did the formula hallucinate behaviors that don't exist?) has no schema for false-positive findings, no sampling mechanism, and no place to record results. Half the fitness signal has no data model.*
- [ ] Validate `codebase_path` existence in project config before run materialization
  - *Gap: `codebase_path` is optional in `project-config.schema.yaml` and nothing checks if the path exists on disk. For a system built on agent-driven code exploration, a missing or nonexistent codebase path would cause silent failure at agent runtime, not at run preparation time where it should be caught.*

---

## Milestone 2b -- Rubric Discovery v1 (Diagnose Only)

### Why this phase exists

Rubric discovery is strategically important, but dangerous if introduced too early into official scoring. This phase isolates discovery as diagnosis only so the system can learn what may be missing without moving the goalpost.

### Outcome

The Analyzer can emit suspected rubric gaps as candidate criteria, and those candidates enter governed storage and review queues without affecting official run fitness.

### Tasks

- [x] Define rubric candidate schema
- [x] Implement `register_rubric_candidate`
- [x] Queue rubric candidate review state in `state/queue.yaml`
- [x] Document rubric lifecycle and same-run guardrails
- [ ] Teach Analyzer outputs to distinguish:
  - search failure
  - recognition failure
  - format failure
  - prompt failure
  - rubric gap failure
- [ ] Add candidate provenance fields from real analyzer output
- [ ] Add shadow-ready metadata for future probation scoring
- [ ] Add reviewer workflow for accepting / rejecting candidates

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

- [ ] Implement `run_generator`
- [ ] Implement `run_evaluator`
- [ ] Implement `run_analyzer`
- [ ] Implement `run_mutator`
- [ ] Materialize one full run with role outputs under `runs/run-000X/`
- [ ] Define agent output schemas for each role
- [ ] Add formula `extends` resolution logic
- [ ] Add seed rubric schema and validate seed files

### Next

- [ ] Add formula candidate registration and advancement
- [ ] Add rubric snapshot promotion tooling
- [ ] Add queue governance commands (`approve`, `reject`)
- [ ] Add precision workflow (false-positive schema + spot-check mechanism)
- [ ] Add lesson lookup index for insanity prevention
- [ ] Add shadow/probation artifacts for rubric discovery v2

### Later

- [ ] Provider adapters
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
| Formula `extends` has no resolution logic | Milestone 2 |
| No schema for agent output artifacts | Milestone 2 |
| Lesson lookup has no index | Milestone 3 |
| `rubric.schema.yaml` is ambiguous | Milestone 1 |
| No golden set precision workflow | Milestone 2 |
| No seed rubric schema | Milestone 1 |
| Queue has no governance commands | Milestone 1 |
| `codebase_path` not validated | Milestone 2 |
