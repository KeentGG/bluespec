# Concept 3: Spec Production

> Can we produce a behavioral spec YAML file from exploration results?

---

## Goal

Build the spec-generator subagent and spec schema. When the harness spawns it with exploration results, it reads source files and writes real spec YAML with state machines, conditions, and evidence_refs.

---

## Files to Create

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `.opencode/agents/spec-generator.md` | Hidden subagent for spec writing | ~20 |
| `schemas/spec.schema.yaml` | Spec format definition | ~80 |

---

## Implementation Steps

### Step 1: Create `.opencode/agents/spec-generator.md`

```markdown
---
description: Generates behavioral spec YAML from exploration results
mode: subagent
hidden: true
permission:
  read: allow
  glob: allow
  grep: allow
  edit: allow
  bash: deny
  task: deny
---

You are a spec writer. Your job is to produce behavioral spec YAML files.

## Inputs
- Exploration results (behavior_candidates, conditional_flows_discovered)
- Source code files to read for evidence
- Spec schema at schemas/spec.schema.yaml

## Task
1. Read the exploration results provided in your prompt
2. For each behavior candidate, read the source files cited in evidence_refs
3. Write a spec YAML file for each behavior
4. Include real code snippets in evidence_refs (not made up)
5. Include state_machine where behavior is stateful
6. Include conditions where behavior is conditional

## Output Format
Write each spec to: runs/<run-id>/generator/specs/<spec-id>.yaml

Each spec must have:
```yaml
id: kebab-case-id
type: behavioral
version: "1.0"
behaviors:
  - name: behavior name
    description: what it does
    conditions:
      - if: "condition expression"
        then: "what happens"
    evidence_refs:
      - file: src/path/to/file.ts
        lines: "10-25"
        snippet: "actual code"
        covers:
          - "condition:route_protection"
          - "transition:login_success"
state_machine:
  states: [idle, editing, submitting, success, error]
  transitions:
    - from: idle
      to: editing
      guard: "user clicked edit"
      event: click
confidence: 0.85
```

## Rules
- Read actual source files before claiming behavior exists
- Include real code snippets in evidence_refs
- If a claim is not directly observable, REMOVE it
- Do NOT infer behavior from related files unless you read them
- Do NOT attribute conditions to a file unless they appear in that file's code
```

### Step 2: Create `schemas/spec.schema.yaml`

```yaml
type: object
required:
  - id
  - type
  - version
  - behaviors
properties:
  id:
    type: string
    description: Unique identifier (kebab-case)
  type:
    type: string
    enum:
      - behavioral
      - structural
      - integration
  version:
    type: string
  behaviors:
    type: array
    items:
      type: object
      required:
        - name
        - description
        - evidence_refs
      properties:
        name:
          type: string
        description:
          type: string
        conditions:
          type: array
          items:
            type: object
            properties:
              if:
                type: string
              then:
                type: string
        evidence_refs:
          type: array
          items:
            type: object
            required:
              - file
              - snippet
            properties:
              file:
                type: string
              lines:
                type: string
              snippet:
                type: string
              covers:
                type: array
                items:
                  type: string
  state_machine:
    type: object
    properties:
      states:
        type: array
        items:
          type: string
      transitions:
        type: array
        items:
          type: object
          properties:
            from:
              type: string
            to:
              type: string
            guard:
              type: string
            event:
              type: string
  confidence:
    type: number
    minimum: 0
    maximum: 1
```

---

## Verification

1. **Schema is valid YAML:**
   ```bash
   cd prototype/_v02
   node -e "const YAML=require('yaml'); console.log(YAML.parse(require('fs').readFileSync('schemas/spec.schema.yaml','utf8')))"
   ```

2. **Agent appears:**
   - `@spec-generator` responds in chat

3. **Spec is produced:**
   - Harness explores codebase (Concept 2)
   - Harness spawns spec-generator via Task tool
   - Spec-generator writes a spec to `runs/test-001/generator/specs/`
   - Spec has: id, type, version, behaviors[], evidence_refs[]
   - Evidence_refs contain actual code snippets

---

## What This Proves

The core product — behavioral specs with evidence — can be produced:
- Agent reads source files and understands behavior
- Agent writes structured YAML with state machines and conditions
- Evidence_refs point to real code with actual snippets
- Spec follows a defined schema

---

## What Comes Next

Concept 4 (Spec Verification) needs:
- A validate subcommand in cli.js
- Validation logic that checks specs against the schema
