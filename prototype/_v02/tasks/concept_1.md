# Concept 1: Run Scaffold

> Can we create a run with frozen inputs that will be immutable during the run?

---

## Goal

Build the mechanical lifecycle foundation: create a run folder, freeze inputs (formula, project, golden set) so they can't change during the run, and prove it works by running init + freeze on a sample project.

---

## Files to Create

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `scripts/cli.js` | CLI entry point with subcommands | ~80 |
| `scripts/lib/common.js` | Shared utilities (YAML, file ops) | ~60 |
| `state/current.yaml` | Active formula, project, run counter | 12 |
| `config/prototype.yaml` | Sample project config | 8 |
| `formulas/seed/frontend.yaml` | Seed formula | 14 |
| `goldens/projects/sample-project/behaviors.yaml` | Sample golden set | 40 |

---

## Implementation Steps

### Step 1: Create `state/current.yaml`

This is the mutable pointer file. It tracks which formula, project, and golden set are active.

```yaml
current_formula_ref: formulas/seed/frontend.yaml
current_project_ref: config/prototype.yaml
current_golden_set_ref: goldens/projects/sample-project/behaviors.yaml
next_run_id: run-0001
last_prepared_run_id: null
```

### Step 2: Create `config/prototype.yaml`

Defines the target project for evolution runs.

```yaml
project_id: sample-project
ecosystem: frontend
codebase_path: /path/to/your/project
behavior_shapes:
  - stateful_ui
  - conditional_flow
```

> **Note:** Replace `codebase_path` with a real path to test on.

### Step 3: Create `formulas/seed/frontend.yaml`

The initial formula for frontend projects. v02 uses flat formulas (no `extends` chain).

```yaml
id: frontend-seed
version: v001
ecosystem: frontend
behavior_shapes:
  - stateful_ui
  - conditional_flow
steps:
  - id: explore
    name: Explore codebase structure
    prompt: |
      Explore the codebase at {{project.codebase_path}}.
      Focus on: {{project.behavior_shapes}}
      List all source files, identify behavioral areas, map evidence files.
    outputs:
      - file_tree
      - behavior_candidates
  - id: analyze
    name: Analyze behaviors
    prompt: |
      Analyze these behavior candidates from exploration:
      {{prior_outputs.explore.behavior_candidates}}
      Filter to high-confidence, produce predicate inventory.
    outputs:
      - predicate_inventory
      - behaviors_to_spec
  - id: draft
    name: Draft specs
    prompt: |
      Draft specs for these behaviors:
      {{prior_outputs.analyze.behaviors_to_spec}}
      Use schema: schemas/spec.schema.yaml
    outputs:
      - spec_files
  - id: verify
    name: Verify specs
    prompt: |
      Validate all specs against schemas/spec.schema.yaml.
    outputs:
      - validation_report
mutation_tiers:
  - prompt_tweak
  - step_management
  - parent_guideline
  - schema_change
  - tool_change
  - rubric_mutation
```

### Step 4: Create `goldens/projects/sample-project/behaviors.yaml`

Human-curated known behaviors for the sample project.

```yaml
project_id: sample-project
ecosystem: frontend
behaviors:
  - id: auth-conditional-redirect
    description: editing project routes through a gated edit flow only when agreement state is satisfied
    priority: high
    category: conditional_flow
    evidence_refs:
      - src/routes/project-edit.tsx
  - id: download-button-visibility
    description: download button becomes visible only after report progress reaches the download stage
    priority: high
    category: state_dependent_visibility
    evidence_refs:
      - src/components/ReportActions.tsx
  - id: conditional-rendering
    description: components that show/hide/disable elements based on state
    priority: medium
    category: state_dependent_visibility
    evidence_refs: []
```

### Step 5: Create `scripts/lib/common.js`

Shared utilities. Keep minimal for now.

```javascript
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');

function resolveWorkspacePath(relativePath) {
  return path.join(WORKSPACE_ROOT, relativePath);
}

function readYamlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return YAML.parse(content);
}

function writeYamlFile(filePath, data) {
  const content = YAML.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, 'utf8');
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function timestamp() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

module.exports = {
  resolveWorkspacePath,
  readYamlFile,
  writeYamlFile,
  fileExists,
  ensureDir,
  copyFile,
  timestamp,
  parseArgs,
  WORKSPACE_ROOT,
};
```

### Step 6: Create `scripts/cli.js`

Thin CLI with `init` and `freeze` subcommands.

```javascript
#!/usr/bin/env node

const path = require('path');
const {
  resolveWorkspacePath,
  readYamlFile,
  writeYamlFile,
  fileExists,
  ensureDir,
  copyFile,
  timestamp,
  parseArgs,
} = require('./lib/common');

function initRun(runId) {
  console.log(`[init] Creating run: ${runId}`);

  // Read current state
  const state = readYamlFile(resolveWorkspacePath('state/current.yaml'));

  // Create run directory
  const runDir = resolveWorkspacePath(`runs/${runId}`);
  ensureDir(path.join(runDir, 'inputs'));
  ensureDir(path.join(runDir, 'generator/specs'));
  ensureDir(path.join(runDir, 'evaluator'));
  ensureDir(path.join(runDir, 'analyzer'));
  ensureDir(path.join(runDir, 'mutator'));

  // Write manifest
  const manifest = {
    run_id: runId,
    created_at: timestamp(),
    formula_ref: state.current_formula_ref,
    project_ref: state.current_project_ref,
    golden_set_ref: state.current_golden_set_ref,
    status: 'initialized',
  };
  writeYamlFile(path.join(runDir, 'manifest.yaml'), manifest);

  // Update state
  state.last_prepared_run_id = runId;
  writeYamlFile(resolveWorkspacePath('state/current.yaml'), state);

  console.log(`[init] Created runs/${runId}/manifest.yaml`);
  return runId;
}

function freezeInputs(runId) {
  console.log(`[freeze] Freezing inputs for: ${runId}`);

  const state = readYamlFile(resolveWorkspacePath('state/current.yaml'));
  const runDir = resolveWorkspacePath(`runs/${runId}`);

  if (!fileExists(path.join(runDir, 'manifest.yaml'))) {
    console.error(`[freeze] Run ${runId} not initialized. Run init first.`);
    process.exit(1);
  }

  // Copy formula
  const formulaSrc = resolveWorkspacePath(state.current_formula_ref);
  copyFile(formulaSrc, path.join(runDir, 'inputs/formula.yaml'));
  console.log(`[freeze] Copied formula: ${state.current_formula_ref}`);

  // Copy project config
  const projectSrc = resolveWorkspacePath(state.current_project_ref);
  copyFile(projectSrc, path.join(runDir, 'inputs/project.yaml'));
  console.log(`[freeze] Copied project: ${state.current_project_ref}`);

  // Copy golden set
  const goldenSrc = resolveWorkspacePath(state.current_golden_set_ref);
  copyFile(goldenSrc, path.join(runDir, 'inputs/golden-set.yaml'));
  console.log(`[freeze] Copied golden set: ${state.current_golden_set_ref}`);

  // Write resolved inputs metadata
  const resolvedInputs = {
    frozen_at: timestamp(),
    formula_ref: state.current_formula_ref,
    project_ref: state.current_project_ref,
    golden_set_ref: state.current_golden_set_ref,
  };
  writeYamlFile(path.join(runDir, 'inputs/resolved-inputs.yaml'), resolvedInputs);

  // Update manifest status
  const manifest = readYamlFile(path.join(runDir, 'manifest.yaml'));
  manifest.status = 'frozen';
  manifest.frozen_at = timestamp();
  writeYamlFile(path.join(runDir, 'manifest.yaml'), manifest);

  console.log(`[freeze] Inputs frozen. Run ${runId} is ready.`);
}

// --- CLI Router ---

const args = parseArgs(process.argv);
const cmd = process.argv[2];

if (cmd === 'init') {
  const runId = args['run-id'];
  if (!runId) {
    console.error('Usage: node scripts/cli.js init --run-id <run-id>');
    process.exit(1);
  }
  initRun(runId);
} else if (cmd === 'freeze') {
  const runId = args['run-id'];
  if (!runId) {
    console.error('Usage: node scripts/cli.js freeze --run-id <run-id>');
    process.exit(1);
  }
  freezeInputs(runId);
} else {
  console.error(`Unknown command: ${cmd}`);
  console.error('Available commands: init, freeze');
  process.exit(1);
}
```

---

## Verification

```bash
cd prototype/_v02

# Initialize a run
node scripts/cli.js init --run-id test-001

# Check manifest was created
cat runs/test-001/manifest.yaml

# Freeze inputs
node scripts/cli.js freeze --run-id test-001

# Check frozen inputs
cat runs/test-001/inputs/formula.yaml
cat runs/test-001/inputs/project.yaml
cat runs/test-001/inputs/golden-set.yaml
cat runs/test-001/inputs/resolved-inputs.yaml

# Check state was updated
cat state/current.yaml
```

**Expected output:**
- `runs/test-001/manifest.yaml` exists with `status: frozen`
- `runs/test-001/inputs/` contains formula, project, golden-set, resolved-inputs
- `state/current.yaml` has `last_prepared_run_id: test-001`

---

## What This Proves

The mechanical lifecycle foundation works:
- Runs are isolated (each gets its own folder)
- Inputs are immutable (copied into run, never referenced externally)
- State tracks which runs exist and what was frozen
- Reproducible: same inputs → same run → same evaluation

---

## What Comes Next

Concept 2 (Exploration) needs:
- A harness agent definition that can explore codebases
- The formula from this concept's `inputs/formula.yaml` to guide exploration
