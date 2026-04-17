# Agent Orchestration

> How agents work within blueprint-mode -- exploration, generation, implementation.
> Status: BRAINSTORM -- this is the core innovation area.

---

## Core Insight

Traditional spec tools rely on **static analysis** (AST parsing, regex). Blueprint Mode uses **agents as first-class explorers**.

The agent doesn't just parse code -- it **understands intent, identifies patterns, infers edge cases**.

---

## Agent Roles

### 1. Exploration Agent

**Purpose:** Read codebase and generate draft specs.

**Inputs:**
- Source code (files, modules)
- Existing specs (for context)
- Configuration (what to look for)

**Outputs:**
- Draft specs (YAML)
- Confidence scores
- Exploration notes

**Process:**
```
1. Read module structure
   |
2. Identify entry points (exports, public APIs)
   |
3. Deep dive into each function/component:
   - Read implementation
   - Identify inputs/outputs
   - Trace data flow
   - Find error handling
   - Look for edge cases in tests/comments
   |
4. Cross-reference with existing specs
   |
5. Generate structured spec
   |
6. Emit confidence score + reasoning
```

**Example Session:**
```
Agent: I'll explore src/auth/login.ts

Agent: This exports an async function `login(credentials, options)`

Agent: Reading implementation... it validates email format,
       queries database, checks password with bcrypt,
       handles account lock scenarios

Agent: Looking at tests... found edge cases:
       - concurrent logins from multiple devices
       - brute force protection after 5 failed attempts
       - unicode email handling

Agent: Cross-referencing with existing specs...
       Found related spec: auth.register -- should reference this

Agent: Generating FunctionSpec for auth.login
       Confidence: 0.92 (high -- well-documented, good test coverage)
```

---

### 2. Implementation Agent

**Purpose:** Generate/modify code to match canonical specs.

**Inputs:**
- Canonical specs (source of truth)
- Existing codebase (for patterns/style)
- Change proposal (what to implement)

**Outputs:**
- Code changes (diff)
- Implementation notes
- Test updates (if needed)

**Process:**
```
1. Read canonical specs for the change
   |
2. Study existing code patterns in target area
   - Naming conventions
   - Error handling style
   - Import patterns
   |
3. Generate implementation matching spec
   - Function signatures
   - Business logic per spec.process
   - Error handling per spec.edge_cases
   |
4. Verify against spec (self-check)
   |
5. Emit code + confidence score
```

**Key Constraint:**
Implementation agent must respect **existing code style**. It doesn't invent new patterns -- it extends what's there.

---

### 3. Sync Agent

**Purpose:** Detect and resolve drift between code and specs.

**Inputs:**
- Canonical specs
- Current code
- Git history (what changed since last sync)

**Outputs:**
- Drift report
- Proposed spec updates (if code changed)
- Proposed code updates (if spec changed)
- Conflict flags (if both changed)

**Process:**
```
1. Compare current code to spec source_refs
   |
2. For each function/component:
   a) If code changed but spec didn't:
      - Analyze what changed
      - Infer intent (refactor, bugfix, feature)
      - Propose spec update

   b) If spec changed but code didn't:
      - Flag for implementation

   c) If both changed:
      - Deep analysis required
      - Flag as conflict for human review
```

---

### 4. Analysis Agent (On-Demand)

**Purpose:** Answer specific questions about code.

**Use Cases:**
- "What error cases does this function handle?"
- "Which functions depend on User type?"
- "What's the data flow for user registration?"

**Process:**
```
1. Parse the question
   |
2. Identify relevant code areas
   |
3. Read and analyze
   |
4. Synthesize answer with evidence (file:line references)
```

---

## Agent Context Management

### Context Window Strategy

Agents have limited context windows. For large codebases:

```
Strategy: Hierarchical Exploration

Level 1: Overview
- Read directory structure
- Identify major modules
- Read README, architecture docs
- Output: Module map

Level 2: Module Deep Dive
- For each module:
  - Read exports/public API
  - Read key files
  - Identify sub-components
- Output: Module specs

Level 3: Granular Detail
- For each function/component:
  - Read implementation
  - Read tests
  - Identify edge cases
- Output: FunctionSpec, ComponentSpec
```

### Context Budgeting

```yaml
# Per exploration batch
max_files: 50
max_lines_per_file: 500
max_total_lines: 10000

# Priority ordering
1. Entry points (exports)
2. Files with existing specs (for consistency)
3. Test files (edge case detection)
4. Implementation files
```

---

## Agent Output Format

Agents emit structured results:

```yaml
exploration_result:
  agent_id: "explore-v1.2.0"
  timestamp: "2026-04-04T12:00:00Z"
  target: "src/auth/login.ts"

  specs_generated:
    - spec_id: "auth.login"
      type: "FunctionSpec"
      status: "draft"
      confidence: 0.92
      reasoning: |
        Well-documented function with comprehensive tests.
        Clear input/output contract. Error handling explicit.

  notes:
    - "Found 3 edge cases in test file"
    - "Function delegates to 2 database queries"
    - "Async operation with side effects (session creation)"

  warnings:
    - "Partial type definition found in separate file"

  cross_refs_found:
    - "References types.User (found in src/types/user.ts)"
    - "Calls db.users.findByEmail"
```

---

## Fine-Tune Agent

**Purpose:** Run adaptive rubric discovery to produce project-specific formula tuning.

**When invoked:** User runs `blueprint fine-tune`.

**Inputs:**
- Current formula (promoted parent or existing derived formula)
- Project codebase
- Optional: user-declared goals/priorities
- Optional: accumulated review feedback from `blueprint review`

**Process:**
```
1. Scan project structure
   - Identify frameworks, patterns, dominant concerns
   - Count behavioral shapes (state machines, auth flows, data pipelines, etc.)
   |
2. Run current formula on a sample of files
   - Produce draft specs for ~10 representative files
   |
3. Adaptive rubric discovery
   - Which active criteria had no signal? → propose suppression
   - What codebase patterns lack matching criteria? → propose additions
   - What existing criteria should be weighted differently? → propose weight changes
   - If user goals provided, align proposals with declared priorities
   |
4. Present proposals interactively
   - Each proposal shows: evidence, confidence, proposed weight, reasoning
   - User accepts, rejects, or adjusts weight per proposal
   |
5. Write derived formula
   - Parent ref, fine_tuned_criteria, suppressed_criteria
   - Changes activate for next scan, not retroactively
```

**Outputs:**
- Derived formula file (layered on parent)
- Fine-tune discovery log (what was proposed, accepted, rejected)

**Key constraint:** The fine-tune agent does not modify the parent formula. It produces a derived layer that can be rebased when the parent is updated through upstream evolution.

---

## Human-Agent Collaboration

### Review Interface

When human runs `blueprint review`:

```
+----------------------------------------------------+
| Review: auth.login (FunctionSpec)                  |
| Confidence: 92% | Agent: explore-v1.2.0            |
+----------------------------------------------------+
|                                                    |
| Generated from: src/auth/login.ts:45-120           |
|                                                    |
| +------------------------------------------------+ |
| | FUNCTION SIGNATURE                              | |
| | async login(credentials, options?)              | |
| |   -> { token, user } | AuthError                | |
| +------------------------------------------------+ |
|                                                    |
| Edge Cases Detected:                               |
|   [ok] concurrent_logins                           |
|   [ok] brute_force_protection                      |
|   [ok] unicode_email                               |
|   [?] expired_token (detected in comments)         |
|                                                    |
| [a]pprove  [r]eject  [e]dit  [s]kip  [v]iew_src   |
+----------------------------------------------------+
```

### Feedback Loop

Human corrections improve future agent behavior:

```
Human rejects spec:
  -> Flag reason (missing edge case, wrong type, etc.)
  -> Agent re-explores with new context
  -> Store correction in meta/feedback.yaml
  -> Use for future explorations of similar patterns
```

---

## Agent Failure Modes

### Exploration Failures

| Scenario | Response |
|----------|----------|
| Complex nested generics | Emit warning, generate partial spec |
| Minified/obfuscated code | Skip, flag for manual annotation |
| Circular dependencies | Document cycle, pick entry point |
| No test coverage | Low confidence score, flag for review |

### Implementation Failures

| Scenario | Response |
|----------|----------|
| Spec contradicts existing pattern | Flag conflict, don't implement |
| Missing dependencies | Halt, report missing refs |
| Test failures after implementation | Rollback, flag for analysis |

---

## Multi-Agent Coordination

For large changes, multiple agents collaborate:

```
Coordinator Agent
       |
       +-- Exploration Agent -> Maps affected code
       |
       +-- Spec Agent -> Generates/updates specs
       |
       +-- Implementation Agent -> Writes code
       |
       +-- Validation Agent -> Runs tests, checks alignment
```
