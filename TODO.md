# Open Questions & TODO

> Active research areas, decisions to make, known unknowns.

---

## Critical Decisions

### 1. Format: YAML vs JSON vs Custom DSL

**YAML:**
- ✓ Human readable, easy to edit
- ✓ Comments support
- ✗ Verbose, larger files
- ✗ Parsing ambiguities

**JSON:**
- ✓ Universal support
- ✓ Strict schema
- ✗ No comments
- ✗ Verbose, hard to edit

**Custom DSL:**
- ✓ Optimized for domain
- ✓ Could be concise
- ✗ Learning curve
- ✗ Tooling overhead

**Hybrid approach:**
- Store as YAML (human-friendly)
- Provide JSON export for agents
- Validate with JSON Schema

**STATUS:** Need prototype to test ergonomics.

---

### 2. Granularity: How Fine-Grained?

**Option A: Per-function specs**
- `auth.login.yaml`, `auth.register.yaml`, etc.
- ✓ Precise, easy to find
- ✗ Thousands of files for large projects

**Option B: Per-module specs**
- `auth.yaml` contains all auth functions
- ✓ Fewer files
- ✗ Harder to find specific function

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
- FunctionSpec → test file
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

---

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

---

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

---

### Review Fatigue

If agents generate 500 specs, how do humans review without burnout?

**Ideas:**
- Confidence-based filtering (only review < 0.8 confidence)
- Batch review by domain
- "Trust this pattern" (auto-approve similar specs)
- Diff highlighting of what's new/changed

---

### Integration with Existing Tools

- **IDEs:** VSCode extension? JetBrains plugin?
- **CI/CD:** GitHub Actions, GitLab CI?
- **Docs:** Docusaurus, Storybook?
- **API tools:** OpenAPI generator?

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

## Prototype Priorities

What to build first:

1. **Week 1:** Spec format definition (YAML schema)
2. **Week 2:** Exploration agent (scan code → generate spec)
3. **Week 3:** CLI skeleton (init, scan, review commands)
4. **Week 4:** Basic sync (detect code changes → flag drift)
5. **Week 5:** Implementation agent (read spec → generate code)
6. **Week 6:** Integration test on real codebase

---

## Call for Input

Questions for early users:

1. What's your biggest pain point with current code?
2. How much manual review are you willing to do?
3. What's your codebase size (LOC, files)?
4. What languages/frameworks matter most?
5. Do you already use Claude Code / Copilot / other agents?

---

## Done

- [x] Core vision and principles
- [x] Spec format brainstorm (all types)
- [x] CLI command structure
- [x] Agent orchestration concept
- [x] Bidirectional sync concept

## In Progress

- [ ] Refine spec schema with real examples
- [ ] Design agent prompt templates
- [ ] Plan MVP prototype
- [ ] Research UI/layout spec options

## Todo

- [ ] Create reference implementation
- [ ] Test on sample brownfield project
- [ ] Write agent prompt library
- [ ] Design review UI mockups
- [ ] Benchmark sync performance
