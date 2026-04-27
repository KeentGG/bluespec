# Failure Types

Use these labels consistently:

- `search_failure`
- `recognition_failure`
- `format_failure`
- `prompt_failure`
- `rubric_gap_failure`

## Decision Tree

Apply in order. Stop at the first matching type.

### 1. `search_failure` — Generator never found the relevant files

**Signal**: Generator explore step has `files_analyzed: []` or key files are absent from the list. No behavioral artifacts produced for this area.

**Rule out**: If files were analyzed and behavioral artifacts exist, continue to step 2.

### 2. `recognition_failure` — Generator found the files but collapsed or misidentified the pattern

**Signal**: Explore step identified the files, but draft step did not enumerate the behavior as a spec section. The spec exists but the section is missing, empty, or monolithic.

**Rule out**: If the spec has a dedicated section for the missed behavior, continue to step 3.

### 3. `format_failure` — Generator produced output that doesn't match the spec schema

**Signal**: Validation errors or inconsistent field coverage. Spec exists with correct structure but wrong values.

**Rule out**: If schema is satisfied, continue to step 4.

### 4. `prompt_failure` — The formula's own instructions should have asked for this behavior

**Signal**: The formula's explore/analyze/draft step prompts do not list this behavior class as a required output or section. The formula never asked for it.

**Check**: Compare the missed behavior against `formula.steps[].outputs` and `formula.validations`.

**Rule out**: If the formula's own prompts already list this behavior class, continue to step 5.

### 5. `rubric_gap_failure` — The rubric genuinely lacks a criterion for this behavior

**Signal**: The evaluator shadow findings include this criterion in `rubric_gap_candidates`. The behavior was produced by the formula (step 4 passes) but no rubric criterion penalizes its absence.

**Check**: Verify the criterion does not appear in `rubric.active_criteria`.

**This is the only valid use of `rubric_gap_failure`.**

## Rules

- `rubric_gap_failure` is only valid when the current rubric genuinely lacks a criterion that should have penalized the miss.
- It should NOT be used when:
  - the agent failed to inspect the right files (→ search_failure)
  - the agent saw the behavior but failed to interpret it (→ recognition_failure)
  - the schema already had a place for the behavior (→ format_failure)
  - the formula's own prompts already asked for the behavior class (→ prompt_failure)
- Exhaust lower-tier explanations before proposing rubric gaps.
