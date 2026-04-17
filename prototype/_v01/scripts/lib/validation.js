const path = require('path');
const Ajv2020 = require('ajv/dist/2020');

const { fileExists, readYamlFile, resolveWorkspacePath } = require('./common');

const ajv = new Ajv2020({ allErrors: true, strict: false });

const schemaCache = new Map();

function loadSchema(schemaRelativePath) {
  if (schemaCache.has(schemaRelativePath)) {
    return schemaCache.get(schemaRelativePath);
  }

  const schema = readYamlFile(resolveWorkspacePath(schemaRelativePath));
  const validate = ajv.compile(schema);
  schemaCache.set(schemaRelativePath, validate);
  return validate;
}

function validateFile(fileRelativePath, schemaRelativePath, label = fileRelativePath) {
  const absolutePath = resolveWorkspacePath(fileRelativePath);

  if (!fileExists(absolutePath)) {
    return {
      ok: false,
      label,
      fileRelativePath,
      errors: ['file does not exist'],
    };
  }

  const data = readYamlFile(absolutePath);
  const validate = loadSchema(schemaRelativePath);
  const valid = validate(data);

  return {
    ok: Boolean(valid),
    label,
    fileRelativePath,
    errors: valid
      ? []
      : (validate.errors || []).map((error) => {
          const location = error.instancePath || '/';
          return `${location} ${error.message}`;
        }),
  };
}

function validateArtifactsForRun(runId, currentState) {
  const checks = [
    validateFile(currentState.current_formula_ref, 'schemas/formula.schema.yaml', 'current formula'),
    validateFile(currentState.current_golden_set_ref, 'schemas/golden-set.schema.yaml', 'current golden set'),
    validateFile(currentState.current_project_ref, 'schemas/project-config.schema.yaml', 'current project config'),
    validateFile(currentState.current_rubric_snapshot_ref, 'schemas/rubric-snapshot.schema.yaml', 'current rubric snapshot'),
  ];

  if (runId) {
    checks.push(
      validateFile(path.posix.join('runs', runId, 'manifest.yaml'), 'schemas/run-manifest.schema.yaml', `run manifest ${runId}`)
    );
  }

  return checks;
}

module.exports = {
  validateArtifactsForRun,
  validateFile,
};
