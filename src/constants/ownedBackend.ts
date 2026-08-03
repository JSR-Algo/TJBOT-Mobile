/**
 * Canonical TeeBot-owned backend roots.
 *
 * The Linux-hosted report.tjbot.vn service is the shared production backend.
 */
export const OWNED_BACKEND_ROOT = 'https://report.tjbot.vn';
export const OWNED_API_V1 = `${OWNED_BACKEND_ROOT}/v1`;
export const OWNED_AI_V1 = `${OWNED_BACKEND_ROOT}/v1/ai`;
export const LOCAL_OWNED_API_V1 = 'http://localhost:3000/v1';
export const LOCAL_OWNED_AI_V1 = 'http://localhost:3001/api/ai';
