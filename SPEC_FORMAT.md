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

## Open Questions

1. Should we support multiple representations (YAML for humans, JSON for agents)?
2. How do we handle spec versioning when code evolves?
3. Should references be validated (fail if target doesn't exist)?
4. How granular should FunctionSpec be? Per function, per module, per class?
5. How do we capture visual UI specs (CSS, spacing, colors)?
