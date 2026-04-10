# Spec Format

> What a spec is, what kinds exist, and the concrete YAML schemas.
> Status: BRAINSTORM -- these will evolve as we prototype.

---

## The Core Idea

A "spec" should not mean one document shape. It should mean:

> **a structured, reviewable statement of intent, behavior, or interface**

That means a spec can be:

- a behavior lookup
- a function definition
- a logic map
- a UI element
- an API endpoint
- a decision record
- a rule table
- a flow
- a constraint set

So the right foundation is not **one fixed form** -- it's a **spec framework** with:
1. a small universal backbone
2. optional blocks
3. support for nesting / composition
4. multiple spec "kinds"

---

## Foundation: "Core + Blocks + Kinds"

### 1. Core Envelope

Every spec has a minimal universal header for identity and traceability:

- **Title**
- **Type**
- **Status**
- **Owner**
- **Version**
- **Intent**
- **Audience**
- **Scope**
- **Links / references**

### 2. Blocks Library

Instead of forcing a rigid structure, define reusable blocks. A spec includes only the blocks it needs:

- Context
- Behavior
- Inputs
- Outputs
- Rules
- States
- Transitions
- Examples
- Edge cases
- Failure modes
- Acceptance criteria
- Dependencies
- Constraints
- Alternatives
- Open questions
- Notes

### 3. Spec Kinds

Each kind has a preferred block pattern:

| Kind | Best for | Typical blocks |
|------|----------|----------------|
| Behavior lookup | "What happens when X?" | trigger, conditions, outcome, precedence, examples |
| Function definition | code/API logic | signature, inputs, outputs, invariants, errors |
| Logic map | decision trees, flows | nodes, branches, rules, transitions |
| UI element | component behavior | states, interactions, accessibility, visual rules |
| API endpoint | integration contracts | method, path, auth, request, response, errors |
| Rule spec | policy / business logic | conditions, exceptions, enforcement, examples |
| Decision spec | architecture / product choice | context, options, decision, consequences |

---

## Spec Shell Template

```md
# Spec Title

**Type:** behavior | function | logic | ui | api | rule | decision | other
**Status:** draft | active | deprecated | superseded
**Owner:**
**Version:**
**Audience:**

## Intent
What this spec is trying to define.

## Context
Why this exists. When it matters.

## Spec
The actual definition. Use the blocks that fit:
- behavior
- inputs
- outputs
- states
- rules
- examples
- constraints
- edge cases

## Examples
Concrete examples and counterexamples.

## Notes
Anything important but not normative.

## Links
Related specs, docs, tickets, diagrams, APIs, or decisions.
```

That is **not rigid** because:
- no section is mandatory except the core identity pieces
- the "Spec" section can adapt to the kind
- child specs can be linked instead of duplicated

---

## Design Principle: "Atomic First, Composable Second"

A spec should usually be:
- **atomic** enough to understand on its own
- **composable** enough to be part of a bigger system

That means:
- don't cram 12 unrelated behaviors into one doc
- do allow a parent spec to group related atomic specs

---

## Three Layers

1. **Metadata** -- Identity and traceability
2. **Content blocks** -- The actual knowledge
3. **Relationships** -- How this spec connects to other specs

---

## Strongest Foundation Sentence

> **A spec is a typed, traceable, composable artifact for defining behavior, intent, or interface at the level of detail the thing actually needs.**

---

## Concrete YAML Schemas

### Common Fields (All Specs)

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

### Status Values

```yaml
status: "draft"          # Agent-generated, not yet reviewed
status: "canonical"      # Human-approved, source of truth
status: "deprecated"     # No longer valid, will be removed
status: "conflict"       # Code drift detected, needs resolution
```

---

### FunctionSpec

Captures: data in -> process -> out, edge cases, error handling

```yaml
spec_id: "auth.login"
spec_type: "FunctionSpec"

function:
  name: "login"
  exported: true
  async: true

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

  outputs:
    success:
      type: "object"
      schema:
        token:
          type: "string"
          description: "JWT access token"
        user:
          ref: "UserSpec"

    errors:
      - name: "InvalidCredentials"
        status: 401
        message: "Email or password is incorrect"

      - name: "AccountLocked"
        status: 403
        message: "Account temporarily locked"
        retry_after: "number"

      - name: "ValidationError"
        status: 400
        fields:
          email: "Invalid email format"
          password: "Password too short"

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

  performance:
    expected_latency: "< 200ms"
    cacheable: false
    database_queries: 2
```

---

### ComponentSpec

Captures: UI layout, props, state, lifecycle

```yaml
spec_id: "components.UserProfile"
spec_type: "ComponentSpec"

component:
  name: "UserProfile"
  framework: "react"

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

  props:
    user:
      type: "object"
      required: true
      ref: "types.User"
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

  lifecycle:
    mount:
      - action: "prefetch_user_data"
        condition: "props.user.is_stub"
    update:
      - action: "validate_form"
        when: "state.formData changes"
    unmount:
      - action: "cleanup_pending_requests"

  events:
    - name: "edit_clicked"
      trigger: "Edit Profile button"
      handler: "toggle isEditing state"
    - name: "delete_confirmed"
      trigger: "Delete Account + confirmation modal"
      handler: "call props.onDelete, show loading, handle error/success"
```

---

### DataFlowSpec

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

### IntegrationSpec

Captures: external APIs, connectors, contracts

```yaml
spec_id: "integrations.stripe-webhook"
spec_type: "IntegrationSpec"

integration:
  name: "Stripe Webhook Handler"
  external_service: "stripe"
  version: "2024-01-01"

  connection:
    type: "webhook"
    endpoint: "/webhooks/stripe"
    method: "POST"
    auth:
      type: "signature_verification"
      secret_ref: "STRIPE_WEBHOOK_SECRET"

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

  reliability:
    idempotency_key: "payload.id"
    retry_policy:
      max_attempts: 3
      backoff: "exponential"

  error_cases:
    - scenario: "invalid_signature"
      response: "400 Invalid signature"
      log_level: "warn"
    - scenario: "unhandled_event_type"
      response: "200 OK"
      log_level: "info"
    - scenario: "processing_failure"
      response: "500 Retry"
      retry: true
      alert: "payments-oncall"
```

---

### ReferenceSpec

Captures: cross-spec dependencies and call graphs

```yaml
spec_id: "meta.index"
spec_type: "ReferenceSpec"

references:
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

  dependencies:
    - spec: "auth.login"
      depends_on:
        - "types.User"
        - "integrations.jwt"
        - "db.users"
    - spec: "payments.process"
      depends_on:
        - "auth.login"
        - "integrations.stripe"

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

### Cross-Spec Reference Syntax

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
