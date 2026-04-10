# Blueprint Mode -- Overview

> A spec framework and mediation layer between human developers and AI agents -- designed for brownfield ang greenfield projects with bidirectional sync.

Status: BRAINSTORM

---

## Core Thesis

Existing spec frameworks (OpenSpec, SpecKit) fail brownfield projects because:

1. **They assume greenfield** -- you start with specs, then write code
2. **They're static** -- specs don't evolve when code changes manually
3. **They're incomplete** -- they don't capture edge cases, UI layout, data flow, or cross-references
4. **They're tool-centric** -- they rely on scripts/AST parsers, not intelligent exploration

**Blueprint Mode** solves this by:

- **Agent-driven code exploration** -- AI agents explore and understand existing code, not just parse it
- **Multi-type specs** -- different spec types capture different aspects (function behavior, UI layout, data flow, etc.)
- **Bidirectional sync** -- code changes update specs, spec changes guide code generation
- **Git-native monorepo** -- all specs live in `/blueprints/`, versioned with code

---

## Architecture Principles

### 1. Agents Read Structured Files
Specs are YAML/JSON files that agents consume. No API layer, no service to run.

### 2. Agents Do the Exploration
- `blueprint scan` doesn't just run `tree` and `grep`
- It spawns agents to explore modules, understand business logic, identify patterns
- Agents emit structured specs based on their exploration

### 3. Human in the Loop
- Agent-generated specs are **drafts** -- humans review, refine, approve
- Bidirectional sync flags conflicts for human resolution
- Specs are **source of truth** only after human sign-off

### 4. Monorepo, Git-Native
```
/blueprints/
  ├── functions/
  │   ├── auth.login.yaml
  │   └── payment.process.yaml
  ├── components/
  │   ├── UserProfile.yaml
  │   └── CheckoutForm.yaml
  ├── dataflows/
  │   ├── user-registration.yaml
  │   └── order-lifecycle.yaml
  └── meta/
      ├── index.yaml          # cross-reference registry
      └── changelog.yaml      # spec evolution log
```

---

## Spec Types

| Type | Captures | Example |
|------|----------|---------|
| `FunctionSpec` | Data in -> process -> out, edge cases, error handling | `auth.login.yaml` |
| `ComponentSpec` | UI layout, props, state, lifecycle, styling | `UserProfile.yaml` |
| `DataFlowSpec` | Data requirements, transformation pipelines, validation | `user-registration.yaml` |
| `IntegrationSpec` | External APIs, connectors, contracts, auth | `stripe-webhook.yaml` |
| `LifecycleSpec` | App boot, init sequences, shutdown, cleanup | `app-initialization.yaml` |
| `ReferenceSpec` | Cross-spec relationships, dependencies, call graphs | `index.yaml` |

---

## Competitive Landscape

### Current Spec Frameworks (and their gaps)

| Framework | Approach | Key Limitation |
|-----------|----------|----------------|
| **Spec Kit** (GitHub) | Constitution-based, 6-phase pipeline | Greenfield-first; heavy "context tax" on large codebases; no bidirectional sync |
| **OpenSpec** | Delta markers (ADDED/MODIFIED/REMOVED) | Brownfield support but manual sync only (`/opsx:sync`); no agent exploration; 50KB context limit |
| **Kiro** (AWS) | EARS requirements, IDE-locked | Locked to specific models; limited brownfield support |
| **Intent** | Living specs, bidirectional sync | Closed source ($60-200/mo); limited flexibility |

### Comparison Matrix

| Dimension | OpenSpec | Spec Kit | **Blueprint Mode** |
|-----------|----------|----------|-------------------|
| **Brownfield** | Delta markers only | Assume greenfield | **Agent-driven discovery** |
| **Spec types** | Single format | Single format | **Multi-type (function, component, dataflow...)** |
| **Sync** | Manual (`/opsx:sync`) | None | **Bidirectional with conflict detection** |
| **Exploration** | None | None | **Agent code exploration** |
| **Cross-references** | File paths | None | **Structured reference graph** |
| **UI/Layout** | No | No | **ComponentSpec with layout** |
| **Edge cases** | Scenarios only | Tests only | **First-class in FunctionSpec** |
| **Context Management** | 50KB hard limit | No built-in limit (context tax) | **Hierarchical exploration** |
| **Tool Lock-in** | 30+ tools | GitHub ecosystem | **Agent-agnostic** |
| **Format** | Markdown + Git | Markdown + Python | **YAML/JSON with git-native** |

---

## Key Insights from Research

**Spec Kit's power comes with a cost:** Every installed slash command, every template, every constitution rule adds tokens to the agent's context window. Teams report significant "context tax" -- the cumulative token burden grows with each extension.

**OpenSpec's 50KB limit is deliberate but blunt:** Prevents prompt bloat but caps depth. You can't encode rich architecture in 50KB.

**Intent is the only one with bidirectional sync:** But closed source, expensive, and limited flexibility.

**The gap you're targeting:**
- Brownfield-first with agent-driven exploration (not delta markers)
- Multi-type specs that capture different aspects (not just function behavior)
- True bidirectional sync with conflict resolution
- Agent-driven, not script-driven

---

## The Hard Problems

1. **Bidirectional sync semantics** -- When code and spec diverge, who wins? How do we detect *intent* vs *accident*?
2. **Agent context management** -- Large codebases exceed context windows. How do we orchestrate hierarchical exploration?
3. **Granularity tradeoffs** -- Per-function specs (precise but verbose) vs per-module specs (concise but vague)?
4. **UI specification** -- How do we capture visual design in a format agents can implement?
5. **Review at scale** -- If agents generate 500 specs, how do humans review without burnout?

---

## The Agentic Engineering Pain Point

Blueprint Mode fixes a pain point in agentic engineering. When creating specs, the process involves having a set of prompts to pass to or guide agent AI to follow -- explore this codebase, create spec files with this format, verify, proceed to next step, etc.

The real product isn't the specs. It's the **system that produces reliable specs from unreliable agents.** AI agents are powerful but unreliable for complex, multi-step tasks. When you ask an agent to "understand this codebase and document it," you get inconsistent, incomplete, unstructured results.

The project's end goal is to follow how basic neural models are made: they follow a training phase, do back propagation and figure out the flaw, error, and reward correct behavior. The spec formulas are evolved, not hand-written, through an automated multi-agent harness.

---

## Further Reading

- [Spec Format](01-spec-format.md) -- Philosophy, spec kinds, and YAML schemas
- [CLI Design](02-cli-design.md) -- Commands, configuration, workflows
- [Agent Orchestration](03-agent-orchestration.md) -- Agent roles, context, failures
- [Bidirectional Sync](04-bidirectional-sync.md) -- Sync algorithm, conflicts, git hooks
- [Decisions](05-decisions.md) -- Open questions and research areas
- [Roadmap](06-roadmap.md) -- Tasks, prototype priorities, next steps
- [Spec Formula](07-spec-formula.md) -- The recipe for producing specs
- [Evolution System](08-evolution-system.md) -- How formulas are trained and improved
- [Multi-Agent Harness](09-multi-agent-harness.md) -- The agents that automate evolution
- [Research](10-research.md) -- Scientific papers and findings
