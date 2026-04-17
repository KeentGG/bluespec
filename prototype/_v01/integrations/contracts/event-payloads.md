# Event Payloads

Suggested lifecycle events:

- `run.prepared`
- `agent.started`
- `agent.completed`
- `rubric.candidate_detected`
- `formula.candidate_created`
- `run.completed`

Minimum payload fields:

- `event_id`
- `event_type`
- `run_id`
- `timestamp`
- `role`
- `artifact_refs`
- `provider`

Important:

- events are observational by default
- hooks may enrich or forward events
- events must not bypass lifecycle validation
