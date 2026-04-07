# Blueprint Mode

> A spec framework and mediation layer between human developers and AI agents — designed for brownfield projects with bidirectional sync.

---

## Core Thesis

Existing spec frameworks (OpenSpec, SpecKit) fail brownfield projects because:

1. **They assume greenfield** — you start with specs, then write code
2. **They're static** — specs don't evolve when code changes manually
3. **They're incomplete** — they don't capture edge cases, UI layout, data flow, or cross-references
4. **They're tool-centric** — they rely on scripts/AST parsers, not intelligent exploration

**Blueprint Mode** solves this by:

- **Agent-driven code exploration** — AI agents explore and understand existing code, not just parse it
- **Multi-type specs** — different spec types capture different aspects (function behavior, UI layout, data flow, etc.)
- **Bidirectional sync** — code changes update specs, spec changes guide code generation
- **Git-native monorepo** — all specs live in `/blueprints/`, versioned with code

---

## Architecture Principles

### 1. Agents Read Structured Files
Specs are YAML/JSON files that agents consume. No API layer, no service to run.

### 2. Agents Do the Exploration
- `blueprint scan` doesn't just run `tree` and `grep`
- It spawns agents to explore modules, understand business logic, identify patterns
- Agents emit structured specs based on their exploration

### 3. Human in the Loop
- Agent-generated specs are **drafts** — humans review, refine, approve
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
| `FunctionSpec` | Data in → process → out, edge cases, error handling | `auth.login.yaml` |
| `ComponentSpec` | UI layout, props, state, lifecycle, styling | `UserProfile.yaml` |
| `DataFlowSpec` | Data requirements, transformation pipelines, validation | `user-registration.yaml` |
| `IntegrationSpec` | External APIs, connectors, contracts, auth | `stripe-webhook.yaml` |
| `LifecycleSpec` | App boot, init sequences, shutdown, cleanup | `app-initialization.yaml` |
| `ReferenceSpec` | Cross-spec relationships, dependencies, call graphs | `index.yaml` |

---

## Bidirectional Sync

### Code → Spec (Discovery)
```
Trigger: blueprint scan
        │
        ▼
┌───────────────────┐
│ Agent explores    │  ← Reads code, understands intent
│ codebase          │  ← Identifies functions, components, flows
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ Generates draft   │  ← Emits structured specs
│ specs             │  ← Marks as "draft" status
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ Human reviews     │  ← Approve, reject, or refine
│ and approves      │  ← Approved specs become "canonical"
└───────────────────┘
```

### Spec → Code (Generation)
```
Trigger: blueprint apply <change-id>
        │
        ▼
┌───────────────────┐
│ Agent reads specs │  ← Consumes canonical specs
│                   │  ← Understands requirements
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ Generates code    │  ← Implements to match spec
│ changes           │  ← Respects existing patterns
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ Git commit        │  ← Code changes committed
│                   │  ← Specs updated (if needed)
└───────────────────┘
```

### Conflict Detection
When manual code edit contradicts canonical spec:
```
Trigger: git commit (or blueprint sync)
        │
        ▼
┌───────────────────┐
│ Diff detected     │  ← Code behavior != spec behavior
│ between code and  │  ← Flag for review
│ spec              │  ← Options: update spec, revert code, or override
└───────────────────┘
```

---

## Agent Workflow

### For Brownfield Entry
```
$ blueprint init                    # Create /blueprints/ structure
$ blueprint scan --depth=full       # Agent explores entire codebase
                                    # Generates draft specs
$ blueprint review                    # Interactive: human reviews each spec
$ blueprint approve --all           # Mark specs as canonical
```

### For Ongoing Development
```
# Developer wants to add a feature
$ blueprint propose add-oauth       # Create change proposal
$ blueprint explore                   # Agent explores relevant code
$ blueprint draft                     # Agent drafts specs for new feature
$ blueprint review                    # Human reviews
$ blueprint apply add-oauth         # Agent implements from specs
```

### For Sync Maintenance
```
$ blueprint status                  # Show drift between code and specs
$ blueprint sync --interactive      # Resolve conflicts one by one
```

---

## Differentiation

| | OpenSpec | SpecKit | **Blueprint Mode** |
|---|---|---|---|
| **Brownfield** | Delta markers only | Assume greenfield | **Agent-driven discovery** |
| **Spec types** | Single format | Single format | **Multi-type (function, component, dataflow...)** |
| **Sync** | Manual (`/opsx:sync`) | None | **Bidirectional with conflict detection** |
| **Exploration** | None | None | **Agent code exploration** |
| **Cross-references** | File paths | None | **Structured reference graph** |
| **UI/Layout** | No | No | **ComponentSpec with layout** |
| **Edge cases** | Scenarios only | Tests only | **First-class in FunctionSpec** |

---

## Open Questions

See `TODO.md` for active research areas.
