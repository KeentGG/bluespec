# OpenCode Provider

Future adapter for OpenCode-specific execution.

Potential uses:
- run orchestrated role prompts through OpenCode agents
- map OpenCode tool calls into normalized run artifacts
- attach OpenCode-specific hooks without changing core prototype state

Constraint:

OpenCode adapter must translate into prototype contracts. It should not define the lifecycle rules itself.
