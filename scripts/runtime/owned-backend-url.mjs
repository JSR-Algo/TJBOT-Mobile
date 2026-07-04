/** Canonical owned-backend URLs shared by mobile runtime scripts. */
export const OWNED_BACKEND_ROOT = 'https://api.TJBot.io';
export const OWNED_API_V1 = `${OWNED_BACKEND_ROOT}/v1`;
export const LOCAL_OWNED_API_V1 = 'http://localhost:3000/v1';

function ensureV1(url) {
  const trimmed = url.replace(/\/+$/, '');
  return /\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

/** Registry used by iPad to discover the latest Metro tunnel session. */
export function resolveDevRegistryRoot(env = process.env) {
  const explicit = env.TBOT_DEV_REGISTRY_URL?.trim();
  if (explicit) return ensureV1(explicit);

  const api = env.EXPO_PUBLIC_TBOT_API_URL?.trim() || env.TBOT_API_URL?.trim();
  if (api) return ensureV1(api);

  return OWNED_API_V1;
}

/** Default API root for connectivity smoke scripts. */
export function resolveOwnedApiRoot(env = process.env) {
  const api = env.TBOT_API_URL?.trim() || env.EXPO_PUBLIC_TBOT_API_URL?.trim();
  if (api) return ensureV1(api);
  return LOCAL_OWNED_API_V1;
}