You are executing a single step in a spec generation pipeline.

## Step: analyze

## CRITICAL: Codebase Location
The codebase is at: /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2

When reading source files, ALWAYS use the full path:
  /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2/src/features/auth/api/auth-service.js  ← CORRECT

NEVER read files relative to the prototype workspace:
  src/features/auth/api/auth-service.js  ← WRONG (resolves to prototype workspace)

## Instructions
You are the Analyzer agent. Diagnose WHY the formula missed or produced imprecise specs.

RUN_ID: run-0023
FORMULA: frontend-derived vv004
CODEBASE: /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2

When reading source files, use absolute paths starting with /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2/
Do NOT read files relative to the prototype workspace. Always prefix with the codebase path.

## Evaluation Results
- Precision: undefined
- Mechanical score: undefined
- Agent score: undefined

## Mechanical Issues
[]


## Agent Issues
- spec: api-client-with-token-refresh
  type: snippet_inaccuracy
  severity: low
  description: Spec snippet shows refreshAccessToken with different function
    signature than actual code. Actual code has performCoordinatedRefresh which
    handles cross-tab coordination internally.
  evidence: "Actual tokenRefresher.js shows performCoordinatedRefresh(apiClient)
    not refreshAccessToken({ apiClient: { request, get, post, patch, delete:
    remove } })"
- spec: middleware-auth-guard
  type: hallucinated_conditions
  severity: medium
  description: Spec includes conditions 'hasRefreshTokenNoSession' and
    'refreshResultNotNull' which are not present in the authGuard.js
    implementation. The actual authGuard.js is simpler with just session-based
    allow/redirect logic.
  evidence: authGuard.js only handles session normalization and redirect decisions
    without explicit refresh token checks
- spec: middleware-auth-guard
  type: scope_mismatch
  severity: low
  description: Spec mentions 'session refresh attempts' in description but the
    actual authGuard.js does not perform refresh - it only makes allow/redirect
    decisions based on session state.
  evidence: authGuard.js returns allow/redirect decisions without calling
    refreshAccessToken
- spec: report-lifecycle-management
  type: incomplete_evidence
  severity: low
  description: Spec status is 'partial' which is accurate - some hydration details
    in shared/lib modules not fully inspected.
  evidence: Gate edit initialization confirmed but default report structure
    details not visible in frontend code
- spec: routing-contracts
  type: incomplete_evidence
  severity: low
  description: Spec status is 'partial' which is accurate - allowed origins list
    and referrer validation logic details in shared/lib not fully inspected.
  evidence: Gate entry hooks confirmed but validation contracts in shared/lib
    modules not fully verified
- spec: stale-response-guards
  type: incomplete_evidence
  severity: low
  description: Spec status is 'partial' which is accurate - exact versioning
    algorithm in shared/lib/request-intent-guard.js not fully inspected.
  evidence: Guard configuration confirmed but implementation details in shared/lib
    module not fully inspected


## Formula Steps
- explore: Explore codebase structure and behavioral surfaces
- analyze: Analyze discovered behaviors for spec-worthiness
- draft: Draft behavioral specs
- verify: Verify specs against schema

## Lesson History
## Known Lessons (5 total)

- recognition_failure (2 lessons):
  - verification_crosscheck: 1 passed, 0 failed
  - step_management: 0 passed, 0 failed
- rubric_gap_failure (2 lessons):
  - rubric_candidate_proposal: 1 passed, 0 failed
  - prompt_tweak: 0 passed, 1 failed
- prompt_failure (1 lessons):
  - prompt_reword_only: 0 passed, 1 failed


## Evolution Context (Cross-Run State)
## Active Formula
- ID: frontend-derived vv004
- Ecosystem: frontend
- Steps: explore → analyze → draft → verify

## Active Rubric
- Version: v002
- Active criteria: coverage_core_behavior, completeness_inputs_outputs, consistency_cross_refs, golden_set_recall, conditional_flow_documentation

## Recent Runs
  - run-0020: formula=formulas/promoted/frontend-derived-v004.yaml, eval=(no evaluator output)
  - run-0021: formula=formulas/promoted/frontend-derived-v004.yaml, eval=(overall_score=0.58, recall=0, precision=0.92)
  - run-0022: formula=formulas/promoted/frontend-derived-v004.yaml, eval=(overall_score=0.59, recall=0, precision=0.97)

## Lessons Learned (5 total)
### What Has Worked
  - recognition_failure × verification_crosscheck: 1 success(es)
  - rubric_gap_failure × rubric_candidate_proposal: 1 success(es)
### What Has Failed (insanity prevention)
  - rubric_gap_failure × prompt_tweak: 1 failure(s)
  - prompt_failure × prompt_reword_only: 1 failure(s)
These methods SHOULD NOT be retried without explicit justification.

## Pending Reviews
- Formula candidates: frontend-derived-stale-reference-recovery, frontend-derived-v004-predicate-universality, run-0016-step-management-explore, frontend-derived-v004-evidence-obligation-gates, frontend-derived-v005-run-0022
- Rubric candidates: stale_golden_vs_observed_implementation, rubric-v003-enriched

## Your Task
1. Identify the primary failure type:
   - search_failure: didn't find relevant files
   - recognition_failure: found files but didn't understand behavior
   - format_failure: spec structure was wrong
   - prompt_failure: instructions were unclear or missing
   - schema_failure: output didn't match expected schema

2. Diagnose which formula step(s) caused the issue

3. Suggest a concrete mutation:
   - type: prompt_tweak | step_management | schema_change
   - target_step: which step to modify
   - change: exactly what to add/change/remove

### Lesson-Aware Diagnosis
- Check if this failure type has been seen before. What teaching methods have already been tried?
- If a previous attempt with the same (failure_type, teaching_method) already FAILED, flag it and suggest a different approach.
- Consider escalating mutation tiers: prompt_tweak → step_management → parent_guideline → schema_change → tool_change → rubric_mutation.
- **Anti-contamination: Classify the failure TYPE and suggest methodological improvements, NOT specific missed behaviors. The formula must evolve to discover behaviors better, not to be pre-primed with what it missed.**

Write your diagnosis to: /Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/runs/run-0023/analyzer/output.yaml


## Available Tools
You may use these tools: read, write

## Output Schema
You must produce output that conforms to this JSON schema:
{
  "primary_failure_type": {
    "type": "string"
  },
  "diagnosis": {
    "type": "string"
  },
  "affected_steps": {
    "type": "array"
  },
  "suggested_mutation": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string"
      },
      "target_step": {
        "type": "string"
      },
      "change": {
        "type": "string"
      }
    }
  },
  "confidence": {
    "type": "number"
  }
}

Format your response as YAML.

## Output Destination
Write your final output as YAML to this exact file:
/Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/.tmp/agent-output-analyze-1777559000909.yaml

## Rules
- Execute ONLY this step. Do not proceed to other steps.
- Use tools to explore the codebase as needed.
- Write your final structured output to the file specified above.
- Do NOT write comments in YAML output (no # lines). Pure YAML only.
- YAML safety is mandatory: quote every string value that contains ': ', '|', '>', '{', '}', '[', ']', '#', quotes, or type-union text. Prefer single-quoted strings and escape embedded single quotes by doubling them.
- Do not assemble ambiguous plain scalars such as notes: A: B or type: "a" | "b"; write them as quoted strings.
- Be concise but thorough.
- If you cannot complete the step, set status: "failed" and explain in failure_reason.
