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

  const state = readYamlFile(resolveWorkspacePath('state/current.yaml'));

  const runDir = resolveWorkspacePath(`runs/${runId}`);
  ensureDir(path.join(runDir, 'inputs'));
  ensureDir(path.join(runDir, 'generator/specs'));
  ensureDir(path.join(runDir, 'evaluator'));
  ensureDir(path.join(runDir, 'analyzer'));
  ensureDir(path.join(runDir, 'mutator'));

  const manifest = {
    run_id: runId,
    created_at: timestamp(),
    formula_ref: state.current_formula_ref,
    project_ref: state.current_project_ref,
    golden_set_ref: state.current_golden_set_ref,
    status: 'initialized',
  };
  writeYamlFile(path.join(runDir, 'manifest.yaml'), manifest);

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

  const formulaSrc = resolveWorkspacePath(state.current_formula_ref);
  copyFile(formulaSrc, path.join(runDir, 'inputs/formula.yaml'));
  console.log(`[freeze] Copied formula: ${state.current_formula_ref}`);

  const projectSrc = resolveWorkspacePath(state.current_project_ref);
  copyFile(projectSrc, path.join(runDir, 'inputs/project.yaml'));
  console.log(`[freeze] Copied project: ${state.current_project_ref}`);

  const goldenSrc = resolveWorkspacePath(state.current_golden_set_ref);
  copyFile(goldenSrc, path.join(runDir, 'inputs/golden-set.yaml'));
  console.log(`[freeze] Copied golden set: ${state.current_golden_set_ref}`);

  const resolvedInputs = {
    frozen_at: timestamp(),
    formula_ref: state.current_formula_ref,
    project_ref: state.current_project_ref,
    golden_set_ref: state.current_golden_set_ref,
  };
  writeYamlFile(path.join(runDir, 'inputs/resolved-inputs.yaml'), resolvedInputs);

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
