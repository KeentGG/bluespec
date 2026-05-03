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

  const schema = normalizeExpectedSchema(expectedSchema);
  const validate = ajv.compile(schema);
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

function normalizeExpectedSchema(expectedSchema) {
  if (expectedSchema.type || expectedSchema.properties || expectedSchema.required || expectedSchema.oneOf || expectedSchema.anyOf || expectedSchema.allOf) {
    return expectedSchema;
  }

  return {
    type: 'object',
    properties: expectedSchema,
    required: Object.keys(expectedSchema),
    additionalProperties: true,
  };
}

module.exports = {
  validateStepOutput,
};
