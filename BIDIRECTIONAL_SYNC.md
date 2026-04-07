# Bidirectional Sync Deep Dive

> How code and specs stay aligned — the core technical challenge.
> Status: BRAINSTORM — hardest problem to solve.

---

## The Fundamental Problem

Specs are **intent**, code is **implementation**.

When they diverge, who is right?

```
Scenario A: Spec is source of truth
  Dev edits code directly → Code diverges from spec
  → Sync should update spec to match new code

Scenario B: Spec drives implementation  
  Dev edits spec to change behavior
  → Sync should update code to match new spec

Scenario C: Both changed (conflict)
  Dev edits both independently
  → Human must resolve
```

---

## Sync Triggers

### Automatic Triggers

| Event | Action |
|-------|--------|
| Git commit | Run `blueprint sync --detect-only` |
| Pre-push | Validate no un-synced drift |
| CI/CD | Block if specs out of sync |
| Scheduled | Daily full sync check |

### Manual Triggers

```bash
blueprint sync              # Full sync
blueprint sync --detect     # Just detect, don't apply
blueprint sync --to-spec    # Only code → spec
blueprint sync --to-code    # Only spec → code
```

---

## Sync Algorithm

### Phase 1: Detect Changes

```python
def detect_changes():
    changes = []
    
    for spec in all_canonical_specs:
        source_ref = spec.source_refs[0]  # Primary source
        current_hash = hash_file(source_ref.file)
        stored_hash = spec.meta.source_hash
        
        if current_hash != stored_hash:
            # Something changed
            diff = git_diff(stored_hash, current_hash)
            
            changes.append({
                'spec_id': spec.spec_id,
                'type': 'code_changed',
                'diff': diff
            })
    
    return changes
```

### Phase 2: Analyze Intent

For code changes, determine if they are:

```yaml
change_types:
  refactor:
    description: "Restructuring, no behavior change"
    examples: ["rename variable", "extract function"]
    action: "update_spec_structure_only"
    
  implementation_detail:
    description: "Different approach, same contract"
    examples: ["change loop to map", "add caching"]
    action: "update_spec_implementation_notes"
    
  bugfix:
    description: "Fixed incorrect behavior"
    examples: ["fix off-by-one error"]
    action: "update_spec_edge_cases"
    
  feature:
    description: "New behavior added"
    examples: ["add parameter", "new error case"]
    action: "flag_for_spec_review"
    
  breaking:
    description: "Contract changed"
    examples: ["remove parameter", "change return type"]
    action: "flag_as_conflict"
```

**Agent-Powered Analysis:**

The sync agent doesn't just diff text — it **understands semantic changes**:

```
Input: diff of auth/login.ts

Agent analysis:
  - Function signature unchanged ✓
  - Added parameter `options.rememberMe` (optional) → feature
  - Error handling unchanged ✓
  - Added side effect: sets cookie → implementation_detail

Recommendation:
  - Update FunctionSpec.inputs to include new parameter
  - Update FunctionSpec.side_effects to mention cookie
  - Mark as non-breaking change
```

### Phase 3: Resolve

```
For each change:
  IF code_changed AND NOT spec_changed:
     → Analyze with agent
     → IF analysis.confident:
          Apply auto-update to spec
        ELSE:
          Flag for human review
          
  IF spec_changed AND NOT code_changed:
     → Run implementation agent
     → Generate code changes
     → IF tests pass:
          Commit code update
        ELSE:
          Flag for human review
          
  IF code_changed AND spec_changed:
     → Compare change timestamps
     → Analyze both changes
     → IF compatible:
          Merge
        ELSE:
          Flag as CONFLICT
```

---

## Conflict Resolution

### Conflict Types

| Type | Description | Resolution |
|------|-------------|------------|
| Signature | Code changed function signature | Human must choose correct signature |
| Logic | Different implementation approach | Human reviews both, picks or merges |
| Edge Case | Code handles cases not in spec | Add to spec or remove from code |
| Removal | Code deleted, spec exists | Archive spec or restore code |
| Orphan | Spec exists, code doesn't exist | Flag for cleanup |

### Conflict UI

```
┌─────────────────────────────────────────────────────────────┐
│ CONFLICT: auth.login                                        │
│                                                             │
│ Both code and spec have changed since last sync.            │
│                                                             │
│ CODE CHANGES (by dev@example.com 2h ago):                   │
│   + Added parameter: rememberMe: boolean                     │
│   + New side effect: sets persistent cookie                │
│                                                             │
│ SPEC CHANGES (by agent, 1h ago):                            │
│   + Added edge case: concurrent_session_limit              │
│   - Removed: rememberMe parameter (not in code)            │
│                                                             │
│ Analysis: These changes are COMPATIBLE but divergent.       │
│                                                             │
│ Options:                                                    │
│   [1] Merge both: Add rememberMe AND concurrent_session    │
│   [2] Prefer code: Discard concurrent_session edge case    │
│   [3] Prefer spec: Remove rememberMe from code             │
│   [4] Edit manually                                        │
│   [s] Skip for now                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Storage of Sync State

```yaml
# /blueprints/meta/sync-state.yaml

sync_version: "0.1.0"
last_full_sync: "2026-04-04T12:00:00Z"

spec_states:
  auth.login:
    status: "synced"
    last_sync: "2026-04-04T10:00:00Z"
    code_hash: "abc123..."
    spec_hash: "def456..."
    
  payments.process:
    status: "drift_detected"
    last_sync: "2026-04-03T15:00:00Z"
    code_hash: "old789..."
    spec_hash: "same456..."
    drift_detected_at: "2026-04-04T11:30:00Z"
    drift_type: "implementation_detail"
    pending_action: "auto_update_pending"
    
  auth.register:
    status: "conflict"
    last_sync: "2026-04-02T09:00:00Z"
    code_hash: "conflict1..."
    spec_hash: "conflict2..."
    conflict_detected_at: "2026-04-04T08:00:00Z"
    conflict_type: "signature_mismatch"
    requires_human: true
```

---

## Sync Confidence Scoring

Agents assign confidence to sync recommendations:

```yaml
confidence_factors:
  - signature_match: 1.0            # Signature identical
  - signature_compatible: 0.8     # Added optional param
  - signature_breaking: 0.0         # Changed required param
  
  - test_coverage: 0.0-1.0         # Based on test pass rate
  - documentation_match: 0.0-1.0     # Comments match behavior
  - pattern_consistency: 0.0-1.0    # Matches project patterns

auto_apply_threshold: 0.85         # Auto-apply if confidence > this
review_threshold: 0.50             # Flag for review if < this
block_threshold: 0.20              # Block if < this (major issue)
```

---

## Git Integration

### Pre-Commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "Running blueprint sync check..."

# Detect drift
DRIFT=$(blueprint sync --detect --format=json)

if echo "$DRIFT" | grep -q "conflict"; then
    echo "ERROR: Blueprint conflicts detected. Run 'blueprint sync --interactive'"
    exit 1
fi

if echo "$DRIFT" | grep -q "drift_detected"; then
    echo "WARNING: Spec drift detected. Run 'blueprint sync' to update."
    # Allow commit but warn
fi

exit 0
```

### Sync Commits

```
[blueprint] Sync: auth.login

- Code added optional parameter: rememberMe
- Updated FunctionSpec.inputs
- Confidence: 0.92
- Agent: sync-v1.2.0
```

---

## Performance Considerations

### Incremental Sync

Don't re-analyze everything:

```python
def incremental_sync():
    changed_files = get_git_changed_files()
    affected_specs = map_files_to_specs(changed_files)
    
    for spec in affected_specs:
        analyze_and_sync(spec)
```

### Caching

```yaml
# Cache expensive analyses
cache:
  ast_parsed: 24h
  agent_exploration: 1h
  dependency_graph: 5m
```

---

## Open Questions

1. How do we handle long-running sync operations (hours for large codebases)?
2. Should sync be blocking (CI fails) or advisory (warnings)?
3. How do we recover from "sync went wrong" scenarios?
4. What's the story for teams without AI agents (fallback mode)?
5. How do we sync across branches (feature branches vs main)?
