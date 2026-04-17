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
  return YAML.parse(readText(filePath));
}

function writeYamlFile(filePath, data) {
  writeText(filePath, YAML.stringify(data));
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

function timestamp() {
  return new Date().toISOString();
}

module.exports = {
  WORKSPACE_ROOT,
  copyFile,
  ensureDir,
  fileExists,
  getCurrentState,
  getQueueState,
  incrementRunId,
  incrementVersion,
  listDir,
  parseArgs,
  readJsonLines,
  readText,
  readYamlFile,
  resolveWorkspacePath,
  timestamp,
  writeCurrentState,
  writeQueueState,
  writeText,
  writeYamlFile,
};
