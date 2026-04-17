# Integrations

Provider-neutral integration layer for future execution backends and workflow hooks.

Subfolders:
- `contracts/` normalized interfaces and event payloads
- `providers/` backend-specific adapters
- `hooks/` optional lifecycle extension points

Integrations must adapt to the prototype contracts, not redefine state rules.
