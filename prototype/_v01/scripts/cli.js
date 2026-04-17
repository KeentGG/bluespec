#!/usr/bin/env node

const path = require('path');

const {
  copyFile,
  ensureDir,
  fileExists,
  getCurrentState,
  getQueueState,
  incrementRunId,
  incrementVersion,
  listDir,
  parseArgs,
  readYamlFile,
  resolveWorkspacePath,
  timestamp,
  writeCurrentState,
  writeQueueState,
  writeYamlFile,
} = require('./lib/common');
const { validateArtifactsForRun, validateFile } = require('./lib/validation');

function usage() {
  console.log(`Usage:
  node scripts/cli.js init_run [--run-id run-0001]
  node scripts/cli.js freeze_inputs --run-id run-0001
  node scripts/cli.js validate_artifacts [--run-id run-0001] [--candidate id]
  node scripts/cli.js register_rubric_candidate --id criterion_id --description "..." --source contextual_inference --run-id run-0001 [--confidence 0.8] [--rationale "..."] [--recommended-state probation] [--evidence ref1,ref2]
  node scripts/cli.js register_rubric_candidate --file rubrics/candidates/example.yaml
  node scripts/cli.js approve_rubric_candidate --id conditional_flow_documentation [--target-state probation] [--notes "..."]
  node scripts/cli.js reject_rubric_candidate --id conditional_flow_documentation --reason "..." [--notes "..."]
  node scripts/cli.js promote_rubric_snapshot [--version v002] [--notes "..."]
  node scripts/cli.js register_formula_candidate --file formulas/candidates/example.yaml
  node scripts/cli.js advance_formula --id frontend-v002 [--notes "..."]
  node scripts/cli.js validate_seed_rubrics`);
}

function initRun(args) {
  const state = getCurrentState();
  const runId = args['run-id'] || state.next_run_id;
  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));

  if (fileExists(runRoot)) {
    throw new Error(`Run already exists: ${runId}`);
  }

  ['inputs', 'generator', 'evaluator', 'analyzer', 'mutator'].forEach((dir) => {
    ensureDir(path.join(runRoot, dir));
  });

  const manifest = {
    run_id: runId,
    formula_ref: state.current_formula_ref,
    rubric_snapshot_ref: state.current_rubric_snapshot_ref,
    golden_set_ref: state.current_golden_set_ref,
    project_ref: state.current_project_ref,
    mode: state.mode || 'official',
    created_at: timestamp(),
    lifecycle_policy: {
      same_run_rubric_activation: false,
      official_uses_shadow_criteria: false,
    },
  };

  writeYamlFile(path.join(runRoot, 'manifest.yaml'), manifest);

  state.next_run_id = incrementRunId(runId);
  state.last_prepared_run_id = runId;
  writeCurrentState(state);

  console.log(`Initialized ${runId}`);
}

function freezeInputs(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const manifestPath = path.join(runRoot, 'manifest.yaml');
  if (!fileExists(manifestPath)) {
    throw new Error(`Manifest not found for ${runId}`);
  }

  const manifest = readYamlFile(manifestPath);
  const inputsDir = path.join(runRoot, 'inputs');
  ensureDir(inputsDir);

  const copies = [
    [manifest.formula_ref, 'formula.yaml'],
    [manifest.rubric_snapshot_ref, 'rubric.yaml'],
    [manifest.golden_set_ref, 'golden-set.yaml'],
    [manifest.project_ref, 'project.yaml'],
  ];

  copies.forEach(([sourceRef, targetName]) => {
    copyFile(resolveWorkspacePath(sourceRef), path.join(inputsDir, targetName));
  });

  writeYamlFile(path.join(inputsDir, 'resolved-inputs.yaml'), {
    run_id: runId,
    frozen_at: timestamp(),
    sources: {
      formula_ref: manifest.formula_ref,
      rubric_snapshot_ref: manifest.rubric_snapshot_ref,
      golden_set_ref: manifest.golden_set_ref,
      project_ref: manifest.project_ref,
    },
  });

  console.log(`Frozen inputs for ${runId}`);
}

function validateArtifacts(args) {
  const state = getCurrentState();
  const checks = validateArtifactsForRun(args['run-id'], state);

  if (args.candidate) {
    const candidatePath = path.posix.join('rubrics', 'candidates', `${args.candidate}.yaml`);
    checks.push(validateFile(candidatePath, 'schemas/rubric-candidate.schema.yaml', `rubric candidate ${args.candidate}`));
  }

  let failures = 0;

  checks.forEach((check) => {
    if (check.ok) {
      console.log(`✓ ${check.label}`);
      return;
    }

    failures += 1;
    console.log(`✗ ${check.label}`);
    check.errors.forEach((error) => console.log(`  - ${error}`));
  });

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('All checked artifacts are valid');
}

function registerRubricCandidate(args) {
  let candidate;

  if (args.file) {
    candidate = readYamlFile(resolveWorkspacePath(args.file));
  } else {
    const required = ['id', 'description', 'source', 'run-id'];
    required.forEach((key) => {
      if (!args[key]) {
        throw new Error(`--${key} is required`);
      }
    });

    candidate = {
      id: args.id,
      status: 'candidate',
      description: args.description,
      source: args.source,
      rationale: args.rationale || '',
      confidence: args.confidence ? Number(args.confidence) : 0.5,
      recommended_state: args['recommended-state'] || 'probation',
      discovered_in_run: args['run-id'],
      created_at: timestamp(),
      evidence_refs: args.evidence ? args.evidence.split(',').map((item) => item.trim()).filter(Boolean) : [],
    };
  }

  if (!candidate.status) {
    candidate.status = 'candidate';
  }

  if (!candidate.created_at) {
    candidate.created_at = timestamp();
  }

  const candidateRelativePath = path.posix.join('rubrics', 'candidates', `${candidate.id}.yaml`);
  const candidatePath = resolveWorkspacePath(candidateRelativePath);

  if (fileExists(candidatePath) && !args.force) {
    throw new Error(`Candidate already exists: ${candidate.id}. Use --force to overwrite.`);
  }

  writeYamlFile(candidatePath, candidate);

  const validation = validateFile(candidateRelativePath, 'schemas/rubric-candidate.schema.yaml', `rubric candidate ${candidate.id}`);
  if (!validation.ok) {
    throw new Error(`Candidate validation failed: ${validation.errors.join('; ')}`);
  }

  const queue = getQueueState();
  queue.pending_promotions = queue.pending_promotions || { formulas: [], rubric_criteria: [] };
  queue.pending_reviews = queue.pending_reviews || [];

  if (!queue.pending_promotions.rubric_criteria.includes(candidate.id)) {
    queue.pending_promotions.rubric_criteria.push(candidate.id);
  }

  const reviewKey = `rubric:${candidate.id}`;
  if (!queue.pending_reviews.includes(reviewKey)) {
    queue.pending_reviews.push(reviewKey);
  }

  writeQueueState(queue);

  console.log(`Registered rubric candidate ${candidate.id}`);
}

function approveRubricCandidate(args) {
  if (!args.id) throw new Error('--id is required');
  const targetState = args['target-state'] || 'probation';
  if (!['probation', 'active'].includes(targetState)) {
    throw new Error('--target-state must be probation or active');
  }

  const candidatePath = resolveWorkspacePath(path.posix.join('rubrics', 'candidates', `${args.id}.yaml`));
  if (!fileExists(candidatePath)) {
    throw new Error(`Candidate not found: ${args.id}`);
  }

  const candidate = readYamlFile(candidatePath);
  const prevStatus = candidate.status;
  candidate.status = targetState;
  candidate.governance = {
    decision: 'approved',
    decided_at: timestamp(),
    target_state: targetState,
    notes: args.notes || '',
  };

  writeYamlFile(candidatePath, candidate);

  const queue = getQueueState();
  queue.pending_reviews = (queue.pending_reviews || []).filter((r) => r !== `rubric:${args.id}`);
  if (targetState === 'active') {
    queue.pending_promotions = queue.pending_promotions || { formulas: [], rubric_criteria: [] };
    queue.pending_promotions.rubric_criteria = queue.pending_promotions.rubric_criteria.filter((id) => id !== args.id);
  }
  writeQueueState(queue);

  console.log(`Approved rubric candidate ${args.id} (${prevStatus} → ${targetState})`);
}

function rejectRubricCandidate(args) {
  if (!args.id) throw new Error('--id is required');
  if (!args.reason) throw new Error('--reason is required');

  const candidatePath = resolveWorkspacePath(path.posix.join('rubrics', 'candidates', `${args.id}.yaml`));
  if (!fileExists(candidatePath)) {
    throw new Error(`Candidate not found: ${args.id}`);
  }

  const candidate = readYamlFile(candidatePath);
  candidate.status = 'rejected';
  candidate.governance = {
    decision: 'rejected',
    decided_at: timestamp(),
    reason: args.reason,
    notes: args.notes || '',
  };

  writeYamlFile(candidatePath, candidate);

  const queue = getQueueState();
  queue.pending_reviews = (queue.pending_reviews || []).filter((r) => r !== `rubric:${args.id}`);
  queue.pending_promotions = queue.pending_promotions || { formulas: [], rubric_criteria: [] };
  queue.pending_promotions.rubric_criteria = queue.pending_promotions.rubric_criteria.filter((id) => id !== args.id);
  writeQueueState(queue);

  console.log(`Rejected rubric candidate ${args.id}`);
}

function promoteRubricSnapshot(args) {
  const state = getCurrentState();
  const currentSnapshotPath = resolveWorkspacePath(state.current_rubric_snapshot_ref);
  const currentSnapshot = readYamlFile(currentSnapshotPath);

  const currentVersion = currentSnapshot.rubric_version;
  const newVersion = args.version || incrementVersion(currentVersion);

  const candidatesDir = resolveWorkspacePath('rubrics/candidates');
  const probationCandidates = (listDir(candidatesDir) || [])
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => readYamlFile(path.join(candidatesDir, f)))
    .filter((c) => c.status === 'probation');

  if (probationCandidates.length === 0) {
    console.log('No probationary candidates to promote. Snapshot unchanged.');
    return;
  }

  const newCriteria = probationCandidates.map((c) => c.id);
  const newActiveCriteria = [...(currentSnapshot.active_criteria || []), ...newCriteria];

  const newWeights = { ...(currentSnapshot.weights || {}) };
  probationCandidates.forEach((c) => {
    if (c.confidence) {
      newWeights[c.id] = c.confidence;
    }
  });

  const snapshotDir = resolveWorkspacePath(path.posix.join('rubrics', 'snapshots', newVersion));
  ensureDir(snapshotDir);

  const newRubric = {
    rubric_version: newVersion,
    parent_version: currentVersion,
    seed_sources: currentSnapshot.seed_sources || [],
    active_criteria: newActiveCriteria,
    weights: newWeights,
    effective_from_run: state.next_run_id,
    official_channel_only: true,
  };

  writeYamlFile(path.join(snapshotDir, 'rubric.yaml'), newRubric);

  const provenance = {
    rubric_version: newVersion,
    created_at: timestamp(),
    parent_version: currentVersion,
    promoted_candidates: probationCandidates.map((c) => ({
      id: c.id,
      description: c.description,
      from_status: 'probation',
      to_status: 'active',
    })),
    governance_notes: args.notes || '',
    guardrails: currentSnapshot.guardrails || [],
  };

  writeYamlFile(path.join(snapshotDir, 'provenance.yaml'), provenance);

  probationCandidates.forEach((c) => {
    c.status = 'active';
    delete c.governance;
    writeYamlFile(path.join(candidatesDir, `${c.id}.yaml`), c);
  });

  const queue = getQueueState();
  queue.pending_promotions = queue.pending_promotions || { formulas: [], rubric_criteria: [] };
  probationCandidates.forEach((c) => {
    queue.pending_promotions.rubric_criteria = queue.pending_promotions.rubric_criteria.filter((id) => id !== c.id);
  });
  writeQueueState(queue);

  state.current_rubric_snapshot_ref = path.posix.join('rubrics', 'snapshots', newVersion, 'rubric.yaml');
  writeCurrentState(state);

  console.log(`Promoted rubric snapshot ${currentVersion} → ${newVersion} with ${probationCandidates.length} candidate(s)`);
}

function registerFormulaCandidate(args) {
  if (!args.file) throw new Error('--file is required');

  const candidate = readYamlFile(resolveWorkspacePath(args.file));
  if (!candidate.id) throw new Error('Candidate must have an id field');
  if (!candidate.status) candidate.status = 'candidate';

  const candidatePath = resolveWorkspacePath(path.posix.join('formulas', 'candidates', `${candidate.id}.yaml`));
  if (fileExists(candidatePath) && !args.force) {
    throw new Error(`Formula candidate already exists: ${candidate.id}. Use --force to overwrite.`);
  }

  candidate.discovered_in_run = candidate.discovered_in_run || 'unknown';
  candidate.created_at = candidate.created_at || timestamp();

  const validation = validateFile(args.file, 'schemas/formula.schema.yaml', `formula candidate ${candidate.id}`);
  if (!validation.ok) {
    throw new Error(`Formula candidate validation failed: ${validation.errors.join('; ')}`);
  }

  writeYamlFile(candidatePath, candidate);

  const queue = getQueueState();
  queue.pending_promotions = queue.pending_promotions || { formulas: [], rubric_criteria: [] };
  if (!queue.pending_promotions.formulas.includes(candidate.id)) {
    queue.pending_promotions.formulas.push(candidate.id);
  }
  if (!queue.pending_reviews.includes(`formula:${candidate.id}`)) {
    queue.pending_reviews = queue.pending_reviews || [];
    queue.pending_reviews.push(`formula:${candidate.id}`);
  }
  writeQueueState(queue);

  console.log(`Registered formula candidate ${candidate.id}`);
}

function advanceFormula(args) {
  if (!args.id) throw new Error('--id is required');

  const candidatePath = resolveWorkspacePath(path.posix.join('formulas', 'candidates', `${args.id}.yaml`));
  const seedPath = resolveWorkspacePath(path.posix.join('formulas', 'seed', `${args.id}.yaml`));
  const promotedPath = resolveWorkspacePath(path.posix.join('formulas', 'promoted', `${args.id}.yaml`));

  let formula;
  if (fileExists(candidatePath)) {
    formula = readYamlFile(candidatePath);
  } else if (fileExists(seedPath)) {
    formula = readYamlFile(seedPath);
  } else {
    throw new Error(`Formula not found: ${args.id}`);
  }

  ensureDir(path.dirname(promotedPath));
  formula.status = 'active';
  formula.promoted_at = timestamp();
  formula.governance_notes = args.notes || '';
  writeYamlFile(promotedPath, formula);

  const state = getCurrentState();
  state.current_formula_ref = path.posix.join('formulas', 'promoted', `${args.id}.yaml`);
  writeCurrentState(state);

  const queue = getQueueState();
  queue.pending_promotions = queue.pending_promotions || { formulas: [], rubric_criteria: [] };
  queue.pending_promotions.formulas = queue.pending_promotions.formulas.filter((id) => id !== args.id);
  queue.pending_reviews = (queue.pending_reviews || []).filter((r) => r !== `formula:${args.id}`);
  writeQueueState(queue);

  console.log(`Advanced formula ${args.id} to active`);
}

function validateSeedRubrics() {
  const seedDir = resolveWorkspacePath('rubrics/seed');
  const files = listDir(seedDir).filter((f) => f.endsWith('.yaml'));
  const schemaPath = 'schemas/seed-rubric.schema.yaml';

  let failures = 0;
  files.forEach((file) => {
    const check = validateFile(path.posix.join('rubrics/seed', file), schemaPath, `seed rubric ${file}`);
    if (check.ok) {
      console.log(`✓ ${file}`);
    } else {
      failures += 1;
      console.log(`✗ ${file}`);
      check.errors.forEach((e) => console.log(`  - ${e}`));
    }
  });

  if (failures > 0) {
    console.log(`\n${failures} seed rubric(s) failed validation`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${files.length} seed rubric(s) passed`);
  }
}

function main() {
  const [command, ...argv] = process.argv.slice(2);

  if (!command || command === '--help' || command === 'help') {
    usage();
    return;
  }

  const args = parseArgs(argv);

  switch (command) {
    case 'init_run':
      initRun(args);
      break;
    case 'freeze_inputs':
      freezeInputs(args);
      break;
    case 'validate_artifacts':
      validateArtifacts(args);
      break;
    case 'register_rubric_candidate':
      registerRubricCandidate(args);
      break;
    case 'approve_rubric_candidate':
      approveRubricCandidate(args);
      break;
    case 'reject_rubric_candidate':
      rejectRubricCandidate(args);
      break;
    case 'promote_rubric_snapshot':
      promoteRubricSnapshot(args);
      break;
    case 'register_formula_candidate':
      registerFormulaCandidate(args);
      break;
    case 'advance_formula':
      advanceFormula(args);
      break;
    case 'validate_seed_rubrics':
      validateSeedRubrics();
      break;
    default:
      usage();
      process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
