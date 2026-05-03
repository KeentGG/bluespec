#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');
const YAML = require('yaml');

const {
  copyFile,
  ensureDir,
  fileExists,
  getCheckpoint,
  getCurrentState,
  getQueueState,
  incrementRunId,
  incrementVersion,
  listDir,
  loadProvider,
  parseArgs,
  phasesFrom,
  readYamlFile,
  readText,
  releaseLock,
  resolveFormulaExtends,
  resolveWorkspacePath,
  RUN_PHASES,
  savePromptToRun,
  timestamp,
  writeCheckpoint,
  writeCurrentState,
  writeQueueState,
  writeText,
  writeYamlFile,
} = require('./lib/common');
const { appendLesson, buildLessonsContext, findLessons, refreshLessonIndex } = require('./lib/lessons');
const { validateArtifactsForRun, validateFile } = require('./lib/validation');

const MUTATION_TO_FAILURE = {
  prompt_tweak: 'prompt_failure',
  step_management: 'search_failure',
  schema_change: 'format_failure',
  rubric_mutation: 'rubric_gap_failure',
};

/**
 * Spawns an OpenCode agent session for a bounded task.
 * The agent uses read/write tools to read input files and write output files.
 * The CLI waits for the process to exit and verifies the output file was written.
 * Retries up to maxRetries times if the agent exits 0 but the output file is missing
 * (handles transient OpenAI server errors that interrupt the agent mid-session).
 */
function spawnAgent({ role, workspace, prompt, outputPath, maxRetries = 3, retryDelayMs = 5000 }) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    function attemptSpawn() {
      attempt += 1;
      console.log(`[${role}] Spawning OpenCode agent (attempt ${attempt}/${maxRetries})...`);

      const child = spawn('opencode', ['run', prompt, '--dir', workspace], {
        stdio: 'inherit',
        cwd: workspace,
        env: { ...process.env },
      });

      child.on('exit', (code) => {
        if (code === 0) {
          if (fileExists(outputPath)) {
            console.log(`[${role}] Done. Output written to ${outputPath}`);
            resolve({ ok: true, outputPath });
          } else if (attempt < maxRetries) {
            console.error(`[${role}] Agent exited 0 but output file missing. Retrying in ${retryDelayMs / 1000}s...`);
            setTimeout(attemptSpawn, retryDelayMs);
          } else {
            console.error(`[${role}] Agent exited 0 but output file not found after ${maxRetries} attempts: ${outputPath}`);
            reject(new Error(`${role} agent exited 0 but did not write output to ${outputPath} after ${maxRetries} attempts`));
          }
        } else {
          if (attempt < maxRetries) {
            console.error(`[${role}] Agent exited ${code}. Retrying in ${retryDelayMs / 1000}s...`);
            setTimeout(attemptSpawn, retryDelayMs);
          } else {
            console.error(`[${role}] Agent exited with code ${code} after ${maxRetries} attempts`);
            reject(new Error(`${role} agent exited with code ${code} after ${maxRetries} attempts`));
          }
        }
      });

      child.on('error', (err) => {
        if (attempt < maxRetries) {
          console.error(`[${role}] Spawn error: ${err.message}. Retrying in ${retryDelayMs / 1000}s...`);
          setTimeout(attemptSpawn, retryDelayMs);
        } else {
          console.error(`[${role}] Failed to spawn agent after ${maxRetries} attempts: ${err.message}`);
          reject(err);
        }
      });
    }

    attemptSpawn();
  });
}

function usage() {
  console.log(`Usage:
  node scripts/cli.js init_run [--run-id run-0001]
  node scripts/cli.js freeze_inputs --run-id run-0001
  node scripts/cli.js validate_artifacts [--run-id run-0001] [--candidate id]
  node scripts/cli.js run_generator --run-id run-0001
  node scripts/cli.js run_evaluator --run-id run-0001
  node scripts/cli.js run_analyzer --run-id run-0001
  node scripts/cli.js run_mutator --run-id run-0001
  node scripts/cli.js checkpoint_run --run-id run-0001 --phase generator --status complete
  node scripts/cli.js resume_run --run-id run-0001
  node scripts/cli.js release_lock --run-id run-0001
  node scripts/cli.js register_rubric_candidate --id criterion_id --description "..." --source contextual_inference --run-id run-0001 [--confidence 0.8] [--rationale "..."] [--recommended-state probation] [--evidence ref1,ref2]
  node scripts/cli.js register_rubric_candidate --file rubrics/candidates/example.yaml
  node scripts/cli.js approve_rubric_candidate --id conditional_flow_documentation [--target-state probation] [--notes "..."]
  node scripts/cli.js reject_rubric_candidate --id conditional_flow_documentation --reason "..." [--notes "..."]
  node scripts/cli.js promote_rubric_snapshot [--version v002] [--notes "..."]
  node scripts/cli.js register_formula_candidate --file formulas/candidates/example.yaml
  node scripts/cli.js advance_formula --id frontend-v002 [--notes "..."]
  node scripts/cli.js record_lesson --failure-type search_failure --teaching-method step_management --result PASSED --scenario "..." [--run-id run-0016] [--works-on conditional_rendering,feature_flags] [--discovered-criterion conditional_flow_documentation]
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

  // Resolve formula extends chain and inline the merged result.
  // The frozen formula has no `extends` field — all steps/validations are
  // already flattened from the full inheritance chain.
  const resolvedFormula = resolveFormulaExtends(manifest.formula_ref);
  writeYamlFile(path.join(inputsDir, 'formula.yaml'), resolvedFormula);

  // Copy non-formula inputs as-is
  const copies = [
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
      formula_extends_chain: resolvedFormula._extends_chain,
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

  if (args.reason && args.id) {
    const sourceMap = {
      rubric_gap_failure: { failure_type: 'rubric_gap_failure', teaching_method: 'rubric_candidate_proposal' },
      contextual_inference: { failure_type: 'recognition_failure', teaching_method: 'rubric_candidate_proposal' },
      schema_derived: { failure_type: 'format_failure', teaching_method: 'rubric_candidate_proposal' },
      seed_curation: { failure_type: 'prompt_failure', teaching_method: 'rubric_candidate_proposal' },
    };
    const sourceInfo = sourceMap[candidate.source] || {
      failure_type: 'rubric_gap_failure',
      teaching_method: 'rubric_candidate_proposal',
    };

    appendLesson({
      failure_type: sourceInfo.failure_type,
      teaching_method: sourceInfo.teaching_method,
      result: 'FAILED',
      scenario: `Rubric candidate rejected: ${args.id} (source: ${candidate.source || 'unknown'}). Reason: ${args.reason}`,
      run_id: candidate.discovered_in_run || null,
      discovered_criterion: args.id,
    });
  }

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

  // Auto-record tentative lesson if candidate has mutation metadata
  if (candidate.fine_tune_run && candidate.parent) {
    const runId = candidate.fine_tune_run;
    const analyzerPath = resolveWorkspacePath(path.posix.join('runs', runId, 'analyzer', 'output.yaml'));
    let failureType = null;

    if (fileExists(analyzerPath)) {
      const analyzerOutput = readYamlFile(analyzerPath);
      failureType = analyzerOutput.primary_failure_type || null;
    }

    const mutationSource = candidate.consolidated_mutations?.[0];
    if (!failureType) {
      failureType = mutationSource ? (MUTATION_TO_FAILURE[mutationSource.type] || 'recognition_failure') : null;
    }

    if (failureType) {
      appendLesson({
        failure_type: failureType,
        teaching_method: mutationSource?.type || 'unknown',
        result: 'PARTIAL',
        scenario: `Candidate registered from ${runId}. Analyzer diagnosed: ${failureType}. Pending human promotion.`,
        works_on: candidate.specializations || [],
        run_id: runId,
        discovered_criterion: null,
      });
    }
  }

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

  // Record PASSED lesson on promotion
  const fineTuneRun = formula.fine_tune_run;
  const mutations = formula.consolidated_mutations || [];

  if (fineTuneRun && mutations.length > 0) {
    const analyzerPath = resolveWorkspacePath(path.posix.join('runs', fineTuneRun, 'analyzer', 'output.yaml'));
    let diagnosedFailureType = null;
    if (fileExists(analyzerPath)) {
      const analyzerOutput = readYamlFile(analyzerPath);
      diagnosedFailureType = analyzerOutput.primary_failure_type || null;
    }

    for (const mutation of mutations) {
      const failureType = diagnosedFailureType || MUTATION_TO_FAILURE[mutation.type] || 'recognition_failure';

      appendLesson({
        failure_type: failureType,
        teaching_method: mutation.type,
        result: 'PASSED',
        scenario: `Formula ${formula.id} v${formula.version} promoted from ${fineTuneRun}. Analyzer diagnosed: ${failureType}. Mutation: ${mutation.change}`,
        works_on: formula.specializations || [],
        run_id: fineTuneRun,
        discovered_criterion: null,
      });
    }
  }

  console.log(`Advanced formula ${args.id} to active`);
}

function recordLesson(args) {
  const required = ['failure-type', 'teaching-method', 'result', 'scenario'];
  for (const key of required) {
    if (!args[key]) throw new Error(`--${key} is required`);
  }

  appendLesson({
    failure_type: args['failure-type'],
    teaching_method: args['teaching-method'],
    result: args.result.toUpperCase(),
    scenario: args.scenario,
    works_on: args['works-on'] ? args['works-on'].split(',').map(s => s.trim()) : [],
    run_id: args['run-id'] || null,
    discovered_criterion: args['discovered-criterion'] || null,
  });

  console.log(`Lesson recorded. Index refreshed.`);
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

function checkpointRun(args) {
  const runId = args['run-id'];
  const phase = args.phase;
  const status = args.status || 'active';

  if (!runId) throw new Error('--run-id is required');
  if (!phase) throw new Error('--phase is required');

  if (!RUN_PHASES.includes(phase)) {
    throw new Error(`Invalid phase '${phase}'. Must be one of: ${RUN_PHASES.join(', ')}`);
  }
  if (!['active', 'complete', 'failed'].includes(status)) {
    throw new Error(`Invalid status '${status}'. Must be one of: active, complete, failed`);
  }

  const extra = {};
  if (args['next-phase']) extra.next_phase = args['next-phase'];
  if (args.notes) extra.notes = args.notes;

  const checkpointPath = writeCheckpoint(runId, phase, status, extra);
  console.log(`Checkpoint written: ${runId} [${phase}] ${status} → ${checkpointPath}`);
}

function resumeRun(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');

  const checkpoint = getCheckpoint(runId);
  if (!checkpoint) {
    throw new Error(`No checkpoint found for ${runId}. Run init_run and freeze_inputs first.`);
  }

  const remaining = phasesFrom(checkpoint.phase);
  const isComplete = checkpoint.status === 'complete';
  console.log(`Resume ${runId}:`);
  console.log(`  Current phase: ${checkpoint.phase} (${checkpoint.status})`);
  if (isComplete) {
    console.log(`  Remaining phases: none — run is complete`);
  } else {
    console.log(`  Remaining phases: ${remaining.join(' → ')}`);
  }
  console.log(`  Checkpoint file: state/checkpoints/${runId}.yaml`);
  return checkpoint;
}

function releaseLockCommand(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');
  releaseLock(runId);
  console.log(`Lock released for ${runId}`);
}

async function runGenerator(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const manifestPath = path.join(runRoot, 'manifest.yaml');
  if (!fileExists(manifestPath)) {
    throw new Error(`Run not initialized: ${runId}. Run init_run first.`);
  }

  const manifest = readYamlFile(manifestPath);
  const inputsDir = path.join(runRoot, 'inputs');

  const formula = readYamlFile(path.join(inputsDir, 'formula.yaml'));
  const project = readYamlFile(path.join(inputsDir, 'project.yaml'));
  const config = readYamlFile(resolveWorkspacePath('config/prototype.yaml'));

  const providerType = config.providers?.default || 'local';
  const provider = loadProvider(providerType);
  const providerOptions = {
    temperature: 0.3,
    model: providerType,
  };

  const generatorDir = path.join(runRoot, 'generator');
  const stepsDir = path.join(generatorDir, 'steps');
  const specsDir = path.join(generatorDir, 'specs');
  ensureDir(stepsDir);
  ensureDir(specsDir);

  const generatorPrompt = readText(resolveWorkspacePath('prompts/generator.md'));

  const systemPrompt = `${generatorPrompt}

Project: ${project.name || project.id}
Ecosystem: ${formula.ecosystem}
Codebase: ${project.codebase_path || 'not specified'}
Excluded paths: ${(project.excluded_paths || []).join(', ') || 'none'}

IMPORTANT: You do NOT have access to the golden set or rubric.
Explore the codebase freely and produce specs for behaviors you discover.
The golden set is a hidden test — the Evaluator will check coverage after you finish.
`;

  savePromptToRun(runId, 'generator-system.md', systemPrompt);

  const trace = {
    run_id: runId,
    provider: providerType,
    model: providerOptions.model,
    steps: [],
    overall_latency_ms: 0,
    total_tokens: 0,
  };

  const stepOutputs = {};
  let stepsCompleted = 0;
  let failedAtStep = null;
  let errorReason = null;
  const confidenceBySection = {};
  const allUnresolved = [];
  const flagsForAnalyzer = [];
  const specsGenerated = [];
  const generationStartedAt = timestamp();

  for (let i = 0; i < formula.steps.length; i++) {
    const step = formula.steps[i];
    const stepNumber = i + 1;
    console.log(`[Generator] Step ${stepNumber}/${formula.steps.length}: ${step.id}`);

    const priorOutputs = Object.entries(stepOutputs)
      .map(([priorStepId, priorOutput]) => `=== Output from ${priorStepId} ===\n${priorOutput}`)
      .join('\n\n');

    const userPrompt = `###CURRENT_STEP### ${step.id}
=== FORMULA STEP ===
Step: ${step.id}
Name: ${step.name}
${step.prompt ? `Prompt hint: ${step.prompt}` : ''}
Outputs expected: ${(step.outputs || []).join(', ')}

${priorOutputs ? `=== PRIOR STEP OUTPUTS ===\n${priorOutputs}\n` : ''}
=== INSTRUCTION ===
Execute step "${step.id}: ${step.name}" and produce the expected outputs.
Format your output as a structured step result with this header:
step: ${step.id}
step_number: ${stepNumber}
status: complete|partial|failed
confidence: <0.0-1.0>
summary: "<what this step did>"
files_analyzed: [<list of files examined>]
artifacts_produced: [<list of output artifacts>]
unresolved_questions: [<questions this step could not answer>]
flags_for_analyzer: [<notable observations for the analyzer>]
`;

    savePromptToRun(runId, `generator-step-${stepNumber}-${step.id}.md`, userPrompt);

    let stepResult;
    let stepError = null;

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await provider.generate(messages, providerOptions);
      stepResult = parseStepOutput(response.content);

      trace.steps.push({
        step: step.id,
        request: messages,
        response: { content: response.content, usage: response.usage, metadata: response.metadata },
        latency_ms: response.metadata?.latency_ms || 0,
        status: 'complete',
      });
      trace.total_tokens += response.usage?.total_tokens || 0;
      trace.overall_latency_ms += response.metadata?.latency_ms || 0;

      stepsCompleted = stepNumber;
      confidenceBySection[step.id] = stepResult.confidence || 0.5;

      if (stepResult.unresolved_questions) {
        allUnresolved.push(...stepResult.unresolved_questions);
      }
      if (stepResult.flags_for_analyzer) {
        flagsForAnalyzer.push(...stepResult.flags_for_analyzer);
      }

      // Stub: generate spec files from draft step output
      if (step.id === 'draft' && stepResult.artifacts_produced) {
        for (const artifact of stepResult.artifacts_produced) {
          const baseName = artifact.replace(/^specs\//, '');
          const specFileName = baseName.endsWith('.yaml') ? baseName : `${baseName}.yaml`;
          const specContent = `# Auto-generated spec: ${baseName}\n# From step: draft\n# Confidence: ${stepResult.confidence}\nid: ${baseName.replace(/\./g, '-')}\ntype: spec\nversion: "1.0"\n`;
          const specPath = path.join(specsDir, specFileName);
          writeText(specPath, specContent);
          specsGenerated.push(path.join('generator/specs', specFileName));
        }
      }

      // Write step output file
      const stepOutputPath = path.join(stepsDir, `step-${stepNumber}-${step.id}.yaml`);
      writeYamlFile(stepOutputPath, stepResult);
      stepOutputs[step.id] = response.content;

      console.log(`[Generator]   ✓ ${step.id} (confidence: ${stepResult.confidence})`);
    } catch (err) {
      stepError = err.message;
      errorReason = classifyError(err);
      failedAtStep = stepNumber;

      trace.steps.push({
        step: step.id,
        error: stepError,
        latency_ms: 0,
        status: 'failed',
      });

      // Write partial step output
      const partialOutput = {
        step: step.id,
        step_number: stepNumber,
        status: 'failed',
        confidence: 0,
        summary: `Failed at step: ${stepError}`,
        files_analyzed: [],
        artifacts_produced: [],
        unresolved_questions: allUnresolved,
        flags_for_analyzer: flagsForAnalyzer,
        error_reason: errorReason,
      };
      const stepOutputPath = path.join(stepsDir, `step-${stepNumber}-${step.id}.yaml`);
      writeYamlFile(stepOutputPath, partialOutput);

      console.log(`[Generator]   ✗ ${step.id} failed: ${stepError}`);
      break;
    }
  }

  const generationCompletedAt = timestamp();
  const overallConfidence = Object.values(confidenceBySection).length > 0
    ? Object.values(confidenceBySection).reduce((a, b) => a + b, 0) / Object.values(confidenceBySection).length
    : 0;

  const status = failedAtStep ? (stepsCompleted > 0 ? 'partial' : 'failed') : 'complete';

  const outputYaml = {
    run_id: runId,
    generator: 'run_generator',
    status,
    provider: providerType,
    model: providerOptions.model,
    steps_completed: stepsCompleted,
    failed_at_step: failedAtStep,
    error_reason: errorReason,
    confidence_by_section: confidenceBySection,
    overall_confidence: Math.round(overallConfidence * 100) / 100,
    unresolved_questions: [...new Set(allUnresolved)],
    phase_outputs: Object.fromEntries(
      formula.steps.slice(0, stepsCompleted).map((s, i) => [s.id, `generator/steps/step-${i + 1}-${s.id}.yaml`])
    ),
    specs_generated: specsGenerated,
    generation_started_at: generationStartedAt,
    generation_completed_at: generationCompletedAt,
    latency_ms: trace.overall_latency_ms,
    tokens_used: trace.total_tokens,
    flags_for_analyzer: [...new Set(flagsForAnalyzer)],
  };

  writeYamlFile(path.join(generatorDir, 'output.yaml'), outputYaml);
  writeText(path.join(generatorDir, 'trace.json'), JSON.stringify(trace, null, 2));

  console.log(`[Generator] Done. Status: ${status} (${stepsCompleted}/${formula.steps.length} steps)`);
  if (failedAtStep) {
    console.log(`[Generator] Failed at step ${failedAtStep}: ${errorReason}`);
    process.exitCode = 1;
  }
}

function parseStepOutput(content) {
  const result = {
    step: 'unknown',
    step_number: 0,
    status: 'complete',
    confidence: 0.5,
    summary: '',
    files_analyzed: [],
    artifacts_produced: [],
    unresolved_questions: [],
    flags_for_analyzer: [],
  };

  const LIST_KEYS = new Set([
    'files_analyzed', 'artifacts_produced', 'unresolved_questions',
    'flags_for_analyzer', 'specs_generated',
  ]);
  const SCALAR_NUMERIC = new Set(['step_number', 'confidence']);
  const SCALAR_STRING = new Set(['step', 'status', 'summary', 'error_reason']);

  const lines = content.split('\n');
  let currentKey = null;
  let listValues = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (trimmed.startsWith('- ')) {
      if (currentKey && LIST_KEYS.has(currentKey)) {
        listValues.push(trimmed.slice(2).replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    if (currentKey && LIST_KEYS.has(currentKey) && listValues.length > 0) {
      result[currentKey] = listValues;
      listValues = [];
    }

    const kvMatch = trimmed.match(/^(\w+(?:_\w+)*):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      currentKey = key;

      if (SCALAR_NUMERIC.has(key)) {
        result[key] = parseFloat(value);
      } else if (SCALAR_STRING.has(key)) {
        result[key] = value.replace(/^["']|["']$/g, '');
      } else if (LIST_KEYS.has(key)) {
        listValues = [];
        if (value && value !== '[]') {
          const inlineItems = value.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
          if (inlineItems.length > 0) listValues = inlineItems;
        }
      }
    }
  }

  if (currentKey && LIST_KEYS.has(currentKey) && listValues.length > 0) {
    result[currentKey] = listValues;
  }

  return result;
}

async function runEvaluator(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const evaluatorDir = path.join(runRoot, 'evaluator');
  ensureDir(evaluatorDir);

  const formula = readYamlFile(path.join(runRoot, 'inputs', 'formula.yaml'));
  const rubric = readYamlFile(path.join(runRoot, 'inputs', 'rubric.yaml'));
  const goldenSet = readYamlFile(path.join(runRoot, 'inputs', 'golden-set.yaml'));
  const project = readYamlFile(path.join(runRoot, 'inputs', 'project.yaml'));
  const genOutput = readYamlFile(path.join(runRoot, 'generator', 'output.yaml'));
  const specFiles = listDir(path.join(runRoot, 'generator', 'specs'))
    .filter((f) => f.endsWith('.yaml'));

  const officialOutputPath = path.join(evaluatorDir, 'output.yaml');
  const shadowFindingsPath = path.join(evaluatorDir, 'shadow-findings.yaml');

  const prompt = `You are the Evaluator agent. Score the generated specs against the frozen rubric and golden set.

WORKSPACE: ${resolveWorkspacePath('')}
RUN_ID: ${runId}

## Your task
1. Read all spec files from: ${path.join(runRoot, 'generator', 'specs')}
2. Read the rubric from: ${path.join(runRoot, 'inputs', 'rubric.yaml')}
3. Read the golden set from: ${path.join(runRoot, 'inputs', 'golden-set.yaml')}
4. Read the generator output from: ${path.join(runRoot, 'generator', 'output.yaml')}
5. Score each spec against the rubric criteria and golden set behaviors
6. Write the official score report to: ${officialOutputPath}
7. Write the shadow findings artifact to: ${shadowFindingsPath}

## Project context
- Project: ${project.name || project.id}
- Ecosystem: ${formula.ecosystem}
- Generator overall confidence: ${genOutput.overall_confidence || 'unknown'}
- Generator flags: ${(genOutput.flags_for_analyzer || []).join(', ') || 'none'}
- Specs discovered: ${specFiles.join(', ') || 'none'}

## Official score report requirements
Produce ${officialOutputPath} with these fields:
- run_id: "${runId}"
- evaluator: "run_evaluator"
- status: "complete"
- provider: "opencode-agent"
- scored_specs: per-spec score data for each spec found in the specs directory
- overall_score: weighted 0.0-1.0
- overall_score_breakdown: recall/precision/consistency sub-scores
- confidence: 0.0-1.0
- confidence_rationale: why this confidence
- scoring_timestamp: ISO timestamp

## Shadow findings requirements
Produce ${shadowFindingsPath} with these fields:
- run_id: "${runId}"
- evaluator: "run_evaluator"
- status: "complete"
- provider: "opencode-agent"
- recall_hits: spec-by-spec coverage of golden set behaviors
- recall_misses: what was not covered
- precision_findings: hallucinated or unsupported claims
- consistency_findings: internal contradictions
- rubric_gap_candidates: suspected rubric gaps (PROPOSED ONLY — do not activate)

## Rules
- rubric_gap_candidates live in the shadow findings artifact only. Do NOT activate.
- Be honest about coverage (partial is not full).
- The official report must stay machine-comparable and should not carry the qualitative finding lists.
- Both output files must be valid YAML.

## Output
Write the official score report to: ${officialOutputPath}
Write the shadow findings artifact to: ${shadowFindingsPath}
`;

  savePromptToRun(runId, 'evaluator.md', prompt);

  try {
    await spawnAgent({
      role: 'Evaluator',
      workspace: resolveWorkspacePath(''),
      prompt,
      outputPath: officialOutputPath,
    });

    const checks = [
      validateFile(path.posix.join('runs', runId, 'evaluator', 'output.yaml'), 'schemas/evaluator-output.schema.yaml', `evaluator official output ${runId}`),
      validateFile(path.posix.join('runs', runId, 'evaluator', 'shadow-findings.yaml'), 'schemas/evaluator-shadow-findings.schema.yaml', `evaluator shadow findings ${runId}`),
    ];

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

    console.log(`[Evaluator] Done. Official output written to ${officialOutputPath}; shadow findings written to ${shadowFindingsPath}`);
  } catch (err) {
    console.error(`[Evaluator] Failed: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAnalyzer(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const analyzerDir = path.join(runRoot, 'analyzer');
  ensureDir(analyzerDir);

  const officialEvaluatorOutput = readYamlFile(path.join(runRoot, 'evaluator', 'output.yaml'));
  const evaluatorShadowFindings = readYamlFile(path.join(runRoot, 'evaluator', 'shadow-findings.yaml'));
  const outputPath = path.join(analyzerDir, 'output.yaml');
  const evaluatorScore = typeof officialEvaluatorOutput.overall_score === 'number' ? officialEvaluatorOutput.overall_score : 'unknown';
  const shadowRecallMisses = Array.isArray(evaluatorShadowFindings.recall_misses) ? evaluatorShadowFindings.recall_misses : [];
  const shadowPrecisionFindings = Array.isArray(evaluatorShadowFindings.precision_findings) ? evaluatorShadowFindings.precision_findings : [];
  const shadowConsistencyFindings = Array.isArray(evaluatorShadowFindings.consistency_findings) ? evaluatorShadowFindings.consistency_findings : [];
  const shadowRubricGapCandidates = normalizeRubricGapCandidates(evaluatorShadowFindings.rubric_gap_candidates);

  const lessonIndex = refreshLessonIndex();
  const lessonContext = buildLessonsContext(lessonIndex);

  const prompt = `You are the Analyzer agent. Diagnose WHY the formula missed or hallucinated behavior by applying the 5-type failure decision tree.

WORKSPACE: ${resolveWorkspacePath('')}
RUN_ID: ${runId}

## Your task
1. Read the official evaluator score report: ${path.join(runRoot, 'evaluator', 'output.yaml')}
2. Read the evaluator shadow findings: ${path.join(runRoot, 'evaluator', 'shadow-findings.yaml')}
3. Read the generator output: ${path.join(runRoot, 'generator', 'output.yaml')}
4. Read the formula: ${path.join(runRoot, 'inputs', 'formula.yaml')}
5. Read the rubric: ${path.join(runRoot, 'inputs', 'rubric.yaml')}
6. Read the failure types decision tree: ${resolveWorkspacePath('prompts/shared/failure-types.md')}
7. Apply the decision tree to each recall miss from the shadow findings
8. Write your diagnosis to: ${outputPath}

## Evaluator context
- Official evaluator score: ${evaluatorScore}
- Shadow findings summary: ${shadowRecallMisses.length} recall misses, ${shadowPrecisionFindings.length} precision findings, ${shadowConsistencyFindings.length} consistency findings, ${shadowRubricGapCandidates.length} rubric-gap candidates

## The 5-Type Failure Decision Tree (apply in order — stop at first match)

1. **search_failure** — Did the explore step fail to find relevant files in the codebase?
2. **recognition_failure** — Did explore find files but draft/analyze fail to recognize the behavior as spec-worthy?
3. **format_failure** — Did the spec fail schema validation (missing fields, invalid structure)?
4. **prompt_failure** — Does the formula's own step prompts never ask for this behavior?
5. **rubric_gap_failure** — Is the criterion ABSENT from rubric.active_criteria AND was surfaced in evaluator shadow findings?

## Lesson History
${lessonContext}

## Lesson-Aware Diagnosis
- Check if this failure type has been seen before. What teaching methods have already been tried?
- If a previous attempt with the same (failure_type, teaching_method) already FAILED, flag it and suggest a different approach.
- Consider escalating mutation tiers: prompt_tweak → step_management → parent_guideline → schema_change → tool_change → rubric_mutation.
- **Anti-contamination: Classify the failure TYPE and suggest methodological improvements, NOT specific missed behaviors. The formula must evolve to discover behaviors better, not to be pre-primed with what it missed.**

## Key rules
- rubric_gap_failure is ONLY valid when steps 1-4 are FULLY exhausted AND the criterion doesn't appear in rubric.active_criteria
- Do NOT use rubric_gap_failure as a default — exhaust all other types first
- If rubric_gap_failure: also produce a rubric_gap_proposal object
- rubric_gap_proposal is PROPOSED ONLY — governance handles activation

## Output YAML fields
- run_id: "${runId}"
- analyzer: "run_analyzer"
- status: "complete"
- provider: "opencode-agent"
- primary_failure_type: (search_failure | recognition_failure | format_failure | prompt_failure | rubric_gap_failure)
- diagnosis: causal chain explaining what happened
- failure_tier: (prompt_tweak | step_management | tool_change | schema_change | parent_guideline | rubric_mutation)
- suggested_mutation: concrete recommendation
- expected_effect: what this would improve
- rubric_gap_proposed: (true | false)
- rubric_gap_proposal: (null | { id, description, evidence_refs, rationale, severity, recommended_state })
- evidence_refs: list of files/steps that support this diagnosis
- confidence: 0.0-1.0
- confidence_rationale: why this confidence
- analyzer_timestamp: ISO timestamp

## Output
Write the diagnosis YAML to: ${outputPath}
`;

  savePromptToRun(runId, 'analyzer.md', prompt);

  try {
    await spawnAgent({
      role: 'Analyzer',
      workspace: resolveWorkspacePath(''),
      prompt,
      outputPath,
    });
  } catch (err) {
    console.error(`[Analyzer] Failed: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runMutator(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const mutatorDir = path.join(runRoot, 'mutator');
  ensureDir(mutatorDir);

  const analyzerOutput = readYamlFile(path.join(runRoot, 'analyzer', 'output.yaml'));
  const officialEvaluatorOutput = readYamlFile(path.join(runRoot, 'evaluator', 'output.yaml'));
  const evaluatorShadowFindings = readYamlFile(path.join(runRoot, 'evaluator', 'shadow-findings.yaml'));
  const formula = readYamlFile(path.join(runRoot, 'inputs', 'formula.yaml'));
  const rubric = readYamlFile(path.join(runRoot, 'inputs', 'rubric.yaml'));
  const lessonIndex = refreshLessonIndex();
  const failureType = analyzerOutput.primary_failure_type || 'unknown';
  const officialEvaluatorScore = typeof officialEvaluatorOutput.overall_score === 'number' ? officialEvaluatorOutput.overall_score : 'unknown';
  const shadowPrecisionFindings = Array.isArray(evaluatorShadowFindings.precision_findings) ? evaluatorShadowFindings.precision_findings : [];
  const shadowRubricGapCandidates = normalizeRubricGapCandidates(evaluatorShadowFindings.rubric_gap_candidates);
  const precisionConcern = shadowPrecisionFindings[0]?.concern || shadowPrecisionFindings[0]?.finding || shadowPrecisionFindings[0]?.issue || shadowPrecisionFindings[0]?.description || 'none';
  const rubricGapSummary = shadowRubricGapCandidates.length > 0
    ? shadowRubricGapCandidates.map((entry) => entry.description || entry.suspicion || entry.rationale || entry.criterion || 'unspecified rubric gap').join('\n')
    : 'none';

  const outputPath = path.join(mutatorDir, 'output.yaml');

  const rubricCandidatePath = path.join(mutatorDir, 'rubric-candidate.yaml');

  const prompt = `You are the Mutator agent. Produce the next candidate formula mutation based on the analyzer's diagnosis.

WORKSPACE: ${resolveWorkspacePath('')}
RUN_ID: ${runId}

## Your task
1. Read the analyzer output: ${path.join(runRoot, 'analyzer', 'output.yaml')}
2. Read the official evaluator score report: ${path.join(runRoot, 'evaluator', 'output.yaml')}
3. Read the evaluator shadow findings: ${path.join(runRoot, 'evaluator', 'shadow-findings.yaml')}
4. Read the formula: ${path.join(runRoot, 'inputs', 'formula.yaml')}
5. Read the rubric: ${path.join(runRoot, 'inputs', 'rubric.yaml')}
6. Read the lesson index: ${resolveWorkspacePath('lessons/index.yaml')}
7. Read prior failed lessons: ${resolveWorkspacePath('lessons/failed.jsonl')}
8. Read prior successful lessons: ${resolveWorkspacePath('lessons/learned.jsonl')}
9. Produce a mutation proposal and write it to: ${outputPath}
10. If the analyzer diagnosed rubric_gap_failure, ALSO write a rubric candidate to: ${rubricCandidatePath}

## Insanity Prevention
Use the lesson index first. Treat proposed_change.type as the teaching method for lookup. If the same mutation type was already tried for the same failure_type and FAILED, you MUST either:
- Propose a DIFFERENT approach, OR
- Provide explicit justification to retry with the same approach

If a similar method already PASSED for this failure_type, prefer building on that approach.

## Lesson History
${buildLessonsContext(lessonIndex)}

## Mutation Tiers (try in order)
1. prompt_tweak — add/refine instructions within an existing step (preferred, low risk)
2. step_management — add, remove, or reorder steps (medium risk)
3. parent_guideline — add cross-step guidance to formula root (medium risk)
4. schema_change — change spec schema requirements (higher risk)
5. tool_change — add or change tooling available to generator (higher risk)
6. rubric_mutation — propose new rubric criterion (highest risk, governed promotion required)

## Key rules
- rubric_gap_failure: rubric_candidate goes through governed review before ANY scoring impact
- proposed_change must directly address the ANALYZER's diagnosis, not just symptoms
- Be specific: "add guidance" is not a proposal. "Add to draft step: enumerate state transitions" is.
- **Anti-contamination: The lesson history shows failure types and success/failure rates, NOT specific behaviors to hunt for. Do NOT encode specific behavioral findings from past runs into the formula. Improve the exploration METHOD (coverage breadth, pattern recognition, schema compliance), not specific targets.**

## Formula and rubric context
- Formula ecosystem: ${formula.ecosystem}
- Formula step count: ${Array.isArray(formula.steps) ? formula.steps.length : 'unknown'}
- Rubric active criteria count: ${Array.isArray(rubric.active_criteria) ? rubric.active_criteria.length : 'unknown'}

## Evaluator context
- Official evaluator score: ${officialEvaluatorScore}
- Shadow precision concern: ${precisionConcern}
- Shadow rubric-gap summary:
${rubricGapSummary === 'none' ? '- none' : rubricGapSummary.split('\n').map((line) => `- ${line}`).join('\n')}

## Output YAML fields for output.yaml
- run_id: "${runId}"
- mutator: "run_mutator"
- status: "complete"
- provider: "opencode-agent"
- proposed_change:
    type: (prompt_tweak | step_management | parent_guideline | schema_change | tool_change | rubric_mutation)
    target_step: step-id or "formula root" or "schema"
    current: what currently exists
    proposed: what to add or change
    expected_improvement: what this improves
    risk: (low | medium | high)
    rationale: why this addresses the diagnosis
- insanity_check:
    method_already_failed: (true | false)
    if_true:
      justification: why retry despite prior failure
      alternative_considered: what else was considered
    failed_runs: list of { run_id, teaching_method, scenario, result }
    learned_runs: list of { run_id, teaching_method, scenario, result }
- rubric_candidate: (null | rubric candidate object — only if analyzer diagnosed rubric_gap_failure)
- confidence: 0.0-1.0
- confidence_rationale: why this confidence
- mutator_timestamp: ISO timestamp

## If rubric_gap_failure was diagnosed, also write rubric-candidate.yaml
Fields:
- id: auto-generated snake_case ID (e.g. "missing_state_machine_boundaries")
- status: "candidate"
- description: what criterion should be added
- source: "rubric_gap_failure"
- discovered_in_run: "${runId}"
- rationale: why this belongs in the rubric
- evidence_refs: specs or files demonstrating the gap
- source_run: "${runId}"
- evaluator_score: ${officialEvaluatorScore}
- failure_type: "${analyzerOutput.primary_failure_type || 'unknown'}"
- analyzer_confidence: ${analyzerOutput.confidence || 0.5}
- recall_misses_triggered: list of recall misses that triggered this
- scored_specs_examined: list of spec IDs evaluated
- evidence_count: 1
- first_observed_run: "${runId}"
- last_observed_run: "${runId}"
- precision_concern: "${precisionConcern}"
- weight_recommendation: 1.0
- probation_runs_remaining: 3
- created_at: ISO timestamp

## Output
Write the mutation YAML to: ${outputPath}
${analyzerOutput.rubric_gap_proposed === true ? `Write the rubric candidate YAML to: ${rubricCandidatePath}` : ''}
`;

  savePromptToRun(runId, 'mutator.md', prompt);

  try {
    await spawnAgent({
      role: 'Mutator',
      workspace: resolveWorkspacePath(''),
      prompt,
      outputPath,
    });

    if (analyzerOutput.rubric_gap_proposed === true && !fileExists(rubricCandidatePath)) {
      console.error(`[Mutator] rubric_gap_failure was diagnosed but rubric-candidate.yaml was not written.`);
      process.exitCode = 1;
      return;
    }

    if (fileExists(outputPath)) {
      const output = readYamlFile(outputPath);
      const proposedTeachingMethod = output.proposed_change?.type;
      const matchingFailures = proposedTeachingMethod
        ? findLessons(lessonIndex, {
            failure_type: failureType,
            teaching_method: proposedTeachingMethod,
            result: 'FAILED',
          })
        : [];

      if (matchingFailures.length > 0) {
        const methodAlreadyFailed = output.insanity_check?.method_already_failed === true;
        const justification = output.insanity_check?.if_true?.justification || output.insanity_check?.justification;

        if (!methodAlreadyFailed || !justification) {
          console.error(`[Mutator] Proposed teaching method '${proposedTeachingMethod}' already failed for failure_type '${failureType}' but the output did not acknowledge or justify the retry.`);
          process.exitCode = 1;
          return;
        }
      }

      if (output.proposed_change) {
        console.log(`[Mutator] Done. Proposed: ${output.proposed_change.type}`);
      } else {
        console.log(`[Mutator] Done. No formula mutation (rubric gap only).`);
      }
    }
  } catch (err) {
    console.error(`[Mutator] Failed: ${err.message}`);
    process.exitCode = 1;
  }
}

function parseKeyValueOutput(content) {
  const result = {
    step: 'unknown',
    step_number: 0,
    status: 'complete',
    confidence: 0.5,
    summary: '',
    files_analyzed: [],
    artifacts_produced: [],
    unresolved_questions: [],
    flags_for_analyzer: [],
  };

  const LIST_KEYS = new Set([
    'files_analyzed', 'artifacts_produced', 'unresolved_questions',
    'flags_for_analyzer', 'specs_generated',
  ]);

  const SCALAR_NUMERIC = new Set(['step_number', 'confidence']);
  const SCALAR_STRING = new Set(['step', 'status', 'summary', 'error_reason']);

  const lines = content.split('\n');
  let currentKey = null;
  let listValues = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    // Indented list item — accumulate for current list key
    if (trimmed.startsWith('- ')) {
      if (currentKey && LIST_KEYS.has(currentKey)) {
        listValues.push(trimmed.slice(2).replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    // Flush previous list before switching keys
    if (currentKey && LIST_KEYS.has(currentKey) && listValues.length > 0) {
      result[currentKey] = listValues;
      listValues = [];
    }

    // Key: value
    const kvMatch = trimmed.match(/^(\w+(?:_\w+)*):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      currentKey = key;

      if (SCALAR_NUMERIC.has(key)) {
        result[key] = parseFloat(value);
      } else if (SCALAR_STRING.has(key)) {
        result[key] = value.replace(/^["']|["']$/g, '');
      } else if (LIST_KEYS.has(key)) {
        listValues = [];
        // If value is non-empty and not '[]', it might be an inline list
        if (value && value !== '[]') {
          const inlineItems = value.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
          if (inlineItems.length > 0) listValues = inlineItems;
        }
      }
    }
  }

  // Flush last list
  if (currentKey && LIST_KEYS.has(currentKey) && listValues.length > 0) {
    result[currentKey] = listValues;
  }

  return result;
}

function classifyError(err) {
  const msg = err.message || '';
  if (msg.includes('network') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
    return 'network_error';
  }
  if (msg.includes('context') || msg.includes('overflow') || msg.includes('too long')) {
    return 'context_overflow';
  }
  if (msg.includes('auth') || msg.includes('401') || msg.includes('403')) {
    return 'api_error';
  }
  return 'unknown_error';
}

function parseKeyValueOutput(content) {
  const result = {};
  const lines = content.split('\n');
  let currentKey = null;
  let listValues = [];
  const LIST_KEYS = new Set([
    'recall_hits', 'recall_misses', 'precision_findings', 'consistency_findings',
    'rubric_gap_candidates', 'evidence_refs', 'failed_runs',
  ]);
  const BOOL_KEYS = new Set(['rubric_gap_proposed']);
  const NUM_KEYS = new Set(['confidence', 'overall_score', 'tokens_used']);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (trimmed.startsWith('- ')) {
      if (currentKey && LIST_KEYS.has(currentKey)) {
        listValues.push(trimmed.slice(2).replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    if (currentKey && LIST_KEYS.has(currentKey) && listValues.length > 0 && !trimmed.startsWith('-')) {
      result[currentKey] = listValues;
      listValues = [];
    }

    const kvMatch = trimmed.match(/^(\w+(?:_\w+)*):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      currentKey = key;

      if (BOOL_KEYS.has(key)) {
        result[key] = value.trim() === 'true';
      } else if (NUM_KEYS.has(key)) {
        result[key] = parseFloat(value) || 0;
      } else if (LIST_KEYS.has(key)) {
        listValues = [];
        if (value && value !== '[]' && value !== 'null') {
          listValues = value.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
      } else {
        result[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }

  if (currentKey && LIST_KEYS.has(currentKey) && listValues.length > 0) {
    result[currentKey] = listValues;
  }

  return result;
}

function normalizeRubricGapCandidates(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && Array.isArray(value.gaps)) {
    return value.gaps;
  }

  return [];
}

function reviewDiscoveries(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const discoveredPath = path.join(runRoot, 'evaluator', 'discovered-behaviors.yaml');

  if (!fileExists(discoveredPath)) {
    console.log(`[Review] No discoveries found for ${runId}`);
    return;
  }

  const discovered = readYamlFile(discoveredPath);
  console.log(`\n[Review] Discoveries from ${runId}:`);
  console.log(`  Golden set version: ${discovered.golden_set_version}`);
  console.log(`  Discovered at: ${discovered.discovered_at}\n`);

  for (const behavior of discovered.new_behaviors) {
    const status = behavior.status.padEnd(15);
    const confidence = (behavior.confidence || 0).toFixed(2);
    console.log(`  [${status}] ${behavior.id} (confidence: ${confidence})`);
    console.log(`    ${behavior.description.substring(0, 80)}...`);
    console.log(`    Evidence: ${(behavior.evidence_refs || []).length} files`);
    console.log();
  }

  console.log(`Total: ${discovered.new_behaviors.length} behaviors pending review`);
}

function approveDiscovery(args) {
  const runId = args['run-id'];
  const behaviorId = args['behavior-id'];
  if (!runId || !behaviorId) throw new Error('--run-id and --behavior-id are required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const discoveredPath = path.join(runRoot, 'evaluator', 'discovered-behaviors.yaml');

  if (!fileExists(discoveredPath)) {
    throw new Error(`No discoveries found for ${runId}`);
  }

  const discovered = readYamlFile(discoveredPath);
  const behavior = discovered.new_behaviors.find(b => b.id === behaviorId);

  if (!behavior) {
    throw new Error(`Behavior '${behaviorId}' not found in discoveries`);
  }

  if (behavior.status !== 'pending_review') {
    throw new Error(`Behavior '${behaviorId}' is not pending review (status: ${behavior.status})`);
  }

  behavior.status = 'approved';
  behavior.approved_at = timestamp();
  behavior.notes = args.notes || '';

  writeYamlFile(discoveredPath, discovered);

  const project = readYamlFile(resolveWorkspacePath('config/projects/sample-project.yaml'));
  const goldenPath = resolveWorkspacePath(path.posix.join(
    'goldens', 'projects', project.project_id || project.id, 'behaviors.yaml'
  ));
  const goldenSet = readYamlFile(goldenPath) || { behaviors: [] };

  goldenSet.behaviors.push({
    id: behavior.id,
    description: behavior.description,
    priority: args.priority || 'medium',
    category: 'ai_discovered',
    evidence_refs: behavior.evidence_refs,
    source: 'ai_discovered',
    discovered_in_run: behavior.discovery_run,
    approved_at: behavior.approved_at,
  });

  writeYamlFile(goldenPath, goldenSet);

  const discoveredGlobalPath = resolveWorkspacePath(path.posix.join(
    'goldens', 'projects', project.project_id || project.id, 'discovered.yaml'
  ));
  if (fileExists(discoveredGlobalPath)) {
    const globalDiscovered = readYamlFile(discoveredGlobalPath);
    const entry = (globalDiscovered.behaviors || []).find(b => b.id === behaviorId);
    if (entry) entry.status = 'approved';
    if (globalDiscovered.stats) {
      globalDiscovered.stats.approved = (globalDiscovered.stats.approved || 0) + 1;
      globalDiscovered.stats.pending_review = Math.max(0, (globalDiscovered.stats.pending_review || 0) - 1);
    }
    writeYamlFile(discoveredGlobalPath, globalDiscovered);
  }

  console.log(`[Approve] ${behaviorId} approved and added to golden set`);
}

function rejectDiscovery(args) {
  const runId = args['run-id'];
  const behaviorId = args['behavior-id'];
  if (!runId || !behaviorId) throw new Error('--run-id and --behavior-id are required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const discoveredPath = path.join(runRoot, 'evaluator', 'discovered-behaviors.yaml');

  if (!fileExists(discoveredPath)) {
    throw new Error(`No discoveries found for ${runId}`);
  }

  const discovered = readYamlFile(discoveredPath);
  const behavior = discovered.new_behaviors.find(b => b.id === behaviorId);

  if (!behavior) {
    throw new Error(`Behavior '${behaviorId}' not found in discoveries`);
  }

  behavior.status = 'rejected';
  behavior.rejected_at = timestamp();
  behavior.rejection_reason = args.reason || 'Not specified';

  writeYamlFile(discoveredPath, discovered);

  const project = readYamlFile(resolveWorkspacePath('config/projects/sample-project.yaml'));
  const discoveredGlobalPath = resolveWorkspacePath(path.posix.join(
    'goldens', 'projects', project.project_id || project.id, 'discovered.yaml'
  ));
  if (fileExists(discoveredGlobalPath)) {
    const globalDiscovered = readYamlFile(discoveredGlobalPath);
    const entry = (globalDiscovered.behaviors || []).find(b => b.id === behaviorId);
    if (entry) entry.status = 'rejected';
    if (globalDiscovered.stats) {
      globalDiscovered.stats.rejected = (globalDiscovered.stats.rejected || 0) + 1;
      globalDiscovered.stats.pending_review = Math.max(0, (globalDiscovered.stats.pending_review || 0) - 1);
    }
    writeYamlFile(discoveredGlobalPath, globalDiscovered);
  }

  console.log(`[Reject] ${behaviorId} rejected`);
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
    case 'record_lesson':
      recordLesson(args);
      break;
    case 'validate_seed_rubrics':
      validateSeedRubrics();
      break;
    case 'checkpoint_run':
      checkpointRun(args);
      break;
    case 'resume_run':
      resumeRun(args);
      break;
    case 'release_lock':
      releaseLockCommand(args);
      break;
    case 'run_generator':
      runGenerator(args).catch((err) => {
        console.error(`[Generator] Fatal: ${err.message}`);
        process.exitCode = 1;
      });
      break;
    case 'run_evaluator':
      runEvaluator(args).catch((err) => {
        console.error(`[Evaluator] Fatal: ${err.message}`);
        process.exitCode = 1;
      });
      break;
    case 'run_analyzer':
      runAnalyzer(args).catch((err) => {
        console.error(`[Analyzer] Fatal: ${err.message}`);
        process.exitCode = 1;
      });
      break;
    case 'run_mutator':
      runMutator(args).catch((err) => {
        console.error(`[Mutator] Fatal: ${err.message}`);
        process.exitCode = 1;
      });
      break;
    case 'review_discoveries':
      reviewDiscoveries(args);
      break;
    case 'approve_discovery':
      approveDiscovery(args);
      break;
    case 'reject_discovery':
      rejectDiscovery(args);
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
