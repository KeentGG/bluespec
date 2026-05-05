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
