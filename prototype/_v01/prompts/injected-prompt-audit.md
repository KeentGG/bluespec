# Injected Prompt Audit

> The prompt injected into OpenCode CLI when running `node start`.
> Updated: After refactoring to use skill-based architecture.

---

## Current State (Post-Refactor)

### What gets injected into stdin

```
WORKSPACE: /Volumes/Keen/.../prototype/_v01
RUN_ID: run-0017
Mode: new

Use the blueprint-harness skill to execute one bounded evolution cycle.
```

**Size**: 4 lines, ~30 tokens

### What OpenCode reads automatically

| File | Purpose | Lines |
|------|---------|-------|
| `.opencode/skills/blueprint-harness/SKILL.md` | Orchestrator instructions | ~120 |
| `.opencode/agents/evaluator.md` | Evaluator full prompt | 113 |
| `.opencode/agents/analyzer.md` | Analyzer full prompt | 152 |
| `.opencode/agents/mutator.md` | Mutator full prompt | 160 |
| `.opencode/agents/spec-generator.md` | Spec-generator full prompt | 91 |
| `prototype/_v01/agents.md` | Global rules (reference) | ~130 |

---

## Architecture

```
start.js
  ↓
  spawns: opencode run --dir <workspace>
  ↓
  injects: minimal prompt (4 lines)
  ↓
OpenCode reads:
  ├── .opencode/skills/blueprint-harness/SKILL.md (orchestrator)
  ├── .opencode/agents/evaluator.md (evaluator)
  ├── .opencode/agents/analyzer.md (analyzer)
  ├── .opencode/agents/mutator.md (mutator)
  └── .opencode/agents/spec-generator.md (spec-generator)
```

---

## Previous State (Pre-Refactor)

### What was injected (OLD)

```
{{SKILL.md: 305 lines}}
---
{{phaseBootstrap: 175 lines}}
```

**Size**: ~480 lines, ~12-15K tokens

### Problems with old approach

1. **Manual injection redundant** — OpenCode reads skills from `.opencode/` automatically
2. **Duplication** — Same content in SKILL.md, phaseBootstrap, and agent files
3. **Drift risk** — phaseBootstrap and agent files could diverge
4. **Token waste** — ~200 lines of duplicate constraints
5. **Contradictions** — CLI vs Task tool for evaluate/analyze/mutate phases

---

## File Roles (Current)

| File | Role | Used at runtime? |
|------|------|------------------|
| `prototype/_v01/start.js` | Entry point, sends minimal prompt | Yes |
| `.opencode/skills/blueprint-harness/SKILL.md` | Orchestrator instructions | Yes (auto-loaded) |
| `.opencode/agents/*.md` | Agent definitions | Yes (auto-loaded) |
| `prototype/_v01/agents.md` | Global rules reference | Reference only |
| `prototype/_v01/prompts/*.md` | Documentation | No |

---

## Summary

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Injected prompt | ~480 lines | 4 lines | **99%** |
| Token count | ~12-15K | ~30 | **99.8%** |
| Duplicate instructions | Many | None | **100%** |
| Source of truth | 3 places | 1 place per role | **Single source** |
