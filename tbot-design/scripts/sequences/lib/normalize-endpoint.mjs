// normalize-endpoint.mjs — AC-5 path-param + verb normalizer.
//
// Rules (per plan §6):
//   - lowercase verb, collapse multi-space inside string
//   - strip trailing `/`
//   - strip query string (`?...`)
//   - replace path-param syntaxes `{x}`, `:x`, `<x>` → unified `:_`
//
// Designed to make e.g. `POST /v1/auth/login`, `post  /v1/auth/login/`,
// `POST /v1/auth/{action}` comparable. Pure function, no IO.

export function normalizeEndpoint(s) {
  if (typeof s !== 'string') return '';
  let v = s.trim();
  // Strip optional surrounding backticks / quotes the author may have used.
  v = v.replace(/^[`'"]+|[`'"]+$/g, '');
  // Split off any trailing inline note after `--` or `#` (kept conservative).
  v = v.replace(/\s+(--|#)\s.*$/, '');
  // Strip query.
  v = v.replace(/\?[^\s]*/g, '');
  // Collapse internal whitespace runs.
  v = v.replace(/\s+/g, ' ');
  // Lowercase verb if first token looks like a verb.
  const parts = v.split(' ');
  if (parts.length >= 2 && /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|WS|SUB|PUB|SNS|SQS)$/i.test(parts[0])) {
    parts[0] = parts[0].toUpperCase();
    v = parts.join(' ');
  }
  // Strip trailing slash on path (after verb).
  const slashTail = v.match(/^(.*?)\/$/);
  if (slashTail && !/^[A-Z]+$/.test(slashTail[1])) v = slashTail[1];
  // Normalize all path-param syntaxes to `:_`.
  v = v.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, ':_');
  v = v.replace(/<[A-Za-z_][A-Za-z0-9_]*>/g, ':_');
  v = v.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ':_');
  return v;
}
