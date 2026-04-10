# Research

> Scientific papers, articles, and findings that inform the project design.
> Papers are saved in `/research_papers/`.

---

## Papers Collected (16 total)

### Agent Evaluation

| # | Paper | Key Finding |
|---|-------|-------------|
| 01 | Agent-as-a-Judge (Zhuge et al., ICML 2025) | Agentic systems evaluating agentic systems dramatically outperform LLM-as-a-Judge. The evaluator needs tool access, can check intermediate steps. |
| 02 | AdaRubric (Ding, 2026) | Evaluation dimensions should be generated based on the task, not fixed. Adaptive rubrics achieve +0.15 human correlation over static baselines. |
| 03 | PRDBench / PRDJudge (Fu et al., AAMAS 2026) | Specialized fine-tuned judge model achieves 90%+ human alignment. General LLM judges give ~70%. |
| 04 | Survey on Agent-as-a-Judge (You et al., 2026) | Comprehensive survey tracing evolution from LLM-as-a-Judge to Agent-as-a-Judge. Key dimensions: planning, tool-augmented verification, multi-agent collaboration, persistent memory. |
| 05 | VERO (2026) | Evaluation harness for agent optimization. Versioned snapshots, budget-controlled evaluation, structured execution traces. |

### Evolutionary Prompt Optimization

| # | Paper | Key Finding |
|---|-------|-------------|
| 06 | Evolutionary Prompt Search Toolbox (Griesshaber et al., 2025) | Decomposing evolution into distinct steps enhances control. LLM-based judge verifies evolutions. Human feedback refines operators. |
| 07 | Evolutionary Computation + LLMs Survey (Chauhan et al., 2025) | EC enhances LLMs via prompt engineering, hyperparameter tuning, architecture search. LLMs aid in automating design and analysis of ECs. |
| 08 | Artemis (Giavrimis et al., 2025) | No-code evolutionary optimization platform for LLM agents. Prompt optimization alone gave +13.6% improvement. Semantically-aware genetic operators. |
| 09 | PromptWizard (Agarwal et al., Microsoft, 2025) | Feedback-driven self-evolution. Critique-and-synthesis loop: critic evaluates, identifies weaknesses, synthesizes improvements. |

### Learning from Failure / Self-Reflection

| # | Paper | Key Finding |
|---|-------|-------------|
| 10 | Failure Makes the Agent Stronger (Su et al., 2025) | Structured reflection: transform "from error to repair" into a first-class, controllable, trainable action. Diagnose root cause, propose corrected action. 20-40% improvement. |
| 11 | Where LLM Agents Fail / AgentDebug (Zhu et al., 2025) | Error propagation is the main bottleneck. A single early mistake distorts later reasoning. Decompose trajectories into decision points, identify root causes. |
| 12 | Self-Reflection in LLM Agents (Renze & Guven, 2024) | LLM agents significantly improve through self-reflection (p < 0.001). Compared 8 types of self-reflecting agents. |
| 13 | Experiential Reflective Learning / ERL (Allard et al., 2026) | Reflect on task trajectories to generate transferable heuristics, not just corrections. Heuristics generalize better than few-shot trajectory prompting. +7.8% over ReAct baseline. |
| 14 | RISE: Recursive Introspection (Qu et al., 2024) | Teaches LLMs to recursively detect and correct their own mistakes across iterations. Fine-tuned on own failure trajectories. |

### RLHF / Reward Signals

| # | Paper | Key Finding |
|---|-------|-------------|
| 15 | Training a Helpful and Harmless Assistant (Bai et al., 2022) | RLHF pipeline: SFT -> Reward Model -> PPO. Iterated online training improves datasets and models on weekly cadence. |
| 16 | LLM Judge Evaluation Survey (2025) | Survey of LLM-as-a-Judge, multi-agent judges, Agent-as-a-Judge. Key: agentic evaluation with tool access dramatically outperforms static evaluation. |

---

## Key Findings for Blueprint Mode

### What Confirmed Our Direction

1. **Evolutionary prompt optimization works.** EvoPrompt, PromptBreeder, Artemis all confirm that evolving prompts outperforms manual engineering.

2. **Structured diagnosis beats generic retry.** Papers 10 and 11 show 20-40% improvement when failures are explicitly categorized and diagnosed vs just told "try again."

3. **Ephemeral agents + persistent state is the standard.** Every paper on long-running agents confirms degradation after ~35 minutes. External state files are the memory.

4. **Agent-as-a-Judge outperforms LLM-as-a-Judge.** For complex evaluation, the evaluator needs to be a full agent with tool access, not just a prompted LLM.

### New Insights to Incorporate

1. **Adaptive rubrics (AdaRubric).** Evaluation criteria should be generated per project type, not fixed. The formula should also produce the rubric for evaluating its own output.

2. **Preference pairs (DPO insight from RLHF).** "Which spec is better?" is cheaper than full scoring. The evaluator could compare two spec drafts instead of producing detailed scores. Lower effort for human, easier for evaluator agent.

3. **Versioned formula snapshots (VERO).** Every formula version + results must be tracked. Without versioning, you can't learn -- you don't know which change caused the improvement.

4. **Fine-tuned judge model (PRDJudge).** After enough evolution cycles, train a dedicated evaluator on accumulated data. Prompt-based evaluation gives ~70% human alignment. Fine-tuned gives 90%+. This is a later milestone.

5. **Extract heuristics, not just fixes (ERL).** Store transferable patterns at a higher level. "When a behavior depends on runtime state, always verify that the exploration step reads state management files" transfers across failure types. A specific fix like "add verification cross-check for conditional rendering" only applies to one scenario.

6. **Execution traces (VERO, AgentDebug).** Log every tool call, every file read, every prompt/response pair during formula execution. The Analyzer Agent needs traces to diagnose failures, not just the spec files that came out.

---

## The RLHF Analogy

The project's approach mirrors the RLHF pipeline:

```
RLHF Pipeline              Blueprint Mode
------------               --------------
SFT (instruction tuning)  <->  Baseline formula (starting point)
Reward Model training     <->  Evaluator agent + golden set
PPO optimization          <->  Evolution loop (analyze + mutate)
Iterated online RLHF      <->  Multiple evolution cycles with fresh feedback
DPO (direct preference)   <->  Preference pairs for cheaper evaluation signal
```

The RLHF literature shows that iterated online learning -- deploy the intermediate model, collect fresh feedback, continue training -- dramatically outperforms one-shot offline training.

---

## Context Drift Research

### The 35-Minute Rule
Every agent experiences performance degradation after ~35 minutes of work. Context drift compounds -- 2% misalignment at step 5 becomes 40% failure by step 15.

### Context Rot (Chroma Research, 2025)
A million-token context window doesn't mean you should use a million tokens. A focused 5K-token RAG context can outperform a 100K-token context dump.

### What Works
- Explicit checkpoints (agent summarizes understanding, human confirms)
- Context compaction (summarize completed work)
- Sub-agent isolation (fresh context per sub-task)
- Just-in-time context (load what you need, when you need it)
- Structured delimiters (XML tags separate instructions from data)
- External state files (state lives in files, not conversation)

---

## Papers Location

All 16 papers are saved in `/research_papers/`:

```
research_papers/
  01-agent-as-a-judge-icml2025.pdf
  02-adarubic-agent-evaluation.pdf
  03-prdbench-code-agent-benchmarking.pdf
  04-agent-as-judge-survey-2026.pdf
  05-vero-agent-optimization-harness.pdf
  06-evolutionary-prompt-search-toolbox.pdf
  07-evolutionary-computation-llm-survey.pdf
  08-artemis-automated-agent-optimization.pdf
  09-promptwizard-feedback-evolution.pdf
  10-failure-makes-agent-stronger.pdf
  11-where-agents-fail-agentdebug.pdf
  12-self-reflection-llm-agents.pdf
  13-experiential-reflective-learning.pdf
  14-recursive-introspection-rise.pdf
  15-rlhf-training-helpful-harmless.pdf
  16-llm-judge-evaluation-survey.pdf
```

---

## Further Reading

- [Spec Formula](07-spec-formula.md) -- What gets evolved
- [Evolution System](08-evolution-system.md) -- The training loop
- [Multi-Agent Harness](09-multi-agent-harness.md) -- The agents
