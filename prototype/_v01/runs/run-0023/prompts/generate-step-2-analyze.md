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
  description: Complete JWT authentication system with access token in memory,
    refresh token in HTTP-only cookie, cross-tab coordination via
    BroadcastChannel, and automatic token refresh with cross-tab locking
  evidence_refs:
    - src/features/auth/ARCHITECTURE.md
    - src/features/auth/api/auth-service.js
    - src/features/auth/api/tokenService.js
    - src/features/auth/api/tokenRefresher.js
    - src/features/auth/api/authMemorySession.js
    - src/features/auth/api/sessionBootstrap.js
    - src/features/auth/api/authGuard.js
    - src/features/auth/api/authErrorHandler.js
    - src/features/auth/api/csrfHelper.js
    - src/features/auth/api/tokenValidator.js
    - src/features/auth/lib/authBroadcast.js
    - src/features/auth/lib/crossTab.js
    - src/features/auth/hooks/useAuthRedirect.ts
    - src/features/auth/components/AuthGuard.tsx
    - src/shared/lib/api/apiClient.ts
    - middleware.js
  confidence: 0.98
- id: stateful_ui_reports
  description: Zustand-based state management for report operations including
    create, delete, rename, email, and download with per-report loading states
  evidence_refs:
    - src/features/reports/store/useCreateReportStore.ts
    - src/features/reports/store/useReportActionStore.ts
    - src/features/reports/store/useReportsListStore.ts
    - src/features/reports/hooks/useReportCreation.ts
    - src/features/reports/hooks/useReportDeleteAction.ts
    - src/features/reports/hooks/useReportDeleteDialog.ts
    - src/features/reports/hooks/useReportDownloadAction.ts
    - src/features/reports/hooks/useReportEmailAction.ts
    - src/features/reports/hooks/useReportEmailModal.ts
    - src/features/reports/hooks/useReportRenameAction.ts
    - src/features/reports/hooks/useCreateReportModal.ts
    - src/features/reports/hooks/useReportRowController.ts
    - src/features/reports/hooks/useReportsToolbarController.ts
    - src/features/reports/controllers/useReportsPageController.ts
  confidence: 0.95
- id: stateful_ui_pdf_generation
  description: Zustand store with localStorage persistence for PDF generation
    state tracking across page reloads
  evidence_refs:
    - src/features/pdf/store/useDownloadStore.ts
    - src/features/pdf/api/pdf-service.ts
    - src/features/pdf/components/PdfGenerationOverlay.tsx
  confidence: 0.92
- id: stateful_ui_company_management
  description: React hooks-based state management for company CRUD operations with
    form state, modal state, and list query management
  evidence_refs:
    - src/features/company/hooks/useCompaniesPage.ts
    - src/features/company/hooks/useCompanyForm.ts
    - src/features/company/hooks/useCompanyListQuery.ts
    - src/features/company/hooks/useCompanyModals.ts
    - src/features/company/hooks/useCompanyUrlEntry.ts
    - src/features/company/components/CompaniesPageClient.tsx
    - src/features/company/components/CompanyModals.tsx
  confidence: 0.9
- id: api_client_with_token_refresh
  description: Core HTTP client with automatic JWT injection, CSRF handling, 401
    detection, and automatic token refresh with request retry
  evidence_refs:
    - src/shared/lib/api/apiClient.ts
    - src/shared/lib/contracts/api-contract.ts
    - src/shared/lib/qfm/responseAdapter.js
  confidence: 0.97
- id: cross_tab_session_sync
  description: BroadcastChannel-based cross-tab coordination for login/logout
    events and token refresh locking via localStorage
  evidence_refs:
    - src/features/auth/lib/authBroadcast.js
    - src/features/auth/lib/crossTab.js
    - src/features/auth/api/tokenRefresher.js
    - src/features/auth/api/authMemorySession.js
  confidence: 0.94
- id: middleware_auth_guard
  description: Next.js Edge Middleware handling session resolution, silent token
    refresh, and protected route guards with CSRF propagation
  evidence_refs:
    - middleware.js
    - src/features/auth/api/authGuard.js
    - src/shared/lib/routing/basePath.js
  confidence: 0.96
- id: report_lifecycle_management
  description: Complete report CRUD lifecycle with import engine, template system,
    and stale response guards
  evidence_refs:
    - src/features/reports/api/report-service.js
    - src/features/reports/api/list-service.js
    - src/features/reports/api/stale-response-guard.js
    - src/features/reports/contracts/lifecycle-contract.js
    - src/features/reports/contracts/import-engine.ts
    - src/features/reports/contracts/templates/ve-template.ts
    - src/features/reports/contracts/templates/de-template.ts
    - src/features/reports/contracts/templates/np-template.ts
    - src/features/reports/contracts/templates/vga-template.ts
  confidence: 0.88
- id: qfm_response_normalization
  description: Query/Response Format Management layer handling response
    normalization, failure taxonomy, rollback gates, and storage sanitization
  evidence_refs:
    - src/shared/lib/qfm/index.js
    - src/shared/lib/qfm/responseAdapter.js
    - src/shared/lib/qfm/failureTaxonomy.js
    - src/shared/lib/qfm/rollbackGate.js
    - src/shared/lib/qfm/storageSanitizer.js
    - src/shared/lib/qfm/inFlightMutationGuard.js
    - src/shared/lib/qfm/pdfLifecycle.js
  confidence: 0.85
- id: routing_contracts
  description: Route-based entry contracts, gate validation, and query parameter
    validation for protected routes
  evidence_refs:
    - src/shared/lib/routing/entryContracts.js
    - src/shared/lib/routing/gate-finder.js
    - src/shared/lib/routing/gate-new-contract.js
    - src/shared/lib/routing/gate-edit-contract.js
    - src/shared/lib/routing/queryValidators.js
    - src/shared/lib/routing/initGuards.js
    - src/features/routing/hooks/useGateNewEntryState.ts
    - src/features/routing/hooks/useGateEditEntryState.ts
    - src/features/routing/hooks/useRootRedirect.ts
  confidence: 0.87
- id: profile_management
  description: User profile viewing and editing with dedicated API service and
    page component
  evidence_refs:
    - src/features/profile/api/profile-service.ts
    - src/features/profile/components/ProfilePageContent.tsx
  confidence: 0.8
- id: photo_editor
  description: Canvas-based photo editor with drag/pan interactions for logo manipulation
  evidence_refs:
    - src/features/photo-editor/components/LogoPhotoEditor.tsx
    - src/features/photo-editor/hooks/useDragPan.ts
    - src/features/photo-editor/lib/photoEditor.ts
    - src/features/photo-editor/lib/constants.ts
  confidence: 0.82
- id: shared_ui_components
  description: Reusable UI component library including buttons, modals, forms,
    tables, alerts, and layout components
  evidence_refs:
    - src/shared/components/Button.tsx
    - src/shared/components/Modal.tsx
    - src/shared/components/Dialog.tsx
    - src/shared/components/Alert.tsx
    - src/shared/components/Badge.tsx
    - src/shared/components/TableHeader.tsx
    - src/shared/components/TableRow.tsx
    - src/shared/components/Sidebar.tsx
    - src/shared/components/ErrorBoundary.tsx
    - src/shared/components/ErrorFallback.tsx
    - src/shared/components/EmptyState.tsx
    - src/shared/components/Spinner.tsx
    - src/shared/components/ProgressBar.tsx
    - src/shared/components/ProgressRing.tsx
  confidence: 0.91
- id: shell_layout
  description: Dashboard shell layout with sidebar navigation and page wrapper components
  evidence_refs:
    - src/features/shell/components/DashboardShell.tsx
    - src/features/shell/components/DashboardPage.tsx
    - src/features/shell/hooks/useDashboardShell.ts
    - src/app/(dashboard)/layout.tsx
  confidence: 0.88
- id: stale_response_guards
  description: Pattern for detecting and handling stale API responses across
    multiple features (reports, company)
  evidence_refs:
    - src/features/reports/api/stale-response-guard.js
    - src/features/company/api/stale-response-guard.js
    - src/shared/lib/shared/request-intent-guard.js
  confidence: 0.83
- id: browser_storage_utilities
  description: Safe localStorage/sessionStorage wrappers with SSR guards and cache
    clearing utilities
  evidence_refs:
    - src/shared/lib/browser/storage.ts
    - src/shared/lib/react/clearClientDataCache.ts
    - src/shared/lib/qfm/storageSanitizer.js
  confidence: 0.86
- id: email_validation
  description: Email validation logic for report email functionality
  evidence_refs:
    - src/features/reports/lib/emailValidators.ts
  confidence: 0.75


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
/Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/.tmp/agent-output-analyze-1777558200744.yaml

## Rules
- Execute ONLY this step. Do not proceed to other steps.
- Use tools to explore the codebase as needed.
- Write your final structured output to the file specified above.
- Do NOT write comments in YAML output (no # lines). Pure YAML only.
- YAML safety is mandatory: quote every string value that contains ': ', '|', '>', '{', '}', '[', ']', '#', quotes, or type-union text. Prefer single-quoted strings and escape embedded single quotes by doubling them.
- Do not assemble ambiguous plain scalars such as notes: A: B or type: "a" | "b"; write them as quoted strings.
- Be concise but thorough.
- If you cannot complete the step, set status: "failed" and explain in failure_reason.
