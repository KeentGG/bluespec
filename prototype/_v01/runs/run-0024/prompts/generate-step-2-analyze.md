You are executing a single step in a spec generation pipeline.

## Step: analyze

## CRITICAL: Codebase Location
The codebase is at: /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2

When reading source files, ALWAYS use the full path:
  /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2/src/features/auth/api/auth-service.js  ← CORRECT

NEVER read files relative to the prototype workspace:
  src/features/auth/api/auth-service.js  ← WRONG (resolves to prototype workspace)

## Instructions
Analyze these behavior candidates from the exploration step:
- id: auth_flow
  description: "Complete authentication lifecycle: login, signup, password reset,
    token refresh, session management, and logout with cross-tab coordination"
  evidence_refs:
    - middleware.js
    - src/features/auth/api/authMemorySession.js
    - src/features/auth/api/sessionBootstrap.js
    - src/features/auth/api/authGuard.js
    - src/features/auth/api/auth-service.js
    - src/features/auth/api/tokenService.js
    - src/features/auth/api/tokenRefresher.js
    - src/features/auth/api/authErrorHandler.js
    - src/features/auth/api/csrfHelper.js
    - src/features/auth/api/tokenValidator.js
    - src/features/auth/components/LoginPageContent.tsx
    - src/features/auth/components/AuthGuard.tsx
    - src/features/auth/hooks/useAuthRedirect.ts
    - src/features/auth/lib/authBroadcast.js
    - src/features/auth/lib/crossTab.js
    - src/shared/components/AuthSyncBootstrap.tsx
    - src/shared/lib/react/clearClientDataCache.ts
    - src/app/(dashboard)/layout.tsx
    - src/app/layout.tsx
  confidence: 0.95
- id: api_client_with_auth
  description: Centralized API client with automatic JWT injection, CSRF
    protection, token refresh retry logic, timeout handling, and normalized
    error result format
  evidence_refs:
    - src/shared/lib/api/apiClient.ts
    - src/shared/lib/contracts/api-contract.ts
    - src/shared/lib/qfm/responseAdapter.js
    - src/shared/lib/qfm/failureTaxonomy.js
    - src/shared/lib/qfm/inFlightMutationGuard.js
    - src/shared/lib/qfm/index.js
    - src/features/auth/api/authErrorHandler.js
    - src/features/auth/api/tokenRefresher.js
    - src/features/auth/api/csrfHelper.js
  confidence: 0.9
- id: stateful_ui
  description: UI state management using Zustand stores and React hooks for
    filtering, sorting, modal control, action progress tracking, and dashboard
    shell state
  evidence_refs:
    - src/features/reports/store/useReportsListStore.ts
    - src/features/reports/store/useReportActionStore.ts
    - src/features/reports/store/useCreateReportStore.ts
    - src/features/pdf/store/useDownloadStore.ts
    - src/features/shell/hooks/useDashboardShell.ts
    - src/features/company/hooks/useCompanyForm.ts
    - src/features/company/hooks/useCompaniesPage.ts
    - src/features/company/hooks/useCompanyModals.ts
    - src/features/reports/hooks/useReportsListQuery.ts
    - src/features/reports/hooks/useReportCreation.ts
    - src/features/reports/hooks/useReportDeleteDialog.ts
    - src/features/reports/hooks/useReportEmailModal.ts
    - src/features/reports/hooks/useCreateReportModal.ts
    - src/features/reports/controllers/useReportsPageController.ts
    - src/shared/components/ErrorBoundary.tsx
  confidence: 0.85
- id: route_protection
  description: "Dual-layer route protection: SSR middleware checks cookies and
    performs silent token refresh before rendering; client-side AuthGuard
    verifies in-memory session and redirects"
  evidence_refs:
    - middleware.js
    - src/features/auth/api/authGuard.js
    - src/features/auth/components/AuthGuard.tsx
    - src/features/auth/hooks/useAuthRedirect.ts
    - src/shared/lib/routing/basePath.js
    - src/shared/lib/routing/index.js
    - src/shared/lib/routing/initGuards.js
    - src/shared/lib/routing/entryContracts.js
    - src/app/(dashboard)/layout.tsx
  confidence: 0.92
- id: cross_tab_sync
  description: Cross-tab auth event coordination using BroadcastChannel API with
    localStorage fallback for Safari, including login/logout broadcasts, refresh
    locks, and redirect loop protection
  evidence_refs:
    - src/features/auth/lib/authBroadcast.js
    - src/features/auth/lib/crossTab.js
    - src/features/auth/api/authMemorySession.js
    - src/features/auth/api/tokenRefresher.js
    - src/shared/components/AuthSyncBootstrap.tsx
  confidence: 0.88
- id: data_crud
  description: REST API service pattern for CRUD operations on companies, reports,
    users, and profiles with contract-based validation and stale response guards
  evidence_refs:
    - src/features/company/api/company-service.js
    - src/features/company/api/list-service.js
    - src/features/company/api/stale-response-guard.js
    - src/features/company/contracts/list-contract.js
    - src/features/company/contracts/row-action-contract.js
    - src/features/company/contracts/shell-contract.js
    - src/features/company/contracts/ux-feedback-contract.js
    - src/features/company/hooks/useCompanyListQuery.ts
    - src/features/reports/api/report-service.js
    - src/features/reports/api/list-service.js
    - src/features/reports/api/stale-response-guard.js
    - src/features/reports/contracts/list-contract.js
    - src/features/reports/contracts/report-record-contract.js
    - src/features/reports/contracts/lifecycle-contract.js
    - src/features/auth/api/user-service.js
    - src/features/profile/api/profile-service.ts
    - src/features/pdf/api/pdf-service.ts
  confidence: 0.82
- id: search_and_filter
  description: Client-side search, sort, and filter state with Zustand store,
    server-side query via SWR hooks, and toolbar UI components (SearchInput,
    SelectFilter, ReportsToolbar)
  evidence_refs:
    - src/features/reports/store/useReportsListStore.ts
    - src/features/reports/hooks/useReportsToolbarController.ts
    - src/features/reports/hooks/useReportsListQuery.ts
    - src/features/reports/components/ReportsToolbar.tsx
    - src/shared/components/SearchInput.tsx
    - src/shared/components/SelectFilter.tsx
    - src/shared/lib/routing/queryValidators.js
    - src/features/company/components/CompaniesTable.tsx
  confidence: 0.7
- id: error_handling
  description: "Multi-layer error handling: ErrorBoundary/ErrorFallback React
    components, auth error handler with session-expired redirects, failure
    taxonomy with QFM classification, and contract-based response validation"
  evidence_refs:
    - src/shared/components/ErrorBoundary.tsx
    - src/shared/components/ErrorFallback.tsx
    - src/features/auth/api/authErrorHandler.js
    - src/shared/lib/qfm/failureTaxonomy.js
    - src/shared/lib/qfm/responseAdapter.js
    - src/shared/lib/api/apiClient.ts
    - src/shared/lib/contracts/query-contract.js
    - src/shared/lib/shared/request-intent-guard.js
  confidence: 0.75
- id: logout_flow
  description: "Logout pipeline: API call, session clear (memory + cookies +
    localStorage), cross-tab broadcast, toast notification, and redirect to
    login with contract-based coordination"
  evidence_refs:
    - src/features/shell/hooks/useDashboardShell.ts
    - src/features/auth/api/auth-service.js
    - src/features/auth/api/authMemorySession.js
    - src/features/auth/api/tokenService.js
    - src/features/auth/lib/authBroadcast.js
    - src/features/company/contracts/shell-contract.js
    - src/shared/lib/react/clearClientDataCache.ts
  confidence: 0.8
- id: report_lifecycle
  description: "End-to-end report management: creation with template selection,
    listing with server-side pagination/sort/filter, rename, email, download,
    delete with modal confirmation and action progress tracking"
  evidence_refs:
    - src/features/reports/components/CreateReportModal.tsx
    - src/features/reports/components/DeleteReportModal.tsx
    - src/features/reports/components/EmailReportModal.tsx
    - src/features/reports/components/ReportsTable.tsx
    - src/features/reports/components/ReportsPageContent.tsx
    - src/features/reports/hooks/useReportCreation.ts
    - src/features/reports/hooks/useReportDeleteAction.ts
    - src/features/reports/hooks/useReportDownloadAction.ts
    - src/features/reports/hooks/useReportEmailAction.ts
    - src/features/reports/hooks/useReportRenameAction.ts
    - src/features/reports/store/useReportActionStore.ts
    - src/features/reports/contracts/list-contract.js
    - src/features/reports/contracts/lifecycle-contract.js
    - src/features/reports/contracts/import-engine.ts
  confidence: 0.83
- id: thematic_ui
  description: Design system of 25+ reusable UI components (Alert, Badge, Button,
    Dialog, Modal, ProgressBar, Spinner, Table, etc.) with CSS variables-based
    theming via tokens.css
  evidence_refs:
    - src/shared/components/index.ts
    - src/shared/components/Button.tsx
    - src/shared/components/Modal.tsx
    - src/shared/components/Sidebar.tsx
    - src/shared/components/TableHeader.tsx
    - src/shared/components/TableRow.tsx
    - src/shared/components/Spinner.tsx
    - src/shared/components/ProgressBar.tsx
    - src/shared/components/ProgressRing.tsx
    - src/shared/components/ErrorBoundary.tsx
    - src/shared/components/EmptyState.tsx
    - src/shared/components/SelectFilter.tsx
    - src/shared/components/SearchInput.tsx
    - src/shared/theme/tokens.css
  confidence: 0.78


Your task:
1. Filter candidates to those with high confidence (>0.6)
2. For conditional flows, produce a predicate_inventory:
   - List each gate predicate separately
   - Label render mode: hidden, visible-disabled, visible-enabled
   - Note: this is LIVE CODE analysis, not golden-set matching
3. Flag behaviors that need deeper exploration

Output as YAML:
predicate_inventory: []
behaviors_to_spec: []
needs_deeper_exploration: []


## Available Tools
You may use these tools: read

## Output Schema
You must produce output that conforms to this JSON schema:
{
  "predicate_inventory": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "behavior_id": {
          "type": "string"
        },
        "predicates": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "render_mode": {
          "type": "string",
          "enum": [
            "hidden",
            "visible-disabled",
            "visible-enabled"
          ]
        }
      }
    }
  },
  "behaviors_to_spec": {
    "type": "array",
    "items": {
      "type": "string"
    }
  },
  "needs_deeper_exploration": {
    "type": "array",
    "items": {
      "type": "string"
    }
  }
}

Format your response as YAML.

## Output Destination
Write your final output as YAML to this exact file:
/Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/.tmp/agent-output-analyze-1777561993216.yaml

## Rules
- Execute ONLY this step. Do not proceed to other steps.
- Use tools to explore the codebase as needed.
- Write your final structured output to the file specified above.
- Do NOT write comments in YAML output (no # lines). Pure YAML only.
- YAML safety is mandatory: quote every string value that contains ': ', '|', '>', '{', '}', '[', ']', '#', quotes, or type-union text. Prefer single-quoted strings and escape embedded single quotes by doubling them.
- Do not assemble ambiguous plain scalars such as notes: A: B or type: "a" | "b"; write them as quoted strings.
- Be concise but thorough.
- If you cannot complete the step, set status: "failed" and explain in failure_reason.
