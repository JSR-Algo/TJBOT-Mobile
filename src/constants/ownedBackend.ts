/**
 * Canonical TeeBot-owned backend roots.
 *
 * The Linux-hosted report.tjbot.vn service is the shared backend for Simulator,
 * emulator, physical-device, staging, and production builds.
 */
export const OWNED_BACKEND_ROOT = 'https://report.tjbot.vn';
export const OWNED_API_V1 = `${OWNED_BACKEND_ROOT}/v1`;
export const OWNED_AI_V1 = `${OWNED_BACKEND_ROOT}/v1/ai`;
