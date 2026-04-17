# CLI Design & Commands

> Command structure, workflows, and configuration.
> Status: BRAINSTORM -- subject to change as we prototype.

---

## Command Overview

```
blueprint init              Initialize /blueprints/ structure
blueprint scan              Agent-driven code exploration and spec generation
blueprint review            Interactive spec review and approval
blueprint apply             Apply spec changes to code
blueprint status            Show drift between code and specs
blueprint sync              Bidirectional sync with conflict resolution
blueprint validate          Validate spec completeness and correctness
blueprint fine-tune         Adaptive rubric discovery for project-specific formula tuning
blueprint agent             Serve specs to agents in consumable format
blueprint explore           Agent explores specific module/area
blueprint propose           Create a new change proposal
blueprint diff              Show spec changes before applying
blueprint archive           Move completed specs to archive
```

---

## Detailed Command Reference

### `blueprint init`

Initialize blueprint-mode in a project.

```bash
blueprint init [options]

Options:
  --template=<name>         Starting template (minimal, full, react, api)
  --dry-run                 Show what would be created

Output:
  Creates /blueprints/ directory structure:
  /blueprints/
    ├── functions/
    ├── components/
    ├── dataflows/
    ├── integrations/
    ├── lifecycle/
    └── meta/
      ├── index.yaml
      └── config.yaml
```

---

### `blueprint scan`

Agent-driven code exploration. This is where the magic happens.

```bash
blueprint scan [options] [path]

Arguments:
  path                      Directory to scan (default: project root)

Options:
  --depth=<level>           Exploration depth (surface, deep, full)
  --type=<types>            Limit to spec types (function,component,dataflow)
  --agent=<name>            Which agent to use for exploration
  --output-format=<fmt>     yaml | json
  --draft-only              Don't auto-approve anything
  --review-threshold=<n>    Pause for review every N specs

Behavior:
  1. Spawns exploration agent(s)
  2. Agent reads codebase structure
  3. Agent identifies functions, components, data flows
  4. Agent generates draft specs (YAML)
  5. Saves to /blueprints/ with status: "draft"
  6. Reports summary to user

Examples:
  blueprint scan                    # Scan entire project
  blueprint scan src/auth           # Scan specific module
  blueprint scan --depth=surface    # Quick overview only
  blueprint scan --type=function    # Only function specs
```

---

### `blueprint review`

Interactive review of draft specs.

```bash
blueprint review [options] [spec-id]

Options:
  --all                     Review all draft specs
  --type=<type>             Filter by spec type
  --since=<date>            Review specs created since date
  --batch                   Non-interactive batch mode

Interactive Mode:
  Shows each draft spec with:
  - Diff from previous version (if any)
  - Source code references
  - Generated confidence score (agent's certainty)

  Commands:
    [a]pprove               Mark as canonical
    [r]eject                Delete draft
    [e]dit                  Open in $EDITOR
    [s]kip                  Move to next
    [q]uit                  Exit review

Examples:
  blueprint review                    # Review all drafts
  blueprint review auth.login         # Review specific spec
  blueprint review --type=function    # Only function specs
```

---

### `blueprint apply`

Apply spec-driven changes to code.

```bash
blueprint apply <change-id> [options]

Options:
  --agent=<name>            Which agent to use for implementation
  --preview                 Show diff without applying
  --no-test                 Skip running tests after
  --test-only               Only run tests, don't apply
  --force                   Override safety checks

Behavior:
  1. Reads canonical specs for the change
  2. Spawns implementation agent
  3. Agent generates/modifies code to match spec
  4. Runs tests (if configured)
  5. Git commit with structured message
  6. Updates specs if implementation diverged

Examples:
  blueprint apply add-oauth           # Apply specific change
  blueprint apply --preview           # Preview only
```

---

### `blueprint status`

Show current state of code-spec alignment.

```bash
blueprint status [options]

Options:
  --format=<fmt>            table | json | yaml
  --drift-only              Only show misaligned specs
  --by-domain               Group by domain

Output:
  +------------------+------------+----------+-------------+
  | Spec             | Status     | Last Sync| Drift Level |
  +------------------+------------+----------+-------------+
  | auth.login       | canonical  | 2h ago   | none        |
  | auth.register    | draft      | never    | N/A         |
  | payments.process | canonical  | 1d ago   | detected    |
  | components.Nav   | deprecated | 1w ago   | N/A         |
  +------------------+------------+----------+-------------+

  Drift Levels:
    none        Code matches spec exactly
    minor       Code has non-functional changes (comments, formatting)
    detected    Functional differences found
    conflict    Human must resolve (breaking changes)
```

---

### `blueprint sync`

Bidirectional synchronization.

```bash
blueprint sync [options]

Options:
  --direction=<dir>         code-to-spec | spec-to-code | auto
  --interactive             Resolve conflicts one by one
  --auto-resolve=<mode>     prefer-code | prefer-spec | fail
  --dry-run                 Preview changes

Behavior:
  1. Detects changes since last sync
  2. For each drift:
     - If code changed, agent analyzes and proposes spec update
     - If spec changed, agent proposes code update
     - If both changed, flag as conflict
  3. Presents conflicts for resolution (if interactive)
  4. Applies approved changes
  5. Updates sync timestamps

Examples:
  blueprint sync --interactive      # Full interactive sync
  blueprint sync --direction=code-to-spec --auto-resolve=prefer-code
```

---

### `blueprint validate`

Validate specs for completeness and consistency.

```bash
blueprint validate [options] [spec-id]

Options:
  --all                     Validate all specs
  --strict                  Fail on warnings
  --check-refs              Verify cross-references exist
  --check-coverage          Verify code coverage

Checks:
  - Schema validity (YAML structure)
  - Reference integrity (all refs point to existing specs)
  - Completeness (required fields present)
  - Consistency (no contradictions)
  - Coverage (all code has corresponding specs)

Output:
  auth.login: valid
  auth.register: WARNING - missing edge cases
  payments.process: ERROR - invalid reference to "stripe.v1"
```

---

### `blueprint fine-tune`

Adaptive rubric discovery for project-specific formula tuning.

```bash
blueprint fine-tune [options]

Options:
  --formula=<name>          Parent formula to fine-tune (default: auto-detect ecosystem)
  --sample=<n>              Number of files to sample for discovery (default: 10)
  --goals=<list>            Explicit user priorities (comma-separated)
  --accept-all              Auto-approve all proposals (non-interactive)
  --dry-run                 Show proposals without writing derived formula

Behavior:
  1. Scans project structure (frameworks, patterns, concerns)
  2. Runs current formula on a sample of files
  3. Runs adaptive rubric discovery on the results:
     - Codebase structure analysis (automatic)
     - Infers what matters for THIS project
  4. Proposes rubric additions, weight changes, and suppressions
  5. User approves or rejects each proposal interactively
  6. Writes a derived formula layered on top of the parent

Interactive Mode:
  Shows each discovered criterion with:
  - Evidence (code references that triggered discovery)
  - Confidence score
  - Proposed weight adjustment
  - Reasoning

  Commands:
    [a]ccept                Add to derived formula
    [r]eject                Skip this criterion
    [w]eight <n>            Accept with custom weight
    [s]kip                  Decide later
    [q]uit                  Exit, write accepted so far

Output:
  /blueprints/meta/derived-formula.yaml
  Contains: parent ref, fine_tuned_criteria, suppressed_criteria

Examples:
  blueprint fine-tune                                    # Interactive fine-tune
  blueprint fine-tune --formula=frontend-v008            # Explicit parent
  blueprint fine-tune --goals="auth flows,error handling" # With priorities
  blueprint fine-tune --dry-run                           # Preview only
```

Fine-tune can be run multiple times. Each run discovers additional criteria based on the current derived formula state. Discovered criteria activate for the **next** `blueprint scan`, not retroactively.

---

### `blueprint propose`

Create a new change proposal.

```bash
blueprint propose <name> [options]

Options:
  --type=<type>             Feature, fix, refactor, docs
  --description=<text>      Short description
  --from-issue=<n>          Link to GitHub/JIRA issue
  --parent=<change>         Dependent on another change

Behavior:
  1. Creates /blueprints/changes/<name>/
  2. Generates proposal.yaml with template
  3. Opens for editing

Output:
  /blueprints/changes/add-oauth/
    ├── proposal.yaml
    ├── design/              # (created later)
    └── tasks/               # (created later)
```

---

### `blueprint explore`

Agent explores specific code area (on-demand).

```bash
blueprint explore <path> [options]

Options:
  --focus=<aspect>          behavior | structure | dependencies
  --questions=<list>        Specific questions to answer
  --output=<file>           Save exploration report

Behavior:
  Spawns agent to explore specific module, answer questions,
  and optionally generate/update specs.

Examples:
  blueprint explore src/auth --focus=dependencies
  blueprint explore src/payments --questions="What error cases are handled?"
```

---

## Configuration (`/blueprints/meta/config.yaml`)

```yaml
blueprint_version: "0.1.0"

project:
  name: "my-app"
  type: "web-app"              # web-app | api | library | mobile
  framework: "nextjs"
  language: "typescript"

sync:
  mode: "auto"                 # auto | manual | ci-only
  on_commit: true              # Run sync on git commit
  conflict_resolution: "prompt" # prompt | prefer-code | prefer-spec

agents:
  exploration:
    model: "claude-sonnet-4"
    temperature: 0.2
    max_files_per_batch: 50

  implementation:
    model: "claude-sonnet-4"
    temperature: 0.1
    test_after: true

generation:
  include_private_functions: false
  include_tests: true
  edge_case_detection: "aggressive"  # none | standard | aggressive
  ui_layout_capture: true

validation:
  require_references: true
  max_drift_before_warning: "1d"
  max_drift_before_blocking: "1w"

integrations:
  git:
    commit_prefix: "[blueprint]"
  github:
    link_issues: true
    pr_template: ".github/blueprint-pr.md"
```

---

## Workflow Examples

### Brownfield Entry (New Project)

```bash
# 1. Initialize
cd my-existing-project
blueprint init

# 2. Deep scan (agent explores everything)
blueprint scan --depth=full

# 3. Review generated specs (interactive)
blueprint review --all

# 4. Approve good specs
blueprint approve --all-reviewed

# 5. Validate everything is connected
blueprint validate --all --check-refs
```

### Feature Development

```bash
# 1. Create proposal
blueprint propose add-dark-mode --type=feature

# 2. Explore relevant code
blueprint explore src/components --focus=structure

# 3. Agent drafts specs
blueprint draft add-dark-mode

# 4. Review and approve
blueprint review add-dark-mode

# 5. Agent implements
blueprint apply add-dark-mode --preview   # Check first
blueprint apply add-dark-mode             # Apply

# 6. Sync any drift
blueprint sync
```

### Maintenance Mode

```bash
# Daily check
blueprint status --drift-only

# Weekly sync
blueprint sync --interactive

# Before release
blueprint validate --all --strict
```
