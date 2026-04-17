# Hermes Provider

Future adapter for Hermes-specific execution or hook integration.

Potential uses:
- grounded workflows with stronger hook semantics
- provider-specific tracing or run metadata
- alternate execution model for the same Generator / Evaluator / Analyzer / Mutator roles

Constraint:

Hermes adapter must preserve frozen snapshots, official vs shadow score separation, and governed rubric transitions.
