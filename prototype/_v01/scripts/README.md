# Scripts

The prototype should eventually use thin orchestration tooling here.

Recommended first commands:

- `init_run` - materialize `runs/run-000X/manifest.yaml` from current refs
- `validate_artifacts` - validate YAML against schemas
- `freeze_inputs` - copy resolved inputs into a run folder
- `register_rubric_candidate` - store candidate criterion artifact
- `promote_rubric_snapshot` - create next snapshot after governance approval
- `advance_formula` - point `state/current.yaml` to the next approved formula

Implementation direction:

- thin Node CLI
- YAML as canonical input
- JSONL for append-only logs
- no database required for v01

Current commands:

- `npm run init-run`
- `npm run freeze-inputs -- --run-id run-0001`
- `npm run validate -- --run-id run-0001`
- `npm run register-rubric-candidate -- --id conditional_flow_documentation --description "..." --source contextual_inference --run-id run-0001`
