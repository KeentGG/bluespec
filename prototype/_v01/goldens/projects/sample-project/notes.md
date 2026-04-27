# Sample Project Notes

This is a placeholder golden set for prototype wiring.

Purpose:
- validate schema and file layout
- test recall/precision workflow shape
- seed examples for conditional flows and state-gated UI behavior

## TOA-Gated First Report Creation (new)

Newly registered accounts (no TOA agreed, no existing reports) cannot create reports directly from the dashboard.
The create attempt triggers a redirect to the calculator's introduction/commitment page with `businessId` and `reportName` as query params.
The calculator app handles actual report persistence AFTER the user accepts TOA.
This prevents orphaned reports from users who abandon the TOA flow.

Key files:
- `src/features/auth/contracts/toa-contract.js` -- TOA status resolution and redirect URL building
- `src/features/reports/hooks/useReportCreation.ts` -- TOA check before `createReport` API call
- `src/shared/lib/routing/gate-new-contract.js` -- gate new flow with deferred create support

Replace evidence references with a real project before first run.
