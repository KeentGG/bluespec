# Blueprint Mode v02 — Agent Instructions

## Project Context

This is the v02 prototype of Blueprint Mode. It is an OpenCode-native, agent-initiated system where a primary agent (harness) orchestrates specialized subagents through an evolution cycle.

**Read `ARCHITECTURE.md` first.** It defines the full design.

## Build Rule

**Load the `blueprint-build` skill before implementing anything.** It enforces atomic, verifiable changes — one concept at a time, verified by the user before proceeding.

Each task proves a concept works end-to-end (e.g., "can we create a run with frozen inputs?"), not just that a file was created. The user verifies each concept before the next one is built.

**Read `TASKS.md` for the full build plan** — every concept with its files, verify steps, and expected output.

This is not optional. The v01 mistake was building everything at once. v02 must be built concept by concept.

## What This Prototype Does

1. User says `/start-training` or "start training"
2. Harness primary agent loads the blueprint-harness skill
3. Agent executes: init → freeze → explore → draft → verify → evaluate → rollset → diagnose → mutate → register
4. Agent stops after register. Does NOT advance formulas or promote rubrics.

## Key Files

```
prototype/_v02/
├── ARCHITECTURE.md                    # Full design (read this first)
├── opencode.json                      # Agent + tool + plugin config
├── AGENTS.md                          # This file
├── .opencode/
│   ├── commands/start-training.md     # Entry point
│   ├── agents/harness.md              # Primary orchestrator
│   ├── agents/spec-generator.md       # Draft subagent
│   ├── agents/evaluator.md            # Evaluate subagent
│   ├── agents/analyzer.md             # Diagnose subagent
│   ├── agents/mutator.md              # Mutate subagent
│   ├── skills/blueprint-harness/      # Lifecycle skill
│   ├── tools/yaml-ops.ts              # YAML operations
│   └── plugins/blueprint-lifecycle.ts # Hooks
├── scripts/cli.js                     # Thin CLI tool
├── schemas/spec.schema.yaml           # Spec format
├── state/current.yaml                 # Active refs
├── formulas/                          # Evolution formulas
├── goldens/                           # Human-curated behaviors
├── runs/
│   ├── run-0001/                      # Immutable run artifacts
│   └── rollingset/                    # Cross-run institutional memory
└── lessons/                           # Insanity prevention
```

## Isolation Rules (The Wall)

During explore and draft phases, the harness and spec-generator MUST NOT see:
- Golden set contents
- Rolling set contents
- Lesson data

Only the evaluator, analyzer, and mutator see evaluation data. The analyzer sees everything. The mutator sees only aggregate stats.

## What NOT To Do

- Do NOT build multiple layers in one task
- Do NOT auto-proceed without user verification
- Do NOT write large files (>300 lines) without splitting
- Do NOT assume the user has read the code — show them
- Do NOT skip the verification protocol from the blueprint-build skill
