/**
 * Library components, styles and instance properties: the server-side checks.
 *
 * Pure functions, covered by npm test. Each returns null when the arguments are
 * usable, or a { code, message } problem the handler returns without calling
 * the plugin. Checks the Zod shapes cannot express (one of two fields, a key
 * list from either of two fields) live here.
 */

/** Most style keys one figma_import_library_style call accepts. */
export const MAX_STYLE_KEYS = 50;

const invalid = (message) => ({ code: 'INVALID_PARAMS', message });

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * Exactly one of componentKey (a library component or set) and componentId
 * (a component already in the file).
 */
export function validateComponentSource({ componentKey, componentId } = {}) {
  const hasKey = componentKey !== undefined;
  const hasId = componentId !== undefined;
  if (hasKey && hasId) {
    return invalid('Pass componentKey or componentId, not both.');
  }
  if (!hasKey && !hasId) {
    return invalid('Pass componentKey (a published library component or component set) or componentId (a component in this file).');
  }
  if (hasKey && !isNonEmptyString(componentKey)) return invalid('componentKey must be a non-empty string.');
  if (hasId && !isNonEmptyString(componentId)) return invalid('componentId must be a non-empty string.');
  return null;
}

/**
 * A component-properties map: { name: string | boolean }. Names are matched
 * against the component's definitions in the plugin, which knows them.
 * @param {*} properties
 * @param {{ required?: boolean }} [options] - required: must be present with at least one entry
 */
export function validateProperties(properties, { required = false } = {}) {
  if (properties === undefined) {
    return required ? invalid('properties is required: a map of component property names to values.') : null;
  }
  if (properties === null || typeof properties !== 'object' || Array.isArray(properties)) {
    return invalid('properties must be an object mapping component property names to values.');
  }
  const names = Object.keys(properties);
  if (required && names.length === 0) {
    return invalid('properties is empty: pass at least one component property to set.');
  }
  for (const name of names) {
    if (name.trim() === '') return invalid('properties has an empty property name.');
    const value = properties[name];
    if (typeof value !== 'string' && typeof value !== 'boolean') {
      return invalid(`properties["${name}"] must be a string or a boolean (got ${JSON.stringify(value)}).`);
    }
  }
  return null;
}

/**
 * The style keys of one figma_import_library_style call, from `key`, `keys`
 * or both, deduplicated in order.
 * @returns {{ keys: string[] } | { problem: { code: string, message: string } }}
 */
export function normalizeStyleKeys({ key, keys } = {}) {
  const all = [];
  if (key !== undefined) all.push(key);
  if (keys !== undefined) {
    if (!Array.isArray(keys)) return { problem: invalid('keys must be an array of style keys.') };
    all.push(...keys);
  }
  if (all.length === 0) return { problem: invalid('Pass key (one style key) or keys (several).') };
  for (const value of all) {
    if (!isNonEmptyString(value)) {
      return { problem: invalid(`Every style key must be a non-empty string (got ${JSON.stringify(value)}).`) };
    }
  }
  const unique = [...new Set(all)];
  if (unique.length > MAX_STYLE_KEYS) {
    return { problem: invalid(`${unique.length} style keys is over the limit of ${MAX_STYLE_KEYS} per call.`) };
  }
  return { keys: unique };
}
