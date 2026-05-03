const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');

function resolveWorkspacePath(relativePath) {
  return path.resolve(WORKSPACE_ROOT, relativePath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function readYamlFile(filePath) {
  return YAML.parse(readText(filePath), { logLevel: 'error' });
}

function writeYamlFile(filePath, data) {
  writeText(filePath, YAML.stringify(data, {
    defaultStringType: 'QUOTE_SINGLE',
    lineWidth: 0,
  }));
}

function readJsonLines(filePath) {
  if (!fileExists(filePath)) return [];
  return readText(filePath)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function getCurrentState() {
  return readYamlFile(resolveWorkspacePath('state/current.yaml'));
}

function writeCurrentState(state) {
  writeYamlFile(resolveWorkspacePath('state/current.yaml'), state);
}

function getQueueState() {
  return readYamlFile(resolveWorkspacePath('state/queue.yaml'));
}

function writeQueueState(queue) {
  writeYamlFile(resolveWorkspacePath('state/queue.yaml'), queue);
}

function incrementRunId(runId) {
  const match = /^run-(\d+)$/.exec(runId);
  if (!match) {
    throw new Error(`Invalid run id: ${runId}`);
  }

  const nextNumber = Number(match[1]) + 1;
  return `run-${String(nextNumber).padStart(match[1].length, '0')}`;
}

function incrementVersion(version) {
  const match = /^v(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid version: ${version}`);
  }
  const next = Number(match[1]) + 1;
  return `v${String(next).padStart(match[1].length, '0')}`;
}

function listDir(dirPath) {
  if (!fileExists(dirPath)) return [];
  return fs.readdirSync(dirPath);
}

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function copyFile(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function loadProvider(type) {
  const providerPath = resolveWorkspacePath(`integrations/providers/${type}/index.js`);
  if (!fileExists(providerPath)) {
    throw new Error(`Provider '${type}' not found at ${providerPath}`);
  }
  return require(providerPath);
}

function timestamp() {
  return new Date().toISOString();
}

/**
 * Recursively resolves a formula's `extends` chain, returning a fully-inlined
 * merged formula. The child overrides parent fields; arrays (steps, validations,
 * specializations, behavior_shapes) are merged and deduplicated.
 *
 * @param {string} formulaPath - relative workspace path to the formula YAML
 * @param {Set} visited - internal tracker for circular dependency detection
 * @returns {object} merged formula with _extends_chain metadata
 */
function resolveFormulaExtends(formulaPath, visited = new Set()) {
  const resolvedPath = resolveWorkspacePath(formulaPath);

  if (visited.has(resolvedPath)) {
    throw new Error(`Circular extends detected: ${formulaPath}`);
  }
  visited.add(resolvedPath);

  const formula = readYamlFile(resolvedPath);

  if (!formula.extends) {
    // Leaf with no further extends — return as-is
    return {
      ...formula,
      _extends_chain: [formulaPath],
    };
  }

  const parent = resolveFormulaExtends(formula.extends, visited);

  // Merge strategy: child scalar fields override parent; arrays are merged+deduped
  const merged = {
    ...parent,
    ...formula,
    // Array fields: merge parent + child, preserve order, deduplicate by id
    steps: mergeUniqueById(parent.steps, formula.steps),
    validations: mergeUnique(parent.validations, formula.validations),
    specializations: mergeUnique(parent.specializations, formula.specializations),
    behavior_shapes: mergeUnique(parent.behavior_shapes, formula.behavior_shapes),
    // Metadata
    _extends_chain: [...parent._extends_chain, formulaPath],
    // Remove the now-resolved extends field
    extends: undefined,
  };

  return merged;
}

/**
 * Merge two arrays, preserving order and deduplicating primitives.
 */
function mergeUnique(a = [], b = []) {
  const seen = new Set(a);
  const result = [...a];
  for (const item of b) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * Merge two arrays of objects by `id`, preferring the child (b) version.
 */
function mergeUniqueById(a = [], b = []) {
  const byId = new Map();
  for (const item of a) {
    if (item && typeof item === 'object' && item.id) {
      byId.set(item.id, item);
    }
  }
  for (const item of b) {
    if (item && typeof item === 'object' && item.id) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

const RUN_PHASES = ['init', 'freeze', 'generator', 'evaluator', 'analyzer', 'mutator', 'register'];

function writeCheckpoint(runId, phase, status, extra = {}) {
  const checkpointPath = resolveWorkspacePath(`state/checkpoints/${runId}.yaml`);
  const existing = fileExists(checkpointPath) ? readYamlFile(checkpointPath) : {};
  const checkpoint = {
    ...existing,
    run_id: runId,
    phase,
    status,
    updated_at: timestamp(),
    ...extra,
  };
  writeYamlFile(checkpointPath, checkpoint);
  return checkpointPath;
}

function getCheckpoint(runId) {
  const checkpointPath = resolveWorkspacePath(`state/checkpoints/${runId}.yaml`);
  if (!fileExists(checkpointPath)) return null;
  return readYamlFile(checkpointPath);
}

function acquireLock(runId) {
  const lockDir = resolveWorkspacePath('state/locks');
  ensureDir(lockDir);
  const lockPath = path.join(lockDir, `${runId}.lock`);
  if (fileExists(lockPath)) {
    const existing = readText(lockPath).trim();
    throw new Error(`Lock already held for ${runId} by: ${existing}`);
  }
  writeText(lockPath, `locked_at: ${timestamp()}\npid: ${process.pid}`);
  return lockPath;
}

function releaseLock(runId) {
  const lockPath = resolveWorkspacePath(`state/locks/${runId}.lock`);
  if (fileExists(lockPath)) {
    fs.unlinkSync(lockPath);
  }
}

function nextPhase(phase) {
  const idx = RUN_PHASES.indexOf(phase);
  if (idx < 0 || idx === RUN_PHASES.length - 1) return null;
  return RUN_PHASES[idx + 1];
}

function phasesFrom(phase) {
  const idx = RUN_PHASES.indexOf(phase);
  if (idx < 0) return [];
  return RUN_PHASES.slice(idx);
}

/**
 * Saves an agent prompt to the run's prompts directory.
 * Creates runs/<run-id>/prompts/ if it doesn't exist.
 *
 * @param {string} runId - e.g. 'run-0022'
 * @param {string} filename - e.g. 'generate-step-1-explore.md'
 * @param {string} content - the full prompt content
 */
function savePromptToRun(runId, filename, content) {
  const promptsDir = resolveWorkspacePath(path.posix.join('runs', runId, 'prompts'));
  ensureDir(promptsDir);
  writeText(path.join(promptsDir, filename), content);
}

module.exports = {
  WORKSPACE_ROOT,
  acquireLock,
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
  nextPhase,
  parseArgs,
  phasesFrom,
  readJsonLines,
  readText,
  readYamlFile,
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
};
