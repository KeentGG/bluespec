# Roadmap

> Task tracking, prototype priorities, and next steps.

---

## Status

## Done

- [x] Core vision and principles
- [x] Spec format brainstorm (all types)
- [x] CLI command structure
- [x] Agent orchestration concept
- [x] Bidirectional sync concept
- [x] Spec formula concept
- [x] Evolution system architecture
- [x] Multi-agent harness design
- [x] Golden set evaluation approach
- [x] Research collection (16 papers)

### In Progress

- [ ] Refine spec schema with real examples
- [ ] Design agent prompt templates
- [ ] Plan MVP prototype
- [ ] Research UI/layout spec options

### Todo

- [ ] Create reference implementation
- [ ] Test on sample brownfield project
- [ ] Write agent prompt library
- [ ] Design review UI mockups
- [ ] Benchmark sync performance

---

## Prototype Priorities (6-Week Plan)

1. **Week 1:** Spec format definition (YAML schema)
2. **Week 2:** Exploration agent (scan code -> generate spec)
3. **Week 3:** CLI skeleton (init, scan, review commands)
4. **Week 4:** Basic sync (detect code changes -> flag drift)
5. **Week 5:** Implementation agent (read spec -> generate code)
6. **Week 6:** Integration test on real codebase

---

## Key Distinctions We've Nailed Down

**Traditional Tools -> Blueprint Mode**

| Aspect | OpenSpec/SpecKit | Blueprint Mode |
|--------|------------------|----------------|
| Exploration | Static analysis (AST) | **Agent-driven code exploration** |
| Spec types | Single format | **Multi-type (function, component, dataflow, etc.)** |
| Sync | Manual or none | **Bidirectional with agent-powered conflict resolution** |
| Brownfield | Delta markers | **Full agent exploration generates initial specs** |
| UI/Layout | Not captured | **ComponentSpec with layout definitions** |

---

## Evolution System Milestones

- [ ] **Milestone 1:** Build the harness -- backbone, baseline formula, orchestrator loop, golden set structure, lessons_learned format
- [ ] **Milestone 2:** First evolution cycle -- run against a real codebase, evaluate, diagnose, mutate
- [ ] **Milestone 3:** Ecosystem specialization -- frontend/backend/mobile formulas diverge from baseline
- [ ] **Milestone 4:** Fine-tuned judge model -- train on accumulated evaluation data
- [ ] **Milestone 5:** Community formulas -- share evolved formulas across project types

---

## Next Brainstorm Directions

### A. Spec Schema Refinement
- Concrete examples from your actual codebase
- Refine FunctionSpec with real edge cases
- Design the UI/layout specification format

### B. Agent Prompt Engineering
- What prompts make exploration effective?
- How do we guide agents to find edge cases?
- Sync agent: how to analyze semantic changes?

### C. Prototype Planning
- Pick a small brownfield module to test on
- Define MVP scope (which spec types first?)
- Plan the first CLI commands to implement

### D. Technical Architecture
- Language-specific parsers vs universal
- Storage format (YAML + JSON export?)
- Git hook integration design

### E. Evaluation Deep Dive
- Structure the golden set format
- Design the lessons_learned.json schema
- Define the tiered mutation operators
