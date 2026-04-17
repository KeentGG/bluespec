# Runner API Contract

Providers should implement a normalized runner contract with these responsibilities:

1. materialize run inputs from frozen refs
2. invoke role-specific agents or local steps
3. write outputs to `runs/<run-id>/...`
4. emit lifecycle events without mutating governed state directly

Minimum runner operations:
- `prepare_run`
- `run_generator`
- `run_evaluator`
- `run_analyzer`
- `run_mutator`
- `finalize_run`

Provider adapters may add extra capability, but the prototype should only rely on the normalized contract.
