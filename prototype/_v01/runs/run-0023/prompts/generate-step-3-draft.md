You are executing a single step in a spec generation pipeline.

## Step: draft

## CRITICAL: Codebase Location
The codebase is at: /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2

When reading source files, ALWAYS use the full path:
  /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2/src/features/auth/api/auth-service.js  ← CORRECT

NEVER read files relative to the prototype workspace:
  src/features/auth/api/auth-service.js  ← WRONG (resolves to prototype workspace)

## Instructions
Draft specs for these behaviors:
- auth_flow
- middleware_auth_guard
- stateful_ui_reports
- stateful_ui_pdf_generation
- stateful_ui_company_management
- cross_tab_session_sync
- routing_contracts
- report_lifecycle_management
- api_client_with_token_refresh
- stale_response_guards
- browser_storage_utilities


Predicate inventory:
- behavior_id: auth_flow
  predicates:
    - isChecking === true
    - isAuthenticated === true && isChecking === false
    - isAuthenticated === false && isChecking === false
  render_mode: visible-enabled
- behavior_id: middleware_auth_guard
  predicates:
    - shouldResolveSession(pathname) === true
    - hasRefreshToken === true && !session
    - refreshResult?.session !== null
    - decision.action === 'redirect'
    - rollbackRoute.shouldRedirect === true
  render_mode: hidden
- behavior_id: stateful_ui_reports
  predicates:
    - isOpen === true (delete dialog)
    - isDeleting === true
    - isOpen === true (email modal)
    - isSending === true
    - isOpen === true (create report modal)
    - isCreating === true
  render_mode: visible-enabled
- behavior_id: stateful_ui_pdf_generation
  predicates:
    - isGenerating === false → return null
    - dlStatus === 'waiting'
    - dlStatus === 'finished' && showAnimation === true
    - dlStatus === 'finished' && showAnimation === false
    - dlStatus === 'failed'
    - isWaiting === false → show close button
  render_mode: visible-enabled
- behavior_id: stateful_ui_company_management
  predicates:
    - isAddEditOpen === true
    - editBusinessId !== null (edit mode)
    - editBusinessId === null (add mode)
    - isDeleteOpen === true
    - isCreateReportOpen === true
  render_mode: visible-enabled
- behavior_id: cross_tab_session_sync
  predicates:
    - isBroadcastSupported() === true
    - isBroadcastSupported() === false → localStorage fallback
    - isProtected === true → redirect on logout
    - isLoginPage === true → redirect on login
  render_mode: hidden
- behavior_id: routing_contracts
  predicates:
    - gateQuery.isValid === true
    - normalizedCurrentOrigin in resolvedAllowedOrigins
    - isAllowedReferrerPath(parsedReferrer.pathname)
    - normalizedReferrer === null → allow (browser privacy)
  render_mode: hidden
- behavior_id: report_lifecycle_management
  predicates:
    - gateQuery.source exists → hydrate from import
    - gateQuery.source missing → hydrate defaults
    - hydrationMode === 'import' || 'defaults'
  render_mode: hidden
- behavior_id: company_management
  predicates:
    - isAddEditOpen === true
    - isDeleteOpen === true
    - isCreateReportOpen === true
  render_mode: visible-enabled


Use schema: schemas/spec.schema.yaml
Write specs to: runs/run-0023/generator/specs/

Each spec must include:
- id, type, version
- behaviors[] with evidence_refs
- state_transitions where applicable
- confidence score
- evidence_refs[].covers[] as strings only, e.g. "condition:route_protection" or "transition:login_success". Do not write covers as mappings like { condition: route_protection } or list items like "- condition: route_protection".

YAML safety rules:
- Quote every inline string containing ":", "|", "{", "}", "[", "]", "#", or TypeScript union text.
- For prose/code containing JSON-like objects, write quoted strings, e.g. 'Return { success: false, reason: "too_soon" }'.
- Prefer block scalars for long notes and snippets.

Output as YAML:
spec_files: []
summary: string


## Available Tools
You may use these tools: read, write

## Output Schema
You must produce output that conforms to this JSON schema:
{
  "spec_files": {
    "type": "array",
    "items": {
      "type": "string"
    }
  },
  "summary": {
    "type": "string"
  }
}

Format your response as YAML.

## Output Destination
Write your final output as YAML to this exact file:
/Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/.tmp/agent-output-draft-1777558583415.yaml

## Rules
- Execute ONLY this step. Do not proceed to other steps.
- Use tools to explore the codebase as needed.
- Write your final structured output to the file specified above.
- Do NOT write comments in YAML output (no # lines). Pure YAML only.
- YAML safety is mandatory: quote every string value that contains ': ', '|', '>', '{', '}', '[', ']', '#', quotes, or type-union text. Prefer single-quoted strings and escape embedded single quotes by doubling them.
- Do not assemble ambiguous plain scalars such as notes: A: B or type: "a" | "b"; write them as quoted strings.
- Be concise but thorough.
- If you cannot complete the step, set status: "failed" and explain in failure_reason.
