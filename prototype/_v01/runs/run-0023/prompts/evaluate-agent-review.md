You are executing a single step in a spec generation pipeline.

## Step: evaluate-agent

## CRITICAL: Codebase Location
The codebase is at: /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2

When reading source files, ALWAYS use the full path:
  /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2/src/features/auth/api/auth-service.js  ← CORRECT

NEVER read files relative to the prototype workspace:
  src/features/auth/api/auth-service.js  ← WRONG (resolves to prototype workspace)

## Instructions
Review these specs for business logic hallucinations that AST extraction might miss.

Specs to review (located in /Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/runs/run-0023/generator/specs):
api-client-with-token-refresh.yaml
auth-flow.yaml
browser-storage-utilities.yaml
cross-tab-session-sync.yaml
middleware-auth-guard.yaml
report-lifecycle-management.yaml
routing-contracts.yaml
stale-response-guards.yaml
stateful-ui-company-management.yaml
stateful-ui-pdf-generation.yaml
stateful-ui-reports.yaml

Codebase: /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2

For each spec file, read it from /Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/runs/run-0023/generator/specs/<filename> and verify:
- Behaviors match actual code
- Evidence refs point to real files
- No hallucinated business logic

Output a score (0.0-1.0) and list of issues found.


## Available Tools
You may use these tools: read

## Output Schema
You must produce output that conforms to this JSON schema:
{
  "score": {
    "type": "number"
  },
  "issues": {
    "type": "array"
  },
  "perSpec": {
    "type": "object"
  }
}

Format your response as YAML.

## Output Destination
Write your final output as YAML to this exact file:
/Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/.tmp/agent-output-evaluate-agent-1777558903990.yaml

## Rules
- Execute ONLY this step. Do not proceed to other steps.
- Use tools to explore the codebase as needed.
- Write your final structured output to the file specified above.
- Do NOT write comments in YAML output (no # lines). Pure YAML only.
- YAML safety is mandatory: quote every string value that contains ': ', '|', '>', '{', '}', '[', ']', '#', quotes, or type-union text. Prefer single-quoted strings and escape embedded single quotes by doubling them.
- Do not assemble ambiguous plain scalars such as notes: A: B or type: "a" | "b"; write them as quoted strings.
- Be concise but thorough.
- If you cannot complete the step, set status: "failed" and explain in failure_reason.
