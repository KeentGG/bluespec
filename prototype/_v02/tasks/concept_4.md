# Concept 4: Spec Verification

> Can we validate specs against the schema and check cross-references?

---

## Goal

Add `validate` and `rollset` subcommands to cli.js. Validate checks specs against the schema and verifies cross-references resolve. Rollset merges new unique specs into the rolling set.

---

## Files to Create/Modify

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `scripts/cli.js` | Add `validate` and `rollset` subcommands | ~120 (modified) |
| `scripts/lib/validation.js` | Schema + cross-ref validation | ~60 |

---

## Implementation Steps

### Step 1: Create `scripts/lib/validation.js`

```javascript
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

function validateSpec(spec, schema) {
  const errors = [];

  // Required fields
  if (!spec.id) errors.push('Missing required field: id');
  if (!spec.type) errors.push('Missing required field: type');
  if (!spec.version) errors.push('Missing required field: version');
  if (!spec.behaviors || !Array.isArray(spec.behaviors)) {
    errors.push('Missing or invalid field: behaviors');
  }

  // Validate behaviors
  if (spec.behaviors) {
    spec.behaviors.forEach((behavior, i) => {
      if (!behavior.name) errors.push(`Behavior[${i}]: Missing name`);
      if (!behavior.description) errors.push(`Behavior[${i}]: Missing description`);
      if (!behavior.evidence_refs || !Array.isArray(behavior.evidence_refs)) {
        errors.push(`Behavior[${i}]: Missing evidence_refs`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateCrossRefs(specs) {
  const broken = [];
  const specIds = new Set(specs.map(s => s.id));

  // Collect all defined transitions, conditions, etc.
  const definedRefs = new Set();
  specs.forEach(spec => {
    if (spec.state_machine && spec.state_machine.transitions) {
      spec.state_machine.transitions.forEach(t => {
        definedRefs.add(`${spec.id}:${t.from}:${t.to}`);
      });
    }
  });

  // Check references
  specs.forEach(spec => {
    if (spec.behaviors) {
      spec.behaviors.forEach(behavior => {
        if (behavior.evidence_refs) {
          behavior.evidence_refs.forEach(ref => {
            if (ref.covers) {
              ref.covers.forEach(cover => {
                // Parse cover reference
                const parts = cover.split(':');
                if (parts.length === 2) {
                  const [refType, refName] = parts;
                  // Check if referenced spec exists
                  if (refType === 'spec' && !specIds.has(refName)) {
                    broken.push({
                      spec: spec.id,
                      reference: cover,
                      reason: `Spec "${refName}" not found`,
                    });
                  }
                }
              });
            }
          });
        }
      });
    }
  });

  return { broken, total: specs.length, brokenCount: broken.length };
}

module.exports = { validateSpec, validateCrossRefs };
```

### Step 2: Update `scripts/cli.js` — Add validate subcommand

Add after the `freezeInputs` function:

```javascript
function validateSpecs(runId) {
  console.log(`[validate] Validating specs for: ${runId}`);

  const runDir = resolveWorkspacePath(`runs/${runId}`);
  const specsDir = path.join(runDir, 'generator/specs');

  if (!fileExists(specsDir)) {
    console.error(`[validate] No specs directory found at runs/${runId}/generator/specs/`);
    process.exit(1);
  }

  const { validateSpec, validateCrossRefs } = require('./lib/validation');

  // Find all spec files
  const specFiles = fs.readdirSync(specsDir)
    .filter(f => f.endsWith('.yaml'))
    .map(f => path.join(specsDir, f));

  if (specFiles.length === 0) {
    console.log(`[validate] No spec files found.`);
    return;
  }

  const results = { valid: [], invalid: [] };

  specFiles.forEach(filePath => {
    const spec = readYamlFile(filePath);
    const result = validateSpec(spec, null);

    if (result.valid) {
      results.valid.push(path.basename(filePath));
    } else {
      results.invalid.push({
        file: path.basename(filePath),
        errors: result.errors,
      });
    }
  });

  // Cross-ref check
  const specs = specFiles.map(f => readYamlFile(f));
  const crossRefResult = validateCrossRefs(specs);

  // Write verification report
  const output = {
    run_id: runId,
    validated_at: timestamp(),
    schema_check: {
      valid_specs: results.valid,
      invalid_specs: results.invalid,
      all_valid: results.invalid.length === 0,
    },
    cross_ref_check: {
      total_specs: crossRefResult.total,
      broken_refs: crossRefResult.broken,
      all_resolved: crossRefResult.brokenCount === 0,
    },
  };

  const verifierDir = path.join(runDir, 'verifier');
  ensureDir(verifierDir);
  writeYamlFile(path.join(verifierDir, 'output.yaml'), output);

  console.log(`[validate] Schema: ${results.valid.length} valid, ${results.invalid.length} invalid`);
  console.log(`[validate] Cross-refs: ${crossRefResult.total - crossRefResult.brokenCount} resolved, ${crossRefResult.brokenCount} broken`);
  console.log(`[validate] Report written to runs/${runId}/verifier/output.yaml`);
}

function rollset(runId) {
  console.log(`[rollset] Merging specs into rolling set from: ${runId}`);

  const runDir = resolveWorkspacePath(`runs/${runId}`);
  const specsDir = path.join(runDir, 'generator/specs');
  const rollingDir = resolveWorkspacePath('runs/rollingset');
  const rollingSpecsDir = path.join(rollingDir, 'specs');

  ensureDir(rollingSpecsDir);

  // Load rolling set index
  const indexPath = path.join(rollingDir, 'index.yaml');
  let rollingIndex = { specs: {} };
  if (fileExists(indexPath)) {
    rollingIndex = readYamlFile(indexPath);
  }

  // Find current run's specs
  if (!fileExists(specsDir)) {
    console.log(`[rollset] No specs found in runs/${runId}/generator/specs/`);
    return;
  }

  const specFiles = fs.readdirSync(specsDir)
    .filter(f => f.endsWith('.yaml'));

  let added = 0;
  let skipped = 0;

  specFiles.forEach(fileName => {
    const specId = fileName.replace('.yaml', '');
    if (!rollingIndex.specs[specId]) {
      // New spec — add to rolling set
      const srcPath = path.join(specsDir, fileName);
      const destPath = path.join(rollingSpecsDir, fileName);
      fs.copyFileSync(srcPath, destPath);

      rollingIndex.specs[specId] = {
        added_in_run: runId,
        added_at: timestamp(),
        source_file: `runs/${runId}/generator/specs/${fileName}`,
      };
      added++;
    } else {
      skipped++;
    }
  });

  // Update index
  writeYamlFile(indexPath, rollingIndex);

  // Update stats
  const stats = {
    total_specs: Object.keys(rollingIndex.specs).length,
    last_updated: timestamp(),
    last_run: runId,
    added_this_run: added,
    skipped_this_run: skipped,
  };
  writeYamlFile(path.join(rollingDir, 'stats.yaml'), stats);

  console.log(`[rollset] Added: ${added}, Skipped: ${skipped}, Total: ${stats.total_specs}`);
}
```

### Step 3: Update CLI Router

Add to the command router at the bottom of cli.js:

```javascript
} else if (cmd === 'validate') {
  const runId = args['run-id'];
  if (!runId) {
    console.error('Usage: node scripts/cli.js validate --run-id <run-id>');
    process.exit(1);
  }
  validateSpecs(runId);
} else if (cmd === 'rollset') {
  const runId = args['run-id'];
  if (!runId) {
    console.error('Usage: node scripts/cli.js rollset --run-id <run-id>');
    process.exit(1);
  }
  rollset(runId);
}
```

---

## Verification

```bash
cd prototype/_v02

# Create a test spec file manually
mkdir -p runs/test-001/generator/specs
cat > runs/test-001/generator/specs/test-behavior.yaml << 'EOF'
id: test-behavior
type: behavioral
version: "1.0"
behaviors:
  - name: Test Behavior
    description: A test behavior for validation
    evidence_refs:
      - file: src/test.ts
        snippet: "console.log('test')"
EOF

# Validate it
node scripts/cli.js validate --run-id test-001
cat runs/test-001/verifier/output.yaml

# Roll it into the rolling set
node scripts/cli.js rollset --run-id test-001
cat runs/rollingset/index.yaml
cat runs/rollingset/stats.yaml
```

**Expected:**
- Validate report shows 1 valid spec, 0 invalid
- Cross-ref check passes (no broken refs)
- Rolling set index has `test-behavior` entry
- Stats show `total_specs: 1`

---

## What This Proves

Quality gates work:
- Invalid specs get caught before evaluation
- Cross-references are checked for resolution
- Rolling set accumulates unique specs across runs
- Institutional knowledge persists

---

## What Comes Next

Concept 5 (Golden Evaluation) needs:
- An evaluator subagent that reads specs + golden set + source code
- Binary found/not-found evaluation per behavior
