# Hooks

Hooks are optional extension points.

They are meant for:
- notifications
- exports
- audit logging
- external workflow triggers
- provider-specific enrichments

They are **not** meant for:
- directly editing active rubric snapshots
- promoting criteria without governance
- mutating formula state outside the orchestrator path

Available hook folders:
- `pre-run/`
- `post-run/`
- `pre-agent/`
- `post-agent/`
- `on-rubric-candidate/`
- `on-formula-promote/`
