# Blueprint Mode — Complete Documentation

> A spec framework and mediation layer between human developers and AI agents — designed for brownfield projects with bidirectional sync.

**Session Date:** April 4, 2026  
**Project Location:** `/Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode`

---

# Table of Contents

1. [Competitive Analysis](#competitive-analysis)
2. [Vision & Core Thesis](#vision--core-thesis)
3. [Spec Format Reference](#spec-format-reference)
4. [CLI Design & Commands](#cli-design--commands)
5. [Agent Orchestration](#agent-orchestration)
6. [Bidirectional Sync Deep Dive](#bidirectional-sync-deep-dive)
7. [Open Questions & TODO](#open-questions--todo)
8. [Session Summary & Next Steps](#session-summary--next-steps)

---

# Competitive Analysis

## Current Spec Frameworks (and their gaps)

| Framework | Approach | Key Limitation |
|-----------|----------|----------------|
| **Spec Kit** (GitHub) | Constitution-based, 6-phase pipeline | Greenfield-first; heavy "context tax" on large codebases; no bidirectional sync |
| **OpenSpec** | Delta markers (ADDED/MODIFIED/REMOVED) | Brownfield support but manual sync only (`/opsx:sync`); no agent exploration; 50KB context limit |
| **Kiro** (AWS) | EARS requirements, IDE-locked | Locked to specific models; limited brownfield support |
| **Intent** | Living specs, bidirectional sync | Closed source ($60-200/mo); limited flexibility |

---

## Framework Comparison Matrix

| Dimension | OpenSpec | Spec Kit | **Blueprint Mode** |
|---|---|---|---|
| **GitHub Stars** | ~28,000 | ~75,000 | N/A (new) |
| **License** | MIT | MIT | TBD |
| **Context Management** | 50KB hard limit | No built-in limit (context tax) | **Hierarchical exploration** |
| **Brownfield** | Delta markers | Assume greenfield | **Agent-driven discovery** |
| **Spec Types** | Single format | Single format | **Multi-type** |
| **Sync** | Manual (`/opsx:sync`) | None | **Bidirectional with conflict detection** |
| **Exploration** | Static analysis | Static analysis | **Agent code exploration** |
| **Tool Lock-in** | 30+ tools | GitHub ecosystem | **Agent-agnostic** |
| **Format** | Markdown + Git | Markdown + Python | **YAML/JSON with git-native** |

---

## Key Insights from Research

**Spec Kit's power comes with a cost:** Every installed slash command, every template, every constitution rule adds tokens to the agent's context window. Teams report significant "context tax" — the cumulative token burden grows with each extension.

**OpenSpec's 50KB limit is deliberate but blunt:** Prevents prompt bloat but caps depth. You can't encode rich architecture in 50KB.

**Intent is the only one with bidirectional sync:** But closed source, expensive, and limited flexibility.

**The gap you're targeting:**
- Brownfield-first with agent-driven exploration (not delta markers)
- Multi-type specs that capture different aspects (not just function behavior)
- True bidirectional sync with conflict resolution
- Agent-driven, not script-driven

---

# Vision & Core Thesis

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

# Spec Format Reference

> Draft schema definitions for all blueprint spec types.
> Status: BRAINSTORM — these will evolve as we prototype.

---

## Common Fields (All Specs)

```yaml
blueprint_version: "0.1.0"
spec_id: "auth.login"                    # Unique identifier
spec_type: "FunctionSpec"                # One of defined types
status: "draft"                          # draft | canonical | deprecated
created_at: "2026-04-04T10:00:00Z"
updated_at: "2026-04-04T10:00:00Z"
generated_by: "agent:v1.2.0"             # What generated this
reviewed_by: null                        # Human reviewer
source_refs:                             # Links to actual code
  - file: "src/auth/login.ts"
    lines: "45-120"
    commit: "abc123"
```

---

## FunctionSpec

Captures: data in → process → out, edge cases, error handling

```yaml
spec_id: "auth.login"
spec_type: "FunctionSpec"

# Function shape
function:
  name: "login"
  exported: true
  async: true
  
  # Data In
  inputs:
    - name: "credentials"
      type: "object"
      required: true
      schema:
        email:
          type: "string"
          format: "email"
          constraints:
            max_length: 255
        password:
          type: "string"
          constraints:
            min_length: 8
            max_length: 128
      
    - name: "options"
      type: "object"
      required: false
      schema:
        remember_me:
          type: "boolean"
          default: false
        
  # Data Out
  outputs:
    success:
      type: "object"
      schema:
        token:
          type: "string"
          description: "JWT access token"
        user:
          ref: "UserSpec"              # Cross-spec reference
          
    errors:
      - name: "InvalidCredentials"
        status: 401
        message: "Email or password is incorrect"
        
      - name: "AccountLocked"
        status: 403
        message: "Account temporarily locked"
        retry_after: "number"           # Seconds until retry allowed
        
      - name: "ValidationError"
        status: 400
        fields:
          email: "Invalid email format"
          password: "Password too short"

  # Business Logic Process
  process:
    description: "Validates credentials, checks account status, generates JWT"
    steps:
      - order: 1
        action: "validate_input"
        description: "Schema validation on credentials"
        
      - order: 2
        action: "fetch_user"
        description: "Query database by email"
        
      - order: 3
        action: "verify_password"
        description: "Bcrypt compare with stored hash"
        
      - order: 4
        action: "check_account_status"
        description: "Verify not locked/banned"
        
      - order: 5
        action: "generate_token"
        description: "Create JWT with user claims"
        
      - order: 6
        action: "update_last_login"
        description: "Async: update timestamp (non-blocking)"

  # Edge Cases (first-class citizens)
  edge_cases:
    - id: "concurrent_login"
      description: "User logs in from multiple devices simultaneously"
      behavior: "Each login generates independent valid token"
      
    - id: "expired_token_refresh"
      description: "Token expired during active session"
      behavior: "Return 401, client should use refresh token"
      
    - id: "brute_force_protection"
      description: "5 failed attempts in 10 minutes"
      behavior: "Lock account for 30 minutes, email notification sent"
      
    - id: "unicode_email"
      description: "Email with international characters"
      behavior: "Normalize to Punycode before database query"

  # Side Effects
  side_effects:
    - type: "database_write"
      table: "user_sessions"
      description: "Creates session record"
      
    - type: "event_emit"
      channel: "auth.login"
      payload: "{ user_id, timestamp, ip_address }"
      
    - type: "external_call"
      service: "audit-log"
      async: true

  # Performance Characteristics
  performance:
    expected_latency: "< 200ms"
    cacheable: false
    database_queries: 2
```

---

## ComponentSpec

Captures: UI layout, props, state, lifecycle

```yaml
spec_id: "components.UserProfile"
spec_type: "ComponentSpec"

component:
  name: "UserProfile"
  framework: "react"                     # react | vue | svelte | etc
  
  # Layout Specification
  layout:
    description: "Card displaying user info with edit capability"
    
    structure:
      type: "card"
      children:
        - type: "header"
          children:
            - type: "avatar"
              props:
                src: "{user.avatar_url}"
                size: "lg"
                
            - type: "heading"
              level: 2
              content: "{user.display_name}"
              
        - type: "body"
          children:
            - type: "info_row"
              label: "Email"
              value: "{user.email}"
              
            - type: "info_row"
              label: "Member Since"
              value: "{format_date(user.created_at)}"
              
        - type: "footer"
          children:
            - type: "button"
              variant: "primary"
              action: "onEdit"
              label: "Edit Profile"
              
            - type: "button"
              variant: "danger"
              action: "onDelete"
              label: "Delete Account"

    responsive:
      mobile:
        layout: "stack"
        avatar_size: "md"
      tablet:
        layout: "horizontal"
        avatar_size: "lg"

  # Props Interface
  props:
    user:
      type: "object"
      required: true
      ref: "types.User"                   # Reference to type spec
      
    onEdit:
      type: "function"
      required: false
      signature: "(user: User) => void"
      
    onDelete:
      type: "function"  
      required: false
      signature: "(user: User) => Promise<void>"
      
    editable:
      type: "boolean"
      default: true
      description: "Show/hide edit controls"

  # State Management
  state:
    local:
      isEditing:
        type: "boolean"
        default: false
        
      formData:
        type: "object"
        schema:
          display_name: "string"
          email: "string"
          
    derived:
      canSave:
        type: "boolean"
        compute: "formData.dirty && formData.valid"
        
  # Lifecycle
  lifecycle:
    mount:
      - action: "prefetch_user_data"
        condition: "props.user.is_stub"
        
    update:
      - action: "validate_form"
        when: "state.formData changes"
        
    unmount:
      - action: "cleanup_pending_requests"

  # Event Handling
  events:
    - name: "edit_clicked"
      trigger: "Edit Profile button"
      handler: "toggle isEditing state"
      
    - name: "delete_confirmed"
      trigger: "Delete Account + confirmation modal"
      handler: "call props.onDelete, show loading, handle error/success"
```

---

## DataFlowSpec

Captures: data requirements, transformation pipelines

```yaml
spec_id: "dataflows.user-registration"
spec_type: "DataFlowSpec"

dataflow:
  name: "User Registration"
  
  sources:
    - name: "registration_form"
      type: "user_input"
      schema:
        email: "string"
        password: "string"
        password_confirm: "string"
        
  # Validation Pipeline
  validation:
    - stage: "client_side"
      rules:
        - field: "email"
          rule: "format:email"
          error: "Please enter a valid email"
          
        - field: "password"
          rule: "min_length:8"
          error: "Password must be at least 8 characters"
          
        - field: "password_confirm"
          rule: "match:password"
          error: "Passwords do not match"
          
    - stage: "server_side"
      rules:
        - field: "email"
          rule: "unique:users.email"
          error: "Email already registered"
          
        - field: "password"
          rule: "entropy:>50"
          error: "Password is too weak"

  # Transformation Pipeline
  transforms:
    - order: 1
      name: "normalize_email"
      input: "registration_form.email"
      output: "normalized_email"
      operation: "lowercase, trim, punycode_encode"
      
    - order: 2
      name: "hash_password"
      input: "registration_form.password"
      output: "password_hash"
      operation: "bcrypt_hash:12"
      
    - order: 3
      name: "create_user_record"
      inputs:
        - "normalized_email"
        - "password_hash"
      output: "user_record"
      operation: "database_insert:users"

  # Data Destinations
  destinations:
    - type: "database"
      table: "users"
      fields:
        - source: "user_record.id"
          target: "id"
          
        - source: "normalized_email"
          target: "email"
          
        - source: "password_hash"
          target: "password_hash"
          
        - source: "now()"
          target: "created_at"
          
    - type: "event_stream"
      topic: "user.registered"
      payload:
        user_id: "user_record.id"
        email: "normalized_email"
        timestamp: "now()"

  # Error Handling by Stage
  error_handling:
    validation_failure:
      action: "return_400_with_errors"
      rollback: none
      
    database_error:
      action: "return_500"
      rollback: none
      notify: "oncall-alert"
```

---

## IntegrationSpec

Captures: external APIs, connectors, contracts

```yaml
spec_id: "integrations.stripe-webhook"
spec_type: "IntegrationSpec"

integration:
  name: "Stripe Webhook Handler"
  external_service: "stripe"
  version: "2024-01-01"
  
  # Connection Details
  connection:
    type: "webhook"
    endpoint: "/webhooks/stripe"
    method: "POST"
    auth:
      type: "signature_verification"
      secret_ref: "STRIPE_WEBHOOK_SECRET"

  # Event Types Handled
  events:
    - name: "payment_intent.succeeded"
      description: "Payment completed successfully"
      
      payload_schema:
        id: "string"
        amount: "number"
        currency: "string"
        customer_id: "string"
        
      internal_action:
        function_ref: "payments.process_success"
        mapping:
          - from: "payload.id"
            to: "stripe_payment_id"
          - from: "payload.amount"
            to: "amount_cents"
            transform: "identity"
            
    - name: "payment_intent.payment_failed"
      description: "Payment failed"
      
      payload_schema:
        id: "string"
        last_payment_error:
          message: "string"
          code: "string"
          
      internal_action:
        function_ref: "payments.process_failure"

  # Retry & Idempotency
  reliability:
    idempotency_key: "payload.id"
    retry_policy:
      max_attempts: 3
      backoff: "exponential"
      
  # Error Scenarios
  error_cases:
    - scenario: "invalid_signature"
      response: "400 Invalid signature"
      log_level: "warn"
      
    - scenario: "unhandled_event_type"
      response: "200 OK"                   # Acknowledge but ignore
      log_level: "info"
      
    - scenario: "processing_failure"
      response: "500 Retry"
      retry: true
      alert: "payments-oncall"
```

---

## ReferenceSpec

Captures: cross-spec dependencies and call graphs

```yaml
spec_id: "meta.index"
spec_type: "ReferenceSpec"

references:
  # Call graph: who calls whom
  call_graph:
    - caller: "auth.login"
      callee: "db.users.find_by_email"
      type: "database_query"
      
    - caller: "auth.login"
      callee: "integrations.email.send"
      type: "async_event"
      condition: "account_locked"
      
    - caller: "components.UserProfile"
      callee: "auth.get_current_user"
      type: "data_fetch"

  # Dependency graph: what depends on what
  dependencies:
    - spec: "auth.login"
      depends_on:
        - "types.User"
        - "integrations.jwt"
        - "db.users"
        
    - spec: "payments.process"
      depends_on:
        - "auth.login"                      # Requires auth first
        - "integrations.stripe"

  # Module/Domain Groupings
  domains:
    auth:
      specs:
        - "auth.login"
        - "auth.register"
        - "auth.forgot_password"
        - "auth.reset_password"
        
    payments:
      specs:
        - "payments.process"
        - "payments.refund"
        - "integrations.stripe-webhook"
        - "integrations.paypal"

  # Impact Analysis
  impact:
    - spec: "types.User"
      affects:
        - "auth.login"
        - "auth.register"
        - "components.UserProfile"
        - "dataflows.user-registration"
      risk_level: "high"
```

---

## Cross-Spec Reference Syntax

```yaml
# Reference another spec
ref: "spec_id"                           # Simple reference
ref: "spec_id#field"                     # Reference specific field
ref: "domains.auth"                      # Reference domain group

# With version pinning (for stability)
ref: "auth.login@v1.2.0"

# Wildcard references (in ReferenceSpec)
ref: "auth.*"                            # All auth specs
```

---

## Status Enum

```yaml
status: "draft"          # Agent-generated, not yet reviewed
status: "canonical"     # Human-approved, source of truth
status: "deprecated"     # No longer valid, will be removed
status: "conflict"       # Code drift detected, needs resolution
```

---

# CLI Design & Commands

> Command structure, workflows, and configuration.
> Status: BRAINSTORM — subject to change as we prototype.

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
  blueprint apply --preview         # Preview only
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
  ┌──────────────────┬────────────┬──────────┬─────────────┐
  │ Spec             │ Status     │ Last Sync│ Drift Level │
  ├──────────────────┼────────────┼──────────┼─────────────┤
  │ auth.login       │ canonical  │ 2h ago   │ none        │
  │ auth.register    │ draft      │ never    │ N/A         │
  │ payments.process │ canonical  │ 1d ago   │ detected ⚠️ │
  │ components.Nav   │ deprecated │ 1w ago   │ N/A         │
  └──────────────────┴────────────┴──────────┴─────────────┘
  
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
  ✓ Schema validity (YAML structure)
  ✓ Reference integrity (all refs point to existing specs)
  ✓ Completeness (required fields present)
  ✓ Consistency (no contradictions)
  ✓ Coverage (all code has corresponding specs)
  
Output:
  auth.login: ✓ valid
  auth.register: ⚠️ missing edge cases
  payments.process: ✗ invalid reference to "stripe.v1"
```

---

### `blueprint propose`

Create a new change proposal.

```bash
blueprint propose <name> [options]

Options:
  --type=<type>             Feature, fix, refactor, docs
  --description=<text>      Short description
  --from-issue=<n>        Link to GitHub/JIRA issue
  --parent=<change>       Dependent on another change
  
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

# Project metadata
project:
  name: "my-app"
  type: "web-app"              # web-app | api | library | mobile
  framework: "nextjs"
  language: "typescript"

# Sync configuration
sync:
  mode: "auto"                 # auto | manual | ci-only
  on_commit: true              # Run sync on git commit
  conflict_resolution: "prompt" # prompt | prefer-code | prefer-spec
  
# Agent configuration
agents:
  exploration:
    model: "claude-sonnet-4"
    temperature: 0.2
    max_files_per_batch: 50
    
  implementation:
    model: "claude-sonnet-4"
    temperature: 0.1
    test_after: true

# Spec generation rules
generation:
  include_private_functions: false
  include_tests: true
  edge_case_detection: "aggressive"  # none | standard | aggressive
  ui_layout_capture: true

# Validation rules
validation:
  require_references: true
  max_drift_before_warning: "1d"
  max_drift_before_blocking: "1w"

# Integrations
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

---

# Agent Orchestration

> How agents work within blueprint-mode — exploration, generation, implementation.
> Status: BRAINSTORM — this is the core innovation area.

---

## Core Insight

Traditional spec tools rely on **static analysis** (AST parsing, regex). Blueprint Mode uses **agents as first-class explorers**.

The agent doesn't just parse code — it **understands intent, identifies patterns, infers edge cases**.

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
   ↓
2. Identify entry points (exports, public APIs)
   ↓
3. Deep dive into each function/component:
   - Read implementation
   - Identify inputs/outputs
   - Trace data flow
   - Find error handling
   - Look for edge cases in tests/comments
   ↓
4. Cross-reference with existing specs
   ↓
5. Generate structured spec
   ↓
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
       Found related spec: auth.register — should reference this

Agent: Generating FunctionSpec for auth.login
       Confidence: 0.92 (high — well-documented, good test coverage)
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
   ↓
2. Study existing code patterns in target area
   - Naming conventions
   - Error handling style
   - Import patterns
   ↓
3. Generate implementation matching spec
   - Function signatures
   - Business logic per spec.process
   - Error handling per spec.edge_cases
   ↓
4. Verify against spec (self-check)
   ↓
5. Emit code + confidence score
```

**Key Constraint:**
Implementation agent must respect **existing code style**. It doesn't invent new patterns — it extends what's there.

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
   ↓
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
   ↓
2. Identify relevant code areas
   ↓
3. Read and analyze
   ↓
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

## Human-Agent Collaboration

### Review Interface

When human runs `blueprint review`:

```
┌────────────────────────────────────────────────────────┐
│ Review: auth.login (FunctionSpec)                     │
│ Confidence: 92% | Agent: explore-v1.2.0               │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Generated from: src/auth/login.ts:45-120              │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ FUNCTION SIGNATURE                                 │ │
│ │ async login(credentials, options?)                │ │
│ │   → { token, user } | AuthError                   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ Edge Cases Detected:                                  │
│   ✓ concurrent_logins                                  │
│   ✓ brute_force_protection                            │
│   ✓ unicode_email                                     │
│   ? expired_token (detected in comments, unverified)  │
│                                                        │
│ [a]pprove  [r]eject  [e]dit  [s]kip  [v]iew_source   │
└────────────────────────────────────────────────────────┘
```

### Feedback Loop

Human corrections improve future agent behavior:

```
Human rejects spec:
  → Flag reason (missing edge case, wrong type, etc.)
  → Agent re-explores with new context
  → Store correction in meta/feedback.yaml
  → Use for future explorations of similar patterns
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
       │
       ├── Exploration Agent → Maps affected code
       │
       ├── Spec Agent → Generates/updates specs
       │
       ├── Implementation Agent → Writes code
       │
       └── Validation Agent → Runs tests, checks alignment
```

---

# Bidirectional Sync Deep Dive

> How code and specs stay aligned — the core technical challenge.
> Status: BRAINSTORM — hardest problem to solve.

---

## The Fundamental Problem

Specs are **intent**, code is **implementation**.

When they diverge, who is right?

```
Scenario A: Spec is source of truth
  Dev edits code directly → Code diverges from spec
  → Sync should update spec to match new code

Scenario B: Spec drives implementation  
  Dev edits spec to change behavior
  → Sync should update code to match new spec

Scenario C: Both changed (conflict)
  Dev edits both independently
  → Human must resolve
```

---

## Sync Triggers

### Automatic Triggers

| Event | Action |
|-------|--------|
| Git commit | Run `blueprint sync --detect-only` |
| Pre-push | Validate no un-synced drift |
| CI/CD | Block if specs out of sync |
| Scheduled | Daily full sync check |

### Manual Triggers

```bash
blueprint sync              # Full sync
blueprint sync --detect     # Just detect, don't apply
blueprint sync --to-spec    # Only code → spec
blueprint sync --to-code    # Only spec → code
```

---

## Sync Algorithm

### Phase 1: Detect Changes

```python
def detect_changes():
    changes = []
    
    for spec in all_canonical_specs:
        source_ref = spec.source_refs[0]  # Primary source
        current_hash = hash_file(source_ref.file)
        stored_hash = spec.meta.source_hash
        
        if current_hash != stored_hash:
            # Something changed
            diff = git_diff(stored_hash, current_hash)
            
            changes.append({
                'spec_id': spec.spec_id,
                'type': 'code_changed',
                'diff': diff
            })
    
    return changes
```

### Phase 2: Analyze Intent

For code changes, determine if they are:

```yaml
change_types:
  refactor:
    description: "Restructuring, no behavior change"
    examples: ["rename variable", "extract function"]
    action: "update_spec_structure_only"
    
  implementation_detail:
    description: "Different approach, same contract"
    examples: ["change loop to map", "add caching"]
    action: "update_spec_implementation_notes"
    
  bugfix:
    description: "Fixed incorrect behavior"
    examples: ["fix off-by-one error"]
    action: "update_spec_edge_cases"
    
  feature:
    description: "New behavior added"
    examples: ["add parameter", "new error case"]
    action: "flag_for_spec_review"
    
  breaking:
    description: "Contract changed"
    examples: ["remove parameter", "change return type"]
    action: "flag_as_conflict"
```

**Agent-Powered Analysis:**

The sync agent doesn't just diff text — it **understands semantic changes**:

```
Input: diff of auth/login.ts

Agent analysis:
  - Function signature unchanged ✓
  - Added parameter `options.rememberMe` (optional) → feature
  - Error handling unchanged ✓
  - Added side effect: sets cookie → implementation_detail

Recommendation:
  - Update FunctionSpec.inputs to include new parameter
  - Update FunctionSpec.side_effects to mention cookie
  - Mark as non-breaking change
```

### Phase 3: Resolve

```
For each change:
  IF code_changed AND NOT spec_changed:
     → Analyze with agent
     → IF analysis.confident:
          Apply auto-update to spec
        ELSE:
          Flag for human review
          
  IF spec_changed AND NOT code_changed:
     → Run implementation agent
     → Generate code changes
     → IF tests pass:
          Commit code update
        ELSE:
          Flag for human review
          
  IF code_changed AND spec_changed:
     → Compare change timestamps
     → Analyze both changes
     → IF compatible:
          Merge
        ELSE:
          Flag as CONFLICT
```

---

## Conflict Resolution

### Conflict Types

| Type | Description | Resolution |
|------|-------------|------------|
| Signature | Code changed function signature | Human must choose correct signature |
| Logic | Different implementation approach | Human reviews both, picks or merges |
| Edge Case | Code handles cases not in spec | Add to spec or remove from code |
| Removal | Code deleted, spec exists | Archive spec or restore code |
| Orphan | Spec exists, code doesn't exist | Flag for cleanup |

### Conflict UI

```
┌─────────────────────────────────────────────────────────────┐
│ CONFLICT: auth.login                                        │
│                                                             │
│ Both code and spec have changed since last sync.            │
│                                                             │
│ CODE CHANGES (by dev@example.com 2h ago):                   │
│   + Added parameter: rememberMe: boolean                     │
│   + New side effect: sets persistent cookie                │
│                                                             │
│ SPEC CHANGES (by agent, 1h ago):                            │
│   + Added edge case: concurrent_session_limit              │
│   - Removed: rememberMe parameter (not in code)            │
│                                                             │
│ Analysis: These changes are COMPATIBLE but divergent.       │
│                                                             │
│ Options:                                                    │
│   [1] Merge both: Add rememberMe AND concurrent_session    │
│   [2] Prefer code: Discard concurrent_session edge case    │
│   [3] Prefer spec: Remove rememberMe from code             │
│   [4] Edit manually                                        │
│   [s] Skip for now                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Storage of Sync State

```yaml
# /blueprints/meta/sync-state.yaml

sync_version: "0.1.0"
last_full_sync: "2026-04-04T12:00:00Z"

spec_states:
  auth.login:
    status: "synced"
    last_sync: "2026-04-04T10:00:00Z"
    code_hash: "abc123..."
    spec_hash: "def456..."
    
  payments.process:
    status: "drift_detected"
    last_sync: "2026-04-03T15:00:00Z"
    code_hash: "old789..."
    spec_hash: "same456..."
    drift_detected_at: "2026-04-04T11:30:00Z"
    drift_type: "implementation_detail"
    pending_action: "auto_update_pending"
    
  auth.register:
    status: "conflict"
    last_sync: "2026-04-02T09:00:00Z"
    code_hash: "conflict1..."
    spec_hash: "conflict2..."
    conflict_detected_at: "2026-04-04T08:00:00Z"
    conflict_type: "signature_mismatch"
    requires_human: true
```

---

## Sync Confidence Scoring

Agents assign confidence to sync recommendations:

```yaml
confidence_factors:
  - signature_match: 1.0            # Signature identical
  - signature_compatible: 0.8     # Added optional param
  - signature_breaking: 0.0         # Changed required param
  
  - test_coverage: 0.0-1.0         # Based on test pass rate
  - documentation_match: 0.0-1.0     # Comments match behavior
  - pattern_consistency: 0.0-1.0    # Matches project patterns

auto_apply_threshold: 0.85         # Auto-apply if confidence > this
review_threshold: 0.50             # Flag for review if < this
block_threshold: 0.20              # Block if < this (major issue)
```

---

## Git Integration

### Pre-Commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "Running blueprint sync check..."

# Detect drift
DRIFT=$(blueprint sync --detect --format=json)

if echo "$DRIFT" | grep -q "conflict"; then
    echo "ERROR: Blueprint conflicts detected. Run 'blueprint sync --interactive'"
    exit 1
fi

if echo "$DRIFT" | grep -q "drift_detected"; then
    echo "WARNING: Spec drift detected. Run 'blueprint sync' to update."
    # Allow commit but warn
fi

exit 0
```

### Sync Commits

```
[blueprint] Sync: auth.login

- Code added optional parameter: rememberMe
- Updated FunctionSpec.inputs
- Confidence: 0.92
- Agent: sync-v1.2.0
```

---

## Performance Considerations

### Incremental Sync

Don't re-analyze everything:

```python
def incremental_sync():
    changed_files = get_git_changed_files()
    affected_specs = map_files_to_specs(changed_files)
    
    for spec in affected_specs:
        analyze_and_sync(spec)
```

### Caching

```yaml
# Cache expensive analyses
cache:
  ast_parsed: 24h
  agent_exploration: 1h
  dependency_graph: 5m
```

---

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

---

## Open Questions (from individual files)

### From SPEC_FORMAT.md
1. Should we support multiple representations (YAML for humans, JSON for agents)?
2. How do we handle spec versioning when code evolves?
3. Should references be validated (fail if target doesn't exist)?
4. How granular should FunctionSpec be? Per function, per module, per class?
5. How do we capture visual UI specs (CSS, spacing, colors)?

### From CLI_DESIGN.md
1. Should we have a `blueprint watch` daemon for continuous sync?
2. How do we handle large monorepos (1000+ specs)?
3. Should agents be pluggable (Claude, GPT-4, local models)?
4. What's the fallback if agent exploration fails/conflicts?

### From AGENT_ORCHESTRATION.md
1. Should agents be model-specific or pluggable (Claude, GPT-4, local)?
2. How do we handle agent hallucinations in exploration?
3. What's the cost model for agent-heavy operations?
4. Should agents learn from project-specific patterns over time?
5. How do we parallelize exploration across large codebases?
6. What's the fallback if agent API is unavailable?

### From BIDIRECTIONAL_SYNC.md
1. How do we handle long-running sync operations (hours for large codebases)?
2. Should sync be blocking (CI fails) or advisory (warnings)?
3. How do we recover from "sync went wrong" scenarios?
4. What's the story for teams without AI agents (fallback mode)?
5. How do we sync across branches (feature branches vs main)?

---

*End of Blueprint Mode Documentation — preserved for future reference and iteration.*

---

# Session Summary & Next Steps

## 📁 What We Created

| File | Purpose |
|------|---------|
| `VISION.md` | Core thesis, principles, differentiation from OpenSpec/SpecKit |
| `SPEC_FORMAT.md` | Draft schemas for FunctionSpec, ComponentSpec, DataFlowSpec, IntegrationSpec, ReferenceSpec |
| `CLI_DESIGN.md` | Command structure, workflows, configuration |
| `AGENT_ORCHESTRATION.md` | How agents explore, generate, implement, and sync |
| `BIDIRECTIONAL_SYNC.md` | The hard problem: keeping code and specs aligned |
| `TODO.md` | Open questions, research areas, prototype priorities |

---

## 🎯 Key Distinctions We've Nailed Down

**Traditional Tools → Blueprint Mode**

| Aspect | OpenSpec/SpecKit | Blueprint Mode |
|--------|------------------|----------------|
| Exploration | Static analysis (AST) | **Agent-driven code exploration** |
| Spec types | Single format | **Multi-type (function, component, dataflow, etc.)** |
| Sync | Manual or none | **Bidirectional with agent-powered conflict resolution** |
| Brownfield | Delta markers | **Full agent exploration generates initial specs** |
| UI/Layout | Not captured | **ComponentSpec with layout definitions** |

---

## 🔥 The Hard Problems We've Identified

1. **Bidirectional sync semantics** — When code and spec diverge, who wins? How do we detect *intent* vs *accident*?

2. **Agent context management** — Large codebases exceed context windows. How do we orchestrate hierarchical exploration?

3. **Granularity tradeoffs** — Per-function specs (precise but verbose) vs per-module specs (concise but vague)?

4. **UI specification** — How do we capture visual design in a format agents can implement?

5. **Review at scale** — If agents generate 500 specs, how do humans review without burnout?

---

## 💡 Next Brainstorm Directions

Want to go deeper on any of these?

**A. Spec Schema Refinement**
- Concrete examples from your actual codebase
- Refine FunctionSpec with real edge cases
- Design the UI/layout specification format

**B. Agent Prompt Engineering**
- What prompts make exploration effective?
- How do we guide agents to find edge cases?
- Sync agent: how to analyze semantic changes?

**C. Prototype Planning**
- Pick a small brownfield module to test on
- Define MVP scope (which spec types first?)
- Plan the first CLI commands to implement

**D. Technical Architecture**
- Language-specific parsers vs universal
- Storage format (YAML + JSON export?)
- Git hook integration design

---

**What area should we attack next? Or do you want to challenge any of the assumptions in the current docs?**
