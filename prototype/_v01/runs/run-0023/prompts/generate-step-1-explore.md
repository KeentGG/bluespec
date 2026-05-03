You are executing a single step in a spec generation pipeline.

## Step: explore

## CRITICAL: Codebase Location
The codebase is at: /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2

When reading source files, ALWAYS use the full path:
  /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2/src/features/auth/api/auth-service.js  ← CORRECT

NEVER read files relative to the prototype workspace:
  src/features/auth/api/auth-service.js  ← WRONG (resolves to prototype workspace)

## Instructions
Explore the codebase at /Volumes/Keen/Desk/Career/Valhalla/EOYT/dashboard-v2.

Focus on these behavioral shapes: - auth_flow
- stateful_ui


Your task:
1. List ALL source files (file_tree)
2. Identify potential behavioral areas (auth, state, UI, API, etc.)
3. For each area, list evidence files that contain the behavior
4. Flag files that are clearly infrastructure vs business logic

Output as YAML:
file_tree: []
behavior_candidates:
  - id: string
    description: string
    evidence_refs: []
    confidence: 0.0-1.0


## Available Tools
You may use these tools: glob, grep, read

## Output Schema
You must produce output that conforms to this JSON schema:
{
  "file_tree": {
    "type": "array",
    "items": {
      "type": "string"
    }
  },
  "behavior_candidates": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "evidence_refs": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "confidence": {
          "type": "number"
        }
      },
      "required": [
        "id",
        "description",
        "evidence_refs"
      ]
    }
  }
}

Format your response as YAML.

## Output Destination
Write your final output as YAML to this exact file:
/Volumes/Keen/Desk/Career/Personal/Playground/FrameworksAI/blueprint-mode/prototype/_v01/.tmp/agent-output-explore-1777558090574.yaml

## Rules
- Execute ONLY this step. Do not proceed to other steps.
- Use tools to explore the codebase as needed.
- Write your final structured output to the file specified above.
- Do NOT write comments in YAML output (no # lines). Pure YAML only.
- YAML safety is mandatory: quote every string value that contains ': ', '|', '>', '{', '}', '[', ']', '#', quotes, or type-union text. Prefer single-quoted strings and escape embedded single quotes by doubling them.
- Do not assemble ambiguous plain scalars such as notes: A: B or type: "a" | "b"; write them as quoted strings.
- Be concise but thorough.
- If you cannot complete the step, set status: "failed" and explain in failure_reason.
