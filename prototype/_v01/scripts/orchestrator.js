#!/usr/bin/env node

/**
 * Blueprint Mode — Formula-Driven Orchestrator
 *
 * Node script state machine that executes formula steps sequentially,
 * spawning AI agents for creative work but maintaining deterministic control.
 *
 * Core rule: Node decides WHAT happens. Agents decide HOW to do creative work.
 */

const path = require('path');
const { spawn } = require('child_process');
const YAML = require('yaml');

const {
  ensureDir,
  fileExists,
  getCurrentState,
  readYamlFile,
  readText,
  resolveWorkspacePath,
  timestamp,
  writeYamlFile,
  writeText,
  parseArgs,
} = require('./lib/common');

const { executeAgentStep } = require('./lib/agent');
const { validateStepOutput } = require('./lib/schema-validator');

// ─── Configuration ─────────────────────────────────────────────────────────

const MAX_STEP_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// ─── Template Rendering ────────────────────────────────────────────────────

function renderTemplate(template, context) {
  if (!template) return '';

  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, keyPath) => {
    const keys = keyPath.split('.');
    let value = context;

    for (const key of keys) {
      if (value === null || value === undefined) return match;
      value = value[key];
    }

    if (value === null || value === undefined) return match;

    // If value is an object/array, stringify it nicely for prompts
    if (typeof value === 'object') {
      return YAML.stringify(value);
    }

    return String(value);
  });
}

// ─── Phase Execution ───────────────────────────────────────────────────────

async function executePhase({ phaseId, formula, runId, project, state }) {
  console.log(`\n[Orchestrator] Phase: ${phaseId}`);

  switch (phaseId) {
    case 'init':
      return executeInitPhase({ runId, state });

    case 'freeze':
      return executeFreezePhase({ runId });

    case 'generate':
      return executeGeneratePhase({ formula, runId, project });

    case 'evaluate':
      return executeEvaluatePhase({ formula, runId, project });

    case 'analyze':
      return executeAnalyzePhase({ formula, runId, project });

    case 'mutate':
      return executeMutatePhase({ formula, runId, project });

    case 'register':
      return executeRegisterPhase({ runId });

    default:
      throw new Error(`Unknown phase: ${phaseId}`);
  }
}

// ─── Phase: init ───────────────────────────────────────────────────────────

async function executeInitPhase({ runId, state }) {
  console.log(`[Orchestrator] Initializing run: ${runId}`);

  await execCli('init_run', { 'run-id': runId });

  return { status: 'complete' };
}

// ─── Phase: freeze ─────────────────────────────────────────────────────────

async function executeFreezePhase({ runId }) {
  console.log(`[Orchestrator] Freezing inputs for: ${runId}`);

  await execCli('freeze_inputs', { 'run-id': runId });

  return { status: 'complete' };
}

// ─── Phase: generate (FORMULA-DRIVEN) ──────────────────────────────────────

async function executeGeneratePhase({ formula, runId, project }) {
  console.log(`[Orchestrator] Executing formula steps for: ${runId}`);
  console.log(`[Orchestrator] Formula: ${formula.id} v${formula.version}`);
  console.log(`[Orchestrator] Steps: ${formula.steps.map(s => s.id).join(' → ')}\n`);

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const generatorDir = path.join(runRoot, 'generator');
  const stepsDir = path.join(generatorDir, 'steps');
  const specsDir = path.join(generatorDir, 'specs');

  ensureDir(stepsDir);
  ensureDir(specsDir);

  const stepOutputs = {};
  const stepResults = [];
  let failedAtStep = null;
  let errorReason = null;

  for (let i = 0; i < formula.steps.length; i++) {
    const step = formula.steps[i];
    const stepNumber = i + 1;

    console.log(`[Orchestrator] Step ${stepNumber}/${formula.steps.length}: ${step.id} (${step.name})`);

    // Build prompt from template
    const promptContext = {
      project,
      run_id: runId,
      prior_outputs: stepOutputs,
      step_id: step.id,
      step_name: step.name,
      step_number: stepNumber,
      total_steps: formula.steps.length,
    };

    const prompt = renderTemplate(step.prompt, promptContext);

    // Execute step with retry logic
    let result = null;
    let lastError = null;
    let attempts = 0;

    while (attempts < MAX_STEP_RETRIES) {
      attempts++;

      try {
        if (step.agent) {
          // AI agent step
          result = await executeAgentStep({
            stepId: step.id,
            prompt,
            tools: step.tools || [],
            outputSchema: step.outputs || {},
            maxTokens: step.max_tokens || 16000,
            agentRole: step.agent,
            codebasePath: project.codebase_path,
          });
        } else if (step.tool) {
          // Deterministic tool step
          result = await executeToolStep({
            tool: step.tool,
            inputs: step.inputs || {},
            runId,
          });
        } else {
          throw new Error(`Step ${step.id} has neither agent nor tool defined`);
        }

        // HARD GATE: Validate output against schema
        const validation = validateStepOutput(result, step.outputs);
        if (!validation.valid) {
          throw new Error(`Output validation failed: ${validation.errors.join('; ')}`);
        }

        console.log(`[Orchestrator]   ✓ ${step.id} (attempt ${attempts}/${MAX_STEP_RETRIES})`);
        break;

      } catch (err) {
        lastError = err.message;
        console.error(`[Orchestrator]   ✗ ${step.id} attempt ${attempts} failed: ${lastError}`);

        if (attempts < MAX_STEP_RETRIES) {
          console.log(`[Orchestrator]   Retrying in ${RETRY_DELAY_MS / 1000}s...`);
          await delay(RETRY_DELAY_MS);
        }
      }
    }

    if (!result) {
      failedAtStep = stepNumber;
      errorReason = lastError;
      console.error(`[Orchestrator] Step ${step.id} failed after ${MAX_STEP_RETRIES} attempts`);
      break;
    }

    // Store output for next step
    stepOutputs[step.id] = result;
    stepResults.push({
      step_id: step.id,
      step_number: stepNumber,
      status: 'complete',
      confidence: result.confidence || 0.5,
      summary: result.summary || '',
    });

    // Write step artifact
    const stepOutputPath = path.join(stepsDir, `step-${stepNumber}-${step.id}.yaml`);
    writeYamlFile(stepOutputPath, result);
  }

  // Write generator output.yaml
  const status = failedAtStep ? 'failed' : 'complete';
  const overallConfidence = stepResults.length > 0
    ? stepResults.reduce((sum, s) => sum + (s.confidence || 0), 0) / stepResults.length
    : 0;

  const outputYaml = {
    run_id: runId,
    generator: 'orchestrator',
    status,
    formula_id: formula.id,
    formula_version: formula.version,
    steps_completed: stepResults.length,
    failed_at_step: failedAtStep,
    error_reason: errorReason,
    overall_confidence: Math.round(overallConfidence * 100) / 100,
    steps: stepResults,
    generated_at: timestamp(),
  };

  writeYamlFile(path.join(generatorDir, 'output.yaml'), outputYaml);

  if (failedAtStep) {
    throw new Error(`Generation failed at step ${failedAtStep}: ${errorReason}`);
  }

  console.log(`[Orchestrator] Generation complete. ${stepResults.length}/${formula.steps.length} steps executed.`);

  return { status: 'complete', step_outputs: stepOutputs };
}

// ─── Phase: evaluate ───────────────────────────────────────────────────────

async function executeEvaluatePhase({ formula, runId, project }) {
  console.log(`[Orchestrator] Evaluating run: ${runId}`);

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const evaluatorDir = path.join(runRoot, 'evaluator');
  ensureDir(evaluatorDir);

  const specsDir = path.join(runRoot, 'generator', 'specs');
  const specFiles = require('fs')
    .readdirSync(specsDir)
    .filter(f => f.endsWith('.yaml'));

  console.log(`[Orchestrator] Found ${specFiles.length} spec files`);

  const goldenSet = readYamlFile(resolveWorkspacePath(path.posix.join(
    'goldens', 'projects', project.project_id || project.id, 'behaviors.yaml'
  )));
  const goldenBehaviors = (goldenSet?.behaviors || []).map(b => b.id);
  const discoveredSpecIds = specFiles.map(f => f.replace('.yaml', ''));

  const recallHits = goldenBehaviors.filter(id => discoveredSpecIds.includes(id));
  const recallMisses = goldenBehaviors.filter(id => !discoveredSpecIds.includes(id));
  const recallScore = goldenBehaviors.length > 0
    ? recallHits.length / goldenBehaviors.length
    : 1.0;

  console.log(`[Orchestrator] Recall: ${recallHits.length}/${goldenBehaviors.length} golden behaviors found`);

  const discoveredPath = resolveWorkspacePath(path.posix.join(
    'goldens', 'projects', project.project_id || project.id, 'discovered.yaml'
  ));
  const existingDiscovered = readYamlFile(discoveredPath) || { behaviors: [] };
  const existingIds = new Set([
    ...goldenBehaviors,
    ...(existingDiscovered.behaviors || []).map(b => b.id),
  ]);

  const newDiscoveries = specFiles
    .map(f => {
      const spec = readYamlFile(path.join(specsDir, f));
      if (!spec) return null;

      const id = f.replace('.yaml', '');
      const behaviors = spec.behaviors || spec.golden_behaviors || [];
      const description = spec.description || behaviors[0]?.description || '';
      const evidence_refs = behaviors.flatMap(b => b.evidence_refs || []);
      const has_state_machine = !!spec.state_machine;

      return {
        id,
        description: description.substring(0, 200),
        evidence_refs,
        confidence: spec.confidence || 0.5,
        has_state_machine,
      };
    })
    .filter(Boolean)
    .filter(b => !existingIds.has(b.id));

  const discoveryScore = newDiscoveries.length > 0 ? 1.0 : 0.5;

  console.log(`[Orchestrator] Discovery: ${newDiscoveries.length} new behaviors (not in golden set)`);

  if (newDiscoveries.length > 0) {
    const reviewFile = {
      run_id: runId,
      golden_set_version: goldenSet?.version || 'v001',
      discovered_at: timestamp(),
      new_behaviors: newDiscoveries.map(b => ({
        ...b,
        status: 'pending_review',
        discovery_run: runId,
        discovered_by: 'spec-writer-agent',
      })),
    };
    writeYamlFile(path.join(evaluatorDir, 'discovered-behaviors.yaml'), reviewFile);

    const merged = {
      project_id: project.project_id || project.id,
      ecosystem: project.ecosystem || 'frontend',
      version: incrementVersion(existingDiscovered.version || 'v001'),
      behaviors: [
        ...(existingDiscovered.behaviors || []),
        ...reviewFile.new_behaviors,
      ],
      stats: {
        total_discovered: (existingDiscovered.behaviors?.length || 0) + newDiscoveries.length,
        approved: existingDiscovered.stats?.approved || 0,
        rejected: existingDiscovered.stats?.rejected || 0,
        pending_review: (existingDiscovered.stats?.pending_review || 0) + newDiscoveries.length,
      },
      last_updated: timestamp(),
    };
    writeYamlFile(discoveredPath, merged);
  }

  console.log(`[Orchestrator] Running mechanical evaluation...`);
  const mechanicalResults = await runMechanicalEvaluation({
    specFiles,
    specsDir,
    codebasePath: project.codebase_path,
    checks: formula.evaluation?.precision?.mechanical?.checks || [],
  });

  console.log(`[Orchestrator] Running agent evaluation...`);
  const agentResults = await runAgentEvaluation({
    specFiles,
    specsDir,
    codebasePath: project.codebase_path,
    prompt: formula.evaluation?.precision?.agent?.prompt,
    agentRole: formula.evaluation?.precision?.agent?.agent || 'spec-reviewer',
  });

  const mechanicalWeight = formula.evaluation?.precision?.mechanical?.weight || 0.7;
  const agentWeight = formula.evaluation?.precision?.agent?.weight || 0.3;
  const precisionScore = (mechanicalResults.score * mechanicalWeight) +
    (agentResults.score * agentWeight);

  const overallScore = (recallScore * 0.4) + (precisionScore * 0.3) + (discoveryScore * 0.3);

  const evaluationOutput = {
    run_id: runId,
    evaluator: 'orchestrator',
    status: 'complete',
    formula_id: formula.id,
    recall: {
      golden_behaviors_total: goldenBehaviors.length,
      golden_behaviors_found: recallHits.length,
      score: Math.round(recallScore * 100) / 100,
      hits: recallHits,
      misses: recallMisses,
    },
    discovery: {
      new_behaviors_found: newDiscoveries.length,
      score: Math.round(discoveryScore * 100) / 100,
      new_behaviors: newDiscoveries.map(b => b.id),
      pending_review_path: newDiscoveries.length > 0
        ? path.posix.join('runs', runId, 'evaluator', 'discovered-behaviors.yaml')
        : null,
    },
    precision: {
      mechanical: Math.round(mechanicalResults.score * 100) / 100,
      agent: Math.round(agentResults.score * 100) / 100,
      combined: Math.round(precisionScore * 100) / 100,
    },
    overall_score: Math.round(overallScore * 100) / 100,
    scored_specs: specFiles.map(f => ({
      id: f.replace('.yaml', ''),
      precision: {
        mechanical: mechanicalResults.perSpec[f] || { score: 0, issues: [] },
        agent: agentResults.perSpec[f] || { score: 0, issues: [] },
        combined: ((mechanicalResults.perSpec[f]?.score || 0) * mechanicalWeight) +
          ((agentResults.perSpec[f]?.score || 0) * agentWeight),
      },
    })),
    mechanical_issues: mechanicalResults.issues,
    agent_issues: agentResults.issues,
    evaluated_at: timestamp(),
  };

  writeYamlFile(path.join(evaluatorDir, 'output.yaml'), evaluationOutput);

  console.log(`[Orchestrator] Evaluation complete.`);
  console.log(`  Recall: ${evaluationOutput.recall.score} (${recallHits.length}/${goldenBehaviors.length})`);
  console.log(`  Discovery: ${evaluationOutput.discovery.score} (${newDiscoveries.length} new)`);
  console.log(`  Precision: ${evaluationOutput.precision.combined}`);
  console.log(`  Overall: ${evaluationOutput.overall_score}`);

  return { status: 'complete', evaluation: evaluationOutput };
}

function incrementVersion(version) {
  const match = version.match(/v(\d+)/);
  if (!match) return 'v001';
  const num = parseInt(match[1], 10) + 1;
  return `v${String(num).padStart(3, '0')}`;
}

// ─── Phase: analyze ────────────────────────────────────────────────────────

async function executeAnalyzePhase({ formula, runId, project }) {
  console.log(`[Orchestrator] Analyzing run: ${runId}`);

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const analyzerDir = path.join(runRoot, 'analyzer');
  ensureDir(analyzerDir);

  const codebasePath = project.codebase_path;

  const evaluation = readYamlFile(path.join(runRoot, 'evaluator', 'output.yaml'));

  const prompt = `You are the Analyzer agent. Diagnose WHY the formula missed or produced imprecise specs.

RUN_ID: ${runId}
FORMULA: ${formula.id} v${formula.version}
CODEBASE: ${codebasePath}

When reading source files, use absolute paths starting with ${codebasePath}/
Do NOT read files relative to the prototype workspace. Always prefix with the codebase path.

## Evaluation Results
- Precision: ${evaluation.overall_score.precision}
- Mechanical score: ${evaluation.overall_score.mechanical}
- Agent score: ${evaluation.overall_score.agent}

## Mechanical Issues
${YAML.stringify(evaluation.mechanical_issues)}

## Agent Issues
${YAML.stringify(evaluation.agent_issues)}

## Formula Steps
${formula.steps.map(s => `- ${s.id}: ${s.name}`).join('\n')}

## Your Task
1. Identify the primary failure type:
   - search_failure: didn't find relevant files
   - recognition_failure: found files but didn't understand behavior
   - format_failure: spec structure was wrong
   - prompt_failure: instructions were unclear or missing
   - schema_failure: output didn't match expected schema

2. Diagnose which formula step(s) caused the issue

3. Suggest a concrete mutation:
   - type: prompt_tweak | step_management | schema_change
   - target_step: which step to modify
   - change: exactly what to add/change/remove

Write your diagnosis to: ${path.join(analyzerDir, 'output.yaml')}
`;

  const result = await executeAgentStep({
    stepId: 'analyze',
    prompt,
    tools: ['read', 'write'],
    codebasePath: project.codebase_path,
    outputSchema: {
      primary_failure_type: { type: 'string' },
      diagnosis: { type: 'string' },
      affected_steps: { type: 'array' },
      suggested_mutation: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          target_step: { type: 'string' },
          change: { type: 'string' },
        },
      },
      confidence: { type: 'number' },
    },
    agentRole: 'behavior-analyzer',
  });

  writeYamlFile(path.join(analyzerDir, 'output.yaml'), result);

  console.log(`[Orchestrator] Analysis complete. Failure type: ${result.primary_failure_type}`);

  return { status: 'complete', analysis: result };
}

// ─── Phase: mutate ─────────────────────────────────────────────────────────

async function executeMutatePhase({ formula, runId, project }) {
  console.log(`[Orchestrator] Mutating formula for run: ${runId}`);

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const mutatorDir = path.join(runRoot, 'mutator');
  ensureDir(mutatorDir);

  // Read analysis
  const analysis = readYamlFile(path.join(runRoot, 'analyzer', 'output.yaml'));

  if (!analysis.suggested_mutation) {
    console.log(`[Orchestrator] No mutation suggested. Skipping.`);
    writeYamlFile(path.join(mutatorDir, 'output.yaml'), {
      run_id: runId,
      status: 'complete',
      proposed_change: null,
      reason: 'No mutation suggested by analyzer',
    });
    return { status: 'complete', mutation: null };
  }

  // Build mutation prompt
  const prompt = `You are the Mutator agent. Produce a candidate formula mutation.

RUN_ID: ${runId}
CURRENT FORMULA: ${formula.id} v${formula.version}

## Analysis
Failure type: ${analysis.primary_failure_type}
Diagnosis: ${analysis.diagnosis}

## Suggested Mutation
Type: ${analysis.suggested_mutation.type}
Target step: ${analysis.suggested_mutation.target_step}
Change: ${analysis.suggested_mutation.change}

## Current Formula Steps
${YAML.stringify(formula.steps)}

## Your Task
1. Apply the suggested mutation to the formula
2. Produce the COMPLETE updated formula YAML
3. Write it to: ${path.join(mutatorDir, 'formula-candidate.yaml')}

Rules:
- Only modify the target step
- Preserve all other steps exactly
- Update the version number
- Add a mutation record to consolidated_mutations
`;

  const result = await executeAgentStep({
    stepId: 'mutate',
    prompt,
    tools: ['read', 'write'],
    codebasePath: project.codebase_path,
    outputSchema: {
      proposed_change: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          target_step: { type: 'string' },
          description: { type: 'string' },
        },
      },
      confidence: { type: 'number' },
    },
    agentRole: 'formula-mutator',
  });

  writeYamlFile(path.join(mutatorDir, 'output.yaml'), {
    run_id: runId,
    status: 'complete',
    ...result,
  });

  console.log(`[Orchestrator] Mutation complete. Type: ${result.proposed_change?.type}`);

  return { status: 'complete', mutation: result };
}

// ─── Phase: register ───────────────────────────────────────────────────────

async function executeRegisterPhase({ runId }) {
  console.log(`[Orchestrator] Registering candidates for: ${runId}`);

  const runRoot = resolveWorkspacePath(path.posix.join('runs', runId));
  const mutatorOutputPath = path.join(runRoot, 'mutator', 'output.yaml');
  const formulaCandidatePath = path.join(runRoot, 'mutator', 'formula-candidate.yaml');

  if (!fileExists(mutatorOutputPath)) {
    console.log(`[Orchestrator] No mutator output. Nothing to register.`);
    return { status: 'complete' };
  }

  const mutatorOutput = readYamlFile(mutatorOutputPath);

  if (mutatorOutput.proposed_change && fileExists(formulaCandidatePath)) {
    await execCli('register_formula_candidate', { file: formulaCandidatePath });
  }

  return { status: 'complete' };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function execCli(command, args) {
  const argList = Object.entries(args).map(([k, v]) => [`--${k}`, v]).flat();

  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, 'cli.js'), command, ...argList], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`CLI command ${command} exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runMechanicalEvaluation({ specFiles, specsDir, codebasePath, checks }) {
  const issues = [];
  const perSpec = {};

  for (const specFile of specFiles) {
    const specPath = path.join(specsDir, specFile);
    const spec = readYamlFile(specPath);

    if (!spec) {
      issues.push({
        type: 'missing_spec',
        file: specFile,
        message: `Spec file not found: ${specPath}`,
      });
      perSpec[specFile] = { score: 0, issues: [{ type: 'missing_spec', file: specFile }] };
      continue;
    }

    const specIssues = [];
    const behaviors = spec.behaviors || spec.golden_behaviors || [];

    for (const behavior of behaviors) {
      for (const ref of behavior.evidence_refs || []) {
        const fullPath = path.join(codebasePath, ref);
        if (!fileExists(fullPath)) {
          specIssues.push({
            type: 'missing_evidence',
            behavior: behavior.id,
            ref,
            message: `Evidence file not found: ${ref}`,
          });
        }
      }
    }

    perSpec[specFile] = {
      score: specIssues.length === 0 ? 1.0 : Math.max(0, 1.0 - (specIssues.length * 0.2)),
      issues: specIssues,
    };

    issues.push(...specIssues);
  }

  const totalScore = Object.values(perSpec).reduce((sum, s) => sum + s.score, 0) /
    Math.max(1, Object.keys(perSpec).length);

  return { score: totalScore, perSpec, issues };
}

async function runAgentEvaluation({ specFiles, specsDir, codebasePath, prompt, agentRole }) {
  const reviewPrompt = `${prompt || 'Review these specs for accuracy against the codebase.'}

Specs to review (located in ${specsDir}):
${specFiles.join('\n')}

Codebase: ${codebasePath}

For each spec file, read it from ${specsDir}/<filename> and verify:
- Behaviors match actual code
- Evidence refs point to real files
- No hallucinated business logic

Output a score (0.0-1.0) and list of issues found.
`;

  const result = await executeAgentStep({
    stepId: 'evaluate-agent',
    prompt: reviewPrompt,
    tools: ['read'],
    codebasePath,
    outputSchema: {
      score: { type: 'number' },
      issues: { type: 'array' },
      perSpec: { type: 'object' },
    },
    agentRole: agentRole || 'spec-reviewer',
  });

  return {
    score: result.score || 0.5,
    issues: result.issues || [],
    perSpec: result.perSpec || {},
  };
}

async function executeToolStep({ tool, inputs, runId }) {
  switch (tool) {
    case 'schema-validator':
      // Validate specs against schema
      return {
        status: 'complete',
        valid_specs: [],
        invalid_specs: [],
        summary: 'Schema validation placeholder',
      };

    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runId = args['run-id'];

  if (!runId) {
    console.error('Usage: node scripts/orchestrator.js --run-id run-0018');
    process.exit(1);
  }

  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Blueprint Mode — Formula-Driven Orchestrator v2            ║`);
  console.log(`║  Run: ${runId.padEnd(51)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  const state = getCurrentState();
  const formula = readYamlFile(resolveWorkspacePath(state.current_formula_ref));
  const project = readYamlFile(resolveWorkspacePath(state.current_project_ref));

  console.log(`[Orchestrator] Formula: ${formula.id} v${formula.version}`);
  console.log(`[Orchestrator] Project: ${project.project_id || project.id}`);
  console.log(`[Orchestrator] Codebase: ${project.codebase_path}\n`);

  const phases = ['init', 'freeze', 'generate', 'evaluate', 'analyze', 'mutate', 'register'];

  try {
    for (const phaseId of phases) {
      const result = await executePhase({ phaseId, formula, runId, project, state });

      if (result.status === 'failed') {
        console.error(`\n[Orchestrator] Phase ${phaseId} FAILED. Stopping.`);
        process.exit(1);
      }
    }

    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║  RUN COMPLETE: ${runId.padEnd(46)}║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);

  } catch (err) {
    console.error(`\n[Orchestrator] FATAL: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { executePhase, renderTemplate };
