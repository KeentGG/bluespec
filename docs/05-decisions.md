# Open Decisions

> Active decisions to make, research areas, known unknowns.

---

## Critical Decisions

### 1. Format: YAML vs JSON vs Custom DSL

**YAML:**
- [ok] Human readable, easy to edit
- [ok] Comments support
- [x] Verbose, larger files
- [x] Parsing ambiguities

**JSON:**
- [ok] Universal support
- [ok] Strict schema
- [x] No comments
- [x] Verbose, hard to edit

**Custom DSL:**
- [ok] Optimized for domain
- [ok] Could be concise
- [x] Learning curve
- [x] Tooling overhead

**Hybrid approach:**
- Store as YAML (human-friendly)
- Provide JSON export for agents
- Validate with JSON Schema

**STATUS:** Need prototype to test ergonomics.

---

### 2. Granularity: How Fine-Grained?

**Option A: Per-function specs**
- `auth.login.yaml`, `auth.register.yaml`, etc.
- [ok] Precise, easy to find
- [x] Thousands of files for large projects

**Option B: Per-module specs**
- `auth.yaml` contains all auth functions
- [ok] Fewer files
- [x] Harder to find specific function

**Option C: Hybrid**
- Small modules: single file
- Large modules: split by function
- Configurable threshold

**STATUS:** Probably Option C with config.

---

### 3. UI/Layout Specification

How do we capture visual design?

**Option A: Abstract descriptions**
```yaml
layout:
  type: "card"
  children: ["header", "body", "footer"]
```

**Option B: CSS-in-spec**
```yaml
style:
  padding: "16px"
  border: "1px solid #ccc"
```

**Option C: Reference to design system**
```yaml
component: "Card"
variant: "outlined"
```

**Option D: Screenshot + annotation**
Store screenshots with labeled regions?

**STATUS:** Need to research design-as-code tools.

---

### 4. Cross-Platform Agent Support

Do we support multiple AI providers?

**Option A: Claude-first**
- Optimize for Claude Code integration
- Best experience, limited reach

**Option B: Provider-agnostic**
- Support Claude, GPT-4, local models
- More complex, lowest common denominator

**Option C: Pluggable adapters**
- Core framework is neutral
- Adapters for each provider
- Community can add more

**STATUS:** Leaning toward C with Claude as reference.

---

### 5. Large Monorepo Strategy

How to handle 1000+ specs?

**Challenges:**
- Agent context limits
- Sync performance
- Human navigation

**Ideas:**
- Domain sharding (`/blueprints/auth/`, `/blueprints/payments/`)
- Lazy loading (explore on demand)
- Index + search interface
- Subscriptions (only sync what you own)

**STATUS:** Need real-world test case.

---

### 6. Test Integration

Relationship between specs and tests:

**Option A: Specs generate tests**
- FunctionSpec -> test file
- Pros: Tests always match spec
- Cons: Generated tests may be shallow

**Option B: Tests inform specs**
- Parse existing tests for edge cases
- Pros: Captures actual behavior
- Cons: May miss intent

**Option C: Bidirectional**
- Specs can generate test stubs
- Tests can update specs with new cases
- Complex but powerful

**STATUS:** Leaning toward C, starting with B.

---

## Technical Research Areas

### Runtime Instrumentation

How do we capture runtime behavior?

- **Code injection:** Instrument functions at build time?
- **Proxy layer:** Intercept calls at runtime?
- **Tracing:** Use OpenTelemetry/OpenCensus?
- **Snapshot testing:** Record real inputs/outputs?

**Use cases:**
- Actual performance characteristics
- Real-world error patterns
- Data shape observations

### AST Parsing Strategy

What parsing tools to use?

| Language | Tool |
|----------|------|
| TypeScript | `typescript` compiler API |
| Python | `ast` module |
| Go | `go/ast` |
| Rust | `syn` |
| Universal | Tree-sitter |

**Decision:** Language-specific for accuracy, Tree-sitter as fallback.

### Storage Evolution

Specs will evolve. How do we handle versioning?

- **Git history:** Natural versioning, but hard to query
- **Migrations:** Update old specs to new format
- **Compatibility:** How long support old formats?

---

## UX Research Areas

### Developer Workflow

What's the actual day-to-day like?

**Scenario A: Spec-first**
1. Write spec
2. Agent generates code
3. Iterate

**Scenario B: Code-first**
1. Write code
2. Agent generates spec
3. Approve

**Scenario C: Parallel**
- Specs and code evolve together
- Sync keeps them aligned

**Question:** Which is more natural? Does it vary by developer?

### Review Fatigue

If agents generate 500 specs, how do humans review without burnout?

**Ideas:**
- Confidence-based filtering (only review < 0.8 confidence)
- Batch review by domain
- "Trust this pattern" (auto-approve similar specs)
- Diff highlighting of what's new/changed

### Integration with Existing Tools

- **IDEs:** VSCode extension? JetBrains plugin?
- **CI/CD:** GitHub Actions, GitLab CI?
- **Docs:** Docusaurus, Storybook?
- **API tools:** OpenAPI generator?

---

## Open Questions

### From Spec Format
1. Should we support multiple representations (YAML for humans, JSON for agents)?
2. How do we handle spec versioning when code evolves?
3. Should references be validated (fail if target doesn't exist)?
4. How granular should FunctionSpec be? Per function, per module, per class?
5. How do we capture visual UI specs (CSS, spacing, colors)?

### From CLI Design
1. Should we have a `blueprint watch` daemon for continuous sync?
2. How do we handle large monorepos (1000+ specs)?
3. Should agents be pluggable (Claude, GPT-4, local models)?
4. What's the fallback if agent exploration fails/conflicts?

### From Agent Orchestration
1. Should agents be model-specific or pluggable (Claude, GPT-4, local)?
2. How do we handle agent hallucinations in exploration?
3. What's the cost model for agent-heavy operations?
4. Should agents learn from project-specific patterns over time?
5. How do we parallelize exploration across large codebases?
6. What's the fallback if agent API is unavailable?

### From Bidirectional Sync
1. How do we handle long-running sync operations (hours for large codebases)?
2. Should sync be blocking (CI fails) or advisory (warnings)?
3. How do we recover from "sync went wrong" scenarios?
4. What's the story for teams without AI agents (fallback mode)?
5. How do we sync across branches (feature branches vs main)?

---

## Business Model Questions

### Open Source Strategy

- Core framework: Open source (MIT?)
- Managed service: Optional SaaS for teams?
- Enterprise features: Self-hosted with auth, audit logs?

### Cost Considerations

Agent-heavy workflows = API costs.

- How to minimize token usage?
- Can local models substitute for some tasks?
- Tiered pricing for exploration depth?

---

## Evolution System Questions

### Agent Lifecycle

Are agents cleared on every evolution cycle, or only after they reached some number of cycles? We lean toward clearing every cycle with full documentation in persistent state files. We document because agents have limited context -- we can't keep the same agent working indefinitely.

### How Many Golden Behaviors Per Project?

Enough to measure recall, but not so many it's unsustainable for the human curating them.

### How Does the Mutator Know What "Different" Means?

If tier 1 (prompt change) failed, what's the systematic way to try tier 2 (step change)? The mutator needs a structured exploration of the mutation space, not random changes.

### Who Orchestrates?

Is the orchestrator itself an agent, or is it a simpler state machine / script? A script might be more reliable for the loop management, with agents only handling the creative work.

### When to Introduce Fine-Tuned Judge?

After how many evolution cycles do we have enough data to train a dedicated evaluator model? Research shows fine-tuned judges achieve 90%+ human alignment vs ~70% for prompted judges.

### Formulas: Universal vs Ecosystem-Specific

We agreed on a baseline backbone shared across all formulas, with ecosystem specializations. But how thin should the baseline be? Too thin and each ecosystem reinvents everything. Too thick and formulas carry irrelevant blocks.

---

## Call for Input

Questions for early users:

1. What's your biggest pain point with current code?
2. How much manual review are you willing to do?
3. What's your codebase size (LOC, files)?
4. What languages/frameworks matter most?
5. Do you already use Claude Code / Copilot / other agents?
