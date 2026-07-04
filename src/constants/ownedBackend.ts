/**
 * Canonical TeeBot-owned backend roots.
 *
 * TEMPORARY (2026-06-26, user-approved): the intended owned domain api.TJBot.io is
 * NOT yet registered/deployed — it returns DNS NXDOMAIN, which bricked every
 * production/EAS build (every request failed ENOTFOUND -> NETWORK_ERROR -> the
 * "Check your internet connection" symptom, cascading into "nothing works"). Until
 * api.TJBot.io is stood up (register DNS + deploy the backend there), the owned root
 * points at the working Render backend so production builds function. REVERT this to
 * 'https://api.TJBot.io' once the owned domain is live. See eas.json (same change).
 */
export const OWNED_BACKEND_ROOT = 'https://tbot-backend-8wmh.onrender.com';
export const OWNED_API_V1 = `${OWNED_BACKEND_ROOT}/v1`;
export const OWNED_AI_V1 = `${OWNED_BACKEND_ROOT}/v1/ai`;
export const LOCAL_OWNED_API_V1 = 'http://localhost:3000/v1';
export const LOCAL_OWNED_AI_V1 = 'http://localhost:3001/api/ai';