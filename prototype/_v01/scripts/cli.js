#!/usr/bin/env node

const path = require('path');
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
  readJsonLines,
  readYamlFile,
  readText,
  releaseLock,
  resolveFormulaExtends,
  resolveWorkspacePath,
  RUN_PHASES,
  timestamp,
  writeCheckpoint,
  writeCurrentState,
  writeQueueState,
  writeText,
  writeYamlFile,
} = require('./lib/common');
const { validateArtifactsForRun, validateFile } = require('./lib/validation');

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
  const rubric = readYamlFile(path.join(inputsDir, 'rubric.yaml'));
  const goldenSet = readYamlFile(path.join(inputsDir, 'golden-set.yaml'));
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

Active rubric criteria:
${(rubric.active_criteria || []).map((c) => `  - ${c}`).join('\n')}

Golden set behaviors (primary anchor):
${(goldenSet.behaviors || []).map((b) => `  - ${b.id}: ${b.description}`).join('\n')}
`;

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
  const manifest = readYamlFile(path.join(runRoot, 'manifest.yaml'));
  const inputsDir = path.join(runRoot, 'inputs');
  const evaluatorDir = path.join(runRoot, 'evaluator');
  ensureDir(evaluatorDir);

  const formula = readYamlFile(path.join(inputsDir, 'formula.yaml'));
  const rubric = readYamlFile(path.join(inputsDir, 'rubric.yaml'));
  const goldenSet = readYamlFile(path.join(inputsDir, 'golden-set.yaml'));
  const project = readYamlFile(path.join(inputsDir, 'project.yaml'));
  const genOutput = readYamlFile(path.join(runRoot, 'generator', 'output.yaml'));
  const evaluatorPrompt = readText(resolveWorkspacePath('prompts/evaluator.md'));
  const config = readYamlFile(resolveWorkspacePath('config/prototype.yaml'));

  const provider = loadProvider(config.providers?.default || 'local');

  const specFiles = listDir(path.join(runRoot, 'generator', 'specs'))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => readYamlFile(path.join(runRoot, 'generator', 'specs', f)));

  const specSummary = specFiles.map((s) => `- ${s.id}: ${JSON.stringify(s)}`).join('\n');

  const systemPrompt = `${evaluatorPrompt}

Project: ${project.name || project.id}
Ecosystem: ${formula.ecosystem}

Active rubric criteria (official scoring channel):
${(rubric.active_criteria || []).map((c) => `  - ${c}`).join('\n')}

Golden set behaviors (primary anchor — recall only):
${(goldenSet.behaviors || []).map((b) => `  - ${b.id}: ${b.description}`).join('\n')}

Scoring policy: Candidate rubric criteria must NOT affect official scores.`;

  const userPrompt = `###ROLE### evaluator
Evaluator: score the generated specs against the frozen rubric and golden set.

Generated specs (${specFiles.length}):
${specSummary}

Overall generator confidence: ${genOutput.overall_confidence}
Generator flags for analyzer: ${(genOutput.flags_for_analyzer || []).join(', ') || 'none'}
Generator unresolved questions: ${(genOutput.unresolved_questions || []).join(', ') || 'none'}

Produce:
1. recall_hits — golden set behaviors captured by specs
2. recall_misses — golden set behaviors missing from specs
3. precision_findings — hallucinated or unsupported claims
4. consistency_findings — internal spec contradictions
5. rubric_gap_candidates — suspected rubric gaps (NOT activated, only proposed)
6. overall_score — weighted average

Format as structured YAML.`;

  try {
    const response = await provider.generate([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { model: config.providers?.default || 'local' });

    const parsed = YAML.parse(response.content);

    const outputYaml = {
      run_id: runId,
      evaluator: 'run_evaluator',
      status: 'complete',
      provider: config.providers?.default || 'local',
      confidence: parsed.confidence || 0.75,
      ...parsed,
      scored_specs: specFiles.map((s) => s.id),
      scoring_timestamp: timestamp(),
      tokens_used: response.usage?.total_tokens || 0,
    };

    writeYamlFile(path.join(evaluatorDir, 'output.yaml'), outputYaml);
    writeText(path.join(evaluatorDir, 'trace.json'), JSON.stringify({
      run_id: runId,
      request: { systemPrompt, userPrompt },
      response: { content: response.content, usage: response.usage },
    }, null, 2));

    console.log(`[Evaluator] Done. Overall score: ${parsed.overall_score || 'N/A'}`);
  } catch (err) {
    console.error(`[Evaluator] Failed: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAnalyzer(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const inputsDir = path.join(runRoot, 'inputs');
  const analyzerDir = path.join(runRoot, 'analyzer');
  ensureDir(analyzerDir);

  const formula = readYamlFile(path.join(inputsDir, 'formula.yaml'));
  const rubric = readYamlFile(path.join(inputsDir, 'rubric.yaml'));
  const evaluatorOutput = readYamlFile(path.join(runRoot, 'evaluator', 'output.yaml'));
  const genOutput = readYamlFile(path.join(runRoot, 'generator', 'output.yaml'));
  const lessons = readJsonLines(resolveWorkspacePath('lessons/learned.jsonl'));
  const analyzerPrompt = readText(resolveWorkspacePath('prompts/analyzer.md'));
  const failureTypes = readText(resolveWorkspacePath('prompts/shared/failure-types.md'));
  const config = readYamlFile(resolveWorkspacePath('config/prototype.yaml'));
  const provider = loadProvider(config.providers?.default || 'local');

  // Load all generator step outputs for phase-level tracing
  const genStepsDir = path.join(runRoot, 'generator', 'steps');
  const genStepFiles = listDir(genStepsDir).filter((f) => f.endsWith('.yaml'));
  const genSteps = genStepFiles
    .map((f) => readYamlFile(path.join(genStepsDir, f)))
    .sort((a, b) => (a.step_number || 0) - (b.step_number || 0));

  const systemPrompt = `${analyzerPrompt}

Failure types — apply the decision tree in order. Stop at the first match:

${failureTypes}

Rules:
- rubric_gap_failure is only valid when steps 1–4 are exhausted and the criterion is absent from rubric.active_criteria
- Do NOT use rubric_gap_failure as a default diagnosis
- Exhaust lower-tier explanations before proposing rubric gaps`;

  // Build structured context for 5-type routing
  const scoredSpecs = (evaluatorOutput.scored_specs || []).join(', ') || 'none';
  const recallHits = evaluatorOutput.recall_hits || [];
  const recallMisses = evaluatorOutput.recall_misses || [];
  const precisionFindings = evaluatorOutput.precision_findings || [];
  const rubricGapCandidates = evaluatorOutput.rubric_gap_candidates || [];
  const genFlags = (genOutput.flags_for_analyzer || []).join(', ') || 'none';

  // Formula step outputs (explore = step 1, draft = step 3 — most diagnostic for 5-type)
  const exploreStep = genSteps.find((s) => s.step === 'explore');
  const draftStep = genSteps.find((s) => s.step === 'draft');
  const verifyStep = genSteps.find((s) => s.step === 'verify');

  const userPrompt = `###ROLE### analyzer

You must diagnose WHY the formula missed behavior by applying the failure-type decision tree.

---

## Evaluation Results

Recall hits (what was covered):
${recallHits.length > 0
    ? recallHits.map((h) => `  - ${h.criterion} → ${h.spec} (weight ${h.weight})`).join('\n')
    : '  (none)'}

Recall misses (what was missed):
${recallMisses.length > 0
    ? recallMisses.map((m) => `  - ${m.criterion}: ${m.gap} (severity: ${m.severity})`).join('\n')
    : '  (none)'}

Precision findings (false positives):
${precisionFindings.length > 0
    ? precisionFindings.map((p) => `  - ${p.spec}: ${p.concern} (${p.severity})`).join('\n')
    : '  (none)'}

Evaluator rubric gap candidates (criteria the evaluator flagged as potentially absent from rubric):
${rubricGapCandidates.length > 0
    ? rubricGapCandidates.map((c) => `  - ${c.criterion}: ${c.gap}`).join('\n')
    : '  (none)'}

Overall score: ${evaluatorOutput.overall_score}
Scored specs: ${scoredSpecs}

---

## Active Rubric (${rubric.rubric_version})

Active criteria:
${(rubric.active_criteria || []).map((c) => `  - ${c}`).join('\n')}

Weights:
${Object.entries(rubric.weights || {}).map(([k, v]) => `  - ${k}: ${v}`).join('\n')}

---

## Formula Steps

Explore step (step 1 — what was found):
${exploreStep ? `
  Files analyzed: ${(exploreStep.files_analyzed || []).join(', ') || 'none'}
  Artifacts produced: ${(exploreStep.artifacts_produced || []).join(', ') || 'none'}
  Confidence: ${exploreStep.confidence}
  Flags: ${(exploreStep.flags_for_analyzer || []).join(', ') || 'none'}
  Unresolved: ${(exploreStep.unresolved_questions || []).join('; ') || 'none'}
` : '  (no explore step found)'}

Draft step (step 3 — what was produced):
${draftStep ? `
  Specs produced: ${(draftStep.artifacts_produced || []).join(', ') || 'none'}
  Confidence: ${draftStep.confidence}
  Flags: ${(draftStep.flags_for_analyzer || []).join(', ') || 'none'}
  Unresolved: ${(draftStep.unresolved_questions || []).join('; ') || 'none'}
` : '  (no draft step found)'}

Verify step (step 4 — schema validation):
${verifyStep ? `
  Status: ${verifyStep.status}
  Confidence: ${verifyStep.confidence}
` : '  (no verify step found)'}

Generator flags for analyzer: ${genFlags}
Generator overall confidence: ${genOutput.overall_confidence}
Generator unresolved questions: ${(genOutput.unresolved_questions || []).join('; ') || 'none'}

---

## Formula Structure

Formula: ${formula.id} (${formula.version})
Steps: ${(formula.steps || []).map((s) => s.id).join(' → ')}
Validations: ${(formula.validations || []).join(', ')}
Behavior shapes: ${(formula.behavior_shapes || []).join(', ')}

---

## Prior Lessons (insanity prevention — do not retry failed methods)

${lessons.length > 0
    ? lessons.map((l) => `  - [${l.failure_type}] ${l.teaching_method} → ${l.result}`).join('\n')
    : '  (no prior lessons)'}

---

## Your Task

Apply the failure-type decision tree:

1. **search_failure** — Did the explore step fail to find relevant files?
2. **recognition_failure** — Did explore find files but draft collapse/miss the pattern?
3. **format_failure** — Did the spec fail schema validation?
4. **prompt_failure** — Does the formula's own step prompts ask for this behavior?
5. **rubric_gap_failure** — Does the criterion NOT appear in rubric.active_criteria AND appear in evaluator's rubric_gap_candidates?

Produce these fields:
1. **primary_failure_type** — exact label (search_failure | recognition_failure | format_failure | prompt_failure | rubric_gap_failure)
2. **diagnosis** — causal chain explaining which step failed and why
3. **failure_tier** — mutation tier to address it
4. **suggested_mutation** — concrete change recommendation
5. **expected_effect** — what measurable improvement to expect
6. **rubric_gap_proposed** — true only if steps 1-4 are exhausted and criterion is absent from rubric
7. **rubric_gap_proposal** — null, or { id, description, evidence_refs, rationale }
8. **evidence_refs** — which generator step files support this diagnosis

Format as structured YAML.`;

  try {
    const response = await provider.generate([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { model: config.providers?.default || 'local' });

    const parsed = YAML.parse(response.content);

    const outputYaml = {
      run_id: runId,
      analyzer: 'run_analyzer',
      status: 'complete',
      provider: config.providers?.default || 'local',
      confidence: parsed.confidence || 0.71,
      ...parsed,
      analyzer_timestamp: timestamp(),
      tokens_used: response.usage?.total_tokens || 0,
    };

    writeYamlFile(path.join(analyzerDir, 'output.yaml'), outputYaml);

    console.log(`[Analyzer] Done. Failure type: ${parsed.primary_failure_type}, Tier: ${parsed.failure_tier}`);
  } catch (err) {
    console.error(`[Analyzer] Failed: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runMutator(args) {
  const runId = args['run-id'];
  if (!runId) throw new Error('--run-id is required');

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const inputsDir = path.join(runRoot, 'inputs');
  const mutatorDir = path.join(runRoot, 'mutator');
  ensureDir(mutatorDir);

  const formula = readYamlFile(path.join(inputsDir, 'formula.yaml'));
  const analyzerOutput = readYamlFile(path.join(runRoot, 'analyzer', 'output.yaml'));
  const evaluatorOutput = readYamlFile(path.join(runRoot, 'evaluator', 'output.yaml'));
  const lessons = readJsonLines(resolveWorkspacePath('lessons/failed.jsonl'));
  const mutatorPrompt = readText(resolveWorkspacePath('prompts/mutator.md'));
  const config = readYamlFile(resolveWorkspacePath('config/prototype.yaml'));

  const provider = loadProvider(config.providers?.default || 'local');

  const rubricGapProposal = analyzerOutput.rubric_gap_proposed
    ? analyzerOutput.rubric_gap_proposal
    : null;

  const systemPrompt = `${mutatorPrompt}

Insanity prevention rule: Do not retry the same failed teaching method on the same failure type without explicit justification.

Mutation tiers (try in order):
1. prompt_tweak
2. step_management
3. parent_guideline
4. schema_change
5. tool_change
6. rubric_mutation

When the analyzer proposes a rubric_gap_failure, you must also produce a rubric_candidate artifact.
The rubric_candidate goes through governed review before affecting official scoring.
Do NOT treat a gap proposal as already active or official.`;

  const recallMisses = (evaluatorOutput.recall_misses || []).map((m) =>
    `  - [${m.criterion}] ${m.spec}: ${m.gap} (severity: ${m.severity})`
  ).join('\n') || '  (none)';

  const userPrompt = `###ROLE### mutator
Mutator: produce the next candidate formula mutation AND a rubric candidate if the analyzer diagnosed a rubric gap.

## Analyzer Diagnosis

- Failure type: ${analyzerOutput.primary_failure_type}
- Diagnosis: ${analyzerOutput.diagnosis}
- Failure tier: ${analyzerOutput.failure_tier}
- Suggested mutation: ${analyzerOutput.suggested_mutation}
- Expected effect: ${analyzerOutput.expected_effect}
- Rubric gap proposed: ${analyzerOutput.rubric_gap_proposed === true ? 'YES — produce rubric_candidate below' : 'no'}
${rubricGapProposal ? `
Rubric gap proposal from analyzer:
  id: ${rubricGapProposal?.id || 'auto-generated-id'}
  description: ${rubricGapProposal?.description || analyzerOutput.diagnosis}
  evidence_refs: ${(rubricGapProposal?.evidence_refs || analyzerOutput.evidence_refs || []).join(', ')}
` : ''}

## Evaluator Recall Misses (context — these drove the analyzer diagnosis)

${recallMisses}

## Current Formula

${formula.id} (${formula.version})
Steps: ${(formula.steps || []).map((s) => s.id).join(' → ')}
Validations: ${(formula.validations || []).join(', ')}

## Prior Failed Attempts (insanity check — do not repeat same method for same failure type)

${(lessons || []).filter((l) => l.failure_type === analyzerOutput.primary_failure_type).map((l) => `  - ${l.teaching_method}: ${l.scenario} (${l.result})`).join('\n') || '  (none)'}

## Your Task

Always produce:
1. **proposed_change** (type, target_step/field, current, proposed, expected_improvement, risk)
2. **insanity_check** (method_already_failed, failed_runs, justification)
3. **rationale** (why this mutation addresses the diagnosis)

If rubric_gap_proposed is true, ALSO produce:
4. **rubric_candidate** with these fields:
   - id: auto-generated snake_case ID (e.g. "missing_state_machine_boundaries")
   - status: "candidate"
   - description: description of the missing criterion
   - source: "rubric_gap_failure"
   - rationale: why this criterion should be added to the rubric
   - confidence: your confidence this is a genuine gap (0.0–1.0)
   - recommended_state: "probation" (always — gap candidates start in probation)
   - discovered_in_run: "${runId}"
   - evidence_refs: specs or files demonstrating the gap
   - source_run: "${runId}"
   - evaluator_score: ${evaluatorOutput.overall_score}
   - failure_type: "${analyzerOutput.primary_failure_type}"
   - analyzer_confidence: ${analyzerOutput.confidence}
   - recall_misses_triggered: array of the recall_misses that triggered this diagnosis
   - scored_specs_examined: ${(evaluatorOutput.scored_specs || []).join(', ')}
   - evidence_count: 1
   - first_observed_run: "${runId}"
   - last_observed_run: "${runId}"
   - precision_concern: "${(evaluatorOutput.precision_findings || [])[0]?.concern || 'none'}"
   - weight_recommendation: 1.0
   - probation_runs_remaining: 3

Format as structured YAML.`;

  try {
    const response = await provider.generate([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { model: config.providers?.default || 'local' });

    const parsed = YAML.parse(response.content);

    const outputYaml = {
      run_id: runId,
      mutator: 'run_mutator',
      status: 'complete',
      provider: config.providers?.default || 'local',
      confidence: parsed.confidence || 0.68,
      ...parsed,
      mutator_timestamp: timestamp(),
      tokens_used: response.usage?.total_tokens || 0,
    };

    writeYamlFile(path.join(mutatorDir, 'output.yaml'), outputYaml);

    if (parsed.rubric_candidate) {
      writeYamlFile(path.join(mutatorDir, 'rubric-candidate.yaml'), {
        ...parsed.rubric_candidate,
        discovered_in_run: runId,
        created_at: timestamp(),
      });
      console.log(`[Mutator] Rubric candidate also produced: ${parsed.rubric_candidate.id}`);
    }

    if (parsed.proposed_change) {
      console.log(`[Mutator] Done. Proposed: ${parsed.proposed_change.type}`);
    } else {
      console.log(`[Mutator] Done. No formula mutation (rubric gap only).`);
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
