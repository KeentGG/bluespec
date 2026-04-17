# Failure Types

Use these labels consistently:

- `search_failure`
- `recognition_failure`
- `format_failure`
- `prompt_failure`
- `rubric_gap_failure`

## Rule

`rubric_gap_failure` is only valid when the current rubric genuinely lacks a criterion that should have penalized the miss.

It should not be used when:
- the agent failed to inspect the right files
- the agent saw the behavior but failed to interpret it
- the schema already had a place for the behavior
- the prompt chain already asked for the behavior class
