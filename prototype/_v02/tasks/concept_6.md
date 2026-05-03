# Concept 6: Cross-Run Memory

> Can we track discovered specs across runs so institutional knowledge accumulates?

---

## Goal

The rolling set merge logic was built in Concept 4. This concept proves it works across multiple runs: new specs get added, duplicates get skipped, and stats grow.

---

## Files to Create

No new files. Uses the `rollset` subcommand from Concept 4.

---

## Verification

```bash
cd prototype/_v02

# Run 1: Create and add specs
mkdir -p runs/run-0001/generator/specs
cat > runs/run-0001/generator/specs/auth-login.yaml << 'EOF'
id: auth-login
type: behavioral
version: "1.0"
behaviors:
  - name: Auth Login
    description: User authentication flow
    evidence_refs:
      - file: src/auth.ts
        snippet: "function login() {}"
EOF

cat > runs/run-0001/generator/specs/download-btn.yaml << 'EOF'
id: download-btn
type: behavioral
version: "1.0"
behaviors:
  - name: Download Button
    description: Download button visibility
    evidence_refs:
      - file: src/components/Btn.ts
        snippet: "if (ready) show()"
EOF

node scripts/cli.js rollset --run-id run-0001
cat runs/rollingset/stats.yaml

# Run 2: Add one new spec, one duplicate
mkdir -p runs/run-0002/generator/specs
cat > runs/run-0002/generator/specs/auth-login.yaml << 'EOF'
id: auth-login
type: behavioral
version: "1.0"
behaviors:
  - name: Auth Login
    description: User authentication flow
    evidence_refs:
      - file: src/auth.ts
        snippet: "function login() {}"
EOF

cat > runs/run-0002/generator/specs/new-feature.yaml << 'EOF'
id: new-feature
type: behavioral
version: "1.0"
behaviors:
  - name: New Feature
    description: A new discovered behavior
    evidence_refs:
      - file: src/new.ts
        snippet: "doSomething()"
EOF

node scripts/cli.js rollset --run-id run-0002
cat runs/rollingset/stats.yaml
cat runs/rollingset/index.yaml
```

**Expected:**
- After run-0001: `total_specs: 2`, index has auth-login and download-btn
- After run-0002: `total_specs: 3`, `added_this_run: 1`, `skipped_this_run: 1`
- auth-login NOT duplicated (skipped)
- new-feature added

---

## What This Proves

Institutional knowledge accumulates:
- Unique specs persist across runs
- Duplicates are caught and skipped
- Stats track growth over time
- The analyzer (Concept 7) can compare current run vs rolling set

---

## What Comes Next

Concept 7 (Failure Diagnosis) needs:
- An analyzer subagent that reads evaluator output + rolling set + lessons
- The 5-type failure taxonomy (defined in Concept 2)
