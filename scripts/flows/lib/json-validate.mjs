// Minimal purpose-built JSON Schema validator. Supports the subset of
// JSON Schema used by scripts/flows/schema/*.json:
//   type (string|object|array|integer|number|boolean), enum, required, properties,
//   additionalProperties (bool or schema), propertyNames.pattern,
//   items (schema), pattern, minItems, uniqueItems, default (advisory).
//
// Purpose-built to avoid pulling ajv as a runtime dep (plan R10). Returns an
// array of error strings; empty array = valid.

export function validate(schema, value, pointer = '') {
  const errors = [];

  function fail(msg) { errors.push(`${pointer || '<root>'}: ${msg}`); }

  if (schema.type) {
    const t = schema.type;
    const actual = Array.isArray(value) ? 'array' : typeof value;
    const ok =
      (t === 'integer' && actual === 'number' && Number.isInteger(value)) ||
      (t === 'string'  && actual === 'string') ||
      (t === 'object'  && actual === 'object' && value !== null && !Array.isArray(value)) ||
      (t === 'array'   && Array.isArray(value)) ||
      (t === 'number'  && actual === 'number') ||
      (t === 'boolean' && actual === 'boolean');
    if (!ok) { fail(`expected type ${t}, got ${actual}`); return errors; }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    fail(`value ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}`);
  }

  if (schema.pattern && typeof value === 'string') {
    if (!new RegExp(schema.pattern).test(value)) {
      fail(`value ${JSON.stringify(value)} does not match pattern ${schema.pattern}`);
    }
  }

  if (schema.type === 'object' && value && typeof value === 'object') {
    for (const req of schema.required || []) {
      if (!(req in value)) fail(`missing required property "${req}"`);
    }
    if (schema.propertyNames?.pattern) {
      const re = new RegExp(schema.propertyNames.pattern);
      for (const k of Object.keys(value)) {
        if (!re.test(k)) fail(`property name "${k}" does not match ${schema.propertyNames.pattern}`);
      }
    }
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) {
        errors.push(...validate(props[k], v, `${pointer}/${k}`));
      } else if (schema.additionalProperties === false) {
        fail(`unexpected property "${k}"`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validate(schema.additionalProperties, v, `${pointer}/${k}`));
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) {
      fail(`array shorter than minItems ${schema.minItems}`);
    }
    if (schema.uniqueItems) {
      const seen = new Set();
      for (const item of value) {
        const k = JSON.stringify(item);
        if (seen.has(k)) { fail(`duplicate item ${k}`); break; }
        seen.add(k);
      }
    }
    if (schema.items) {
      value.forEach((it, i) => {
        errors.push(...validate(schema.items, it, `${pointer}/${i}`));
      });
    }
  }

  if (schema.type === 'integer' && typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) {
      fail(`value ${value} below minimum ${schema.minimum}`);
    }
  }

  return errors;
}
