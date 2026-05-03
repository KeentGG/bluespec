You are executing a single step in a spec generation pipeline.

## Step: mutate

## CRITICAL: Codebase Location
The codebase is at: /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2

When reading source files, ALWAYS use the full path:
  /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2/src/features/auth/api/auth-service.js  ← CORRECT

NEVER read files relative to the prototype workspace:
  src/features/auth/api/auth-service.js  ← WRONG (resolves to prototype workspace)

## Instructions
You are the Mutator agent. Produce a candidate formula mutation.

RUN_ID: run-0023
CURRENT FORMULA: frontend-derived vv004

## Analysis
Failure type: recognition_failure
Diagnosis: The spec generator found the relevant source files (authGuard.js, tokenRefresher.js) but hallucinated behaviors that do not exist in the actual code. Specifically: (1) middleware-auth-guard spec includes conditions 'hasRefreshTokenNoSession' and 'refreshResultNotNull' which are NOT present in authGuard.js. The actual authGuard.js is a simple session-based allow/redirect guard with no refresh token logic. (2) api-client-with-token-refresh spec shows refreshAccessToken with wrong function signature - the actual tokenRefresher.js exports refreshAccessToken(options = {}) which delegates to performCoordinatedRefresh(apiClient), not the direct signature shown. The generator inferred behaviors from related files (tokenRefresher.js) and incorrectly attributed them to authGuard.js. This is a recognition_failure per the decision tree: files were found and specs were produced, but the behaviors were misidentified or fabricated.


## Suggested Mutation
Type: step_management
Target step: draft
Change: Add a mandatory verification crosscheck step after draft that forces the spec writer to re-read each evidence_ref file and verify that every condition, guard, and state transition claim in the spec is directly observable in the source code. The step should reject any spec section where a claimed behavior cannot be traced to an exact line in the evidence file. This prevents hallucinated behaviors from being included in specs when the generator infers behaviors from related files rather than observing them directly.


## Current Formula Steps
- id: explore
  name: Explore codebase structure and behavioral surfaces
  agent: codebase-explorer
  tools:
    - glob
    - grep
    - read
  max_tokens: 8000
  prompt: |
    Explore the codebase at {{project.codebase_path}}.

    Focus on these behavioral shapes: {{project.behavior_shapes}}

    Your task:
    1. List ALL source files (file_tree)
    2. Identify potential behavioral areas (auth, state, UI, API, etc.)
    3. For each area, list evidence files that contain the behavior
    4. Flag files that are clearly infrastructure vs business logic

    Output as YAML:
    file_tree: []
    behavior_candidates:
      - id: string
        description: string
        evidence_refs: []
        confidence: 0.0-1.0
  outputs:
    file_tree:
      type: array
      items:
        type: string
    behavior_candidates:
      type: array
      items:
        type: object
        properties:
          id:
            type: string
          description:
            type: string
          evidence_refs:
            type: array
            items:
              type: string
          confidence:
            type: number
        required:
          - id
          - description
          - evidence_refs
- id: analyze
  name: Analyze discovered behaviors for spec-worthiness
  agent: behavior-analyzer
  tools:
    - read
  max_tokens: 12000
  prompt: |
    Analyze these behavior candidates from the exploration step:
    {{prior_outputs.explore.behavior_candidates}}

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
  outputs:
    predicate_inventory:
      type: array
      items:
        type: object
        properties:
          behavior_id:
            type: string
          predicates:
            type: array
            items:
              type: string
          render_mode:
            type: string
            enum:
              - hidden
              - visible-disabled
              - visible-enabled
    behaviors_to_spec:
      type: array
      items:
        type: string
    needs_deeper_exploration:
      type: array
      items:
        type: string
- id: draft
  name: Draft behavioral specs
  agent: spec-writer
  tools:
    - read
    - write
  max_tokens: 16000
  prompt: >
    Draft specs for these behaviors:

    {{prior_outputs.analyze.behaviors_to_spec}}


    Predicate inventory:

    {{prior_outputs.analyze.predicate_inventory}}


    Use schema: schemas/spec.schema.yaml

    Write specs to: runs/{{run_id}}/generator/specs/


    Each spec must include:

    - id, type, version

    - behaviors[] with evidence_refs

    - state_transitions where applicable

    - confidence score

    - evidence_refs[].covers[] as strings only, e.g.
    "condition:route_protection" or "transition:login_success". Do not write
    covers as mappings like { condition: route_protection } or list items like
    "- condition: route_protection".


    YAML safety rules:

    - Quote every inline string containing ":", "|", "{", "}", "[", "]", "#", or
    TypeScript union text.

    - For prose/code containing JSON-like objects, write quoted strings, e.g.
    'Return { success: false, reason: "too_soon" }'.

    - Prefer block scalars for long notes and snippets.


    Output as YAML:

    spec_files: []

    summary: string
  outputs:
    spec_files:
      type: array
      items:
        type: string
    summary:
      type: string
- id: verify
  name: Verify specs against schema
  agent: null
  tool: schema-validator
  inputs:
    specs_dir: runs/{{run_id}}/generator/specs/
    schema: schemas/spec.schema.yaml
  prompt: >
    Validate all specs in runs/{{run_id}}/generator/specs/ against
    schemas/spec.schema.yaml.
  outputs:
    validation_report:
      type: object
      properties:
        valid_specs:
          type: array
          items:
            type: string
        invalid_specs:
          type: array
          items:
            type: object
            properties:
              file:
                type: string
              errors:
                type: array
                items:
                  type: string
        all_valid:
          type: boolean


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
1. Apply the suggested mutation to the formula
2. Produce the COMPLETE updated formula YAML
3. Write it to: /Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/runs/run-0023/mutator/formula-candidate.yaml

Rules:
- Only modify the target step
- Preserve all other steps exactly
- Update the version number
- Add a mutation record to consolidated_mutations
- **Check lesson history for each (failure_type, teaching_method) pair you consider**
- If your proposed approach already FAILED for the same failure_type, you MUST:
  a) Propose a different approach (escalate to next mutation tier), OR
  b) Provide explicit justification for retrying (include in proposed_change.rationale)
- **Anti-contamination: The lesson history shows failure types and success/failure rates, NOT specific behaviors to hunt for. Do NOT encode specific behavioral findings from past runs into the formula. Improve the exploration METHOD (coverage breadth, pattern recognition, schema compliance), not specific targets.**


## Available Tools
You may use these tools: read, write

## Output Schema
You must produce output that conforms to this JSON schema:
{
  "proposed_change": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string"
      },
      "target_step": {
        "type": "string"
      },
      "description": {
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
/Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/.tmp/agent-output-mutate-1777559083222.yaml

## Rules
- Execute ONLY this step. Do not proceed to other steps.
- Use tools to explore the codebase as needed.
- Write your final structured output to the file specified above.
- Do NOT write comments in YAML output (no # lines). Pure YAML only.
- YAML safety is mandatory: quote every string value that contains ': ', '|', '>', '{', '}', '[', ']', '#', quotes, or type-union text. Prefer single-quoted strings and escape embedded single quotes by doubling them.
- Do not assemble ambiguous plain scalars such as notes: A: B or type: "a" | "b"; write them as quoted strings.
- Be concise but thorough.
- If you cannot complete the step, set status: "failed" and explain in failure_reason.
