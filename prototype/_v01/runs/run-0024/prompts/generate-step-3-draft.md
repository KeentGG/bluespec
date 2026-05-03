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
- api_client_with_auth
- stateful_ui
- route_protection
- cross_tab_sync
- data_crud
- search_and_filter
- error_handling
- logout_flow
- report_lifecycle
- thematic_ui


Predicate inventory:
- behavior_id: auth_flow
  predicates:
    - isChecking === true (AuthGuard)
    - isChecking === false (AuthGuard)
    - "token?._id && token?.accessToken (useAuthRedirect: hasValidToken)"
    - attemptTokenRefresh === true (useAuthRedirect)
    - "attemptTokenRefresh === false (useAuthRedirect: direct redirect)"
    - "refreshResult.success && refreshResult.token (useAuthRedirect: refresh
      succeeded)"
    - "!refreshResult.success (useAuthRedirect: refresh failed →
      handleAuthError)"
    - "!resolvedSession && protectedRoute (middleware authGuard → redirect
      login)"
    - "!resolvedSession && !protectedRoute (middleware authGuard → allow)"
    - resolvedPath === routes.login && resolvedSession (middleware authGuard →
      redirect companies)
    - resolvedSession && resolvedPath !== routes.login (middleware authGuard →
      allow)
    - "shouldResolveSession(pathname) === true (middleware: attempt session
      fetch)"
    - "hasRefreshToken && !session (middleware: attempt silent refresh)"
    - "refreshResult?.session (middleware: silent refresh succeeded → set
      cookies)"
    - "!refreshResult?.session (middleware: silent refresh failed → authGuard
      decides)"
    - "isRefreshing || refreshPromise (tokenRefresher: wait for in-flight
      refresh)"
    - "acquireRefreshLock() === true (tokenRefresher: leader tab performs
      refresh)"
    - "acquireRefreshLock() === false (tokenRefresher: follower tab waits)"
    - "waitResult && waitResult.success (tokenRefresher: apply other tab token)"
    - "waitResult timed out or null (tokenRefresher: retry lock acquisition)"
  render_mode: visible-enabled
- behavior_id: route_protection
  predicates:
    - "!resolvedSession && protectedRoute (SSR middleware → redirect login)"
    - "!resolvedSession && !protectedRoute (SSR middleware → allow)"
    - resolvedPath === routes.login && resolvedSession (SSR middleware →
      redirect companies)
    - resolvedSession && resolvedPath !== routes.login (SSR middleware → allow)
    - "shouldResolveSession && !session && hasRefreshToken (SSR: attempt silent
      refresh)"
    - isChecking === true (client AuthGuard → spinner)
    - isChecking === false (client AuthGuard → children + AuthSyncBootstrap)
    - "hasValidToken (useAuthRedirect: skip refresh → authenticated)"
    - "!hasValidToken && attemptTokenRefresh (useAuthRedirect: try refresh)"
    - "refreshResult.success (useAuthRedirect: authenticated)"
    - "!refreshResult.success (useAuthRedirect: redirect login)"
    - "rollbackRoute.shouldRedirect (middleware: redirect to v1)"
  render_mode: visible-enabled
- behavior_id: cross_tab_sync
  predicates:
    - typeof window === "undefined" (skip all — server/Edge)
    - isBroadcastSupported() === true (BroadcastChannel path)
    - isBroadcastSupported() === false (localStorage-only fallback)
    - now - lastRedirectTime < REDIRECT_DEBOUNCE_MS (ignore logout event)
    - now - lastLoginTime < LOGIN_DEBOUNCE_MS (ignore login event)
    - 'currentPath.includes("/companies") || currentPath.includes("/reports")
      (logout: redirect if protected)'
    - 'currentPath.includes("/login") (login event: redirect to companies)'
    - '!currentPath.includes("/login") (login event: stay on page)'
    - typeof callback === "function" (call user callback)
  render_mode: hidden
- behavior_id: api_client_with_auth
  predicates:
    - "!requestUrl (missing API base URL → error result)"
    - method !== "GET" && method !== "HEAD" (state-changing → CSRF required)
    - "!csrfToken && !retriedAfterRefresh (proactive CSRF refresh via token
      refresh)"
    - csrfToken present (attach x-csrf-token header)
    - isRefreshEndpoint (skip CSRF + token refresh)
    - skipTokenRefresh (suppress automatic refresh on 401)
    - statusCode 401 || (500 && "jwt expired") || CSRF 403 (trigger token
      refresh)
    - "!retriedAfterRefresh && shouldRetryAfterRefresh (retry request with new
      token)"
    - retriedAfterRefresh === true (no more retries)
    - refreshResult.success && refreshResult.token (retry original request)
    - "!refreshResult.success && !skipAuthErrorHandling (handleAuthError →
      redirect)"
    - isAuthError(result) && !isRefreshEndpoint && !skipAuthErrorHandling
      (handleAuthError)
    - request aborted (AbortError → aborted result)
  render_mode: visible-enabled
- behavior_id: error_handling
  predicates:
    - error caught by ErrorBoundary (show ErrorFallback, hide children)
    - no error (show children)
    - onPrimaryAction (show primary button)
    - resetErrorBoundary && !onPrimaryAction (show reset button)
    - onSecondaryAction (show secondary button)
    - "!onSecondaryAction (show refresh button → window.location.reload)"
    - statusCode === 401 || statusCode === 403 (isAuthError)
    - taxonomyBucket === "auth/session" (isAuthError)
    - message contains auth keywords (isAuthError)
    - isAuthErrorHandling === true (skip duplicate handling)
    - '!skipRedirect && typeof window !== "undefined" (redirect via
      location.replace)'
    - skipRedirect === true (clear session only, no redirect)
    - "explicitBucket present (QFM: use explicit bucket)"
    - "AUTH_FAILURE_STATUS_CODES.includes(statusCode) (QFM: auth/session)"
    - "includesKeyword(signal, AUTH_KEYWORDS) (QFM: auth/session)"
    - "includesKeyword(signal, STALE_KEYWORDS) (QFM: stale state)"
  render_mode: visible-enabled
- behavior_id: report_lifecycle
  predicates:
    - controller.hasSelectedBusiness === true (show company header + New Report
      button)
    - controller.hasSelectedBusiness === false (hide header + button)
    - controller.listState === "idle" (show ReportsIdleState)
    - controller.listState === "empty" (show ReportsEmptyState)
    - controller.listState === "loading" (show ReportsTableSkeleton)
    - controller.listState === "ready" || controller.listState === "error" (show
      ReportsTable)
    - deleteDialog.isOpen (show DeleteReportModal)
    - "!deleteDialog.isOpen (hide DeleteReportModal)"
    - "!!emailModal.reportId (show EmailReportModal)"
    - "!emailModal.reportId (hide EmailReportModal)"
    - controller.hasMore (show Load More button)
    - controller.isLoadingMore (loading indicator for pagination)
    - isDeleting/reportId (disable delete button, show progress)
    - isEmailing/reportId (disable email button, show progress)
  render_mode: visible-enabled
- behavior_id: logout_flow
  predicates:
    - logoutResult.shouldClearAuthSession (clear client cache + auth token)
    - logoutResult.clearLocalStorageKeys length > 0 (remove specific
      localStorage keys)
    - logoutResult.shouldRedirect && logoutResult.redirectDestination (redirect
      after delay)
    - "logout API call throws (fail-safe: clear all + redirect)"
  render_mode: visible-enabled
- behavior_id: search_and_filter
  predicates:
    - selectedBusinessId !== REPORTS_ALL_BUSINESSES_ID (enable SWR query)
    - selectedBusinessId === REPORTS_ALL_BUSINESSES_ID (disable query → idle
      state)
    - isEnabled (userId + businessId valid → fire SWR request)
    - "!isEnabled (skip SWR request)"
    - searchQuery === "" (no client-side keyword filter applied)
    - searchQuery !== "" (client-side text filter active)
  render_mode: visible-enabled
- behavior_id: stateful_ui
  predicates:
    - controller.listState === "idle" (ReportsIdleState)
    - controller.listState === "empty" (ReportsEmptyState)
    - controller.listState === "loading" (ReportsTableSkeleton)
    - controller.listState === "ready" || controller.listState === "error"
      (ReportsTable)
    - controller.hasSelectedBusiness (show company context header)
    - isDownloading(reportId) (spinner on download action)
    - isRenaming(reportId) (inline rename mode)
    - isDeleting(reportId) (disable delete + show progress)
    - isEmailing(reportId) (disable email + show progress)
    - anyActionInProgress(reportId) (block conflicting actions)
  render_mode: visible-enabled
- behavior_id: data_crud
  predicates:
    - requestIntent matches stored intent (stale response guard → ignore result)
    - requestIntent differs from stored intent (process new response)
    - response.ok === true (populate data)
    - response.ok === false && reason !== "aborted" (surface error message)
  render_mode: visible-enabled
- behavior_id: thematic_ui
  predicates:
    - onPrimaryAction (show primary action button)
    - resetErrorBoundary && !onPrimaryAction (show reset button)
    - onSecondaryAction (show secondary action button)
    - "!onSecondaryAction (show default refresh action)"
  render_mode: visible-enabled


Use schema: schemas/spec.schema.yaml
Write specs to: runs/run-0024/generator/specs/

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
/Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/.tmp/agent-output-draft-1777564734984.yaml

## Rules
- Execute ONLY this step. Do not proceed to other steps.
- Use tools to explore the codebase as needed.
- Write your final structured output to the file specified above.
- Do NOT write comments in YAML output (no # lines). Pure YAML only.
- YAML safety is mandatory: quote every string value that contains ': ', '|', '>', '{', '}', '[', ']', '#', quotes, or type-union text. Prefer single-quoted strings and escape embedded single quotes by doubling them.
- Do not assemble ambiguous plain scalars such as notes: A: B or type: "a" | "b"; write them as quoted strings.
- Be concise but thorough.
- If you cannot complete the step, set status: "failed" and explain in failure_reason.
