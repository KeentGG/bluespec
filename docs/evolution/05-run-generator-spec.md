# run_generator Specification

> Status: FINAL — Option B (per-step calls) selected. All architectural choices locked.
> Derived from: session-2026-04-17 @ blueprint-mode

---

## Purpose

`run_generator` executes the Generator role for a given run. It takes a frozen formula and project context, drives the Generator through the formula's steps, and produces a structured output bundle that the rest of the evolution loop consumes.

It is the first AI call in every run lifecycle.

---

## Decisions Locked

### Provider Adapter Location: `integrations/providers/`

Provider adapters live in `integrations/providers/`, not `scripts/lib/providers/`. This keeps them as first-class extension points rather than internal script helpers.

```
integrations/providers/
├── local/          # local model / direct API
├── opencode/       # OpenCode adapter
└── hermes/        # Hermes adapter
```

Each provider implements a minimal `generate(messages, options)` interface. The CLI is provider-agnostic — it reads the provider from config and delegates.

### Formula `extends` Resolution: CLI Before Freezing

`freeze_inputs` resolves the `extends` chain and writes a fully-inlined formula into `runs/run-XXXX/inputs/formula.yaml`. `run_generator` receives an already-flattened formula. It does not handle inheritance.

### Output Artifacts: `output.yaml` + `trace.json` + `specs/`

`run_generator` writes three things:

```
runs/run-XXXX/generator/
├── output.yaml       # structured metadata (see Output Contract below)
├── trace.json        # raw provider metadata (latency, tokens, model, raw response)
└── specs/            # generated spec files (*.yaml)
```

`output.yaml` is the machine-readable summary the Evaluator consumes. `trace.json` is the audit log for debugging and lesson extraction. `specs/` are the actual spec artifacts.

### Failure Mode: Partial Write + Mark Failed

When a call fails mid-run, `run_generator` writes all completed step outputs to disk before raising an error. It then writes `generator/status: failed` with `failed_at_step: N` and `error_reason`.

It does not abort without writing. Partial outputs are inspectable and recoverable. The Evaluator handles incomplete input gracefully — it scores what's present and notes what's missing.

---

## AI Call Cadence: Option B — Per-Step Calls

Each formula step is its own AI call. Step N's output becomes context for Step N+1.

**Decision rationale:**
- Partial output recovery: if step 4 of 5 fails, steps 1–4 are preserved
- Per-step confidence and audit trail are natural, not bolted on
- Fine-grained retry: rerun only the failing step without regenerating everything
- Latency overhead (~5x provider round-trips ≈ 10–15s) is acceptable for a system running minutes per cycle

If Option A (one giant call) is preferred instead: the step-by-step loop collapses into one call, but input/output contracts remain identical and `phase_outputs` points to one combined block instead of five individual steps.

If Option C (adaptive batching) is preferred: formula defines phase boundaries (not step boundaries), each phase is one call, and partial recovery works at phase boundaries.

---

## Inputs

```
run_generator --run-id run-0001
```

No additional flags. All inputs are frozen in the run manifest.

### What `run_generator` reads from the run folder:

| File | Purpose |
|---|---|
| `runs/run-0001/manifest.yaml` | Run identity, formula ref, rubric ref, project ref |
| `runs/run-0001/inputs/formula.yaml` | Fully-resolved, frozen formula (extends already inlined) |
| `runs/run-0001/inputs/rubric.yaml` | Active rubric snapshot |
| `runs/run-0001/inputs/golden-set.yaml` | Golden set behaviors |
| `runs/run-0001/inputs/project.yaml` | Project config (path, ecosystem, excluded paths) |
| `runs/run-0001/inputs/resolved-inputs.yaml` | Provenance metadata for frozen inputs |

### What `run_generator` reads from the broader workspace:

| Path | Purpose |
|---|---|
| `lessons/learned.jsonl` | Prior lessons (optional context) |
| `lessons/failed.jsonl` | Prior failures (optional context) |

These are appended-to by later roles, not read by Generator often, but available for prompt injection if the formula calls for it.

---

## Formula Step Execution Model (Option B — Per-Step Calls)

The formula defines an ordered list of steps. For `frontend-derived.yaml`, the inherited steps from `formulas/seed/frontend.yaml` are:

```
explore → analyze → draft → verify → cross_ref
```

Each step is its own AI call. Step N's output becomes part of Step N+1's context.

### Step Context Accumulation

- **Step 1 (explore)**: receives only the frozen inputs (formula, rubric, golden set, project config, lessons)
- **Step 2 (analyze)**: receives explore output + frozen inputs
- **Step 3 (draft)**: receives analyze output + frozen inputs
- **Step 4 (verify)**: receives draft output + frozen inputs
- **Step 5 (cross_ref)**: receives verify output + frozen inputs

Each step's output is written immediately to `runs/run-XXXX/generator/steps/step-N-YYYY.yaml` before the next call starts. If a step fails, all prior steps are preserved.

### Prompt Construction Per Step

Each step prompt includes:
1. **System prompt**: role contract (from `prompts/generator.md`) + step-specific instructions
2. **Frozen inputs summary**: project path, ecosystem, excluded paths, active rubric summary
3. **Prior step outputs**: the accumulated context from previous steps
4. **Lessons**: relevant lessons from `lessons/learned.jsonl` filtered by ecosystem + step
5. **Step-specific instructions**: extracted from the formula's step definition

### Step Output Schema

Each step writes:

```yaml
step: explore
step_number: 1
status: complete  # | partial | failed
confidence: 0.82
summary: "Identified 12 key files across auth, dashboard, and state management"
files_analyzed:
  - src/auth/session.ts
  - src/state/store.ts
artifacts_produced:
  - explored_behaviors.yaml
unresolved_questions:
  - "Is the wizard flow still active or deprecated? No definitive signal."
flags_for_analyzer: []
```

---

## Provider Adapter Interface

```javascript
// integrations/providers/base.js (interface contract)
async function generate(messages, options) {
  // messages: array of { role: 'user' | 'assistant', content: string }
  // options: { temperature, max_tokens, model, ...provider_specific }
  // returns: { content: string, usage: { tokens }, metadata: { model, latency_ms, ... } }
}
```

The CLI selects the provider via `config/prototype.yaml`:

```yaml
provider:
  type: opencode  # or 'local', 'hermes'
  options:
    model: sonnet
    temperature: 0.3
```

The provider adapter is loaded dynamically. If the provider directory has an `index.js` that exports `generate`, it is used. Otherwise the CLI falls back to `local`.

---

## Output Contract

### `output.yaml`

```yaml
run_id: run-0001
generator: run_generator
status: complete  # | partial | failed
provider: opencode
model: sonnet
steps_completed: 5
failed_at_step: null
error_reason: null
confidence_by_section:
  explore: 0.88
  analyze: 0.81
  draft: 0.76
  verify: 0.83
  cross_ref: 0.79
overall_confidence: 0.81
unresolved_questions:
  - "Wizard flow deprecation status unclear — treated as active"
  - "Edge case: token refresh during concurrent requests"
phase_outputs:
  explore: generator/steps/step-1-explore.yaml
  analyze: generator/steps/step-2-analyze.yaml
  draft: generator/steps/step-3-draft.yaml
  verify: generator/steps/step-4-verify.yaml
  cross_ref: generator/steps/step-5-cross_ref.yaml
specs_generated:
  - specs/auth.session.yaml
  - specs/dashboard.layout.yaml
  - specs/state.store.yaml
generation_started_at: 2026-04-17T10:00:00.000Z
generation_completed_at: 2026-04-17T10:05:30.000Z
latency_ms: 330000
tokens_used: 12400
```

### `trace.json`

```json
{
  "run_id": "run-0001",
  "provider": "opencode",
  "model": "sonnet",
  "steps": [
    {
      "step": "explore",
      "request": { "messages": [...], "options": {...} },
      "response": { "content": "...", "usage": {...}, "metadata": {...} },
      "latency_ms": 62000,
      "status": "complete"
    }
  ],
  "overall_latency_ms": 330000,
  "total_tokens": 12400
}
```

Raw provider I/O. Not consumed by downstream roles. Used for debugging, lesson extraction, and provider adapter development.

---

## Error Handling

| Error type | Behavior |
|---|---|
| Provider network failure | Write partial outputs, mark `failed_at_step: N`, set `error_reason: network_error` |
| Provider API error (4xx) | Write partial outputs, mark `failed_at_step: N`, set `error_reason: api_error` |
| Context window exceeded | Write partial outputs, mark `failed_at_step: N`, set `error_reason: context_overflow` |
| Malformed provider response | Write partial outputs, mark `failed_at_step: N`, set `error_reason: malformed_response` |
| Step validation failure | Write partial outputs, mark `failed_at_step: N`, set `error_reason: validation_failed` |

No automatic retry in v01. Retry logic is a future enhancement.

---

## What `run_generator` Does NOT Do

- Does not resolve `extends` — that's `freeze_inputs`
- Does not score specs — that's `run_evaluator`
- Does not propose rubric changes — that's `run_analyzer`
- Does not mutate formulas — that's `run_mutator`
- Does not write to `state/current.yaml` or `state/queue.yaml`
- Does not affect rubric or formula lifecycle state

Its only job: execute the Generator faithfully and write structured output.

---

## Integration with Downstream Roles

```
freeze_inputs
    → writes runs/run-XXXX/inputs/formula.yaml (extends resolved)
    → writes runs/run-XXXX/inputs/resolved-inputs.yaml
    ↓
run_generator
    → reads frozen inputs
    → writes runs/run-XXXX/generator/output.yaml
    → writes runs/run-XXXX/generator/trace.json
    → writes runs/run-XXXX/generator/steps/step-N-*.yaml
    → writes runs/run-XXXX/generator/specs/*.yaml
    ↓
run_evaluator
    → reads generator/output.yaml + generator/specs/
    → reads runs/run-XXXX/inputs/rubric.yaml
    → writes runs/run-XXXX/evaluator/output.yaml
    ↓
run_analyzer
    → reads evaluator/output.yaml
    → writes runs/run-XXXX/analyzer/output.yaml
    → may write rubrics/candidates/*.yaml
    ↓
run_mutator
    → reads analyzer/output.yaml
    → writes runs/run-XXXX/mutator/output.yaml
    → may write formulas/candidates/*.yaml
```

---

## CLI Command

```bash
node scripts/cli.js run-generator --run-id run-0001
```

Required state:
- `runs/run-0001/inputs/formula.yaml` must exist (from `freeze_inputs`)
- `runs/run-0001/manifest.yaml` must exist

Exit codes:
- `0` — generator completed all steps successfully
- `1` — generator failed (partial outputs may exist, check `output.yaml`)

---

## AI Cadence: Decision Made

Option B (per-step calls) is implemented and verified. See [AI Call Cadence: Option B — Per-Step Calls](#ai-call-cadence-option-b--per-step-calls) for the full rationale.

If switching to Option A or C in the future:
- Option A: collapse the step loop into one provider call; `phase_outputs` becomes one block; no partial recovery
- Option C: add phase boundary detection in the formula schema; partial recovery at phase level
