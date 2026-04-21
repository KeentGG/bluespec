#!/usr/bin/env node

const path = require('path');
const { acquireLock, releaseLock, getCheckpoint, getCurrentState, timestamp } = require('./scripts/lib/common');

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
  console.log(`Usage: node start [--run-id run-0003] [--resume] [--opencode-bin opencode]

Launches the Blueprint Harness OpenCode agent for one bounded evolution cycle.

Options:
  --run-id <id>       Run ID to prepare or resume. Defaults to next_run_id from state/current.yaml.
  --resume            Resume an interrupted run instead of starting fresh.
  --opencode-bin      Path to opencode binary. Defaults to 'opencode'.
  --no-lock           Skip lock acquisition (for recovery from stale locks).
  --help              Show this message.

One bounded cycle:
  init → freeze → generator → evaluator → analyzer → mutator → register
  Then STOP. advance_formula and promote_rubric_snapshot are governed steps.

The agent reads state/checkpoints/<run-id>.yaml to resume from the last
completed phase. Run 'node scripts/cli.js resume_run --run-id <id>' to
inspect the checkpoint before launching.
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
  const opencodeBin = args['opencode-bin'] || 'opencode';

  let runId;

  if (resume) {
    if (!args['run-id']) {
      console.error('--run-id is required with --resume');
      process.exit(1);
    }
    runId = args['run-id'];
    const checkpoint = getCheckpoint(runId);
    if (!checkpoint) {
      console.error(`No checkpoint found for ${runId}. Cannot resume. Run init_run and freeze_inputs first.`);
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

  const skillPath = path.join(WORKSPACE_ROOT, '.opencode', 'skills', 'blueprint-harness', 'SKILL.md');

  if (!skipLock) {
    try {
      acquireLock(runId);
      console.log(`[start] Lock acquired: ${runId}`);
    } catch (err) {
      console.error(`[start] Lock acquisition failed: ${err.message}`);
      console.error(`[start] To recover, run: node scripts/cli.js release_lock --run-id ${runId}`);
      process.exit(1);
    }
  }

  const bootstrap = `[start] Blueprint Harness Agent
[start] ==============================
[start] workspace : ${WORKSPACE_ROOT}
[start] run-id    : ${runId}
[start] mode      : ${resume ? 'resume' : 'new'}
[start] skill     : ${skillPath}
[start] opencode  : ${opencodeBin}
[start] launched  : ${timestamp()}
[start] ==============================

The agent will now execute one bounded evolution cycle by calling CLI commands.
After the register phase, the agent will stop. Do NOT restart it manually —
launch a new 'node start' session for the next cycle.

To watch progress: tail -f prototype/_v01/state/checkpoints/${runId}.yaml
To inspect state  : node prototype/_v01/scripts/cli.js resume_run --run-id ${runId}
To recover lock    : node prototype/_v01/scripts/cli.js release_lock --run-id ${runId}
`;

  console.log(bootstrap);

  const bootstrapMessage = `You are the Blueprint Harness agent. Execute one bounded evolution cycle using the blueprint-harness skill.

Run the skill:
  skill({ name: "blueprint-harness" })

Then follow the skill's workflow:
  init → freeze → generator → evaluator → analyzer → mutator → register
  Then STOP. Do NOT call advance_formula or promote_rubric_snapshot.

Run ID: ${runId}
Workspace: ${WORKSPACE_ROOT}
`;

  const opencodeArgs = [
    opencodeBin,
    'run',
    bootstrapMessage,
    '--dir', WORKSPACE_ROOT,
  ];

  const { spawn } = require('child_process');

  const child = spawn(opencodeArgs[0], opencodeArgs.slice(1), {
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

  child.on('error', (err) => {
    console.error(`[start] Failed to launch opencode: ${err.message}`);
    if (!skipLock) {
      releaseLock(runId);
    }
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(`[start] Fatal: ${err.message}`);
  process.exit(1);
});
