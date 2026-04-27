#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');
const {
  acquireLock,
  releaseLock,
  getCheckpoint,
  getCurrentState,
  timestamp,
  fileExists,
  readYamlFile,
} = require('./scripts/lib/common');

const WORKSPACE_ROOT = path.resolve(__dirname);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
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

function usage() {
  console.log(`Usage: node start [--run-id run-0018] [--resume]

Launches the formula-driven orchestrator for one bounded evolution cycle.

Options:
  --run-id <id>       Run ID to prepare or resume. Defaults to next_run_id from state/current.yaml.
  --resume            Resume an interrupted run instead of starting fresh.
  --no-lock           Skip lock acquisition (for recovery from stale locks).
  --help              Show this message.

One bounded cycle:
  init → freeze → generate → evaluate → analyze → mutate → register
  Then STOP. advance_formula and promote_rubric_snapshot are governed steps.
`);
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    return;
  }

  const args = parseArgs(argv);
  const resume = !!args.resume;
  const skipLock = !!args['no-lock'];

  let runId;

  if (resume) {
    if (!args['run-id']) {
      console.error('--run-id is required with --resume');
      process.exit(1);
    }
    runId = args['run-id'];
    const checkpoint = getCheckpoint(runId);
    if (!checkpoint) {
      console.error(`No checkpoint found for ${runId}. Cannot resume.`);
      process.exit(1);
    }
    console.log(`[start] Resuming run ${runId} from checkpoint: phase=${checkpoint.phase} status=${checkpoint.status}`);
  } else {
    if (args['run-id']) {
      runId = args['run-id'];
    } else {
      const state = getCurrentState();
      runId = state.next_run_id;
      console.log(`[start] No --run-id given. Using next_run_id: ${runId}`);
    }
  }

  if (!skipLock) {
    try {
      acquireLock(runId);
      console.log(`[start] Lock acquired: ${runId}`);
    } catch (err) {
      console.error(`[start] Lock acquisition failed: ${err.message}`);
      process.exit(1);
    }
  }

  const state = getCurrentState();
  const formula = readYamlFile(path.join(WORKSPACE_ROOT, state.current_formula_ref));

  console.log(`[start] Blueprint Mode v2 — Formula-Driven Orchestrator`);
  console.log(`[start] Run: ${runId}`);
  console.log(`[start] Formula: ${formula.id} v${formula.version}`);
  console.log(`[start] Workspace: ${WORKSPACE_ROOT}\n`);

  try {
    const orchestratorPath = path.join(WORKSPACE_ROOT, 'scripts', 'orchestrator.js');

    const child = spawn('node', [orchestratorPath, '--run-id', runId], {
      stdio: 'inherit',
      cwd: WORKSPACE_ROOT,
      env: { ...process.env },
    });

    child.on('exit', (code) => {
      if (!skipLock) {
        releaseLock(runId);
        console.log(`[start] Lock released: ${runId}`);
      }
      process.exit(code || 0);
    });

  } catch (err) {
    console.error(`[start] Fatal: ${err.message}`);
    if (!skipLock) {
      try { releaseLock(runId); } catch (_) {}
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[start] Fatal: ${err.message}`);
  process.exit(1);
});
