const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });

/**
 * Validates agent step output against the expected schema.
 *
 * This is a HARD GATE. If output doesn't match schema, the step fails.
 */

function validateStepOutput(output, expectedSchema) {
  if (!expectedSchema || Object.keys(expectedSchema).length === 0) {
    return { valid: true, errors: [] };
  }

  const validate = ajv.compile(expectedSchema);
  const valid = validate(output);

  if (!valid) {
    const errors = validate.errors.map(err => {
      const path = err.instancePath || 'root';
      return `${path}: ${err.message}`;
    });

    return {
      valid: false,
      errors,
    };
  }

  return { valid: true, errors: [] };
}

module.exports = {
  validateStepOutput,
};
