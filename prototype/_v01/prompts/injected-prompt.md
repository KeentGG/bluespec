# Injected Prompt

> The prompt injected into OpenCode CLI when running `node start`.
> This is the ONLY text sent to stdin. OpenCode reads skills and agent files automatically.

---

## The Prompt

```
WORKSPACE: /Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01
RUN_ID: run-0017
Mode: new

Use the blueprint-harness skill to execute one bounded evolution cycle.
```

---

## What Happens Next

1. OpenCode receives the prompt
2. OpenCode reads `.opencode/skills/blueprint-harness/SKILL.md` automatically
3. SKILL.md instructs the orchestrator to:
   - Execute phases in order
   - Spawn subagents via Task tool for delegate/evaluate/analyze/mutate
4. Each subagent reads its own `.opencode/agents/<role>.md` file

---

## Files Read by OpenCode

| File | Who reads it |
|------|--------------|
| `.opencode/skills/blueprint-harness/SKILL.md` | Orchestrator |
| `.opencode/agents/spec-generator.md` | Spec-generator subagent |
| `.opencode/agents/evaluator.md` | Evaluator subagent |
| `.opencode/agents/analyzer.md` | Analyzer subagent |
| `.opencode/agents/mutator.md` | Mutator subagent |
