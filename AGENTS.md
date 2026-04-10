# Blueprint Mode -- Agent Instructions

## Project Context

Blueprint Mode is a spec framework and agentic engineering system. It uses AI agents to explore codebases, understand behavior, and produce comprehensive specs automatically. The real product isn't the specs -- it's the system that produces reliable specs from unreliable agents.

Read `docs/00-overview.md` for the full project context.

---

## Conversation Modes

### Brainstorm Mode (Default During Research)

When we're exploring ideas, discussing architecture, or researching solutions:

- **Don't update docs right away.** Just converse naturally.
- **You can disagree.** Push back on ideas. Challenge assumptions. Play devil's advocate.
- **Suggest key points.** If you see a connection the user hasn't made, bring it up.
- **Think outside the box.** Draw from adjacent fields -- neuroscience, evolutionary biology, software engineering, systems design.
- **Use research tools.** Your knowledge has a cutoff. Search the web for recent papers, tools, frameworks, and forum posts when relevant.
- **Ask clarifying questions.** Don't assume -- explore the idea together.
- **No premature structure.** Let the conversation flow. Structure comes at checkpoint.

This is the default mode during any research or design discussion. The user will tell you when to switch.

### Checkpoint Mode

When the user says **"checkpoint convo"** or similar (e.g., "checkpoint", "save this", "let's document this"):

1. **Save the session.** Write the full conversation to `conversation_sessions/session-YYYY-MM-DD.md` with:
   - Date and topics covered
   - Chronological back-and-forth (not just summaries)
   - Key quotes from the user
   - Decisions made and agreed upon
   - Open questions raised
   - Minor details and nuances

2. **Update docs.** Based on what was discussed:
   - Create new docs if new major concepts emerged
   - Update existing docs with new content (decisions, roadmap, etc.)
   - Only add things that were actually agreed upon or concluded
   - Mark unresolved questions in `docs/05-decisions.md`

3. **Don't summarize into mush.** The session log should capture the actual conversation, including wrong turns, clarifications, and "wait I meant this" moments. The docs should capture the conclusions.

---

## Doc Structure

```
docs/
  00-overview.md              -- Vision, thesis, competitive landscape
  01-spec-format.md           -- Spec philosophy + YAML schemas
  02-cli-design.md            -- CLI commands, config, workflows
  03-agent-orchestration.md   -- Agent roles, context management
  04-bidirectional-sync.md    -- Sync algorithm, conflicts, git hooks
  05-decisions.md             -- Open questions and research areas
  06-roadmap.md               -- Tasks, milestones, next steps
  07-spec-formula.md          -- Spec formula concept, ecosystem taxonomy
  08-evolution-system.md      -- Evolutionary loop, golden set, mutations
  09-multi-agent-harness.md   -- Generator/Evaluator/Analyzer/Mutator
  10-research.md              -- Papers, findings, insights

conversation_sessions/        -- Full session logs (chronological)
research_papers/              -- PDFs of scientific papers
```

---

## Key Principles

- **The user curates golden sets, not specs.** Human effort goes into providing known behaviors as ground truth, not writing spec files.
- **Formulas are evolved, not written.** The system discovers the best spec recipe through iteration.
- **Ecosystem taxonomy, not framework-specific.** React/Vue/Angular share one formula. Node/Python/PHP backend share one. But frontend vs backend vs mobile vs game are different.
- **Ephemeral agents, persistent state.** Every agent session is disposable. Files are the memory.
- **Never repeat failed teaching methods.** The "insanity prevention" rule.
- **The Analyzer Agent is the make-or-break.** If the system can't learn from mistakes, the specs are just a wiki.

---

## File Conventions

- Docs are numbered `00-` through `10-` for natural ordering
- Session logs are named `session-YYYY-MM-DD.md`
- Research papers are numbered `01-` through `16-`
- All markdown, no rich formatting (terminal-friendly)
